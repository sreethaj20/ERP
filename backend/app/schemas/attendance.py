from __future__ import annotations
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any, Dict
from datetime import date as DateType, datetime as dt, time
from decimal import Decimal

class AttendanceBase(BaseModel):
    employee_id: str
    date: Optional[DateType] = None
    check_in: Optional[dt] = None
    check_out: Optional[dt] = None
    check_in_time: Optional[dt] = None
    check_out_time: Optional[dt] = None
    status: Optional[str] = "Present"
    total_hours: Optional[Decimal] = Decimal("0.00")
    work_hours: Optional[Decimal] = Decimal("0.00")
    break_minutes: Optional[Decimal] = Decimal("0.00")
    overtime_hours: Optional[Decimal] = Decimal("0.00")
    is_late: Optional[bool] = False
    is_early_out: Optional[bool] = False
    remarks: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = "Manual"

    @field_validator('check_in', 'check_out', 'created_at', 'updated_at', 'login_time', 'logout_time', 'current_break_start', mode='before', check_fields=False)
    @classmethod
    def sanitize_zero_dt(cls, v):
        """MySQL sentinel '0000-00-00 00:00:00' → None. Also robustly parse strings to dt objects."""
        if v is None:
            return None
            
        str_v = str(v)
        # Handle MySQL zero-dates
        if str_v.startswith('0000') or str_v == '0000-00-00 00:00:00':
            return None
            
        # If it's already a dt (or DateType), return as is (prefer dt)
        if isinstance(v, dt):
            return v
        if isinstance(v, DateType):
            return dt.combine(v, time.min)
            
        # If it's a string, try to parse it
        if isinstance(v, str):
            try:
                # Handle ISO formats and common MySQL formats
                clean_v = v.replace('T', ' ').replace('Z', '')
                return dt.fromisoformat(clean_v.split('.')[0])
            except ValueError:
                # Last resort: try simple parse if isoformat fails
                try:
                    from dateutil import parser
                    return parser.parse(v)
                except:
                    return None
        return v

    @field_validator('date', mode='before', check_fields=False)
    @classmethod
    def sanitize_zero_date(cls, v):
        """MySQL sentinel '0000-00-00' → None. Parse date strings properly."""
        if v is None:
            return None
        str_v = str(v)
        if str_v.startswith('0000') or str_v == '0000-00-00':
            return None
        if isinstance(v, dt):
            return v.date()
        if isinstance(v, DateType):
            return v
        if isinstance(v, str):
            try:
                # Parse as date (e.g. YYYY-MM-DD)
                clean_v = v.split(' ')[0].split('T')[0]
                return DateType.fromisoformat(clean_v)
            except ValueError:
                try:
                    from dateutil import parser
                    return parser.parse(v).date()
                except:
                    return None
        return v

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    check_in: Optional[dt] = None
    check_out: Optional[dt] = None
    check_in_time: Optional[dt] = None
    check_out_time: Optional[dt] = None
    status: Optional[str] = None
    total_hours: Optional[Decimal] = None
    work_hours: Optional[Decimal] = None
    remarks: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('check_in', 'check_out', 'check_in_time', 'check_out_time', mode='before', check_fields=False)
    @classmethod
    def sanitize(cls, v):
        return AttendanceBase.sanitize_zero_dt(v)

class AttendanceOut(AttendanceBase):
    id: int
    created_at: Optional[dt] = None
    updated_at: Optional[dt] = None
    employee_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    login_time: Optional[dt] = None
    logout_time: Optional[dt] = None
    hours_worked: Optional[float] = None
    break_time: Optional[float] = None
    month: Optional[int] = None
    year: Optional[int] = None

    model_config = {"from_attributes": True}

class AttendanceCorrectionBase(BaseModel):
    attendance_id: Optional[int] = None
    date: Optional[DateType] = None
    requested_check_in: Optional[dt] = None
    requested_check_out: Optional[dt] = None
    original_status: Optional[str] = None
    corrected_status: Optional[str] = "Present"
    reason: str

    @field_validator('requested_check_in', 'requested_check_out', mode='before', check_fields=False)
    @classmethod
    def sanitize(cls, v):
        return AttendanceBase.sanitize_zero_dt(v)

class AttendanceCorrectionCreate(AttendanceCorrectionBase):
    employee_id: str

class AttendanceCorrectionUpdate(BaseModel):
    status: Optional[str] = "active" # Approved, Rejected
    rejection_reason: Optional[str] = None

