from sqlalchemy.orm import Session
from typing import Any
from datetime import datetime
from app.repositories.notification_repo import notification_repo, announcement_repo, activity_repo
from app.schemas.notification import NotificationCreate, AnnouncementCreate, ActivityCreate
from app.core.websocket_manager import websocket_manager

from app.core.security import sanitize_html

class NotificationService:
    async def push_notification(self, db: Session, user_id: int, employee_id: str, title: str, message: str, category: str = "General"):
        s_title = sanitize_html(title)
        s_msg = sanitize_html(message)
        obj_in = NotificationCreate(user_id=user_id, employee_id=employee_id, title=s_title, message=s_msg, category=category)
        db_obj = notification_repo.create(db, obj_in)
        # Push to websocket
        await websocket_manager.send_personal_message({
            "type": "notification",
            "title": title,
            "message": message,
            "category": category,
            "id": db_obj.id,
            "created_at": str(db_obj.created_at)
        }, str(user_id))
        return db_obj

    def mark_read(self, db: Session, notification_id: int):
        from app.models.notification import Notification
        db_obj = db.query(Notification).filter(Notification.id == notification_id).first()
        if db_obj:
            db_obj.is_read = True
            db_obj.read_at = datetime.now()
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

class AnnouncementService:
    async def post_announcement(self, db: Session, author_id: str, title: str, content: str, target: str = "All", attachments: Any = None):
        s_title = sanitize_html(title)
        s_content = sanitize_html(content)
        
        # Handle attachments (Base64)
        processed_path = None
        if attachments:
            import base64
            from app.services.storage_service import storage_service
            # Use the first one for simplicity or handle as list
            raw_att = attachments[0] if isinstance(attachments, list) and attachments else attachments
            
            if isinstance(raw_att, str) and raw_att.startswith("data:"):
                try:
                    header, encoded = raw_att.split(",", 1)
                    mime_part = header.split(":")[1]
                    mime_type = mime_part.split(";")[0]
                    ext = mime_type.split("/")[1]
                    if ext == "jpeg": ext = "jpg"
                    
                    content_bytes = base64.b64decode(encoded)
                    import uuid
                    filename = f"announcement_{uuid.uuid4().hex[:8]}.{ext}"
                    
                    processed_path, _ = await storage_service.save_content(content_bytes, filename, sub_dir="announcements")
                except Exception as e:
                    print(f"[ANNOUNCEMENT SERVICE ERROR] Attachment processing failed: {e}")

        # In DB, 'attachments' stores the relative path (usually JSON string of list)
        att_str = None
        if processed_path:
            import json
            att_str = json.dumps([processed_path])

        obj_in = AnnouncementCreate(author_id=author_id, title=s_title, content=s_content, target_audience=target, attachments=att_str)
        db_obj = announcement_repo.create(db, obj_in)
        # Broadcast to websocket
        await websocket_manager.broadcast({
            "type": "announcement",
            "title": title,
            "content": content,
            "id": db_obj.id,
            "created_at": str(db_obj.created_at)
        })
        return db_obj

    def get_announcements(self, db: Session, skip: int = 0, limit: int = 100):
        items = announcement_repo.get_multi(db, skip, limit)
        from app.services.storage_service import storage_service
        import json
        for a in items:
            if a.attachments:
                try:
                    parsed = json.loads(a.attachments)
                    if isinstance(parsed, list) and parsed:
                        a.attachment_url = storage_service.get_public_url(parsed[0])
                    else:
                        a.attachment_url = storage_service.get_public_url(a.attachments)
                except:
                    a.attachment_url = storage_service.get_public_url(a.attachments)
        return items

    def update_announcement(self, db: Session, id: int, obj_in: dict):
        db_obj = announcement_repo.get(db, id)
        if db_obj:
            for field, value in obj_in.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def delete_announcement(self, db: Session, id: int):
        return announcement_repo.remove_by_id(db, id)

class ActivityService:
    def log_activity(self, db: Session, user_id: int, username: str, action: str, module: str = None, target_id: str = None, description: str = None):
        obj_in = ActivityCreate(user_id=user_id, username=username, action=action, module=module, target_id=target_id, description=description)
        return activity_repo.create(db, obj_in)

    def get_activities(self, db: Session, skip: int = 0, limit: int = 100):
        try:
            return activity_repo.get_multi(db, skip, limit)
        except Exception as e:
            print(f"[ACTIVITY SERVICE] Error fetching activities: {str(e)}")
            if "closed the connection" in str(e).lower():
                 db.rollback()
                 # Optional: retry once if it's a closed connection
                 return activity_repo.get_multi(db, skip, limit)
            raise e

class AuditService:
    def log_audit(self, db: Session, table_name: str, record_id: str, action: str, changed_by: int, old_value: dict = None, new_value: dict = None):
        from app.models.notification import AuditLog
        db_obj = AuditLog(
            table_name=table_name,
            record_id=str(record_id),
            action=action,
            changed_by=str(changed_by) if changed_by is not None else None,
            old_value=old_value,
            new_value=new_value
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_audit_logs(self, db: Session, skip: int = 0, limit: int = 100):
        from app.models.notification import AuditLog
        return db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

notification_service = NotificationService()
announcement_service = AnnouncementService()
activity_service = ActivityService()
audit_service = AuditService()
