import sys

# Silence the asyncio proactor connection lost noise on Windows (WinError 10054 / 10053 / closed pipe)
if sys.platform == "win32":
    import asyncio
    import asyncio.proactor_events
    
    _orig_call_connection_lost = asyncio.proactor_events._ProactorBasePipeTransport._call_connection_lost
    
    def _patched_call_connection_lost(self, exc):
        try:
            _orig_call_connection_lost(self, exc)
        except (ConnectionResetError, ConnectionAbortedError):
            pass
        except OSError as e:
            if getattr(e, "winerror", None) in (10054, 10053):
                pass
            else:
                raise

    asyncio.proactor_events._ProactorBasePipeTransport._call_connection_lost = _patched_call_connection_lost

    _orig_del = asyncio.proactor_events._ProactorBasePipeTransport.__del__
    
    def _patched_del(self):
        try:
            _orig_del(self)
        except ValueError as e:
            if "I/O operation on closed pipe" in str(e):
                pass
            else:
                raise

    asyncio.proactor_events._ProactorBasePipeTransport.__del__ = _patched_del

from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
import logging
import os

from app.api.router import api_router
from app.core.config import settings
from app.core.middleware import LoggingMiddleware
from app.core.rate_limiter import init_rate_limiting
from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_user_with_role
from app.models.user import User
from app.db.base import Base
from app.db.session import engine

# Initialize Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Register all models for Base.metadata
from app import models

# Ensure uploads directory exists (once, at startup)
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="HRMS Portal Backend",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="1.0.1"
)

# -----------------------------------------------------------------
# Static files (single mount — no duplicates)
# -----------------------------------------------------------------
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# -----------------------------------------------------------------
# Middleware (order matters: add from outermost → innermost)
# -----------------------------------------------------------------
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://signin.mercuresolution.com",
        "https://signin.mercuresolution.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_rate_limiting(app)

# -----------------------------------------------------------------
# API routers
# -----------------------------------------------------------------
app.include_router(api_router, prefix=settings.API_V1_STR)

# -----------------------------------------------------------------
# WebSocket
# -----------------------------------------------------------------
from app.core.websocket_manager import websocket_manager
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket_manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("event") == "ping":
                await websocket.send_json({"event": "pong", "data": {"t": data["data"].get("t")}})
    except WebSocketDisconnect:
        websocket_manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.warning(f"WebSocket error for user {user_id}: {e}")
        websocket_manager.disconnect(user_id, websocket)

# -----------------------------------------------------------------
# Health-check routes
# -----------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "HRMS API is running", "version": "1.0.1"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# -----------------------------------------------------------------
# Exception handlers
# -----------------------------------------------------------------
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    from fastapi.responses import JSONResponse
    logger.warning(f"[404] {request.method} {request.url.path}")
    return JSONResponse(
        status_code=404,
        content={"detail": "Not Found", "path": request.url.path}
    )

@app.exception_handler(OperationalError)
async def operational_error_handler(request: Request, exc: OperationalError):
    from fastapi.responses import JSONResponse
    error_msg = str(exc).lower()
    logger.critical(f"[DB ERROR] {request.method} {request.url.path}: {error_msg}")

    if any(k in error_msg for k in ["closed the connection", "connection refused", "operationalerror"]):
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Database connection lost. Please retry shortly.",
                "error": "Database Connectivity Error"
            }
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)}
    )

# -----------------------------------------------------------------
# Startup diagnostics
# -----------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    routes_info = [(getattr(r, 'methods', None), getattr(r, 'path', None)) for r in app.routes]
    logger.info(f"[STARTUP] {len(routes_info)} routes registered.")
    
    # Auto-heal active employee user accounts on startup
    try:
        from app.db.session import SessionLocal
        from app.models.employee import Employee
        from app.models.user import User
        from app.models.role_assignment import RoleAssignment
        from app.models.offboarding import OffboardingRequest
        
        db = SessionLocal()
        inactive_users = db.query(User).filter(User.is_active == False).all()
        healed_count = 0
        for u in inactive_users:
            emp = db.query(Employee).filter(
                (Employee.user_id == u.id) | (Employee.employee_id == u.employee_id),
                Employee.deleted_at == None
            ).first()
            if emp and emp.status in ["Active", "Onboarding"]:
                offboard_req = db.query(OffboardingRequest).filter(
                    OffboardingRequest.employee_id == emp.employee_id,
                    OffboardingRequest.deleted_at == None,
                    OffboardingRequest.completed == False
                ).first()
                
                if not offboard_req:
                    u.is_active = True
                    u.deleted_at = None
                    emp.status = "Active"
                    db.add(u)
                    db.add(emp)
                    
                    roles = db.query(RoleAssignment).filter(RoleAssignment.employee_id == emp.employee_id).all()
                    for r in roles:
                        r.is_active = True
                        r.login_enabled = True
                        db.add(r)
                    healed_count += 1
        db.commit()
        db.close()
        if healed_count > 0:
            logger.info(f"[STARTUP AUTO-HEAL] Automatically reactivated {healed_count} user accounts for active employees.")
    except Exception as e:
        logger.warning(f"[STARTUP AUTO-HEAL WARNING] {e}")
