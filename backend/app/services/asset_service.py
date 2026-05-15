from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import func
from app.models.asset import Asset, AssetAllocation, AccessProvision
from app.repositories.asset_repo import asset_repo, asset_allocation_repo, access_provision_repo
from app.schemas.asset import AssetCreate, AssetAllocationCreate, AccessProvisionCreate
from app.core.exceptions import ResourceNotFoundException

class AssetService:
    async def add_asset(self, db: Session, obj_in: AssetCreate):
        data = obj_in.dict(exclude={"asset_id", "allocated_to"})
        if "type" in data:
            data["category"] = data.pop("type")
        
        # generate asset_id — use max(id)+1 to avoid race conditions from COUNT(*)
        max_id = db.query(func.max(Asset.id)).scalar() or 0
        asset_id = f"AST-{str(max_id + 1).zfill(3)}"
        # Ensure uniqueness in case of concurrent inserts
        while db.query(Asset).filter(Asset.asset_id == asset_id).first():
            max_id += 1
            asset_id = f"AST-{str(max_id + 1).zfill(3)}"


        # Check for duplicate serial_number
        if data.get("serial_number"):
            existing = db.query(Asset).filter(Asset.serial_number == data["serial_number"], Asset.deleted_at == None).first()
            if existing:
                from fastapi import HTTPException
                raise HTTPException(status_code=400, detail=f"Asset with serial number {data['serial_number']} already exists")

        # Data Guard: specifications should be a dict or None, never the string 'null'
        if data.get("specifications") == "null":
            data["specifications"] = None

        try:
            db_obj = Asset(**data, asset_id=asset_id)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        except Exception as e:
            db.rollback()
            from sqlalchemy.exc import IntegrityError
            if isinstance(e, IntegrityError):
                raise HTTPException(status_code=400, detail="Database integrity violation: Duplicate entry or constraint failure")
            raise e
        
        # if allocated_to is provided during creation
        if obj_in.allocated_to:
            alloc_in = AssetAllocationCreate(
                asset_id=asset_id, 
                employee_id=obj_in.allocated_to, 
                allocated_by="IT-ADMIN"
            )
            self.allocate_asset(db, alloc_in)
            
        return db_obj

    async def update_asset(self, db: Session, asset_id: str, obj_in: dict):
        db_obj = asset_repo.get(db, asset_id)
        if not db_obj:
            try:
                numeric_id = int(str(asset_id))
                db_obj = db.query(Asset).filter(Asset.id == numeric_id).first()
            except (ValueError, TypeError):
                pass
            
        if db_obj:
            if "type" in obj_in:
                obj_in["category"] = obj_in.pop("type")

            # Check for duplicate serial_number if it's being updated
            new_serial = obj_in.get("serial_number")
            if new_serial and new_serial != db_obj.serial_number:
                existing = db.query(Asset).filter(Asset.serial_number == new_serial, Asset.deleted_at == None).first()
                if existing:
                    from fastapi import HTTPException
                    raise HTTPException(status_code=400, detail=f"Asset with serial number {new_serial} already exists")

            # Data Guard: specifications should be a dict or None, never the string 'null'
            if obj_in.get("specifications") == "null":
                obj_in["specifications"] = None

            for field, value in obj_in.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            
            try:
                db.add(db_obj)
                db.commit()
                db.refresh(db_obj)
            except Exception as e:
                db.rollback()
                from sqlalchemy.exc import IntegrityError
                from fastapi import HTTPException
                if isinstance(e, IntegrityError):
                    raise HTTPException(status_code=400, detail="Database integrity violation: Duplicate entry or constraint failure")
                raise e
        return db_obj

    def allocate_asset(self, db: Session, obj_in: AssetAllocationCreate):
        asset_id = obj_in.asset_id
        employee_id = obj_in.employee_id
        
        # Validate asset exists (try asset_id string first, then numeric id)
        db_obj = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        if not db_obj:
            db_obj = db.query(Asset).filter(Asset.id == asset_id).first()
            
        if not db_obj:
            raise ResourceNotFoundException("Asset", asset_id)
        
        # Ensure obj_in uses the canonical string asset_id, not a numeric id
        if db_obj.asset_id != asset_id:
            obj_in.asset_id = db_obj.asset_id
        
        # Delegate asset status update + allocation row creation to the repo (single write)
        return asset_allocation_repo.create(db, obj_in)

    def return_asset(self, db: Session, asset_id: str, return_condition: str, damage_cost: float = 0):
        db_obj = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        if not db_obj:
            db_obj = db.query(Asset).filter(Asset.id == asset_id).first()
            
        if not db_obj:
            raise ResourceNotFoundException("Asset", asset_id)
            
        # 1. Close ANY active allocation (allocated or transferred)
        allocation = db.query(AssetAllocation).filter(
            AssetAllocation.asset_id == db_obj.asset_id,
            AssetAllocation.allocation_status.in_(["allocated", "transferred"])
        ).order_by(AssetAllocation.allocated_at.desc()).first()
        
        if allocation:
            allocation.returned_at = datetime.now()
            allocation.return_condition = return_condition
            allocation.damage_cost = damage_cost
            allocation.allocation_status = "returned"
            db.add(allocation)
            
        # 2. Reset Asset Status
        db_obj.status = "Available"
        db_obj.current_employee_id = None
        db.add(db_obj)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_employee_assets(self, db: Session, employee_id: str):
        return asset_allocation_repo.get_active_by_employee(db, employee_id)

    def transfer_asset(self, db: Session, asset_id: str, to_employee_id: str):
        """Unfied transfer logic: Closes old, opens new, updates Asset."""
        db_obj = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        if not db_obj:
            db_obj = db.query(Asset).filter(Asset.id == asset_id).first()
            
        if not db_obj:
            raise ResourceNotFoundException("Asset", asset_id)
            
        # Validate target employee exists
        from app.models.employee import Employee
        target_emp = db.query(Employee).filter(Employee.employee_id == to_employee_id).first()
        if not target_emp:
            raise ResourceNotFoundException("Employee", to_employee_id)

        # 1. Close current allocation (any that isn't already returned)
        current_alloc = db.query(AssetAllocation).filter(
            AssetAllocation.asset_id == db_obj.asset_id,
            AssetAllocation.allocation_status != "returned"
        ).order_by(AssetAllocation.allocated_at.desc()).first()
        
        if current_alloc:
            current_alloc.returned_at = datetime.now()
            current_alloc.allocation_status = "transferred"
            db.add(current_alloc)
            
        # 2. Update asset status and owner
        db_obj.current_employee_id = to_employee_id
        db_obj.status = "Allocated"
        db.add(db_obj)
        
        # 3. Create new allocation record via Repo
        new_alloc_data = AssetAllocationCreate(
            asset_id=db_obj.asset_id,
            employee_id=to_employee_id,
            allocated_by="SYSTEM-TRANSFER",
            allocation_type="Permanent",
            asset_condition="Good",
            allocation_date=datetime.now().strftime("%Y-%m-%d")
        )
        # Using repo.create usually commits, so we use it as the final step
        return asset_allocation_repo.create(db, new_alloc_data)

    def record_maintenance(self, db: Session, asset_id: str, issue: str, vendor: str, cost: float, recorded_by: str):
        from app.models.asset import AssetMaintenance
        db_obj = AssetMaintenance(
            asset_id=asset_id,
            description=issue,
            performed_by=vendor,
            cost=cost,
            start_date=datetime.now(),
            status="In-Progress"
        )
        db.add(db_obj)
        
        # update asset status to maintenance
        asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        if asset:
            asset.status = "Maintenance"
            db.add(asset)
            
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def record_transfer(self, db: Session, asset_id: str, to_employee_id: str, approved_by: str):
        """Alias for transfer_asset with additional logging context."""
        return self.transfer_asset(db, asset_id, to_employee_id)

