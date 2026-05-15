from sqlalchemy import Column, String, Integer, Date, DateTime, Time, func, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base import Base

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(String(50), unique=True, index=True, nullable=False) # TKT-001
    employee_id = Column(String(30), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), default="General") # General, IT, HR, Payroll, Admin
    sub_category = Column(String(50), nullable=True) # Maintenance, Access, Hardware etc
    priority = Column(String(20), default="medium") # low, medium, high, urgent
    status = Column(String(30), default="open") # open, in_progress, resolved, closed
    assigned_to = Column(String(30)) # employee_id (e.g. IT member)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True) # Soft delete track

    # Legacy Aliases (Added to match physical DB state discovered during architecture audit)
    # These map to existing physical columns to prevent "Unknown Column" errors
    ticket_no = Column(String(50), nullable=True)
    emp_id = Column(String(30), nullable=True)
    type = Column(String(50), nullable=True)
    issue = Column(Text, nullable=True)
    department = Column(String(100), nullable=True)
    attachment_url = Column(String(255), nullable=True)
    attachments = Column(Text, nullable=True)
    author = Column(String(150), nullable=True)
    reply = Column(Text, nullable=True)
    resolution_details = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    assigned_at = Column(DateTime, nullable=True)

    comments = relationship("TicketComment", backref="ticket", lazy='joined')
    
    def __init__(self, **kwargs):
        # Professional-grade filtering against the SQLAlchemy mapper
        # Automatically map legacy fields if present in kwargs
        if "issue" in kwargs and not kwargs.get("description"):
            kwargs["description"] = kwargs["issue"]
        if "type" in kwargs and not kwargs.get("category"):
            kwargs["category"] = kwargs["type"]
        if "emp_id" in kwargs and not kwargs.get("employee_id"):
            kwargs["employee_id"] = kwargs["emp_id"]

        from sqlalchemy import inspect
        mapper = inspect(self.__class__)
        valid_keys = {attr.key for attr in mapper.all_orm_descriptors}
        actual_kwargs = {k: v for k, v in kwargs.items() if k in valid_keys or k == "id"}
        super().__init__(**actual_kwargs)

class TicketComment(Base):
    __tablename__ = "ticket_comments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    author_id = Column(String(30)) # employee_id
    author_name = Column(String(100))
    comment = Column(Text, nullable=False)
    attachments = Column(Text) # JSON fallback to Text
    created_at = Column(DateTime, server_default=func.now())
