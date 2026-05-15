from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.company_profile import Department, CompanyProfile
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, DepartmentCreate
from typing import List, Optional

class EmployeeRepository:
    model = Employee
    def get(self, db: Session, identifier: str, include_deleted: bool = False) -> Optional[Employee]:
        query = db.query(Employee)
        if not include_deleted:
            query = query.filter(Employee.deleted_at == None)
            
        if str(identifier).startswith("EMP-"):
            return query.filter(Employee.employee_id == identifier).first()
        try:
            numeric_id = int(str(identifier))
            return query.filter(Employee.id == numeric_id).first()
        except (ValueError, TypeError):
            return query.filter(Employee.employee_id == identifier).first()

    def get_by_user_id(self, db: Session, user_id: int) -> Optional[Employee]:
        return db.query(Employee).filter(Employee.user_id == user_id, Employee.deleted_at == None).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[Employee]:
        return db.query(Employee).filter(Employee.deleted_at == None).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: EmployeeCreate) -> Employee:
        obj_data = obj_in.dict()
        # Filter fields that exist in model
        model_data = {k: v for k, v in obj_data.items() if hasattr(Employee, k)}
        
        # Ensure ID fields are strings to match VARCHAR columns
        for key in ['manager_id', 'team_leader_id', 'reporting_manager_id']:
            if key in model_data and model_data[key] is not None:
                model_data[key] = str(model_data[key])
                
        db_obj = Employee(**model_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: Employee, obj_in: EmployeeUpdate) -> Employee:
        obj_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, id: int) -> Optional[Employee]:
        from datetime import datetime
        obj = db.query(Employee).get(id)
        if obj:
            obj.deleted_at = datetime.now()
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def restore(self, db: Session, id: int) -> Optional[Employee]:
        obj = db.query(Employee).filter(Employee.id == id).first()
        if obj:
            obj.deleted_at = None
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

class DepartmentRepository:
    def get(self, db: Session, id: int) -> Optional[Department]:
        return db.query(Department).filter(Department.id == id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[Department]:
        return db.query(Department).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: DepartmentCreate) -> Department:
        obj_data = obj_in.dict()
        model_data = {k: v for k, v in obj_data.items() if hasattr(Department, k)}
        db_obj = Department(**model_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

class CompanyProfileRepository:
    def get_latest(self, db: Session) -> Optional[CompanyProfile]:
        return db.query(CompanyProfile).order_by(CompanyProfile.id.desc()).first()

    def update(self, db: Session, db_obj: CompanyProfile, obj_in: dict) -> CompanyProfile:
        for field in obj_in:
            if hasattr(db_obj, field):
                setattr(db_obj, field, obj_in[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

employee_repo = EmployeeRepository()
employee_repo.model = Employee # Explicitly set for stale module instances
department_repo = DepartmentRepository()
company_repo = CompanyProfileRepository()
