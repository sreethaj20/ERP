from datetime import datetime, timedelta, timezone
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

# Define the limiter with client IP as the key
limiter = Limiter(key_func=get_remote_address)

# Account-based lockout tracker (identifier -> {attempts: int, locked_until: datetime})
_account_lockouts = {}

MAX_FAILED_ATTEMPTS = 100
LOCKOUT_MINUTES = 15

def record_failed_attempt(identifier: str) -> bool:
    """Records a failed login attempt for an identifier. Returns True if account is now locked."""
    if not identifier:
        return False
    identifier = identifier.strip().lower()
    now = datetime.now(timezone.utc)
    
    data = _account_lockouts.get(identifier, {"attempts": 0, "locked_until": None})
    
    # If lock has expired, reset counter
    if data["locked_until"] and now > data["locked_until"]:
        data = {"attempts": 0, "locked_until": None}
        
    data["attempts"] += 1
    if data["attempts"] >= MAX_FAILED_ATTEMPTS:
        data["locked_until"] = now + timedelta(minutes=LOCKOUT_MINUTES)
        _account_lockouts[identifier] = data
        return True
        
    _account_lockouts[identifier] = data
    return False

def is_account_locked(identifier: str) -> bool:
    """Checks if an account identifier is currently locked out."""
    if not identifier:
        return False
    identifier = identifier.strip().lower()
    data = _account_lockouts.get(identifier)
    if not data or not data["locked_until"]:
        return False
        
    now = datetime.now(timezone.utc)
    if now < data["locked_until"]:
        return True
        
    # Lock expired
    _account_lockouts.pop(identifier, None)
    return False

def reset_failed_attempts(identifier: str):
    """Resets failed attempt counter on successful login."""
    if identifier:
        _account_lockouts.pop(identifier.strip().lower(), None)

def init_rate_limiting(app):
    """Integrates rate limiting into the FastAPI application."""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

