from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class HolidayBase(BaseModel):
    name: str
    date: date
    type: Optional[str] = "Public"
    description: Optional[str] = None

class HolidayCreate(HolidayBase):
    pass

class HolidayOut(HolidayBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
