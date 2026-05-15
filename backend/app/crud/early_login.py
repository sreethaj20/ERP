from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.models.leave import EarlyLoginRequest
from app.schemas.leave import EarlyLoginCreate, EarlyLoginUpdate, EarlyLoginOut

early_login_repo = None

def early_login_create(db: Session, obj_in: EarlyLoginCreate):
    db_obj = EarlyLoginRequest(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def early_login_get_by_employee(db: Session, employee_id: str) -> List[EarlyLoginRequest]:
    return db.query(EarlyLoginRequest).filter(EarlyLoginRequest.employee_id == employee_id).order_by(EarlyLoginRequest.date.desc()).all()

def early_login_get_by_id(db: Session, id: int):
    return db.query(EarlyLoginRequest).filter(EarlyLoginRequest.id == id).first()

def early_login_approve(db: Session, id: int, status: str, approved_by: str, rejection_reason: Optional[str] = None):
    db_obj = early_login_get_by_id(db, id)
    if not db_obj:
        return None
    db_obj.status = status
    db_obj.approved_by = approved_by
    db_obj.updated_at = datetime.now()
    if rejection_reason:
        db_obj.rejection_reason = rejection_reason
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


