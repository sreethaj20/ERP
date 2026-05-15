from sqlalchemy import Column, String, Integer, Date, DateTime, func, ForeignKey, Text, Boolean, Numeric, JSON
from app.db.base import Base

class Preboarding(Base):
    __tablename__ = "preboarding"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(String(50), index=True)
    offer_id = Column(String(50))
    completion_status = Column(Numeric(5, 2), default=0.00)
    status = Column(String(30), default="Pending")
    it_provisioned = Column(Boolean, default=False)
    assets_assigned = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

class EmployeePreboarding(Base):
    __tablename__ = "employee_preboarding"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    preboard_id = Column(String(50), unique=True, index=True)
    employee_id = Column(String(30), index=True)
    onboarding_request_id = Column(String(50))
    
    personal_email = Column(String(150))
    official_email = Column(String(150))
    phone = Column(String(20))
    alternate_phone = Column(String(20))
    address = Column(Text)
    permanent_address = Column(Text)
    current_address = Column(Text)
    pincode = Column(String(20))
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))

    # Core Bio (Synced from Employee/Onboarding)
    employee_name = Column(String(150))
    designation = Column(String(100))
    department = Column(String(100))
    gender = Column(String(20))
    dob = Column(Date)
    blood_group = Column(String(10))
    marital_status = Column(String(30))
    nationality = Column(String(50))

    
    status = Column(String(30), default="Active")
    documents_uploaded = Column(Boolean, default=False)
    documents_verified_by_hr = Column(Boolean, default=False)
    form_status = Column(String(30), default="pending")
    background_verification_status = Column(String(50), default="pending")
    laptop_required = Column(Boolean, default=False)
    id_card_required = Column(Boolean, default=False)
    asset_ready = Column(Boolean, default=False)
    
    emergency_contact_name = Column(String(100))
    emergency_contact_phone = Column(String(20))
    emergency_contact_relation = Column(String(50))
    pan_number = Column(String(20))
    aadhaar_number = Column(String(30))
    passport_number = Column(String(30))
    bank_account_number = Column(String(50))
    bank_name = Column(String(100))
    bank_ifsc_code = Column(String(20))
    
    policy_acknowledged = Column(Boolean, default=False)
    nda_signed = Column(Boolean, default=False)
    code_of_conduct_signed = Column(Boolean, default=False)
    uan_number = Column(String(30))
    esi_number = Column(String(50))
    pf_number = Column(String(50))
    documents = Column(Text) # Fallback from JSON for older MySQL compatibility
    
    # Document URLs (Synced from Onboarding)
    aadhaar_file_url = Column(Text)
    pan_file_url = Column(Text)
    education_certificate_url = Column(Text)
    resume_url = Column(Text)
    bank_proof_url = Column(Text)
    offer_letter_signed_url = Column(Text)
    
    thirty_day_goals = Column(Text)
    manager_notes = Column(Text)
    remarks = Column(Text)
    manager_review_status = Column(String(30), default="pending")
    hr_review_status = Column(String(30), default="pending")
    self_onboarding_status = Column(String(30), default="pending")
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
