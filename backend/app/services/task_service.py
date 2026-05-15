from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate
from sqlalchemy import func

class TaskService:
    def create_task(self, db: Session, obj_in: TaskCreate, assigned_by: str) -> Task:
        count = db.query(func.count(Task.id)).scalar()
        task_id = f"TSK-{str(count + 1).zfill(3)}"
        
        db_obj = Task(
            **obj_in.dict(exclude={"task_id", "assigned_by"}),
            task_id=task_id,
            assigned_by=assigned_by
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_tasks_for_employee(self, db: Session, employee_id: str) -> List[Task]:
        return db.query(Task).filter(Task.assigned_to == employee_id).all()

    def get_tasks_created_by(self, db: Session, creator_id: str) -> List[Task]:
        return db.query(Task).filter(Task.assigned_by == creator_id).all()

    def update_task_status(self, db: Session, task_id: str, status: str) -> Optional[Task]:
        db_obj = db.query(Task).filter(Task.task_id == task_id).first()
        if not db_obj:
            db_obj = db.query(Task).filter(Task.id == task_id).first()
            
        if db_obj:
            db_obj.status = status
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def update_task(self, db: Session, task_id: str, obj_in: TaskUpdate) -> Optional[Task]:
        db_obj = db.query(Task).filter(Task.task_id == task_id).first()
        if not db_obj:
            db_obj = db.query(Task).filter(Task.id == task_id).first()
            
        if db_obj:
            update_data = obj_in.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_obj, field, value)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def delete_task(self, db: Session, task_id: str) -> bool:
        db_obj = db.query(Task).filter(Task.task_id == task_id).first()
        if not db_obj:
            db_obj = db.query(Task).filter(Task.id == task_id).first()
            
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False

task_service = TaskService()
