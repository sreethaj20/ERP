from fastapi import APIRouter, Depends, HTTPException, status, Request
import os
from app.core.rate_limiter import limiter
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.notification_service import notification_service, announcement_service, activity_service
from app.services.ticket_service import ticket_service
from app.schemas.notification import NotificationOut, AnnouncementOut, ActivityOut
from app.schemas.ticket import TicketOut, TicketCreate, TicketUpdate, TicketCommentOut, TicketCommentCreate
from app.schemas.holiday import HolidayOut
from app.schemas.employee import EmployeeOut
from app.services.employee_service import employee_service
from app.services.storage_service import storage_service

router = APIRouter()

from app.schemas.employee import EmployeeShort

@router.get("/employees/reference", response_model=List[EmployeeShort])
def get_all_employees_for_reference(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns all employees with limited fields for dropdown populating. Open to all authenticated users."""
    cols = ["id", "employee_id", "name", "first_name", "last_name", "role", "department", "reporting_to_id", "manager_id", "team_leader_id"]
    return employee_service.get_all_employees(db, 0, 1000, role_filter=None, columns=cols)

# --- Notifications ---

@router.get("/notifications", response_model=List[NotificationOut])
@limiter.limit("60/minute")
def get_my_notifications(request: Request, skip: int = 0, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.repositories.notification_repo import notification_repo
    return notification_repo.get_user_notifications(db, current_user.id, limit)

@router.patch("/notifications/{id}/read", response_model=NotificationOut)
def read_notification(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return notification_service.mark_read(db, id)

# --- Announcements ---

@router.get("/announcements", response_model=List[AnnouncementOut])
@limiter.limit("100/minute")
def get_announcements(request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return announcement_service.get_announcements(db, skip, limit)

# --- Shared Tickets ---

@router.get("/me/profile", response_model=EmployeeOut)
def get_my_own_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Safe endpoint for any logged-in user to see their own employee profile."""
    from app.services.employee_service import employee_service
    return employee_service.get_profile(db, current_user.id)

@router.get("/support-tickets", response_model=List[TicketOut])
async def get_all_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Federated ticket access logic
    from app.models.ticket import Ticket
    from app.models.employee import Employee
    import json
    
    query = db.query(Ticket).filter(Ticket.deleted_at == None)
    
    if current_user.role == "it":
        query = query.filter(Ticket.category == "IT")
    elif current_user.role == "hr":
        query = query.filter(Ticket.category != "IT")
    elif current_user.role not in ["manager", "admin"]:
        # Standard employees only see their own
        query = query.filter(Ticket.employee_id == current_user.employee_id)
        
    tickets = query.offset(skip).limit(limit).all()
    
    # Safe Hydration loop
    for t in tickets:
        ticket_service.hydrate_attachment(t)
        
    return tickets

@router.post("/support-tickets", response_model=TicketOut)
async def raise_shared_ticket(obj_in: TicketCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Standard security inheritance: enforce server-side identity
    if current_user.employee_id:
        obj_in.employee_id = current_user.employee_id
    else:
        from app.services.employee_service import employee_service
        emp = employee_service.get_profile(db, current_user.id)
        obj_in.employee_id = emp.employee_id
        
    return await ticket_service.create_ticket(db, obj_in)

@router.patch("/support-tickets/{id}", response_model=TicketOut)
async def update_shared_ticket(id: int, obj_in: TicketUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Governance: resolved/closed tickets usually only allowed by HR/IT/Manager/Author
    return ticket_service.update_ticket_by_id(db, id, obj_in)

@router.delete("/support-tickets/{id}")
def delete_shared_ticket(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Soft delete via repository
    res = ticket_service.repo.remove(db, id)
    if not res:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket archived successfully"}

@router.post("/support-tickets/{id}/comments", response_model=TicketCommentOut)
async def add_ticket_comment(id: int, comment_text: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Logic to add comment with profile fallback
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    # If user has no employee profile (e.g. system admin), use user ID as proxy
    author_id = emp.employee_id if emp else f"USR-{current_user.id}"
    author_name = emp.name if emp else (current_user.full_name or current_user.username)
    
    return ticket_service.add_comment(db, id, author_id, author_name, comment_text)

# --- Activities ---

@router.get("/activities", response_model=List[ActivityOut])
def get_audit_activities(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return activity_service.get_activities(db, skip, limit)

# --- Shared Holidays ---

@router.get("/holidays", response_model=List[HolidayOut])
def get_shared_holidays(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.holiday_service import holiday_service
    return holiday_service.get_all(db)

# --- Shared Leaves (Feature 8) ---
from app.schemas.leave import LeaveOut
from app.schemas.company_profile import CompanyProfileOut

@router.get("/leaves", response_model=List[LeaveOut])
def get_shared_leaves(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.leave_service import leave_service
    # Correctly pass identity for bridged visibility (HR/Manager see all, TL sees team, Employee sees self)
    return leave_service.get_leaves(db, employee_id=current_user.employee_id, user_role=current_user.role)

# --- Shared Company Profile (Feature 3 Ext) ---
@router.get("/company-profile", response_model=Optional[CompanyProfileOut])
def get_shared_company_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.company_service import company_service
    return company_service.get_profile(db)

# --- Document Governance (Feature 23/24) ---
from fastapi.responses import FileResponse
from app.services.document_service import document_service

@router.get("/documents/{id}/download")
def download_governed_document(id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from fastapi.responses import RedirectResponse
    doc = document_service.get_document(db, id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Log the access
    document_service.log_document_access(
        db, 
        document_id=id, 
        user_id=current_user.id, 
        employee_name=current_user.full_name,
        ip_address=request.client.host
    )
    
    # Serve the file
    if storage_service.use_s3:
        # Construct pre-signed URL (secure)
        url = storage_service.get_public_url(doc.file_path)
        return RedirectResponse(url=url)
    else:
        full_path = os.path.join("uploads", doc.file_path)
        if not os.path.exists(full_path):
             raise HTTPException(status_code=404, detail="Physical file missing")
             
        return FileResponse(path=full_path, filename=doc.name)
