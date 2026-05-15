from pydantic import BaseModel
from typing import Optional, Any, List

class BaseResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None

class PaginatedResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[Any]

class ErrorResponse(BaseModel):
    success: bool = False
    detail: str
    code: Optional[str] = None
