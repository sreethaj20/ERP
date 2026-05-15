from sqlalchemy.orm import Session
from app.models.holiday import Holiday
from app.schemas.holiday import HolidayCreate
from app.core.websocket_manager import websocket_manager
from datetime import date

class HolidayService:
    def get_all(self, db: Session):
        return db.query(Holiday).all()

    async def create(self, db: Session, obj_in: HolidayCreate):
        db_obj = Holiday(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # 1. Background sync
        await websocket_manager.broadcast({
            "event": "data_updated",
            "data": { "type": "holidays" }
        })
        # 2. UI Notification
        await websocket_manager.broadcast({
            "event": "new_announcement",
            "data": {
                "title": "New Company Holiday",
                "message": f"{db_obj.name} declared as a holiday on {db_obj.date}."
            }
        })
        return db_obj

    async def delete(self, db: Session, id: int):
        db_obj = db.query(Holiday).filter(Holiday.id == id).first()
        if db_obj:
            h_name = db_obj.name
            h_date = db_obj.date
            db.delete(db_obj)
            db.commit()
            
            # 1. Background sync
            await websocket_manager.broadcast({
                "event": "data_updated",
                "data": { "type": "holidays" }
            })
            # 2. UI Notification
            await websocket_manager.broadcast({
                "event": "new_announcement",
                "data": {
                    "title": "Holiday Cancelled",
                    "message": f"The holiday '{h_name}' on {h_date} has been removed."
                }
            })
            return True
        return False

holiday_service = HolidayService()
