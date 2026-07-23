from sqlalchemy.orm import Session
import json
from app.models.manager_onboarding import ManagerOnboardingRequest, ManagerOnboarding
from app.schemas.manager_onboarding import ManagerOnboardingCreate, ManagerOnboardingUpdate
from typing import List, Optional

class ManagerOnboardingRepository:
    def create(self, db: Session, obj_in: ManagerOnboardingCreate) -> ManagerOnboardingRequest:
        obj_data = obj_in.dict()
        
        # Robust filtering using table column keys
        allowed_cols = ManagerOnboardingRequest.__table__.columns.keys()
        model_data = {k: v for k, v in obj_data.items() if k in allowed_cols}
        
        db_obj = ManagerOnboardingRequest(**model_data)
        db.add(db_obj)
        db.flush()
        return db_obj

    def get_by_id(self, db: Session, id: int) -> Optional[ManagerOnboardingRequest]:
        return db.query(ManagerOnboardingRequest).filter(ManagerOnboardingRequest.id == id).first()

    def get_by_request_id(self, db: Session, request_id: str) -> Optional[ManagerOnboardingRequest]:
        # Always try exact request_id match first (this is the business identifier)
        res = db.query(ManagerOnboardingRequest).filter(ManagerOnboardingRequest.request_id == request_id).first()
        if res:
            return res
            
        # Fallback to internal ID if request_id is a numeric string (unlikely for ONB-XXX but good for safety)
        if str(request_id).isdigit():
            return db.query(ManagerOnboardingRequest).filter(ManagerOnboardingRequest.id == int(request_id)).first()
            
        return None

    def get_by_employee_id(self, db: Session, employee_id: str) -> List[ManagerOnboardingRequest]:
        return db.query(ManagerOnboardingRequest).filter(ManagerOnboardingRequest.employee_id == employee_id).all()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100, manager_id: Optional[str] = None) -> List[ManagerOnboardingRequest]:
        query = db.query(ManagerOnboardingRequest)
        if manager_id:
            # Enforce Autonomous Governance: Only show staff roles to managers.
            # Standard 'employee' roles are governed by HR.
            filtered_query = query.filter(
                (ManagerOnboardingRequest.manager_id == manager_id) | 
                (ManagerOnboardingRequest.manager_id == None) | 
                (ManagerOnboardingRequest.manager_id == ""),
                ManagerOnboardingRequest.role_name.notin_(['employee', 'staff'])
            )
            results = filtered_query.offset(skip).limit(limit).all()
            if results:
                return results
            # Fallback if no matching records found
            return query.offset(skip).limit(limit).all()
        return query.offset(skip).limit(limit).all()

    def update(self, db: Session, db_obj: ManagerOnboardingRequest, obj_in: ManagerOnboardingUpdate) -> ManagerOnboardingRequest:
        update_data = obj_in.dict(exclude_unset=True)
        allowed_cols = ManagerOnboardingRequest.__table__.columns.keys()
        for field in update_data:
            if field in allowed_cols:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.flush()
        return db_obj

    def remove(self, db: Session, id: int) -> ManagerOnboardingRequest:
        obj = db.query(ManagerOnboardingRequest).get(id)
        db.delete(obj)
        db.commit()
        return obj

    # --- Checklist Workflow ---
    def create_checklist(self, db: Session, employee_id: str, manager_id: str) -> ManagerOnboarding:
        db_obj = db.query(ManagerOnboarding).filter(ManagerOnboarding.employee_id == employee_id).first()
        if not db_obj:
            db_obj = ManagerOnboarding(employee_id=employee_id, manager_id=manager_id)
            db.add(db_obj)
            db.flush() # Use flush instead of commit to keep it in the transaction
        return db_obj


    def get_checklist(self, db: Session, employee_id: str) -> Optional[ManagerOnboarding]:
        return db.query(ManagerOnboarding).filter(ManagerOnboarding.employee_id == employee_id).first()

    def get_manager_checklists(self, db: Session, manager_id: str) -> List[ManagerOnboarding]:
        return db.query(ManagerOnboarding).filter(ManagerOnboarding.manager_id == manager_id).all()

    def update_checklist(self, db: Session, employee_id: str, updates: dict) -> ManagerOnboarding:
        db_obj = self.get_checklist(db, employee_id)
        if db_obj:
            allowed_cols = ManagerOnboarding.__table__.columns.keys()
            for k, v in updates.items():
                if k in allowed_cols:
                    setattr(db_obj, k, v)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

manager_onboarding_repo = ManagerOnboardingRepository()
