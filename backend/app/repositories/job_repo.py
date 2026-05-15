from sqlalchemy.orm import Session
from app.models.job import Job, Candidate, Interview, Offer
from app.schemas.job import JobCreate, JobUpdate, CandidateCreate, InterviewCreate, OfferCreate
from typing import List, Optional

class JobRepository:
    def get(self, db: Session, job_id: str) -> Optional[Job]:
        return db.query(Job).filter(Job.job_id == job_id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[Job]:
        return db.query(Job).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: JobCreate) -> Job:
        db_obj = Job(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

class CandidateRepository:
    def get(self, db: Session, candidate_id: str) -> Optional[Candidate]:
        return db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[Candidate]:
        return db.query(Candidate).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: CandidateCreate) -> Candidate:
        db_obj = Candidate(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

class InterviewRepository:
    def get_by_job(self, db: Session, job_id: str) -> List[Interview]:
        return db.query(Interview).filter(Interview.job_id == job_id).all()

    def get_by_candidate(self, db: Session, candidate_id: str) -> List[Interview]:
        return db.query(Interview).filter(Interview.candidate_id == candidate_id).all()

    def create(self, db: Session, obj_in: InterviewCreate) -> Interview:
        db_obj = Interview(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

class OfferRepository:
    def get_by_candidate(self, db: Session, candidate_id: str) -> Optional[Offer]:
        return db.query(Offer).filter(Offer.candidate_id == candidate_id).first()

    def create(self, db: Session, obj_in: OfferCreate) -> Offer:
        db_obj = Offer(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

job_repo = JobRepository()
candidate_repo = CandidateRepository()
interview_repo = InterviewRepository()
offer_repo = OfferRepository()
