from sqlalchemy.orm import Session
import json
from app.models.hr_onboarding import HROnboardingRequest
from app.schemas.hr_onboarding import HROnboardingCreate, HROnboardingUpdate
from typing import List, Optional

class HROnboardingRepository:
    def create(self, db: Session, obj_in: HROnboardingCreate) -> HROnboardingRequest:
        obj_data = obj_in.dict()
        
        # More robust filtering using the table columns
        allowed_cols = HROnboardingRequest.__table__.columns.keys()
        model_data = {k: v for k, v in obj_data.items() if k in allowed_cols}
        
        db_obj = HROnboardingRequest(**model_data)
        db.add(db_obj)
        db.flush()
        return db_obj

    def get_by_id(self, db: Session, id: int) -> Optional[HROnboardingRequest]:
        return db.query(HROnboardingRequest).filter(HROnboardingRequest.id == id).first()

    def get_by_request_id(self, db: Session, request_id: str) -> Optional[HROnboardingRequest]:
        # Robust lookup: check PK if numeric
        if str(request_id).isdigit():
            res = db.query(HROnboardingRequest).filter(HROnboardingRequest.id == int(request_id)).first()
            if res: return res
        return db.query(HROnboardingRequest).filter(HROnboardingRequest.request_id == request_id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[HROnboardingRequest]:
        return db.query(HROnboardingRequest).offset(skip).limit(limit).all()

    def update(self, db: Session, db_obj: HROnboardingRequest, obj_in: HROnboardingUpdate) -> HROnboardingRequest:
        update_data = obj_in.dict(exclude_unset=True)
        allowed_cols = HROnboardingRequest.__table__.columns.keys()
        for field in update_data:
            if field in allowed_cols:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.flush()
        return db_obj

hr_onboarding_repo = HROnboardingRepository()
