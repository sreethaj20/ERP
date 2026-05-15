from sqlalchemy.orm import Session
from app.models.ticket import Ticket, TicketComment
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketCommentCreate
from typing import List, Optional

class TicketRepository:
    model = Ticket
    def get(self, db: Session, ticket_id: str) -> Optional[Ticket]:
        return db.query(Ticket).filter(Ticket.ticket_id == ticket_id, Ticket.deleted_at == None).first()

    def get_by_id(self, db: Session, id: int) -> Optional[Ticket]:
        return db.query(Ticket).filter(Ticket.id == id, Ticket.deleted_at == None).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[Ticket]:
        return db.query(Ticket).filter(Ticket.deleted_at == None).offset(skip).limit(limit).all()

    def get_by_employee(self, db: Session, employee_id: str) -> List[Ticket]:
        return db.query(Ticket).filter(Ticket.employee_id == employee_id, Ticket.deleted_at == None).all()

    def get_by_category(self, db: Session, category: str) -> List[Ticket]:
        return db.query(Ticket).filter(Ticket.category == category, Ticket.deleted_at == None).all()

    def create(self, db: Session, obj_in: TicketCreate) -> Ticket:
        db_obj = Ticket(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: Ticket, obj_in: TicketUpdate) -> Ticket:
        obj_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, id: int) -> Optional[Ticket]:
        from datetime import datetime
        obj = db.query(Ticket).filter(Ticket.id == id).first()
        if obj:
            obj.deleted_at = datetime.now()
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

class TicketCommentRepository:
    def get_by_ticket(self, db: Session, ticket_id: int) -> List[TicketComment]:
        return db.query(TicketComment).filter(TicketComment.ticket_id == ticket_id).all()

    def create(self, db: Session, obj_in: TicketCommentCreate) -> TicketComment:
        db_obj = TicketComment(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

ticket_repo = TicketRepository()
ticket_comment_repo = TicketCommentRepository()
