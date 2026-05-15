from pydantic import BaseModel, field_validator
from typing import Optional, List, Any, Dict
from datetime import date, datetime
from decimal import Decimal

class AssetBase(BaseModel):
    model_config = {"protected_namespaces": ()}
    asset_id: Optional[str] = None
    name: str # e.g. MacBook Pro
    type: Optional[str] = "Laptop" # Maps to category
    serial_number: Optional[str] = None
    model_number: Optional[str] = None
    manufacturer: Optional[str] = None
    purchase_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    cost: Optional[Decimal] = Decimal("0.00")
    status: Optional[str] = "Available"
    specifications: Optional[Dict] = None
    notes: Optional[str] = None

    @field_validator('specifications', mode='before')
    @classmethod
    def validate_specs(cls, v: Any) -> Any:
        if v == "null":
            return None
        return v

class AssetCreate(AssetBase):
    allocated_to: Optional[str] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    serial_number: Optional[str] = None
    status: Optional[str] = None
    specifications: Optional[Dict] = None
    notes: Optional[str] = None
    allocated_to: Optional[str] = None

class AssetOut(AssetBase):
    id: int
    current_employee_id: Optional[str] = None
    allocated_to: Optional[str] = None # Frontend compatibility
    allocated_to_name: Optional[str] = None # Frontend compatibility
    type: Optional[str] = None         # Frontend compatibility
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AssetAllocationBase(BaseModel):
    asset_id: str
    employee_id: str

class AssetAllocationCreate(AssetAllocationBase):
    allocated_by: Optional[str] = None
    allocation_type: Optional[str] = "Permanent"
    allocation_date: Optional[str] = None
    expected_return_date: Optional[date] = None
    asset_condition: Optional[str] = "Good"
    location: Optional[str] = "Office"
    last_verified_date: Optional[str] = None

class AssetAllocationUpdate(BaseModel):
    return_condition: Optional[str] = None
    allocation_status: str # allocated, returned, damaged

class AssetAllocationOut(AssetAllocationBase):
    id: int
    allocation_id: Optional[int] = None # Frontend compatibility
    allocated_at: Optional[datetime] = None
    allocation_date: Optional[str] = None # Frontend compatibility
    returned_at: Optional[datetime] = None
    allocation_status: str
    employee_name: Optional[str] = None # Joined field
    asset_name: Optional[str] = None    # Joined field
    serial_number: Optional[str] = None # Joined field
    department: Optional[str] = None    # Joined field
    allocation_type: Optional[str] = "Permanent"
    location: Optional[str] = "Office"
    asset_condition: Optional[str] = "Good"
    model_config = {"from_attributes": True}

class AccessProvisionBase(BaseModel):
    employee_id: str
    email_access: Optional[bool] = False
    vpn_access: Optional[bool] = False
    software_access: Optional[str] = None
    allowed_ip: Optional[str] = None

class AccessProvisionCreate(AccessProvisionBase):
    granted_by: Optional[str] = None

class AccessProvisionUpdate(BaseModel):
    status: str # Active, Revoked
    revoked_at: Optional[datetime] = None

class AccessProvisionOut(AccessProvisionBase):
    id: int
    status: str
    granted_by: Optional[str] = None
    granted_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AssetMaintenanceBase(BaseModel):
    asset_id: str
    maintenance_type: Optional[str] = None
    description: str
    performed_by: Optional[str] = None
    cost: Optional[Decimal] = Decimal("0.00")
    status: Optional[str] = "In-Progress"

class AssetMaintenanceOut(AssetMaintenanceBase):
    id: int
    start_date: datetime
    end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class AssetTransfer(BaseModel):
    asset_id: str
    to_employee: str
    model_config = {"from_attributes": True}
