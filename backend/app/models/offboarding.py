from sqlalchemy import Column, String, Integer, Date, DateTime, func, ForeignKey, Text, Boolean, Float
from app.db.base import Base

class OffboardingRequest(Base):
    __tablename__ = "offboarding_requests"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    offboard_id = Column(String(50), unique=True, index=True)
    employee_id = Column(String(30), nullable=False)
    employeeName = Column(String(150))
    department = Column(String(100))
    request_date = Column(DateTime, server_default=func.now())
    last_working_day = Column(Date)
    exit_date = Column(Date)
    reason = Column(Text)
    reason_for_leaving = Column(Text)
    notice_period_days = Column(Integer, default=0)
    notice_remaining_days = Column(Integer, default=0)
    handover_to = Column(String(100))
    final_dues_amount = Column(Float, default=0.0)
    exit_interview_notes = Column(Text)
    
    manager_approved = Column(Boolean, default=False)
    hr_approved = Column(Boolean, default=False)
    it_approved = Column(Boolean, default=False)
    finance_approved = Column(Boolean, default=False)
    
    asset_return_status = Column(String(30), default="pending")
    access_revocation_status = Column(String(30), default="pending")
    fnf_status = Column(String(30), default="pending")
    relieving_letter_sent = Column(Boolean, default=False)
    relieving_letter_url = Column(String(255))
    
    status = Column(String(30), default="Pending") # Pending, Approved, Rejected, Completed
    completed = Column(Boolean, default=False)
    
    remarks = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

class Offboarding(Base):
    __tablename__ = "offboarding"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String(30), index=True)
    step_it_clearance = Column(Boolean, default=False)
    step_finance_clearance = Column(Boolean, default=False)
    step_assets_returned = Column(Boolean, default=False)
    status = Column(String(30), default="In-Progress")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
