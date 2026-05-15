from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.company_profile import CompanyProfile, Department
from app.schemas.company_profile import CompanyProfileCreate, CompanyProfileUpdate, DepartmentCreate
from app.services.storage_service import storage_service
import logging

logger = logging.getLogger(__name__)

class CompanyService:
    def get_profile(self, db: Session) -> Optional[CompanyProfile]:
        # There is usually only one company profile.
        profile = db.query(CompanyProfile).first()
        if profile:
            if profile.logo_url:
                profile.logo_url = storage_service.get_public_url(profile.logo_url)
            if profile.leave_policy_url:
                profile.leave_policy_url = storage_service.get_public_url(profile.leave_policy_url)
        return profile

    async def create_or_update_profile(self, db: Session, obj_in: CompanyProfileUpdate) -> CompanyProfile:
        db_obj = db.query(CompanyProfile).first()
        
        update_data = obj_in.dict(exclude_unset=True)
        
        # Handle logo_url base64
        logo_url = update_data.get("logo_url")
        if logo_url and logo_url.startswith("data:image"):
            try:
                import base64
                import uuid
                import os
                from app.services.storage_service import storage_service
                
                # data:image/png;base64,iVBOR...
                header, encoded = logo_url.split(",", 1)
                # image/png;base64
                mime_part = header.split(":")[1]
                # image/png
                mime_type = mime_part.split(";")[0]
                ext = mime_type.split("/")[1]
                if ext == "jpeg": ext = "jpg"
                
                content = base64.b64decode(encoded)
                filename = f"company_logo.{ext}"
                
                update_data["logo_url"], _ = await storage_service.save_content(content, filename, sub_dir="company")
            except Exception as e:
                logger.error(f"Failed to process company logo: {e}")

        # Handle leave_policy_url base64
        policy_url = update_data.get("leave_policy_url")
        if policy_url and policy_url.startswith("data:"):
            try:
                import base64
                header, encoded = policy_url.split(",", 1)
                mime_part = header.split(":")[1]
                mime_type = mime_part.split(";")[0]
                ext = mime_type.split("/")[1]
                if ext == "pdf": 
                    pass
                elif "word" in mime_type:
                    ext = "docx"
                
                content = base64.b64decode(encoded)
                filename = f"leave_policy.{ext}"
                update_data["leave_policy_url"], _ = await storage_service.save_content(content, filename, sub_dir="company")
            except Exception as e:
                logger.error(f"Failed to process leave policy: {e}")
        
        if db_obj:
            for field, value in update_data.items():
                setattr(db_obj, field, value)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj
        else:
            db_obj = CompanyProfile(**update_data)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj

class DepartmentService:
    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[Department]:
        return db.query(Department).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: DepartmentCreate) -> Department:
        data = obj_in.dict(exclude_unset=True)
        db_obj = Department(
            name=data["name"],
            code=data.get("code"),
            description=data.get("description"),
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_name(self, db: Session, name: str) -> Optional[Department]:
        return db.query(Department).filter(Department.name == name).first()

company_service = CompanyService()
department_service = DepartmentService()
