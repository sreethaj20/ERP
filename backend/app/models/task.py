from sqlalchemy import Column, String, Integer, Date, DateTime, Time, func, ForeignKey, Text, Boolean
from app.db.base import Base

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(String(50), unique=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    assigned_to = Column(String(30)) # employee_id
    assigned_by = Column(String(30)) # employee_id
    module = Column(String(50)) # onboarding, general, IT
    status = Column(String(30), default="Pending") # Pending, In-Progress, Completed
    due_date = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
