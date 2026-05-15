from sqlalchemy import Column, String, Integer, Date, DateTime, func, ForeignKey, Text, Boolean, JSON, TypeDecorator
from app.db.base import Base
import json

class JSONEncodedDict(TypeDecorator):
    """Enables JSON storage of dicts/lists in a Text column for legacy DB support."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                if isinstance(value, str):
                    return json.loads(value)
                return value
            except (ValueError, TypeError):
                return {}
        return {}

class HROnboarding(Base):
# ... (rest of HROnboarding)
    __tablename__ = "hr_onboarding"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id = Column(String(50), index=True)
    employee_id = Column(String(30), unique=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    full_name = Column(String(150)) # Legacy/Joined name
    email = Column(String(150))     # Primary contact email
    official_email = Column(String(150))
    personal_email = Column(String(150))
    department = Column(String(100))
    designation = Column(String(100))
    status = Column(String(30), default="pending") # pending, Processing, Completed
    step_id_card = Column(Boolean, default=False)
    step_bank_account = Column(Boolean, default=False)
    step_background_check = Column(Boolean, default=False)
    step_joining_kit = Column(Boolean, default=False)
    remarks = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

class HROnboardingRequest(Base):
    __tablename__ = "hr_onboarding_requests"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id = Column(String(50), unique=True, index=True)
    manager_request_id = Column(String(50))
    employee_id = Column(String(30))
    
    first_name = Column(String(100))
    last_name = Column(String(100))
    personal_email = Column(String(150))
    official_email = Column(String(150))
    designation = Column(String(100))
    department = Column(String(100))
    role_name = Column(String(30))
    access_level = Column(String(50))
    expected_join_date = Column(Date)
    
    hardware_req = Column(JSONEncodedDict) # JSON column for resource allocation
    documents = Column(JSONEncodedDict)    # JSON column for verification docs
    
    # --- DOCUMENT REPOSITORY (Top-level columns for persistence) ---
    aadhaar_file_url = Column(Text)
    pan_file_url = Column(Text)
    education_certificate_url = Column(Text)
    previous_company_letter_url = Column(Text)
    passport_photo_url = Column(Text)
    resume_url = Column(Text)
    offer_letter_signed_url = Column(Text)
    bank_proof_url = Column(Text)
    
    reporting_manager_id = Column(String(50))
    team_leader_id = Column(String(50))
    
    # --- DEMOGRAPHICS & IDENTITY ---
    personal_mobile = Column(String(20))
    gender = Column(String(20))
    dob = Column(Date)
    blood_group = Column(String(10))
    marital_status = Column(String(30))
    nationality = Column(String(50))
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    pincode = Column(String(20))
    alternate_mobile = Column(String(20))
    aadhaar_number = Column(String(30))
    pan_number = Column(String(30))
    joining_location = Column(String(100))
    probation_period_days = Column(Integer, default=90)
    
    # --- VERIFICATION & COMPLIANCE ---
    background_verification_status = Column(String(30), default="pending")
    medical_check_status = Column(String(30), default="pending")
    document_verification_status = Column(String(30), default="pending")
    documents_verified_by_hr = Column(Boolean, default=False)
    documents_uploaded = Column(Boolean, default=False)
    verification_notes = Column(Text)
    hardware_allocation_required = Column(Boolean, default=False)
    orientation_scheduled = Column(Boolean, default=False)
    
    # --- PIPELINE VERIFICATION STEPS ---
    step_id_card = Column(Boolean, default=False)
    step_bank_account = Column(Boolean, default=False)
    step_background_check = Column(Boolean, default=False)
    step_joining_kit = Column(Boolean, default=False)
    
    hr_status = Column(String(30), default="pending")
    it_status = Column(String(30), default="pending")
    current_approver_stage = Column(String(30), default="hr")
    
    # --- UI SYNC FIELDS (Employee Master) ---
    onboarding_status = Column(String(30), default="pending")
    orientation_date = Column(Date)
    orientation_completed = Column(Boolean, default=False)
    mandatory_training_completed = Column(Boolean, default=False)
    hardware_requirements = Column(JSONEncodedDict)
    passport_number = Column(String(50))
    uan_number = Column(String(50))
    esi_number = Column(String(50))
    
    # --- ADDITIONAL SYNC COLUMNS ---
    joining_date = Column(Date)
    join_date = Column(Date)
    login_email = Column(String(150))
    role_type = Column(String(60))
    manager_status = Column(String(30), default="pending")

    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    
    status = Column(String(30), default="pending")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
