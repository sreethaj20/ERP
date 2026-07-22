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
            if changed_by and str(changed_by).strip() not in ["0", "None", "null", ""]:
                try:
                    c_str = str(changed_by).strip()
                    from app.models.user import User
                    if c_str.isdigit() and int(c_str) > 0:
                        uid = int(c_str)
                        if db.query(User.id).filter(User.id == uid).first():
                            resolved_user_id = uid
                    else:
                        user = db.query(User.id).filter(
                            (User.username == c_str) | (User.employee_id == c_str) | (User.email == c_str)
                        ).first()
                        if user:
                            resolved_user_id = user[0]
                except Exception as ex:
                    print(f"Identity resolution failed: {ex}")

            with db.begin_nested():
                log = AuditLog(
                    table_name=table_name,
                    record_id=record_id,
                    action=action[:20] if action else "UPDATE",
                    old_value=old_str,
                    new_value=new_str,
                    changed_by=resolved_user_id
                )
                db.add(log)
                db.flush()
        except Exception as e:
            print(f"Failed to log audit action: {e}")

audit_service = AuditService()
