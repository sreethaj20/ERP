from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Any
from datetime import date, datetime

class HROnboardingBase(BaseModel):
    employee_id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None
    official_email: Optional[str] = None
    personal_email: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    role_name: Optional[str] = None
    access_level: Optional[str] = None
    expected_join_date: Optional[date] = None
    probation_period_days: Optional[int] = 90
    required_documents: Optional[Any] = None
    documents: Optional[Any] = None
    hardware_req: Optional[Any] = None
    reporting_manager_id: Optional[str] = None
    team_leader_id: Optional[str] = None

    # Missing Demographics & Identity
    personal_mobile: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    joining_location: Optional[str] = None
    pincode: Optional[str] = None
    alternate_mobile: Optional[str] = None
    
    # Verification & Compliance
    background_verification_status: Optional[str] = None
    medical_check_status: Optional[str] = None
    document_verification_status: Optional[str] = None
    documents_verified_by_hr: Optional[bool] = None
    documents_uploaded: Optional[bool] = None
    verification_notes: Optional[str] = None
    hardware_allocation_required: Optional[bool] = None
    orientation_scheduled: Optional[bool] = None
    orientation_date: Optional[date] = None
    orientation_completed: Optional[bool] = None
    mandatory_training_completed: Optional[bool] = None
    onboarding_status: Optional[str] = None
    
    # Verification Steps
    step_id_card: Optional[bool] = None
    step_bank_account: Optional[bool] = None
    step_background_check: Optional[bool] = None
    step_joining_kit: Optional[bool] = None

    # IT Provisioning & Hardware
    it_status: Optional[str] = "pending"
    it_remarks: Optional[str] = None
    laptop_serial_number: Optional[str] = None
    asset_tag: Optional[str] = None
    hardware_requirements: Optional[Any] = None

    # Demographic & Identity
    gender: Optional[str] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    passport_number: Optional[str] = None
    uan_number: Optional[str] = None
    esi_number: Optional[str] = None

    # Document URLs
    aadhaar_file_url: Optional[str] = None
    pan_file_url: Optional[str] = None
    education_certificate_url: Optional[str] = None
    previous_company_letter_url: Optional[str] = None
    passport_photo_url: Optional[str] = None
    resume_url: Optional[str] = None
    offer_letter_signed_url: Optional[str] = None
    bank_proof_url: Optional[str] = None

    @validator('expected_join_date', 'dob', 'orientation_date', pre=True)
    def parse_dates(cls, v):
        if isinstance(v, str) and v:
            if 'T' in v:
                return v.split('T')[0]
            if not v.strip():
                return None
        return v

class HROnboardingCreate(HROnboardingBase):
    request_id: str
    manager_request_id: Optional[str] = None

class HROnboardingUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    official_email: Optional[str] = None
    personal_email: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    role_name: Optional[str] = None
    access_level: Optional[str] = None
    expected_join_date: Optional[date] = None
    status: Optional[str] = None
    hr_status: Optional[str] = None
    it_status: Optional[str] = None
    orientation_scheduled: Optional[bool] = None
    background_verification_status: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    team_leader_id: Optional[str] = None
    
    # Verification Steps
    step_id_card: Optional[bool] = None
    step_bank_account: Optional[bool] = None
    step_background_check: Optional[bool] = None
    step_joining_kit: Optional[bool] = None
    
    hardware_req: Optional[Any] = None
    remarks: Optional[str] = None
    
    # UI Sync Fields
    onboarding_status: Optional[str] = None
    orientation_date: Optional[date] = None
    orientation_completed: Optional[bool] = None
    mandatory_training_completed: Optional[bool] = None
    hardware_requirements: Optional[Any] = None
    passport_number: Optional[str] = None
    uan_number: Optional[str] = None
    esi_number: Optional[str] = None
    
    # Demographics & Identity
    gender: Optional[str] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    personal_mobile: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    joining_location: Optional[str] = None
    pincode: Optional[str] = None
    alternate_mobile: Optional[str] = None
    probation_period_days: Optional[int] = None
    
    # Verification & Compliance
    medical_check_status: Optional[str] = None
    document_verification_status: Optional[str] = None
    documents_verified_by_hr: Optional[bool] = None
    documents_uploaded: Optional[bool] = None
    verification_notes: Optional[str] = None
    hardware_allocation_required: Optional[bool] = None
    
    # Document URLs
    aadhaar_file_url: Optional[str] = None
    pan_file_url: Optional[str] = None
    education_certificate_url: Optional[str] = None
    previous_company_letter_url: Optional[str] = None
    passport_photo_url: Optional[str] = None
    resume_url: Optional[str] = None
    offer_letter_signed_url: Optional[str] = None
    bank_proof_url: Optional[str] = None

class HROnboardingOut(HROnboardingBase):
    id: int
    request_id: str
    status: str
    manager_status: Optional[str] = "pending"
    hr_status: Optional[str] = "pending"
    it_status: Optional[str] = "pending"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class HROnboardingBulkCreate(BaseModel):
    employees: List[HROnboardingCreate]

class HROnboardingApproveOut(BaseModel):
    request_id: str
    status: str
    message: str
