from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_user_with_role
from app.models.user import User
from app.services.employee_service import employee_service
from app.services.attendance_service import attendance_service
from app.services.leave_service import leave_service
from app.schemas.employee import EmployeeOut
from app.schemas.attendance import AttendanceOut
from app.schemas.leave import LeaveOut, EarlyLoginRequestOut
from app.schemas.shift import ShiftSessionOut, ShiftDefinitionOut
from app.services.attendance_service import shift_service
from app.repositories.attendance_repo import attendance_repo
from app.repositories.employee_repo import employee_repo
from app.models.employee import Employee
from app.schemas.job import InterviewOut
from sqlalchemy import or_
from app.services.job_service import recruitment_service

router = APIRouter()

# --- Team Management ---

@router.get("/team", response_model=List[EmployeeOut])
@router.get("/members", response_model=List[EmployeeOut])
def get_team_members(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    from sqlalchemy import or_
    emp = employee_repo.get_by_user_id(db, current_user.id)
    if not emp:
        return []
    tl_id = (emp.employee_id or "").strip()
    u_id = str(current_user.id)
    db_id = str(emp.id)
    
    return db.query(Employee).filter(
        or_(
            Employee.team_leader_id == tl_id,
            Employee.team_leader_id == u_id,
            Employee.team_leader_id == db_id,
            Employee.reporting_to_id == tl_id,
            Employee.reporting_to_id == u_id,
            Employee.reporting_to_id == db_id,
            Employee.manager_id == tl_id,
            Employee.manager_id == u_id,
            Employee.manager_id == db_id,
            Employee.reporting_manager_id == tl_id,
            Employee.reporting_manager_id == u_id,
            Employee.reporting_manager_id == db_id
        ),
        Employee.deleted_at == None
    ).all()


# --- Team Attendance ---

@router.get("/timesheets", response_model=List[ShiftSessionOut])
@router.get("/attendance", response_model=List[ShiftSessionOut])
def get_team_attendance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    """Team Leader: View attendance for your team members only."""
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    if not emp:
        return []
    
    tl_id = (emp.employee_id or "").strip()
    # Also pass user ID for fallback if repo/service supports it or just use it to fetch more
    return shift_service.get_team_attendance(db, tl_id, user_id=str(current_user.id))


@router.get("/attendance/records", response_model=List[AttendanceOut])
def get_team_attendance_records(
    date: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 2000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role("teamleader"))
):
    """Team Leader: View historical attendance records for your team members."""
    return attendance_service.get_my_attendance(
        db,
        None,
        skip,
        limit,
        viewer_role="teamleader",
        viewer_id=current_user.id,
        date_filter=date,
        start_date=start_date,
        end_date=end_date
    )

# --- Leave Recommendations ---

