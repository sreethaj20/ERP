from sqlalchemy import Column, String, Integer, Date, DateTime, func, ForeignKey, Text, Boolean, JSON, TypeDecorator
from app.db.base import Base
import json

class JSONEncodedDict(TypeDecorator):
    """Enables JSON storage of dicts/lists in a Text column for legacy DB support."""
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
                return {}
        return {}

class ManagerOnboardingRequest(Base):
    __tablename__ = "manager_onboarding_requests"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id = Column(String(50), unique=True, index=True, nullable=False)
    employee_id = Column(String(30), nullable=False)
    manager_id = Column(String(30), nullable=False)
    
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    login_email = Column(String(150))
    personal_email = Column(String(150))
    role_name = Column(String(30))
    designation = Column(String(100))
    department = Column(String(100))
    access_level = Column(String(50))
    join_date = Column(Date)
    offer_date = Column(Date)
    joining_location = Column(String(100))
    gender = Column(String(20))
    dob = Column(Date)
    blood_group = Column(String(10))
    personal_mobile = Column(String(20))
    marital_status = Column(String(30))
    nationality = Column(String(50))
    team_leader_id = Column(String(30))
    hardware_req = Column(JSONEncodedDict) # JSON column for resource allocation
    documents = Column(JSONEncodedDict)    # JSON column for verification docs
    
    status = Column(String(30), default="pending")
    manager_status = Column(String(30), default="pending")
    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    rejected_by = Column(String(100))
    rejected_at = Column(DateTime)
    current_approver_stage = Column(String(30), default="manager")
    remarks = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

class ManagerOnboarding(Base):
    __tablename__ = "manager_onboarding"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String(30), index=True)
    manager_id = Column(String(30))
    step_team_intro = Column(Boolean, default=False)
    step_tools_access = Column(Boolean, default=False)
    step_probation_goals = Column(Boolean, default=False)
    status = Column(String(30), default="In-Progress")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
