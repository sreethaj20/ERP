from sqlalchemy import Column, String, Integer, Date, DateTime, func
from app.db.base import Base

class Holiday(Base):
    __tablename__ = "holidays"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    date = Column(Date, nullable=False, unique=True)
    type = Column(String(50), default="Public") # Public, Optional, Company
    description = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
