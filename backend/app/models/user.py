from sqlalchemy import Column, String, Integer, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(80), unique=True, index=True, nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150))
    role = Column(String(20), default="employee") # admin, hr, manager, recruiter, it, employee
    employee_id = Column(String(30), unique=True, index=True)
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    
    # 🔐 Enterprise Security
    is_mfa_enabled = Column(Boolean(), default=False)
    mfa_secret = Column(String(100), nullable=True)
    last_login_at = Column(DateTime)
    
    # 🕵️ Governance & Recovery
    reset_token = Column(String(100), nullable=True)
    reset_token_at = Column(DateTime, nullable=True)
    
    # 🔌 Real-time Presence (Synced from DB)
    is_online = Column(Boolean, default=False, nullable=False)
    last_seen = Column(DateTime, nullable=True)
    
    # 🧩 Relationships
    employee = relationship("Employee", back_populates="user", uselist=False)
    
    @property
    def password_hash(self):
        return self.hashed_password
        
    @password_hash.setter
    def password_hash(self, value):
        self.hashed_password = value

    @property
    def photo(self):
        if hasattr(self, 'employee') and self.employee:
            return self.employee.photo
        return None
