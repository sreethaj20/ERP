from sqlalchemy import Column, String, Integer, Date, DateTime, Time, func, Boolean, ForeignKey, JSON, Text, Numeric, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    department = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    
    # Structural details
    location = Column(String(120), default="Remote")
    work_mode = Column(String(50), default="Onsite")
    employment_type = Column(String(50), default="Full-time")
    
    # Experience and Salary (Canonical fields)
    experience_min = Column(Numeric(4, 1), default=0.0)
    experience_max = Column(Numeric(4, 1), default=0.0)
    salary_min = Column(Numeric(15, 2))
    salary_max = Column(Numeric(15, 2))
    currency = Column(String(10), default="INR")
    
    skills_required = Column(Text) # Text field for skills list
    education_required = Column(String(200))
    positions_open = Column(Integer, default=1)
    
    reporting_manager_id = Column(String(30))
    priority = Column(String(20), default="medium")
    status = Column(String(30), default="open") # open, closed, draft
    
    created_by = Column(String(50))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    candidates = relationship("Candidate", back_populates="job")

class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(String(50), unique=True, index=True, nullable=False)
    job_id = Column(String(50), ForeignKey("jobs.job_id"))
    
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(20))
    
    # Career Details
    current_company = Column(String(200))
    current_designation = Column(String(100))
    total_experience_years = Column(Numeric(4, 2), default=0.00)
    relevant_experience_years = Column(Numeric(4, 2), default=0.00)
    
    current_ctc = Column(Numeric(15, 2))
    expected_ctc = Column(Numeric(15, 2))
    notice_period_days = Column(Integer, default=0)
    
    # Portfolio
    resume_url = Column(String(255))
    linkedin_url = Column(String(255))
    portfolio_url = Column(String(255))
    
    source = Column(String(50), default="LinkedIn")
    referred_by = Column(String(100))
    
    # Workflow (Unified)
    current_stage = Column(String(50), default="Telephonic") # Telephonic, Interview, Offer, Hired
    status = Column(String(30), default="active") # active, rejected, hired, withdrawn
    priority = Column(String(20), default="medium") # low, medium, high, urgent
    
    created_by = Column(String(30)) # employee_id
    recruiter_name = Column(String(150))
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    job = relationship("Job", back_populates="candidates")
    interviews = relationship("Interview", backref="candidate")

class Interview(Base):
    __tablename__ = "interviews"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    interview_id = Column(String(30), unique=True, index=True)
    candidate_id = Column(String(50), ForeignKey("candidates.candidate_id"), nullable=False)
    job_id = Column(String(50), ForeignKey("jobs.job_id"), nullable=False)
    
    round_number = Column(Integer, default=1)
    interview_type = Column(String(100), default="Technical")
    interview_mode = Column(String(30), default="virtual")
    
    interview_date = Column(Date, nullable=False)
    interview_time = Column(Time)
    duration_minutes = Column(Integer, default=60)
    meeting_link = Column(String(255))
    
    interview_round = Column(String(50))
    interviewer_names = Column(Text)
    interviewer_id = Column(String(30)) # employee_id
    feedback = Column(Text)
    overall_rating = Column(Numeric(3, 1))
    
    status = Column(String(30), default="Scheduled") # Scheduled, Completed, Cancelled
    result = Column(String(30)) # pass, fail
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

class Offer(Base):
    __tablename__ = "offers"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    offer_id = Column(String(50), unique=True, index=True, nullable=False)
    candidate_id = Column(String(50), ForeignKey("candidates.candidate_id"), nullable=False)
    job_id = Column(String(50), ForeignKey("jobs.job_id"), nullable=False)
    
    offered_at = Column(Date, server_default=func.current_date())
    joining_date = Column(Date, nullable=False)
    offer_expiry_date = Column(Date)
    
    # Financial Components
    offered_ctc = Column(Numeric(15, 2), default=0.00)
    fixed_component = Column(Numeric(15, 2), default=0.00)
    variable_component = Column(Numeric(15, 2), default=0.00)
    joining_bonus = Column(Numeric(15, 2), default=0.00)
    
    status = Column(String(30), default="sent") # sent, accepted, declined
    acceptance_date = Column(DateTime)
    rejection_reason = Column(Text)
    
    offer_date = Column(Date)
    department = Column(String(100))
    reporting_manager_id = Column(String(30))
    accepted_at = Column(DateTime)
    rejected_at = Column(DateTime)
    
    # Tracking
    relocation_bonus = Column(Numeric(15, 2), default=0.00)
    month = Column(String(20))
    sent_by = Column(String(50))
    sent_at = Column(DateTime)
    
    offer_letter_url = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

class ScreeningLog(Base):
    __tablename__ = "screening_logs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(String(50), ForeignKey("candidates.candidate_id"), index=True, nullable=False)
    screened_by = Column(String(30)) # employee_id
    
    type = Column(String(50)) # Telephonic, Screening, Assignment
    skill_match_score = Column(Numeric(4, 1))
    communication_score = Column(Numeric(4, 1))
    experience_match_score = Column(Numeric(4, 1))
    code_quality = Column(Numeric(4, 1))
    problem_solving = Column(Numeric(4, 1))
    timeliness = Column(Numeric(4, 1))
    
    notes = Column(Text)
    decision = Column(String(30)) # pass, fail, shortlisted, rejected
    created_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(String(50), unique=True, index=True, nullable=False)
    candidate_id = Column(String(50), ForeignKey("candidates.candidate_id"))
    job_id = Column(String(50), ForeignKey("jobs.job_id"))
    
    current_stage = Column(String(50), default="applied")
    status = Column(String(30), default="active") # active, rejected, hired
    
    applied_date = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
