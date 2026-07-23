from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.models.user import User

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        print(f"[AUTH] Decoded sub (user_id): {user_id}")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.ExpiredSignatureError:
        print("[AUTH] Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (JWTError, Exception) as e:
        print(f"[AUTH] JWT Decode Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 🛡️ Hardened DB Fetch: Cast to int and handle connection drops with retry
    import time
    max_retries = 2
    retry_count = 0
    user = None
    
    while retry_count < max_retries:
        try:
            user_id_int = int(user_id)
            user = db.query(User).filter(User.id == user_id_int).first()
            break # Success
        except (ValueError, TypeError):
            print(f"[AUTH] Invalid user_id in token: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials format",
            )
        except Exception as e:
            retry_count += 1
            error_msg = str(e).lower()
            print(f"[AUTH] Database attempt {retry_count} failed: {error_msg}")
            
            # If it's a connection error, try to refresh the connection or wait
            if "closed the connection" in error_msg or "operationalerror" in error_msg or "connection refused" in error_msg:
                if retry_count < max_retries:
                    print(f"[AUTH] Retrying DB connection in 0.5s...")
                    time.sleep(0.5)
                    continue
                
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database connection lost. Please try again in a few moments.",
                )
            raise e

    if not user:
        print(f"[AUTH] User with ID {user_id} not found in DB")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="User no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"[AUTH] Authenticated: {user.email} (Role: {user.role})")
    
    if user and user.is_active:
        from app.models.employee import Employee
        from app.models.offboarding import OffboardingRequest
        from datetime import date, datetime, timedelta
        
        emp = db.query(Employee).filter(Employee.user_id == user.id, Employee.deleted_at == None).first()
        if emp and emp.status == "On Notice":
            offboard_req = db.query(OffboardingRequest).filter(
                OffboardingRequest.employee_id == emp.employee_id,
                OffboardingRequest.deleted_at == None,
                OffboardingRequest.completed == False
            ).order_by(OffboardingRequest.id.desc()).first()
            if offboard_req and (offboard_req.manager_approved or offboard_req.hr_approved):
                request_date = offboard_req.request_date or offboard_req.created_at
                notice_days = offboard_req.notice_period_days or 0
                notice_end_date = None
                if request_date:
                    req_date_val = request_date.date() if isinstance(request_date, datetime) else request_date
                    notice_end_date = req_date_val + timedelta(days=notice_days)
                
                exit_date = offboard_req.exit_date or offboard_req.last_working_day
                exit_date_val = None
                if exit_date:
                    if isinstance(exit_date, str):
                        try:
                            exit_date_val = datetime.strptime(exit_date.split("T")[0], "%Y-%m-%d").date()
                        except Exception:
                            pass
                    elif isinstance(exit_date, datetime):
                        exit_date_val = exit_date.date()
                    else:
                        exit_date_val = exit_date
                
                deactivate_date = exit_date_val if exit_date_val is not None else notice_end_date
                if deactivate_date and (deactivate_date - date.today()).days < 0:
                    emp.status = "Inactive"
                    user.is_active = False
                    offboard_req.status = "Completed"
                    offboard_req.completed = True
                    db.add(emp)
                    db.add(user)
                    db.add(offboard_req)
                    try:
                        db.commit()
                        print(f"[OFFBOARDING] User '{user.username}' (employee_id={emp.employee_id}) has been DEACTIVATED dynamically via dependency check.")
                    except Exception as e:
                        db.rollback()
                        print(f"[OFFBOARDING ERROR] Dynamic deactivation failed: {e}")
                        
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    return current_user

# --- Role Based Dependency ---
def get_current_user_with_role(required_roles: str | list[str]):
    if isinstance(required_roles, str):
        required_roles = [required_roles]
    
    def role_checker(current_user: User = Depends(get_current_active_user)):
        # Superusers bypass role checks
        if getattr(current_user, "is_superuser", False):
            print(f"[AUTH] Role check bypassed for Superuser: {current_user.email}")
            return current_user
            
        user_role = (current_user.role or "").lower()
        
        # 🛡️ Normalization Bridge: Map operational variants to core authorization groups
        # Ensures 'itadmin' gets 'it' privileges and 'requiter' gets 'recruiter' privileges
        check_role = user_role
        if user_role == 'itadmin': check_role = 'it'
        if user_role == 'requiter': check_role = 'recruiter'
        
        allowed_roles = [r.lower() for r in required_roles]
        
        # Hierarchical bypass: admin and it can do everything
        if check_role in ["admin", "it"]:
            print(f"[AUTH] Admin/IT bypass granted for: {current_user.email} (Role: {user_role})")
            return current_user

        # If admin is allowed, it's implicitly allowed for manager too (acting admin)
        if "admin" in allowed_roles and "manager" not in allowed_roles:
            allowed_roles.append("manager")
            
        # If recruiter is allowed, it's implicitly allowed for hr too (acting recruiter)
        if "recruiter" in allowed_roles and "hr" not in allowed_roles:
            allowed_roles.append("hr")
            
        print(f"[AUTH] Role Check | User: {current_user.email} | User Role: {user_role} (Effective: {check_role}) | Allowed Roles: {allowed_roles}")
            
        if check_role not in allowed_roles:
            print(f"[AUTH] ACCESS DENIED: Role {user_role} not in {allowed_roles}")
            detail_msg = f"User role '{user_role}' does not have required privileges. Needs one of: {', '.join(required_roles)}"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail_msg,
            )
        return current_user
    return role_checker
