from sqlalchemy.orm import Session
from app.models.notification import AuditLog
import json
from typing import Any, Optional

class AuditService:
    def log_action(
        self, 
        db: Session, 
        table_name: str, 
        record_id: str, 
        action: str, 
        changed_by: Optional[str] = None,
        old_value: Optional[Any] = None, 
        new_value: Optional[Any] = None
    ):
        try:
            def serializer(obj):
                from datetime import datetime, date
                from decimal import Decimal
                if isinstance(obj, (datetime, date)):
                    return obj.isoformat()
                if isinstance(obj, Decimal):
                    return float(obj)
                raise TypeError(f"Type {type(obj)} not serializable")

            # Convert dicts to JSON strings if necessary
            old_str = json.dumps(old_value, default=serializer) if isinstance(old_value, (dict, list)) else str(old_value) if old_value else None
            new_str = json.dumps(new_value, default=serializer) if isinstance(new_value, (dict, list)) else str(new_value) if new_value else None
            
            # Identity Resolution: AuditLog.changed_by is a FK to users.id (numeric)
            resolved_user_id = None
            if changed_by:
                try:
                    if str(changed_by).isdigit():
                        resolved_user_id = str(changed_by)
                    else:
                        from app.models.user import User
                        user = db.query(User).filter(User.username == str(changed_by)).first()
                        if user:
                            resolved_user_id = str(user.id)
                except Exception as ex:
                    print(f"Identity resolution failed: {ex}")

            log = AuditLog(
                table_name=table_name,
                record_id=record_id,
                action=action,
                old_value=old_str,
                new_value=new_str,
                changed_by=resolved_user_id
            )
            db.add(log)
            # Not committing here to ensure it's part of the caller's transaction
        except Exception as e:
            print(f"Failed to log audit action: {e}")

audit_service = AuditService()
