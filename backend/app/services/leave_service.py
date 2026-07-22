from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List, Optional
from decimal import Decimal
from app.repositories.leave_repo import leave_repo, leave_balance_repo
from app.schemas.leave import LeaveCreate, LeaveUpdate, LeaveBalanceUpdate, LeaveBalanceCreate
from app.core.exceptions import ResourceNotFoundException

class LeaveService:
    def apply_leave(self, db: Session, obj_in: LeaveCreate):
        # 🛡️ Robust ID Generation: Prevents collisions with soft-deleted records
        from datetime import datetime
        import random
        timestamp = datetime.now().strftime("%y%m%d%H%M")
        random_suffix = str(random.randint(100, 999))
        obj_in.leave_id = f"LEV-{timestamp}-{random_suffix}"
        
        from app.models.holiday import Holiday
        holidays = db.query(Holiday.date).filter(
            Holiday.date >= obj_in.start_date,
            Holiday.date <= obj_in.end_date
        ).all()
        holiday_dates = {h[0] for h in holidays}
        
        # Calculate actual working days excluding Sat/Sun and Holidays
        count_days = 0
        current_dt = obj_in.start_date
        while current_dt <= obj_in.end_date:
            # Check if weekday AND not a holiday
            if current_dt.weekday() < 5 and current_dt not in holiday_dates: 
                count_days += 1
            current_dt += timedelta(days=1)
        
        obj_in.total_days = Decimal(str(count_days))
        
        # Robust Balance Check: Use service to auto-create balance if missing
        balance = leave_balance_service.get_balance(db, obj_in.employee_id)
        
        
        needed = obj_in.total_days or Decimal("0.00")
        # Mapping leave type to field name
        type_map = {
            "casual": "casual_leave",
            "sick": "sick_leave",
            "earned": "earned_leave",
            "maternity": "maternity_leave",
            "paternity": "paternity_leave",
            "bereavement": "bereavement_leave",
            "unpaid": "unpaid_leave"
        }
        balance_field = type_map.get(obj_in.leave_type.lower())
        if not balance_field or not hasattr(balance, balance_field):
             # Fallback for dynamic types if any
             balance_field = obj_in.leave_type.lower().replace(" ", "_") + "_leave"
             
        available = getattr(balance, balance_field, Decimal("0.00"))
        
        if needed > available and obj_in.leave_type.lower() != "unpaid":
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Insufficient {obj_in.leave_type} balance. Available: {available}, Required: {needed}")
        
        # Populate hierarchy for dual-channel routing
        from app.models.employee import Employee
        emp_model = db.query(Employee).filter(Employee.employee_id == obj_in.employee_id).first()
        if emp_model:
            obj_in.team_leader_id = str(emp_model.team_leader_id) if emp_model.team_leader_id else None
            obj_in.manager_id = str(emp_model.reporting_manager_id) if emp_model.reporting_manager_id else None
            # Truncating to fit DB constraints (150/100 chars)
            obj_in.name = (emp_model.name or f"{emp_model.first_name} {emp_model.last_name or ''}")[:149].strip()
            obj_in.department = (emp_model.department or "")[:99]
            
        return leave_repo.create(db, obj_in)

    async def approve_recommendation(self, db: Session, leave_id: str, approver_employee_id: str, approver_role: str, action: str = "approve", rejection_reason: Optional[str] = None):
        from app.services.employee_service import employee_service
        from fastapi import HTTPException
        
        db_obj = leave_repo.get(db, leave_id)
        if not db_obj:
            raise ResourceNotFoundException("Leave Request", leave_id)
            
        # Verify Authority
        if not employee_service.verify_subordinate_authority(db, db_obj.employee_id, approver_employee_id, approver_role):
            raise HTTPException(status_code=403, detail="You do not have authority over this employee's requests.")
        
        if action.lower() == "reject":
            db_obj.status = "Rejected"
            db_obj.rejection_reason = rejection_reason
        else:
            # 1. Fetch initiator info to determine workflow
            from app.models.employee import Employee
            initiator = db.query(Employee).filter(Employee.employee_id == db_obj.employee_id).first()
            initiator_role = (initiator.role or 'employee').lower()
            # Professional Staff requiring Manager-level approval
            admin_roles = ['hr', 'teamleader', 'tl', 'recruiter', 'it', 'manager']
            
            # Workflow Selection
            if initiator_role in admin_roles:
                # FLOW B (Administrative/Leadership Staff): Final Approval by Manager ONLY
                if approver_role.lower() in ["manager", "admin"]:
                    db_obj.status = "Approved"
                    db_obj.approved_by = approver_employee_id
                else:
                    # Team Leaders cannot approve HR/TL/IT/Recruiter leaves
                    raise HTTPException(status_code=403, detail="Approvals for administrative or leadership staff must be finalized by a Manager.")
            else:
                # FLOW A (Operational Workforce): Team Leader is Primary/Final Authority
                if approver_role.lower() in ["teamleader", "tl"]:
                    db_obj.status = "Approved"
                    db_obj.approved_by = approver_employee_id
                elif approver_role.lower() in ["manager", "hr", "admin"]:
                    # Managers/HR have override authority over all staff
                    db_obj.status = "Approved"
                    db_obj.approved_by = approver_employee_id
            
            # 2. Finalize Balance Deduction on 'Approved' status
            if db_obj.status == "Approved":
                balance = leave_balance_repo.get(db, db_obj.employee_id)
                if balance:
                    type_map = {
                        "casual": "casual_leave",
                        "sick": "sick_leave",
                        "earned": "earned_leave",
                        "maternity": "maternity_leave",
                        "paternity": "paternity_leave",
                        "bereavement": "bereavement_leave",
                        "unpaid": "unpaid_leave"
                    }
                    field = type_map.get(db_obj.leave_type.lower())
                    if not field or not hasattr(balance, field):
                        # Fallback for dynamic types or those with spaces (e.g. 'Casual Leave' -> 'casual_leave')
                        field = db_obj.leave_type.lower().replace(" ", "_")
                        if not field.endswith("_leave"):
                            field += "_leave"
                    
                    if hasattr(balance, field):
                        current_val = getattr(balance, field) or Decimal("0.00")
                        leave_days = db_obj.total_days or Decimal("0.00")
                        # Perform high-precision deduction
                        setattr(balance, field, Decimal(str(current_val)) - Decimal(str(leave_days)))
                        balance.total_used = Decimal(str(balance.total_used or 0)) + Decimal(str(leave_days))
                        db.add(balance)

        db_obj.last_action_by = approver_employee_id
        db.add(db_obj)
        
        # 🛡️ Mirror to Attendance Table for Calendar/Dashboard Sync
        if db_obj.status == "Approved":
            from app.models.attendance import Attendance
            from app.services.holiday_service import holiday_service
            # Create a set of holiday dates for efficient lookup
            holiday_dates = {h.date for h in holiday_service.get_all(db)}
            
            curr = db_obj.start_date
            while curr <= db_obj.end_date:
                # Mirror only for working days (exclude weekends & holidays)
                # Weekdays 0-4 are Mon-Fri
                if curr.weekday() < 5 and curr not in holiday_dates:
                    # Check if attendance already exists to avoid duplicates
                    existing = db.query(Attendance).filter(
                        Attendance.employee_id == db_obj.employee_id, 
                        Attendance.date == curr
                    ).first()
                    
                    status_str = f"Leave/{db_obj.leave_type}"[:30]
                    if not existing:
                        new_att = Attendance(
                            employee_id=db_obj.employee_id,
                            date=curr,
                            month=curr.month,
                            year=curr.year,
                            status=status_str,
                            remarks=f"Auto-mirrored from Leave Approval: {db_obj.reason[:50]}"
                        )
                        db.add(new_att)
                    else:
                        # Always override attendance status when leave is approved
                        existing.status = status_str
                        if not existing.month: existing.month = curr.month
                        if not existing.year: existing.year = curr.year
                        existing.remarks = f"Auto-mirrored from Leave Approval: {db_obj.reason[:50]}"
                        db.add(existing)
                curr += timedelta(days=1)
        
        db.commit()
        db.refresh(db_obj)
        
        # Robust Real-time event (Feature 38)
        try:
            from app.core.websocket_manager import websocket_manager
            await websocket_manager.broadcast({
                "event": "data_updated",
                "data": {
                    "type": "leaves",
                    "id": leave_id,
                    "status": db_obj.status,
                    "employee_id": db_obj.employee_id
                }
            })
            await websocket_manager.broadcast({
                "event": "data_updated",
                "data": {
                    "type": "attendance",
                    "action": "leave_approved",
                    "employee_id": db_obj.employee_id
                }
            })
        except Exception:
            pass # Silently handle websocket failures
        
        # Log to Activity and Audit tables
        try:
            from app.services.notification_service import activity_service, audit_service, notification_service
            from app.models.employee import Employee
            from app.models.user import User
            from sqlalchemy import or_

            approver_user = db.query(User).filter(
                or_(
                    User.employee_id == approver_employee_id,
                    User.id == int(approver_employee_id) if str(approver_employee_id).isdigit() else False
                )
            ).first()
            appr_uid = approver_user.id if approver_user else None
            appr_name = approver_user.full_name if approver_user else f"Approver ({approver_role})"

            activity_service.log_activity(db, appr_uid, appr_name, "LEAVE_STATUS_CHANGED", "Leave", db_obj.leave_id, f"Leave {db_obj.leave_id} status updated to {db_obj.status}")
            audit_service.log_audit(db, "leaves", db_obj.leave_id, f"status -> {db_obj.status}", appr_uid)
            
            # Push real-time notification to the employee
            emp_user = db.query(Employee).filter(Employee.employee_id == db_obj.employee_id).first()
            if emp_user and emp_user.user_id:
                await notification_service.push_notification(
                    db,
                    user_id=emp_user.user_id,
                    employee_id=db_obj.employee_id,
                    title="Leave Request Updated",
                    message=f"Your leave request ({db_obj.leave_id}) has been {db_obj.status}.",
                    category="Leave"
                )
        except Exception as e:
            print(f"[LEAVE SERVICE NOTIFICATION ERROR] {e}")
            
        return db_obj

    def get_leaves(self, db: Session, employee_id: str, user_role: str = "employee"):
        from app.models.employee import Employee
        from app.models.leave import LeaveRequest
        
        # Centralized Visibility Logic
        user_role_lower = (user_role or "employee").lower()
        
        if user_role_lower in ["hr", "admin"]:
            # Master View: HR and Admin see everything organization-wide
            query = db.query(LeaveRequest, Employee.first_name, Employee.last_name, Employee.role, Employee.department)\
                .join(Employee, LeaveRequest.employee_id == Employee.employee_id)\
                .filter(LeaveRequest.deleted_at == None)
        elif user_role_lower in ["manager", "teamleader", "tl"]:
            # Scoped View: Managers and TLs see their recursive team + their own history
            from app.services.dashboard_service import dashboard_service
            from sqlalchemy import or_
            team_ids = dashboard_service._get_recursive_team_ids(db, employee_id)
            team_ids.append(employee_id)
            
            tl_identities = {str(employee_id)}
            tl_emp = db.query(Employee).filter(
                or_(
                    Employee.employee_id == employee_id,
                    Employee.id == int(employee_id) if str(employee_id).isdigit() else False,
                    Employee.user_id == int(employee_id) if str(employee_id).isdigit() else False
                )
            ).first()
            if tl_emp:
                if tl_emp.employee_id: tl_identities.add(str(tl_emp.employee_id))
                if tl_emp.id: tl_identities.add(str(tl_emp.id))
                if tl_emp.user_id: tl_identities.add(str(tl_emp.user_id))
            
            query = db.query(LeaveRequest, Employee.first_name, Employee.last_name, Employee.role, Employee.department)\
                .join(Employee, LeaveRequest.employee_id == Employee.employee_id)\
                .filter(
                    or_(
                        LeaveRequest.employee_id.in_(team_ids),
                        LeaveRequest.team_leader_id.in_(tl_identities),
                        LeaveRequest.manager_id.in_(tl_identities)
                    ),
                    LeaveRequest.deleted_at == None
                )
        else:
            # Personal View: Standard employees see only their own history
            query = db.query(LeaveRequest, Employee.first_name, Employee.last_name, Employee.role, Employee.department)\
                .join(Employee, LeaveRequest.employee_id == Employee.employee_id)\
                .filter(LeaveRequest.employee_id == employee_id, LeaveRequest.deleted_at == None)
            
        today = date.today()
        results = query.order_by(LeaveRequest.created_at.desc()).all()
        final_objects = []
        for leave, fn, ln, role, dept in results:
            # Auto-remove finalized leaves after the end date passes to keep queues clean
            if leave.status and leave.status.lower() in ["approved", "rejected"]:
                if leave.end_date and leave.end_date < today:
                    continue
            
            # Attach extra data for manual serialization in API layers
            leave.name = f"{fn or ''} {ln or ''}".strip()
            leave.employee_name = leave.name
            leave.role = role
            leave.department = dept
            final_objects.append(leave)
        return final_objects

    def cancel_leave(self, db: Session, leave_id: str, employee_id: str):
        db_obj = leave_repo.get(db, leave_id)
        if not db_obj:
            raise ResourceNotFoundException("Leave Request", leave_id)
            
        if db_obj.employee_id != employee_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="Not authorized to cancel this request")
             
        if db_obj.status.lower() not in ["pending", "recommendation-review", "recommended"]:
             from fastapi import HTTPException
             raise HTTPException(status_code=400, detail="Cannot cancel already processed leave")
             
        db_obj.status = "Cancelled"
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

