from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime

class NotificationBase(BaseModel):
    title: str
    message: str
    category: Optional[str] = "General"
    priority: Optional[str] = "normal"
    link: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: int = 0
    employee_id: Optional[str] = None

class NotificationUpdate(BaseModel):
    is_read: bool = True

class NotificationOut(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AnnouncementBase(BaseModel):
    title: str
    content: str
    target_audience: Optional[str] = "All"
    expiry_date: Optional[datetime] = None
    attachments: Optional[str] = None # JSON list of paths or single path

class AnnouncementCreate(AnnouncementBase):
    author_id: str

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None

class AnnouncementOut(AnnouncementBase):
    id: int
    author_id: str
    is_active: bool
    attachment_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ActivityBase(BaseModel):
    action: str
    message: Optional[str] = None
    module: Optional[str] = None
    type: Optional[str] = "General"
    target_id: Optional[str] = None
    description: Optional[str] = None

class ActivityCreate(ActivityBase):
    user_id: int
    username: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class ActivityOut(ActivityBase):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = "System"
    status: Optional[str] = "Success"
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogBase(BaseModel):
    table_name: str
    record_id: str
    action: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None

class AuditLogOut(AuditLogBase):
    id: int
    changed_by: Optional[str] = None
    created_at: datetime

    @field_validator('changed_by', mode='before')
    @classmethod
    def coerce_changed_by_to_str(cls, v):
        if v is None:
            return None
        return str(v)

    class Config:
        from_attributes = True

