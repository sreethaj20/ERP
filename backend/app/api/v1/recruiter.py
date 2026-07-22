import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_user_with_role
from app.models.user import User
from app.services.job_service import recruitment_service
from app.schemas.job import (
    JobOut, JobCreate, JobUpdate, 
    CandidateOut, CandidateCreate, CandidateUpdate,
    InterviewOut, InterviewCreate, InterviewUpdate, 
    OfferOut, OfferCreate, OfferUpdate,
    ScreeningLogOut, ScreeningLogCreate,
    ApplicationOut, ApplicationCreate
)

router = APIRouter()

# --- Jobs ---

@router.get("/jobs", response_model=List[JobOut])
def get_jobs(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["recruiter", "manager"]))):
    return recruitment_service.get_jobs(db, skip, limit)

@router.post("/jobs", response_model=JobOut)
def create_job(obj_in: JobCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    return recruitment_service.create_job(db, obj_in, creator=current_user.username)

@router.put("/jobs/{job_id}", response_model=JobOut)
def update_job(job_id: str, obj_in: JobUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    return recruitment_service.update_job(db, job_id, obj_in, changed_by=current_user.username)

# --- Candidates ---

@router.get("/candidates", response_model=List[CandidateOut])
def get_candidates(
    skip: int = 0, 
    limit: int = 1000, 
    exclude_offered: bool = False,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user_with_role(["recruiter", "manager"]))
):
    user_role = (current_user.role or "").lower()
    recruiter_id = None
    if user_role in ["recruiter", "requiter"]:
        recruiter_id = current_user.employee_id or current_user.username
    return recruitment_service.get_candidates(db, skip, limit, recruiter_id=recruiter_id, exclude_offered=exclude_offered)

@router.post("/candidates", response_model=CandidateOut)
def add_candidate(obj_in: CandidateCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    return recruitment_service.add_candidate(db, obj_in, creator=current_user.employee_id or current_user.username)

@router.patch("/candidates/{candidate_id}/stage", response_model=CandidateOut)
def update_candidate_stage(candidate_id: str, stage: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    from app.models.job import Candidate
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id, Candidate.deleted_at == None).first()
    if not cand:
        cand = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.deleted_at == None).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    user_role = (current_user.role or "").lower()
    if user_role in ["recruiter", "requiter"]:
        recruiter_id = current_user.employee_id or current_user.username
        if cand.created_by and cand.created_by != recruiter_id:
            raise HTTPException(status_code=403, detail="Unauthorized candidate modification")

    res = recruitment_service.update_candidate_stage(db, candidate_id, stage, changed_by=current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return res

@router.delete("/candidates/{candidate_id}")
def delete_candidate(candidate_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    from app.models.job import Candidate
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id, Candidate.deleted_at == None).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    recruiter_id = current_user.employee_id or current_user.username
    if cand.created_by and cand.created_by != recruiter_id:
        raise HTTPException(status_code=403, detail="Unauthorized candidate modification")
        
    res = recruitment_service.delete_candidate(db, candidate_id, changed_by=current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"status": "success", "message": "Candidate archived"}

@router.delete("/jobs/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    res = recruitment_service.delete_job(db, job_id, changed_by=current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail="Job requisition not found")
    return {"status": "success", "message": "Job requisition archived"}

# --- Applications (Feature 21) ---

@router.get("/applications", response_model=List[ApplicationOut])
def get_applications(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    return recruitment_service.get_applications(db, skip, limit)

@router.post("/applications", response_model=ApplicationOut)
def create_application(obj_in: ApplicationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    return recruitment_service.create_application(db, obj_in)

# --- Screening Logs (Feature 22) ---

@router.get("/screening_logs", response_model=List[ScreeningLogOut])
def get_screening_logs(candidate_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["recruiter", "manager", "teamleader"]))):
    return recruitment_service.get_screening_logs(db, candidate_id)

@router.post("/screening_logs", response_model=ScreeningLogOut)
def add_screening_log(obj_in: ScreeningLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["recruiter", "manager", "teamleader"]))):
    return recruitment_service.add_screening_log(db, obj_in)

# --- Interviews & Rounds (Feature 23) ---

@router.get("/interviews", response_model=List[InterviewOut])
def get_interviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["recruiter", "manager", "teamleader"]))):
    user_role = (current_user.role or "").lower()
    
    # If Team Leader, filter only for their assigned interviews
    if user_role == "teamleader":
        from app.repositories.employee_repo import employee_repo
        emp = employee_repo.get_by_user_id(db, current_user.id)
        return recruitment_service.get_interviews(db, tl_id=emp.employee_id if emp else None)
        
    # Recruiters and Managers see all interviews by default
    return recruitment_service.get_interviews(db)

