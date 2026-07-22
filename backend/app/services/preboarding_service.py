from typing import Optional, List, Any
from sqlalchemy.orm import Session
from datetime import datetime
from app.repositories.preboarding_repo import preboarding_repo
from app.schemas.preboarding import PreboardingBase, PreboardingUpdateByEmployee, PreboardingUpdateByHR, PreboardingUpdateByManager
from app.models.preboarding import EmployeePreboarding
from app.models.employee import Employee
from app.models.user import User
from app.core.websocket_manager import websocket_manager
from app.services.storage_service import storage_service
import asyncio

class PreboardingService:
    def get_preboarding_by_employee_id(self, db: Session, employee_id: str):
        res = preboarding_repo.get_by_employee_id(db, employee_id)
        return self.hydrate_preboarding(res)

    def hydrate_preboarding(self, pb: Any) -> Any:
        """Centralized normalization of file URLs for preboarding records."""
        if not pb: return pb
        fields = [
            "aadhaar_file_url", "pan_file_url", "education_certificate_url",
            "resume_url", "bank_proof_url", "offer_letter_signed_url"
        ]
        return storage_service.hydrate_urls(pb, fields)

    def _sync_to_employee(self, db: Session, employee_id: str, pb_data: Any):
        emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not emp:
            return
        
        # Sync demographic fields
        if hasattr(pb_data, 'phone') and pb_data.phone: emp.phone = pb_data.phone
        if hasattr(pb_data, 'personal_email') and pb_data.personal_email: emp.personal_email = pb_data.personal_email
        
        # Sync emergency contact
        if hasattr(pb_data, 'emergency_contact_name') and pb_data.emergency_contact_name: 
            emp.emergency_contact_name = pb_data.emergency_contact_name
        if hasattr(pb_data, 'emergency_contact_phone') and pb_data.emergency_contact_phone: 
            emp.emergency_contact_phone = pb_data.emergency_contact_phone
        if hasattr(pb_data, 'emergency_contact_relation') and pb_data.emergency_contact_relation: 
            emp.emergency_contact_relation = pb_data.emergency_contact_relation
            
        # Address Sync
        if hasattr(pb_data, 'address') and pb_data.address: 
            emp.address = pb_data.address
        if hasattr(pb_data, 'permanent_address') and pb_data.permanent_address:
            emp.permanent_address = pb_data.permanent_address
        if hasattr(pb_data, 'current_address') and pb_data.current_address:
            emp.current_address = pb_data.current_address
        if hasattr(pb_data, 'pincode') and pb_data.pincode:
            emp.postal_code = pb_data.pincode
            emp.pincode = pb_data.pincode
        if hasattr(pb_data, 'city') and pb_data.city:
            emp.city = pb_data.city
        if hasattr(pb_data, 'state') and pb_data.state:
            emp.state = pb_data.state
        if hasattr(pb_data, 'country') and pb_data.country:
            emp.country = pb_data.country

        # Demographics & Identity Sync
        if hasattr(pb_data, 'pan_number') and pb_data.pan_number:
            emp.pan_number = pb_data.pan_number
        if hasattr(pb_data, 'aadhaar_number') and pb_data.aadhaar_number:
            emp.aadhaar_number = pb_data.aadhaar_number
        if hasattr(pb_data, 'passport_number') and pb_data.passport_number:
            emp.passport_number = pb_data.passport_number
        if hasattr(pb_data, 'gender') and pb_data.gender:
            emp.gender = pb_data.gender
        if hasattr(pb_data, 'dob') and pb_data.dob:
            emp.date_of_birth = pb_data.dob
            emp.dob = pb_data.dob
        if hasattr(pb_data, 'blood_group') and pb_data.blood_group:
            emp.blood_group = pb_data.blood_group
        if hasattr(pb_data, 'nationality') and pb_data.nationality:
            emp.nationality = pb_data.nationality
        if hasattr(pb_data, 'marital_status') and pb_data.marital_status:
            emp.marital_status = pb_data.marital_status

        # Bank Sync (Unified Schema Support)
        if hasattr(pb_data, 'bank_account_number') and pb_data.bank_account_number:
            emp.bank_account_number = pb_data.bank_account_number
            emp.bank_account_no = pb_data.bank_account_number
        if hasattr(pb_data, 'bank_name') and pb_data.bank_name:
            emp.bank_name = pb_data.bank_name
        if hasattr(pb_data, 'bank_ifsc_code') and pb_data.bank_ifsc_code:
            emp.bank_ifsc_code = pb_data.bank_ifsc_code
            emp.ifsc_code = pb_data.bank_ifsc_code
        
        # Compliance government IDs sync
        if hasattr(pb_data, 'uan_number') and pb_data.uan_number:
            emp.uan_number = pb_data.uan_number
        if hasattr(pb_data, 'esi_number') and pb_data.esi_number:
            emp.esi_number = pb_data.esi_number
        if hasattr(pb_data, 'pf_number') and pb_data.pf_number:
            emp.pf_number = pb_data.pf_number

        # Sync compliance flags
        if getattr(pb_data, 'policy_acknowledged', False): emp.identity_verified = True
        if getattr(pb_data, 'documents_verified_by_hr', False): emp.identity_verified = True
        
        db.add(emp)
        db.flush()

    def create(self, db: Session, obj_in: PreboardingBase):
        obj_data = obj_in.dict(exclude_unset=True)
        # Filter only valid columns for the model
        valid_cols = EmployeePreboarding.__table__.columns.keys()
        filtered_data = {k: v for k, v in obj_data.items() if k in valid_cols}
        
        db_obj = EmployeePreboarding(**filtered_data)
        db_obj.status = "Active"
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100, manager_id: Optional[str] = None):
        """
        Fetch preboarding records with employee metadata.
        🛡️ End-to-End Visibility: HR sees all records; Managers see their recursive team.
        """
        # Use outerjoin to ensure preboarding records are visible even if the employee profile is in flux
        query = db.query(EmployeePreboarding, Employee.name, Employee.official_email).outerjoin(
            Employee, Employee.employee_id == EmployeePreboarding.employee_id
        ).filter(EmployeePreboarding.deleted_at == None)
        
        if manager_id:
            query = query.filter(Employee.manager_id == manager_id)
        # Removed restrictive admin_roles filter for HR to ensure full organizational oversight.
            
        results = query.offset(skip).limit(limit).all()
        
        # Unpack result tuples and attach metadata
        final_list = []
        for pb, name, off_email in results:
            pb.employee_name = name
            if not pb.official_email and off_email:
                pb.official_email = off_email
            final_list.append(self.hydrate_preboarding(pb))
        return final_list

    async def update_by_employee(self, db: Session, employee_id: str, obj_in: PreboardingUpdateByEmployee):
        db_obj = preboarding_repo.get_by_employee_id(db, employee_id)
        if not db_obj:
            return None
        
        # Mark as documents uploaded if any provided
        if obj_in.documents:
            db_obj.documents_uploaded = True
            
        res = preboarding_repo.update(db, db_obj, obj_in)
        self._sync_to_employee(db, employee_id, res)
        db.commit()
        return res

    async def verify_by_hr(self, db: Session, preboard_id: str, obj_in: PreboardingUpdateByHR):
        db_obj = preboarding_repo.get_by_preboard_id(db, preboard_id)
        if not db_obj:
            return None
        
        res = preboarding_repo.update(db, db_obj, obj_in)
        
        # Sync validated details to Employee Master immediately
        self._sync_to_employee(db, db_obj.employee_id, res)
        db.commit()
        return res

    async def monitor_by_manager(self, db: Session, preboard_id: str, obj_in: PreboardingUpdateByManager):
        db_obj = preboarding_repo.get_by_preboard_id(db, preboard_id)
        if not db_obj:
            return None
        
        # Determine if this is a staff role for autonomous verification
        emp = db.query(Employee).filter(Employee.employee_id == db_obj.employee_id).first()
        admin_roles = ["hr", "recruiter", "it", "teamleader", "manager", "admin", "itdepartment"]
        
        role_key = ""
        if emp and emp.designation:
            role_key = emp.designation.lower().replace(" ", "").replace("_", "")
        elif emp and emp.role:
            role_key = emp.role.lower().replace(" ", "").replace("_", "")
            
        is_staff_role = any(role in role_key for role in admin_roles)
            
        if obj_in.manager_review_status == "approved" and is_staff_role:
             # Force verify if manager approves staff role (Autonomous Governance)
             db_obj.hr_review_status = "verified"
             db_obj.status = "Completed"
             db_obj.documents_verified_by_hr = True
             
             # Sync all preboarding data to Employee table (Comprehensive Sync)
             self._sync_to_employee(db, db_obj.employee_id, db_obj)
             if emp:
                 emp.status = "Active"
                 db.add(emp)
        
        res = preboarding_repo.update(db, db_obj, obj_in)
        
        # Sync details to Employee Master immediately
        self._sync_to_employee(db, db_obj.employee_id, res)
        db.commit()
        
        # Ensure name and email are attached for the response schema
        if emp:
            res.employee_name = emp.name
            res.employee_email = emp.email or emp.official_email or emp.personal_email
            
        return res

    async def complete_by_manager(self, db: Session, preboard_id: str):
        db_obj = preboarding_repo.get_by_preboard_id(db, preboard_id)
        if not db_obj:
            return None
        
        db_obj.status = "Completed"
        db_obj.hr_review_status = "verified"
        db_obj.documents_verified_by_hr = True
        
        res = preboarding_repo.update(db, db_obj, {})
        
        # Sync all finalized preboarding data to Employee table
        self._sync_to_employee(db, db_obj.employee_id, db_obj)
        
        # Ensure name and email are attached for the response schema
        from app.models.employee import Employee
        emp = db.query(Employee).filter(Employee.employee_id == db_obj.employee_id).first()
        if emp:
            res.employee_name = emp.name
            res.employee_email = emp.email or emp.official_email or emp.personal_email
            
        await websocket_manager.broadcast({
            "event": "data_updated",
            "data": {"type": "preboarding", "id": preboard_id, "status": "Completed"}
        })
        return res

preboarding_service = PreboardingService()
