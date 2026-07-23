from sqlalchemy.orm import Session
from datetime import datetime
from app.repositories.hr_onboarding_repo import hr_onboarding_repo
from app.schemas.hr_onboarding import HROnboardingCreate, HROnboardingUpdate, HROnboardingApproveOut
from app.models.hr_onboarding import HROnboardingRequest
from app.models.employee import Employee
from app.models.user import User
from app.models.preboarding import EmployeePreboarding
from app.core.security import get_password_hash
from sqlalchemy import func
from app.core.websocket_manager import websocket_manager
import asyncio
from app.services.storage_service import storage_service
from typing import List, Optional, Any

class HROnboardingService:
    def get_requests(self, db: Session, skip: int = 0, limit: int = 100):
        requests = hr_onboarding_repo.get_multi(db, skip, limit)
        for r in requests:
            self._merge_employee_master_data(db, r)
            self.hydrate_onboarding_request(r)
        return requests

    def hydrate_onboarding_request(self, req: Any) -> Any:
        """Centralized normalization of file URLs for HR onboarding requests."""
        if not req: return req
        fields = [
            "aadhaar_file_url", "pan_file_url", "education_certificate_url",
            "resume_url", "bank_proof_url", "offer_letter_signed_url"
        ]
        return storage_service.hydrate_urls(req, fields)

    def _merge_employee_master_data(self, db: Session, req: Any):
        if not req or not req.employee_id:
            return
        from app.models.employee import Employee
        emp = db.query(Employee).filter(Employee.employee_id == req.employee_id, Employee.deleted_at == None).first()
        if not emp:
            return
            
        # Merge fields from Employee (prioritize Employee as single source of truth)
        req.first_name = emp.first_name or req.first_name
        req.last_name = emp.last_name or req.last_name
        req.name = emp.name or req.name
        req.official_email = emp.official_email or req.official_email
        req.personal_email = emp.personal_email or req.personal_email
        req.designation = emp.designation or req.designation
        req.department = emp.department or req.department
        req.gender = emp.gender or req.gender
        req.dob = emp.dob or emp.date_of_birth or req.dob
        req.blood_group = emp.blood_group or req.blood_group
        req.marital_status = emp.marital_status or req.marital_status
        req.nationality = emp.nationality or req.nationality
        req.personal_mobile = emp.personal_mobile or emp.phone or req.personal_mobile
        req.alternate_mobile = emp.alternate_mobile or req.alternate_mobile
        req.aadhaar_number = emp.aadhaar_number or req.aadhaar_number
        req.pan_number = emp.pan_number or req.pan_number
        req.passport_number = emp.passport_number or req.passport_number
        req.uan_number = emp.uan_number or req.uan_number
        req.esi_number = emp.esi_number or req.esi_number
        req.pf_number = emp.pf_number or getattr(req, 'pf_number', None)
        req.joining_location = emp.work_location or req.joining_location
        req.joining_date = emp.joining_date or req.joining_date
        req.expected_join_date = emp.joining_date or req.expected_join_date
        req.probation_period_days = emp.probation_period_days or req.probation_period_days
        req.reporting_manager_id = emp.manager_id or emp.reporting_manager_id or req.reporting_manager_id
        req.team_leader_id = emp.team_leader_id or req.team_leader_id
        
        # Address fields
        req.city = emp.city or req.city
        req.state = emp.state or req.state
        req.country = emp.country or req.country
        req.pincode = emp.pincode or emp.postal_code or req.pincode
        
        # Files/URLs
        req.aadhaar_file_url = emp.aadhaar_file_url or req.aadhaar_file_url
        req.pan_file_url = emp.pan_file_url or req.pan_file_url
        req.education_certificate_url = emp.education_certificate_url or req.education_certificate_url
        req.resume_url = emp.resume_url or req.resume_url
        req.offer_letter_signed_url = emp.offer_letter_signed_url or req.offer_letter_signed_url
        req.bank_proof_url = emp.bank_proof_url or req.bank_proof_url

    def create_request(self, db: Session, obj_in: HROnboardingCreate) -> HROnboardingRequest:
        res = hr_onboarding_repo.create(db, obj_in)
        db.commit()
        db.refresh(res)
        return res

    def create_bulk_requests(self, db: Session, employees: List[HROnboardingCreate]):
        results = []
        for emp in employees:
            results.append(hr_onboarding_repo.create(db, emp))
        db.commit()
        return results

    async def approve_request(self, db: Session, request_id: str, approved_by: str) -> HROnboardingApproveOut:
        db_obj = hr_onboarding_repo.get_by_request_id(db, request_id)
        if not db_obj:
            return None
        
        # Idempotency: If already approved, return success
        if db_obj.status == "approved" or db_obj.hr_status == "approved":
            return HROnboardingApproveOut(
                request_id=request_id,
                status="approved",
                message="Request already processed."
            )
        
        db_obj.status = "approved"
        db_obj.hr_status = "approved"
        db_obj.onboarding_status = "approved" # Keep UI in sync
        db_obj.approved_by = approved_by
        db_obj.approved_at = datetime.now()
        db_obj.current_approver_stage = "it" # Forward to IT or complete
        
        # --- WORKFLOW: Provision Identity (User & Employee) ---
        target_username = f"usr_onb_{db_obj.employee_id}"
        target_email = (db_obj.official_email or db_obj.personal_email or "").strip()

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
                    hashed_password=get_password_hash("Mercure@123"),
                    role=db_obj.role_name or "employee",
                    full_name=f"{db_obj.first_name} {db_obj.last_name or ''}".strip(),
                    employee_id=db_obj.employee_id,
                    is_active=True
                )
                db.add(new_user)
                db.flush()
                effective_user_id = new_user.id
            except Exception as e:
                db.flush()
                existing_user = db.query(User).filter(
                    (User.username == target_username) | (User.email == target_email)
                ).first()
                if not existing_user:
                    raise e
                effective_user_id = existing_user.id
        else:
            effective_user_id = existing_user.id

        # Guard Employee creation
        from app.repositories.employee_repo import employee_repo
        existing_emp = db.query(Employee).filter(Employee.employee_id == db_obj.employee_id).first()
        if not existing_emp:
            new_emp = Employee(
                user_id=effective_user_id,
                employee_id=db_obj.employee_id,
                first_name=db_obj.first_name,
                last_name=db_obj.last_name,
                name=f"{db_obj.first_name} {db_obj.last_name or ''}".strip(),
                email=db_obj.official_email,
                official_email=db_obj.official_email,
                personal_email=db_obj.personal_email,
                department=db_obj.department,
                designation=db_obj.designation,
                joining_date=db_obj.expected_join_date,
                joining_date_v2=db_obj.expected_join_date,
                join_date=db_obj.expected_join_date,
                status="Onboarding",
                manager_id=db_obj.reporting_manager_id,
                team_leader_id=db_obj.team_leader_id,
                gender=db_obj.gender,
                date_of_birth=db_obj.dob,
                dob=db_obj.dob,
                pan_number=db_obj.pan_number,
                aadhaar_number=db_obj.aadhaar_number,
                passport_number=db_obj.passport_number,
                nationality=db_obj.nationality,
                marital_status=db_obj.marital_status,
                blood_group=db_obj.blood_group,
                city=db_obj.city,
                state=db_obj.state,
                country=db_obj.country,
                aadhaar_file_url=db_obj.aadhaar_file_url,
                pan_file_url=db_obj.pan_file_url,
                resume_url=db_obj.resume_url,
                bank_proof_url=db_obj.bank_proof_url,
                offer_letter_signed_url=db_obj.offer_letter_signed_url,
                uan_number=db_obj.uan_number,
                esi_number=db_obj.esi_number,
                pincode=db_obj.pincode,
                alternate_mobile=db_obj.alternate_mobile,
                probation_period_days=db_obj.probation_period_days or 90
            )
            db.add(new_emp)
        else:
            # Sync existing employee with latest onboarding data
            existing_emp.first_name = db_obj.first_name
            existing_emp.last_name = db_obj.last_name
            existing_emp.name = f"{db_obj.first_name} {db_obj.last_name or ''}".strip()
            existing_emp.email = db_obj.official_email
            existing_emp.official_email = db_obj.official_email
            existing_emp.department = db_obj.department
            existing_emp.designation = db_obj.designation
            existing_emp.status = "Onboarding"
            existing_emp.manager_id = db_obj.reporting_manager_id
            existing_emp.team_leader_id = db_obj.team_leader_id
            existing_emp.gender = db_obj.gender
            existing_emp.dob = db_obj.dob
            existing_emp.pan_number = db_obj.pan_number
            existing_emp.aadhaar_number = db_obj.aadhaar_number
            existing_emp.uan_number = db_obj.uan_number
            existing_emp.esi_number = db_obj.esi_number
            existing_emp.pincode = db_obj.pincode
            existing_emp.alternate_mobile = db_obj.alternate_mobile
            existing_emp.probation_period_days = db_obj.probation_period_days or 90
            existing_emp.aadhaar_file_url = db_obj.aadhaar_file_url
            existing_emp.pan_file_url = db_obj.pan_file_url
            existing_emp.resume_url = db_obj.resume_url
            db.add(existing_emp)

        # --- WORKFLOW: Initialize Preboarding Record ---
        existing_pre = db.query(EmployeePreboarding).filter(EmployeePreboarding.employee_id == db_obj.employee_id).first()
        if not existing_pre:
            pre_req = EmployeePreboarding(
                preboard_id=f"PRE-HR-{db_obj.request_id}",
                employee_id=db_obj.employee_id,
                onboarding_request_id=db_obj.request_id,
                personal_email=db_obj.personal_email,
                official_email=db_obj.official_email,
                phone=db_obj.personal_mobile,
                status="Active",
                manager_notes=f"HR Approved onboarding for {db_obj.first_name}",
                
                # Sync Documents & Identity
                aadhaar_number=db_obj.aadhaar_number,
                pan_number=db_obj.pan_number,
                aadhaar_file_url=db_obj.aadhaar_file_url,
                pan_file_url=db_obj.pan_file_url,
                education_certificate_url=db_obj.education_certificate_url,
                resume_url=db_obj.resume_url,
                bank_proof_url=db_obj.bank_proof_url,
                offer_letter_signed_url=db_obj.offer_letter_signed_url
            )
            db.add(pre_req)

        # Guard Role Assignment Registry record
        target_assignment_id = f"RL-{db_obj.employee_id}"
        from app.models.role_assignment import RoleAssignment
        existing_role = db.query(RoleAssignment).filter(RoleAssignment.employee_id == db_obj.employee_id).first()
        if not existing_role:
            role_req = RoleAssignment(
                assignment_id=target_assignment_id,
                employee_id=db_obj.employee_id,
                role_name=db_obj.role_name.upper() if db_obj.role_name else "STAFF",
                login_enabled=True,
                assigned_by=approved_by,
                assigned_at=datetime.now(),
                is_active=True,
                notes="Auto-provisioned via HR Onboarding Approval"
            )
            db.add(role_req)
        else:
            existing_role.is_active = True
            existing_role.login_enabled = True
            db.add(existing_role)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # Real-time event
        await websocket_manager.broadcast({
            "event": "onboarding_updated",
            "data": {
                "request_id": request_id,
                "status": "approved",
                "type": "hr"
            }
        })

        return HROnboardingApproveOut(
            request_id=request_id,
            status="approved",
            message="HR onboarding request approved. Forwarded for asset allocation."
        )

    async def complete_onboarding(self, db: Session, request_id: str):
        db_obj = hr_onboarding_repo.get_by_request_id(db, request_id)
        if not db_obj:
            return None
        
        db_obj.status = "completed"
        db_obj.hr_status = "completed"
        db_obj.onboarding_status = "completed" # Keep UI in sync
        
        # --- End-to-End: Finalize Employee Activation ---
        emp = db.query(Employee).filter(Employee.employee_id == db_obj.employee_id).first()
        if emp:
            emp.status = "Active"
            
            # Feature: Ensure all preboarding data is synced one last time before activation
            from app.models.preboarding import EmployeePreboarding
            from app.services.preboarding_service import preboarding_service
            pb = db.query(EmployeePreboarding).filter(EmployeePreboarding.employee_id == emp.employee_id).first()
            if pb:
                preboarding_service._sync_to_employee(db, emp.employee_id, pb)
                
            db.add(emp)
            
            # Ensure User account is enabled for login
            user = db.query(User).filter(User.id == emp.user_id).first()
            if user:
                user.is_active = True
                user.deleted_at = None
                db.add(user)

            # Ensure RoleAssignment record is active and enabled for login
            from app.models.role_assignment import RoleAssignment
            role = db.query(RoleAssignment).filter(RoleAssignment.employee_id == emp.employee_id).first()
            if role:
                role.is_active = True
                role.login_enabled = True
                db.add(role)
            else:
                new_role = RoleAssignment(
                    assignment_id=f"RL-{emp.employee_id}",
                    employee_id=emp.employee_id,
                    role_name=(emp.role or emp.designation or "STAFF").upper(),
                    login_enabled=True,
                    assigned_by="system",
                    assigned_at=datetime.now(),
                    is_active=True,
                    notes="Auto-provisioned on HR onboarding completion"
                )
                db.add(new_role)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        self._merge_employee_master_data(db, db_obj)
        self.hydrate_onboarding_request(db_obj)

        # Real-time event
        await websocket_manager.broadcast({
            "event": "onboarding_updated",
            "data": {
                "request_id": request_id,
                "status": "completed",
                "type": "hr"
            }
        })

        return db_obj

    def update_request(self, db: Session, request_id: str, obj_in: HROnboardingUpdate):
        db_obj = hr_onboarding_repo.get_by_request_id(db, request_id)
        if not db_obj:
            return None
        res = hr_onboarding_repo.update(db, db_obj, obj_in)
        db.commit()
        db.refresh(res)
        self._merge_employee_master_data(db, res)
        self.hydrate_onboarding_request(res)
        return res

hr_onboarding_service = HROnboardingService()