class AccessService:
    def grant_access(self, db: Session, obj_in: AccessProvisionCreate, granted_by: str):
        db_obj = AccessProvision(
            **obj_in.dict(exclude={"granted_by"}),
            granted_by=granted_by,
            status="Active",
            granted_at=datetime.now()
        )
        db.add(db_obj)
        
        # update employee record
        import json
        from app.models.employee import Employee
        emp = db.query(Employee).filter(Employee.employee_id == obj_in.employee_id).first()
        if emp:
            access_data = {
                "email": obj_in.email_access or False,
                "vpn": obj_in.vpn_access or False,
                "software": obj_in.software_access,
                "allowed_ip": obj_in.allowed_ip
            }
            # Serialize to JSON string to ensure DB compatibility regardless of column type
            emp.access_provisioned = json.dumps(access_data)
            emp.it_access_provisioned = True
            db.add(emp)
            
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def revoke_access(self, db: Session, employee_id: str):
        import json
        db_objs = db.query(AccessProvision).filter(
            AccessProvision.employee_id == employee_id,
            AccessProvision.status == "Active"
        ).all()
        for obj in db_objs:
            obj.status = "Revoked"
            obj.revoked_at = datetime.now()
            db.add(obj)
            
        from app.models.employee import Employee
        emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if emp:
            emp.access_provisioned = None
            emp.it_access_provisioned = False
            db.add(emp)
            
        db.commit()
        return True

asset_service = AssetService()
access_service = AccessService()
