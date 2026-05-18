from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import date, datetime
from decimal import Decimal

class EmployeeBase(BaseModel):
    employee_id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    official_email: Optional[str] = None
    work_email: Optional[str] = None
    personal_email: Optional[str] = None
    phone: Optional[str] = None
    personal_mobile: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    dob: Optional[date] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: Optional[str] = None
    
    designation: Optional[str] = None
    department: Optional[str] = None
    work_location: Optional[str] = None
    employment_type: Optional[str] = "Full-time"
    status: Optional[str] = "Active"
    probation_period_days: Optional[int] = 90
    notice_period: Optional[int] = 30
    joining_date: Optional[date] = None
    joining_date_v2: Optional[date] = None
    join_date: Optional[date] = None
    offer_date: Optional[date] = None
    exit_date: Optional[date] = None
    resignation_date: Optional[date] = None
    status: Optional[str] = "Active"
    role: Optional[str] = "employee"
    role_type: Optional[str] = None
    access_level: Optional[str] = None
    
    manager_id: Optional[Any] = None
    reporting_to: Optional[str] = None
    reporting_manager_id: Optional[Any] = None
    reporting_manager: Optional[str] = None
    team_leader_id: Optional[Any] = None
    
    address: Optional[str] = None
    permanent_address: Optional[str] = None
    current_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None

    # Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None

    # Onboarding & Compliance Flags
    pf_registered: Optional[bool] = False
    esi_registered: Optional[bool] = False
    insurance_enrolled: Optional[bool] = False
    payroll_id_created: Optional[bool] = False
    identity_verified: Optional[bool] = False

    # Financial & Logistics 
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    ifsc_code: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    passport_number: Optional[str] = None
    uan_number: Optional[str] = None
    esi_number: Optional[str] = None
    pf_number: Optional[str] = None
    
    cost_center: Optional[str] = None
    business_unit: Optional[str] = None
    grade_level: Optional[str] = None
    work_mode: Optional[str] = "onsite"
    shift_type: Optional[str] = "general"
    profile_photo_url: Optional[str] = None
    photo: Optional[str] = None

    # Document URLs
    aadhaar_file_url: Optional[str] = None
    pan_file_url: Optional[str] = None
    education_certificate_url: Optional[str] = None
    resume_url: Optional[str] = None
    offer_letter_signed_url: Optional[str] = None
    bank_proof_url: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    user_id: Optional[int] = None
    username: str
    password: Optional[str] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    official_email: Optional[str] = None
    work_email: Optional[str] = None
    personal_email: Optional[str] = None
    phone: Optional[str] = None
    personal_mobile: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    dob: Optional[date] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: Optional[str] = None
    
    designation: Optional[str] = None
    department: Optional[str] = None
    work_location: Optional[str] = None
    employment_type: Optional[str] = None
    joining_date: Optional[date] = None
    joining_date_v2: Optional[date] = None
    join_date: Optional[date] = None
    offer_date: Optional[date] = None
    status: Optional[str] = None
    probation_period_days: Optional[int] = None
    notice_period: Optional[int] = None
    role: Optional[str] = None
    role_type: Optional[str] = None
    access_level: Optional[str] = None
    
    manager_id: Optional[Any] = None
    reporting_to: Optional[str] = None
    reporting_to_id: Optional[Any] = None
    reporting_manager_id: Optional[Any] = None
    reporting_manager: Optional[str] = None
    team_leader_id: Optional[Any] = None
    
    address: Optional[str] = None
    permanent_address: Optional[str] = None
    current_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None
    
    # Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None

    # Onboarding & Compliance Flags
    pf_registered: Optional[bool] = None
    esi_registered: Optional[bool] = None
    insurance_enrolled: Optional[bool] = None
    payroll_id_created: Optional[bool] = None
    identity_verified: Optional[bool] = None
    
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    ifsc_code: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    passport_number: Optional[str] = None
    uan_number: Optional[str] = None
    esi_number: Optional[str] = None
    pf_number: Optional[str] = None
    
    cost_center: Optional[str] = None
    business_unit: Optional[str] = None
    grade_level: Optional[str] = None
    work_mode: Optional[str] = None
    shift_type: Optional[str] = None
    profile_photo_url: Optional[str] = None
    photo: Optional[str] = None
    leave_balances: Optional[Any] = None

    # Document URLs
    aadhaar_file_url: Optional[str] = None
    pan_file_url: Optional[str] = None
    education_certificate_url: Optional[str] = None
    resume_url: Optional[str] = None
    offer_letter_signed_url: Optional[str] = None
    bank_proof_url: Optional[str] = None

class EmployeeOut(EmployeeBase):
    id: int
    user_id: Optional[int] = None
    performance_score: Optional[Decimal] = Decimal("0.00")
    leave_balances: Optional[Any] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class DepartmentBase(BaseModel):
    name: str
    code: Optional[str] = None
    manager_id: Optional[str] = None
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class EmployeeShort(BaseModel):
    id: int
    employee_id: str
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    reporting_to_id: Optional[Any] = None
    reporting_to: Optional[str] = None
    manager_id: Optional[Any] = None
    reporting_manager_id: Optional[Any] = None
    reporting_manager: Optional[str] = None
    team_leader_id: Optional[Any] = None

    model_config = {"from_attributes": True}

class EmployeeListOut(EmployeeShort):
    """Safe schema for bulk employee listings (No PII)"""
    email: Optional[str] = None
    official_email: Optional[str] = None
    designation: Optional[str] = None
    status: Optional[str] = "Active"
    joining_date: Optional[date] = None
    work_location: Optional[str] = None
    employment_type: Optional[str] = None
    profile_photo_url: Optional[str] = None
    photo: Optional[str] = None
    created_at: Optional[datetime] = None
    reporting_to: Optional[str] = None
    reporting_manager: Optional[str] = None

    model_config = {"from_attributes": True}
