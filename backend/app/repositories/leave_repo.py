from sqlalchemy.orm import Session
from app.models.leave import LeaveRequest, LeaveBalance, EarlyLoginRequest
from app.schemas.leave import LeaveCreate, LeaveUpdate, LeaveBalanceUpdate
from typing import List, Optional, Any

class LeaveRepository:
    def __init__(self):
        self.model = LeaveRequest

    def get(self, db: Session, id: Any) -> Optional[LeaveRequest]:
        # Handle both integer PK and string business ID
        if isinstance(id, int) or (isinstance(id, str) and id.isdigit()):
            return db.query(LeaveRequest).filter(LeaveRequest.id == int(id), LeaveRequest.deleted_at == None).first()
        return self.get_by_leave_id(db, str(id))

    def get_by_leave_id(self, db: Session, leave_id: str) -> Optional[LeaveRequest]:
        return db.query(LeaveRequest).filter(LeaveRequest.leave_id == leave_id, LeaveRequest.deleted_at == None).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[LeaveRequest]:
        return db.query(LeaveRequest).filter(LeaveRequest.deleted_at == None).offset(skip).limit(limit).all()

    def get_by_employee(self, db: Session, employee_id: str) -> List[LeaveRequest]:
        return db.query(LeaveRequest).filter(LeaveRequest.employee_id == employee_id, LeaveRequest.deleted_at == None).all()

    def create(self, db: Session, obj_in: LeaveCreate) -> LeaveRequest:
        obj_data = obj_in.dict()
        
        # Manually map attributes if they differ from Pydantic names
        # Standard SQLAlchemy constructor handles attribute names.
        # Filter for safety against mismatch between schema and model attributes.
        valid_data = {k: v for k, v in obj_data.items() if hasattr(LeaveRequest, k)}
        
        db_obj = LeaveRequest(**valid_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: LeaveRequest, obj_in: LeaveUpdate) -> LeaveRequest:
        obj_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, id: int) -> Optional[LeaveRequest]:
        from datetime import datetime
        obj = db.query(LeaveRequest).filter(LeaveRequest.id == id).first()
        if obj:
            obj.deleted_at = datetime.now()
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

class LeaveBalanceRepository:
    def get(self, db: Session, employee_id: str) -> Optional[LeaveBalance]:
        return db.query(LeaveBalance).filter(LeaveBalance.employee_id == employee_id, LeaveBalance.deleted_at == None).first()

    def create(self, db: Session, obj_in: dict) -> LeaveBalance:
        db_obj = LeaveBalance(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: LeaveBalance, obj_in: LeaveBalanceUpdate) -> LeaveBalance:
        obj_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

leave_repo = LeaveRepository()
leave_balance_repo = LeaveBalanceRepository()
