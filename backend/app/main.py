from fastapi import FastAPI, Depends, Request, HTTPException

from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.core.middleware import LoggingMiddleware
from app.core.rate_limiter import init_rate_limiting
from fastapi.staticfiles import StaticFiles
import os
from app.db.base import Base
from app.db.session import engine
from fastapi.staticfiles import StaticFiles
import os

# Ensure uploads directory exists
if not os.path.exists("uploads"):
    os.makedirs("uploads")

app = FastAPI(
    title="HRMS Portal Backend - Governed",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="1.0.1"
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_user_with_role
from app.models.user import User
from app.models.ticket import Ticket
import logging

# Initialize Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Register all models for Base.metadata
from app import models
from app.services.leave_service import leave_service
from typing import Any

from sqlalchemy import create_engine, text, MetaData, Table, Column, String, Integer, DateTime, JSON, Boolean, Date, Time, DECIMAL, Float, Text

# --- EMERGENCY FALLBACK ROUTES ---
@app.get("/api/v1/manager/it-tickets")
def global_manager_it_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.models.ticket import Ticket
    print(f"[CRITICAL] Global Hack Hit for {current_user.username}")
    tickets = db.query(Ticket).filter(Ticket.category == "IT", Ticket.deleted_at == None).offset(skip).limit(limit).all()
    for t in tickets:
        if not hasattr(t, 'issue') or t.issue is None:
            t.issue = t.title
    return tickets

@app.get("/api/v1/manager/it-assets")
def global_manager_it_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("manager"))):
    from app.repositories.asset_repo import asset_repo
    return asset_repo.get_multi(db, skip, limit)

# Startup event
@app.on_event("startup")
def on_startup():
    # Debug: Print all registered routes
    print("\n" + "="*50)
    print("REGISTERED ROUTES:")
    for route in app.routes:
        methods = getattr(route, 'methods', None)
        path = getattr(route, 'path', None)
        print(f"{methods} {path}")
    print("="*50 + "\n")

# Middleware
app.add_middleware(LoggingMiddleware)
# 🛡️ Governance: Specific CORS policy to allow credentialed requests (Authorization headers)
# We allow common development origins explicitly to avoid wildcard + credentials conflicts
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_rate_limiting(app)

# Final API Registration
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount static uploads directory
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from app.core.websocket_manager import websocket_manager
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket_manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection alive and listen for any client messages
            data = await websocket.receive_json()
            # Handle incoming messages if needed, e.g., pong for heartbeat
            if data.get("event") == "ping":
                await websocket.send_json({"event": "pong", "data": {"t": data["data"].get("t")}})
    except WebSocketDisconnect:
        websocket_manager.disconnect(user_id, websocket)
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
        websocket_manager.disconnect(user_id, websocket)

@app.get("/")
def root():
    return {"message": "HRMS API is running", "version": "1.0.0"}

@app.get("/debug-ping")
def debug_ping():
    return {"status": "alive", "timestamp": "2026-05-11 14:27", "path": "d:/hrms portel/backend/app/main.py"}

@app.put("/hr/leave-policies")
def direct_update_leave_policy_no_prefix(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "admin"]))):
    """Fallback route without /api/v1 prefix."""
    from app.services.leave_service import leave_policy_service
    return leave_policy_service.update_policy(db, payload.get("leave_type"), payload.get("total_days"), payload.get("description"))

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    from fastapi.responses import JSONResponse
    print(f"[DEBUG 404] Path: {request.url.path} | Method: {request.method}")
    return JSONResponse(
        status_code=404,
        content={"detail": "Not Found", "debug_path": request.url.path, "debug_method": request.method}
    )

@app.exception_handler(OperationalError)
async def operational_error_handler(request: Request, exc: OperationalError):
    from fastapi.responses import JSONResponse
    error_msg = str(exc).lower()
    print(f"[CRITICAL DB ERROR] {request.method} {request.url.path}: {error_msg}")
    
    # Check if it's a connection issue
    if "closed the connection" in error_msg or "operationalerror" in error_msg or "connection refused" in error_msg:
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Database connection lost. Our engineers are notified. Please retry shortly.",
                "error": "Database Connectivity Error"
            }
        )
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": str(exc)
        }
    )


# All necessary imports for global routes are now at the top.

@app.post("/api/v1/manager-finalize-leave")
async def manager_finalize_leave_direct(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["manager", "hr", "admin"]))
):
    """Emergency bypass route to resolve routing 404s for manager leave approvals."""
    leave_id = payload.get("leave_id")
    action = payload.get("action")
    rejection_reason = payload.get("rejection_reason")

    from app.repositories.employee_repo import employee_repo
    # Use correct service method name
    return await leave_service.approve_recommendation(db, leave_id, current_user.employee_id or f"USR-{current_user.id}", current_user.role, action, rejection_reason)

@app.get("/api/v1/hr/leave-policies")
def direct_get_leave_policies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "admin"]))):
    """Direct route bypass to ensure 404s are resolved for leave policies."""
    from app.services.leave_service import leave_policy_service
    return leave_policy_service.get_all(db)

@app.put("/api/v1/hr/leave-policies")
def direct_update_leave_policy(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["hr", "admin"]))):
    """Direct route bypass to ensure 404s are resolved for leave policies."""
    from app.services.leave_service import leave_policy_service
    return leave_policy_service.update_policy(db, payload.get("leave_type"), payload.get("total_days"), payload.get("description"))

# FORCE RELOAD: 2026-05-11T14:10 - Syncing Leave Policy Infrastructure
# STALE_RELOAD_FORCE_JUNK_RANDOM_1234567890

# Force reload at 16:58
