from sqlalchemy import Column, String, Integer, Date, DateTime, Time, func, ForeignKey, Text, Numeric, Boolean, JSON
from app.db.base import Base

class PerformanceReview(Base):
    __tablename__ = "performance_reviews"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    review_id = Column(String(50), unique=True, index=True)
    employee_id = Column(String(30), nullable=False, index=True)
    employee_name = Column(String(100))
    submitted_by_id = Column(String(30), nullable=False)
    submitted_by_name = Column(String(100))
    
    score = Column(Numeric(3, 1), default=0.0)
    tl_feedback = Column(Text)
    employee_self_input = Column(Text)
    metrics = Column(Text) # Text field for structured data
    recommendations = Column(Text)
    
    review_month = Column(String(20))
    review_year = Column(String(10))
    status = Column(String(30), default="Submitted") # Draft, Submitted, Acknowledged
    review_date = Column(DateTime, server_default=func.now())
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
