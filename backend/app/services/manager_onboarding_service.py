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
from app.services.storage_service import storage_service
import asyncio

class ManagerOnboardingService:
    async def create_request(self, db: Session, obj_in: ManagerOnboardingCreate, manager_id: str) -> ManagerOnboardingRequest:
        obj_in.manager_id = manager_id
        # Process documents (Base64)
        if obj_in.documents:
            await self._process_onboarding_documents(obj_in)
            
        res = manager_onboarding_repo.create(db, obj_in)
        db.commit()
        db.refresh(res)
        return res

    async def create_bulk_request(self, db: Session, employees: list, manager_id: str):
        results = []
        for emp in employees:
            emp.manager_id = manager_id
            # Process documents (Base64)
            if hasattr(emp, "documents") or (isinstance(emp, dict) and "documents" in emp):
                await self._process_onboarding_documents(emp)
            results.append(manager_onboarding_repo.create(db, emp))
        db.commit()
        return results

    async def _process_onboarding_documents(self, obj: Any):
        """Internal helper to convert base64 docs to S3 paths."""
        docs = getattr(obj, "documents", None) or (obj.get("documents") if isinstance(obj, dict) else None)
        if not docs or not isinstance(docs, dict):
            return

        import base64
        import uuid
        from app.services.storage_service import storage_service

        for key, val in docs.items():
            if isinstance(val, str) and val.startswith("data:"):
                try:
                    header, encoded = val.split(",", 1)
                    mime = header.split(":")[1].split(";")[0]
                    ext = mime.split("/")[1]
                    if ext == "jpeg": ext = "jpg"
                    if ext == "svg+xml": ext = "svg"
                    
                    content_bytes = base64.b64decode(encoded)
                    # Get candidate name for folder structure and filename
                    f_name = getattr(obj, "first_name", "") or (obj.get("first_name") if isinstance(obj, dict) else "")
                    l_name = getattr(obj, "last_name", "") or (obj.get("last_name") if isinstance(obj, dict) else "")
                    emp_id = getattr(obj, "employee_id", "ONB") or (obj.get("employee_id") if isinstance(obj, dict) else "ONB")
                    
                    candidate_name = f"{f_name}_{l_name}".strip("_")
                    if not candidate_name:
                        candidate_name = emp_id
                        
                    candidate_folder = candidate_name.replace(" ", "_").replace(".", "")
                    
                    # Include name in filename for better S3 visibility
                    safe_name = candidate_folder.lower()
                    filename = f"{safe_name}_{key}_{uuid.uuid4().hex[:6]}.{ext}"
                    path, _ = await storage_service.save_content(content_bytes, filename, sub_dir=f"onboarding/{candidate_folder}")
                    
                    # Update back to the object
                    if isinstance(obj, dict):
                        obj["documents"][key] = path
                    else:
                        obj.documents[key] = path
                except Exception as e:
                    print(f"[ONBOARDING SERVICE ERROR] Failed to process base64 {key}: {e}")

    def get_requests(self, db: Session, skip: int = 0, limit: int = 100, manager_id: Optional[str] = None):
        requests = manager_onboarding_repo.get_multi(db, skip, limit, manager_id=manager_id)
        for r in requests:
            self.hydrate_manager_request(r)
        return requests

    def hydrate_manager_request(self, req: Any) -> Any:
        """Hydrate URLs inside the documents JSON dict."""
        if not req or not req.documents: return req
        if isinstance(req.documents, dict):
            prefixes = ("uploads/", "company/", "documents/", "onboarding/", "profiles/")
            for key, val in req.documents.items():
                if isinstance(val, str) and (val.startswith(prefixes) or "/" in val):
                    req.documents[key] = storage_service.get_public_url(val)
        return req

    async def approve_request(self, db: Session, request_id: str, user_id: int, manager_id: str) -> ManagerOnboardingApproveOut:
        db_obj = manager_onboarding_repo.get_by_request_id(db, request_id)
        if not db_obj:
            return None
        
        # Verify authority only if manager_id is specified
        if db_obj.manager_id and manager_id and db_obj.manager_id != manager_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="You do not have authority over this request.")

        # Idempotency check: If already processed, return success
        if db_obj.status in ["Approved", "Completed"] and db_obj.manager_status == "approved":
             return ManagerOnboardingApproveOut(
                 request_id=request_id,
                 status=db_obj.status,
                 email=db_obj.login_email,
                 role=db_obj.role_name,
                 message="Request already processed."
             )

        # Capture old state for audit
        old_data = {c.name: getattr(db_obj, c.name) for c in db_obj.__table__.columns}

        # Atomic status update: Manager Approval is now FINAL for all roles
        db_obj.status = "Completed"
        db_obj.manager_status = "approved"
        db_obj.approved_by = f"User {user_id}"
        db_obj.approved_at = datetime.now()
        db_obj.current_approver_stage = "Completed"
        
        # --- WORKFLOW: Autonomous Identity Provisioning (Final Authority) ---
        target_username = f"usr_{db_obj.employee_id.lower().replace('-', '_')}"
        target_email = (db_obj.login_email or db_obj.personal_email or "").strip()
        
        # Ultra-robust check: search by email, username, and employee_id independently
        # and use ilike for case-insensitive matching in case DB collation varies
        existing_user = db.query(User).filter(
            (User.employee_id == db_obj.employee_id) | 
            (User.username.ilike(target_username)) | 
            (User.email.ilike(target_email))
        ).first()

        if not existing_user:
            try:
                new_user = User(
                    username=target_username,
                    email=target_email,
                    hashed_password=get_password_hash("Mercure@123"), # Default Password
                    role=db_obj.role_name.lower().replace(" ", "") if db_obj.role_name else "employee",
                    full_name=f"{db_obj.first_name} {db_obj.last_name or ''}".strip(),
                    employee_id=db_obj.employee_id,
                    is_active=True
                )
                db.add(new_user)
                db.flush()
                effective_user_id = new_user.id
            except Exception as e:
                # RECOVERY: If someone else just created this user during this transaction, find it
                db.flush() # Try to see if it's in the current session
                existing_user = db.query(User).filter(
                    (User.username == target_username) | (User.email == target_email)
                ).first()
                if not existing_user:
                    # If still not found, it's a real error
                    raise e
                effective_user_id = existing_user.id
        else:
            existing_user.is_active = True
            existing_user.deleted_at = None
            db.add(existing_user)
            effective_user_id = existing_user.id

        # Guard Employee Record
        existing_emp = db.query(Employee).filter(Employee.employee_id == db_obj.employee_id).first()
        if not existing_emp:
            new_emp = Employee(
                user_id=effective_user_id,
                employee_id=db_obj.employee_id,
                first_name=db_obj.first_name,
                last_name=db_obj.last_name,
                name=f"{db_obj.first_name} {db_obj.last_name or ''}".strip(),
                email=target_email,
                official_email=db_obj.login_email,
                personal_email=db_obj.personal_email,
                phone=db_obj.personal_mobile,
                department=db_obj.department,
                designation=db_obj.designation,
                manager_id=db_obj.manager_id,
                team_leader_id=db_obj.team_leader_id,
                joining_date=db_obj.join_date or datetime.now().date(),
                gender=db_obj.gender,
                date_of_birth=db_obj.dob,
                blood_group=db_obj.blood_group,
                nationality=db_obj.nationality,
                work_location=db_obj.joining_location,
                status="Active",
                role=db_obj.role_name.lower().replace(" ", "") if db_obj.role_name else "employee"
            )
            db.add(new_emp)
            db.flush()
        else:
            existing_emp.status = "Active"
            db.add(existing_emp)
        
        # Guard Autonomous Preboarding
        target_preboard_id = f"PRE-MGR-{db_obj.request_id}"
        existing_pre = db.query(EmployeePreboarding).filter(EmployeePreboarding.preboard_id == target_preboard_id).first()
        if not existing_pre:
            effective_approver = f"User {user_id}"
            pre_req = EmployeePreboarding(
                preboard_id=target_preboard_id,
                employee_id=db_obj.employee_id,
                onboarding_request_id=db_obj.request_id,
                personal_email=db_obj.personal_email,
                official_email=db_obj.login_email,
                phone=db_obj.personal_mobile,
                current_address=db_obj.joining_location,
                status="Active",
                manager_notes=f"Approved by {effective_approver}"
            )
            db.add(pre_req)

        # Guard Role Assignment Registry record
        target_assignment_id = f"RL-{db_obj.employee_id}"
        from app.models.role_assignment import RoleAssignment
        existing_role = db.query(RoleAssignment).filter(RoleAssignment.assignment_id == target_assignment_id).first()
        if not existing_role:
            effective_approver = f"User {user_id}"
            role_req = RoleAssignment(
                assignment_id=target_assignment_id,
                employee_id=db_obj.employee_id,
                role_name=db_obj.role_name.upper() if db_obj.role_name else "STAFF",
                login_enabled=True,
                assigned_by=effective_approver,
                assigned_at=datetime.now(),
                is_active=True,
                notes="Auto-provisioned via Manager Onboarding"
            )
            db.add(role_req)
        else:
            existing_role.is_active = True
            existing_role.login_enabled = True
            db.add(existing_role)

        # --- WORKFLOW: Guarded Checklist Creation ---
        manager_onboarding_repo.create_checklist(db, db_obj.employee_id, manager_id)
        
        # Transitions to HR Portal removed - Manager approval is FINAL.

        db.add(db_obj)
        audit_service.log_action(db, "manager_onboarding_requests", request_id, "APPROVE", str(user_id), old_data, {c.name: getattr(db_obj, c.name) for c in db_obj.__table__.columns})
        db.commit()
        db.refresh(db_obj)

        await websocket_manager.broadcast({
            "event": "data_updated",
            "data": {
                "type": "onboarding",
                "request_id": request_id,
                "status": db_obj.status,
                "category": "manager"
            }
        })
        
        return ManagerOnboardingApproveOut(
            request_id=request_id,
            status=db_obj.status,
            email=db_obj.login_email,
            role=db_obj.role_name,
            message=f"Success! Manager approval is final. {db_obj.role_name} portal access provisioned."
        )

    async def reject_request(self, db: Session, request_id: str, rejected_by: str):
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
        await websocket_manager.broadcast({
            "event": "data_updated",
            "data": {
                "type": "onboarding",
                "request_id": request_id,
                "status": "rejected",
                "category": "manager"
            }
        })
        
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
        res = manager_onboarding_repo.update(db, db_obj, obj_in)
        db.commit()
        db.refresh(res)
        return res
    
    def get_employee_requests(self, db: Session, employee_id: str):
        return manager_onboarding_repo.get_by_employee_id(db, employee_id)

    # --- Checklist Logic ---
    def get_checklists(self, db: Session, manager_id: str):
        return manager_onboarding_repo.get_manager_checklists(db, manager_id)

    def update_checklist_step(self, db: Session, employee_id: str, updates: dict):
        return manager_onboarding_repo.update_checklist(db, employee_id, updates)

manager_onboarding_service = ManagerOnboardingService()