class LeavePolicyService:
    def get_all(self, db: Session):
        from app.models.leave import LeavePolicy
        return db.query(LeavePolicy).all()

    def update_policy(self, db: Session, leave_type: str, total_days: int, description: Optional[str] = None):
        from app.models.leave import LeavePolicy, LeaveBalance
        policy = db.query(LeavePolicy).filter(LeavePolicy.leave_type == leave_type).first()
        if not policy:
            policy = LeavePolicy(leave_type=leave_type, total_days=total_days, description=description)
            db.add(policy)
        else:
            policy.total_days = total_days
            if description:
                policy.description = description
            db.add(policy)
        
        db.commit()
        db.refresh(policy)

        # 🔄 AUTOMATIC SYNC (Feature 46): Update all existing employee balances to reflect new policy
        try:
            field_name = f"{leave_type.lower().replace(' ', '_')}_leave"
            # Special mapping for common names if needed
            if "casual" in field_name: field_name = "casual_leave"
            if "sick" in field_name: field_name = "sick_leave"
            if "earned" in field_name: field_name = "earned_leave"
            
            # Perform mass update for all active records
            db.query(LeaveBalance).filter(LeaveBalance.deleted_at == None).update({field_name: total_days})
            db.commit()
            print(f"[SYNC] Propagated {leave_type} policy change ({total_days} days) to all employees.")
        except Exception as e:
            print(f"[SYNC ERROR] Failed to propagate policy change: {e}")
            db.rollback()

        return policy

    def get_policy(self, db: Session, leave_type: str):
        from app.models.leave import LeavePolicy
        return db.query(LeavePolicy).filter(LeavePolicy.leave_type == leave_type).first()

