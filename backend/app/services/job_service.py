from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import date, datetime
from app.models.job import Job, Candidate, Interview, Offer, ScreeningLog, Application
from app.models.notification import Activity
from app.models.hr_onboarding import HROnboardingRequest # Fix synchronization
from app.schemas.job import JobCreate, JobUpdate, CandidateCreate, CandidateUpdate, InterviewCreate, InterviewUpdate, OfferCreate, ScreeningLogCreate, ApplicationCreate
from sqlalchemy import func
from app.core.websocket_manager import websocket_manager
from app.services.audit_service import audit_service
from app.services.pdf_service import pdf_service
from app.services.storage_service import storage_service
import asyncio

class RecruitmentService:
    def _log_activity(self, db: Session, action: str, module: str, target_id: str, description: str, user_id: Optional[int] = None, username: Optional[str] = None):
        try:
            activity = Activity(
                user_id=user_id,
                username=username,
                action=action,
                module=module,
                type="General",
                target_id=target_id,
                description=description,
                message=description or action # Populate required message field
            )
            print(f"[DEBUG] Creating activity: {activity.action}, message: {getattr(activity, 'message', 'MISSING')}")
            db.add(activity)

        except Exception as e:
            print(f"Error logging activity: {e}")

    def _normalize_job(self, job: Job) -> Job:
        if not job: return job
        import json
        value = job.skills_required
        
        if value is None or value == "":
            job.skills_required = []
        elif isinstance(value, list):
            job.skills_required = value
        elif isinstance(value, str):
            v_stripped = value.strip()
            # 1. Try JSON list parsing
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    parsed = json.loads(v_stripped)
                    job.skills_required = parsed if isinstance(parsed, list) else []
                except:
                    job.skills_required = []
            # 2. Try Comma-separated fallback
            elif "," in v_stripped:
                job.skills_required = [x.strip() for x in v_stripped.split(",") if x.strip()]
            # 3. Single string fallback
            else:
                job.skills_required = [v_stripped] if v_stripped else []
        else:
            job.skills_required = []
            
        return job

    # --- Jobs ---
    def get_jobs(self, db: Session, skip: int = 0, limit: int = 100) -> List[Job]:
        jobs = db.query(Job).filter(Job.deleted_at == None).offset(skip).limit(limit).all()
        return [self._normalize_job(j) for j in jobs]

    def create_job(self, db: Session, obj_in: JobCreate, creator: Optional[str] = None) -> Job:
        from app.core.security import sanitize_html
        from sqlalchemy.exc import IntegrityError
        
        data = obj_in.dict(exclude={"job_id"})
        
        # Mapping legacy or frontend-specific fields
        if "job_description" in data:
            data["description"] = data.pop("job_description")
            
        if data.get("description"):
            data["description"] = sanitize_html(data["description"])
            
        # Feature 63: Manual serialization for TEXT column compatibility (skills_required is a list)
        import json
        if isinstance(data.get("skills_required"), list):
            data["skills_required"] = json.dumps(data["skills_required"])
            
        # Filter data to only include valid model columns to avoid TypeError
        allowed_cols = Job.__table__.columns.keys()
        filtered_data = {k: v for k, v in data.items() if k in allowed_cols}

        for attempt in range(5):
            db.begin_nested()
            try:
                max_id = db.query(func.max(Job.id)).scalar() or 0
                job_id = f"JOB-{str(max_id + 1).zfill(3)}"
                
                db_obj = Job(
                    **filtered_data,
                    job_id=job_id,
                    created_by=creator
                )
                db.add(db_obj)
                db.commit()
                break
            except IntegrityError:
                db.rollback()
                if attempt == 4:
                    raise
            except Exception:
                db.rollback()
                raise

        db.refresh(db_obj)
        self._log_activity(db, "CREATE_JOB", "Recruitment", job_id, f"Created new job requisition: {db_obj.title}")
        db.commit()
        return self._normalize_job(db_obj)

    def update_job(self, db: Session, job_id: str, obj_in: JobUpdate, changed_by: Optional[str] = None) -> Optional[Job]:
        db_obj = db.query(Job).filter(Job.job_id == job_id, Job.deleted_at == None).first()
        if not db_obj:
            return None
        
        old_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
        
        update_data = obj_in.dict(exclude_unset=True)
        
        allowed_cols = Job.__table__.columns.keys()
        for field, value in update_data.items():
            if field in allowed_cols:
                setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        new_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
        audit_service.log_action(db, "jobs", job_id, "UPDATE", changed_by, old_data, new_data)
        
        self._log_activity(db, "UPDATE_JOB", "Recruitment", job_id, f"Updated job requisition: {db_obj.title} (Status: {db_obj.status})", username=changed_by)
        db.commit()
        return self._normalize_job(db_obj)

    def delete_job(self, db: Session, job_id: str, changed_by: Optional[str] = None) -> bool:
        db_obj = db.query(Job).filter(Job.job_id == job_id, Job.deleted_at == None).first()
        if db_obj:
            old_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
            db_obj.deleted_at = datetime.now()
            db_obj.status = "deleted"
            db.add(db_obj)
            
            audit_service.log_action(db, "jobs", job_id, "DELETE", changed_by, old_data, {"deleted_at": str(db_obj.deleted_at)})
            self._log_activity(db, "DELETE_JOB", "Recruitment", job_id, f"Archived job requisition: {db_obj.title}", username=changed_by)
            db.commit()
            return True
        return False

    # --- Candidates ---
    def get_candidates(self, db: Session, skip: int = 0, limit: int = 100, recruiter_id: Optional[str] = None, exclude_offered: bool = False) -> List[Candidate]:
        query = db.query(Candidate).filter(Candidate.deleted_at == None)
        if recruiter_id:
            query = query.filter((Candidate.created_by == recruiter_id) | (Candidate.created_by == None))
        if exclude_offered:
            from app.models.job import Offer
            offered_cand_ids = db.query(Offer.candidate_id).filter(
                Offer.status.in_(["sent", "accepted"]),
                Offer.deleted_at == None
            )
            query = query.filter(~Candidate.candidate_id.in_(offered_cand_ids))
        candidates = query.offset(skip).limit(limit).all()
        for c in candidates:
            c.name = f"{c.first_name} {c.last_name or ''}".strip()
            if c.resume_url:
                c.resume_url = storage_service.get_public_url(c.resume_url)
        return candidates

    def add_candidate(self, db: Session, obj_in: CandidateCreate, creator: Optional[str] = None) -> Candidate:
        # Senior Audit: Prevent duplicate applications via email integrity check
        existing = db.query(Candidate).filter(Candidate.email == obj_in.email, Candidate.deleted_at == None).first()
        if existing:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Candidate with email {obj_in.email} is already registered in the pipeline.")

        data = obj_in.dict(exclude={"candidate_id", "name", "created_by"})
        
        allowed_cols = Candidate.__table__.columns.keys()
        filtered_data = {k: v for k, v in data.items() if k in allowed_cols}
        
        from sqlalchemy.exc import IntegrityError
        for attempt in range(5):
            db.begin_nested()
            try:
                # Scalable ID Generation for large intakes (e.g. 300+ students)
                max_id = db.query(func.max(Candidate.id)).scalar() or 0
                candidate_id = f"CND-{str(max_id + 1).zfill(5)}"
                
                db_obj = Candidate(
                    **filtered_data,
                    candidate_id=candidate_id,
                    created_by=creator
                )
                db.add(db_obj)
                db.commit()
                break
            except IntegrityError:
                db.rollback()
                if attempt == 4:
                    raise
            except Exception:
                db.rollback()
                raise
        
        db.refresh(db_obj)
        self._log_activity(db, "ADD_CANDIDATE", "Recruitment", candidate_id, f"Registered candidate: {db_obj.first_name} {db_obj.last_name}")
        db.commit()
        return db_obj

    def update_candidate_stage(self, db: Session, candidate_id: str, stage: str, changed_by: Optional[str] = None) -> Optional[Candidate]:
        db_obj = db.query(Candidate).filter(Candidate.candidate_id == candidate_id, Candidate.deleted_at == None).first()
        if not db_obj:
            db_obj = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        
        if db_obj:
            old_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
            old_stage = db_obj.current_stage
            db_obj.current_stage = stage
            # ... stage logic ...
            
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            
            new_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
            audit_service.log_action(db, "candidates", candidate_id, "UPDATE_STAGE", changed_by, old_data, new_data)
            
            self._log_activity(db, "UPDATE_CANDIDATE_STAGE", "Recruitment", candidate_id, f"Moved candidate from {old_stage} to {stage}", username=changed_by)
            db.commit()
        return db_obj

    def delete_candidate(self, db: Session, candidate_id: str, changed_by: Optional[str] = None) -> bool:
        db_obj = db.query(Candidate).filter(Candidate.candidate_id == candidate_id, Candidate.deleted_at == None).first()
        if db_obj:
            old_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
            db_obj.deleted_at = datetime.now()
            db_obj.status = "archived"
            db.add(db_obj)
            
            audit_service.log_action(db, "candidates", candidate_id, "ARCHIVE", changed_by, old_data, {"deleted_at": str(db_obj.deleted_at)})
            self._log_activity(db, "ARCHIVE_CANDIDATE", "Recruitment", candidate_id, f"Archived candidate: {db_obj.first_name} {db_obj.last_name}", username=changed_by)
            db.commit()
            return True
        return False

    # --- Applications (Feature 21) ---
    def create_application(self, db: Session, obj_in: ApplicationCreate) -> Application:
        count = db.query(func.count(Application.id)).scalar()
        app_id = f"APP-{str(count + 1).zfill(3)}"
        db_obj = Application(
            **obj_in.dict(exclude={"application_id"}),
            application_id=app_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_applications(self, db: Session, skip: int = 0, limit: int = 100) -> List[Application]:
        return db.query(Application).offset(skip).limit(limit).all()

    def update_application_status(self, db: Session, application_id: str, status: str) -> Optional[Application]:
        db_obj = db.query(Application).filter(Application.application_id == application_id).first()
        if db_obj:
            db_obj.status = status
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    # --- Screening ---
    def add_screening_log(self, db: Session, obj_in: ScreeningLogCreate) -> ScreeningLog:
        data = obj_in.dict()
        if data.get("candidate_id") and str(data["candidate_id"]).isdigit():
            cand = db.query(Candidate).filter(Candidate.id == int(data["candidate_id"]), Candidate.deleted_at == None).first()
            if cand: data["candidate_id"] = cand.candidate_id
            
        allowed_cols = ScreeningLog.__table__.columns.keys()
        filtered_data = {k: v for k, v in data.items() if k in allowed_cols}
            
        db_obj = ScreeningLog(**filtered_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        self._log_activity(db, "SCREENING_LOG", "Recruitment", db_obj.candidate_id, f"Added screening feedback ({db_obj.type}): Decision: {getattr(db_obj, 'decision', 'N/A')}")
        db.commit()
        return db_obj

    def get_screening_logs(self, db: Session, candidate_id: Optional[str] = None) -> List[ScreeningLog]:
        query = db.query(ScreeningLog)
        if candidate_id:
            query = query.filter(ScreeningLog.candidate_id == candidate_id)
        return query.all()

    # --- Interviews (Feature 23) ---
    def get_interviews(self, db: Session, recruiter_id: Optional[str] = None, manager_id: Optional[str] = None, tl_id: Optional[str] = None) -> List[Interview]:
        results = (
            db.query(Interview, Candidate.first_name.label("c_first"), Candidate.last_name.label("c_last"), Job.title.label("j_title"))
            .outerjoin(Candidate, Candidate.candidate_id == Interview.candidate_id)
            .outerjoin(Job, Job.job_id == Interview.job_id)
            .filter(Interview.deleted_at == None)
        )
        
        if manager_id:
            results = results.filter((Job.reporting_manager_id == manager_id) | (Interview.interviewer_id == manager_id))
        if tl_id:
            results = results.filter(Interview.interviewer_id == tl_id)
        if recruiter_id:
            results = results.filter(Candidate.created_by == recruiter_id)
        
        rows = results.all()
        interviews = []
        for row in rows:
            intv = row[0]
            intv.candidate_name = f"{row.c_first} {row.c_last or ''}".strip()
            intv.job_title = row.j_title
            intv.interview_id = intv.id
            interviews.append(intv)
            
        return interviews

    async def schedule_interview(self, db: Session, obj_in: InterviewCreate) -> Interview:
        # Combine date and time if present
        data = obj_in.dict()
        interview_date = data.pop("interview_date")
        interview_time = data.pop("interview_time", "10:00")
        
        # Auto-resolve numeric IDs from frontend
        if data.get("candidate_id") and str(data["candidate_id"]).isdigit():
            cand = db.query(Candidate).filter(Candidate.id == int(data["candidate_id"]), Candidate.deleted_at == None).first()
            if cand: data["candidate_id"] = cand.candidate_id
            
        if data.get("job_id") and str(data["job_id"]).isdigit():
            job = db.query(Job).filter(Job.id == int(data["job_id"])).first()
            if job: data["job_id"] = job.job_id
        
        try:
            time_obj = datetime.strptime(interview_time, "%H:%M").time()
        except:
            time_obj = datetime.min.time()
            
        allowed_cols = Interview.__table__.columns.keys()
        filtered_data = {k: v for k, v in data.items() if k in allowed_cols}
            
        db_obj = Interview(
            **filtered_data,
            interview_date=interview_date,
            interview_time=time_obj
        )
        # Auto-populate interviewer names if only ID is provided
        from app.models.employee import Employee
        if db_obj.interviewer_id and not db_obj.interviewer_names:
            interviewer = db.query(Employee).filter(Employee.employee_id == db_obj.interviewer_id).first()
            if interviewer:
                db_obj.interviewer_names = f"{interviewer.first_name} {interviewer.last_name or ''}".strip() or interviewer.name

        # Senior Audit: Conflict Detection (Interviewer availability with duration overlap)
        existing_interviews = db.query(Interview).filter(
            Interview.interviewer_id == db_obj.interviewer_id,
            Interview.interview_date == interview_date,
            Interview.status != "cancelled",
            Interview.deleted_at == None
        ).all()
        
        from datetime import datetime as dt, timedelta
        new_start = dt.combine(interview_date, time_obj)
        try:
            dur = int(db_obj.duration_minutes or 60)
        except:
            dur = 60
        new_end = new_start + timedelta(minutes=dur)
        
        for ext in existing_interviews:
            ext_time = ext.interview_time
            if ext_time:
                ext_start = dt.combine(ext.interview_date, ext_time)
                try:
                    ext_dur = int(ext.duration_minutes or 60)
                except:
                    ext_dur = 60
                ext_end = ext_start + timedelta(minutes=ext_dur)
                
                # Check range overlap: (new_start < ext_end) AND (new_end > ext_start)
                if new_start < ext_end and new_end > ext_start:
                    from fastapi import HTTPException
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Scheduling Conflict: {db_obj.interviewer_names or db_obj.interviewer_id} is already booked for an interview from {ext_time.strftime('%H:%M')} to {ext_end.strftime('%H:%M')} on {interview_date}."
                    )

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        self._log_activity(db, "SCHEDULE_INTERVIEW", "Recruitment", db_obj.candidate_id, f"Scheduled Interview Round {db_obj.round_number} ({db_obj.interview_type})")
        db.commit()

        # Real-time sync: Notify Interviewer & Dashboard
        await websocket_manager.broadcast({
            "type": "data_updated",
            "category": "recruitment",
            "entity": "interviews",
            "candidate_id": str(db_obj.candidate_id)
        })
        
        return db_obj

    def update_interview_feedback(
        self, db: Session, interview_id: int, feedback: str, rating: Optional[float] = None,
        status: str = "Completed", result: Optional[str] = None,
        technical_score: Optional[int] = None, communication_score: Optional[int] = None,
        problem_solving_score: Optional[int] = None, culture_fit_score: Optional[int] = None,
        recording_url: Optional[str] = None, recruiter_reviewed: Optional[bool] = None
    ):
        from app.core.security import sanitize_html
        db_obj = db.query(Interview).filter(Interview.id == interview_id).first()
        if db_obj:
            db_obj.feedback = sanitize_html(feedback) if feedback else None
            if rating is not None:
                db_obj.overall_rating = rating
                db_obj.rating = rating
            db_obj.status = status
            if result: db_obj.result = result
            if technical_score is not None: db_obj.technical_score = technical_score
            if communication_score is not None: db_obj.communication_score = communication_score
            if problem_solving_score is not None: db_obj.problem_solving_score = problem_solving_score
            if culture_fit_score is not None: db_obj.culture_fit_score = culture_fit_score
            if recording_url is not None: db_obj.recording_url = recording_url
            if recruiter_reviewed is not None: db_obj.recruiter_reviewed = recruiter_reviewed
            
            db_obj.updated_at = datetime.now()
            db_obj.deleted_at = None
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            
            self._log_activity(db, "UPDATE_INTERVIEW_FEEDBACK", "Recruitment", str(db_obj.candidate_id), f"Interview feedback updated — Result: {result or 'N/A'}")
            db.commit()
        return db_obj

    def get_interview_rounds(self, db: Session) -> List[Interview]:
        return self.get_interviews(db)

    # --- Offers (Feature 24) ---
    def get_offers(self, db: Session, recruiter_id: Optional[str] = None, manager_id: Optional[str] = None) -> List[Offer]:
        query = (
            db.query(Offer, Candidate.first_name.label("c_first"), Candidate.last_name.label("c_last"), Job.title.label("j_title"))
            .outerjoin(Candidate, Candidate.candidate_id == Offer.candidate_id)
            .outerjoin(Job, Job.job_id == Offer.job_id)
        )
        if recruiter_id:
            query = query.filter((Candidate.created_by == recruiter_id) | (Candidate.created_by == None))
        if manager_id:
            # Normalize: match both MGR001 and MGR-001 formats
            query = query.filter(
                (Offer.reporting_manager_id == manager_id) |
                (Offer.reporting_manager_id == manager_id.replace("-", "")) |
                (Offer.reporting_manager_id == manager_id.replace("MGR", "MGR-"))
            )
        results = query.all()
        
        offers = []
        for row in results:
            o = row[0]
            o.candidate_name = f"{row.c_first} {row.c_last or ''}".strip()
            o.job_title = row.j_title
            o.offer_status = o.status
            if o.offer_letter_url:
                o.offer_letter_url = storage_service.get_public_url(o.offer_letter_url)
            offers.append(o)
            
        return offers


    async def create_offer(self, db: Session, obj_in: OfferCreate, changed_by: Optional[str] = None) -> Offer:
        data = obj_in.dict(exclude={"offer_id", "ctc", "salary", "offer_status"})
        data.pop("ctc", None)
        data.pop("salary", None)
        data.pop("offer_status", None)
        
        if data.get("candidate_id") and str(data["candidate_id"]).isdigit():
            cand = db.query(Candidate).filter(Candidate.id == int(data["candidate_id"])).first()
            if cand: data["candidate_id"] = cand.candidate_id
            
        if data.get("job_id") and str(data["job_id"]).isdigit():
            job = db.query(Job).filter(Job.id == int(data["job_id"])).first()
            if job: data["job_id"] = job.job_id
        
        # CTC and Salary are now automatically parsed by Pydantic validator in OfferCreate
        data["offered_ctc"] = obj_in.ctc if obj_in.ctc is not None else data.get("offered_ctc")
        data["fixed_component"] = obj_in.salary if obj_in.salary is not None else data.get("fixed_component")
        
        if not data.get("offer_date"):
            data["offer_date"] = date.today()
        
        data["status"] = "sent"
        
        allowed_cols = Offer.__table__.columns.keys()
        filtered_data = {k: v for k, v in data.items() if k in allowed_cols}
        
        from sqlalchemy.exc import IntegrityError
        for attempt in range(5):
            db.begin_nested()
            try:
                count = db.query(func.count(Offer.id)).scalar()
                offer_id = f"OFR-{str(count + 1).zfill(3)}"
                
                db_obj = Offer(
                    **filtered_data,
                    offer_id=offer_id
                )
                
                # 📄 PDF Generation: Auto-create offer letter
                candidate = db.query(Candidate).filter(Candidate.candidate_id == db_obj.candidate_id).first()
                if candidate:
                    job_obj = db.query(Job).filter(Job.job_id == db_obj.job_id).first()
                    pdf_data = {
                        "name": f"{candidate.first_name} {candidate.last_name or ''}".strip(),
                        "candidate_id": candidate.candidate_id,
                        "designation": job_obj.title if job_obj else "Associate",
                        "department": job_obj.department if job_obj else "Operations",
                        "joining_date": db_obj.joining_date.strftime('%Y-%m-%d') if db_obj.joining_date else "TBD",
                        "salary": f"{db_obj.offered_ctc or 'As discussed'}",
                        "fixed": f"{db_obj.fixed_component or 0}",
                        "variable": f"{db_obj.variable_component or 0}"
                    }
                    db_obj.offer_letter_url = await pdf_service.generate_offer_letter(pdf_data)

                db.add(db_obj)
                db.commit()
                break
            except IntegrityError:
                db.rollback()
                if attempt == 4:
                    raise
            except Exception:
                db.rollback()
                raise

        db.refresh(db_obj)
        self.update_candidate_stage(db, db_obj.candidate_id, "Selected", changed_by=changed_by)
        
        self._log_activity(db, "CREATE_OFFER", "Recruitment", db_obj.candidate_id, f"Offer letter released to candidate {db_obj.candidate_id}", username=changed_by)
        audit_service.log_action(db, "offers", offer_id, "CREATE", changed_by, None, {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns})
        db.commit()
        return db_obj

    async def update_offer_status(self, db: Session, offer_id: str, status: str, reason: Optional[str] = None, update_data: Optional[dict] = None) -> Optional[Offer]:
        db_obj = db.query(Offer).filter(Offer.offer_id == offer_id).first()
        if not db_obj:
            db_obj = db.query(Offer).filter(Offer.id == offer_id).first()
            
        if db_obj:
            db_obj.status = status
            if update_data:
                for field, value in update_data.items():
                    if hasattr(db_obj, field) and value is not None:
                        setattr(db_obj, field, value)
            
            if status == "accepted":
                db_obj.accepted_at = datetime.now()
                # Update candidate stage to Hired
                self.update_candidate_stage(db, db_obj.candidate_id, "Hired")
                
                # Full End-to-End: Create User, Employee, and enter Onboarding queue
                cand = db.query(Candidate).filter(Candidate.candidate_id == db_obj.candidate_id).first()
                if cand:
                    from app.models.user import User
                    from app.models.employee import Employee
                    from app.models.hr_onboarding import HROnboardingRequest
                    from app.core.security import get_password_hash
                    
                    # Generate IDs using Centralized Utility
                    from app.utils.id_generator import generate_next_employee_id
                    new_emp_id = generate_next_employee_id(db)
                    
                    max_user_id = db.query(func.max(User.id)).scalar() or 0
                    new_username = f"usr_{max_user_id + 1}"
                    
                    # Extract update_data metadata silently passed from frontend
                    first_name = cand.first_name or "Unknown"
                    last_name = cand.last_name or ""
                    emp_type = update_data.get("employment_type", "Full-time") if update_data else "Full-time"
                    dept = update_data.get("department", "Default") if update_data else "Default"
                    desig = update_data.get("designation", "Employee") if update_data else "Employee"
                    mgr_id = (update_data.get("reporting_manager_id") or update_data.get("manager_id")) if update_data else None
                    joindate = update_data.get("joining_date") if update_data else date.today()

                    # --- UNIFIED IDENTITY PROVISIONING (Feature 45) ---
                    # 1. Provision User Login
                    new_user = User(
                        username=new_username,
                        email=cand.email,
                        hashed_password=get_password_hash("Mercure@123"),
                        role="employee", # System role (can be upgraded later)
                        full_name=f"{first_name} {last_name}".strip(),
                        employee_id=new_emp_id
                    )
                    db.add(new_user)
                    db.flush()
                    
                    # 2. Create Official Employee Core Record (Headcount visibility)
                    new_emp = Employee(
                        user_id=new_user.id,
                        employee_id=new_emp_id,
                        first_name=first_name,
                        last_name=last_name,
                        name=f"{first_name} {last_name}".strip(),
                        email=cand.email,
                        official_email=cand.email,
                        phone=cand.phone,
                        employment_type=emp_type,
                        department=dept,
                        designation=desig,
                        manager_id=mgr_id,
                        reporting_manager_id=mgr_id,
                        joining_date=joindate,
                        status="Onboarding"
                    )
                    db.add(new_emp)
                    db.flush()

                    # 3. ROUTING LOGIC: Determine Onboarding Portal
                    admin_roles = ["hr", "recruiter", "teamleader", "it", "itdepartment", "manager", "admin"]
                    current_role = desig.lower().replace(" ", "").replace("_", "")
                    current_dept = dept.lower().replace(" ", "").replace("_", "")
                    is_admin_onboarding = any(role in current_role for role in admin_roles) or any(role in current_dept for role in admin_roles)
                    
                    if is_admin_onboarding:
                        # ROUTE TO MANAGER PORTAL
                        from app.models.manager_onboarding import ManagerOnboardingRequest
                        max_mgr_id = db.query(func.max(ManagerOnboardingRequest.id)).scalar() or 0
                        onb_id = f"ONB-MGR-{str(max_mgr_id + 1).zfill(3)}"
                        
                        manager_onb = ManagerOnboardingRequest(
                            request_id=onb_id,
                            employee_id=new_emp_id,
                            first_name=first_name,
                            last_name=last_name,
                            login_email=cand.email,
                            personal_email=cand.email,
                            role_name=desig,
                            designation=desig,
                            department=dept,
                            join_date=joindate,
                            manager_id=mgr_id,
                            status="Pending",
                            manager_status="pending"
                        )
                        db.add(manager_onb)
                        print(f"[RECRUITMENT] Route staff {new_emp_id} to Manager Onboarding Hub.")
                    else:
                        # ROUTE TO HR PORTAL
                        from app.models.hr_onboarding import HROnboardingRequest
                        max_ob_id = db.query(func.max(HROnboardingRequest.id)).scalar() or 0
                        new_ob_id = f"ONB-{str(max_ob_id + 1).zfill(3)}"
                        new_onb = HROnboardingRequest(
                            request_id=new_ob_id,
                            employee_id=new_emp_id,
                            first_name=first_name,
                            last_name=last_name,
                            personal_email=cand.email,
                            official_email=cand.email,
                            designation=desig,
                            department=dept,
                            expected_join_date=joindate,
                            reporting_manager_id=mgr_id,
                            status="pending"
                        )
                        db.add(new_onb)
                        print(f"[RECRUITMENT] Route candidate {new_emp_id} to HR Onboarding Engine.")

                    # 📄 PDF Logic: Trigger Offer Letter for ALL
                    offer_data = {
                        "name": f"{first_name} {last_name}".strip(),
                        "job_id": db_obj.job_id,
                        "joining_date": joindate.strftime('%Y-%m-%d') if hasattr(joindate, 'strftime') else str(joindate),
                        "ctc": str(db_obj.offered_ctc),
                        "fixed": str(db_obj.fixed_component),
                        "variable": str(db_obj.variable_component or 0),
                        "designation": desig,
                        "department": dept
                    }
                    db_obj.offer_letter_url = await pdf_service.generate_offer_letter(offer_data)
                    
                    self._log_activity(db, "AUTO_HIRE", "Recruitment", new_emp_id, f"Auto-hired candidate {cand.email}")
                    
                    # Real-time sync: Notify HR & IT of new hire
                    await websocket_manager.broadcast({
                        "type": "data_updated",
                        "category": "onboarding",
                        "event": "new_hire_onboarding",
                        "employee_id": new_emp_id
                    })

            elif status == "declined":
                db_obj.rejected_at = datetime.now()
                db_obj.rejection_reason = reason
            
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            
            self._log_activity(db, "UPDATE_OFFER", "Recruitment", db_obj.candidate_id, f"Offer status updated to '{status}'")
            db.commit()
        return db_obj

recruitment_service = RecruitmentService()
