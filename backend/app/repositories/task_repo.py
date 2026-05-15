from sqlalchemy.orm import Session
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate
from typing import List, Optional

class TaskRepository:
    def get(self, db: Session, task_id: str) -> Optional[Task]:
        return db.query(Task).filter(Task.task_id == task_id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[Task]:
        return db.query(Task).offset(skip).limit(limit).all()

    def get_by_assignee(self, db: Session, employee_id: str) -> List[Task]:
        return db.query(Task).filter(Task.assigned_to == employee_id).all()

    def get_by_creator(self, db: Session, employee_id: str) -> List[Task]:
        return db.query(Task).filter(Task.assigned_by == employee_id).all()

    def create(self, db: Session, obj_in: TaskCreate, assigned_by: str) -> Task:
        data = obj_in.dict()
        db_obj = Task(**data, assigned_by=assigned_by)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: Task, obj_in: TaskUpdate) -> Task:
        data = obj_in.dict(exclude_unset=True)
        for field in data:
            setattr(db_obj, field, data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, task_id: str) -> bool:
        db_obj = self.get(db, task_id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False

task_repo = TaskRepository()