@router.get("/leaves/pending", response_model=List[LeaveOut])
@router.get("/leaves", response_model=List[LeaveOut])
def get_team_leaves(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    if not emp:
        return []
    
    # Use central service for recursive visibility
    return leave_service.get_leaves(db, emp.employee_id, user_role="teamleader")

@router.post("/leaves/{leave_id}/recommend", response_model=LeaveOut)
async def recommend_leave(leave_id: str, action: str = "approve", rejection_reason: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")
        
    res = await leave_service.approve_recommendation(db, leave_id, emp.employee_id, "teamleader", action, rejection_reason)
    if not res:
        raise HTTPException(status_code=404, detail="Leave request not found")
        
    # Trigger E2E real-time notification to the Manager
    try:
        from app.services.notification_service import notification_service
        from app.models.user import User
        
        manager_emp_id = res.manager_id
        if manager_emp_id:
            manager_user = db.query(User).filter(User.employee_id == manager_emp_id).first()
            if manager_user:
                await notification_service.push_notification(
                    db,
                    user_id=manager_user.id,
                    employee_id=manager_emp_id,
                    title="Leave Recommendation Submitted",
                    message=f"TL {emp.name} recommended {res.leave_type} leave approval for {res.name}.",
                    category="Leave"
                )
    except Exception as e:
        print(f"[TL LEAVE RECOMMEND NOTIFICATION ERROR] {e}")
        
    return res

# --- Early Login Approvals ---

@router.get("/early-login/list", response_model=List[EarlyLoginRequestOut])
@router.get("/early-login", response_model=List[EarlyLoginRequestOut])
def get_team_early_login_requests_route(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    # Logic to filter by team
    from app.models.employee import Employee
    emp = employee_repo.get_by_user_id(db, current_user.id)
    if not emp or not emp.employee_id:
        print(f"[SECURITY] TeamLeader {current_user.email} has no Employee profile. Blocking early-login fetch.")
        return []
        
    tl_id = emp.employee_id
    u_id = str(current_user.id)
    db_id = str(emp.id)
    
    results = db.query(attendance_repo.early_login_model, Employee.first_name, Employee.last_name)\
        .join(Employee, attendance_repo.early_login_model.employee_id == Employee.employee_id)\
        .filter(
            or_(
                Employee.team_leader_id == tl_id,
                Employee.team_leader_id == u_id,
                Employee.team_leader_id == db_id,
                Employee.reporting_to_id == tl_id,
                Employee.reporting_to_id == u_id,
                Employee.reporting_to_id == db_id,
                Employee.manager_id == tl_id,
                Employee.manager_id == u_id,
                Employee.manager_id == db_id,
                Employee.reporting_manager_id == tl_id,
                Employee.reporting_manager_id == u_id,
                Employee.reporting_manager_id == db_id
            ),
            Employee.deleted_at == None
        )\
        .order_by(attendance_repo.early_login_model.date.desc()).all()
        
    out = []
    for req, fn, ln in results:
        # Use Pydantic's from_orm via the response_model or manually map
        r_dict = {
            "id": req.id,
            "employee_id": req.employee_id,
            "date": req.date,
            "requested_start_time": req.requested_start_time,
            "reason": req.reason,
            "status": req.status,
            "approved_by": req.approved_by,
            "employee_name": f"{fn} {ln or ''}".strip(),
            "created_at": req.created_at
        }
        out.append(r_dict)
    return out

@router.post("/early-login/approve/{request_id}")
@router.post("/early-login/{request_id}/approve")
def approve_early_login(request_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    status = payload.get("status", "approved")
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")
        
    res = attendance_service.approve_early_login(db, request_id, status, emp.employee_id, "teamleader")
    if not res:
        raise HTTPException(status_code=404, detail="Early login request not found")
    return res

@router.post("/attendance/corrections/{correction_id}/approve")
def approve_attendance_correction_tl(correction_id: int, status: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")
        
    res = attendance_service.approve_correction(db, correction_id, status, emp.employee_id, "teamleader")
    if not res:
        raise HTTPException(status_code=404, detail="Correction request not found")
    return res


@router.get("/members/{employee_id}/attendance", response_model=List[ShiftSessionOut])
def get_member_shift_history(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role("teamleader")),
):
    tl = employee_repo.get_by_user_id(db, current_user.id)
    if not tl:
        raise HTTPException(status_code=404, detail="Team leader profile not found")
    sub = employee_repo.get(db, employee_id)
    tl_id = (tl.employee_id or "").strip()
    is_subordinate = any([
        (sub.team_leader_id or "").strip() == tl_id,
        (sub.reporting_to_id or "").strip() == tl_id,
        (sub.manager_id or "").strip() == tl_id,
        (sub.reporting_manager_id or "").strip() == tl_id
    ])
    if not sub or not is_subordinate:
        raise HTTPException(status_code=403, detail="Employee is not in your team")
    return shift_service.get_attendance_history(db, employee_id)


@router.get("/members/{employee_id}/leaves", response_model=List[LeaveOut])
def get_member_leaves(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role("teamleader")),
):
    tl = employee_repo.get_by_user_id(db, current_user.id)
    if not tl:
        raise HTTPException(status_code=404, detail="Team leader profile not found")
    sub = employee_repo.get(db, employee_id)
    tl_id = (tl.employee_id or "").strip()
    is_subordinate = any([
        (sub.team_leader_id or "").strip() == tl_id,
        (sub.reporting_to_id or "").strip() == tl_id,
        (sub.manager_id or "").strip() == tl_id,
        (sub.reporting_manager_id or "").strip() == tl_id
    ])
    if not sub or not is_subordinate:
        raise HTTPException(status_code=403, detail="Employee is not in your team")
    return leave_service.get_leaves(db, employee_id)


@router.get("/interviews", response_model=List[InterviewOut])
def get_tl_interviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return recruitment_service.get_interviews(db, tl_id=emp.employee_id if emp else None)

from app.schemas.task import TaskOut, TaskCreate, TaskUpdate
from app.services.task_service import task_service
from app.schemas.performance import PerformanceReviewOut, PerformanceReviewCreate
from app.services.performance_service import performance_service

@router.get("/tasks", response_model=List[TaskOut])
def get_tl_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return task_service.get_tasks_created_by(db, emp.employee_id if emp else None)

@router.post("/tasks", response_model=TaskOut)
def create_team_task(obj_in: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    if not emp:
         raise HTTPException(status_code=404, detail="TL profile not found")
    return task_service.create_task(db, obj_in, emp.employee_id)

@router.put("/tasks/{task_id}", response_model=TaskOut)
def update_team_task(task_id: str, obj_in: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    res = task_service.update_task(db, task_id, obj_in)
    if not res:
        raise HTTPException(status_code=404, detail="Task not found")
    return res

@router.delete("/tasks/{task_id}")
def delete_team_task(task_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    if not task_service.delete_task(db, task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

# --- Performance Feedback ---

@router.get("/performance", response_model=List[PerformanceReviewOut])
def get_tl_performance_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return performance_service.get_reviews_submitted_by(db, emp.employee_id if emp else None)

@router.post("/performance", response_model=PerformanceReviewOut)
def submit_team_performance(obj_in: PerformanceReviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    from app.repositories.employee_repo import employee_repo
    tl = employee_repo.get_by_user_id(db, current_user.id)
    if not tl:
         raise HTTPException(status_code=404, detail="TL profile not found")
         
    # Security Check: Is the employee in this TL's team?
    target_emp = employee_repo.get(db, obj_in.employee_id)
    if not target_emp:
        raise HTTPException(status_code=404, detail="Target employee not found")
    
    tl_id = (tl.employee_id or "").strip()
    is_subordinate = any([
        (target_emp.team_leader_id or "").strip() == tl_id,
        (target_emp.reporting_to_id or "").strip() == tl_id,
        (target_emp.manager_id or "").strip() == tl_id,
        (target_emp.reporting_manager_id or "").strip() == tl_id
    ])

    if not is_subordinate:
        raise HTTPException(status_code=403, detail="You can only submit performance reviews for your team members.")

    # Enforce ownership: ignore client-supplied submitted_by_id
    obj_in.submitted_by_id = tl.employee_id
    obj_in.submitted_by_name = tl.name or current_user.full_name
    return performance_service.create_review(db, obj_in, tl.employee_id)

@router.get("/dashboard")
def get_tl_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    from app.services.dashboard_service import dashboard_service
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return dashboard_service.get_teamleader_dashboard(db, emp.employee_id if emp else None, current_user.id)

@router.get("/reports")
def get_tl_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    from app.services.dashboard_service import dashboard_service
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return dashboard_service.get_teamleader_reports(db, emp.employee_id if emp else None)

@router.patch("/interviews/{interview_id}/feedback", response_model=InterviewOut)
def submit_interview_feedback(
    interview_id: int,
    feedback: str,
    rating: Optional[float] = None,
    result: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role("teamleader"))
):
    """Team leader submits interview evaluation / scorecard."""
    from app.models.job import Interview
    from app.repositories.employee_repo import employee_repo
    
    tl = employee_repo.get_by_user_id(db, current_user.id)
    if not tl:
        raise HTTPException(status_code=404, detail="Team leader profile not found")

    # Security Check: Is this interview assigned to this TL?
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if (interview.interviewer_id or "").strip() != (tl.employee_id or "").strip():
        raise HTTPException(status_code=403, detail="You are not authorized to submit feedback for this interview.")

    res = recruitment_service.update_interview_feedback(db, interview_id, feedback, rating, "completed", result)
    return res

@router.get("/shifts", response_model=List[ShiftDefinitionOut])
def get_teamleader_shifts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("teamleader"))):
    """Team Leader: Get all shift definitions for reference."""
    return shift_service.get_shifts(db, skip, limit)
