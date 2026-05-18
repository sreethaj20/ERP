from sqlalchemy.orm import Session, aliased
from sqlalchemy import or_, String, cast
from typing import List, Optional, Any
from app.repositories.employee_repo import employee_repo, department_repo, company_repo
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, DepartmentCreate
from app.core.exceptions import ResourceNotFoundException
from app.services.audit_service import audit_service
from app.services.storage_service import storage_service

class EmployeeService:
    def get_employee(self, db: Session, employee_id: str):
        db_obj = employee_repo.get(db, employee_id)
        if not db_obj:
            raise ResourceNotFoundException("Employee", employee_id)
        
        # 🛠️ Auto-Heal: Ensure master data is synced from lifecycle tables
        if self._sync_from_lifecycle(db, db_obj):
            db.commit()
            
        return self.hydrate_employee(db_obj)

    def _sync_from_lifecycle(self, db: Session, emp: Any) -> bool:
        """
        🛡️ End-to-End Governance: Merges missing demographics from onboarding/preboarding.
        Returns True if any changes were made and need committing.
        """
        changed = False
        from app.models.preboarding import EmployeePreboarding
        from app.models.hr_onboarding import HROnboardingRequest
        
        # 1. Try Preboarding (Most detailed for employee-filled data)
        pb = db.query(EmployeePreboarding).filter(EmployeePreboarding.employee_id == emp.employee_id).first()
        # 2. Try Onboarding Request (Most detailed for HR-filled data)
        onb = db.query(HROnboardingRequest).filter(HROnboardingRequest.employee_id == emp.employee_id).first()
        
        sources = [s for s in [pb, onb] if s]
        if not sources: return False

        # Helper to sync if field is empty (Handles null, empty string, and "none" string)
        def sync_field(target_attr, source_objs, source_attrs):
            current_val = getattr(emp, target_attr, None)
            if current_val and str(current_val).lower() not in ["none", "null", ""]:
                return False
                
            for s in source_objs:
                for a in source_attrs:
                    val = getattr(s, a, None)
                    if val and str(val).lower() not in ["none", "null", ""]:
                        setattr(emp, target_attr, val)
                        return True
            return False

        # Core Demographics
        changed |= sync_field("gender", sources, ["gender"])
        changed |= sync_field("dob", sources, ["dob"])
        changed |= sync_field("date_of_birth", sources, ["dob", "date_of_birth"])
        changed |= sync_field("blood_group", sources, ["blood_group"])
        changed |= sync_field("marital_status", sources, ["marital_status"])
        changed |= sync_field("nationality", sources, ["nationality"])
        
        # Contact & Identity
        changed |= sync_field("personal_mobile", sources, ["phone", "personal_mobile"])
        changed |= sync_field("phone", sources, ["phone", "personal_mobile"])
        changed |= sync_field("pan_number", sources, ["pan_number"])
        changed |= sync_field("aadhaar_number", sources, ["aadhaar_number"])
        changed |= sync_field("passport_number", sources, ["passport_number"])
        
        # Address Sync
        changed |= sync_field("city", sources, ["city"])
        changed |= sync_field("state", sources, ["state"])
        changed |= sync_field("country", sources, ["country"])
        changed |= sync_field("pincode", sources, ["pincode"])
        changed |= sync_field("postal_code", sources, ["pincode", "postal_code"])
        changed |= sync_field("address", sources, ["address"])
        changed |= sync_field("permanent_address", sources, ["permanent_address"])
        changed |= sync_field("current_address", sources, ["current_address"])
        
        # Banking
        changed |= sync_field("bank_name", sources, ["bank_name"])
        changed |= sync_field("bank_account_number", sources, ["bank_account_number"])
        changed |= sync_field("bank_ifsc_code", sources, ["bank_ifsc_code"])
        
        # Emergency
        changed |= sync_field("emergency_contact_name", sources, ["emergency_contact_name"])
        changed |= sync_field("emergency_contact_phone", sources, ["emergency_contact_phone"])
        changed |= sync_field("emergency_contact_relation", sources, ["emergency_contact_relation"])
        
        return changed

    def hydrate_employee(self, emp: Any) -> Any:
        """Centralized normalization and field synchronization for employee profiles."""
        if not emp: return emp
        
        is_dict = isinstance(emp, dict)
        
        # 🛠️ Auto-Heal: Sync photo and profile_photo_url for frontend consistency
        p_url = getattr(emp, "profile_photo_url", None) or (emp.get("profile_photo_url") if is_dict else None)
        p_photo = getattr(emp, "photo", None) or (emp.get("photo") if is_dict else None)
        
        # Clean up string "None" or "null" which can happen in some DB migrations
        if p_url in ["None", "null", ""]: p_url = None
        if p_photo in ["None", "null", ""]: p_photo = None
        
        if p_url and not p_photo:
            if is_dict: emp["photo"] = p_url
            else: setattr(emp, "photo", p_url)
        elif p_photo and not p_url:
            if is_dict: emp["profile_photo_url"] = p_photo
            else: setattr(emp, "profile_photo_url", p_photo)

        # 🛠️ Auto-Heal: Sync date fields for frontend consistency (Handle date_of_birth vs dob)
        dob = getattr(emp, "date_of_birth", None) or getattr(emp, "dob", None) or (emp.get("date_of_birth") or emp.get("dob") if is_dict else None)
        if dob:
            if is_dict:
                emp["date_of_birth"] = dob
                emp["dob"] = dob
            else:
                setattr(emp, "date_of_birth", dob)
                setattr(emp, "dob", dob)

        # 🛠️ Auto-Heal: Sync joining dates (Handle 3 possible variations)
        joining = getattr(emp, "joining_date", None) or getattr(emp, "joining_date_v2", None) or getattr(emp, "join_date", None) or (emp.get("joining_date") or emp.get("joining_date_v2") or emp.get("join_date") if is_dict else None)
        if joining:
            if is_dict:
                emp["joining_date"] = joining
                emp["joining_date_v2"] = joining
                emp["join_date"] = joining
            else:
                setattr(emp, "joining_date", joining)
                setattr(emp, "joining_date_v2", joining)
                setattr(emp, "join_date", joining)

        # 🛠️ Auto-Heal: Sync banking fields (Handle variations)
        acc = getattr(emp, "bank_account_number", None) or getattr(emp, "bank_account_no", None) or (emp.get("bank_account_number") or emp.get("bank_account_no") if is_dict else None)
        if acc:
            if is_dict:
                emp["bank_account_number"] = acc
                emp["bank_account_no"] = acc
            else:
                setattr(emp, "bank_account_number", acc)
                setattr(emp, "bank_account_no", acc)

        ifsc = getattr(emp, "bank_ifsc_code", None) or getattr(emp, "ifsc_code", None) or (emp.get("bank_ifsc_code") or emp.get("ifsc_code") if is_dict else None)
        if ifsc:
            if is_dict:
                emp["bank_ifsc_code"] = ifsc
                emp["ifsc_code"] = ifsc
            else:
                setattr(emp, "bank_ifsc_code", ifsc)
                setattr(emp, "ifsc_code", ifsc)

        fields = [
            "profile_photo_url", "photo", "aadhaar_file_url", "pan_file_url",
            "education_certificate_url", "resume_url", "offer_letter_signed_url", "bank_proof_url"
        ]
        return storage_service.hydrate_urls(emp, fields)

    def get_profile(self, db: Session, user_id: int):
        from app.models.user import User
        from app.models.employee import Employee
        
        # 🛡️ Level 1: Standard Linkage (user_id)
        result = db.query(Employee, User.role.label("user_role"))\
            .outerjoin(User, Employee.user_id == User.id)\
            .filter(Employee.user_id == user_id, Employee.deleted_at == None)\
            .first()
        
        if result and result[0]:
            emp, u_role = result
            if u_role:
                emp.role = u_role
            
            # 🛡️ Level 1.5: Hydrate Reporting Names (Crucial for UI 'Reports To' fields)
            if not emp.reporting_to and (emp.manager_id or emp.reporting_manager_id):
                mid = emp.manager_id or emp.reporting_manager_id
                mgr = employee_repo.get(db, str(mid))
                if mgr:
                    emp.reporting_to = mgr.name or f"{mgr.first_name} {mgr.last_name or ''}".strip()
                    emp.reporting_manager = emp.reporting_to
            
            # 🎁 Level 1.6: Hydrate Leave Balances (End-to-End Visibility)
            from app.services.leave_service import leave_balance_service
            balance = leave_balance_service.get_balance(db, emp.employee_id)
            if balance:
                emp.leave_balances = {
                    "casual": float(balance.casual_leave),
                    "sick": float(balance.sick_leave),
                    "earned": float(balance.earned_leave),
                    "maternity": float(balance.maternity_leave),
                    "paternity": float(balance.paternity_leave),
                    "bereavement": float(balance.bereavement_leave),
                    "unpaid": float(balance.unpaid_leave)
                }
            
            # 🛠️ Auto-Heal: Ensure master data is synced from lifecycle tables
            if self._sync_from_lifecycle(db, emp):
                db.add(emp)
                db.commit()
                
            return self.hydrate_employee(emp)
            
        # 🛡️ Level 2: Fallback & Auto-Healing
        user = db.query(User).filter(User.id == user_id, User.deleted_at == None).first()
        if not user:
            raise ResourceNotFoundException("User", user_id)
            
        # Try finding by employee_id if it exists on user but not linked in Employee
        emp = None
        if user.employee_id:
            emp = db.query(Employee).filter(Employee.employee_id == user.employee_id, Employee.deleted_at == None).first()
        
        # 🛡️ Level 2.5: Try finding by EMAIL if employee_id linkage is broken (Crucial for unlinked table data)
        if not emp:
            emp = db.query(Employee).filter(Employee.email == user.email, Employee.deleted_at == None).first()
            
        if emp:
            # Fix the linkage for future
            emp.user_id = user.id
            if not user.employee_id:
                user.employee_id = emp.employee_id
            
            emp.role = user.role
            
            # Hydrate reporting info on fallback too
            # 🛠️ Auto-Heal: Ensure master data is synced from lifecycle tables
            if self._sync_from_lifecycle(db, emp):
                db.add(emp)
                db.commit()
                
            return self.hydrate_employee(emp)
        
        # 🛡️ Level 3: Auto-Provision Basic Profile
        # If user exists but no Employee record, create a basic one to prevent 404 crashes
        print(f"[AUTO-HEAL] Provisioning missing employee record for User: {user.username} (Role: {user.role})")
        
        # Parse name
        full_name = user.full_name or user.username
        name_parts = full_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        from app.utils.id_generator import generate_next_employee_id
        new_emp_id = user.employee_id or generate_next_employee_id(db)
        
        new_emp = Employee(
            user_id=user.id,
            employee_id=new_emp_id,
            first_name=first_name,
            last_name=last_name,
            name=full_name,
            email=user.email,
            official_email=user.email,
            role=user.role,
            status="Active"
        )
        
        try:
            db.add(new_emp)
            db.commit()
            db.refresh(new_emp)
            
            # Seed default leave balance too
            from app.models.leave import LeaveBalance
            from decimal import Decimal
            lb = LeaveBalance(
                employee_id=new_emp.employee_id,
                sick_leave=Decimal("12.0"),
                casual_leave=Decimal("12.0"),
                earned_leave=Decimal("15.0")
            )
            db.add(lb)
            db.commit()
            
            # 🛠️ Auto-Heal: Ensure master data is synced from lifecycle tables
            if self._sync_from_lifecycle(db, new_emp):
                db.add(new_emp)
                db.commit()
                
            return self.hydrate_employee(new_emp)
        except Exception as e:
            print(f"[AUTO-HEAL ERROR] Failed to provision employee record: {e}")
            db.rollback()
            raise ResourceNotFoundException("Employee Profile (Auto-provision failed)", user_id)

    def get_all_employees(self, db: Session, skip: int = 0, limit: int = 2000, role_filter: str = None, columns: List[str] = None):
        """
        Federated employee retrieval with production-grade data joining.
        Optimized limit and ensured relationship hydration (N+1 prevention).
        """
        from app.models.employee import Employee
        from app.models.user import User
        from sqlalchemy import or_
        Manager = aliased(Employee)

        if columns:
            # Optimized partial fetch
            target_cols = [getattr(Employee, c) for c in columns if hasattr(Employee, c)]
            # Include hydration fields if missing
            if 'reporting_to' not in columns: target_cols.append(Employee.reporting_to)
            if 'manager_id' not in columns: target_cols.append(Employee.manager_id)
            if 'reporting_manager_id' not in columns: target_cols.append(Employee.reporting_manager_id)
            if 'team_leader_id' not in columns: target_cols.append(Employee.team_leader_id)
            if 'reporting_to_id' not in columns: target_cols.append(Employee.reporting_to_id)

            
            query = db.query(*target_cols, User.role.label("user_role"), Manager.name.label("joined_mgr_name"))\
                .outerjoin(User, Employee.user_id == User.id)\
                .outerjoin(Manager, or_(Employee.manager_id == Manager.employee_id, Employee.reporting_manager_id == Manager.employee_id))\
                .filter(Employee.deleted_at == None)
        else:
            query = db.query(Employee, User.role.label("user_role"), Manager.name.label("joined_mgr_name"))\
                .outerjoin(User, Employee.user_id == User.id)\
                .outerjoin(Manager, or_(Employee.manager_id == Manager.employee_id, Employee.reporting_manager_id == Manager.employee_id))\
                .filter(Employee.deleted_at == None)

        if role_filter == "hr_master":
            query = query.filter(
                or_(
                    User.role.in_(['employee', 'teamleader', 'recruiter', 'hr', 'it', 'manager', 'admin']),
                    User.role == None,
                    Employee.role.in_(['employee', 'teamleader', 'recruiter', 'hr', 'it', 'manager', 'admin']),
                    Employee.role == None
                )
            )

        results = query.offset(skip).limit(limit).all()
        
        final_list = []
        if columns:
            # Handle KeyedTuple result
            for res in results:
                emp_dict = {c: getattr(res, c) for c in columns if hasattr(res, c)}
                
                # Ensure hierarchy fields from target_cols are also included even if not in 'columns' list
                for extra in ['reporting_to', 'manager_id', 'reporting_manager_id', 'team_leader_id', 'reporting_to_id']:
                    if extra not in emp_dict and hasattr(res, extra):
                        emp_dict[extra] = getattr(res, extra)
                        
                emp_dict['role'] = res.user_role or emp_dict.get('role') or "employee"

                
                # Hydrate reporting name from join if missing
                if not emp_dict.get('reporting_to') and res.joined_mgr_name:
                    emp_dict['reporting_to'] = res.joined_mgr_name
                    emp_dict['reporting_manager'] = res.joined_mgr_name
                
                # 🎁 Bulk Hydration (Leave Balances)
                from app.services.leave_service import leave_balance_service
                balance = leave_balance_service.get_balance(db, emp_dict['employee_id'])
                if balance:
                    emp_dict['leave_balances'] = {
                        "casual": float(balance.casual_leave),
                        "sick": float(balance.sick_leave),
                        "earned": float(balance.earned_leave),
                        "maternity": float(balance.maternity_leave),
                        "paternity": float(balance.paternity_leave),
                        "bereavement": float(balance.bereavement_leave),
                        "unpaid": float(balance.unpaid_leave)
                    }
                
                final_list.append(self.hydrate_employee(emp_dict))
        else:
            for emp, u_role, joined_mgr_name in results:
                if u_role:
                    emp.role = u_role
                elif not emp.role:
                    emp.role = "employee"
                
                # Hydrate reporting name from join if missing
                if not emp.reporting_to and joined_mgr_name:
                    emp.reporting_to = joined_mgr_name
                    emp.reporting_manager = joined_mgr_name
                
                # 🎁 Bulk Hydration (Leave Balances)
                from app.services.leave_service import leave_balance_service
                balance = leave_balance_service.get_balance(db, emp.employee_id)
                if balance:
                    emp.leave_balances = {
                        "casual": float(balance.casual_leave),
                        "sick": float(balance.sick_leave),
                        "earned": float(balance.earned_leave),
                        "maternity": float(balance.maternity_leave),
                        "paternity": float(balance.paternity_leave),
                        "bereavement": float(balance.bereavement_leave),
                        "unpaid": float(balance.unpaid_leave)
                    }
                    
                final_list.append(self.hydrate_employee(emp))
        return final_list

    async def create_employee(self, db: Session, obj_in: EmployeeCreate):
        from app.models.user import User
        from app.models.employee import Employee
        from app.core.security import get_password_hash
        from fastapi import HTTPException, status
        
        # 0. Check for duplicate employee_id or email in Employee table
        if db.query(Employee).filter(Employee.employee_id == obj_in.employee_id).first():
            raise HTTPException(status_code=400, detail=f"Employee ID {obj_in.employee_id} already exists.")
        
        if obj_in.email and db.query(Employee).filter(Employee.email == obj_in.email).first():
            raise HTTPException(status_code=400, detail=f"Employee email {obj_in.email} already exists.")

        # 1. Provision User Login first
        user = db.query(User).filter(User.username == obj_in.username).first()
        if not user:
            # Check for email duplicate in User table too
            if obj_in.email and db.query(User).filter(User.email == obj_in.email).first():
                 raise HTTPException(status_code=400, detail=f"User email {obj_in.email} already exists in authentication system.")
            
            user = User(
                username=obj_in.username,
                email=obj_in.email or f"{obj_in.username}@mercure.local",
                hashed_password=get_password_hash(obj_in.password or "Mercure@123"), # Use provided password or standard default
                full_name=obj_in.name or f"{obj_in.first_name} {obj_in.last_name or ''}".strip(),
                role=obj_in.role or "employee",
                employee_id=obj_in.employee_id
            )
            try:
                db.add(user)
                db.flush() # Get user.id
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to create user account: {str(e)}")
        
        # 2. Link and Create Employee
        obj_in.user_id = user.id
        try:
            # Auto-sync the name string for hierarchy if missing in payload (Prefer TL)
            # Sync redundant fields
            obj_data = obj_in.dict()
            if obj_data.get('dob'): obj_data['date_of_birth'] = obj_data['dob']
            if obj_data.get('date_of_birth'): obj_data['dob'] = obj_data['date_of_birth']
            if obj_data.get('joining_date'): 
                obj_data['join_date'] = obj_data['joining_date']
                obj_data['joining_date_v2'] = obj_data['joining_date']
            if obj_data.get('bank_account_number'): obj_data['bank_account_no'] = obj_data['bank_account_number']
            if obj_data.get('bank_ifsc_code'): obj_data['ifsc_code'] = obj_data['bank_ifsc_code']
            
            # Re-wrap in schema to ensure validation and correct types
            obj_in = EmployeeCreate(**obj_data)
            
            # Sync photo fields for frontend compatibility
            if obj_in.profile_photo_url and not obj_in.photo:
                obj_in.photo = obj_in.profile_photo_url
            elif obj_in.photo and not obj_in.profile_photo_url:
                obj_in.profile_photo_url = obj_in.photo
                
            res = employee_repo.create(db, obj_in)
            
            # 🎁 Provision Default Leave Balance
            from app.models.leave import LeaveBalance
            from decimal import Decimal
            default_balance = LeaveBalance(
                employee_id=res.employee_id,
                sick_leave=Decimal("12.0"),    # 12 SL/year
                casual_leave=Decimal("12.0"),  # 12 CL/year
                earned_leave=Decimal("15.0"),  # 15 EL/year
                optional_leave=Decimal("2.0"), # 2 Optional/year
                maternity_leave=Decimal("0.0"),
                paternity_leave=Decimal("0.0"),
                total_used=Decimal("0.0")
            )
            db.add(default_balance)
            db.flush()
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create employee record: {str(e)}")
        
        # 3. Real-time Update
        from app.core.websocket_manager import websocket_manager
        import asyncio
        try:
            await websocket_manager.broadcast({
                "event": "data_updated",
                "data": { "type": "employee", "action": "create", "id": res.employee_id }
            })
        except:
            pass # Non-blocking websocket failure
            
        return res

    async def update_employee(self, db: Session, employee_id: str, obj_in: EmployeeUpdate, changed_by: str = None):
        print(f"DEBUG: update_employee hit for {employee_id}")
        db_obj = self.get_employee(db, employee_id)
        old_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
        
        # Explicitly preserve/sync hierarchy fields if present in update
        obj_data = obj_in.dict(exclude_unset=True)
        if 'team_leader_id' in obj_data:
            db_obj.team_leader_id = str(obj_data['team_leader_id'])
        
        # Consolidate reporting hierarchy mapping (Prioritize TL for 'Reports To')
        if any(f in obj_data for f in ['team_leader_id', 'reporting_manager_id', 'manager_id', 'reporting_to_id']):
            # Prefer TL if present
            mid = obj_data.get('team_leader_id') or obj_data.get('reporting_manager_id') or obj_data.get('manager_id') or obj_data.get('reporting_to_id')
            
            # Sync all redundant ID fields for consistency
            if 'team_leader_id' in obj_data:
                 db_obj.team_leader_id = str(obj_data['team_leader_id'])
            
            # Update others if missing but we have a source ID
            if mid:
                db_obj.reporting_manager_id = str(mid)
                db_obj.manager_id = str(mid)
                db_obj.reporting_to_id = str(mid)
                
                # Auto-sync the name string if missing in update payload
                if not obj_data.get('reporting_to'):
                    mgr = employee_repo.get(db, str(mid))
                    if mgr:
                        name_str = mgr.name or f"{mgr.first_name} {mgr.last_name or ''}".strip()
                        db_obj.reporting_to = name_str
                        db_obj.reporting_manager = name_str
        
        # Explicitly update reporting_to name if provided in payload
        if 'reporting_to' in obj_data:
            db_obj.reporting_to = obj_data['reporting_to']
            db_obj.reporting_manager = obj_data['reporting_to']

        # Sync to User table if identity fields changed
        from app.models.user import User
        user = db.query(User).filter(User.id == db_obj.user_id).first()
        if user:
            obj_data = obj_in.dict(exclude_unset=True)
            if 'role' in obj_data:
                user.role = obj_data['role']
            if 'email' in obj_data:
                user.email = obj_data['email']
            if any(f in obj_data for f in ['first_name', 'last_name', 'name']):
                fn = obj_data.get('first_name') or db_obj.first_name
                ln = obj_data.get('last_name') or db_obj.last_name
                user.full_name = obj_data.get('name') or f"{fn} {ln or ''}".strip()
            db.add(user)
            db.flush()

        # Handle 'dob' alias for 'date_of_birth'
        if 'dob' in obj_data:
            obj_data['date_of_birth'] = obj_data['dob']
        elif 'date_of_birth' in obj_data:
            obj_data['dob'] = obj_data['date_of_birth']
        
        # Handle joining date variations
        if 'joining_date' in obj_data:
            obj_data['join_date'] = obj_data['joining_date']
            obj_data['joining_date_v2'] = obj_data['joining_date']
        elif 'join_date' in obj_data:
            obj_data['joining_date'] = obj_data['join_date']
            obj_data['joining_date_v2'] = obj_data['join_date']

        # Handle banking variations
        if 'bank_account_number' in obj_data:
            obj_data['bank_account_no'] = obj_data['bank_account_number']
        elif 'bank_account_no' in obj_data:
            obj_data['bank_account_number'] = obj_data['bank_account_no']
            
        if 'bank_ifsc_code' in obj_data:
            obj_data['ifsc_code'] = obj_data['bank_ifsc_code']
        elif 'ifsc_code' in obj_data:
            obj_data['bank_ifsc_code'] = obj_data['ifsc_code']

        # Re-create obj_in with the mapped data to ensure repository handles it correctly
        from app.schemas.employee import EmployeeUpdate
        obj_in = EmployeeUpdate(**obj_data)

        # SYNC LEAVE BALANCES (Feature 45)
        if 'leave_balances' in obj_data and obj_data['leave_balances']:
            from app.services.leave_service import leave_balance_service
            from app.schemas.leave import LeaveBalanceUpdate
            from decimal import Decimal
            lb_data = obj_data['leave_balances']
            # Convert float/int to Decimal for backend consistency
            clean_lb = {k: Decimal(str(v)) for k, v in lb_data.items() if v is not None}
            try:
                leave_balance_service.update_balance(db, employee_id, LeaveBalanceUpdate(**clean_lb))
                print(f"[STORAGE SYNC] Updated leave balances for {employee_id}")
            except Exception as e:
                print(f"[STORAGE SYNC ERROR] Failed to sync leave balances for {employee_id}: {e}")

        # 🛡️ Level 4: S3 Sync for Photos & Documents (Base64 Handling)
        for field in ["profile_photo_url", "photo", "aadhaar_file_url", "pan_file_url", "resume_url", "bank_proof_url"]:
            val = obj_data.get(field)
            if val and isinstance(val, str) and val.startswith("data:"):
                import base64
                import uuid
                try:
                    header, encoded = val.split(",", 1)
                    mime = header.split(":")[1].split(";")[0]
                    # Robust extension deduction
                    ext = mime.split("/")[1]
                    if ext == "jpeg": ext = "jpg"
                    if ext == "svg+xml": ext = "svg"
                    
                    content_bytes = base64.b64decode(encoded)
                    # 🚀 Use candidate/employee name for better file recognition on S3
                    safe_name = str(db_obj.name or db_obj.first_name or "employee").replace(" ", "_").lower()
                    filename = f"{safe_name}_{field}_{uuid.uuid4().hex[:6]}.{ext}"
                    path, _ = await storage_service.save_content(content_bytes, filename, sub_dir="profiles")
                    
                    # Update both the data and the obj_in instance
                    obj_data[field] = path
                    setattr(obj_in, field, path)
                    
                    # Sync photo fields specifically for profile updates
                    if field == "profile_photo_url":
                        obj_data["photo"] = path
                        setattr(obj_in, "photo", path)
                    elif field == "photo":
                        obj_data["profile_photo_url"] = path
                        setattr(obj_in, "profile_photo_url", path)
                        
                    print(f"[STORAGE SYNC] Processed base64 {field} for {employee_id} -> {path}")
                except Exception as e:
                    print(f"[EMPLOYEE SERVICE ERROR] Failed to process base64 {field}: {e}")

        res = employee_repo.update(db, db_obj, obj_in)
        
        new_data = {c.key: getattr(res, c.key, None) for c in res.__table__.columns}
        audit_service.log_action(db, "employees", employee_id, "UPDATE", changed_by, old_data, new_data)
        
        # Hydrate for return
        return self.hydrate_employee(res)

    async def delete_employee(self, db: Session, employee_id: str, changed_by: str = None):
        db_obj = employee_repo.get(db, employee_id)
        if not db_obj:
            return None
            
        old_data = {c.key: getattr(db_obj, c.key, None) for c in db_obj.__table__.columns}
        audit_service.log_action(db, "employees", employee_id, "DELETE", changed_by, old_data, None)
        
        # Deactivate associated User account
        from app.models.user import User
        user = db.query(User).filter(User.id == db_obj.user_id).first()
        if user:
            user.is_active = False
            from datetime import datetime
            user.deleted_at = datetime.now()
            db.add(user)
            db.flush()

        res = employee_repo.remove(db, db_obj.id)
        
        # Real-time Update
        from app.core.websocket_manager import websocket_manager
        import asyncio
        await websocket_manager.broadcast({
            "event": "data_updated",
            "data": { "type": "employee", "action": "delete", "id": employee_id }
        })
        return res

    def verify_subordinate_authority(self, db: Session, target_employee_id: str, approver_employee_id: str, role: str) -> bool:
        """
        Production Authority Verification Engine.
        Handles: Direct reporting, cross-module governance, and master role elevation.
        Optimized to reduce SQL overhead through aggressive ID matching.
        """
        role_lower = role.lower().replace(" ", "")
        
        # 🛡️ LEVEL 1: Master Roles (HR/Admin/IT) - Organization-wide 
        if role_lower in ["hr", "admin", "it"]:
            return True
        
        from app.models.employee import Employee
        # 🛡️ HARDENED LOOKUP: Explicitly separate string and integer queries to prevent Postgres type errors
        employee_target = None
        if str(target_employee_id).startswith("EMP"):
            employee_target = db.query(Employee).filter(Employee.employee_id == target_employee_id).first()
        
        if not employee_target:
            try:
                # Only attempt integer lookup if value is purely numeric
                if str(target_employee_id).isdigit():
                    employee_target = db.query(Employee).filter(Employee.id == int(target_employee_id)).first()
                else:
                    # Fallback for alphanumeric IDs that don't start with EMP
                    employee_target = db.query(Employee).filter(Employee.employee_id == target_employee_id).first()
            except (ValueError, TypeError):
                # Final safety fallback
                employee_target = db.query(Employee).filter(Employee.employee_id == target_employee_id).first()
        
        if not employee_target:
            return False
            
        # 🤝 LEVEL 2: Shared Governance (Cross-Module finalized by Managers)
        # Allows Managers to approve Administrative Hub staff (IT, Recruiters, HR, TLs)
        admin_roles = ['hr', 'recruiter', 'it', 'teamleader', 'manager', 'tl', 'itdepartment']
        target_role = (employee_target.role or "employee").lower().replace(" ", "")
        target_designation = (employee_target.designation or "").lower().replace(" ", "")
        
        is_admin_target = target_role in admin_roles or any(r in target_designation for r in admin_roles)
        
        if role_lower == "manager" and is_admin_target:
            return True
            
        # 🌳 LEVEL 3: Hierarchy Verification (For Managers and Team Leaders)
        if role_lower in ["manager", "teamleader", "tl"]:
            from app.models.user import User
            
            # Resolve all possible identities of the approver
            approver_identities = {str(approver_employee_id)}
            
            approver_user = db.query(User).filter(User.employee_id == approver_employee_id).first()
            if approver_user:
                approver_identities.add(str(approver_user.id))
                
            approver_emp = db.query(Employee).filter(Employee.employee_id == approver_employee_id).first()
            if not approver_emp and approver_user:
                approver_emp = db.query(Employee).filter(Employee.user_id == approver_user.id).first()
                
            if approver_emp:
                approver_identities.add(str(approver_emp.id))
                if approver_emp.employee_id:
                    approver_identities.add(str(approver_emp.employee_id))
                if approver_emp.user_id:
                    approver_identities.add(str(approver_emp.user_id))
            
            # Flatten target's supervisors, including reporting_to_id
            supervisors = {
                str(employee_target.team_leader_id) if employee_target.team_leader_id else None,
                str(employee_target.reporting_to_id) if employee_target.reporting_to_id else None,
                str(employee_target.manager_id) if employee_target.manager_id else None,
                str(employee_target.reporting_manager_id) if employee_target.reporting_manager_id else None
            }
            
            # Match identities
            return any(identity in supervisors for identity in approver_identities if identity)
        
        return False


class DepartmentService:
    def get_all_departments(self, db: Session, skip: int = 0, limit: int = 100):
        return department_repo.get_multi(db, skip, limit)

    def create_department(self, db: Session, obj_in: DepartmentCreate):
        return department_repo.create(db, obj_in)

class CompanyProfileService:
    def get_profile(self, db: Session):
        return company_repo.get_latest(db)

    def update_profile(self, db: Session, obj_in: dict, changed_by: str = None):
        db_obj = self.get_profile(db)
        if not db_obj:
            # Create if not exists
            from app.models.company_profile import CompanyProfile
            db_obj = CompanyProfile()
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            
        old_data = {c.name: getattr(db_obj, c.name) for c in db_obj.__table__.columns}
        res = company_repo.update(db, db_obj, obj_in)
        
        new_data = {c.name: getattr(res, c.name) for c in res.__table__.columns}
        audit_service.log_action(db, "company_profile", "ROOT", "UPDATE", changed_by, old_data, new_data)
        return res

employee_service = EmployeeService()
department_service = DepartmentService()
company_service = CompanyProfileService()
