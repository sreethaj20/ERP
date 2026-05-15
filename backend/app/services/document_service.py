from sqlalchemy.orm import Session
from typing import Any
from app.repositories.document_repo import document_repo
from app.schemas.document import DocumentCreate
import os
import shutil
from fastapi import UploadFile
from datetime import datetime

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

from app.core.security import validate_filename
from app.services.storage_service import storage_service
from app.services.audit_service import audit_service
from fastapi import HTTPException

class DocumentService:
    ALLOWED_EXTENSIONS = {
        ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp", ".tiff",
        ".docx", ".doc", ".xlsx", ".xls", ".csv", ".txt", ".pptx", ".ppt", ".zip", ".rar"
    }
    MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB

    async def upload_document(self, db: Session, file: UploadFile, owner_id: int, module: str = None, reference_id: str = None, category: str = "General", changed_by: str = None, candidate_name: str = None):
        # 1. Validate Extension
        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
        if ext and ext not in self.ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
            
        # 2. Sanitize Filename
        clean_name = validate_filename(file.filename)
        
        # 2.5. Read Content Once
        content = await file.read()
        actual_size = len(content)
        
        if actual_size > self.MAX_FILE_SIZE:
             raise HTTPException(status_code=413, detail=f"File too large. Max allowed: {self.MAX_FILE_SIZE // (1024*1024)}MB")

        # 3. Use abstract StorageService (Scalable to S3/Cloud)
        try:
            # Enhanced folder structure & filename: use candidate name for onboarding module
            target_dir = module or "general"
            target_filename = file.filename
            c_name = None
            
            c_name = candidate_name
            
            # If no explicit name, try resolving from reference_id (across modules)
            if not c_name and reference_id:
                print(f"[DOCUMENT SERVICE] Resolving name for reference_id: {reference_id} (Module: {module})")
                # 1. Try Employee Repo (by employee_id or PK)
                try:
                    from app.repositories.employee_repo import employee_repo
                    emp = employee_repo.get(db, reference_id)
                    if emp:
                        c_name = emp.name or f"{emp.first_name}_{emp.last_name}"
                        print(f"[DOCUMENT SERVICE] Found employee name: {c_name}")
                except:
                    pass
                
                # 2. Try User Repo (Maybe it's a user_id?)
                if not c_name:
                    try:
                        from app.models.user import User
                        from app.repositories.employee_repo import employee_repo
                        if str(reference_id).isdigit():
                            user = db.query(User).filter(User.id == int(reference_id)).first()
                            if user:
                                emp = employee_repo.get_by_user_id(db, user.id)
                                if emp:
                                    c_name = emp.name or f"{emp.first_name}_{emp.last_name}"
                                else:
                                    c_name = user.full_name or user.username
                                print(f"[DOCUMENT SERVICE] Found name via user_id: {c_name}")
                    except:
                        pass

                # 3. Try Manager Onboarding Repo
                if not c_name:
                    try:
                        from app.repositories.manager_onboarding_repo import manager_onboarding_repo
                        req = manager_onboarding_repo.get_by_request_id(db, reference_id)
                        if req:
                            c_name = f"{req.first_name}_{req.last_name}"
                            print(f"[DOCUMENT SERVICE] Found name via manager onboarding: {c_name}")
                    except:
                        pass
                
                # 4. Try HR Onboarding Repo
                if not c_name:
                    try:
                        from app.repositories.hr_onboarding_repo import hr_onboarding_repo
                        hreq = hr_onboarding_repo.get_by_request_id(db, reference_id)
                        if hreq:
                            c_name = hreq.name or f"{hreq.first_name}_{hreq.last_name}"
                            print(f"[DOCUMENT SERVICE] Found name via HR onboarding: {c_name}")
                    except:
                        pass
            
            if not c_name:
                print(f"[DOCUMENT SERVICE] Could not resolve name for reference_id: {reference_id}. Falling back to default.")

            if c_name:
                c_name_clean = c_name.strip().strip("_").replace(" ", "_").replace(".", "").replace("__", "_")
                target_dir = f"{module}/{c_name_clean}" if module else c_name_clean
                # Prefix filename with candidate name for better S3 recognition
                target_filename = f"{c_name_clean.lower()}_{file.filename}"
            else:
                target_dir = module or "general"
                target_filename = file.filename

            path, saved_size = await storage_service.save_content(content, target_filename, sub_dir=target_dir)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"File storage failed: {str(e)}")
            
        doc_data = {
            "name": clean_name,
            "file_path": path,
            "file_type": file.content_type,
            "file_size": saved_size,
            "owner_id": owner_id,
            "module": module,
            "reference_id": reference_id,
            "category": category
        }
        res = document_repo.create(db, doc_data)
        
        # Audit Log
        audit_service.log_action(db, "documents", str(res.id), "UPLOAD", changed_by or str(owner_id), None, doc_data)
        
        return self.hydrate_document(res)

    def hydrate_document(self, doc: Any) -> Any:
        """Centralized normalization of file URLs for documents."""
        if not doc: return doc
        # We add a dynamic property 'public_url' for the frontend
        doc.public_url = storage_service.get_public_url(doc.file_path)
        return doc

    def get_user_documents(self, db: Session, user_id: int):
        docs = document_repo.get_by_owner(db, user_id)
        return [self.hydrate_document(d) for d in docs]

    def get_module_documents(self, db: Session, reference_id: str, module: str = None):
        docs = document_repo.get_by_reference(db, reference_id, module)
        return [self.hydrate_document(d) for d in docs]

    def delete_document(self, db: Session, id: int, changed_by: str = None):
        db_obj = document_repo.get(db, id)
        if db_obj:
            # Audit Log
            old_data = {c.name: getattr(db_obj, c.name) for c in db_obj.__table__.columns}
            audit_service.log_action(db, "documents", str(id), "DELETE", changed_by, old_data, None)
            
            # Physical Delete via StorageService
            storage_service.delete_file(db_obj.file_path)
            return document_repo.delete(db, id)
        return False

    def log_document_access(self, db: Session, document_id: int, user_id: int, employee_name: str, ip_address: str = None):
        from app.models.document import DocumentAccessLog
        log = DocumentAccessLog(
            document_id=document_id,
            user_id=user_id,
            employee_name=employee_name,
            ip_address=ip_address,
            action="download"
        )
        db.add(log)
        db.commit()
        return log

    def get_document(self, db: Session, id: int):
        return document_repo.get(db, id)

document_service = DocumentService()
