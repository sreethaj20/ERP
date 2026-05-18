from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_user_with_role
from app.models.user import User
from app.services.employee_service import employee_service, department_service
from app.services.attendance_service import attendance_service
from app.services.leave_service import leave_service, leave_balance_service, leave_policy_service
from app.services.hr_onboarding_service import hr_onboarding_service
from app.services.preboarding_service import preboarding_service
from app.services.offboarding_service import offboarding_service
from app.services.role_service import role_service
from app.schemas.employee import EmployeeOut, EmployeeCreate, EmployeeUpdate, DepartmentOut, DepartmentCreate, EmployeeListOut
from app.schemas.attendance import AttendanceOut, AttendanceCorrectionOut, AttendanceCorrectionUpdate, StaffTimesheetItem
from app.schemas.leave import LeaveOut, LeaveBalanceOut, LeaveBalanceUpdate, LeaveBalanceCreate, LeavePolicyOut, LeavePolicyCreate
from app.schemas.holiday import HolidayOut, HolidayCreate
from app.schemas.hr_onboarding import HROnboardingOut, HROnboardingUpdate, HROnboardingCreate, HROnboardingBulkCreate, HROnboardingApproveOut
from app.schemas.preboarding import PreboardingOut, PreboardingUpdateByHR, PreboardingBase, PreboardingUpdate
from app.schemas.offboarding import OffboardingOut, OffboardingCreate, OffboardingUpdateByHR
from app.schemas.role_assignment import RoleAssignmentOut, RoleAssignmentCreate, RoleAssignmentUpdate
from app.schemas.shift import ShiftDefinitionOut, ShiftDefinitionCreate, ShiftDefinitionUpdate, ShiftAssignmentOut, ShiftAssignmentCreate, ShiftSessionOut
from app.models.shift import ShiftDefinition
from app.services.attendance_service import shift_service
from app.services.company_service import company_service
from app.schemas.company_profile import CompanyProfileOut
from app.schemas.document import DocumentOut
from app.services.document_service import document_service

router = APIRouter()

# --- HR Master Utilities ---
@router.get("/next-employee-id")
def get_next_employee_id(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager", "admin", "it"]))):
    """HR: Generate the next sequential business Employee ID."""
    from app.utils.id_generator import generate_next_employee_id
    return {"employee_id": generate_next_employee_id(db)}

# --- HR Departments (Organization page) ---

@router.get("/departments", response_model=List[DepartmentOut])
def list_hr_departments(skip: int = 0, limit: int = 200, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "it", "recruiter", "manager"]))):
    return department_service.get_all_departments(db, skip, limit)


@router.post("/departments", response_model=DepartmentOut)
def create_hr_department(obj_in: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return department_service.create_department(db, obj_in)


# --- HR Employee Master ---

@router.get("/employees", response_model=List[EmployeeListOut])
def get_all_employees(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "admin", "it"]))):
    """
    HR Master List: Restricted to HR/Admin.
    Returns safe summary data to prevent PII leakage.
    """
    # Optimized fetch for list view
    # Optimized fetch for list view - Include all hierarchy fields for proper frontend grouping
    columns = [
        "id", "employee_id", "name", "first_name", "last_name", "role", "department", 
        "email", "designation", "status", "joining_date", "profile_photo_url", 
        "reporting_to", "reporting_to_id", "manager_id", "team_leader_id", "reporting_manager_id"
    ]
    return employee_service.get_all_employees(db, skip, limit, role_filter="hr_master", columns=columns)

