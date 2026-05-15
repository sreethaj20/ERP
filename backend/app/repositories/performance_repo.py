from sqlalchemy.orm import Session
from app.models.performance import PerformanceReview
from app.schemas.performance import PerformanceReviewCreate
from typing import List, Optional

class PerformanceRepository:
    def get(self, db: Session, review_id: str) -> Optional[PerformanceReview]:
        return db.query(PerformanceReview).filter(PerformanceReview.review_id == review_id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[PerformanceReview]:
        return db.query(PerformanceReview).offset(skip).limit(limit).all()

    def get_by_employee(self, db: Session, employee_id: str) -> List[PerformanceReview]:
        return db.query(PerformanceReview).filter(PerformanceReview.employee_id == employee_id).all()

    def get_by_reviewer(self, db: Session, employee_id: str) -> List[PerformanceReview]:
        return db.query(PerformanceReview).filter(PerformanceReview.submitted_by_id == employee_id).all()

    def create(self, db: Session, obj_in: PerformanceReviewCreate, submitted_by_id: str) -> PerformanceReview:
        data = obj_in.dict()
        db_obj = PerformanceReview(**data, submitted_by_id=submitted_by_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

performance_repo = PerformanceRepository()
