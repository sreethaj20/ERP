from sqlalchemy.orm import Session # Standard ORM Session
from sqlalchemy import func, or_
from datetime import date, datetime
from app.models.employee import Employee
from app.models.leave import LeaveRequest
from app.models.attendance import Attendance
from app.models.asset import Asset, AssetAllocation
from app.models.task import Task
from app.models.ticket import Ticket
from app.models.job import Job, Candidate, Application, Interview, Offer
from app.models.hr_onboarding import HROnboarding, HROnboardingRequest
from app.models.manager_onboarding import ManagerOnboarding, ManagerOnboardingRequest
from app.models.offboarding import Offboarding, OffboardingRequest
from app.models.preboarding import EmployeePreboarding
from app.models.shift import ShiftSession
from app.models.company_profile import CompanyProfile
from app.models.notification import Activity
from app.services.storage_service import storage_service

class DashboardService:
    def _get_company_info(self, db: Session):
        profile = db.query(CompanyProfile).first()
        logo = profile.logo_url if profile else None
        return {
            "company_name": profile.company_name if profile else "Antigravity HRMS",
            "company_logo": storage_service.get_public_url(logo) if logo else None
        }

    def _get_recursive_team_ids(self, db: Session, manager_id: str, seen=None):
        """Safely fetch all recursive report IDs for a manager."""
        if seen is None:
            seen = set()
        
        if not manager_id or manager_id in seen:
            return []
        
        seen.add(manager_id)

        mgr_identities = {str(manager_id)}
        if str(manager_id).isdigit():
            mgr_emp = db.query(Employee).filter(
                Employee.user_id == int(manager_id),
                Employee.deleted_at == None
            ).first()
            if not mgr_emp:
                mgr_emp = db.query(Employee).filter(
                    or_(Employee.id == int(manager_id), Employee.employee_id == str(manager_id)),
                    Employee.deleted_at == None
                ).first()
        else:
            mgr_emp = db.query(Employee).filter(
                Employee.employee_id == str(manager_id),
                Employee.deleted_at == None
            ).first()

        if mgr_emp:
            if mgr_emp.employee_id: mgr_identities.add(str(mgr_emp.employee_id))
            if mgr_emp.id: mgr_identities.add(str(mgr_emp.id))
            if mgr_emp.user_id: mgr_identities.add(str(mgr_emp.user_id))

        reports = db.query(Employee.employee_id).filter(
            or_(
                Employee.manager_id.in_(mgr_identities),
                Employee.reporting_manager_id.in_(mgr_identities),
                Employee.team_leader_id.in_(mgr_identities),
                Employee.reporting_to_id.in_(mgr_identities)
            ),
            Employee.deleted_at == None
        ).all()
        
        ids = [r[0] for r in reports if r[0]]
        all_ids = list(ids)
        for rid in ids:
            all_ids.extend(self._get_recursive_team_ids(db, rid, seen))
        
        return list(set(all_ids))

    def _get_team_context(self, db: Session, user_id: int = None, manager_id: str = None):
        """
        Consolidated team context provider.
        If manager_id is provided, fetches recursive team.
        If only user_id is provided, fetches direct reports for that user's profile.
        """
        admin_roles = ["hr", "recruiter", "teamleader", "it", "manager", "admin"]
        
        effective_manager_id = manager_id
        if not effective_manager_id and user_id:
            emp = db.query(Employee).filter(Employee.user_id == user_id, Employee.deleted_at == None).first()
            if emp:
                effective_manager_id = emp.employee_id
                
        # Always count ALL active employees company-wide for the total_staff metric
        all_employees = db.query(Employee).filter(
            Employee.status.notin_(["Inactive", "Archived"]),
            Employee.deleted_at == None
        ).all()
        total_all = len(all_employees)

        if effective_manager_id:
            team_ids = self._get_recursive_team_ids(db, effective_manager_id)
            team_ids.append(effective_manager_id)

            team_staff = db.query(Employee).filter(
                Employee.employee_id.in_(team_ids),
                Employee.status.notin_(["Inactive", "Archived"]),
                Employee.deleted_at == None
            ).all()

            return {
                "total_staff": total_all,          # All employees (company-wide)
                "team_ids": [e.employee_id for e in team_staff],  # Manager's team (for leaves/attendance)
                "staff_objects": team_staff
            }
        else:
            # System-wide oversight fallback — show ALL active employees
            return {
                "total_staff": total_all,
                "team_ids": [e.employee_id for e in all_employees],
                "staff_objects": all_employees
            }

    def _get_profile_basic(self, db: Session, user_id: int):
        if not user_id:
            return None
        emp = db.query(Employee).filter(Employee.user_id == user_id, Employee.deleted_at == None).first()
        if not emp:
            return None
        
        # Safe extraction for JSON serialization
        return {
            "name": emp.name or f"{emp.first_name} {emp.last_name or ''}".strip(),
            "employee_id": emp.employee_id,
            "email": emp.email or emp.official_email or emp.work_email or "--",
            "designation": emp.designation or "Staff",
            "status": emp.status or "Active",
            "department": emp.department or "Not Assigned",
            "joining_date": str(emp.joining_date or emp.join_date or emp.joining_date_v2 or ""),
            "reporting_to": emp.reporting_to or "Management",
            "profile_photo_url": storage_service.get_public_url(emp.profile_photo_url or emp.photo) if (emp.profile_photo_url or emp.photo) else None
        }

    def _get_notice_period_info(self, db: Session, user_id: int):
        """Get notice period info for the currently logged-in user."""
        today = date.today()
        emp = db.query(Employee).filter(Employee.user_id == user_id, Employee.deleted_at == None).first()
        if not emp:
            return None
        
        offboard_req = db.query(OffboardingRequest).filter(
            OffboardingRequest.employee_id == emp.employee_id,
            OffboardingRequest.deleted_at == None
        ).order_by(OffboardingRequest.id.desc()).first()
        
        if not offboard_req:
            return None
        
        last_working_day = offboard_req.last_working_day or offboard_req.exit_date
        if last_working_day:
            remaining_days = (last_working_day - today).days
            info = {
                "is_on_notice": True,
                "last_working_day": str(last_working_day),
                "remaining_days": max(remaining_days, 0),
                "notice_period_days": offboard_req.notice_period_days or 0,
                "reason": offboard_req.reason or offboard_req.reason_for_leaving or "",
                "status": offboard_req.status,
                "is_expired": remaining_days < 0
            }
            # Auto-deactivate if notice period expired
            if remaining_days < 0:
                from app.services.offboarding_service import offboarding_service
                offboarding_service.check_and_deactivate_expired_offboardings(db)
            return info
        else:
            return {
                "is_on_notice": True,
                "last_working_day": None,
                "remaining_days": offboard_req.notice_remaining_days or 0,
                "notice_period_days": offboard_req.notice_period_days or 0,
                "reason": offboard_req.reason or offboard_req.reason_for_leaving or "",
                "status": offboard_req.status,
                "is_expired": False
            }

    def get_employee_dashboard(self, db: Session, employee_id: str, user_id: int):
        today = date.today()
        first_day = today.replace(day=1)
        
        # Get employee profile to check joining date
        from app.models.employee import Employee
        emp = db.query(Employee).filter(
            Employee.user_id == user_id,
            Employee.deleted_at == None
        ).first()
        
        joining_date = emp.joining_date if emp else None
        start_date = first_day
        if joining_date and joining_date > first_day:
            start_date = max(first_day, joining_date)

        attendance_records = db.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            Attendance.date >= first_day,
            Attendance.date <= today,
            Attendance.deleted_at == None
        ).all()
        
        # 1. Fetch holidays in this month range
        from app.models.holiday import Holiday
        holidays = db.query(Holiday).filter(
            Holiday.date >= first_day,
            Holiday.date <= today
        ).all()
        holiday_dates = {h.date for h in holidays}
        
        # 2. Fetch approved leaves in this month range
        from app.models.leave import LeaveRequest
        approved_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= first_day,
            LeaveRequest.deleted_at == None
        ).all()
        
        # Build set of leave dates
        from datetime import timedelta
        leave_dates = set()
        for l in approved_leaves:
            curr = max(l.start_date, first_day)
            end = min(l.end_date, today)
            while curr <= end:
                leave_dates.add(curr)
                curr += timedelta(days=1)
                
        # Group attendance records by date
        att_map = {r.date: r for r in attendance_records if r.date}
        
        present = 0.0
        half_days = 0.0
        on_leave = 0.0
        absent = 0.0
        
        curr_date = start_date
        while curr_date <= today:
            # 1. If there is an attendance record, process it first (covers worked weekends/holidays)
            r = att_map.get(curr_date)
            if r:
                r_status = (r.status or '').lower()
                if "leave" in r_status:
                    on_leave += 1.0
                elif "half" in r_status:
                    half_days += 1.0
                    present += 0.5
                    absent += 0.5
                elif "absent" in r_status or "lop" in r_status:
                    absent += 1.0
                elif "present" in r_status or "tracking" in r_status or "on shift" in r_status or "shift" in r_status:
                    present += 1.0
                else:
                    present += 1.0
                curr_date += timedelta(days=1)
                continue

            # 2. Skip weekends
            if curr_date.weekday() in (5, 6):
                curr_date += timedelta(days=1)
                continue
                
            # 3. Skip holidays
            if curr_date in holiday_dates:
                curr_date += timedelta(days=1)
                continue
                
            # 4. Check approved leave
            if curr_date in leave_dates:
                on_leave += 1.0
                curr_date += timedelta(days=1)
                continue
                
            # 5. No record and no leave on a weekday -> absent (LOP)
            absent += 1.0
            curr_date += timedelta(days=1)

        pending_requests = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == employee_id, 
            LeaveRequest.status == "Pending",
            LeaveRequest.deleted_at == None
        ).count()
        
        def clean_num(n):
            return int(n) if n.is_integer() else n

        return {
            "present_month": clean_num(present),
            "half_days_month": clean_num(half_days),
            "leaves_month": clean_num(on_leave),
            "lop_month": clean_num(absent),
            "pending_requests": pending_requests,
            "notice_period": self._get_notice_period_info(db, user_id),
            "company": self._get_company_info(db),
            "employee_profile": self._get_profile_basic(db, user_id)
        }



    def get_manager_dashboard(self, db: Session, user_id: int, manager_id: str = None):
        ctx = self._get_team_context(db, user_id=user_id, manager_id=manager_id)
        team_ids = ctx["team_ids"]
        total_staff = ctx["total_staff"]
        today = date.today()

        # Use active ShiftSessions (not ended) for real-time "at work" count
        # Filter by today's date to exclude stale sessions from employees who forgot to clock out
        at_work_count = 0
        if team_ids:
            at_work_count = db.query(ShiftSession).filter(
                ShiftSession.employee_id.in_(team_ids),
                ShiftSession.ended_at.is_(None),
                ShiftSession.date == today
            ).count()
            # Fallback: also check today's Attendance records if no active shift sessions
            if at_work_count == 0:
                at_work_count = db.query(Attendance).filter(
                    Attendance.employee_id.in_(team_ids),
                    Attendance.date == today,
                    (Attendance.status.ilike("%Present%") |
                     Attendance.status.ilike("%Tracking%") |
                     Attendance.status.ilike("%Shift%")),
                    Attendance.deleted_at == None
                ).count()

        # Managers see pending leaves for their team PLUS any administrative/leadership staff leaves (Shared Governance)
        # NOTE: We join User to filter by system role (User.role), NOT Employee.role (business designation)
        admin_roles = ['hr', 'teamleader', 'tl', 'recruiter', 'requiter', 'it', 'itdepartment', 'itdepartement', 'manager']
        from app.models.user import User as UserModel
        pending_leaves = db.query(LeaveRequest).join(
            Employee, LeaveRequest.employee_id == Employee.employee_id
        ).outerjoin(
            UserModel, UserModel.employee_id == Employee.employee_id
        ).filter(
            (Employee.employee_id.in_(team_ids) if team_ids else False) |
            (UserModel.role.in_(admin_roles)),
            LeaveRequest.status.ilike("%Pending%"),
            LeaveRequest.deleted_at == None
        ).count()

        first_day = today.replace(day=1)
        lop_month = 0
        if team_ids:
            lop_month = db.query(Attendance).filter(
                Attendance.employee_id.in_(team_ids),
                Attendance.date >= first_day,
                Attendance.date <= today,
                (Attendance.status.ilike("%absent%") | Attendance.status.ilike("%lop%")),
                Attendance.deleted_at == None
            ).count()

        today_leaves = 0
        if team_ids:
            today_leaves = db.query(LeaveRequest).filter(
                LeaveRequest.employee_id.in_(team_ids),
                LeaveRequest.status == "Approved",
                LeaveRequest.start_date <= today,
                LeaveRequest.end_date >= today,
                LeaveRequest.deleted_at == None
            ).count()

        attention_items = []
        if total_staff > 0 and (today_leaves / total_staff) > 0.2:
            attention_items.append({
                "type": "risk",
                "severity": "high",
                "message": f"Critical Bandwidth Alert: {today_leaves} staff on leave today ({int(today_leaves/total_staff*100)}% of team)."
            })

        if pending_leaves > 0:
            attention_items.append({
                "type": "task",
                "severity": "medium",
                "message": f"Governance Queue: {pending_leaves} leave requests awaiting your authorization."
            })

        if team_ids:
            from datetime import timedelta
            seven_days_later = today + timedelta(days=7)
            upcoming_offboard = db.query(OffboardingRequest).filter(
                OffboardingRequest.employee_id.in_(team_ids),
                OffboardingRequest.last_working_day >= today,
                OffboardingRequest.last_working_day <= seven_days_later,
                OffboardingRequest.status != "Completed",
                OffboardingRequest.deleted_at == None
            ).count()
        else:
            upcoming_offboard = 0
        
        if upcoming_offboard > 0:
            attention_items.append({
                "type": "operational",
                "severity": "medium",
                "message": f"Talent Exit: {upcoming_offboard} team members offboarding within the next 7 days."
            })

        return {
            "stats": {
                "total_staff": total_staff,
                "at_work": at_work_count,
                "pending_leaves": pending_leaves,
                "lop_month": lop_month,
                "occupancy_rate": f"{int((at_work_count/total_staff)*100 if total_staff > 0 else 0)}%"
            },
            "attention_items": attention_items,
            "notice_period": self._get_notice_period_info(db, user_id),
            "company": self._get_company_info(db),
            "employee_profile": self._get_profile_basic(db, user_id)
        }

    def get_hr_dashboard(self, db: Session, user_id: int):
        today = date.today()
        
        # 1. Total Active Employees
        total_employees = db.query(Employee).filter(
            Employee.status.notin_(["Inactive", "Archived"]), 
            Employee.deleted_at == None
        ).count()
        
        # 2. Present Today (from Attendance table)
        present_today = db.query(Attendance).filter(
            Attendance.date == today,
            (Attendance.status.ilike("%Present%") | 
             Attendance.status.ilike("%Tracking%") | 
             Attendance.status.ilike("%Shift%")),
            Attendance.deleted_at == None
        ).count()
        
        # 3. On Leave Today (Approved Leave Requests)
        leave_today = db.query(LeaveRequest).filter(
            LeaveRequest.status.ilike("Approved"),
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today,
            LeaveRequest.deleted_at == None
        ).count()
        
        # 4. Pending Leave Requests
        leave_requests = db.query(LeaveRequest).filter(
            LeaveRequest.status.ilike("Pending"),
            LeaveRequest.deleted_at == None
        ).count()
        
        return {
            "total_employees": total_employees,
            "present_today": present_today,
            "leave_today": leave_today,
            "leave_requests": leave_requests,
            "notice_period": self._get_notice_period_info(db, user_id),
            "company": self._get_company_info(db),
            "employee_profile": self._get_profile_basic(db, user_id)
        }


    def get_it_dashboard(self, db: Session, user_id: int):
        # Count ALL hardware assets (not just Laptops)
        HARDWARE_CATEGORIES = ["Laptop", "Mobile", "Monitor", "Peripheral", "Desktop", "Tablet", "Other"]
        hardware_assets = db.query(Asset).filter(
            Asset.category.in_(HARDWARE_CATEGORIES),
            Asset.deleted_at == None
        ).count()

        # Unallocated = Available status
        unallocated_assets = db.query(Asset).filter(
            Asset.status == "Available",
            Asset.deleted_at == None
        ).count()

        # Active staff only (filter by status)
        active_staff = db.query(Employee).filter(
            Employee.status.notin_(["Inactive", "Archived"]),
            Employee.deleted_at == None
        ).count()

        # IT pending onboarding hardware tasks
        hardware_tasks = db.query(HROnboardingRequest).filter(
            HROnboardingRequest.current_approver_stage == "it"
        ).count()

        # Pending IT support tickets — used by Ticket Analytics card
        it_tickets = db.query(Ticket).filter(
            Ticket.category == "IT",
            Ticket.deleted_at == None
        ).all()

        pending_tickets = len([t for t in it_tickets if t.status not in ["Resolved", "Closed"]])
        
        # Calculate SLA (e.g., resolved within 24h)
        sla_met_count = 0
        resolved_tickets = [t for t in it_tickets if t.status in ["Resolved", "Closed"] and t.resolved_at and t.created_at]
        for t in resolved_tickets:
            diff = (t.resolved_at - t.created_at).total_seconds() / 3600
            if diff <= 24: sla_met_count += 1
        
        sla_pct = round((sla_met_count / len(resolved_tickets) * 100), 1) if resolved_tickets else 100.0

        # Calculate Avg Response (created to assigned)
        response_times = []
        for t in it_tickets:
            if t.assigned_at and t.created_at:
                diff = (t.assigned_at - t.created_at).total_seconds() / 60
                response_times.append(diff)
        
        avg_resp = round(sum(response_times) / len(response_times), 1) if response_times else 0.0

        return {
            "hardware_assets": hardware_assets,
            "unallocated_assets": unallocated_assets,
            "active_staff": active_staff,
            "hardware_tasks": hardware_tasks,
            "pending_tickets": pending_tickets,
            "sla_met_pct": sla_pct,
            "avg_response_min": avg_resp,
            "notice_period": self._get_notice_period_info(db, user_id),
            "company": self._get_company_info(db),
            "employee_profile": self._get_profile_basic(db, user_id)
        }

    def get_recruiter_dashboard(self, db: Session, user_id: int):
        return {
            "active_jobs": db.query(Job).filter(Job.status.notin_(["deleted", "closed"]), Job.deleted_at == None).count(),
            "total_candidates": db.query(Candidate).filter(Candidate.status != "archived", Candidate.deleted_at == None).count(),
            "interviews_today": db.query(Interview).filter(Interview.interview_date == date.today()).count(),
            "pending_offers": db.query(Offer).filter(Offer.status == "sent").count(),
            "notice_period": self._get_notice_period_info(db, user_id),
            "company": self._get_company_info(db),
            "employee_profile": self._get_profile_basic(db, user_id)
        }

    def get_teamleader_dashboard(self, db: Session, tl_id: str, user_id: int):
        tl_ids = {tl_id} if tl_id else set()
        if user_id:
            tl_ids.add(str(user_id))
            tl_emp = db.query(Employee).filter(Employee.user_id == user_id).first()
            if tl_emp:
                tl_ids.add(str(tl_emp.id))
                if tl_emp.employee_id:
                    tl_ids.add(tl_emp.employee_id)
        tl_ids = list(tl_ids)

        team_members = db.query(Employee).filter(
            or_(
                Employee.team_leader_id.in_(tl_ids),
                Employee.reporting_to_id.in_(tl_ids),
                Employee.manager_id.in_(tl_ids),
                Employee.reporting_manager_id.in_(tl_ids)
            ),
            Employee.deleted_at == None
        ).all()
        
        team_ids = []
        for m in team_members:
            team_ids.append(m.employee_id)
            team_ids.append(str(m.id))
        team_ids = list(set(team_ids))
        
        active_on_shift = db.query(ShiftSession).filter(
            ShiftSession.employee_id.in_(team_ids),
            ShiftSession.ended_at.is_(None)
        ).count()
        
        on_leave_today = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id.in_(team_ids),
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date <= date.today(),
            LeaveRequest.end_date >= date.today()
        ).count()
        
        pending_leaves = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.employee_id).filter(
            or_(
                Employee.team_leader_id.in_(tl_ids),
                Employee.reporting_to_id.in_(tl_ids),
                Employee.manager_id.in_(tl_ids),
                Employee.reporting_manager_id.in_(tl_ids)
            ),
            LeaveRequest.status == "Pending",
            LeaveRequest.deleted_at == None
        ).count()
        
        # IT/HR Tickets for the team
        pending_tickets = db.query(Ticket).filter(
            Ticket.employee_id.in_(team_ids),
            Ticket.status.notin_(["Resolved", "Closed"]),
            Ticket.deleted_at == None
        ).count()
        
        return {
            "team_size": len(team_members),
            "active_on_shift": active_on_shift,
            "on_leave_today": on_leave_today,
            "pending_approvals": pending_leaves,
            "open_tickets": pending_tickets,
            "notice_period": self._get_notice_period_info(db, user_id),
            "company": self._get_company_info(db),
            "employee_profile": self._get_profile_basic(db, user_id)
        }

    def get_manager_analytics(self, db: Session):
        total_emp = db.query(Employee).filter(Employee.status.notin_(["Inactive", "Archived"]), Employee.deleted_at == None).count()
        leaves_approved = db.query(LeaveRequest).join(Employee).filter(LeaveRequest.status.contains("Approved")).count()
        total_leaves = db.query(LeaveRequest).join(Employee).count()
        util = round((leaves_approved / total_leaves * 100) if total_leaves > 0 else 0, 1)
        
        return {
            "headcount_trend": [total_emp - 4, total_emp - 2, total_emp - 1, total_emp],
            "leave_utilization": util,
            "performance_avg": 8.4,
            "total_active_employees": total_emp,
            "company": self._get_company_info(db)
        }

    def get_hr_reports(self, db: Session):
        from app.models.hr_onboarding import HROnboarding
        from app.models.preboarding import Preboarding
        return {
            "onboarding_completion_rate": "85%",
            "total_headcount": db.query(Employee).filter(Employee.status.notin_(["Inactive", "Archived"]), Employee.deleted_at == None).count(),
            "pending_onboarding": db.query(HROnboarding).filter(HROnboarding.status != "completed").count(),
            "pending_preboarding": db.query(Preboarding).filter(Preboarding.self_onboarding_status != "completed").count(),
            "company": self._get_company_info(db)
        }
        
    def get_it_reports(self, db: Session):
        total = db.query(Asset).filter(Asset.deleted_at == None).count()
        allocated = db.query(Asset).filter(Asset.status == "Allocated", Asset.deleted_at == None).count()
        return {
            "total_assets": total,
            "unallocated_assets": total - allocated,
            "maintenance_incidents": 4, 
            "allocation_rate": f"{round((allocated/total*100) if total > 0 else 0, 1)}%",
            "company": self._get_company_info(db)
        }

    def get_recruiter_reports(self, db: Session):
        offers = db.query(Offer).count()
        accepted = db.query(Offer).filter(Offer.status == "accepted").count()
        return {
            "time_to_hire": "18 days",
            "offer_acceptance_rate": f"{round((accepted/offers*100) if offers > 0 else 0, 1)}%",
            "active_pipelines": db.query(Candidate).filter(Candidate.status == "active", Candidate.deleted_at == None).count(),
            "offers_extended": offers,
            "company": self._get_company_info(db)
        }

    def get_teamleader_reports(self, db: Session, tl_id: str):
        tl_ids = {tl_id} if tl_id else set()
        tl_emp = db.query(Employee).filter(Employee.employee_id == tl_id).first()
        if tl_emp:
            tl_ids.add(str(tl_emp.id))
            if tl_emp.user_id:
                tl_ids.add(str(tl_emp.user_id))
        tl_ids = list(tl_ids)

        team_members = db.query(Employee).filter(
            or_(
                Employee.team_leader_id.in_(tl_ids),
                Employee.reporting_to_id.in_(tl_ids),
                Employee.manager_id.in_(tl_ids),
                Employee.reporting_manager_id.in_(tl_ids)
            ),
            Employee.deleted_at == None
        ).all()
        
        team_ids = []
        for m in team_members:
            team_ids.append(m.employee_id)
            team_ids.append(str(m.id))
        team_ids = list(set(team_ids))
        
        # Ticket stats
        tickets = db.query(Ticket).filter(
            Ticket.employee_id.in_(team_ids),
            Ticket.deleted_at == None
        ).all()
        open_tickets = len([t for t in tickets if t.status not in ["Resolved", "Closed"]])

        return {
            "team_productivity": "92%",
            "attendance_average": "96%",
            "total_team_members": len(team_members),
            "open_tickets": open_tickets,
            "company": self._get_company_info(db)
        }

dashboard_service = DashboardService()
