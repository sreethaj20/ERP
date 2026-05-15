from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

import re
import os

def sanitize_html(text: str) -> str:
    """Strip HTML tags to prevent simple script injection."""
    if not text or not isinstance(text, str): return ""
    return re.sub(r'<[^>]*>', '', text)

def validate_filename(filename: str) -> str:
    """Normalize and sanitize filename to prevent path traversal/command injection."""
    if not filename: return "unnamed_file"
    # Use os.path.basename to strip path separators
    clean = os.path.basename(filename)
    # Remove non-alphanumeric chars (keep dots, dashes, underscores)
    return re.sub(r'[^a-zA-Z0-9._-]', '', clean)
