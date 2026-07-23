# Updated Attendance Service - 2026-04-24
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from datetime import date, datetime, time, timedelta
from typing import List, Optional
from decimal import Decimal
from app.repositories.attendance_repo import attendance_repo, shift_repo, shift_session_repo, shift_assignment_repo
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceCorrectionCreate
from app.schemas.shift import ShiftDefinitionCreate, ShiftDefinitionUpdate, ShiftSessionCreate, BreakLogCreate, ShiftAssignmentCreate
from app.schemas.leave import EarlyLoginCreate
from app.models import shift as shift_models
from app.models import attendance as attn_models
from app.models import employee as emp_models
from app.models import leave as leave_models
from app.core.exceptions import ResourceNotFoundException
from fastapi import HTTPException

class AttendanceService:
    def check_in(self, db: Session, employee_id: str, check_in_dt: datetime = None):
        today = date.today()
        now_dt = check_in_dt or datetime.now()
        db_obj = attendance_repo.get(db, employee_id, today)
        if db_obj:
            # Already checked in today — preserve original first check_in time if set
            if not db_obj.check_in:
                return attendance_repo.update(db, db_obj, AttendanceUpdate(check_in=now_dt, check_in_time=now_dt))
            return db_obj
        
        # New check-in
        obj_in = AttendanceCreate(
            employee_id=employee_id, 
            date=today, 
            month=today.month,
            year=today.year,
            check_in=now_dt, 
            check_in_time=now_dt,
            status="Present"
        )
        return attendance_repo.create(db, obj_in)

    def check_out(self, db: Session, employee_id: str, check_out_dt: datetime = None):
        today = date.today()
        now_dt = check_out_dt or datetime.now()
        db_obj = attendance_repo.get(db, employee_id, today)
        if not db_obj:
            raise ResourceNotFoundException("Attendance for today", employee_id)
        
        # Calculate hours
        hrs = 0
        if db_obj.check_in:
            c_in = db_obj.check_in if isinstance(db_obj.check_in, datetime) else datetime.combine(today, db_obj.check_in)
            diff = now_dt - c_in
            hrs = round(diff.total_seconds() / 3600, 2)

        return attendance_repo.update(db, db_obj, AttendanceUpdate(
            check_out=now_dt, 
            check_out_time=now_dt,
            total_hours=Decimal(str(hrs)),
            work_hours=Decimal(str(hrs)),
            status="Present"
        ))

    def get_my_attendance(self, db: Session, employee_id: str = None, skip: int = 0, limit: int = 2000, viewer_role: str = "hr", viewer_id: int = None, date_filter: date = None, start_date: date = None, end_date: date = None):
        """Get attendance records scoped by viewer's role.
        Optimized to fetch team hierarchy in a single pass to avoid N+1 query overhead.
        """
        query = db.query(attn_models.Attendance, emp_models.Employee.first_name, emp_models.Employee.last_name, emp_models.Employee.role, emp_models.Employee.department)\
            .outerjoin(emp_models.Employee, attn_models.Attendance.employee_id == emp_models.Employee.employee_id)\
            .filter(attn_models.Attendance.deleted_at == None)

        if date_filter:
            query = query.filter(attn_models.Attendance.date == date_filter)
        if start_date:
            query = query.filter(attn_models.Attendance.date >= start_date)
        if end_date:
            query = query.filter(attn_models.Attendance.date <= end_date)

        if employee_id:
            query = query.filter(attn_models.Attendance.employee_id == employee_id, attn_models.Attendance.deleted_at == None)
        elif viewer_role and viewer_role.lower() in ["manager", "teamleader", "tl"] and viewer_id:
            # 🚀 PRODUCTION OPTIMIZATION: Use a single flat fetch for hierarchy check
            all_emps = db.query(
                emp_models.Employee.id,
                emp_models.Employee.employee_id,
                emp_models.Employee.user_id,
                emp_models.Employee.manager_id,
                emp_models.Employee.reporting_manager_id,
                emp_models.Employee.team_leader_id,
                emp_models.Employee.reporting_to_id
            ).all()
            
            manager_emp = db.query(emp_models.Employee).filter(
                emp_models.Employee.user_id == viewer_id,
                emp_models.Employee.deleted_at == None
            ).first()
            if not manager_emp:
                manager_emp = db.query(emp_models.Employee).filter(
                    or_(
                        emp_models.Employee.id == viewer_id,
                        emp_models.Employee.employee_id == str(viewer_id)
                    ),
                    emp_models.Employee.deleted_at == None
                ).first()
            
            if manager_emp:
                team_ids = {
                    str(x).strip() for x in [manager_emp.employee_id, manager_emp.id, manager_emp.user_id, viewer_id] if x
                }
                
                added = True
                while added:
                    added = False
                    current_count = len(team_ids)
                    for db_id, emp_code, u_id, mgr, rep_mgr, tl, rep_to in all_emps:
                        refs = {str(r).strip() for r in [mgr, rep_mgr, tl, rep_to] if r}
                        if refs.intersection(team_ids):
                            for new_id in [db_id, emp_code, u_id]:
                                if new_id and str(new_id).strip() not in team_ids:
                                    team_ids.add(str(new_id).strip())
                                    added = True
                    if len(team_ids) == current_count: break
                
                query = query.filter(attn_models.Attendance.employee_id.in_(list(team_ids)))
        # HR → no filter, sees all
        try:
            results = query.order_by(attn_models.Attendance.date.desc()).offset(skip).limit(limit).all()

            enriched = []
            for attn, fn, ln, role, dept in results:
                try:
                    d = {c.key: getattr(attn, c.key, None) for c in attn.__table__.columns}
                    d["employee_name"] = f"{fn or ''} {ln or ''}".strip() or (attn.employee_id if attn else "Unknown")
                    d["role"] = role
                    d["department"] = dept
                    d["login_time"] = attn.check_in if attn else None
                    d["logout_time"] = attn.check_out if attn else None
                    # Explicitly serialize date as YYYY-MM-DD string for frontend consistency
                    if d.get("date") and hasattr(d["date"], "isoformat"):
                        d["date"] = d["date"].isoformat()
                    # Convert Decimals to float for JSON
                    for k, v in d.items():
                        if hasattr(v, '__float__') and not isinstance(v, (int, float)):
                            d[k] = float(v)
                    d["hours_worked"] = d.get("total_hours", 0) or 0
                    d["break_time"] = d.get("break_minutes", 0) or 0
                    enriched.append(d)
                except Exception as row_err:
                    print(f"[DEBUG] Skipping row due to error: {row_err}")
                    continue
            return enriched
        except Exception as e:
            import traceback
            traceback.print_exc()
            return []


    def request_correction(self, db: Session, obj_in: AttendanceCorrectionCreate):
        data = obj_in.dict(exclude={'employee_id', 'date'})
        db_obj = attn_models.AttendanceCorrection(
            **data, 
            employee_id=obj_in.employee_id, 
            attendance_date=obj_in.date,
            status="Pending"
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_all_corrections(self, db: Session, skip: int = 0, limit: int = 100, user_role: str = "hr", user_id: int = None):
        query = db.query(attn_models.AttendanceCorrection, emp_models.Employee.first_name, emp_models.Employee.last_name)\
            .join(emp_models.Employee, attn_models.AttendanceCorrection.employee_id == emp_models.Employee.employee_id)\
            .filter(attn_models.AttendanceCorrection.deleted_at == None, emp_models.Employee.deleted_at == None)
        
        if user_role and user_role.lower() in ["manager", "teamleader"] and user_id:
            # 🚀 PRODUCTION OPTIMIZATION: Use a single flat fetch for hierarchy check
            all_emps = db.query(emp_models.Employee.employee_id, emp_models.Employee.manager_id, emp_models.Employee.reporting_manager_id, emp_models.Employee.team_leader_id, emp_models.Employee.reporting_to_id).all()
            
            manager_emp = db.query(emp_models.Employee).filter(emp_models.Employee.user_id == user_id).first()
            if manager_emp:
                m_id = manager_emp.employee_id
                team_ids = {m_id}
                
                # Single-pass hierarchy resolution (O(N) vs recursive O(N^D))
                added = True
                while added:
                    added = False
                    current_count = len(team_ids)
                    for e_id, mgr, rep_mgr, tl, rep_to in all_emps:
                        if e_id not in team_ids and (mgr in team_ids or rep_mgr in team_ids or tl in team_ids or rep_to in team_ids):
                            team_ids.add(e_id)
                            added = True
                    if len(team_ids) == current_count: break
                
                query = query.filter(attn_models.AttendanceCorrection.employee_id.in_(list(team_ids)))
            else:
                return []
        # HR sees all corrections
            
        results = query.offset(skip).limit(limit).all()
        return [
            {
                "id": c.id,
                "employee_id": c.employee_id,
                "employee_name": f"{fn or ''} {ln or ''}".strip(),
                "date": c.attendance_date,
                "original_status": c.original_status,
                "corrected_status": c.corrected_status,
                "requested_check_in": c.requested_check_in,
                "requested_check_out": c.requested_check_out,
                "reason": c.reason,
                "status": c.status,
                "approved_by": c.reviewed_by,
                "created_at": c.created_at
            } for c, fn, ln in results
        ]

    def get_active_presence(self, db: Session, user_role: str = "hr", viewer_user_id: int = None):
        """HR/Manager View: who is currently logged in.
        - HR: all active sessions
        - Manager: only their team's sessions
        """
        query = db.query(shift_models.ShiftSession, emp_models.Employee.first_name, emp_models.Employee.last_name, emp_models.Employee.role, emp_models.Employee.department, shift_models.ShiftDefinition.shift_name, shift_models.ShiftDefinition.color)\
            .join(emp_models.Employee, shift_models.ShiftSession.employee_id == emp_models.Employee.employee_id)\
            .outerjoin(shift_models.ShiftDefinition, shift_models.ShiftSession.shift_id == shift_models.ShiftDefinition.id)\
            .filter(shift_models.ShiftSession.status == "active", emp_models.Employee.deleted_at == None)

        if user_role and user_role.lower() == "manager" and viewer_user_id:
            # 🚀 PRODUCTION OPTIMIZATION: Use flat-fetch for hierarchy
            all_emps = db.query(emp_models.Employee.employee_id, emp_models.Employee.manager_id, emp_models.Employee.reporting_manager_id, emp_models.Employee.team_leader_id, emp_models.Employee.reporting_to_id).all()
            
            manager_emp = db.query(emp_models.Employee).filter(emp_models.Employee.user_id == viewer_user_id).first()
            if manager_emp:
                m_id = manager_emp.employee_id
                team_ids = {m_id}
                
                added = True
                while added:
                    added = False
                    current_count = len(team_ids)
                    for e_id, mgr, rep_mgr, tl, rep_to in all_emps:
                        if e_id not in team_ids and (mgr in team_ids or rep_mgr in team_ids or tl in team_ids or rep_to in team_ids):
                            team_ids.add(e_id)
                            added = True
                    if len(team_ids) == current_count: break
                
                query = query.filter(shift_models.ShiftSession.employee_id.in_(list(team_ids)))
            else:
                # If manager has no employee profile, they see nothing (safety)
                return []

        results = query.all()
        final_res = []
        for s, fn, ln, role, dept, sname, scolor in results:
            try:
                # Direct attribute access for speed
                d = {c.key: getattr(s, c.key, None) for c in s.__table__.columns}
                # Convert Decimals to float for JSON
                for k, v in d.items():
                    if hasattr(v, '__float__') and not isinstance(v, (int, float)):
                        d[k] = float(v)
                        
                d.update({
                    "employee_name": f"{fn} {ln}".strip(),
                    "role": role,
                    "department": dept,
                    "shift_name": sname,
                    "shift_color": scolor,
                    "date": s.login_time.date() if getattr(s, 'login_time', None) else None,
                    "is_online": s.status == "active"
                })
                final_res.append(d)
            except Exception as row_err:
                print(f"[DEBUG] Presence row error: {row_err}")
                continue
        return final_res


    def approve_correction(self, db: Session, correction_id: int, status: str, approved_by_employee_id: str, approver_role: str = "hr", rejection_reason: Optional[str] = None):
        from app.services.employee_service import employee_service
        
        db_obj = db.query(attn_models.AttendanceCorrection).filter(attn_models.AttendanceCorrection.id == correction_id, attn_models.AttendanceCorrection.deleted_at == None).first()
        if not db_obj:
            return None
            
        # Verify authority
        if not employee_service.verify_subordinate_authority(db, db_obj.employee_id, approved_by_employee_id, approver_role):
            raise HTTPException(status_code=403, detail="You do not have authority over this employee's requests.")
        
        db_obj.status = status
        db_obj.reviewed_by = approved_by_employee_id
        db_obj.reviewed_at = datetime.now()
        if rejection_reason:
            db_obj.comments = rejection_reason
        db_obj.updated_at = datetime.now()
        
        # Only finalize and update master table if HR is approving
        if status.lower() == "approved" and approver_role.lower() == "hr":
            attn = db.query(attn_models.Attendance).filter(attn_models.Attendance.employee_id == db_obj.employee_id, attn_models.Attendance.date == db_obj.attendance_date).first()
            if not attn:
                # Create if missing
                attn = attn_models.Attendance(
                    employee_id=db_obj.employee_id, 
                    date=db_obj.attendance_date, 
                    month=db_obj.attendance_date.month if db_obj.attendance_date else None,
                    year=db_obj.attendance_date.year if db_obj.attendance_date else None,
                    source="correction"
                )
            else:
                # Update if missing
                if not attn.month and db_obj.attendance_date:
                    attn.month = db_obj.attendance_date.month
                if not attn.year and db_obj.attendance_date:
                    attn.year = db_obj.attendance_date.year
            
            if db_obj.requested_check_in:
                attn.check_in = db_obj.requested_check_in
            if db_obj.requested_check_out:
                attn.check_out = db_obj.requested_check_out
            
            # Recalculate duration & status
            if attn.check_in and attn.check_out:
                attn_date = attn.date if isinstance(attn.date, date) else date.fromisoformat(str(attn.date))
                
                # Robustly convert to datetime for comparison
                c_in = attn.check_in if isinstance(attn.check_in, datetime) else datetime.combine(attn_date, attn.check_in)
                c_out = attn.check_out if isinstance(attn.check_out, datetime) else datetime.combine(attn_date, attn.check_out)
                
                if c_out < c_in:
                    # Spans across midnight
                    c_out += timedelta(days=1)
                diff = c_out - c_in
                total_min = int(diff.total_seconds() / 60)
                attn.total_hours = Decimal(total_min / 60).quantize(Decimal("0.00"))
                
                if total_min >= 450: attn.status = "Present"
                elif total_min >= 240: attn.status = "Half Day"
                else: attn.status = "Absent"
            
            db.add(attn)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def approve_early_login(self, db: Session, request_id: int, status: str, approved_by_employee_id: str, approver_role: str = "teamleader"):
        from app.services.employee_service import employee_service
        
        db_obj = db.query(leave_models.EarlyLoginRequest).filter(leave_models.EarlyLoginRequest.id == request_id, leave_models.EarlyLoginRequest.deleted_at == None).first()
        if not db_obj:
            return None
            
        # Verify authority
        if not employee_service.verify_subordinate_authority(db, db_obj.employee_id, approved_by_employee_id, approver_role):
            raise HTTPException(status_code=403, detail="You do not have authority over this employee's requests.")
            
        db_obj.status = status
        db_obj.approved_by = approved_by_employee_id
        db_obj.updated_at = datetime.now()
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def request_early_login(self, db: Session, obj_in: EarlyLoginCreate):
        db_obj = leave_models.EarlyLoginRequest(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_my_early_login_requests(self, db: Session, employee_id: str):
        return db.query(leave_models.EarlyLoginRequest).filter(
            leave_models.EarlyLoginRequest.employee_id == employee_id, 
            leave_models.EarlyLoginRequest.deleted_at == None
        ).order_by(leave_models.EarlyLoginRequest.date.desc()).all()

class ShiftService:
    def create_shift(self, db: Session, obj_in: ShiftDefinitionCreate) -> shift_models.ShiftDefinition:
        return shift_repo.create(db, obj_in)

    def get_shifts(self, db: Session, skip: int = 0, limit: int = 100):
        # We manually enrich with assignments because relationships aren't in models
        shifts = shift_repo.get_multi(db, skip, limit)
        for s in shifts:
            s.assignments = db.query(shift_models.ShiftAssignment).filter(shift_models.ShiftAssignment.shift_id == s.id).all()
        return shifts

    def delete_shift(self, db: Session, shift_id: int):
        return shift_repo.delete(db, shift_id)

    def update_shift(self, db: Session, shift_id: int, obj_in: ShiftDefinitionUpdate):
        db_obj = shift_repo.get(db, id=shift_id)
        if not db_obj:
            raise ResourceNotFoundException("Shift definition", shift_id)
        return shift_repo.update(db, db_obj=db_obj, obj_in=obj_in)

    def get_attendance_history(self, db: Session, employee_id: str):
        """Returns shift session history for a specific employee."""
        from app.models.shift import ShiftSession, ShiftDefinition
        query = (
            db.query(ShiftSession, ShiftDefinition)
            .outerjoin(ShiftDefinition, ShiftSession.shift_id == ShiftDefinition.id)
            .filter(ShiftSession.employee_id == employee_id)
        )
        rows = query.order_by(ShiftSession.date.desc(), ShiftSession.started_at.desc()).all()
        return self._enrich_sessions(db, rows)

    def get_active_session(self, db: Session, employee_id: str):
        return shift_session_repo.get_active(db, employee_id)

    def assign_shift(self, db: Session, obj_in: ShiftAssignmentCreate, current_user_role: str, current_employee_id: str) -> shift_models.ShiftAssignment:
        # Role validation: HR/Manager/TeamLeader only
        allowed_roles = ['hr', 'manager', 'teamleader']
        if current_user_role.lower() not in allowed_roles:
            raise HTTPException(status_code=403, detail="Only HR, Manager, or TeamLeader can assign shifts")
        
        # Validate target exists
        target = db.query(emp_models.Employee).filter(emp_models.Employee.employee_id == obj_in.employee_id).first()
        if not target:
            raise HTTPException(status_code=404, detail=f"Employee {obj_in.employee_id} not found")
        
        # TeamLeader authority check
        if current_user_role.lower() == 'teamleader':
            if target.team_leader_id != current_employee_id:
                raise HTTPException(status_code=403, detail="TeamLeaders can only assign to their direct team")
        
        obj_in.assigned_by = current_employee_id  # Audit trail
        
        return shift_assignment_repo.create(db, obj_in)

    def unassign_shift(self, db: Session, shift_id: int, employee_id: str):
        db_obj = db.query(shift_models.ShiftAssignment).filter(
            shift_models.ShiftAssignment.shift_id == shift_id,
            shift_models.ShiftAssignment.employee_id == employee_id
        ).first()
        if not db_obj:
            return None
        db.delete(db_obj)
        db.commit()
        return True

    async def start_session(self, db: Session, obj_in: ShiftSessionCreate) -> shift_models.ShiftSession:
        """
        Starts a shift session atomically. 
        Production logic: Handles shift inheritance, early login gating, and legacy audit mirroring in a single transaction.
        """
        employee_id = obj_in.employee_id
        requested_shift_id = obj_in.shift_id
        
        today = date.today()
        now_dt = datetime.now()

        # 1. Early Guard: Prevent double-starting if session exists TODAY; auto-close stale sessions from past days
        active = shift_session_repo.get_active(db, employee_id)
        if active:
            active_date = active.date or (active.started_at.date() if getattr(active, 'started_at', None) else None) or (active.login_time.date() if getattr(active, 'login_time', None) else None)
            if active_date == today:
                return active
            else:
                # Active session is from a previous date - close stale session automatically
                close_dt = datetime.combine(active_date or (today - timedelta(days=1)), time(23, 59, 59))
                active.ended_at = active.ended_at or close_dt
                active.logout_time = active.logout_time or close_dt
                active.status = "closed"
                db.add(active)
                db.flush()
        
        # 2. Resolve Employee & Role for Gating (Canonicalize ID)
        from app.repositories.employee_repo import employee_repo
        emp = employee_repo.get(db, employee_id)
        if emp:
            employee_id = emp.employee_id # Use canonical string ID
        user_role = (getattr(emp, 'role', 'employee') or 'employee').lower().replace(' ', '')
        
        privileged_roles = ['hr', 'recruiter', 'requiter', 'teamleader', 'tl', 'it', 'itdepartment', 'manager', 'admin']
        is_privileged = user_role in privileged_roles

        # 3. Shift Discovery (Inheritance Logic)
        shift_id = requested_shift_id
        is_explicitly_assigned = False
        
        if not shift_id or shift_id == 0:
            assigned = shift_assignment_repo.get_by_employee(db, employee_id)
            if not assigned:
                # Resolve Team Leader and Manager IDs
                tl_id = (getattr(emp, 'team_leader_id', None) or getattr(emp, 'reporting_to_id', None))
                mgr_id = (getattr(emp, 'reporting_manager_id', None) or getattr(emp, 'manager_id', None))
                
                # Check for inherited shift from Team Leader
                if tl_id:
                    tl_emp = employee_repo.get(db, str(tl_id))
                    if tl_emp:
                        tl_assigned = shift_assignment_repo.get_by_employee(db, tl_emp.employee_id)
                        if tl_assigned:
                            shift_id = tl_assigned.shift_id
                
                # Fallback to inherited shift from Manager
                if not shift_id or shift_id == 0:
                    if mgr_id:
                        manager_emp = employee_repo.get(db, str(mgr_id))
                        if manager_emp:
                            mgr_assigned = shift_assignment_repo.get_by_employee(db, manager_emp.employee_id)
                            if mgr_assigned:
                                shift_id = mgr_assigned.shift_id
            else:
                shift_id = assigned.shift_id
                is_explicitly_assigned = True
        else:
            is_explicitly_assigned = True

        # 4. Resolve Shift Definition with fallback
        shift = db.query(shift_models.ShiftDefinition).filter(shift_models.ShiftDefinition.id == shift_id).first() if shift_id else None
        if not shift:
            # Fallback to organization default
            shift = db.query(shift_models.ShiftDefinition).order_by(shift_models.ShiftDefinition.id).first()
            if not shift:
                # Emergency fallback if no shifts defined in system
                shift = shift_models.ShiftDefinition(shift_name="Standard", start_time=time(9,0), end_time=time(18,0), grace_time=15)
                db.add(shift); db.flush()
            shift_id = shift.id

        # 5. Early Login Gating
        is_extension = False
        is_early = False
        if is_explicitly_assigned and shift:
            # Check if login is outside normal timing
            is_early = now_dt.time() < shift.start_time
            is_late_extension = now_dt.time() > shift.end_time
            
            if is_early or is_late_extension:
                if is_privileged:
                    # Automatically allow privileged roles as "Extension"
                    is_extension = True
                else:
                    # Normal employees still need an approved request for early login
                    if is_early:
                        early_req = db.query(leave_models.EarlyLoginRequest).filter(
                            leave_models.EarlyLoginRequest.employee_id == employee_id,
                            leave_models.EarlyLoginRequest.date == today,
                            func.lower(leave_models.EarlyLoginRequest.status) == "approved"
                        ).first()
                        if not early_req:
                            raise HTTPException(status_code=403, detail=f"Shift starts at {shift.start_time}. Early login requires an approved request.")
                        
                        if now_dt.time() < early_req.requested_start_time:
                            raise HTTPException(status_code=403, detail=f"Your approved early login time for today is {early_req.requested_start_time}. Please wait until then.")

        # Calculate is_late and Shift Extension based on grace period
        is_late = False
        if shift:
            shift_start_dt = datetime.combine(today, shift.start_time)
            if now_dt > (shift_start_dt + timedelta(minutes=shift.grace_time or 0)):
                is_late = True
                # User defined logic: Logging in after grace time counts as a Shift Extension
                is_extension = True

        # 6. Create Session Object
        import uuid
        session = shift_models.ShiftSession(
            session_id=str(uuid.uuid4()),
            employee_id=employee_id,
            shift_id=shift_id,
            user_id=employee_id,
            user_name=f"{emp.first_name} {emp.last_name}" if emp else "Staff",
            role=getattr(emp, 'role', 'employee'),
            department=getattr(emp, 'department', None),
            shift_name=shift.shift_name,
            started_at=now_dt,
            login_time=now_dt,
            date=today,
            month=today.month,
            year=today.year,
            status="active",
            remark="Shift Extension" if is_extension else getattr(obj_in, 'remark', None),
            is_early_login=is_early and not is_extension,
            ip_address=obj_in.ip_address,
            location_metadata=str(obj_in.location_metadata) if obj_in.location_metadata else None
        )
        db.add(session)

        # 7. Synchronize with Legacy Attendance Audit

        legacy = db.query(attn_models.Attendance).filter(attn_models.Attendance.employee_id == employee_id, attn_models.Attendance.date == today).first()
        if not legacy:
            legacy = attn_models.Attendance(
                employee_id=employee_id, date=today, 
                check_in=now_dt, check_in_time=now_dt, 
                status="Present", source="shift_system", is_late=is_late
            )
            db.add(legacy)
        else:
            legacy.check_in = legacy.check_in or now_dt
            legacy.check_in_time = legacy.check_in_time or now_dt
            legacy.status = "Present"
            legacy.is_late = is_late
            db.add(legacy)

        # 7. Final Atomic Commit
        try:
            db.commit()
            db.refresh(session)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database synchronization failed: {str(e)}")

        # 8. Async Notification (Non-Critical)
        # 🚀 Real-time Update (Standardized for TL/Admin Dashboards)
        from app.core.websocket_manager import websocket_manager
        try:
            await websocket_manager.broadcast({
                "event": "data_updated",
                "data": {"type": "attendance", "action": "check_in", "employee_id": employee_id}
            })
        except Exception as ws_err:
            print(f"[WS ERROR] Broadcast failed in start_session: {ws_err}")
        
        return session

    async def end_session(self, db: Session, employee_id: str):
        try:
            active = shift_session_repo.get_active(db, employee_id)
            if not active:
                raise ResourceNotFoundException("Active shift session", employee_id)
                
            now = datetime.now()
            active.ended_at = now
            active.logout_time = now
            active.status = "closed"
            active.on_break = False
            active.current_break_start = None
            
            # Identity reinforcement
            if not active.user_id:
                from app.repositories.employee_repo import employee_repo
                emp = employee_repo.get(db, employee_id)
                if emp:
                    active.user_id = employee_id
                    active.user_name = f"{emp.first_name} {emp.last_name}"
                    active.role = emp.role
            
            # Close any open breaks
            open_breaks = db.query(shift_models.BreakLog).filter(
                shift_models.BreakLog.session_id == (active.session_id or str(active.id)), 
                shift_models.BreakLog.break_end == None
            ).all()
            for b in open_breaks:
                b.break_end = now
                diff_b = b.break_end - b.break_start
                b.duration_seconds = int(diff_b.total_seconds())
                b.duration_minutes = int(b.duration_seconds / 60)
                db.add(b)
            db.flush() 

            # Calculate total work duration with precision
            # Fallback to login_time or created_at if started_at is null
            start_dt = active.started_at or active.login_time or active.created_at or now
            total_duration = now - start_dt
            total_seconds = int(total_duration.total_seconds())
            
            # Subtract breaks
            break_query = db.query(
                func.sum(shift_models.BreakLog.duration_minutes),
                func.sum(shift_models.BreakLog.duration_seconds)
            ).filter(shift_models.BreakLog.session_id == (active.session_id or str(active.id))).first()
            
            active.total_break_minutes = break_query[0] or 0
            active.total_break_seconds = break_query[1] or 0
            
            active.total_work_seconds = max(0, total_seconds - active.total_break_seconds)
            active.total_work_minutes = int(active.total_work_seconds / 60)

            # Enforce half-day (240 mins / 4.0 hours) minimum work time before shift logout is permitted
            if active.total_work_minutes < 240:
                from fastapi import HTTPException
                worked_h = active.total_work_minutes // 60
                worked_m = active.total_work_minutes % 60
                needed_mins = 240 - active.total_work_minutes
                needed_h = needed_mins // 60
                needed_m = needed_mins % 60
                raise HTTPException(
                    status_code=400,
                    detail=f"Shift logout restricted: You cannot end your shift until you complete at least half-day working hours (4.0 hours). Current work time: {worked_h}h {worked_m}m. Remaining needed for half-day: {needed_h}h {needed_m}m."
                )
            
            # Human readable string
            h = active.total_work_minutes // 60
            m = active.total_work_minutes % 60
            active.total_hours = f"{h}h {m}m"
            
            # Status calculation
            if active.total_work_minutes >= 450: active.status = "Present"
            elif active.total_work_minutes >= 240: active.status = "Half Day"
            else: active.status = "Absent"

            db.add(active)
            db.commit()
            
            # Bridge to Attendance table
            attn = db.query(attn_models.Attendance).filter(
                attn_models.Attendance.employee_id == employee_id, 
                attn_models.Attendance.date == start_dt.date()
            ).first()
            
            if attn:
                attn.check_out = now
                attn.check_out_time = now
                # Safer Decimal conversion
                try:
                    hrs = round(active.total_work_minutes / 60, 2)
                    dec_hrs = Decimal(str(hrs))
                    attn.total_hours = dec_hrs
                    attn.work_hours = dec_hrs
                    attn.break_minutes = Decimal(str(active.total_break_minutes or 0))
                except:
                    attn.total_hours = Decimal("0.00")
                    attn.work_hours = Decimal("0.00")
                    attn.break_minutes = Decimal("0.00")
                attn.status = active.status
                db.add(attn)
                db.commit()
                
            db.refresh(active)

            # Real-time event
            try:
                # 🚀 Real-time Update
                from app.core.websocket_manager import websocket_manager
                try:
                    await websocket_manager.broadcast({
                        "event": "data_updated",
                        "data": {"type": "attendance", "action": "check_out", "employee_id": employee_id}
                    })
                except Exception as ws_err:
                    print(f"[WS ERROR] Broadcast failed in end_session: {ws_err}")
            except Exception as ws_err:
                print(f"WebSocket broadcast failed: {ws_err}")

            return active
            
        except Exception as e:
            db.rollback()
            print(f"CRITICAL ERROR in end_session: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Shift closure failed: {str(e)}")

    def start_break(self, db: Session, employee_id: str, type: str = "break"):
        active_session = shift_session_repo.get_active(db, employee_id)
        if not active_session:
            raise ResourceNotFoundException("Active shift session", employee_id)
            
        active_break = db.query(shift_models.BreakLog).filter(shift_models.BreakLog.session_id == (active_session.session_id or str(active_session.id)), shift_models.BreakLog.break_end == None).first()
        if active_break: 
            active_session.on_break = True
            db.add(active_session)
            db.commit()
            return active_break
        
        new_break = shift_models.BreakLog(
            session_id=active_session.session_id or str(active_session.id), 
            employee_id=employee_id, 
            break_start=datetime.now()
        )
        active_session.on_break = True
        active_session.current_break_start = datetime.now()
        db.add(new_break)
        db.add(active_session)
        db.commit()
        db.refresh(new_break)
        return new_break

    def end_break(self, db: Session, employee_id: str):
        active_session = shift_session_repo.get_active(db, employee_id)
        if not active_session:
            raise ResourceNotFoundException("Active shift session", employee_id)

        active_break = db.query(shift_models.BreakLog).filter(shift_models.BreakLog.session_id == (active_session.session_id or str(active_session.id)), shift_models.BreakLog.break_end == None).first()
        if not active_break: 
            raise ResourceNotFoundException("Active break log", employee_id)
            
        active_break.break_end = datetime.now()
        diff = active_break.break_end - active_break.break_start
        active_break.duration_seconds = int(diff.total_seconds())
        active_break.duration_minutes = int(active_break.duration_seconds / 60)
        
        active_session.on_break = False
        active_session.current_break_start = None
        active_session.total_break_seconds = (active_session.total_break_seconds or 0) + active_break.duration_seconds
        active_session.total_break_minutes = int(active_session.total_break_seconds / 60)
        
        db.add(active_session)
        db.commit()
        db.refresh(active_break)
        return active_break

    def get_breaks_by_session(self, db: Session, employee_id: str):
        active_session = shift_session_repo.get_active(db, employee_id)
        if not active_session: return []
        return db.query(shift_models.BreakLog).filter(shift_models.BreakLog.session_id == (active_session.session_id or str(active_session.id))).all()

    def _enrich_sessions(self, db: Session, rows):
        result = []
        for row in rows:
            # Handle SQLAlchemy Row objects or tuples from joined queries
            # row can be (ShiftSession, ShiftDefinition) or (ShiftSession, fn, ln, role, dept) or just ShiftSession
            shift = None
            fn, ln, role, dept = None, None, None, None

            if hasattr(row, '_mapping'):
                # SQLAlchemy 2.0 Row
                m = row._mapping
                session = m.get('ShiftSession') or row[0]
                shift = m.get('ShiftDefinition')
                if not shift and len(row) > 1 and hasattr(row[1], 'shift_name'):
                    shift = row[1]
                
                # Try to extract employee details from named columns if present
                fn = m.get('first_name')
                ln = m.get('last_name')
                role = m.get('role')
                dept = m.get('department')
            elif isinstance(row, (tuple, list)):
                session = row[0]
                # If row[1] has shift_name, it's a ShiftDefinition
                if len(row) > 1 and hasattr(row[1], 'shift_name'):
                    shift = row[1]
                
                # If row has 5 elements, it matches (session, fn, ln, role, dept) format
                if len(row) >= 5:
                    fn, ln, role, dept = row[1], row[2], row[3], row[4]
            else:
                session = row

            # Get user info from session or fallbacks
            user_name = session.user_name or f"{fn or ''} {ln or ''}".strip() or 'Staff'
            fn_fallback = user_name.split(' ')[0] if user_name else 'Staff'
            ln_fallback = user_name.split(' ')[-1] if user_name and ' ' in user_name else ''
            
            # Use columns from Employee if available
            final_role = role or getattr(session, 'role', 'Staff')
            final_dept = dept or getattr(session, 'department', None)
            if not final_dept and hasattr(session, 'employee') and session.employee:
                final_dept = getattr(session.employee, 'department', None)
            
            # Robust time extraction
            start_dt = getattr(session, 'login_time', None) or getattr(session, 'started_at', None) or getattr(session, 'created_at', None)
            end_dt = getattr(session, 'logout_time', None) or getattr(session, 'ended_at', None)
            
            # Calculate duration in seconds
            total_sec = getattr(session, 'total_work_minutes', 0) * 60
            if hasattr(session, 'total_work_seconds') and session.total_work_seconds:
                total_sec = session.total_work_seconds
            elif not total_sec and start_dt and end_dt:
                total_sec = int((end_dt - start_dt).total_seconds())

            # Break duration
            break_sec = getattr(session, 'total_break_seconds', 0)
            
            result.append({
                "id": session.id,
                "session_id": session.session_id,
                "employee_id": session.employee_id,
                "user_id": session.user_id,
                "user_name": user_name,
                "employee_name": user_name or session.employee_id,
                "role": final_role,
                "department": final_dept,
                "shift_id": session.shift_id,
                "shift_name": shift.shift_name if shift else session.shift_name,
                "shift_code": shift.shift_code if shift else None,
                "shift_start_time": shift.start_time if shift else None,
                "shift_end_time": shift.end_time if shift else None,
                "shift_color": shift.color if shift else None,
                "date": session.date or (start_dt.date() if start_dt else None),
                "month": getattr(session, 'month', None) or (start_dt.month if start_dt else None),
                "year": getattr(session, 'year', None) or (start_dt.year if start_dt else None),
                "started_at": start_dt,
                "ended_at": end_dt,
                "login_time": start_dt,
                "logout_time": end_dt,
                "total_work_seconds": total_sec,
                "total_break_seconds": break_sec,
                "status": session.status,
                "remark": getattr(session, 'remark', None),
                "is_early_login": getattr(session, 'is_early_login', False),
                "early_approval_status": "approved" if getattr(session, 'is_early_login', False) else None,
                "on_break": getattr(session, 'on_break', False),
                "current_break_start": getattr(session, 'current_break_start', None),
                "created_at": getattr(session, 'created_at', None) or start_dt,
                "breaks_count": 0, # Placeholder for batch update
                "break_logs": [] # Placeholder
            })
        
        # Batch-fetch break logs for all session IDs
        if result:
            s_ids = [r["session_id"] for r in result if r.get("session_id")]
            db_ids = [str(r["id"]) for r in result if r.get("id")]
            all_ids = list(set(s_ids + db_ids))
            
            if all_ids:
                breaks = db.query(shift_models.BreakLog).filter(shift_models.BreakLog.session_id.in_(all_ids)).all()
                # Group by session_id
                break_map = {}
                for b in breaks:
                    if b.session_id not in break_map: break_map[b.session_id] = []
                    # Convert to dict for schema compatibility if needed, 
                    # but since ShiftSessionOut uses BreakLogOut, and BreakLogOut has from_attributes=True,
                    # we can keep them as DB objects if the return is handled by FastAPI/Pydantic.
                    # However, _enrich_sessions returns a list of DICTS.
                    # So we should convert breaks to dicts too, and include our properties.
                    b_dict = {c.key: getattr(b, c.key) for c in b.__table__.columns}
                    # Manually add property aliases for frontend
                    b_dict["start_time"] = b.break_start
                    b_dict["end_time"] = b.break_end
                    break_map[b.session_id].append(b_dict)
                
                # Attach to results
                for r in result:
                    logs = break_map.get(r.get("session_id"), []) or break_map.get(str(r.get("id")), [])
                    r["break_logs"] = logs
                    r["breaks_count"] = len(logs)
        
        return result

    def get_staff_timesheet(self, db: Session, manager_employee_id: str = None):
        """Returns staff timesheet for a manager's team with full shift details."""
        from app.models.shift import ShiftSession, ShiftDefinition, ShiftAssignment
        from app.models.employee import Employee
        
        # 1. Gather team IDs recursively
        all_emps = db.query(Employee.employee_id, Employee.manager_id, Employee.reporting_manager_id, Employee.team_leader_id).all()
        team_ids = []
        if manager_employee_id:
            team_ids = {manager_employee_id}
            added = True
            while added:
                added = False
                current_count = len(team_ids)
                for e_id, mgr, rep_mgr, tl in all_emps:
                    if e_id not in team_ids and (mgr in team_ids or rep_mgr in team_ids or tl in team_ids):
                        team_ids.add(e_id)
                        added = True
                if len(team_ids) == current_count: break
            team_ids = list(team_ids)
        
        # 2. Build Joined Query
        query = (
            db.query(ShiftSession, ShiftDefinition)
            .outerjoin(ShiftDefinition, ShiftSession.shift_id == ShiftDefinition.id)
        )
        
        if team_ids:
            query = query.filter(ShiftSession.employee_id.in_(team_ids))
            
        rows = query.order_by(ShiftSession.date.desc(), ShiftSession.started_at.desc()).all()
        return self._enrich_sessions(db, rows)

    def get_team_attendance(self, db: Session, team_leader_id: str, user_id: str = None):
        from sqlalchemy import String, cast
        tl_ids = {team_leader_id} if team_leader_id else set()
        if user_id:
            tl_ids.add(user_id)
            tl_emp = db.query(emp_models.Employee).filter(emp_models.Employee.user_id == (int(user_id) if user_id.isdigit() else user_id)).first()
            if tl_emp:
                tl_ids.add(str(tl_emp.id))
                if tl_emp.employee_id:
                    tl_ids.add(tl_emp.employee_id)
        if team_leader_id:
            tl_emp_by_code = db.query(emp_models.Employee).filter(emp_models.Employee.employee_id == team_leader_id).first()
            if tl_emp_by_code:
                tl_ids.add(str(tl_emp_by_code.id))
                if tl_emp_by_code.user_id:
                    tl_ids.add(str(tl_emp_by_code.user_id))
        
        tl_ids = list(tl_ids)

        results = db.query(shift_models.ShiftSession, emp_models.Employee.first_name, emp_models.Employee.last_name, emp_models.Employee.role, emp_models.Employee.department)\
            .join(emp_models.Employee, or_(
                shift_models.ShiftSession.employee_id == emp_models.Employee.employee_id,
                shift_models.ShiftSession.employee_id == cast(emp_models.Employee.id, String)
            ))\
            .filter(
                or_(
                    emp_models.Employee.team_leader_id.in_(tl_ids),
                    emp_models.Employee.reporting_to_id.in_(tl_ids),
                    emp_models.Employee.manager_id.in_(tl_ids),
                    emp_models.Employee.reporting_manager_id.in_(tl_ids)
                ),
                emp_models.Employee.deleted_at == None
            ).order_by(shift_models.ShiftSession.started_at.desc()).all()
        return self._enrich_sessions(db, results)

attendance_service = AttendanceService()
shift_service = ShiftService()
