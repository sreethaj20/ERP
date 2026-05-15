from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentBase(BaseModel):
    name: str
    category: Optional[str] = None
    reference_id: Optional[str] = None
    module: Optional[str] = None

class DocumentCreate(DocumentBase):
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    owner_id: int

class DocumentOut(DocumentBase):
    id: int
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    owner_id: int
    public_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
