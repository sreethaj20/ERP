from sqlalchemy import Column, String, Integer, Date, DateTime, Time, func, Boolean, ForeignKey, JSON, Text, Numeric, Enum
from app.db.base import Base

class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    asset_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. AST-001
    name = Column(String(100), nullable=False) # e.g. MacBook Pro
    category = Column(String(50), default="Laptop") # Laptop, Mobile, Monitor, Peripheral
    serial_number = Column(String(100), unique=True)
    model_number = Column(String(100))
    manufacturer = Column(String(100))
    purchase_date = Column(Date)
    warranty_expiry = Column(Date)
    cost = Column(Numeric(15, 2), default=0.00)
    status = Column(String(30), default="Available") # Available, Allocated, Maintenance, Retired
    current_employee_id = Column(String(30)) # employee_id
    specifications = Column(JSON) # e.g. {"RAM": "16GB", "CPU": "M2"}
    notes = Column(Text)
    deleted_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class AssetAllocation(Base):
    __tablename__ = "asset_allocations"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    asset_id = Column(String(50), index=True, nullable=False)
    employee_id = Column(String(30), index=True, nullable=False)
    allocated_by = Column(String(30)) # employee_id
    
    # Tiered Metadata
    allocation_type = Column(String(50), default="Permanent") # Permanent, Temporary
    allocation_date = Column(String(30)) # String format for frontend sync
    expected_return_date = Column(Date)
    asset_condition = Column(String(50), default="Good")
    location = Column(String(50), default="Office")
    last_verified_date = Column(String(30))
    
    allocated_at = Column(DateTime, server_default=func.now())
    returned_at = Column(DateTime)
    return_condition = Column(String(255))
    damage_cost = Column(Numeric(10, 2), default=0.00)
    allocation_status = Column(String(30), default="allocated") # allocated, returned, damaged
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class AssetMaintenance(Base):
    __tablename__ = "asset_maintenance"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    asset_id = Column(String(50), index=True, nullable=False)
    maintenance_type = Column(String(50)) # Repair, Routine, Replacement
    description = Column(Text, nullable=False)
    performed_by = Column(String(100))
    cost = Column(Numeric(10, 2), default=0.00)
    start_date = Column(DateTime, server_default=func.now())
    end_date = Column(DateTime)
    status = Column(String(30), default="In-Progress") # In-Progress, Completed, Cancelled
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class AccessProvision(Base):
    __tablename__ = "access_provisions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String(30), index=True, nullable=False)
    email_access = Column(Boolean, default=False)
    vpn_access = Column(Boolean, default=False)
    software_access = Column(Text) # comma separated
    allowed_ip = Column(String(50))
    status = Column(String(30), default="Active") # Active, Revoked
    granted_by = Column(String(30)) # IT employee_id
    granted_at = Column(DateTime, server_default=func.now())
    revoked_at = Column(DateTime)
    deleted_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
