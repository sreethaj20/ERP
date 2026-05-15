from sqlalchemy import Column, String, Integer, Date, DateTime, Time, func, ForeignKey, Numeric, Text, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    leave_id = Column(String(30), unique=True, index=True)
    employee_id = Column(String(30), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    leave_type = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Nuclear Fix: Primary attribute is total_days, mapped to 'days' column
    # synonym ensures .days access also works without AttributeError
    from sqlalchemy.orm import synonym
    total_days = Column("days", Numeric(5, 2), default=0.0)
    days = synonym("total_days")
    
    name = Column(String(150))
    department = Column(String(100))
    
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="Pending") # Pending, Approved, Rejected
    pending_with = Column(String(50)) # e.g. "Manager" or "HR"
    
    # Hierarchy for dual-channel routing
    team_leader_id = Column(String(30))
    manager_id = Column(String(30))
    last_action_by = Column(String(30))
    
    # Tiered Approval Statuses
    teamleader_status = Column(String(30), default="Pending")
    manager_status = Column(String(30), default="Pending")
    hr_status = Column(String(30), default="Pending")
    
    approved_by = Column(String(30)) # employee_id of final approver
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)
    
    attachments = Column(Text) # JSON list of URLs
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String(30), ForeignKey("employees.employee_id"), unique=True, index=True, nullable=False)
    
    # Quotas
    casual_leave = Column(Numeric(6, 2), default=0.0)
    sick_leave = Column(Numeric(6, 2), default=0.0)
    earned_leave = Column(Numeric(6, 2), default=0.0)
    unpaid_leave = Column(Numeric(6, 2), default=0.0)
    
    maternity_leave = Column(Numeric(6, 2), default=0.0)
    paternity_leave = Column(Numeric(6, 2), default=0.0)
    bereavement_leave = Column(Numeric(6, 2), default=0.0)
    optional_leave = Column(Numeric(6, 2), default=0.0)
    
    total_credited = Column(Numeric(6, 2), default=0.0)
    total_used = Column(Numeric(6, 2), default=0.0)
    carry_forward_days = Column(Numeric(6, 2), default=0.0)
    
    year = Column(Integer)
    last_update = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

class EarlyLoginRequest(Base):
    __tablename__ = "early_login_requests"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String(30), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    date = Column("requested_date", Date, nullable=False, key="date")
    requested_start_time = Column("requested_time", Time, nullable=False, key="requested_start_time")
    reason = Column(Text)
    
    status = Column(String(30), default="Pending") # Pending, Approved, Rejected
    approved_by = Column(String(30)) # employee_id
    comments = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

class LeavePolicy(Base):
    __tablename__ = "leave_policies"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    leave_type = Column(String(50), unique=True, nullable=False)
    total_days = Column(Integer, default=0)
    description = Column(Text)
    
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
