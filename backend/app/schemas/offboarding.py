from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime

class OffboardingBase(BaseModel):
    offboard_id: str
    employee_id: str
    employeeName: Optional[str] = None
    department: Optional[str] = None
    last_working_day: Optional[date] = None
    exit_date: Optional[date] = None
    reason: Optional[str] = None
    reason_for_leaving: Optional[str] = None
    notice_period_days: Optional[int] = 0
    notice_remaining_days: Optional[int] = 0
    handover_to: Optional[str] = None
    final_dues_amount: Optional[float] = 0.0
    exit_interview_notes: Optional[str] = None

class OffboardingCreate(OffboardingBase):
    pass

class OffboardingUpdateByManager(BaseModel):
    manager_approved: Optional[bool] = None
    last_working_day: Optional[date] = None
    handover_to: Optional[str] = None
    remarks: Optional[str] = None
    completed: Optional[bool] = None
    final_dues_amount: Optional[float] = None
    exit_interview_notes: Optional[str] = None

class OffboardingUpdateByHR(BaseModel):
    hr_approved: Optional[bool] = None
    checklist_status: Optional[Any] = None
    relieving_letter_sent: Optional[bool] = None
    relieving_letter_url: Optional[str] = None
    fnf_status: Optional[str] = None
    status: Optional[str] = None
    completed: Optional[bool] = None
    employeeName: Optional[str] = None
    department: Optional[str] = None
    last_working_day: Optional[date] = None
    exit_date: Optional[date] = None
    reason: Optional[str] = None
    reason_for_leaving: Optional[str] = None
    handover_to: Optional[str] = None
    final_dues_amount: Optional[float] = None
    exit_interview_notes: Optional[str] = None
    remarks: Optional[str] = None


class OffboardingOut(OffboardingBase):
    id: int
    manager_approved: bool
    hr_approved: bool
    it_approved: bool
    finance_approved: bool
    asset_return_status: str
    access_revocation_status: str
    fnf_status: str
    relieving_letter_sent: bool
    completed: bool
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
