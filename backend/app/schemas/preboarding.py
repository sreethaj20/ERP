from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import date, datetime

class PreboardingBase(BaseModel):
    preboard_id: str
    employee_id: str
    employee_name: Optional[str] = None
    personal_email: Optional[EmailStr] = None
    official_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    passport_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    permanent_address: Optional[str] = None
    current_address: Optional[str] = None
    pincode: Optional[str] = None
    policy_acknowledged: Optional[bool] = False
    nda_signed: Optional[bool] = False
    code_of_conduct_signed: Optional[bool] = False
    uan_number: Optional[str] = None
    esi_number: Optional[str] = None
    pf_number: Optional[str] = None
    
    # Demographics (UI Sync)
    gender: Optional[str] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    
    # Document URLs
    aadhaar_file_url: Optional[str] = None
    pan_file_url: Optional[str] = None
    education_certificate_url: Optional[str] = None
    resume_url: Optional[str] = None
    bank_proof_url: Optional[str] = None
    offer_letter_signed_url: Optional[str] = None


class PreboardingUpdateByEmployee(BaseModel):
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    passport_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    permanent_address: Optional[str] = None
    current_address: Optional[str] = None
    pincode: Optional[str] = None
    policy_acknowledged: Optional[bool] = None
    nda_signed: Optional[bool] = None
    code_of_conduct_signed: Optional[bool] = None
    uan_number: Optional[str] = None
    esi_number: Optional[str] = None
    pf_number: Optional[str] = None
    documents: Optional[Any] = None
    
    # Demographics
    gender: Optional[str] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None


class PreboardingUpdateByHR(BaseModel):
    documents_verified_by_hr: Optional[bool] = None
    background_verification_status: Optional[bool] = None
    form_status: Optional[str] = None
    hr_review_status: Optional[str] = None
    remarks: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc_code: Optional[str] = None

class PreboardingUpdate(BaseModel):
    employee_name: Optional[str] = None
    official_email: Optional[EmailStr] = None
    personal_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    hr_review_status: Optional[str] = None
    manager_review_status: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    passport_number: Optional[str] = None
    documents_verified_by_hr: Optional[bool] = None
    background_verification_status: Optional[str] = None
    nda_signed: Optional[bool] = None
    code_of_conduct_signed: Optional[bool] = None
    policy_acknowledged: Optional[bool] = None
    uan_number: Optional[str] = None
    esi_number: Optional[str] = None
    pf_number: Optional[str] = None
    current_address: Optional[str] = None
    permanent_address: Optional[str] = None
    
    # Demographics
    gender: Optional[str] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None

class PreboardingUpdateByManager(BaseModel):
    manager_review_status: Optional[str] = None
    asset_ready: Optional[bool] = None
    remarks: Optional[str] = None
    thirty_day_goals: Optional[str] = None
    manager_notes: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    address: Optional[str] = None
    documents_verified_by_hr: Optional[bool] = None
    self_onboarding_status: Optional[str] = None


class PreboardingOut(PreboardingBase):
    id: int
    documents_uploaded: bool
    documents_verified_by_hr: bool
    form_status: str
    self_onboarding_status: str
    background_verification_status: str
    laptop_required: bool
    id_card_required: bool
    asset_ready: bool
    manager_review_status: str
    hr_review_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
