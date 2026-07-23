# Updated Shift Models - 2026-04-24
from sqlalchemy import Column, String, Integer, Date, DateTime, Time, func, ForeignKey, Numeric, Text, Boolean, JSON, TypeDecorator
from sqlalchemy.orm import relationship
from app.db.base import Base
import json

from sqlalchemy.ext.mutable import MutableList

class JSONEncodedList(TypeDecorator):
    """Enables JSON storage of lists in a Text column for legacy DB support."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                if isinstance(value, str):
                    return json.loads(value)
                return value
            except (ValueError, TypeError):
                return []
        return []

class ShiftDefinition(Base):
    __tablename__ = "shift_definitions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    shift_name = Column(String(50), nullable=False) # General Shift, Night Shift
    shift_code = Column(String(20))
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    grace_time = Column(Integer, default=15) # minutes
    break_duration_minutes = Column(Integer, default=60)
    is_night_shift = Column(Boolean, default=False)
    color = Column(String(20), default="#0a84ff")
    department_applicability = Column(MutableList.as_mutable(JSONEncodedList)) 
    week_off_days = Column(MutableList.as_mutable(JSONEncodedList)) 
    description = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String(30), index=True)
    shift_id = Column(Integer, index=True)
    assigned_by = Column(String(30)) # employee_id
    assigned_at = Column(DateTime, server_default=func.now())

class ShiftSession(Base):
    __tablename__ = "shift_sessions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(50), unique=True, nullable=True)
    employee_id = Column(String(30), index=True, nullable=False)
    user_id = Column(String(30), nullable=True)
    user_name = Column(String(150), nullable=True)
    role = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    shift_id = Column(Integer, index=True)
    shift_name = Column(String(100), nullable=True)
    date = Column(Date, nullable=True)
    month = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    
    # Use started_at and ended_at as primary time markers (matching DB)
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime)
    
    total_work_minutes = Column(Integer, default=0)
    total_work_seconds = Column(Integer, default=0)
    total_break_minutes = Column(Integer, default=0)
    total_break_seconds = Column(Integer, default=0)
    total_hours = Column(String(20), nullable=True) # e.g. "8h 30m"
    status = Column(String(30), default="active") # active, closed, present, half-day, absent
    is_early_login = Column(Boolean, default=False)
    
    location_metadata = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    remark = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    on_break = Column(Boolean, default=False)
    current_break_start = Column(DateTime, nullable=True)

    @property
    def login_time(self):
        return self.started_at

    @login_time.setter
    def login_time(self, value):
        self.started_at = value

    @property
    def logout_time(self):
        return self.ended_at

    @logout_time.setter
    def logout_time(self, value):
        self.ended_at = value

    @property
    def total_shift_seconds(self):
        start = self.started_at
        if not start:
            return 0
        end = self.ended_at or datetime.now()
        return max(0, int((end - start).total_seconds()))

    break_logs = relationship("BreakLog", primaryjoin="ShiftSession.session_id == BreakLog.session_id", foreign_keys="BreakLog.session_id", backref="session", uselist=True)

class BreakLog(Base):
    __tablename__ = "break_logs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(50), index=True)
    employee_id = Column(String(30))
    break_start = Column(DateTime, server_default=func.now())
    break_end = Column(DateTime)
    duration_minutes = Column(Integer, default=0)
    duration_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