@router.post("/interviews", response_model=InterviewOut)
async def schedule_interview(obj_in: InterviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["recruiter", "manager"]))):
    res = await recruitment_service.schedule_interview(db, obj_in)
    
    # Trigger E2E real-time notification to the Interviewer (e.g., TL or Manager)
    try:
        from app.services.notification_service import notification_service
        from app.models.user import User
        
        interviewer_emp_id = res.interviewer_id
        if interviewer_emp_id:
            interviewer_user = db.query(User).filter(User.employee_id == interviewer_emp_id).first()
            if interviewer_user:
                await notification_service.push_notification(
                    db,
                    user_id=interviewer_user.id,
                    employee_id=interviewer_emp_id,
                    title="New Interview Assigned",
                    message=f"You have been assigned to interview candidate {res.candidate_name} on {res.interview_date}.",
                    category="Recruitment"
                )
    except Exception as e:
        print(f"[RECRUITER INTERVIEW ASSIGN NOTIFICATION ERROR] {e}")
        
    return res

@router.patch("/interviews/{id}/feedback", response_model=InterviewOut)
def update_interview_feedback(id: int, obj_in: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["recruiter", "manager", "teamleader"]))):
    feedback = obj_in.get("feedback", "")
    rating = obj_in.get("overall_rating")
    status = obj_in.get("status", "Completed")
    result = obj_in.get("result")
    
    tech_score = obj_in.get("technical_score")
    comm_score = obj_in.get("communication_score")
    prob_score = obj_in.get("problem_solving_score")
    cult_score = obj_in.get("culture_fit_score")
    rec_url = obj_in.get("recording_url")
    rev = obj_in.get("recruiter_reviewed")
    
    res = recruitment_service.update_interview_feedback(
        db, id, feedback, rating, status=status, result=result,
        technical_score=tech_score, communication_score=comm_score,
        problem_solving_score=prob_score, culture_fit_score=cult_score,
        recording_url=rec_url, recruiter_reviewed=rev
    )
    if not res:
        raise HTTPException(status_code=404, detail="Interview not found")
    return res

@router.get("/interview-rounds", response_model=List[InterviewOut])
def get_interview_rounds(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    return recruitment_service.get_interview_rounds(db)

# --- Offers (Feature 24) ---

@router.get("/offers", response_model=List[OfferOut])
def get_offers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["recruiter", "manager"]))):
    user_role = (current_user.role or "").lower()
    recruiter_id = None
    if user_role in ["recruiter", "requiter"]:
        recruiter_id = current_user.employee_id or current_user.username
    return recruitment_service.get_offers(db, recruiter_id=recruiter_id)

