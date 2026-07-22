from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime, time
from decimal import Decimal

class LeaveBase(BaseModel):
    employee_id: Optional[str] = None
    name: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    leave_type: str # Casual, Sick, Earned, Unpaid
    start_date: date
    end_date: date
    total_days: Optional[Decimal] = None
    reason: str
    team_leader_id: Optional[str] = None
    manager_id: Optional[str] = None

class LeaveCreate(LeaveBase):
    leave_id: Optional[str] = None
    approval_chain: Optional[List[str]] = None

class LeaveUpdate(BaseModel):
    status: str # Pending, Approved, Rejected, Cancelled
    rejection_reason: Optional[str] = None
    current_approver_id: Optional[str] = None
    last_action_by: Optional[str] = None

class LeaveOut(LeaveBase):
    id: int
    leave_id: str
    status: str
    applied_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LeaveBalanceBase(BaseModel):
    employee_id: str
    casual_leave: Decimal = Decimal("0.00")
    sick_leave: Decimal = Decimal("0.00")
    earned_leave: Decimal = Decimal("0.00")
    maternity_leave: Decimal = Decimal("0.00")
    paternity_leave: Decimal = Decimal("0.00")
    bereavement_leave: Decimal = Decimal("0.00")
    unpaid_leave: Decimal = Decimal("0.00")
    total_credited: Decimal = Decimal("0.00")
    total_used: Decimal = Decimal("0.00")
    carry_forward_days: Decimal = Decimal("0.00")
    year: Optional[int] = None

class LeaveBalanceCreate(LeaveBalanceBase):
    pass

class LeaveBalanceUpdate(BaseModel):
    casual_leave: Optional[Decimal] = None
    sick_leave: Optional[Decimal] = None
    earned_leave: Optional[Decimal] = None
    maternity_leave: Optional[Decimal] = None
    paternity_leave: Optional[Decimal] = None
    bereavement_leave: Optional[Decimal] = None
    total_used: Optional[Decimal] = None
    unpaid_leave: Optional[Decimal] = None
    carry_forward_days: Optional[Decimal] = None
    year: Optional[int] = None

class LeaveBalanceOut(LeaveBalanceBase):
    id: int
    last_update: datetime

    class Config:
        from_attributes = True

class EarlyLoginBase(BaseModel):
    employee_id: str
    date: date
    requested_start_time: time
    reason: str

class EarlyLoginCreate(EarlyLoginBase):
    pass

class EarlyLoginUpdate(BaseModel):
    status: str # Pending, Approved, Rejected
    approved_by: Optional[str] = None

class EarlyLoginOut(EarlyLoginBase):
    id: int
    status: str
    employee_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

EarlyLoginRequestOut = EarlyLoginOut

class LeavePolicyBase(BaseModel):
    leave_type: str
    total_days: int
    description: Optional[str] = None

class LeavePolicyCreate(LeavePolicyBase):
    pass

class LeavePolicyOut(LeavePolicyBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True
