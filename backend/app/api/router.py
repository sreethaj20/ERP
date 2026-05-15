from fastapi import APIRouter
from app.api.v1 import (
    auth, 
    employee, 
    hr, 
    manager, 
    recruiter, 
    it, 
    teamleader, 
    shared_v2 as shared,
    payment
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(employee.router, prefix="/employee", tags=["employee"])
api_router.include_router(hr.router, prefix="/hr", tags=["hr"])
api_router.include_router(manager.router, prefix="/manager", tags=["manager"])
api_router.include_router(recruiter.router, prefix="/recruiter", tags=["recruiter"])
api_router.include_router(it.router, prefix="/it", tags=["it"]) # IT Ops & Tickets
api_router.include_router(teamleader.router, prefix="/teamleader", tags=["teamleader"])
api_router.include_router(payment.router, prefix="/payments", tags=["payments"])
api_router.include_router(shared.router, tags=["shared"])

# All routers are included with prefixes above.

