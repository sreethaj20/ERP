from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

# Define the limiter with client IP as the key
limiter = Limiter(key_func=get_remote_address)

def init_rate_limiting(app):
    """Integrates rate limiting into the FastAPI application."""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
