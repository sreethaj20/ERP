from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Any, Dict
from datetime import date, datetime, time
from decimal import Decimal

class JobBase(BaseModel):
    job_id: Optional[str] = None
    title: str
    department: str
    description: str
    location: Optional[str] = "Remote"
    work_mode: Optional[str] = "Onsite"
    employment_type: Optional[str] = "Full-time"
    experience_min: Optional[float] = 0.0
    experience_max: Optional[float] = 0.0
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    currency: Optional[str] = "INR"
    skills_required: Optional[List[str]] = []
    education_required: Optional[str] = None
    positions_open: Optional[int] = 1
    reporting_manager_id: Optional[str] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "open"

    @validator('experience_min', 'experience_max', 'salary_min', 'salary_max', pre=True)
    def parse_numeric_fields(cls, v):
        if v is None or v == "": return 0.0
        if isinstance(v, (int, float, Decimal)): return float(v)
        import re
        match = re.search(r'([0-9.]+)', str(v))
        if match:
            try:
                return float(match.group(1))
            except:
                return 0.0
        return 0.0

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None

class JobOut(JobBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CandidateBase(BaseModel):
    candidate_id: Optional[str] = None
    job_id: str
    first_name: str
    last_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    current_company: Optional[str] = None
    current_designation: Optional[str] = None
    total_experience_years: Optional[Decimal] = Decimal("0.00")
    relevant_experience_years: Optional[Decimal] = Decimal("0.00")
    current_ctc: Optional[Decimal] = Decimal("0.00")
    expected_ctc: Optional[Decimal] = Decimal("0.00")
    notice_period_days: Optional[int] = 0
    resume_url: Optional[str] = None
    source: Optional[str] = "LinkedIn"
    referred_by: Optional[str] = None
    current_stage: Optional[str] = "Telephonic"
    application_status: Optional[str] = "active"
    priority: Optional[str] = "medium"
    created_by: Optional[str] = None
    recruiter_name: Optional[str] = None

    @validator('total_experience_years', 'relevant_experience_years', 'current_ctc', 'expected_ctc', pre=True)
    def parse_candidate_numeric(cls, v):
        if v is None or v == "": return Decimal("0.00")
        if isinstance(v, (int, float, Decimal)): return Decimal(str(v))
        import re
        match = re.search(r'([0-9.]+)', str(v))
        if match:
            try:
                return Decimal(match.group(1))
            except:
                return Decimal("0.00")
        return Decimal("0.00")

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    current_stage: Optional[str] = None
    application_status: Optional[str] = None

class CandidateOut(CandidateBase):
    id: int
    name: Optional[str] = None # For frontend compat
    created_at: datetime

    class Config:
        from_attributes = True

class ScreeningLogBase(BaseModel):
    candidate_id: str
    screened_by: Optional[str] = None
    type: Optional[str] = None
    skill_match_score: Optional[int] = 5
    communication_score: Optional[int] = 5
    experience_match_score: Optional[int] = 5
    code_quality: Optional[int] = 5
    problem_solving: Optional[int] = 5
    timeliness: Optional[int] = 5
    notes: Optional[str] = None
    decision: Optional[str] = "shortlisted"

class ScreeningLogCreate(ScreeningLogBase):
    pass

class ScreeningLogOut(ScreeningLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class InterviewBase(BaseModel):
    candidate_id: str
    job_id: str
    round_number: Optional[int] = 1
    interview_type: Optional[str] = "Technical"
    interview_date: date
    interview_time: Optional[str] = "10:00"
    interviewer_id: Optional[str] = None
    meeting_link: Optional[str] = None
    interview_mode: Optional[str] = "virtual"
    interview_round: Optional[str] = None
    interviewer_names: Optional[str] = None
    duration_minutes: Optional[int] = 60

    @validator('interview_date', pre=True)
    def parse_interview_date(cls, v):
        if isinstance(v, str):
            if 'T' in v:
                return v.split('T')[0]
        return v

    @validator('interview_time', pre=True, always=True)
    def coerce_time_to_str(cls, v):
        if v is None:
            return "10:00"
        if isinstance(v, time):
            return v.strftime("%H:%M")
        return str(v) if v else "10:00"

class InterviewCreate(InterviewBase):
    pass

class InterviewUpdate(BaseModel):
    feedback: Optional[str] = None
    rating: Optional[Decimal] = None
    status: Optional[str] = "Scheduled" # Scheduled, Completed, Cancelled
    result: Optional[str] = None # pass, fail
    interview_mode: Optional[str] = None
    interview_round: Optional[str] = None
    interviewer_names: Optional[str] = None
    duration_minutes: Optional[int] = None

class InterviewOut(InterviewBase):
    id: int
    interview_id: Optional[int] = None # Frontend compatibility
    status: str
    result: Optional[str] = None
    feedback: Optional[str] = None
    candidate_name: Optional[str] = None # Joined field
    job_title: Optional[str] = None      # Joined field
    created_at: datetime

    class Config:
        from_attributes = True

class OfferBase(BaseModel):
    offer_id: Optional[str] = None
    candidate_id: str
    job_id: str
    offer_date: Optional[date] = None
    joining_date: date
    offer_expiry_date: Optional[date] = None
    
    @validator('offer_date', 'joining_date', 'offer_expiry_date', pre=True)
    def parse_offer_dates(cls, v):
        if isinstance(v, str):
            if 'T' in v:
                return v.split('T')[0]
        return v
    department: Optional[str] = None
    employment_type: Optional[str] = "Full-Time"
    reporting_manager_id: Optional[str] = None
    offered_ctc: Optional[Decimal] = Decimal("0.00")
    ctc: Optional[Decimal] = None  # alias sent by frontend — mapped in service
    salary: Optional[Decimal] = None  # OfferManagement sends salary as fixed_component
    fixed_component: Optional[Decimal] = Decimal("0.00")
    variable_component: Optional[Decimal] = Decimal("0.00")
    joining_bonus: Optional[Decimal] = Decimal("0.00")
    relocation_bonus: Optional[Decimal] = Decimal("0.00")
    month: Optional[str] = None
    sent_by: Optional[str] = None
    sent_at: Optional[datetime] = None
    offer_letter_url: Optional[str] = None
    offer_status: Optional[str] = None  # frontend sometimes sends offer_status instead of status

    @validator('offered_ctc', 'fixed_component', 'variable_component', 'joining_bonus', 'relocation_bonus', 'ctc', 'salary', pre=True)
    def parse_offer_numeric(cls, v):
        if v is None or v == "": return Decimal("0.00")
        if isinstance(v, (int, float, Decimal)): return Decimal(str(v))
        import re
        match = re.search(r'([0-9.]+)', str(v))
        if match:
            try:
                return Decimal(match.group(1))
            except:
                return Decimal("0.00")
        return Decimal("0.00")

class OfferCreate(OfferBase):
    status: Optional[str] = "sent"

class OfferUpdate(BaseModel):
    status: str # sent, accepted, declined
    rejection_reason: Optional[str] = None
    joining_date: Optional[date] = None
    department: Optional[str] = None
    employment_type: Optional[str] = None
    reporting_manager_id: Optional[str] = None

class OfferOut(OfferBase):
    id: int
    status: str
    offer_status: Optional[str] = None  # mirror of status for frontend compat
    candidate_name: Optional[str] = None # Joined field
    job_title: Optional[str] = None      # Joined field
    created_at: datetime
    accepted_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True

    def model_post_init(self, __context: Any) -> None:
        if self.offer_status is None:
            object.__setattr__(self, 'offer_status', self.status)

class ApplicationBase(BaseModel):
    application_id: Optional[str] = None
    candidate_id: str
    job_id: str
    current_stage: Optional[str] = "applied"
    status: Optional[str] = "active"

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationOut(ApplicationBase):
    id: int
    applied_date: datetime
    
    class Config:
        from_attributes = True
