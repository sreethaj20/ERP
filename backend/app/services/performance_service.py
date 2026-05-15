from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from app.models.performance import PerformanceReview
from app.schemas.performance import PerformanceReviewCreate, PerformanceReviewUpdate
from sqlalchemy import func
import asyncio
from app.core.websocket_manager import websocket_manager

class PerformanceService:
    def create_review(self, db: Session, obj_in: PerformanceReviewCreate, submitted_by_id: str) -> PerformanceReview:
        from app.repositories.employee_repo import employee_repo
        
        # Resolve target employee canonical ID
        target_emp = employee_repo.get(db, obj_in.employee_id)
        if not target_emp:
             # Fallback to provided ID if not found (though API layer should prevent this)
             target_id = obj_in.employee_id
             target_name = obj_in.employee_name
        else:
             target_id = target_emp.employee_id
             target_name = target_emp.name or f"{target_emp.first_name} {target_emp.last_name or ''}".strip()

        # Generate unique review ID using MAX(id) to avoid collisions
        max_id = db.query(func.max(PerformanceReview.id)).scalar() or 0
        review_id = f"PR-{str(max_id + 1).zfill(3)}"
        
        db_obj = PerformanceReview(
            **obj_in.dict(exclude={"review_id", "submitted_by_id", "employee_id", "employee_name"}),
            review_id=review_id,
            employee_id=target_id,
            employee_name=target_name,
            submitted_by_id=submitted_by_id
        )
        db.add(db_obj)
        
        # update employee record's general score
        if target_emp and obj_in.score is not None:
            target_emp.performance_score = obj_in.score
            db.add(target_emp)
            
        db.commit()
        db.refresh(db_obj)

        # 📡 Real-time Broadcast: Notify managers/leaders of the new review
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(websocket_manager.broadcast({
                    "type": "performance_updated",
                    "id": db_obj.id,
                    "employee_id": db_obj.employee_id,
                    "submitted_by": db_obj.submitted_by_id
                }))
        except Exception as ws_err:
            print(f"[WS] Performance broadcast failed: {ws_err}")

        return db_obj

    def get_reviews_for_employee(self, db: Session, employee_id: str) -> List[PerformanceReview]:
        return db.query(PerformanceReview).filter(PerformanceReview.employee_id == employee_id).all()

    def get_reviews_submitted_by(self, db: Session, submitted_by_id: str) -> List[PerformanceReview]:
        return db.query(PerformanceReview).filter(PerformanceReview.submitted_by_id == submitted_by_id).all()

    def get_all_reviews(self, db: Session, skip: int = 0, limit: int = 100) -> List[PerformanceReview]:
        return db.query(PerformanceReview).offset(skip).limit(limit).all()

    def get_reviews_for_team(self, db: Session, manager_ids: List[str]) -> List[PerformanceReview]:
        """Fetch all reviews where the reviewer is one of the provided IDs."""
        return db.query(PerformanceReview).filter(PerformanceReview.submitted_by_id.in_(manager_ids)).all()

    def update_review(self, db: Session, review_id: str, obj_in: PerformanceReviewUpdate) -> Optional[PerformanceReview]:
        db_obj = db.query(PerformanceReview).filter(PerformanceReview.review_id == review_id).first()
        if not db_obj:
            db_obj = db.query(PerformanceReview).filter(PerformanceReview.id == review_id).first()
            
        if db_obj:
            update_data = obj_in.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_obj, field, value)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

performance_service = PerformanceService()
