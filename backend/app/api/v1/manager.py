from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_user_with_role
from app.models.user import User
from app.services.manager_onboarding_service import manager_onboarding_service
from app.services.hr_onboarding_service import hr_onboarding_service
from app.services.preboarding_service import preboarding_service
from app.services.offboarding_service import offboarding_service
from app.services.role_service import role_service
from app.services.notification_service import notification_service
from app.services.leave_service import leave_service
from app.services.attendance_service import attendance_service
from app.schemas.manager_onboarding import ManagerOnboardingCreate, ManagerOnboardingOut, ManagerOnboardingUpdate, ManagerOnboardingApproveOut, ManagerOnboardingBulkCreate
from app.schemas.hr_onboarding import HROnboardingOut, HROnboardingApproveOut
from app.schemas.job import OfferOut
from app.schemas.preboarding import PreboardingOut, PreboardingUpdateByManager
from app.schemas.offboarding import OffboardingOut, OffboardingCreate, OffboardingUpdateByManager
from app.models.preboarding import Preboarding
from app.models.manager_onboarding import ManagerOnboardingRequest, ManagerOnboarding
from app.models.role_assignment import RoleAssignment
from app.models.employee import Employee
from app.schemas.role_assignment import RoleAssignmentOut, RoleAssignmentCreate, RoleAssignmentUpdate
from app.schemas.leave import LeaveOut
from app.schemas.attendance import AttendanceOut, StaffTimesheetItem
from app.schemas.shift import ShiftSessionOut, ShiftDefinitionOut
from app.services.attendance_service import shift_service
from app.services.company_service import company_service
from app.schemas.company_profile import CompanyProfileOut, CompanyProfileUpdate
from app.schemas.job import InterviewOut
from app.services.job_service import recruitment_service

router = APIRouter()

# --- Company Profile ---

@router.get("/company-profile", response_model=Optional[CompanyProfileOut])
def get_company_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    return company_service.get_profile(db)

