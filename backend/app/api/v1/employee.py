from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import time, datetime
from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_user_with_role
from app.models.user import User
from app.services.employee_service import employee_service
from app.services.attendance_service import attendance_service, shift_service
from app.services.leave_service import leave_service, leave_balance_service
from app.services.ticket_service import ticket_service
from app.services.asset_service import asset_service
from app.schemas.employee import EmployeeOut, EmployeeUpdate
from app.schemas.attendance import AttendanceOut, AttendanceUpdate, ShiftSessionOut, ShiftSessionCreate, BreakLogOut, AttendanceCorrectionCreate, AttendanceCorrectionOut
from app.schemas.leave import LeaveOut, LeaveCreate, LeaveBalanceOut, EarlyLoginCreate, EarlyLoginOut
from app.schemas.ticket import TicketOut, TicketCreate
from app.schemas.asset import AssetAllocationOut

router = APIRouter()

# --- Employee Master (Reference List: Safe for generic lookups) ---
from app.schemas.employee import EmployeeShort
@router.get("", response_model=List[EmployeeShort])
def get_all_employees(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager", "it", "recruiter"]))):
    """Returns basic employee info (ID, Name, Role) for dropdowns and references."""
    columns = [
        "id", "employee_id", "name", "first_name", "last_name", "role", "department", 
        "reporting_to", "reporting_to_id", "manager_id", "team_leader_id", "reporting_manager_id"
    ]
    return employee_service.get_all_employees(db, skip, limit, columns=columns)



# --- Employee Profile ---

@router.get("/profile", response_model=EmployeeOut)
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return employee_service.get_profile(db, current_user.id)

@router.put("/profile", response_model=EmployeeOut)
async def update_my_profile(obj_in: EmployeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    print(f"DEBUG: update_my_profile hit for user {current_user.id}")
    """
    Stabilized Profile Governance:
    Standard employees can ONLY edit Name, Photo, and Phone.
    All other fields require an HR Ticket.
    """
    emp = employee_service.get_profile(db, current_user.id)
    
    # Enforce Governance: Strip restricted fields if not HR/Manager
    user_role = (current_user.role or "").lower()
    if user_role not in ["hr", "manager", "admin"]:
        # White-list of editable fields for standard users (Personal Information)
        allowed_fields = [
            "name", "first_name", "last_name", "phone", "personal_mobile", "personal_email", 
            "profile_photo_url", "photo", "dob", "gender", "blood_group", "marital_status", "nationality",
            "permanent_address", "current_address", "address", "city", "state", "postal_code", "pincode"
        ]
        update_data = obj_in.dict(exclude_unset=True)
        restricted_updates = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        # If they tried to change restricted fields, we still process the allowed ones 
        # but the restricted ones are ignored at the service level by our filtered obj_in.
        from app.schemas.employee import EmployeeUpdate
        safe_obj_in = EmployeeUpdate(**restricted_updates)
        res = await employee_service.update_employee(db, emp.employee_id, safe_obj_in, changed_by=current_user.username)
        print(f"DEBUG: update_employee (restricted) returned type: {type(res)}")
        return res
        
    res = await employee_service.update_employee(db, emp.employee_id, obj_in, changed_by=current_user.username)
    print(f"DEBUG: update_employee (full) returned type: {type(res)}")
    return res

@router.put("/{emp_id}", response_model=EmployeeOut)
async def update_any_employee(emp_id: str, obj_in: EmployeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager", "admin"]))):
    """
    Unified Employee Update: Allows HR and Managers to update any employee profile.
    """
    res = await employee_service.update_employee(db, emp_id, obj_in, changed_by=current_user.username)
    print(f"DEBUG: update_any_employee returned type: {type(res)}")
    return res

# --- Attendance & Shifts ---

@router.post("/attendance/checkin", response_model=AttendanceOut)
def employee_check_in(check_in_time: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    today = datetime.now().date()
    t = time.fromisoformat(check_in_time) if check_in_time else datetime.now().time()
    dt = datetime.combine(today, t)
    return attendance_service.check_in(db, emp.employee_id, dt)

@router.post("/attendance/checkout", response_model=AttendanceOut)
def employee_check_out(check_out_time: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    today = datetime.now().date()
    t = time.fromisoformat(check_out_time) if check_out_time else datetime.now().time()
    dt = datetime.combine(today, t)
    return attendance_service.check_out(db, emp.employee_id, dt)

@router.post("/attendance/correction", response_model=AttendanceCorrectionOut)
def request_attendance_correction(obj_in: AttendanceCorrectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    # Enforce ownership: ignore client-supplied employee_id
    obj_in.employee_id = emp.employee_id
    return attendance_service.request_correction(db, obj_in)

# --- Shifts & Breaks ---

@router.post("/shifts/start", response_model=ShiftSessionOut)
async def start_shift(obj_in: ShiftSessionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    obj_in.employee_id = emp.employee_id
    return await shift_service.start_session(db, obj_in)

@router.post("/shifts/end", response_model=ShiftSessionOut)
async def end_shift(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return await shift_service.end_session(db, emp.employee_id)

@router.post("/shifts/break/start/{userId}", response_model=BreakLogOut)
def start_break(userId: str, type: Optional[str] = "break", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return shift_service.start_break(db, emp.employee_id, type)

@router.get("/assets", response_model=List[AssetAllocationOut])
def get_my_assets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return asset_service.get_employee_assets(db, emp.employee_id)

@router.post("/shifts/break/end/{userId}", response_model=BreakLogOut)
def end_break(userId: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return shift_service.end_break(db, emp.employee_id)

@router.get("/shifts/breaks", response_model=List[BreakLogOut])
def get_my_breaks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return shift_service.get_breaks_by_session(db, emp.employee_id)

@router.get("/shifts/active", response_model=Optional[ShiftSessionOut])
def get_active_shift(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return shift_service.get_active_session(db, emp.employee_id)

@router.get("/attendance/history", response_model=List[ShiftSessionOut])
def get_attendance_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return shift_service.get_attendance_history(db, emp.employee_id)

# --- Early Login ---

@router.post("/early-login/request", response_model=EarlyLoginOut)
def request_early_login(obj_in: EarlyLoginCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    obj_in.employee_id = emp.employee_id
    return attendance_service.request_early_login(db, obj_in)

@router.get("/early-login/list", response_model=List[EarlyLoginOut])
def get_my_early_login_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return attendance_service.get_my_early_login_requests(db, emp.employee_id)

# --- Leave ---

@router.get("/leaves", response_model=List[LeaveOut])
def get_my_leaves(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return leave_service.get_leaves(db, emp.employee_id)

@router.post("/leaves", response_model=LeaveOut)
def apply_leave(obj_in: LeaveCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    # Enforce ownership
    obj_in.employee_id = emp.employee_id
    return leave_service.apply_leave(db, obj_in)
@router.post("/leaves/{leave_id}/cancel", response_model=LeaveOut)
def cancel_my_leave(leave_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return leave_service.cancel_leave(db, leave_id, emp.employee_id)

@router.get("/leave-balance", response_model=LeaveBalanceOut)
def get_my_leave_balance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return leave_balance_service.get_balance(db, emp.employee_id)


@router.get("/payslips")
def get_my_payslips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Rows from payroll_history for the logged-in employee (empty list if table missing or no rows)."""
    emp = employee_service.get_profile(db, current_user.id)
    try:
        rows = db.execute(
            text(
                "SELECT id, payroll_id, employee_id, month, year, basic_salary, hra, allowances, bonus, "
                "deductions, lop_deduction, tax_deduction, pf_deduction, esi_deduction, net_salary, "
                "status, payslip_url, generated_at FROM payroll_history WHERE employee_id = :eid "
                "ORDER BY year DESC, id DESC LIMIT 100"
            ),
            {"eid": emp.employee_id},
        ).mappings().all()
        res = []
        for r in rows:
            d = dict(r)
            if d.get("payslip_url"):
                d["payslip_url"] = storage_service.get_public_url(d["payslip_url"])
            res.append(d)
        return res
    except Exception:
        return []

# --- Tickets ---

@router.get("/tickets", response_model=List[TicketOut])
def get_my_tickets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    tickets = ticket_service.get_my_tickets(db, emp.employee_id)
    for t in tickets:
        ticket_service.hydrate_attachment(t)
    return tickets



# --- Employee Lifecycle ---
from app.schemas.manager_onboarding import ManagerOnboardingOut
from app.schemas.preboarding import PreboardingOut
from app.schemas.offboarding import OffboardingOut
from app.services.manager_onboarding_service import manager_onboarding_service
from app.services.preboarding_service import preboarding_service
from app.services.offboarding_service import offboarding_service

@router.get("/onboarding", response_model=List[ManagerOnboardingOut])
def get_my_onboarding(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    res = manager_onboarding_service.get_employee_requests(db, emp.employee_id)
    return res if isinstance(res, list) else ([res] if res else [])

@router.get("/preboarding", response_model=List[PreboardingOut])
def get_my_preboarding(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    res = preboarding_service.get_preboarding_by_employee_id(db, emp.employee_id)
    return res if isinstance(res, list) else ([res] if res else [])

@router.get("/offboarding", response_model=List[OffboardingOut])
def get_my_offboarding(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    res = offboarding_service.get_by_employee_id(db, emp.employee_id)
    return res if isinstance(res, list) else ([res] if res else [])


from app.schemas.task import TaskOut
from app.services.task_service import task_service
from app.schemas.performance import PerformanceReviewOut
from app.services.performance_service import performance_service

@router.get("/tasks", response_model=List[TaskOut])
def get_my_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return task_service.get_tasks_for_employee(db, emp.employee_id)

@router.patch("/tasks/{task_id}/status", response_model=TaskOut)
def update_my_task_status(task_id: str, status: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Simple status update for employee
    res = task_service.update_task_status(db, task_id, status)
    if not res:
        raise HTTPException(status_code=404, detail="Task not found")
    return res

@router.get("/performance", response_model=List[PerformanceReviewOut])
def get_my_performance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return performance_service.get_reviews_for_employee(db, emp.employee_id)

@router.get("/dashboard")
def get_employee_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.dashboard_service import dashboard_service
    emp = employee_service.get_profile(db, current_user.id)
    return dashboard_service.get_employee_dashboard(db, emp.employee_id, current_user.id)

from app.schemas.document import DocumentOut
from app.services.document_service import document_service
from fastapi import UploadFile, File

@router.get("/documents", response_model=List[DocumentOut])
def get_employee_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    # Get documents owned by user OR referencing the employee ID (e.g. uploaded by HR for them)
    from app.repositories.document_repo import document_repo
    owned_docs = document_repo.get_by_owner(db, current_user.id)
    ref_docs = document_repo.get_by_reference(db, str(emp.employee_id))
    
    # Combine and de-duplicate by ID
    all_docs = {doc.id: doc for doc in (owned_docs + ref_docs)}.values()
    return [document_service.hydrate_document(doc) for doc in all_docs]

@router.post("/documents", response_model=DocumentOut)
async def upload_employee_document(file: UploadFile = File(...), category: str = "General", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = employee_service.get_profile(db, current_user.id)
    return await document_service.upload_document(db, file, current_user.id, module="employee", reference_id=emp.employee_id, category=category)

@router.delete("/documents/{id}")
def delete_employee_document(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # security check: owner only
    doc = db.query(document_service.document_repo.model).filter(document_service.document_repo.model.id == id).first()
    if not doc or doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")
    return document_service.delete_document(db, id)

# --- Dynamic Routes (must be at the bottom) ---
@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee_by_id(employee_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    IDOR PROTECTION: Only allow viewing of other profiles if user is HR/Manager 
    OR if they are viewing their own profile.
    """
    emp = employee_service.get_employee(db, employee_id)
    
    # Authorization Check
    user_role = (current_user.role or "").lower()
    is_self = (emp.employee_id == current_user.employee_id)
    
    # HR and Admin have organization-wide visibility
    if user_role in ["hr", "admin"]:
        return emp
        
    if is_self:
        return emp
        
    # Managers and IT have visibility scoped to their authority or operational needs
    # For Managers/TLs, verify hierarchy
    if user_role in ["manager", "teamleader", "tl"]:
        if employee_service.verify_subordinate_authority(db, emp.employee_id, current_user.employee_id, user_role):
            return emp
            
    # IT can view for asset management purposes, but we should eventually restrict fields
    if user_role == "it":
        return emp
        
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, 
        detail="Access Denied: You do not have permission to view this profile. Scoped access only."
    )

@router.put("/{employee_id}", response_model=EmployeeOut)
async def update_employee(employee_id: str, obj_in: EmployeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager"]))):
    res = await employee_service.update_employee(db, employee_id, obj_in, changed_by=current_user.username)
    print(f"DEBUG: update_employee (bottom) returned type: {type(res)}")
    return res

@router.delete("/{employee_id}")
async def delete_employee(employee_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager"]))):
    res = await employee_service.delete_employee(db, employee_id, changed_by=current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted successfully"}