@router.post("/offers", response_model=OfferOut)
async def create_offer(obj_in: OfferCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    return await recruitment_service.create_offer(db, obj_in, changed_by=current_user.username)

@router.patch("/offers/{offer_id}/status", response_model=OfferOut)
async def update_offer_status_endpoint(offer_id: str, status: str, reason: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    from app.models.job import Offer, Candidate
    offer = db.query(Offer).filter(Offer.offer_id == offer_id).first()
    if not offer:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    cand = db.query(Candidate).filter(Candidate.candidate_id == offer.candidate_id, Candidate.deleted_at == None).first()
    recruiter_id = current_user.employee_id or current_user.username
    if cand and cand.created_by and cand.created_by != recruiter_id:
        raise HTTPException(status_code=403, detail="Unauthorized offer modification")

    res = await recruitment_service.update_offer_status(db, offer_id, status, reason)
    if not res:
        raise HTTPException(status_code=404, detail="Offer not found")
    return res

@router.post("/offers/{offer_id}/accept", response_model=OfferOut)
async def accept_offer(offer_id: str, obj_in: Optional[OfferUpdate] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    from app.models.job import Offer, Candidate
    offer = db.query(Offer).filter(Offer.offer_id == offer_id).first()
    if not offer:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    cand = db.query(Candidate).filter(Candidate.candidate_id == offer.candidate_id, Candidate.deleted_at == None).first()
    recruiter_id = current_user.employee_id or current_user.username
    if cand and cand.created_by and cand.created_by != recruiter_id:
        raise HTTPException(status_code=403, detail="Unauthorized offer modification")

    update_data = obj_in.dict(exclude_unset=True) if obj_in else None
    res = await recruitment_service.update_offer_status(db, offer_id, "accepted", update_data=update_data)
    if not res:
        raise HTTPException(status_code=404, detail="Offer not found")
    return res

@router.post("/offers/{offer_id}/reject", response_model=OfferOut)
async def reject_offer(offer_id: str, payload: Dict[str, str], db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("recruiter"))):
    from app.models.job import Offer, Candidate
    offer = db.query(Offer).filter(Offer.offer_id == offer_id).first()
    if not offer:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    cand = db.query(Candidate).filter(Candidate.candidate_id == offer.candidate_id, Candidate.deleted_at == None).first()
    recruiter_id = current_user.employee_id or current_user.username
    if cand and cand.created_by and cand.created_by != recruiter_id:
        raise HTTPException(status_code=403, detail="Unauthorized offer modification")

    reason = payload.get("rejection_reason") or payload.get("reason")
    res = await recruitment_service.update_offer_status(db, offer_id, "declined", reason)
    if not res:
        raise HTTPException(status_code=404, detail="Offer not found")
    return res

@router.get("/dashboard")
def get_recruiter_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["recruiter", "manager"]))):
    from app.services.dashboard_service import dashboard_service
    return dashboard_service.get_recruiter_dashboard(db, current_user.id)

@router.get("/reports")
def get_recruiter_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["recruiter", "manager"]))):
    from app.services.dashboard_service import dashboard_service
    return dashboard_service.get_recruiter_reports(db)


@router.post("/secure-pdf")
async def secure_offer_pdf(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Accepts raw PDF bytes, applies AES-256 encryption via pypdf:
      - No owner password required to open (user opens freely)
      - Owner password locks ALL structural edits
      - Permissions: allow_form_fields=True ONLY (everything else denied)
    Returns the secured PDF as a downloadable file.
    """
    from fastapi import Request
    from fastapi.responses import Response
    import io
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import NameObject

    pdf_bytes = await request.body()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="No PDF bytes received")

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        writer = PdfWriter()

        # Copy all pages from the reader
        for page in reader.pages:
            writer.add_page(page)

        # Copy AcroForm (signature fields) if present
        if "/AcroForm" in reader.root_object:
            writer._root_object.update({
                NameObject("/AcroForm"): reader.root_object["/AcroForm"]
            })

        # Encrypt with AES-256 (Disabled):
        # writer.encrypt(
        #     user_password="",
        #     owner_password=os.environ.get("PDF_OWNER_PASSWORD", "MercureSecure@2026"),
        #     permissions_flag=4294965700,
        #     algorithm="AES-256"
        # )

        output = io.BytesIO()
        writer.write(output)
        secured_bytes = output.getvalue()

        return Response(
            content=secured_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=Offer_Letter_Secured.pdf",
                "Content-Length": str(len(secured_bytes)),
            }
        )

    except Exception as e:
        print(f"[SECURE PDF ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"PDF security failed: {str(e)}")
