from sqlalchemy.orm import Session
from app.models.notification import Notification, Announcement, Activity, AuditLog
from app.schemas.notification import NotificationCreate, AnnouncementCreate, ActivityCreate
from typing import List, Optional

class NotificationRepository:
    def get_unread(self, db: Session, employee_id: str) -> List[Notification]:
        return db.query(Notification).filter(Notification.employee_id == employee_id, Notification.is_read == False).all()

    def get_user_notifications(self, db: Session, user_id: int, limit: int = 50) -> List[Notification]:
        return db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(limit).all()

    def create(self, db: Session, obj_in: NotificationCreate) -> Notification:
        db_obj = Notification(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

class AnnouncementRepository:
    def get_active(self, db: Session) -> List[Announcement]:
        return db.query(Announcement).filter(Announcement.is_active == True).order_by(Announcement.created_at.desc()).all()

    def get(self, db: Session, id: int) -> Optional[Announcement]:
        return db.query(Announcement).filter(Announcement.id == id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[Announcement]:
        return db.query(Announcement).order_by(Announcement.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: AnnouncementCreate) -> Announcement:
        data = obj_in.dict()
        if 'content' in data and 'message' not in data:
            data['message'] = data.pop('content')
        db_obj = Announcement(**data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


    def remove_by_id(self, db: Session, id: int):
        db_obj = self.get(db, id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False

class ActivityRepository:
    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[Activity]:
        return db.query(Activity).order_by(Activity.created_at.desc()).offset(skip).limit(limit).all()

    def get_user_activities(self, db: Session, user_id: int, limit: int = 100) -> List[Activity]:
        return db.query(Activity).filter(Activity.user_id == user_id).order_by(Activity.created_at.desc()).limit(limit).all()

    def create(self, db: Session, obj_in: ActivityCreate) -> Activity:
        data = obj_in.dict()
        # Ensure message is populated for DB parity (NOT NULL constraint)
        if not data.get("message"):
            data["message"] = data.get("description") or data.get("action") or "System Activity"
        
        db_obj = Activity(**data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


notification_repo = NotificationRepository()
announcement_repo = AnnouncementRepository()
activity_repo = ActivityRepository()
