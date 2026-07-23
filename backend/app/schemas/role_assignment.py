from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class RoleAssignmentBase(BaseModel):
    employee_id: str
    shift_id: Optional[int] = None
    role_name: Optional[str] = None
    login_enabled: Optional[bool] = True
    assigned_by: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = True

class RoleAssignmentCreate(RoleAssignmentBase):
    assignment_id: Optional[str] = None

class RoleAssignmentUpdate(BaseModel):
    shift_id: Optional[int] = None
    role_name: Optional[str] = None
    login_enabled: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class RoleAssignmentOut(RoleAssignmentBase):
    id: int
    assignment_id: str
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    performance_score: Optional[float] = None
    assigned_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
