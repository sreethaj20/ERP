import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory Token Blacklist (stores jti -> expiry timestamp)
_token_blacklist = set()

# In-memory User Revocation Registry (stores user_id -> revocation timestamp in seconds)
_user_revocation_timestamps: dict = {}

def blacklist_token(jti: str):
    """Add JWT ID (jti) to the token blacklist."""
    if jti:
        _token_blacklist.add(jti)

def is_token_blacklisted(jti: str) -> bool:
    """Check if JWT ID (jti) has been revoked."""
    return jti in _token_blacklist if jti else False

def revoke_user_tokens(user_id: Union[str, int]):
    """Revoke all tokens for a user ID globally."""
    if user_id is not None:
        import time
        _user_revocation_timestamps[str(user_id)] = time.time()

def is_user_revoked(user_id: Union[str, int], iat: Optional[Union[float, int]]) -> bool:
    """Check if user session was revoked globally after token was issued."""
    if user_id is None or iat is None:
        return False
    revoked_at = _user_revocation_timestamps.get(str(user_id))
    if revoked_at is not None:
        # If token was issued BEFORE (or equal to) the global user logout, consider it revoked
        # Allow 2 second tolerance for clock differences during logout processing
        return float(iat) <= (revoked_at + 2.0)
    return False

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": now,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "jti": str(uuid.uuid4()),
        "type": "access"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any]) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": now,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "jti": str(uuid.uuid4()),
        "type": "refresh"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str, expected_type: str = "access") -> dict:
    """Decodes and validates JWT claims strictly."""
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        issuer=settings.JWT_ISSUER,
        audience=settings.JWT_AUDIENCE
    )
    token_type = payload.get("type", "access")
    if token_type != expected_type:
        raise JWTError(f"Invalid token type: expected {expected_type}, got {token_type}")
    
    jti = payload.get("jti")
    if jti and is_token_blacklisted(jti):
        raise JWTError("Token has been revoked")
        
    sub = payload.get("sub")
    iat = payload.get("iat")
    if sub and is_user_revoked(sub, iat):
        raise JWTError("User session has been logged out globally across browsers")
        
    return payload

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
