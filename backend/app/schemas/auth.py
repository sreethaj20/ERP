from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    full_name: Optional[str] = None

class UserOut(UserBase):
    id: int
    username: str
    employee_id: Optional[str] = None
    is_active: bool
    photo: Optional[str] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserOut] = None

class TokenPayload(BaseModel):
    sub: Optional[int] = None

class Login(BaseModel):
    username: str
    password: str

class PasswordChange(BaseModel):
    old_password: str
    new_password: str
