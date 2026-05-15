from sqlalchemy.orm import Session
from app.models.document import Document
from typing import List, Optional

class DocumentRepository:
    def get(self, db: Session, id: int) -> Optional[Document]:
        return db.query(Document).filter(Document.id == id).first()

    def get_by_owner(self, db: Session, user_id: int) -> List[Document]:
        return db.query(Document).filter(Document.owner_id == user_id).all()

    def get_by_reference(self, db: Session, reference_id: str, module: str = None) -> List[Document]:
        query = db.query(Document).filter(Document.reference_id == reference_id)
        if module:
            query = query.filter(Document.module == module)
        return query.all()

    def create(self, db: Session, obj: dict) -> Document:
        db_obj = Document(**obj)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int) -> bool:
        db_obj = self.get(db, id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False

document_repo = DocumentRepository()