@router.post("/employees", response_model=EmployeeOut)
async def create_employee(obj_in: EmployeeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager"]))):
    return await employee_service.create_employee(db, obj_in)

@router.put("/employees/{emp_id}", response_model=EmployeeOut)
async def update_hr_employee(emp_id: str, obj_in: EmployeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    """HR: Update any employee profile including hierarchy."""
    res = await employee_service.update_employee(db, emp_id, obj_in, changed_by=current_user.username)
    print(f"DEBUG: update_hr_employee returned type: {type(res)}")
    return res

@router.delete("/employees/{emp_id}")
async def delete_hr_employee(emp_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    """HR: Purge employee record."""
    await employee_service.delete_employee(db, emp_id, changed_by=current_user.username)
    return {"status": "success"}

@router.post("/onboarding", response_model=HROnboardingOut)
def create_hr_onboarding_request(obj_in: HROnboardingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return hr_onboarding_service.create_request(db, obj_in)

@router.get("/employees/{emp_id}/documents", response_model=List[DocumentOut])
def get_employee_documents_for_hr(emp_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    """Fetch all documents referencing a specific employee for HR review."""
    return document_service.get_module_documents(db, emp_id)

@router.post("/onboarding/bulk", response_model=List[HROnboardingOut])
def create_hr_bulk_onboarding(obj_in: HROnboardingBulkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return hr_onboarding_service.create_bulk_requests(db, obj_in.employees)

# --- HR Onboarding ---

@router.get("/onboarding", response_model=List[HROnboardingOut])
def get_hr_onboarding_requests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return hr_onboarding_service.get_requests(db, skip, limit)

@router.post("/onboarding/{request_id}/approve", response_model=HROnboardingApproveOut)
async def approve_hr_onboarding_request(request_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = await hr_onboarding_service.approve_request(db, request_id, current_user.full_name)
    if not res:
        raise HTTPException(status_code=404, detail="Request not found")
    return res

@router.post("/onboarding/{request_id}/complete", response_model=HROnboardingOut)
async def complete_hr_onboarding_request(request_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = await hr_onboarding_service.complete_onboarding(db, request_id)
    if not res:
        raise HTTPException(status_code=404, detail="Request not found")
    return res

@router.put("/onboarding/{request_id}", response_model=HROnboardingOut)
def update_hr_onboarding_request(request_id: str, obj_in: HROnboardingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = hr_onboarding_service.update_request(db, request_id, obj_in)
    if not res:
        raise HTTPException(status_code=404, detail="Request not found")
    return res

# --- HR Preboarding (V2) ---

@router.get("/preboarding-v2", response_model=List[PreboardingOut])
def get_all_preboarding(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return preboarding_service.get_multi(db, skip, limit)

@router.post("/preboarding-v2/{preboard_id}/verify", response_model=PreboardingOut)
async def verify_preboarding(preboard_id: str, obj_in: PreboardingUpdateByHR, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = await preboarding_service.verify_by_hr(db, preboard_id, obj_in)
    if not res:
        raise HTTPException(status_code=404, detail="Preboarding not found")
    return res

@router.post("/preboarding-v2", response_model=PreboardingOut)
def create_preboarding(obj_in: PreboardingBase, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return preboarding_service.create(db, obj_in)

@router.put("/preboarding-v2/{preboard_id}", response_model=PreboardingOut)
async def update_preboarding_v2(preboard_id: str, obj_in: PreboardingUpdateByHR, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = await preboarding_service.verify_by_hr(db, preboard_id, obj_in)
    if not res:
        raise HTTPException(status_code=404, detail="Preboarding not found")
    return res

# --- HR Offboarding ---

@router.get("/offboarding", response_model=List[OffboardingOut])
def get_hr_offboarding_requests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager"]))):
    return offboarding_service.get_multi(db, skip, limit)

@router.post("/offboarding", response_model=OffboardingOut)
def initiate_offboarding_by_hr(obj_in: OffboardingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return offboarding_service.initiate_offboarding(db, obj_in)

@router.post("/offboarding/{offboard_id}/complete", response_model=OffboardingOut)
async def hr_complete_offboarding(offboard_id: str, obj_in: OffboardingUpdateByHR, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = await offboarding_service.hr_complete(db, offboard_id, obj_in, changed_by=current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Offboarding not found")
    return res

# --- HR Role Management ---

@router.get("/roles", response_model=List[RoleAssignmentOut])
def get_hr_role_assignments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return role_service.get_all(db, skip, limit)

@router.post("/roles", response_model=RoleAssignmentOut)
def create_hr_role_assignment(obj_in: RoleAssignmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return role_service.assign_role(db, obj_in, current_user.username)

@router.put("/roles/{id}", response_model=RoleAssignmentOut)
def update_hr_role_assignment(id: int, obj_in: RoleAssignmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = role_service.update_assignment(db, id, obj_in)
    if not res:
        raise HTTPException(status_code=404, detail="Role assignment not found")
    return res


# --- HR Payroll ---

@router.get("/payroll/history")
def get_payroll_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    """Fetch recent payroll records from the database."""
    from sqlalchemy import text
    try:
        rows = db.execute(text("SELECT * FROM payroll_history ORDER BY id DESC LIMIT 50")).mappings().all()
        return [dict(r) for r in rows]
    except:
        return []

@router.get("/payroll/calculate")
def calculate_employee_payroll(emp_id: str, month: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    """
    Industry-level salary computation:
    1. Fetch base salary and designation.
    2. Count present days in the billing month.
    3. Deduct LOP (Loss of Pay) for absent days.
    4. Calculate taxes and net payable.
    """
    try:
        from app.services.attendance_service import attendance_service
        from app.repositories.employee_repo import employee_repo
        from datetime import datetime
        import calendar

        emp = employee_repo.get(db, emp_id)
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Parse month (YYYY-MM)
        try:
            year_val, month_val = map(int, month.split("-"))
        except:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")

        # Get working days in month
        _, last_day = calendar.monthrange(year_val, month_val)
        
        # Check attendance counts
        attendance_data = attendance_service.get_my_attendance(db, emp_id, 0, 100)
        # Filter by month
        present_days = len([a for a in attendance_data if a["date"].year == year_val and a["date"].month == month_val and a["status"] == "Present"])
        
        # Mock financial data (In real prod, this comes from 'salary_structures' table)
        base_salary = 50000.0 if not hasattr(emp, 'base_salary') else (emp.base_salary or 50000.0)
        per_day = base_salary / last_day
        
        attendance_salary = round(per_day * present_days, 2)
        hra = round(attendance_salary * 0.4, 2)
        allowances = 2000.0
        
        lop_deduction = round(base_salary - attendance_salary, 2)
        pf_deduction = round(attendance_salary * 0.12, 2)
        tax_deduction = round(attendance_salary * 0.10, 2) # 10% TDS mock
        
        net_payable = round(attendance_salary + hra + allowances - pf_deduction - tax_deduction, 2)
        
        return {
            "employee_id": emp_id,
            "name": emp.name,
            "month": month,
            "base_salary": base_salary,
            "attendance_count": present_days,
            "total_days": last_day,
            "net_payable": net_payable,
            "hra": hra,
            "allowances": allowances,
            "bonus": 0.0,
            "deductions": round(pf_deduction + tax_deduction + lop_deduction, 2),
            "lop_deduction": lop_deduction,
            "tax_deduction": tax_deduction,
            "pf_deduction": pf_deduction,
            "esi_deduction": 0.0
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payroll/submit")
def submit_payroll_record(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    """Finalize calculation and save to history."""
    from sqlalchemy import text
    try:
        transaction_id = f"PAY-{int(datetime.now().timestamp())}"
        # Extract year from month (YYYY-MM)
        try:
            year_val = int(payload.get("month", "").split("-")[0])
        except:
            year_val = datetime.now().year

        db.execute(text("""
            INSERT INTO payroll_history 
            (employee_id, month, year, basic_salary, hra, allowances, bonus, deductions, lop_deduction, tax_deduction, pf_deduction, esi_deduction, net_salary, status, payment_status, transaction_id, generated_at)
            VALUES (:eid, :m, :y, :bs, :hra, :al, :bn, :dd, :lop, :tax, :pf, :esi, :ns, :s, :ps, :tid, :ga)
        """), {
            "eid": payload.get("employee_id"),
            "m": payload.get("month"),
            "y": year_val,
            "bs": payload.get("base_salary"),
            "hra": payload.get("hra", 0),
            "al": payload.get("allowances", 0),
            "bn": payload.get("bonus", 0),
            "dd": payload.get("deductions", 0),
            "lop": payload.get("lop_deduction", 0),
            "tax": payload.get("tax_deduction", 0),
            "pf": payload.get("pf_deduction", 0),
            "esi": payload.get("esi_deduction", 0),
            "ns": payload.get("net_payable"),
            "s": "Approved",
            "ps": "Pending",
            "tid": transaction_id,
            "ga": datetime.now()
        })
        db.commit()
        return {"status": "success", "transaction_id": transaction_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payroll/disburse")
def disburse_salary(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    """
    Trigger Razorpay Payout for a payroll record.
    """
    from app.services.payment_service import payment_service
    from sqlalchemy import text
    
    payroll_id = payload.get("payroll_id")
    # Fetch payroll record
    row = db.execute(text("SELECT * FROM payroll_history WHERE id = :id"), {"id": payroll_id}).mappings().first()
    if not row:
         raise HTTPException(status_code=404, detail="Payroll record not found")
    
    if row["payment_status"] == "Success":
        return {"status": "already_paid", "transaction_id": row["transaction_id"]}

    # Create Razorpay Payout
    res = payment_service.create_payout(
        employee_id=row["employee_id"],
        amount=float(row["net_salary"]),
        notes={"payroll_id": payroll_id, "month": row["month"]}
    )
    
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
        
    # Update status in DB
    db.execute(text("""
        UPDATE payroll_history 
        SET payment_status = 'Processing', transaction_id = :tid 
        WHERE id = :id
    """), {"tid": res["id"], "id": payroll_id})
    db.commit()
    
    return {"status": "initiated", "transaction_id": res["id"]}

# --- HR Leave Finalization ---

@router.get("/leaves", response_model=List[LeaveOut])
def get_all_leaves(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return leave_service.get_leaves(db, employee_id=current_user.employee_id, user_role="hr")

@router.patch("/leaves/{leave_id}/status", response_model=LeaveOut)
async def hr_handle_leave_status(leave_id: str, status: str, rejection_reason: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    # Action map Status (Frontend) -> Service Action
    action = "approve" if status.lower() == "approved" else "reject"
    return await leave_service.approve_recommendation(db, leave_id, current_user.employee_id or f"USR-{current_user.id}", "hr", action, rejection_reason)

# --- HR Attendance Oversight ---

@router.get("/attendance/corrections", response_model=List[AttendanceCorrectionOut])
def get_hr_attendance_corrections(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager"]))):
    return attendance_service.get_all_corrections(db, skip, limit, user_role=current_user.role, user_id=current_user.id)

@router.get("/attendance/presence")
def get_attendance_presence(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager"]))):
    return attendance_service.get_active_presence(db, user_role=current_user.role, viewer_user_id=current_user.id)


@router.post("/attendance/checkin")
def hr_attendance_checkin(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Presence check-in; user may only record their own employee_id unless HR/manager/admin."""
    emp_id = payload.get("employee_id")
    if not emp_id:
        return {"status": "ignored"}
    role = (current_user.role or "").lower()
    if role not in ("hr", "manager", "admin", "it"):
        emp = employee_service.get_profile(db, current_user.id)
        if not emp or emp.employee_id != emp_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot record attendance for another employee")
    try:
        attendance_service.check_in(db, emp_id)
        return {"status": "success"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "detail": str(e)}

@router.post("/attendance/checkout")
def hr_attendance_checkout(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Record portal logout as attendance check-out."""
    emp_id = payload.get("employee_id")
    if not emp_id:
        return {"status": "ignored"}
    role = (current_user.role or "").lower()
    if role not in ("hr", "manager", "admin", "it"):
        emp = employee_service.get_profile(db, current_user.id)
        if not emp or emp.employee_id != emp_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot record attendance for another employee")
    try:
        attendance_service.check_out(db, emp_id)
        return {"status": "success"}
    except Exception as e:
        # Non-blocking: if no check-in exists for today, just skip
        print(f"[ATTENDANCE] Checkout skipped for {emp_id}: {e}")
        return {"status": "skipped", "detail": str(e)}

@router.get("/attendance", response_model=List[AttendanceOut])
def get_all_attendance(date: Optional[date] = None, skip: int = 0, limit: int = 2000, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager"]))):
    """HR: all attendance. Manager: scoped to their team."""
    return attendance_service.get_my_attendance(db, None, skip, limit, viewer_role=current_user.role, viewer_id=current_user.id, date_filter=date)

@router.patch("/attendance/corrections/{id}", response_model=AttendanceCorrectionOut)
def handle_attendance_correction(id: int, obj_in: AttendanceCorrectionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = attendance_service.approve_correction(db, id, obj_in.status, current_user.username, "hr", obj_in.rejection_reason)
    if not res:
        raise HTTPException(status_code=404, detail="Correction request not found")
    return res

# --- HR Onboarding Management ---
from app.schemas.hr_onboarding import HROnboardingOut, HROnboardingCreate, HROnboardingUpdate, HROnboardingApproveOut
from app.services.hr_onboarding_service import hr_onboarding_service

@router.get("/onboarding", response_model=List[HROnboardingOut])
def get_hr_onboarding_requests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return hr_onboarding_service.get_requests(db, skip, limit)

@router.post("/onboarding", response_model=HROnboardingOut)
def create_hr_onboarding_request(obj_in: HROnboardingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return hr_onboarding_service.create_request(db, obj_in)

@router.put("/onboarding/{request_id}", response_model=HROnboardingOut)
def update_hr_onboarding_request(request_id: str, obj_in: HROnboardingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = hr_onboarding_service.update_request(db, request_id, obj_in)
    if not res:
        raise HTTPException(status_code=404, detail="Onboarding request not found")
    return res

@router.post("/onboarding/{request_id}/approve", response_model=HROnboardingApproveOut)
async def approve_hr_onboarding_request(request_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = hr_onboarding_service.approve_request(db, request_id, current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Onboarding request not found")
    return res

# --- HR Leave Balance Management ---

@router.get("/leave-balance", response_model=List[LeaveBalanceOut])
def get_all_leave_balances(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return leave_balance_service.get_all(db, skip, limit)

@router.get("/leave-policies", response_model=List[LeavePolicyOut])
def get_all_leave_policies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "admin"]))):
    return leave_policy_service.get_all(db)

@router.put("/leave-policies", response_model=LeavePolicyOut)
def update_leave_policy(obj_in: LeavePolicyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "admin"]))):
    return leave_policy_service.update_policy(db, obj_in.leave_type, obj_in.total_days, obj_in.description)

@router.post("/leave-balance", response_model=LeaveBalanceOut)
def create_leave_balance(obj_in: LeaveBalanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return leave_balance_service.create(db, obj_in)

@router.put("/leave-balance/{id}", response_model=LeaveBalanceOut)
def update_leave_balance(id: int, obj_in: LeaveBalanceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return leave_balance_service.update(db, id, obj_in)

# --- HR Holidays ---

@router.get("/holidays", response_model=List[HolidayOut])
def get_holidays(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.holiday_service import holiday_service
    return holiday_service.get_all(db)

@router.post("/holidays", response_model=HolidayOut)
async def create_holiday(obj_in: HolidayCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    from app.services.holiday_service import holiday_service
    return await holiday_service.create(db, obj_in)

@router.delete("/holidays/{id}")
async def delete_holiday(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    from app.services.holiday_service import holiday_service
    if not await holiday_service.delete(db, id):
        raise HTTPException(status_code=404, detail="Holiday not found")
    return {"status": "success"}

# --- HR Shift Management ---

@router.get("/shifts", response_model=List[ShiftDefinitionOut])
def get_all_shifts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "recruiter", "it", "employee"]))):
    return shift_service.get_shifts(db, skip, limit)

@router.post("/shifts", response_model=ShiftDefinitionOut)
def create_shift_definition(obj_in: ShiftDefinitionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return shift_service.create_shift(db, obj_in)

@router.post("/shifts/{id}/assign", response_model=ShiftAssignmentOut)
def assign_shift_to_employee(id: int, employee_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    from app.repositories.employee_repo import employee_repo
    current_user_emp = employee_repo.get_by_user_id(db, current_user.id)
    obj_in = ShiftAssignmentCreate(employee_id=employee_id, shift_id=id, assigned_by=current_user.username)
    return shift_service.assign_shift(db, obj_in, current_user_role="hr", current_employee_id=current_user_emp.employee_id if current_user_emp else f"USR-{current_user.id}")

@router.delete("/shifts/{id}/assign/{employee_id}")
def unassign_shift_from_employee(id: int, employee_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    shift_service.unassign_shift(db, id, employee_id)
    return {"status": "success"}

@router.put("/shifts/{id}", response_model=ShiftDefinitionOut)
def update_shift_definition(id: int, obj_in: ShiftDefinitionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return shift_service.update_shift(db, id, obj_in)

@router.delete("/shifts/{id}")
def delete_shift(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    shift_service.delete_shift(db, id)
    return {"status": "success"}

@router.get("/dashboard")
def get_hr_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager"]))):
    from app.services.dashboard_service import dashboard_service
    return dashboard_service.get_hr_dashboard(db, current_user.id)

@router.get("/staff-timesheet", response_model=List[StaffTimesheetItem])
def get_hr_staff_timesheet(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return shift_service.get_staff_timesheet(db)

@router.get("/company-profile", response_model=Optional[CompanyProfileOut])
def get_company_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return company_service.get_profile(db)

@router.get("/reports")
def get_hr_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "manager"]))):
    from app.services.dashboard_service import dashboard_service
    return dashboard_service.get_hr_reports(db)

# --- HR Announcements ---
from app.schemas.notification import AnnouncementCreate, AnnouncementOut
@router.post("/announcements", response_model=AnnouncementOut)
async def create_hr_announcement(obj_in: AnnouncementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    from app.services.notification_service import announcement_service
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return await announcement_service.post_announcement(db, emp.employee_id if emp else "ADMIN", obj_in.title, obj_in.content, obj_in.target_audience)

@router.delete("/announcements/{id}")
def delete_hr_announcement(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    from app.services.notification_service import announcement_service
    if announcement_service.delete_announcement(db, id):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Announcement not found")

# --- HR Company Profile Management ---
from app.schemas.company_profile import CompanyProfileUpdate
@router.put("/company-profile", response_model=CompanyProfileOut)
async def update_company_profile(obj_in: CompanyProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return await company_service.create_or_update_profile(db, obj_in)

from app.services.document_service import document_service
from app.schemas.document import DocumentOut
from fastapi import UploadFile, File

@router.post("/upload", response_model=DocumentOut)
async def hr_upload_file(
    file: UploadFile = File(...), 
    module: str = Form("general"), 
    reference_id: str = Form(None), 
    candidate_name: str = Form(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user_with_role(["hr", "manager"]))
):
    return await document_service.upload_document(db, file, current_user.id, module=module, reference_id=reference_id, category="HR", candidate_name=candidate_name)

@router.get("/onboarding/{id}/documents", response_model=List[DocumentOut])
def get_onboarding_documents(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return document_service.get_module_documents(db, reference_id=id, module="onboarding")

# --- Recruitment Read-Only Access (Feature 23 & 24) ---

from app.schemas.job import InterviewOut, OfferOut
from app.services.job_service import recruitment_service

@router.get("/interviews", response_model=List[InterviewOut])
def get_hr_interviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    """HR gets a full view of all scheduled interviews."""
    return recruitment_service.get_interviews(db)
@router.get("/offers", response_model=List[OfferOut])
def get_hr_offers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    """HR gets a full view of all outstanding offers."""
    return recruitment_service.get_offers(db)

# --- HR Offboarding Oversight ---

@router.get("/offboarding", response_model=List[OffboardingOut])
def get_hr_offboarding_requests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return offboarding_service.get_multi(db, skip, limit)

@router.post("/offboarding", response_model=OffboardingOut)
def initiate_offboarding_by_hr(obj_in: OffboardingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    return offboarding_service.initiate_offboarding(db, obj_in)

@router.put("/offboarding/{offboard_id}", response_model=OffboardingOut)
async def update_offboarding_by_hr(offboard_id: str, obj_in: OffboardingUpdateByHR, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = await offboarding_service.hr_complete(db, offboard_id, obj_in, changed_by=current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Offboarding request not found")
    return res

@router.delete("/offboarding/{offboard_id}")
def delete_hr_offboarding_request(offboard_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("hr"))):
    res = offboarding_service.delete_request(db, offboard_id, changed_by=current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Offboarding request not found")
    return {"message": "Offboarding request deleted successfully"}
