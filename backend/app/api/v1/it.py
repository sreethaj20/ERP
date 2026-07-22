from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_user_with_role
from app.models.user import User
from app.models.hr_onboarding import HROnboardingRequest
from app.services.asset_service import asset_service, access_service
from app.repositories.asset_repo import asset_repo
from app.services.hr_onboarding_service import hr_onboarding_service
from app.schemas.asset import AssetOut, AssetCreate, AssetUpdate, AssetAllocationOut, AssetAllocationCreate, AccessProvisionOut, AccessProvisionCreate, AssetMaintenanceOut, AssetTransfer
from app.schemas.hr_onboarding import HROnboardingOut
from app.schemas.ticket import TicketOut

router = APIRouter()

# --- Assets ---

@router.get("/assets", response_model=List[AssetOut])
def get_it_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager", "recruiter", "hr"]))):
    from app.services.storage_service import storage_service
    items = asset_repo.get_multi(db, skip, limit)
    return items

@router.post("/assets", response_model=AssetOut)
async def add_new_asset(obj_in: AssetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager"]))):
    return await asset_service.add_asset(db, obj_in)

@router.put("/assets/{id}", response_model=AssetOut)
async def update_asset(id: str, obj_in: AssetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager"]))):
    return await asset_service.update_asset(db, id, obj_in.dict(exclude_none=True))

@router.delete("/assets/{id}")
def delete_asset(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager"]))):
    from app.repositories.asset_repo import asset_repo
    res = asset_repo.remove_by_id(db, id)
    if not res:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"message": "Asset deleted (Soft)"}

# --- Asset Allocations & Lifecycle ---

@router.get("/allocations", response_model=List[AssetAllocationOut])
def get_all_allocations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager", "recruiter", "hr"]))):
    from app.repositories.asset_repo import asset_allocation_repo
    return asset_allocation_repo.get_multi(db)

@router.get("/assets/{asset_id}/history", response_model=List[AssetAllocationOut])
def get_asset_history(asset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager"]))):
    from app.repositories.asset_repo import asset_allocation_repo
    return asset_allocation_repo.get_by_asset(db, asset_id)

@router.post("/allocations", response_model=AssetAllocationOut)
def allocate_it_asset(obj_in: AssetAllocationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager", "recruiter"]))):
    print(f"[IT API] Allocating asset {obj_in.asset_id} to {obj_in.employee_id} by {current_user.username}")
    obj_in.allocated_by = current_user.username
    try:
        res = asset_service.allocate_asset(db, obj_in)
        print(f"[IT API] Allocation successful: {res.id if hasattr(res, 'id') else 'OK'}")
        
        # Trigger E2E real-time notification to the target Employee receiving the asset
        try:
            from app.services.notification_service import notification_service
            from app.models.user import User
            import asyncio
            
            target_user = db.query(User).filter(User.employee_id == obj_in.employee_id).first()
            if target_user:
                loop = asyncio.get_event_loop()
                loop.create_task(notification_service.push_notification(
                    db,
                    user_id=target_user.id,
                    employee_id=obj_in.employee_id,
                    title="New IT Asset Allocated",
                    message=f"IT Department has allocated asset {obj_in.asset_id} to you. Please collect it.",
                    category="IT Assets"
                ))
        except Exception as ex:
            print(f"[IT ALLOCATE NOTIFICATION TRIGGER ERROR] {ex}")
            
        return res
    except Exception as e:
        print(f"[IT API ERROR] Allocation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/returns", response_model=List[AssetAllocationOut])
def get_it_returns(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager"]))):
    from app.models.asset import AssetAllocation
    return db.query(AssetAllocation).filter(AssetAllocation.allocation_status == "returned").all()

@router.post("/returns")
def return_it_asset(obj_in: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager"]))):
    asset_id = obj_in.get("asset_id")
    condition = obj_in.get("condition", "Good")
    damage_cost = float(obj_in.get("damage_cost", 0))
    if not asset_id:
        raise HTTPException(status_code=422, detail="asset_id is required")
    return asset_service.return_asset(db, asset_id, condition, damage_cost)

@router.get("/maintenance", response_model=List[AssetMaintenanceOut])
def get_it_maintenance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager", "hr"]))):
    from app.models.asset import AssetMaintenance
    return db.query(AssetMaintenance).all()

@router.get("/transfers", response_model=List[AssetAllocationOut])
def get_it_transfers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager", "hr"]))):
    # For now, return allocations as transfers if they aren't the original one
    from app.models.asset import AssetAllocation
    return db.query(AssetAllocation).filter(AssetAllocation.allocation_status == "transferred").all()

from app.schemas.asset import AssetTransfer

@router.post("/transfers", response_model=AssetAllocationOut)
def record_asset_transfer(obj_in: AssetTransfer, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("it"))):
    """Transfers an asset from one employee to another, closing the old allocation."""
    return asset_service.transfer_asset(db, obj_in.asset_id, obj_in.to_employee)

from pydantic import BaseModel as PydanticBase

class MaintenanceCreate(PydanticBase):
    asset_id: str
    issue_description: str
    service_vendor: Optional[str] = None
    maintenance_cost: float = 0.0

@router.post("/maintenance")
def add_it_maintenance_log(obj_in: MaintenanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("it"))):
    return asset_service.record_maintenance(
        db, 
        obj_in.asset_id, 
        obj_in.issue_description, 
        obj_in.service_vendor, 
        obj_in.maintenance_cost,
        current_user.username
    )

# --- Access Provisioning ---

@router.get("/access", response_model=List[AccessProvisionOut])
def get_access_provisions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("it"))):
    from app.repositories.asset_repo import access_provision_repo
    return access_provision_repo.get_multi(db)

@router.post("/access", response_model=AccessProvisionOut)
def grant_system_access(obj_in: AccessProvisionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("it"))):
    return access_service.grant_access(db, obj_in, current_user.username)

@router.post("/revocation")
def revoke_employee_access(employee_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("it"))):
    return access_service.revoke_access(db, employee_id)

