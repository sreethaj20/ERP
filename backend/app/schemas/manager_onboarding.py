from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Any
from datetime import date, datetime

class ManagerOnboardingBase(BaseModel):
    employee_id: str
    first_name: str
    last_name: Optional[str] = None
    login_email: Optional[EmailStr] = None
    personal_email: Optional[EmailStr] = None
    role_name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    access_level: Optional[str] = None
    join_date: Optional[date] = None
    offer_date: Optional[date] = None
    joining_location: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    personal_mobile: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    manager_id: Optional[str] = None
    team_leader_id: Optional[str] = None
    hardware_req: Optional[Any] = None
    documents: Optional[Any] = None

    @validator('join_date', 'offer_date', 'dob', pre=True)
    def parse_onboarding_dates(cls, v):
        if isinstance(v, str):
            if 'T' in v:
                return v.split('T')[0]
        return v

class ManagerOnboardingCreate(ManagerOnboardingBase):
    request_id: str

class ManagerOnboardingUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    personal_email: Optional[EmailStr] = None
    personal_mobile: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    role_name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    join_date: Optional[date] = None
    offer_date: Optional[date] = None
    joining_location: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None
    manager_id: Optional[str] = None
    team_leader_id: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    reporting_manager: Optional[str] = None
    hardware_req: Optional[Any] = None


class ManagerOnboardingOut(ManagerOnboardingBase):
    id: int
    request_id: str
    status: str
    created_at: datetime
    updated_at: datetime
    manager_status: Optional[str] = "pending"
    hr_status: Optional[str] = "pending"
    it_status: Optional[str] = "pending"

    class Config:
        from_attributes = True

class ManagerOnboardingBulkCreate(BaseModel):
    employees: List[ManagerOnboardingCreate]

class ManagerOnboardingApproveOut(BaseModel):
    request_id: str
    status: str
    email: Optional[str] = None
    role: Optional[str] = None
    message: str
