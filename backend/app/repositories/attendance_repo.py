from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Optional
from datetime import date, datetime
import json
from app.models.attendance import Attendance, AttendanceCorrection
from app.models.shift import ShiftDefinition, ShiftAssignment, ShiftSession, BreakLog
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceCorrectionCreate
from app.schemas.shift import ShiftDefinitionCreate, ShiftSessionCreate, BreakLogCreate, ShiftAssignmentCreate

class AttendanceRepository:
    model = Attendance
    def __init__(self):
        from app.models.leave import EarlyLoginRequest
        self.early_login_model = EarlyLoginRequest

    def get(self, db: Session, employee_id: str, date: date) -> Optional[Attendance]:
        return db.query(Attendance).filter(Attendance.employee_id == employee_id, Attendance.date == date, Attendance.deleted_at == None).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[Attendance]:
        return db.query(Attendance).filter(Attendance.deleted_at == None).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: AttendanceCreate) -> Attendance:
        db_obj = Attendance(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: Attendance, obj_in: AttendanceUpdate) -> Attendance:
        obj_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

class ShiftRepository:
    model = ShiftDefinition
    def get(self, db: Session, id: int) -> Optional[ShiftDefinition]:
        return db.query(ShiftDefinition).filter(ShiftDefinition.id == id, ShiftDefinition.deleted_at == None).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[ShiftDefinition]:
        return db.query(ShiftDefinition).filter(ShiftDefinition.deleted_at == None).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: ShiftDefinitionCreate) -> ShiftDefinition:
        db_obj = ShiftDefinition(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int):
        db_obj = db.query(ShiftDefinition).filter(ShiftDefinition.id == id).first()
        if db_obj:
            from datetime import datetime
            db_obj.deleted_at = datetime.now()
            db.add(db_obj)
            db.commit()
        return db_obj

    def update(self, db: Session, db_obj: ShiftDefinition, obj_in: any) -> ShiftDefinition:
        if isinstance(obj_in, dict):
            obj_data = obj_in
        else:
            obj_data = obj_in.dict(exclude_unset=True)
            
        for field in obj_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, obj_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

class ShiftAssignmentRepository:
    model = ShiftAssignment
    def get_by_employee(self, db: Session, employee_id: str) -> Optional[ShiftAssignment]:
        return db.query(ShiftAssignment).filter(ShiftAssignment.employee_id == employee_id).first()

    def create(self, db: Session, obj_in: ShiftAssignmentCreate) -> ShiftAssignment:
        # Validate shift_id exists
        shift = db.query(ShiftDefinition).filter(ShiftDefinition.id == obj_in.shift_id).first()
        if not shift:
            raise HTTPException(status_code=404, detail=f"Shift ID {obj_in.shift_id} not found")
        
        # Check if already assigned
        existing = db.query(ShiftAssignment).filter(ShiftAssignment.employee_id == obj_in.employee_id).first()
        if existing:
            existing.shift_id = obj_in.shift_id
            existing.assigned_by = obj_in.assigned_by
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing
        
        db_obj = ShiftAssignment(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def unassign(self, db: Session, employee_id: str):
        db_obj = db.query(ShiftAssignment).filter(ShiftAssignment.employee_id == employee_id).first()
        if db_obj:
            db.delete(db_obj)
            db.commit()
        return db_obj

class ShiftSessionRepository:
    model = ShiftSession
    def get_active(self, db: Session, employee_id: str) -> Optional[ShiftSession]:
        return db.query(ShiftSession).filter(ShiftSession.employee_id == employee_id, ShiftSession.status == "active").first()

    def create(self, db: Session, obj_in: ShiftSessionCreate) -> ShiftSession:
        db_obj = ShiftSession(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

attendance_repo = AttendanceRepository()
shift_repo = ShiftRepository()
shift_assignment_repo = ShiftAssignmentRepository()
shift_session_repo = ShiftSessionRepository()