# --- IT Onboarding Tasks ---

@router.get("/onboarding-requests", response_model=List[HROnboardingOut])
def get_it_onboarding_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager", "hr"]))):
    """IT specific onboarding tasks where asset allocation or identity provisioning is required."""
    requests = db.query(HROnboardingRequest).filter(
        HROnboardingRequest.current_approver_stage == "it",
        HROnboardingRequest.status != "completed"
    ).all()
    for r in requests:
        hr_onboarding_service._merge_employee_master_data(db, r)
        hr_onboarding_service.hydrate_onboarding_request(r)
    return requests

@router.get("/dashboard")
def get_it_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager", "hr"]))):
    from app.services.dashboard_service import dashboard_service
    return dashboard_service.get_it_dashboard(db, current_user.id)

@router.get("/reports")
def get_it_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager"]))):
    from app.services.dashboard_service import dashboard_service
    return dashboard_service.get_it_reports(db)

@router.get("/tickets", response_model=List[TicketOut])
async def get_all_it_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager"]))):
    from app.services.ticket_service import ticket_service
    from app.models.employee import Employee
    
    tickets = ticket_service.get_all_tickets(db, skip, limit, category="IT")
    for t in tickets:
        # Hydrate issue field
        if not hasattr(t, 'issue') or t.issue is None:
            t.issue = t.title or t.description
        # Hydrate employee name
        emp = db.query(Employee).filter(Employee.employee_id == t.employee_id).first()
        t.employee_name = emp.name if emp else "Unknown Member"
    return tickets

@router.get("/my-tickets", response_model=List[TicketOut])
async def get_my_it_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role(["it", "manager", "employee"]))):
    from app.services.ticket_service import ticket_service
    from app.models.employee import Employee
    print(f"[DEBUG] Fetching personal IT tickets for: {current_user.username}")
    
    tickets = ticket_service.get_my_tickets(db, current_user.employee_id)
    for t in tickets:
        if not hasattr(t, 'issue') or t.issue is None:
            t.issue = t.title
        emp = db.query(Employee).filter(Employee.employee_id == t.employee_id).first()
        t.employee_name = emp.name if emp else "Me"
    return tickets

@router.patch("/tickets/{ticket_id}")
async def update_it_ticket(
    ticket_id: int,
    obj_in: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role("it")),
):
    from app.services.ticket_service import ticket_service
    from app.schemas.ticket import TicketUpdate
    ticket_update = TicketUpdate(**obj_in)
    res = ticket_service.update_ticket_by_id(db, ticket_id, ticket_update)
    if not res:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return res

@router.post("/tickets/{ticket_id}/comments")
async def add_it_ticket_comment(ticket_id: int, obj_in: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_with_role("it"))):
    from app.services.ticket_service import ticket_service
    return ticket_service.add_comment(
        db, 
        ticket_id, 
        current_user.employee_id or str(current_user.id), 
        current_user.username, 
        obj_in.get("comment")
    )