class AttendanceCorrectionOut(AttendanceCorrectionBase):
    id: int
    employee_id: str
    employee_name: Optional[str] = None
    status: Optional[str] = "active"
    approved_by: Optional[str] = None
    created_at: Optional[dt] = None
    
    @field_validator('created_at', 'requested_check_in', 'requested_check_out', mode='before', check_fields=False)
    @classmethod
    def sanitize(cls, v):
        return AttendanceBase.sanitize_zero_dt(v)

    model_config = {"from_attributes": True}

class ShiftBase(BaseModel):
    shift_name: str
    shift_code: Optional[str] = None
    start_time: time
    end_time: time
    grace_time: Optional[int] = 15
    break_duration_minutes: Optional[int] = 60
    is_night_shift: Optional[bool] = False

class ShiftCreate(ShiftBase):
    pass

class ShiftOut(ShiftBase):
    id: int
    created_at: Optional[dt] = None

    model_config = {"from_attributes": True}

class ShiftSessionBase(BaseModel):
    employee_id: Optional[str] = None
    shift_id: Optional[int] = None
    month: Optional[int] = None
    year: Optional[int] = None

class ShiftSessionCreate(ShiftSessionBase):
    location_metadata: Optional[Dict] = None
    ip_address: Optional[str] = None
    remark: Optional[str] = None

class ShiftSessionOut(ShiftSessionBase):
    id: int
    login_time: Optional[dt] = None
    logout_time: Optional[dt] = None
    total_hours: Optional[str] = None
    status: Optional[str] = "active"
    employee_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    date: Optional[DateType] = None
    month: Optional[int] = None
    year: Optional[int] = None
    on_break: Optional[bool] = False
    current_break_start: Optional[dt] = None
    shift_name: Optional[str] = None
    shift_color: Optional[str] = None
    session_id: Optional[str] = None
    
    started_at: Optional[dt] = None
    ended_at: Optional[dt] = None
    is_late: Optional[bool] = False
    is_early_login: Optional[bool] = False
    early_approval_status: Optional[str] = None
    
    total_work_seconds: Optional[int] = None
    total_break_seconds: Optional[int] = None
    total_work_minutes: Optional[int] = 0
    total_break_minutes: Optional[int] = 0
    
    location_metadata: Optional[str] = None
    ip_address: Optional[str] = None
    remark: Optional[str] = None
    
    break_logs: Optional[List[BreakLogOut]] = []
    breaks_count: Optional[int] = 0
    
    created_at: Optional[dt] = None

    @field_validator('login_time', 'logout_time', 'created_at', 'current_break_start', 'date', mode='before', check_fields=False)
    @classmethod
    def sanitize(cls, v):
        return AttendanceBase.sanitize_zero_dt(v)

    model_config = {"from_attributes": True}

class BreakLogBase(BaseModel):
    session_id: str
    type: Optional[str] = "break"

class BreakLogCreate(BreakLogBase):
    employee_id: Optional[str] = None

class BreakLogOut(BreakLogBase):
    id: int
    break_start: dt
    break_end: Optional[dt] = None
    duration_minutes: int
    duration_seconds: Optional[int] = 0
    created_at: Optional[dt] = None

    # Frontend Compatibility Aliases
    start_time: Optional[dt] = None
    end_time: Optional[dt] = None

    @field_validator('break_start', 'break_end', 'created_at', 'start_time', 'end_time', mode='before', check_fields=False)
    @classmethod
    def sanitize(cls, v):
        return AttendanceBase.sanitize_zero_dt(v)

    model_config = {"from_attributes": True}

class StaffTimesheetItem(BaseModel):
    id: Optional[int] = None
    session_id: Optional[str] = None
    employee_id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    role: Optional[str] = None
    shift_id: Optional[int] = None
    shift_name: Optional[str] = None
    shift_code: Optional[str] = None
    shift_start_time: Optional[time] = None
    shift_end_time: Optional[time] = None
    date: Optional[DateType] = None
    month: Optional[int] = None
    year: Optional[int] = None
    started_at: Optional[dt] = None
    ended_at: Optional[dt] = None
    login_time: Optional[dt] = None
    logout_time: Optional[dt] = None
    total_work_seconds: Optional[int] = 0
    total_break_seconds: Optional[int] = 0
    status: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    on_break: Optional[bool] = False
    current_break_start: Optional[dt] = None
    break_logs: Optional[List[BreakLogOut]] = []
    breaks_count: Optional[int] = 0

    @field_validator('login_time', 'logout_time', 'started_at', 'ended_at', 'date', 'current_break_start', mode='before', check_fields=False)
    @classmethod
    def sanitize(cls, v):
        return AttendanceBase.sanitize_zero_dt(v)

    model_config = {
        "from_attributes": True,
        "populate_by_name": True
    }