class LeaveBalanceService:
    def get_all(self, db: Session, skip: int = 0, limit: int = 100, user_role: str = "hr"):
        from app.models.leave import LeaveBalance
        from app.models.employee import Employee
        
        query = db.query(LeaveBalance).join(Employee, LeaveBalance.employee_id == Employee.employee_id)\
            .filter(LeaveBalance.deleted_at == None, Employee.deleted_at == None)
        
        if user_role == "hr":
            admin_roles = ["hr", "recruiter", "teamleader", "it", "manager", "admin"]
            query = query.filter(Employee.designation.not_in(admin_roles) if Employee.designation else True)
            
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: LeaveBalanceCreate):
        return leave_balance_repo.create(db, obj_in)

    def get_balance(self, db: Session, employee_id: str):
        balance = leave_balance_repo.get(db, employee_id)
        
        # Self-Healing: If balance is missing OR exists but has 0 total credited (malformed/legacy)
        should_initialize = not balance or (float(getattr(balance, 'total_credited', 0)) == 0)
        
        if should_initialize:
            from datetime import datetime
            # Fetch policies for dynamic defaults
            policies = {p.leave_type.lower(): float(p.total_days) for p in leave_policy_service.get_all(db)}
            
            default_data = {
                "employee_id": employee_id,
                "casual_leave": policies.get("casual", 24.0),
                "sick_leave": policies.get("sick", 15.0),
                "earned_leave": policies.get("earned", 30.0),
                "maternity_leave": policies.get("maternity", 90.0),
                "paternity_leave": policies.get("paternity", 15.0),
                "bereavement_leave": policies.get("bereavement", 5.0),
                "unpaid_leave": 0.0,
                "total_credited": sum(policies.values()) if policies else 179.0,
                "total_used": 0.0,
                "carry_forward_days": 0.0,
                "year": datetime.now().year,
                "last_update": datetime.now()
            }
            if not balance:
                balance = leave_balance_repo.create(db, default_data)
            else:
                # Update existing zero-balance record with dynamic defaults
                balance.casual_leave = default_data["casual_leave"]
                balance.sick_leave = default_data["sick_leave"]
                balance.earned_leave = default_data["earned_leave"]
                balance.maternity_leave = default_data["maternity_leave"]
                balance.paternity_leave = default_data["paternity_leave"]
                balance.bereavement_leave = default_data["bereavement_leave"]
                balance.total_credited = default_data["total_credited"]
                balance.total_used = 0.0
                db.add(balance)
                db.commit()
                db.refresh(balance)
        return balance

    def update_balance(self, db: Session, employee_id: str, obj_in: LeaveBalanceUpdate):
        db_obj = leave_balance_repo.get(db, employee_id)
        if not db_obj:
            raise ResourceNotFoundException("Leave Balance", employee_id)
        return leave_balance_repo.update(db, db_obj, obj_in)

    def update(self, db: Session, id: int, obj_in: LeaveBalanceUpdate):
        from app.models.leave import LeaveBalance
        db_obj = db.query(LeaveBalance).filter(LeaveBalance.id == id, LeaveBalance.deleted_at == None).first()
        if not db_obj:
            raise ResourceNotFoundException("Leave Balance Record", id)
        return leave_balance_repo.update(db, db_obj, obj_in)

leave_service = LeaveService()
leave_balance_service = LeaveBalanceService()
leave_policy_service = LeavePolicyService()
