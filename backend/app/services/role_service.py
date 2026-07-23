from sqlalchemy.orm import Session
from typing import List, Optional, Any
from datetime import datetime
from app.repositories.role_repo import role_repo
from app.schemas.role_assignment import RoleAssignmentCreate, RoleAssignmentUpdate
from app.models.notification import AuditLog, Activity
from app.models.user import User
from sqlalchemy import func
import json

class RoleService:
    def get_all(self, db: Session, skip: int = 0, limit: int = 100, manager_id: Optional[str] = None):
        from app.models.employee import Employee
        import datetime as dt
        
        # Base query joining RoleAssignment with Employee
        query = db.query(
            role_repo.model, 
            Employee.name, 
            Employee.email, 
            Employee.performance_score,
            Employee.joining_date,
            Employee.probation_period_days
        ).join(
            Employee, Employee.employee_id == role_repo.model.employee_id
        )
        
        if manager_id:
            filtered_query = query.filter(Employee.manager_id == manager_id)
            results = filtered_query.offset(skip).limit(limit).all()
            if not results:
                results = query.offset(skip).limit(limit).all()
        else:
            results = query.offset(skip).limit(limit).all()
        
        # Flatten and attach data
        final_results = []
        need_commit = False
        for role, name, email, score, join_date, probation_days in results:
            role.employee_name = name
            role.employee_email = email
            role.performance_score = float(score) if score is not None else None
            
            # Calculate if probation/provision period is over (informational only)
            is_probation_over = False
            if join_date:
                if isinstance(join_date, dt.datetime):
                    join_date = join_date.date()
                prob_days = probation_days if probation_days is not None else 90
                probation_end_date = join_date + dt.timedelta(days=prob_days)
                if dt.date.today() > probation_end_date:
                    is_probation_over = True
            
            role.is_probation_over = is_probation_over
            final_results.append(role)
            
        return final_results

    def get_by_id(self, db: Session, id: int):
        return role_repo.get_by_id(db, id)

    def assign_role(self, db: Session, obj_in: RoleAssignmentCreate, assigned_by: str):
        # ID generation
        count = db.query(func.count(role_repo.model.id)).scalar()
        obj_in.assignment_id = f"RL-{str(count + 1).zfill(3)}"
        obj_in.assigned_by = assigned_by
        obj_in.assigned_at = datetime.now()
        
        db_obj = role_repo.create(db, obj_in)
        
        # Audit Log
        changer = db.query(User).filter(User.username == assigned_by).first()
        
        import json
        new_val_str = json.dumps(obj_in.dict(), default=str)
        
        audit = AuditLog(
            table_name="role_assignments",
            record_id=str(db_obj.id),
            action="CREATE",
            new_value=new_val_str,
            changed_by=changer.id if changer else None
        )
        db.add(audit)
        
        # Activity
        act = Activity(
            user_id=changer.id if changer else None,
            username=assigned_by,
            action="Assigned Role",
            module="Auth",
            type="General",
            target_id=db_obj.employee_id,
            description=f"Assigned role {db_obj.role_name} to {db_obj.employee_id}",
            message=f"Assigned role {db_obj.role_name} to {db_obj.employee_id}"
        )

        db.add(act)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_assignment(self, db: Session, assignment_id: Any, obj_in: RoleAssignmentUpdate, assigned_by: str = "system"):
        if isinstance(assignment_id, str) and assignment_id.startswith("RL-"):
            db_obj = role_repo.get_by_assignment_id(db, assignment_id)
        else:
            db_obj = role_repo.get_by_id(db, int(assignment_id))
            
        if not db_obj:
            return None
        
        # Enforce that if deactivating the assignment, we remove login access
        if obj_in.is_active is False:
            obj_in.login_enabled = False
            
        old_val = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
        res = role_repo.update(db, db_obj, obj_in)
        
        # Also force check if res is inactive to disable login access
        if res and not res.is_active:
            res.login_enabled = False
            db.add(res)
            
        # Audit Log
        changer = db.query(User).filter(User.username == assigned_by).first()
        
        # Serialize dictionaries to JSON strings since AuditLog columns are Text
        import json
        old_val_str = json.dumps(old_val, default=str)
        new_val_str = json.dumps(obj_in.dict(exclude_unset=True), default=str)
        
        audit = AuditLog(
            table_name="role_assignments",
            record_id=str(db_obj.id),
            action="UPDATE",
            old_value=old_val_str,
            new_value=new_val_str,
            changed_by=changer.id if changer else None
        )
        db.add(audit)
        
        db.commit()
        db.refresh(res)
        return res

role_service = RoleService()

