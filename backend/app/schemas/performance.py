from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class PerformanceReviewBase(BaseModel):
    review_id: Optional[str] = None
    employee_id: str
    employee_name: Optional[str] = None
    submitted_by_id: Optional[str] = None
    submitted_by_name: Optional[str] = None
    score: Optional[Decimal] = Decimal("0.00")
    tl_feedback: str
    employee_self_input: Optional[str] = None
    metrics: Optional[dict] = None
    recommendations: Optional[str] = None
    status: Optional[str] = "Submitted"
    review_month: str
    review_year: str

class PerformanceReviewCreate(PerformanceReviewBase):
    pass

class PerformanceReviewUpdate(BaseModel):
    score: Optional[Decimal] = None
    tl_feedback: Optional[str] = None
    employee_self_input: Optional[str] = None

class PerformanceReviewOut(PerformanceReviewBase):
    id: Optional[int] = None
    review_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
