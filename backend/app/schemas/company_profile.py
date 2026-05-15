from pydantic import BaseModel, field_validator
from typing import Optional, Any
from datetime import date, datetime, time

class CompanyProfileBase(BaseModel):
    company_name: Optional[str] = "My Organization"
    logo_url: Optional[str] = None
    company_tagline: Optional[str] = None
    company_type: Optional[str] = None
    company_industry: Optional[str] = None
    website: Optional[str] = None
    
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    cin_number: Optional[str] = None
    tan_number: Optional[str] = None
    registration_number: Optional[str] = None
    registration_date: Optional[Any] = None
    license_expiry_date: Optional[Any] = None
    tax_id: Optional[str] = None
    
    ceo_name: Optional[str] = None
    hr_head_name: Optional[str] = None
    hr_email: Optional[str] = None
    hr_contact_number: Optional[str] = None
    finance_head_name: Optional[str] = None
    support_email: Optional[str] = None
    support_contact_number: Optional[str] = None
    
    office_start_time: Optional[Any] = None
    office_end_time: Optional[Any] = None
    working_days: Optional[str] = None
    weekly_holidays: Optional[str] = None
    leave_policy_url: Optional[str] = None
    
    bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    upi_id: Optional[str] = None
    
    linkedin_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    youtube_url: Optional[str] = None
    
    @field_validator('*', mode='before')
    @classmethod
    def empty_string_to_none(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

    class Config:
        from_attributes = True
        extra = "ignore"

class CompanyProfileCreate(CompanyProfileBase):
    pass

class CompanyProfileUpdate(CompanyProfileBase):
    pass

class CompanyProfileOut(CompanyProfileBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True
