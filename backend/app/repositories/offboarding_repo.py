from sqlalchemy.orm import Session
from app.models.offboarding import OffboardingRequest
from app.schemas.offboarding import OffboardingCreate, OffboardingUpdateByManager, OffboardingUpdateByHR
from typing import List, Optional, Any

class OffboardingRepository:
    def create(self, db: Session, obj_in: OffboardingCreate) -> OffboardingRequest:
        db_obj = OffboardingRequest(**obj_in.dict())
        
        # Auto-generate offboard_id if not present
        if not db_obj.offboard_id and db_obj.employee_id:
            import random
            db_obj.offboard_id = f"OFF-{db_obj.employee_id}-{random.randint(1000, 9999)}"
            
        # Populate employee name and department if missing
        if db_obj.employee_id:
            from app.models.employee import Employee
            emp = db.query(Employee).filter(Employee.employee_id == db_obj.employee_id).first()
            if emp:
                if not db_obj.employeeName:
                    db_obj.employeeName = emp.name or f"{emp.first_name} {emp.last_name}".strip()
                if not db_obj.department:
                    db_obj.department = emp.department

        # Fallback date resolution to ensure data consistency
        if not db_obj.exit_date:
            if db_obj.last_working_day:
                db_obj.exit_date = db_obj.last_working_day
            else:
                from datetime import date, timedelta
                notice = db_obj.notice_period_days or 30
                calc_date = date.today() + timedelta(days=notice)
                db_obj.exit_date = calc_date
                db_obj.last_working_day = calc_date

        if not db_obj.last_working_day and db_obj.exit_date:
            db_obj.last_working_day = db_obj.exit_date

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_offboard_id(self, db: Session, offboard_id: str) -> Optional[OffboardingRequest]:
        return db.query(OffboardingRequest).filter(OffboardingRequest.offboard_id == offboard_id).first()

    def get_by_employee_id(self, db: Session, employee_id: str) -> Optional[OffboardingRequest]:
        return db.query(OffboardingRequest).filter(OffboardingRequest.employee_id == employee_id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100, manager_id: Optional[str] = None) -> List[OffboardingRequest]:
        query = db.query(OffboardingRequest)
        if manager_id:
            from app.models.employee import Employee
            from app.models.user import User
            query = query.join(Employee, Employee.employee_id == OffboardingRequest.employee_id) \
                         .join(User, User.id == Employee.user_id) \
                         .filter(Employee.manager_id == manager_id, User.role != 'employee')
        return query.offset(skip).limit(limit).all()

    def update(self, db: Session, db_obj: OffboardingRequest, obj_in: Any) -> OffboardingRequest:
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

offboarding_repo = OffboardingRepository()
