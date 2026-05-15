from sqlalchemy.orm import Session
from datetime import datetime
from app.repositories.ticket_repo import ticket_repo, ticket_comment_repo
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketCommentCreate
from app.core.exceptions import ResourceNotFoundException

from app.core.security import sanitize_html
from app.services.storage_service import storage_service

class TicketService:
    def __init__(self):
        self.repo = ticket_repo

    @staticmethod
    def hydrate_attachment(t):
        """Explicitly extract attachments from JSON array into URLs.
        We provide attachment_url (legacy/first) and attachment_urls (complete list)."""
        import json
        raw_att = getattr(t, 'attachments', None)
        t.attachment_urls = []
        if raw_att:
            try:
                parsed = json.loads(raw_att)
                if isinstance(parsed, list):
                    t.attachment_urls = [storage_service.get_public_url(p) for p in parsed if p]
                    if t.attachment_urls:
                        t.attachment_url = t.attachment_urls[0]
                elif isinstance(parsed, str) and parsed:
                    url = storage_service.get_public_url(parsed)
                    t.attachment_url = url
                    t.attachment_urls = [url]
            except Exception:
                if isinstance(raw_att, str) and raw_att:
                    url = storage_service.get_public_url(raw_att)
                    t.attachment_url = url
                    t.attachment_urls = [url]

    async def create_ticket(self, db: Session, obj_in: TicketCreate):
        # Include department in the base data dict
        data = obj_in.dict(exclude={"attachments", "recipient"})
        
        # generate ticket_id if not provided
        if not data.get("ticket_id"):
            from sqlalchemy import func
            from app.models.ticket import Ticket
            count = db.query(func.count(Ticket.id)).scalar()
            data["ticket_id"] = f"TKT-{str(count + 1).zfill(3)}"
        
        # Handle attachments (Base64 list or single string)
        raw_attachments = obj_in.attachments
        processed_paths = []
        if raw_attachments:
            import base64
            # Normalize to list
            if isinstance(raw_attachments, str):
                att_list = [raw_attachments]
            elif isinstance(raw_attachments, list):
                att_list = raw_attachments
            else:
                att_list = []
                
            for i, att in enumerate(att_list):
                if att and isinstance(att, str) and att.startswith("data:"):
                    try:
                        header, encoded = att.split(",", 1)
                        mime_part = header.split(":")[1]
                        mime_type = mime_part.split(";")[0]
                        ext = mime_type.split("/")[1]
                        if ext == "jpeg": ext = "jpg"
                        
                        content = base64.b64decode(encoded)
                        filename = f"ticket_{data['ticket_id']}_{i}.{ext}"
                        
                        path, _ = await storage_service.save_content(content, filename, sub_dir="tickets")
                        processed_paths.append(path)
                    except Exception as e:
                        print(f"[TICKET SERVICE ERROR] Attachment processing failed: {e}")
                elif att and isinstance(att, str):
                    processed_paths.append(att)

        import json
        data["attachments"] = json.dumps(processed_paths)
        
        # Normalization and Fallbacks for Physical DB Constraints (NotNullViolation Fix)
        if obj_in.recipient: data["category"] = obj_in.recipient
        if obj_in.department: data["category"] = obj_in.department
        
        if not data.get("department"):
            data["department"] = data.get("category", "General")
            
        if not data.get("title"):
            # Fallback to description or default if title is missing
            desc = data.get("description") or data.get("issue") or "Support Request"
            data["title"] = desc[:197] + "..." if len(desc) > 200 else desc

        from app.models.ticket import Ticket
        db_obj = Ticket(**data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        self.hydrate_attachment(db_obj)
        return db_obj

    def get_my_tickets(self, db: Session, employee_id: str):
        tickets = ticket_repo.get_by_employee(db, employee_id)
        for t in tickets:
            self.hydrate_attachment(t)
        return tickets

    def get_all_tickets(self, db: Session, skip: int = 0, limit: int = 100, category: str = None):
        if category:
            from app.models.ticket import Ticket
            tickets = db.query(Ticket).filter(Ticket.category == category, Ticket.deleted_at == None).offset(skip).limit(limit).all()
        else:
            tickets = ticket_repo.get_multi(db, skip, limit)
            
        for t in tickets:
            self.hydrate_attachment(t)
        return tickets

    def update_ticket(self, db: Session, ticket_id: str, obj_in: TicketUpdate):
        db_obj = ticket_repo.get(db, ticket_id)
        if not db_obj:
            raise ResourceNotFoundException("Ticket", ticket_id)
        return self._perform_update(db, db_obj, obj_in)

    def update_ticket_by_id(self, db: Session, id: int, obj_in: TicketUpdate):
        db_obj = ticket_repo.get_by_id(db, id)
        if not db_obj:
            raise ResourceNotFoundException("Ticket", str(id))
        return self._perform_update(db, db_obj, obj_in)

    def _perform_update(self, db: Session, db_obj, obj_in: TicketUpdate):
        status_upper = obj_in.status.upper() if obj_in.status else ""
        if status_upper == "RESOLVED" or status_upper == "CLOSED":
            db_obj.resolved_at = datetime.now()
            # Normalize to Title Case for UI consistency
            obj_in.status = "Resolved" if status_upper == "RESOLVED" else "Closed"
        elif status_upper == "IN PROGRESS":
            obj_in.status = "In Progress"
        elif status_upper == "OPEN":
            obj_in.status = "Open"
        
        res = ticket_repo.update(db, db_obj, obj_in)
        
        # Real-time event (Feature 38)
        try:
            from app.core.websocket_manager import websocket_manager
            import asyncio
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(websocket_manager.broadcast({
                    "event": "data_updated",
                    "data": {
                        "type": "tickets",
                        "ticket_id": db_obj.ticket_id,
                        "status": res.status,
                        "category": res.category
                    }
                }))
        except RuntimeError:
            # Handle cases where no event loop is running (e.g. CLI scripts)
            print("[WS] Skipping broadcast: No active event loop.")
        except Exception as e:
            print(f"[WS] Broadcast error: {e}")
        
        return res

    def add_comment(self, db: Session, ticket_id: int, author_id: str, author_name: str, comment: str):
        sanitized_comment = sanitize_html(comment)
        obj_in = TicketCommentCreate(ticket_id=ticket_id, author_id=author_id, author_name=author_name, comment=sanitized_comment)
        return ticket_comment_repo.create(db, obj_in)

ticket_service = TicketService()