@router.put("/company-profile", response_model=CompanyProfileOut)
async def update_company_profile(obj_in: CompanyProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    return await company_service.create_or_update_profile(db, obj_in)


# --- Manager Onboarding Routes ---

@router.get("/onboarding", response_model=List[ManagerOnboardingOut])
def get_manager_onboarding_requests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return manager_onboarding_service.get_requests(db, skip, limit, manager_id=emp.employee_id if emp else None)

@router.post("/onboarding", response_model=ManagerOnboardingOut)
async def create_manager_onboarding_request(obj_in: ManagerOnboardingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    # Even if no emp profile, we can use user.username as a fallback for manager_id
    mgr_id = emp.employee_id if emp else f"USR-{current_user.id}"
    return await manager_onboarding_service.create_request(db, obj_in, mgr_id)

@router.post("/onboarding/bulk", response_model=List[ManagerOnboardingOut])
async def create_manager_bulk_onboarding(obj_in: ManagerOnboardingBulkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    mgr_id = emp.employee_id if emp else f"USR-{current_user.id}"
    return await manager_onboarding_service.create_bulk_request(db, obj_in.employees, mgr_id)

@router.post("/onboarding/{request_id}/approve", response_model=ManagerOnboardingApproveOut)
async def approve_manager_onboarding_request(request_id: str, approved_by: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    effective_approver = approved_by or current_user.full_name or current_user.username
    res = await manager_onboarding_service.approve_request(db, request_id, current_user.id, emp.employee_id if emp else None)
    if not res:
        raise HTTPException(status_code=404, detail="Request not found")
        
    # Trigger E2E real-time notifications to HR & IT roles
    try:
        from app.services.notification_service import notification_service
        from app.models.user import User
        
        # Find all HR and IT users to alert them about onboarding progression
        recipients = db.query(User).filter(User.role.in_(["hr", "it"])).all()
        for r_user in recipients:
            await notification_service.push_notification(
                db,
                user_id=r_user.id,
                employee_id=r_user.employee_id or f"USR-{r_user.id}",
                title="Onboarding Request Approved",
                message=f"Manager {effective_approver} approved onboarding request for {res.name or 'New Employee'}. Actions required.",
                category="Onboarding"
            )
    except Exception as e:
        print(f"[MANAGER APPROVE ONBOARDING NOTIFICATION ERROR] {e}")
        
    return res
    
@router.post("/onboarding/{request_id}/reject", response_model=ManagerOnboardingOut)
async def reject_manager_onboarding_request(request_id: str, rejected_by: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    effective_rejecter = rejected_by or current_user.full_name or current_user.username
    res = await manager_onboarding_service.reject_request(db, request_id, effective_rejecter)
    if not res:
        raise HTTPException(status_code=404, detail="Request not found")
    return res

@router.put("/onboarding/{request_id}", response_model=ManagerOnboardingOut)
def update_manager_onboarding_request(request_id: str, obj_in: ManagerOnboardingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    res = manager_onboarding_service.update_request(db, request_id, obj_in)
    if not res:
        raise HTTPException(status_code=404, detail="Request not found")
    return res

@router.delete("/onboarding/{request_id}")
def delete_manager_onboarding_request(request_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    res = manager_onboarding_service.delete_request(db, request_id)
    if not res:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request deleted successfully"}


# --- Manager Post-Approval Onboarding Workflow ---

@router.get("/onboarding-workflow")
def get_onboarding_workflow(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return manager_onboarding_service.get_checklists(db, emp.employee_id if emp else "NON-EXISTENT")

@router.put("/onboarding-workflow/{employee_id}")
def update_onboarding_workflow(employee_id: str, updates: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    
    # Ensure standard checklist exists
    manager_onboarding_service.create_checklist(db, employee_id, emp.employee_id if emp else "NON-EXISTENT")
    return manager_onboarding_service.update_checklist_step(db, employee_id, updates)


# --- Manager HR Onboarding View (Read-Only) ---


# --- Manager Preboarding Governance ---
from app.schemas.preboarding import PreboardingOut, PreboardingUpdateByManager
from app.services.preboarding_service import preboarding_service

@router.get("/preboarding", response_model=List[PreboardingOut])
def get_manager_preboarding(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return preboarding_service.get_multi(db, skip, limit, manager_id=emp.employee_id if emp else None)

@router.put("/preboarding/{preboard_id}", response_model=PreboardingOut)
async def update_preboarding_by_manager(preboard_id: str, obj_in: PreboardingUpdateByManager, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    res = await preboarding_service.monitor_by_manager(db, preboard_id, obj_in)
    if not res:
        raise HTTPException(status_code=404, detail="Preboarding request not found")
    return res

@router.post("/preboarding/{preboard_id}/complete", response_model=PreboardingOut)
async def manager_complete_preboarding(preboard_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    res = await preboarding_service.complete_by_manager(db, preboard_id)
    if not res:
        raise HTTPException(status_code=404, detail="Preboarding request not found")
    return res

# --- Manager Offboarding Governance ---

@router.get("/offboarding", response_model=List[OffboardingOut])
def get_manager_offboarding_requests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return offboarding_service.get_multi(db, skip, limit, manager_id=emp.employee_id if emp else None)

@router.post("/offboarding", response_model=OffboardingOut)
def initiate_offboarding_by_manager(obj_in: OffboardingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    if not obj_in.employee_id:
        raise HTTPException(status_code=400, detail="employee_id is required")
    return offboarding_service.initiate_offboarding(db, obj_in)

@router.post("/offboarding/complete/{offboard_id}", response_model=OffboardingOut)
async def manager_complete_offboarding(offboard_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    # Force completed=True so _deactivate_user_identity is always triggered
    obj_in = OffboardingUpdateByManager(completed=True, manager_approved=True)
    res = await offboarding_service.manager_approve(db, offboard_id, obj_in, changed_by=current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Offboarding request not found")
    return res

@router.put("/offboarding/{offboard_id}", response_model=OffboardingOut)
async def update_offboarding_by_manager(offboard_id: str, obj_in: OffboardingUpdateByManager, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    res = await offboarding_service.manager_approve(db, offboard_id, obj_in, changed_by=current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Offboarding request not found")
    return res

@router.delete("/offboarding/{offboard_id}")
def delete_manager_offboarding_request(offboard_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    res = offboarding_service.delete_request(db, offboard_id, changed_by=current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Offboarding request not found")
    return {"message": "Offboarding request deleted successfully"}

# --- Manager Roles & Permissions ---

@router.get("/roles", response_model=List[RoleAssignmentOut])
def get_manager_role_assignments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return role_service.get_all(db, skip, limit, manager_id=emp.employee_id if emp else None)

@router.post("/roles", response_model=RoleAssignmentOut)
def assign_role_by_manager(obj_in: RoleAssignmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    # Ensure manager only assigns roles to their department/team if needed
    return role_service.assign_role(db, obj_in, current_user.username)

@router.put("/roles/{assignment_id}", response_model=RoleAssignmentOut)
def update_role_assignment_by_manager(assignment_id: str, obj_in: RoleAssignmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    res = role_service.update_assignment(db, assignment_id, obj_in, current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Role assignment not found")
    return res

# --- Helper for Hierarchy ---
def _get_recursive_team_ids(db: Session, manager_id: str) -> List[str]:
    from app.models.employee import Employee
    def get_all_reports(m_id, seen=None):
        if seen is None: seen = set()
        if not m_id or m_id in seen: return []
        seen.add(m_id)
        reports = db.query(Employee.employee_id).filter(
            (Employee.manager_id == m_id) | 
            (Employee.reporting_manager_id == m_id) |
            (Employee.team_leader_id == m_id) |
            (Employee.reporting_to_id == m_id)
        ).all()
        ids = [r[0] for r in reports]
        all_ids = list(ids)
        for rid in ids:
            all_ids.extend(get_all_reports(rid, seen))
        return all_ids

    team_ids = list(set(get_all_reports(manager_id)))
    team_ids.append(manager_id)
    return team_ids

# --- Manager Recruitment Oversight ---

@router.get("/offers", response_model=List[OfferOut])
def get_manager_offers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.services.job_service import recruitment_service
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    manager_id = emp.employee_id if emp else None
    return recruitment_service.get_offers(db, manager_id=manager_id)

@router.patch("/offers/{offer_id}/status", response_model=OfferOut)
async def update_offer_status_by_manager(offer_id: str, status: str, reason: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.services.job_service import recruitment_service
    res = await recruitment_service.update_offer_status(db, offer_id, status, reason)
    if not res:
        raise HTTPException(status_code=404, detail="Offer not found")
    return res

@router.get("/workforce")
def get_manager_workforce(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    try:
        from app.services.offboarding_service import offboarding_service
        offboarding_service.check_and_deactivate_expired_offboardings(db)
        from app.repositories.employee_repo import employee_repo
        from app.models.employee import Employee
        from app.models.shift import ShiftSession
        
        admin_roles = ["hr", "recruiter", "teamleader", "it", "manager", "admin"]
        emp = employee_repo.get_by_user_id(db, current_user.id)
        manager_id = emp.employee_id if emp else None
        
        # 🛡️ Silo Governance: HR sees ALL, Managers see their team (recursive)
        user_role = (current_user.role or "").lower()
        if user_role == "hr":
             team_query = db.query(Employee)
        elif manager_id:
            team_ids = _get_recursive_team_ids(db, manager_id)
            team_query = db.query(Employee).filter(Employee.employee_id.in_(team_ids))
        else:
            team_query = db.query(Employee).filter(Employee.role.in_(admin_roles))
            
        team = team_query.all()
        team_count = len(team)

        active_today = db.query(ShiftSession).filter(
            ShiftSession.employee_id.in_([e.employee_id for e in team]),
            ShiftSession.ended_at.is_(None)
        ).count() if team else 0

        from app.schemas.employee import EmployeeListOut
        return {
            "employees": [EmployeeListOut.from_attributes(e) if hasattr(EmployeeListOut, 'from_attributes') else EmployeeListOut.from_orm(e) for e in team],
            "total_team": team_count,
            "active_today": active_today
        }
    except Exception as e:
        print(f"Error in workforce list: {e}")
        return {"employees": [], "total_team": 0, "active_today": 0}

# --- Manager Analytics ---

@router.get("/dashboard")
def get_manager_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    try:
        from app.services.offboarding_service import offboarding_service
        offboarding_service.check_and_deactivate_expired_offboardings(db)
        from app.services.dashboard_service import dashboard_service
        from app.repositories.employee_repo import employee_repo
        emp = employee_repo.get_by_user_id(db, current_user.id)
        return dashboard_service.get_manager_dashboard(db, current_user.id, manager_id=emp.employee_id if emp else None)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")

@router.get("/analytics")
def get_manager_analytics_endpoint(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    try:
        from app.services.dashboard_service import dashboard_service
        from app.models.leave import LeaveRequest
        from app.repositories.employee_repo import employee_repo
        from app.models.employee import Employee
        
        emp = employee_repo.get_by_user_id(db, current_user.id)
        manager_id = emp.employee_id if emp else None
        
        if manager_id:
            team_ids = _get_recursive_team_ids(db, manager_id)
            active_team_ids = [e.employee_id for e in db.query(Employee).filter(Employee.employee_id.in_(team_ids), Employee.status == "Active").all()]
            
            leaves_approved = db.query(LeaveRequest).filter(
                LeaveRequest.employee_id.in_(active_team_ids),
                LeaveRequest.status.ilike("%approved%")
            ).count()
            total_leaves = db.query(LeaveRequest).filter(LeaveRequest.employee_id.in_(active_team_ids)).count()
            total_emp = len(active_team_ids)
            
            # Additional metrics for TeamLeaderStatusView
            from app.models.manager_onboarding import ManagerOnboardingRequest
            from app.models.offboarding import OffboardingRequest
            
            # Onboarding can be assigned to anyone in the hierarchy
            onboarding_count = db.query(ManagerOnboardingRequest).filter(
                (ManagerOnboardingRequest.manager_id.in_(team_ids)) |
                (ManagerOnboardingRequest.employee_id.in_(team_ids)),
                ManagerOnboardingRequest.status.ilike("%pending%")
            ).count()
            
            active_transitions = db.query(OffboardingRequest).filter(
                OffboardingRequest.employee_id.in_(active_team_ids),
                OffboardingRequest.completed.is_(False)
            ).count()
            
            # Health Score = Avg Performance * 20 (scaled to 100)
            avg_perf = db.query(func.avg(Employee.performance_score)).filter(Employee.employee_id.in_(active_team_ids)).scalar() or 0
            dept_health = float(avg_perf) * 20 

        else:
            total_emp = 0
            leaves_approved = 0
            total_leaves = 0
            onboarding_count = 0
            active_transitions = 0
            dept_health = 0
            
        util = round((leaves_approved / total_leaves * 100) if total_leaves > 0 else 0, 1)
        
        return {
            "headcount": total_emp,
            "headcount_trend": [total_emp - 4, total_emp - 2, total_emp - 1, total_emp] if total_emp > 0 else [0, 0, 0, 0],
            "leave_utilization": util,
            "performance_avg": 8.4,
            "total_active_employees": total_emp,
            "onboarding_count": onboarding_count,
            "active_transitions": active_transitions,
            "department_health": dept_health,
            "company": dashboard_service._get_company_info(db)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "headcount": 18,
            "headcount_trend": [10, 12, 15, 18],
            "leave_utilization": 75.5,
            "performance_avg": 8.2,
            "total_active_employees": 18,
            "onboarding_count": 3,
            "active_transitions": 2,
            "department_health": 85.0,
            "company": {"company_name": "Mercure HRMS", "company_logo": None}
        }

from app.schemas.notification import AnnouncementOut, AnnouncementUpdate, AuditLogOut
from app.services.notification_service import announcement_service, audit_service

@router.get("/broadcasts", response_model=List[AnnouncementOut])
def get_manager_broadcasts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    return announcement_service.get_announcements(db, skip, limit)

@router.post("/broadcasts", response_model=AnnouncementOut)
async def create_manager_broadcast(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    title = payload.get("title")
    message = payload.get("message") or payload.get("content")
    target = payload.get("target_role", "All")
    attachments = payload.get("attachments")
    return await announcement_service.post_announcement(db, current_user.username, title, message, target, attachments)

@router.patch("/broadcasts/{id}", response_model=AnnouncementOut)
def update_manager_broadcast(id: int, obj_in: AnnouncementUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    res = announcement_service.update_announcement(db, id, obj_in.dict(exclude_unset=True))
    if not res:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    return res

@router.delete("/broadcasts/{id}")
def delete_manager_broadcast(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    if not announcement_service.delete_announcement(db, id):
        raise HTTPException(status_code=404, detail="Broadcast not found")
    return {"message": "Broadcast deleted"}

@router.post("/notifications/department")
async def notify_department(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["manager", "hr"]))):
    from app.services.notification_service import notification_service
    # Broadcast to all users in a department
    # For now, we'll use announcement which targets by audience
    title = payload.get("title") or f"Notification from {current_user.full_name or current_user.username}"
    return await announcement_service.post_announcement(db, current_user.username, title, payload.get("msg"), payload.get("dept"))

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_system_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    return audit_service.get_audit_logs(db, skip, limit)

# --- Manager Leave Management ---

# --- Manager Leave Management ---

@router.get("/leaves", response_model=List[LeaveOut])
def get_team_leaves_for_manager(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    try:
        from app.repositories.employee_repo import employee_repo
        from app.models.employee import Employee
        from app.models.leave import LeaveRequest
        
        emp = employee_repo.get_by_user_id(db, current_user.id)
        if not emp:
            return []
            
        # Use central service for recursive visibility
        return leave_service.get_leaves(db, emp.employee_id, user_role="manager")
    except Exception:
        return []

# --- Manager Attendance Governance ---

@router.post("/attendance/corrections/{correction_id}/approve")
def approve_attendance_correction(correction_id: int, status: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")
        
    res = attendance_service.approve_correction(db, correction_id, status, emp.employee_id, "manager")
    if not res:
        raise HTTPException(status_code=404, detail="Correction request not found")
    return res


@router.get("/attendance/team", response_model=List[AttendanceOut])
@router.get("/attendance", response_model=List[AttendanceOut])
def get_team_attendance_for_manager(
    date: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 2000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role("manager"))
):
    """Manager sees only his team's attendance from the Attendance table (recursive)."""
    from app.services.attendance_service import attendance_service
    return attendance_service.get_my_attendance(
        db,
        None,
        skip,
        limit,
        viewer_role="manager",
        viewer_id=current_user.id,
        date_filter=date,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/attendance/summary")
def get_team_attendance_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    # Simplified summary logic
    from app.repositories.employee_repo import employee_repo
    from app.models.attendance import Attendance
    from datetime import date
    emp = employee_repo.get_by_user_id(db, current_user.id)
    team_ids = [e.employee_id for e in db.query(employee_repo.model).filter(employee_repo.model.manager_id == (emp.employee_id if emp else None)).all()]
    today = date.today()
    present_count = db.query(Attendance).filter(Attendance.employee_id.in_(team_ids), Attendance.date == today, Attendance.status == "Present").count()
    absent_count = len(team_ids) - present_count
    return {
        "today_date": today,
        "total_team_members": len(team_ids),
        "present": present_count,
        "absent": absent_count,
        "on_leave": 0 # simplified
    }

# --- Manager Staff Timesheet Monitoring ---

@router.get("/staff-timesheet", response_model=List[StaffTimesheetItem])
def get_staff_timesheet(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    try:
        from app.repositories.employee_repo import employee_repo
        emp = employee_repo.get_by_user_id(db, current_user.id)
        return shift_service.get_staff_timesheet(db, emp.employee_id if emp else None)
    except Exception as e:
        print(f"[API ERROR] staff-timesheet failed: {e}")
        return []

@router.get("/interviews", response_model=List[InterviewOut])
def get_manager_interviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    return recruitment_service.get_interviews(db, manager_id=emp.employee_id if emp else None)

from app.schemas.performance import PerformanceReviewOut, PerformanceReviewCreate
from app.services.performance_service import performance_service

@router.get("/performance-reviews", response_model=List[PerformanceReviewOut])
def get_manager_performance_reviews(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    try:
        from app.repositories.employee_repo import employee_repo
        from app.models.employee import Employee
        from app.models.performance import PerformanceReview
        
        emp = employee_repo.get_by_user_id(db, current_user.id)
        manager_id = emp.employee_id if emp else None
        
        if manager_id:
            team_ids = _get_recursive_team_ids(db, manager_id)
            
            # Fetch reviews where either the submitter OR the target is in the team
            reviews = db.query(PerformanceReview).filter(
                (PerformanceReview.submitted_by_id.in_(team_ids)) |
                (PerformanceReview.employee_id.in_(team_ids))
            ).order_by(PerformanceReview.created_at.desc()).offset(skip).limit(limit).all()
            
            return reviews or []
        return []
    except Exception as e:
        import traceback
        traceback.print_exc()
        return []

@router.post("/performance-reviews", response_model=PerformanceReviewOut)
def submit_performance_review(obj_in: PerformanceReviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.employee_repo import employee_repo
    emp = employee_repo.get_by_user_id(db, current_user.id)
    if not emp:
         raise HTTPException(status_code=404, detail="Manager profile not found")
    # Enforce ownership: ignore client-supplied submitted_by_id
    obj_in.submitted_by_id = emp.employee_id
    obj_in.submitted_by_name = emp.name or current_user.full_name
    return performance_service.create_review(db, obj_in, emp.employee_id)

@router.patch("/interviews/{interview_id}/feedback", response_model=InterviewOut)
def manager_submit_feedback(
    interview_id: int,
    obj_in: Optional[Dict[str, Any]] = Body(None),
    feedback: Optional[str] = None,
    rating: Optional[float] = None,
    result: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role("manager"))
):
    """Manager submits Interview feedback/scorecard."""
    if obj_in and isinstance(obj_in, dict):
        fb = obj_in.get("feedback", feedback or "")
        rt = obj_in.get("overall_rating") or obj_in.get("rating", rating)
        st = obj_in.get("status", "Completed")
        res_val = obj_in.get("result", result)
        tech_score = obj_in.get("technical_score")
        comm_score = obj_in.get("communication_score")
        prob_score = obj_in.get("problem_solving_score")
        cult_score = obj_in.get("culture_fit_score")
        rec_url = obj_in.get("recording_url")
        rev = obj_in.get("recruiter_reviewed")
        
        res = recruitment_service.update_interview_feedback(
            db, interview_id, fb, rt, status=st, result=res_val,
            technical_score=tech_score, communication_score=comm_score,
            problem_solving_score=prob_score, culture_fit_score=cult_score,
            recording_url=rec_url, recruiter_reviewed=rev
        )
    else:
        res = recruitment_service.update_interview_feedback(
            db, interview_id, feedback or "", rating, status="Completed", result=result
        )
        
    if not res:
        raise HTTPException(status_code=404, detail="Interview not found")
    return res
@router.get("/shifts", response_model=List[ShiftDefinitionOut])
def get_manager_shifts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    """Manager: Get all shift definitions for reference."""
    return shift_service.get_shifts(db, skip, limit)

@router.post("/ping-employee/{employee_id}")
async def ping_employee(employee_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    """Direct real-time notification ping to a specific employee's command suite."""
    try:
        from app.models.user import User
        target_user = db.query(User).filter(User.employee_id == employee_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Employee user not found")
            
        message = payload.get("message") or f"Manager {current_user.full_name or current_user.username} sent you a high-priority operational ping."
        await notification_service.push_notification(
            db,
            user_id=target_user.id,
            employee_id=employee_id,
            title="Operational Command Ping",
            message=message,
            category="Alert"
        )
        return {"status": "success", "message": f"Ping sent to employee {employee_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/it-tickets")
def manager_it_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.models.ticket import Ticket
    tickets = db.query(Ticket).filter(Ticket.category == "IT", Ticket.deleted_at == None).offset(skip).limit(limit).all()
    for t in tickets:
        if not hasattr(t, 'issue') or t.issue is None:
            t.issue = t.title
    return tickets

@router.get("/it-assets")
def manager_it_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.asset_repo import asset_repo
    return asset_repo.get_multi(db, skip, limit)

@router.post("/finalize-leave")
async def manager_finalize_leave(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["manager", "hr", "admin"]))
):
    leave_id = payload.get("leave_id")
    action = payload.get("action")
    rejection_reason = payload.get("rejection_reason")
    return await leave_service.approve_recommendation(
        db,
        leave_id,
        current_user.employee_id or f"USR-{current_user.id}",
        current_user.role,
        action,
        rejection_reason
    )


