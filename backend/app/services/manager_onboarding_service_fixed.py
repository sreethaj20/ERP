from typing import List, Optional, Any
from sqlalchemy.orm import Session
from datetime import datetime
from app.repositories.manager_onboarding_repo import manager_onboarding_repo
from app.repositories.hr_onboarding_repo import hr_onboarding_repo
from app.schemas.manager_onboarding import ManagerOnboardingCreate, ManagerOnboardingUpdate, ManagerOnboardingApproveOut
from app.schemas.hr_onboarding import HROnboardingCreate
from app.models.manager_onboarding import ManagerOnboardingRequest
from app.models.hr_onboarding import HROnboardingRequest
from app.models.employee import Employee
from app.models.user import User
from app.models.preboarding import EmployeePreboarding
from app.core.websocket_manager import websocket_manager
from app.core.security import get_password_hash
from app.services.audit_service import audit_service
import asyncio

class ManagerOnboardingService:
    def create_request(self, db: Session, obj_in: ManagerOnboardingCreate, manager_id: str) -> ManagerOnboardingRequest:
        obj_in.manager_id = manager_id
        return manager_onboarding_repo.create(db, obj_in)

    def create_bulk_request(self, db: Session, employees: list, manager_id: str):
        results = []
        for emp in employees:
            emp.manager_id = manager_id
            results.append(manager_onboarding_repo.create(db, emp))
        return results

    def get_requests(self, db: Session, skip: int = 0, limit: int = 100, manager_id: Optional[str] = None):
        return manager_onboarding_repo.get_multi(db, skip, limit, manager_id=manager_id)

    def approve_request(self, db: Session, request_id: str, user_id: int, manager_id: str) -> ManagerOnboardingApproveOut:
        db_obj = manager_onboarding_repo.get_by_request_id(db, request_id)
        if not db_obj:
            return None
        
        # Verify authority
        if db_obj.manager_id != manager_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="You do not have authority over this request.")

        # Capture old state for audit
        old_data = {c.name: getattr(db_obj, c.name) for c in db_obj.__table__.columns}
        
        # Determine if this is an autonomous provisioning role (Staff Roles)
        admin_roles = ["hr", "recruiter", "it", "teamleader", "manager", "admin", "itdepartment", "management", "administrator"]
        role_key = db_obj.role_name.lower().replace(" ", "").replace("_", "") if db_obj.role_name else ""
        is_admin_onboarding = any(role in role_key for role in admin_roles)
        
        # Atomic status update
        db_obj.status = "Completed" if is_admin_onboarding else "Approved"
        db_obj.manager_status = "approved"
        db_obj.approved_by = f"User {user_id}"
        db_obj.approved_at = datetime.now()
        db_obj.current_approver_stage = "Completed" if is_admin_onboarding else "hr"
        
        # --- WORKFLOW: Autonomous Identity Provisioning (Staff & Administrative Roles) ---
        if is_admin_onboarding:
            existing_user = db.query(User).filter(
                (User.employee_id == db_obj.employee_id) | (User.email == db_obj.login_email or db_obj.personal_email)
            ).first()
            if not existing_user:
                new_user = User(
                    username=f"usr_{db_obj.employee_id.lower().replace('-', '_')}",
                    email=db_obj.login_email or db_obj.personal_email,
                    hashed_password=get_password_hash("Mercure@123"), # Default Password
                    role=db_obj.role_name.lower().replace(" ", "") if db_obj.role_name else "employee",
                    full_name=f"{db_obj.first_name} {db_obj.last_name or ''}".strip(),
                    employee_id=db_obj.employee_id,
                    is_active=True
                )
                db.add(new_user)
                db.flush()

                new_emp = Employee(
                    user_id=new_user.id,
                    employee_id=db_obj.employee_id,
                    first_name=db_obj.first_name,
                    last_name=db_obj.last_name,
                    name=f"{db_obj.first_name} {db_obj.last_name or ''}".strip(),
                    email=db_obj.login_email,
                    official_email=db_obj.login_email,
                    personal_email=db_obj.personal_email,
                    department=db_obj.department,
                    designation=db_obj.designation,
                    joining_date=db_obj.join_date,
                    status="Active",
                    manager_id=manager_id,
                    team_leader_id=db_obj.team_leader_id,
                    gender=db_obj.gender,
                    date_of_birth=db_obj.dob,
                    blood_group=db_obj.blood_group,
                    nationality=db_obj.nationality,
                    phone=db_obj.personal_mobile,
                    work_location=db_obj.joining_location
                )
                db.add(new_emp)
                
                # Autonomous Preboarding
                effective_approver = f"User {user_id}"
                pre_req = EmployeePreboarding(
                    preboard_id=f"PRE-MGR-{db_obj.request_id}",
                    employee_id=db_obj.employee_id,
                    onboarding_request_id=db_obj.request_id,
                    personal_email=db_obj.personal_email,
                    status="Active",
                    manager_notes=f"Approved by {effective_approver}"
                )
                db.add(pre_req)

                # Initialize Role Assignment Registry record
                from app.models.role_assignment import RoleAssignment
                role_req = RoleAssignment(
                    assignment_id=f"RL-{db_obj.employee_id.split('-')[-1]}",
                    employee_id=db_obj.employee_id,
                    role_name=db_obj.role_name.upper() if db_obj.role_name else "STAFF",
                    login_enabled=True,
                    assigned_by=effective_approver,
                    assigned_at=datetime.now(),
                    is_active=True,
                    notes="Auto-provisioned via Manager Onboarding"
                )
                db.add(role_req)

        # --- WORKFLOW: Auto-create Manager Post-Approval Checklist ---
        manager_onboarding_repo.create_checklist(db, db_obj.employee_id, manager_id)
        
        # Transition to HR Portal (Only if NOT autonomous staff role)
        if not is_admin_onboarding:
            hr_request_id = f"REQ-HR-{db_obj.request_id}"
            existing_hr = hr_onboarding_repo.get_by_request_id(db, hr_request_id)
            if not existing_hr:
                hr_data = HROnboardingCreate(
                    request_id=hr_request_id,
                    manager_request_id=db_obj.request_id,
                    employee_id=db_obj.employee_id,
                    first_name=db_obj.first_name,
                    last_name=db_obj.last_name,
                    personal_email=db_obj.personal_email,
                    official_email=db_obj.login_email,
                    designation=db_obj.designation,
                    department=db_obj.department,
                    role_name=db_obj.role_name,
                    access_level=db_obj.access_level,
                    expected_join_date=db_obj.join_date,
                    reporting_manager_id=db_obj.manager_id,
                    team_leader_id=db_obj.team_leader_id,
                    hardware_req=db_obj.hardware_req,
                    documents=db_obj.documents
                )
                hr_onboarding_repo.create(db, hr_data)

        db.add(db_obj)
        audit_service.log_action(db, "manager_onboarding_requests", request_id, "APPROVE", str(user_id), old_data, {c.name: getattr(db_obj, c.name) for c in db_obj.__table__.columns})
        db.commit()
        db.refresh(db_obj)

        # Real-time event (Feature 38)
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(websocket_manager.broadcast({
                    "event": "data_updated",
                    "data": {
                        "type": "onboarding",
                        "request_id": request_id,
                        "status": db_obj.status,
                        "category": "manager"
                    }
                }))
            else:
                print("[WS] Event loop not running, skipping broadcast.")
        except RuntimeError:
            print("[WS] No event loop, skipping broadcast.")
        except Exception as ws_err:
            print(f"WebSocket broadcast failed: {ws_err}")
        
        return ManagerOnboardingApproveOut(
            request_id=request_id,
            status=db_obj.status,
            email=db_obj.login_email,
            role=db_obj.role_name,
            message=f"Manager has successfully provisioned {db_obj.role_name} portal access." if is_admin_onboarding else f"Authorized successfully. Request forwarded to HR."
        )

    def reject_request(self, db: Session, request_id: str, rejected_by: str):
        db_obj = manager_onboarding_repo.get_by_request_id(db, request_id)
        if not db_obj:
            return None
        
        db_obj.status = "rejected"
        db_obj.manager_status = "rejected"
        db_obj.rejected_by = rejected_by
        db_obj.rejected_at = datetime.now()
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # Real-time event (Feature 38)
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(websocket_manager.broadcast({
                    "event": "data_updated",
                    "data": {
                        "type": "onboarding",
                        "request_id": request_id,
                        "status": "rejected",
                        "category": "manager"
                    }
                }))
        except (RuntimeError, Exception):
            pass
        
        return db_obj

    def delete_request(self, db: Session, request_id: str):
        db_obj = manager_onboarding_repo.get_by_request_id(db, request_id)
        if not db_obj:
            return None
        
        db.delete(db_obj)
        db.commit()
        return True

    def update_request(self, db: Session, request_id: str, obj_in: ManagerOnboardingUpdate):
        db_obj = manager_onboarding_repo.get_by_request_id(db, request_id)
        if not db_obj:
            return None
        return manager_onboarding_repo.update(db, db_obj, obj_in)
    
    def get_employee_requests(self, db: Session, employee_id: str):
        return manager_onboarding_repo.get_by_employee_id(db, employee_id)

    # --- Checklist Logic ---
    def get_checklists(self, db: Session, manager_id: str):
        return manager_onboarding_repo.get_manager_checklists(db, manager_id)

    def update_checklist_step(self, db: Session, employee_id: str, updates: dict):
        return manager_onboarding_repo.update_checklist(db, employee_id, updates)

manager_onboarding_service = ManagerOnboardingService()

