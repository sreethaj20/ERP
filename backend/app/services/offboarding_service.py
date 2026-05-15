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

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100, manager_id: Optional[str] = None):
        query = db.query(OffboardingRequest)
        if manager_id:
            query = query.filter(OffboardingRequest.employee_id.in_(
                db.query(Employee.employee_id).filter(Employee.manager_id == manager_id)
            ))
        else:
            # HR View: Filter out administrative staff offboarding
            admin_roles = ["hr", "recruiter", "teamleader", "it", "admin", "itdepartment"]
            query = query.filter(~OffboardingRequest.employee_id.in_(
                db.query(Employee.employee_id).filter(Employee.designation.in_(admin_roles))
            ))
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
            self._deactivate_user_identity(db, db_obj.employee_id)
            
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
            self._deactivate_user_identity(db, db_obj.employee_id)
            
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
        # Note: No explicit db.commit() here; the calling service method's repository update will commit the transaction.
        
    def delete_request(self, db: Session, offboard_id: str, changed_by: Optional[str] = None):
        db_obj = offboarding_repo.get_by_offboard_id(db, offboard_id)
        if not db_obj:
            return None
            
        old_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
        audit_service.log_action(db, "offboarding_requests", offboard_id, "DELETE", changed_by, old_data, None)
        
        db.delete(db_obj)
        db.commit()
        return True

offboarding_service = OffboardingService()
