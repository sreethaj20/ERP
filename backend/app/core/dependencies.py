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
