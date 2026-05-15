from sqlalchemy import Column, String, Integer, Date, DateTime, func, ForeignKey, Text, Boolean
from app.db.base import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    file_path = Column(String(255), nullable=False)
    file_type = Column(String(255))
    file_size = Column(Integer)
    module = Column(String(50)) # onboarding, employee, recruitment
    reference_id = Column(String(50)) # e.g. employee_id or candidate_id
    category = Column(String(100))
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())

class DocumentAccessLog(Base):
    __tablename__ = "document_access_logs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    employee_name = Column(String(150))
    action = Column(String(50), default="download")
    ip_address = Column(String(50))
    created_at = Column(DateTime, server_default=func.now())
