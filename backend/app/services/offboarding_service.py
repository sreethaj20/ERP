from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime
from app.repositories.offboarding_repo import offboarding_repo
from app.schemas.offboarding import OffboardingCreate, OffboardingUpdateByManager, OffboardingUpdateByHR
from app.models.offboarding import OffboardingRequest
from app.core.websocket_manager import websocket_manager
from app.services.audit_service import audit_service
from app.services.pdf_service import pdf_service
from app.models.employee import Employee
from app.models.user import User
from app.services.storage_service import storage_service
import asyncio

class OffboardingService:
    def initiate_offboarding(self, db: Session, obj_in: OffboardingCreate):
        return offboarding_repo.create(db, obj_in)

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100, manager_id: Optional[str] = None, offboarding_type: Optional[str] = None):
        from sqlalchemy import func
        query = db.query(OffboardingRequest)
        if manager_id:
            team_emp_ids = db.query(Employee.employee_id).filter(Employee.manager_id == manager_id)
            filtered_query = query.filter(OffboardingRequest.employee_id.in_(team_emp_ids))
            results = filtered_query.offset(skip).limit(limit).all()
            if results:
                for r in results:
                    if r.relieving_letter_url:
                        r.relieving_letter_url = storage_service.get_public_url(r.relieving_letter_url)
                return results
            # Fallback if no matching records found
            pass
        else:
            # HR View
            admin_roles = ["hr", "recruiter", "teamleader", "it", "admin", "itdepartment"]
            staff_emp_ids = db.query(Employee.employee_id).filter(
                (func.lower(Employee.designation).in_(admin_roles)) |
                (func.lower(Employee.role).in_(admin_roles))
            )
            if offboarding_type == "staff":
                query = query.filter(OffboardingRequest.employee_id.in_(staff_emp_ids))
            elif offboarding_type == "employee":
                query = query.filter(~OffboardingRequest.employee_id.in_(staff_emp_ids))
            else:
                # None/all: return all offboardings (let the frontend partition them or query them specifically)
                pass
        results = query.offset(skip).limit(limit).all()
        for r in results:
            if r.relieving_letter_url:
                r.relieving_letter_url = storage_service.get_public_url(r.relieving_letter_url)
        return results

    def get_by_employee_id(self, db: Session, employee_id: str):
        return offboarding_repo.get_by_employee_id(db, employee_id)

    def get_request_by_offboard_id(self, db: Session, offboard_id: str):
        res = offboarding_repo.get_by_offboard_id(db, offboard_id)
        if res and res.relieving_letter_url:
            res.relieving_letter_url = storage_service.get_public_url(res.relieving_letter_url)
        return res

    async def manager_approve(self, db: Session, offboard_id: str, obj_in: OffboardingUpdateByManager, changed_by: Optional[str] = None):
        db_obj = offboarding_repo.get_by_offboard_id(db, offboard_id)
        if not db_obj:
            return None
        
        # Capture old state for audit
        old_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
        
        emp = db.query(Employee).filter(Employee.employee_id == db_obj.employee_id).first()
        admin_roles = ["hr", "recruiter", "it", "teamleader", "manager", "admin", "itdepartment", "management", "administrator"]
        
        role_key = ""
        if emp and emp.designation:
            role_key = emp.designation.lower().replace(" ", "").replace("_", "")
        elif emp and emp.role:
             role_key = emp.role.lower().replace(" ", "").replace("_", "")
             
        is_staff_role = any(role in role_key for role in admin_roles)
        
        if obj_in.manager_approved is True:
            db_obj.status = "ManagerApproved"
        
        # Feature 43: Autonomous Completion for Staff Roles
        if obj_in.completed is True:
            db_obj.status = "Completed"
            db_obj.completed = True
            
            # Deactivate only if exit date / notice period completed (< today)
            from datetime import date, datetime, timedelta
            today = date.today()
            req_date = db_obj.request_date or db_obj.created_at or today
            req_date_val = req_date.date() if isinstance(req_date, datetime) else req_date
            notice_days = getattr(obj_in, "notice_period_days", None) or db_obj.notice_period_days or 0
            notice_end_date = req_date_val + timedelta(days=notice_days)
            
            exit_date = getattr(obj_in, "exit_date", None) or db_obj.exit_date or db_obj.last_working_day
            exit_date_val = None
            if exit_date:
                if isinstance(exit_date, str):
                    try:
                        exit_date_val = datetime.strptime(exit_date.split("T")[0], "%Y-%m-%d").date()
                    except Exception:
                        pass
                elif isinstance(exit_date, datetime):
                    exit_date_val = exit_date.date()
                else:
                    exit_date_val = exit_date
            
            deactivate_date = exit_date_val if exit_date_val is not None else notice_end_date
            
            if deactivate_date < today:
                self._deactivate_user_identity(db, db_obj.employee_id)
            else:
                if emp:
                    emp.status = "On Notice"
                    db.add(emp)
            
        res = offboarding_repo.update(db, db_obj, obj_in)
        
        # Log action
        new_data = {c.key: getattr(res, c.key, None) for c in res.__table__.columns}
        audit_service.log_action(db, "offboarding_requests", offboard_id, "UPDATE", changed_by, old_data, new_data)
        
        # Real-time event (Feature 38)
        await websocket_manager.broadcast({
            "event": "data_updated",
            "data": {
                "type": "offboarding",
                "offboard_id": offboard_id,
                "status": db_obj.status
            }
        })
        
        return res

    async def hr_complete(self, db: Session, offboard_id: str, obj_in: OffboardingUpdateByHR, changed_by: Optional[str] = None):
        db_obj = offboarding_repo.get_by_offboard_id(db, offboard_id)
        if not db_obj:
            return None
            
        # Capture old state for audit
        old_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
        
        if obj_in.hr_approved is True:
            db_obj.status = "HRApproved"
            
        if obj_in.completed is True:
            db_obj.status = "Completed"
            
            # Deactivate only if exit date / notice period completed (< today)
            from datetime import date, datetime, timedelta
            today = date.today()
            req_date = db_obj.request_date or db_obj.created_at or today
            req_date_val = req_date.date() if isinstance(req_date, datetime) else req_date
            notice_days = getattr(obj_in, "notice_period_days", None) or db_obj.notice_period_days or 0
            notice_end_date = req_date_val + timedelta(days=notice_days)
            
            exit_date = getattr(obj_in, "exit_date", None) or db_obj.exit_date or db_obj.last_working_day
            exit_date_val = None
            if exit_date:
                if isinstance(exit_date, str):
                    try:
                        exit_date_val = datetime.strptime(exit_date.split("T")[0], "%Y-%m-%d").date()
                    except Exception:
                        pass
                elif isinstance(exit_date, datetime):
                    exit_date_val = exit_date.date()
                else:
                    exit_date_val = exit_date
            
            deactivate_date = exit_date_val if exit_date_val is not None else notice_end_date
            
            from app.models.employee import Employee
            emp = db.query(Employee).filter(Employee.employee_id == db_obj.employee_id).first()
            if deactivate_date < today:
                self._deactivate_user_identity(db, db_obj.employee_id)
            else:
                if emp:
                    emp.status = "On Notice"
                    db.add(emp)
            
        # 📄 PDF Logic: Trigger relieving letter generation if requested
        if obj_in.relieving_letter_sent and not db_obj.relieving_letter_url:
            from app.models.employee import Employee
            emp = db.query(Employee).filter(Employee.employee_id == db_obj.employee_id).first()
            if emp:
                data = {
                    "name": emp.name or f"{emp.first_name} {emp.last_name}",
                    "employee_id": emp.employee_id,
                    "joining_date": emp.joining_date.strftime('%Y-%m-%d') if emp.joining_date else "N/A",
                    "exit_date": (obj_in.exit_date or db_obj.exit_date or datetime.now()).strftime('%Y-%m-%d'),
                    "designation": emp.designation,
                    "department": emp.department
                }
                db_obj.relieving_letter_url = await pdf_service.generate_relieving_letter(data)

        res = offboarding_repo.update(db, db_obj, obj_in)
        
        # Log action
        new_data = {c.key: getattr(res, c.key, None) for c in res.__table__.columns}
        audit_service.log_action(db, "offboarding_requests", offboard_id, "UPDATE", changed_by, old_data, new_data)
        
        # Real-time event (Feature 38)
        await websocket_manager.broadcast({
            "event": "data_updated",
            "data": {
                "type": "offboarding",
                "offboard_id": offboard_id,
                "status": res.status if res else "Completed"
            }
        })
        
        return res

    def _deactivate_user_identity(self, db: Session, employee_id: str):
        """Workflow: Deactivate Identity (User & Employee) upon offboarding completion."""
        from app.models.employee import Employee
        from app.models.user import User
        
        emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if emp:
            emp.status = "Inactive"
            db.add(emp)
            
            user = db.query(User).filter(User.employee_id == emp.employee_id).first()
            if user:
                user.is_active = False
                db.add(user)
                print(f"[OFFBOARDING] User '{user.username}' (employee_id={employee_id}) has been DEACTIVATED — login blocked.")
        
        # Commit immediately so is_active=False takes effect right away
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[OFFBOARDING ERROR] Failed to deactivate user identity for {employee_id}: {e}")
        
    def delete_request(self, db: Session, offboard_id: str, changed_by: Optional[str] = None):
        db_obj = offboarding_repo.get_by_offboard_id(db, offboard_id)
        if not db_obj:
            return None
            
        old_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
        audit_service.log_action(db, "offboarding_requests", offboard_id, "DELETE", changed_by, old_data, None)
        
        db.delete(db_obj)
        db.commit()
        return True

    def check_and_deactivate_expired_offboardings(self, db: Session):
        """Sync and deactivate all employees whose exit date / notice period has expired."""
        from datetime import date, datetime, timedelta
        from app.models.employee import Employee
        from app.models.offboarding import OffboardingRequest
        from app.models.user import User

        today = date.today()
        
        # Query for all active offboarding requests for employees who are not Inactive or Archived
        active_offboardings = db.query(Employee, OffboardingRequest).join(
            OffboardingRequest, Employee.employee_id == OffboardingRequest.employee_id
        ).filter(
            ~Employee.status.in_(["Inactive", "Archived"]),
            Employee.deleted_at == None,
            OffboardingRequest.deleted_at == None
        ).all()
        
        updated = False
        for emp, req in active_offboardings:
            # Calculate notice period end date
            req_date = req.request_date or req.created_at or today
            req_date_val = req_date.date() if isinstance(req_date, datetime) else req_date
            notice_days = req.notice_period_days or 0
            notice_end_date = req_date_val + timedelta(days=notice_days)
            
            exit_date = req.exit_date or req.last_working_day
            exit_date_val = None
            if exit_date:
                if isinstance(exit_date, str):
                    try:
                        exit_date_val = datetime.strptime(exit_date.split("T")[0], "%Y-%m-%d").date()
                    except Exception:
                        pass
                elif isinstance(exit_date, datetime):
                    exit_date_val = exit_date.date()
                else:
                    exit_date_val = exit_date
            
            deactivate_date = exit_date_val if exit_date_val is not None else notice_end_date
            
            if deactivate_date < today:
                emp.status = "Inactive"
                db.add(emp)
                
                user = db.query(User).filter(User.employee_id == emp.employee_id).first()
                if user and user.is_active:
                    user.is_active = False
                    db.add(user)
                    print(f"[OFFBOARDING SYNC] Deactivated user '{user.username}' (employee_id={emp.employee_id}) - notice expired.")
                    
                if not req.completed or req.status != "Completed":
                    req.status = "Completed"
                    req.completed = True
                    db.add(req)
                    
                updated = True
                
        if updated:
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"[OFFBOARDING SYNC ERROR] Failed to commit deactivations: {e}")

offboarding_service = OffboardingService()
