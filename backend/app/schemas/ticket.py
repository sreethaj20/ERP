from pydantic import BaseModel, model_validator
from typing import Optional, List, Any, Dict
from datetime import datetime

class TicketBase(BaseModel):
    ticket_id: Optional[str] = None
    employee_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = "IT" # IT, Payroll, HR, Facilities
    priority: Optional[str] = "medium"
    status: Optional[str] = "open"
    author_name: Optional[str] = None
    issue: Optional[str] = None # For frontend compatibility
    attachment: Optional[str] = None  # Resolved from attachment_url after hydration
    attachment_url: Optional[str] = None  # The actual DB column

class TicketCreate(TicketBase):
    recipient: Optional[str] = None # IT or HR
    department: Optional[str] = None # Alias for recipient/category
    issue: Optional[str] = None # Alias for description
    attachments: Optional[Any] = None

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    resolution_details: Optional[str] = None

class TicketOut(TicketBase):
    id: int
    employee_name: Optional[str] = None
    assigned_to: Optional[str] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    resolution_details: Optional[str] = None
    comments: List['TicketCommentOut'] = []
    attachments: Optional[Any] = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode='after')
    def resolve_attachment(self):
        """Ensure 'attachment' is populated from attachment_url if not already set."""
        if not self.attachment and self.attachment_url:
            self.attachment = self.attachment_url
        return self

    class Config:
        from_attributes = True

class TicketCommentBase(BaseModel):
    author_id: str
    author_name: str
    comment: str

class TicketCommentCreate(TicketCommentBase):
    ticket_id: int

class TicketCommentOut(TicketCommentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
