from sqlalchemy.orm import Session
from app.models.preboarding import EmployeePreboarding
from app.schemas.preboarding import PreboardingBase, PreboardingUpdateByEmployee, PreboardingUpdateByHR, PreboardingUpdateByManager
from typing import List, Optional, Any

class PreboardingRepository:
    def get_by_employee_id(self, db: Session, employee_id: str) -> Optional[EmployeePreboarding]:
        return db.query(EmployeePreboarding).filter(EmployeePreboarding.employee_id == employee_id).first()

    def get_by_preboard_id(self, db: Session, preboard_id: str) -> Optional[EmployeePreboarding]:
        return db.query(EmployeePreboarding).filter(EmployeePreboarding.preboard_id == preboard_id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100, manager_id: Optional[str] = None) -> List[EmployeePreboarding]:
        query = db.query(EmployeePreboarding)
        if manager_id:
            from app.models.employee import Employee
            from app.models.user import User
            query = query.join(Employee, Employee.employee_id == EmployeePreboarding.employee_id) \
                         .join(User, User.id == Employee.user_id) \
                         .filter(Employee.manager_id == manager_id, User.role != 'employee')
        return query.offset(skip).limit(limit).all()

    def update(self, db: Session, db_obj: EmployeePreboarding, obj_in: Any) -> EmployeePreboarding:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            # Handle Pydantic v1 (dict) and v2 (model_dump)
            update_data = obj_in.model_dump(exclude_unset=True) if hasattr(obj_in, "model_dump") else obj_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int) -> EmployeePreboarding:
        obj = db.query(EmployeePreboarding).get(id)
        db.delete(obj)
        db.commit()
        return obj

preboarding_repo = PreboardingRepository()
