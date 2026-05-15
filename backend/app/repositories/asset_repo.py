# Version 1.1 - Migration Fix
from sqlalchemy.orm import Session
from app.models.asset import Asset, AssetAllocation, AssetMaintenance, AccessProvision
from app.schemas.asset import AssetCreate, AssetUpdate, AssetAllocationCreate
from typing import List, Optional

class AssetRepository:
    def get(self, db: Session, asset_id: str) -> Optional[Asset]:
        obj = db.query(Asset).filter(Asset.asset_id == asset_id, Asset.deleted_at == None).first()
        if obj and obj.specifications == "null":
            obj.specifications = None
        return obj

    def get_multi(self, db: Session, skip: int = 0, limit: int = 2000) -> List[Asset]:
        from app.models.employee import Employee
        results = (
            db.query(Asset, Employee.first_name, Employee.last_name)
            .join(Employee, Employee.employee_id == Asset.current_employee_id, isouter=True)
            .filter(Asset.deleted_at == None)
            .offset(skip).limit(limit).all()
        )
        
        assets = []
        for a, fn, ln in results:
            # Create a shallow copy or ensure attributes are set for Pydantic
            # Pydantic's from_orm/model_validate will pick these up
            a.type = a.category
            a.allocated_to = a.current_employee_id
            a.allocated_to_name = f"{fn or ''} {ln or ''}".strip() or a.current_employee_id
            
            # 🛡️ Data Guard: Ensure status is never null for frontend filter
            if not a.status:
                a.status = "Available"
            
            # 🛡️ Data Guard: specifications should be a dict or None, never the string 'null'
            if a.specifications == "null":
                a.specifications = None
                
            assets.append(a)
        return assets

    def create(self, db: Session, obj_in: AssetCreate) -> Asset:
        db_obj = Asset(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: Asset, obj_in: dict) -> Asset:
        for field in obj_in:
            if hasattr(db_obj, field):
                setattr(db_obj, field, obj_in[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove_by_id(self, db: Session, id: str):
        from datetime import datetime
        db_obj = db.query(Asset).filter(Asset.id == id).first()
        if not db_obj:
             db_obj = db.query(Asset).filter(Asset.asset_id == id).first()
             
        if db_obj:
            db_obj.deleted_at = datetime.now()
            db.add(db_obj)
            db.commit()
            return True
        return False

class AssetAllocationRepository:
    def get_by_asset(self, db: Session, asset_id: str) -> List[AssetAllocation]:
        from app.models.asset import Asset
        from app.models.employee import Employee
        
        # Resolve target asset_id if an integer ID was provided
        target_asset_id = asset_id
        if asset_id.isdigit():
            asset_ref = db.query(Asset).filter(Asset.id == int(asset_id)).first()
            if asset_ref:
                target_asset_id = asset_ref.asset_id

        results = (
            db.query(AssetAllocation, Asset.name.label("asset_name"), Employee.first_name, Employee.last_name, Employee.department)
            .join(Asset, Asset.asset_id == AssetAllocation.asset_id, isouter=True)
            .join(Employee, Employee.employee_id == AssetAllocation.employee_id, isouter=True)
            .filter(AssetAllocation.asset_id == target_asset_id)
            .all()
        )
        return self._enrich_rows(results)

    def get_active_by_employee(self, db: Session, employee_id: str) -> List[AssetAllocation]:
        from app.models.asset import Asset
        from app.models.employee import Employee
        
        results = (
            db.query(AssetAllocation, Asset.name.label("asset_name"), Asset.serial_number, Employee.first_name, Employee.last_name, Employee.department)
            .join(Asset, Asset.asset_id == AssetAllocation.asset_id, isouter=True)
            .join(Employee, Employee.employee_id == AssetAllocation.employee_id, isouter=True)
            .filter(AssetAllocation.employee_id == employee_id, AssetAllocation.allocation_status == "allocated")
            .all()
        )
        return self._enrich_rows(results)

    def create(self, db: Session, obj_in: AssetAllocationCreate) -> AssetAllocation:
        # 1. Create Allocation Record
        db_obj = AssetAllocation(**obj_in.dict())
        db.add(db_obj)
        
        # 2. Update Asset Status and Current Owner (single source of truth)
        from app.models.asset import Asset
        asset = db.query(Asset).filter(Asset.asset_id == obj_in.asset_id).first()
        if asset:
            asset.status = "Allocated"
            asset.current_employee_id = obj_in.employee_id
            db.add(asset)
            
        db.commit()
        db.refresh(db_obj)
        
        # 3. Populate allocation_id so create response isn't blank in the frontend table
        db_obj.allocation_id = db_obj.id
        return db_obj

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[AssetAllocation]:
        from app.models.asset import Asset
        from app.models.employee import Employee
        
        results = (
            db.query(AssetAllocation, Asset.name.label("asset_name"), Asset.serial_number, Employee.first_name, Employee.last_name, Employee.department)
            .join(Asset, Asset.asset_id == AssetAllocation.asset_id, isouter=True)
            .join(Employee, Employee.employee_id == AssetAllocation.employee_id, isouter=True)
            .offset(skip)
            .limit(limit)
            .all()
        )
        return self._enrich_rows(results)

    def _enrich_rows(self, results) -> List[AssetAllocation]:
        allocations = []
        for row in results:
            alloc = row[0]
            alloc.asset_name = row.asset_name
            alloc.employee_name = f"{row.first_name or ''} {row.last_name or ''}".strip()
            if not alloc.employee_name:
                alloc.employee_name = f"Unknown ({alloc.employee_id})"
            alloc.department = row.department
            alloc.allocation_id = alloc.id
            alloc.serial_number = getattr(row, 'serial_number', None)
            alloc.allocation_date = alloc.allocation_date or (alloc.allocated_at.strftime("%Y-%m-%d") if alloc.allocated_at else None)
            allocations.append(alloc)
        return allocations

    def get(self, db: Session, id: int) -> Optional[AssetAllocation]:
        return db.query(AssetAllocation).filter(AssetAllocation.id == id).first()

class AccessProvisionRepository:
    def get_all(self, db: Session, employee_id: str) -> List[AccessProvision]:
        return db.query(AccessProvision).filter(AccessProvision.employee_id == employee_id, AccessProvision.deleted_at == None).all()

    def create(self, db: Session, obj_in: dict) -> AccessProvision:
        db_obj = AccessProvision(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[AccessProvision]:
        return db.query(AccessProvision).filter(AccessProvision.deleted_at == None).offset(skip).limit(limit).all()

asset_repo = AssetRepository()
asset_allocation_repo = AssetAllocationRepository()
access_provision_repo = AccessProvisionRepository()
