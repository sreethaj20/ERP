from sqlalchemy import Column, String, Integer, Date, DateTime, Time, func, ForeignKey, Numeric, Text, Boolean, UniqueConstraint
from app.db.base import Base

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String(30), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    month = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    
    # Standardized check-in/out (Legacy and Modern support)
    check_in = Column(DateTime)
    check_out = Column(DateTime)
    check_in_time = Column(DateTime)
    check_out_time = Column(DateTime)
    
    # Financial/Time tracking
    total_hours = Column(Numeric(10, 2), default=0.00)
    work_hours = Column(Numeric(10, 2), default=0.00)
    break_minutes = Column(Numeric(10, 2), default=0.00)
    overtime_hours = Column(Numeric(6, 2), default=0.00)
    
    status = Column(String(30), default="Present")
    is_late = Column(Boolean, default=False)
    is_early_out = Column(Boolean, default=False)
    
    remarks = Column(Text)
    notes = Column(String(255))
    source = Column(String(30), default="Manual")
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint('employee_id', 'date', name='uk_attendance_employee_date'),
    )

class AttendanceCorrection(Base):
    __tablename__ = "attendance_corrections"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String(30), nullable=False, index=True)
    attendance_date = Column(Date, nullable=False)
    attendance_id = Column(Integer, nullable=True)
    
    requested_check_in = Column(DateTime)
    requested_check_out = Column(DateTime)
    
    original_status = Column(String(50))
    corrected_status = Column(String(50))
    
    reason = Column(Text)
    status = Column(String(30), default="Pending") # Pending, Approved, Rejected
    
    reviewed_by = Column(String(30))
    reviewed_at = Column(DateTime)
    comments = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
