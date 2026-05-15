from pydantic import BaseModel, Field
from typing import List, Optional
import datetime
from datetime import datetime, time, date as DateType

class ShiftAssignmentCreate(BaseModel):
    employee_id: str
    shift_id: int
    assigned_by: Optional[str] = None

class ShiftAssignmentOut(BaseModel):
    id: int
    employee_id: str
    shift_id: int
    assigned_by: Optional[str] = None
    assigned_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class ShiftDefinitionBase(BaseModel):
    shift_name: str
    shift_code: Optional[str] = None
    start_time: time
    end_time: time
    grace_time: int = 15
    break_duration_minutes: int = 60
    is_night_shift: bool = False
    color: Optional[str] = "#0a84ff"
    department_applicability: Optional[List[str]] = []
    week_off_days: Optional[List[str]] = []
    description: Optional[str] = None

class ShiftDefinitionCreate(ShiftDefinitionBase):
    pass

class ShiftDefinitionUpdate(BaseModel):
    shift_name: Optional[str] = None
    shift_code: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    grace_time: Optional[int] = None
    break_duration_minutes: Optional[int] = None
    is_night_shift: Optional[bool] = None
    color: Optional[str] = None
    department_applicability: Optional[List[str]] = None
    week_off_days: Optional[List[str]] = None
    description: Optional[str] = None

class ShiftDefinitionOut(ShiftDefinitionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    assignments: List[ShiftAssignmentOut] = []

    model_config = {"from_attributes": True}

class ShiftSessionCreate(BaseModel):
    employee_id: str
    shift_id: int
    location_metadata: Optional[str] = None
    ip_address: Optional[str] = None
    remark: Optional[str] = None

# Re-export from attendance to avoid duplication and shadowing bugs
from app.schemas.attendance import ShiftSessionOut, BreakLogOut as AttendanceBreakLogOut

class BreakLogCreate(BaseModel):
    session_id: int
    employee_id: str
    type: Optional[str] = "break"

class BreakLogOut(BaseModel):
    id: int
    session_id: int
    employee_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: int
    duration_seconds: int
    type: str

    model_config = {"from_attributes": True}

