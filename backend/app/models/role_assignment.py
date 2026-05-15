from sqlalchemy import Column, String, Integer, DateTime, func, ForeignKey, Boolean, Date
from app.db.base import Base

class RoleAssignment(Base):
    __tablename__ = "role_assignments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    assignment_id = Column(String(30), unique=True, index=True)
    employee_id = Column(String(30), nullable=False, index=True)
    shift_id = Column(Integer, nullable=True)
    role_name = Column(String(50), nullable=False) # admin, hr, manager, recruiter, it, employee
    login_enabled = Column(Boolean, default=False)
    assigned_by = Column(String(30)) # employee_id
    assigned_at = Column(DateTime, server_default=func.now())
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    notes = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
