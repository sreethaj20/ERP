from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.role_assignment import RoleAssignment
from app.schemas.role_assignment import RoleAssignmentCreate, RoleAssignmentUpdate

class RoleRepository:
    model = RoleAssignment
    def get_all(self, db: Session, skip: int = 0, limit: int = 100, manager_id: Optional[str] = None) -> List[RoleAssignment]:
        query = db.query(RoleAssignment)
        if manager_id:
            from app.models.employee import Employee
            from app.models.user import User
            query = query.join(Employee, Employee.employee_id == RoleAssignment.employee_id) \
                         .join(User, User.id == Employee.user_id) \
                         .filter(Employee.manager_id == manager_id, User.role != 'employee')
        return query.offset(skip).limit(limit).all()

    def get_by_id(self, db: Session, id: int) -> Optional[RoleAssignment]:
        return db.query(RoleAssignment).filter(RoleAssignment.id == id).first()

    def get_by_assignment_id(self, db: Session, assignment_id: str) -> Optional[RoleAssignment]:
        return db.query(RoleAssignment).filter(RoleAssignment.assignment_id == assignment_id).first()

    def get_by_employee(self, db: Session, employee_id: str) -> Optional[RoleAssignment]:
        return db.query(RoleAssignment).filter(RoleAssignment.employee_id == employee_id).first()

    def create(self, db: Session, obj_in: RoleAssignmentCreate) -> RoleAssignment:
        db_obj = RoleAssignment(
            assignment_id=obj_in.assignment_id,
            employee_id=obj_in.employee_id,
            shift_id=obj_in.shift_id,
            role_name=obj_in.role_name,
            login_enabled=obj_in.login_enabled,
            assigned_by=obj_in.assigned_by,
            effective_from=obj_in.effective_from,
            effective_to=obj_in.effective_to,
            notes=obj_in.notes,
            is_active=obj_in.is_active
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: RoleAssignment, obj_in: RoleAssignmentUpdate) -> RoleAssignment:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

role_repo = RoleRepository()
