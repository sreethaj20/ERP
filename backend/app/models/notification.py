from sqlalchemy import Column, String, Integer, Date, DateTime, Time, func, Boolean, ForeignKey, JSON, Text, Numeric, Enum
from sqlalchemy.ext.hybrid import hybrid_property
from app.db.base import Base

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), default=0) # Target user id (Internal User ID)
    employee_id = Column(String(30)) # or Alphanumeric Employee ID
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(30), default="General") # Onboarding, Leave, Shift, IT, Admin
    priority = Column(String(20), default="normal") # normal, high, critical
    is_read = Column(Boolean, default=False)
    link = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    read_at = Column(DateTime)

class Announcement(Base):
    __tablename__ = "announcements"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    @hybrid_property
    def content(self): return self.message
    @content.setter
    def content(self, value): self.message = value

    author_id = Column(String(30)) # employee_id

    target_audience = Column(String(50), default="All") # All, Department-Name, Role-Name
    is_active = Column(Boolean, default=True)
    expiry_date = Column(DateTime)
    attachments = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type = Column(String(50), nullable=False, default="General") # System, User, Audit
    message = Column(Text, nullable=False) # Main activity log text
    
    # Metadata for actor (compatible with mercure.sql)
    actor_id = Column(String(30))
    actor_name = Column(String(150))
    actor_role = Column(String(50))
    
    # Metadata for target entity
    entity_type = Column(String(50))
    entity_id = Column(String(50))
    
    # Internal system fields
    user_id = Column(Integer, ForeignKey("users.id"))
    username = Column(String(80))
    action = Column(String(100), nullable=False) # Logged In, Created Employee, Approved Leave
    module = Column(String(50)) # Auth, Employee, Leave, IT
    target_id = Column(String(50)) # e.g. EMP-001
    description = Column(Text)
    ip_address = Column(String(50))
    user_agent = Column(String(255))
    status = Column(String(20), default="Success") # Success, Failure
    
    timestamp = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


import json
from sqlalchemy.types import TypeDecorator

class JSONEncodedDict(TypeDecorator):
    """Enables automatic JSON serialization of dicts/lists into Text columns for psycopg2 compatibility."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value, (dict, list)):
                return json.dumps(value, default=str)
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                if isinstance(value, str):
                    return json.loads(value)
                return value
            except (ValueError, TypeError):
                return str(value)
        return {}

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    table_name = Column(String(50), nullable=False)
    record_id = Column(String(50), nullable=False)
    action = Column(String(20), nullable=False) # CREATE, UPDATE, DELETE
    old_value = Column(JSONEncodedDict)
    new_value = Column(JSONEncodedDict)
    # Store user id or employee id as string (avoid duplicate model / FK mismatch with audit_service)
    changed_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
