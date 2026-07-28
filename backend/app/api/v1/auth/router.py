from typing import Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Form, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token, blacklist_token
from app.core.dependencies import get_current_user, get_current_active_user
from app.core.rate_limiter import limiter, get_remote_address, is_account_locked, record_failed_attempt, reset_failed_attempts
from app.core.config import settings
from app.models.user import User
from app.models.notification import Activity
from app.schemas.auth import Token, UserOut, PasswordChange

router = APIRouter()

@router.post("/login")
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    username = username.strip()
    
    # 🔒 1. Check Account Lockout State
    if is_account_locked(username):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes."
        )
    
    # 🛡️ 2. Exact Match User Lookup (Eliminates ambiguous prefix matching)
    try:
        user = db.query(User).filter(
            or_(
                User.username == username, 
                User.email == username,
                User.employee_id == username
            )
        ).first()
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error. Please ensure the database service is running."
        )
    
    # 🕵️ 3. Anti-User Enumeration: Generic Error Message & Account Rate Limiting
    if not user or not verify_password(password, user.hashed_password):
        locked = record_failed_attempt(username)
        
        # Log Failed Security Attempt (without sensitive passwords)
        try:
            fail_activity = Activity(
                user_id=user.id if user else None,
                username=username,
                action="Login Failed",
                module="Auth",
                type="Security Alert",
                description=f"Failed login attempt for identifier '{username}'",
                message=f"Failed login attempt for identifier '{username}'",
                ip_address=request.client.host if request.client else "Unknown",
                status="Failed"
            )
            db.add(fail_activity)
            db.commit()
        except Exception:
            db.rollback()
            
        if locked:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Account has been locked for 15 minutes."
            )
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Reset failed login attempt counter upon valid password
    reset_failed_attempts(username)
    
    # Check offboarding status
    from app.models.employee import Employee
    from app.models.offboarding import OffboardingRequest
    from app.models.role_assignment import RoleAssignment
    from datetime import date, datetime, timedelta

    target_emp_id = user.employee_id
    emp = db.query(Employee).filter(
        (Employee.user_id == user.id) | (Employee.employee_id == target_emp_id if target_emp_id else False),
        Employee.deleted_at == None
    ).first()
    
    if emp and not target_emp_id:
        target_emp_id = emp.employee_id

    # Check if user has an expired / completed offboarding
    is_offboarded = False
    if target_emp_id:
        offboard_req = db.query(OffboardingRequest).filter(
            OffboardingRequest.employee_id == target_emp_id,
            OffboardingRequest.deleted_at == None
        ).order_by(OffboardingRequest.id.desc()).first()

        if offboard_req and (offboard_req.completed or offboard_req.status == "Completed"):
            is_offboarded = True
        elif offboard_req and emp and emp.status == "On Notice" and (offboard_req.manager_approved or offboard_req.hr_approved):
            request_date = offboard_req.request_date or offboard_req.created_at
            notice_days = offboard_req.notice_period_days or 0
            req_date_val = request_date.date() if isinstance(request_date, datetime) else (request_date or date.today())
            notice_end_date = req_date_val + timedelta(days=notice_days)
            
            exit_date = offboard_req.exit_date or offboard_req.last_working_day
            exit_date_val = None
            if exit_date:
                if isinstance(exit_date, str):
                    try: exit_date_val = datetime.strptime(exit_date.split("T")[0], "%Y-%m-%d").date()
                    except Exception: pass
                elif isinstance(exit_date, datetime): exit_date_val = exit_date.date()
                else: exit_date_val = exit_date
            
            deactivate_date = exit_date_val if exit_date_val is not None else notice_end_date
            if deactivate_date and (deactivate_date - date.today()).days < 0:
                is_offboarded = True
                emp.status = "Inactive"
                user.is_active = False
                offboard_req.status = "Completed"
                offboard_req.completed = True
                db.add(emp)
                db.add(user)
                db.add(offboard_req)
                try: db.commit()
                except Exception: db.rollback()

    if is_offboarded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account has been deactivated due to offboarding completion. Please contact admin."
        )

    # For all non-offboarded users with valid password, ensure account and role access are ACTIVE
    if not user.is_active:
        user.is_active = True
        user.deleted_at = None
        db.add(user)

        if emp and emp.status in ["Inactive", "Suspended", "Onboarding"]:
            emp.status = "Active"
            db.add(emp)

        if target_emp_id:
            roles = db.query(RoleAssignment).filter(RoleAssignment.employee_id == target_emp_id).all()
            for r in roles:
                r.is_active = True
                r.login_enabled = True
                db.add(r)
            if not roles:
                new_role = RoleAssignment(
                    assignment_id=f"RL-{target_emp_id}",
                    employee_id=target_emp_id,
                    role_name=user.role.upper() if user.role else "STAFF",
                    login_enabled=True,
                    assigned_by="system",
                    assigned_at=datetime.now(timezone.utc).replace(tzinfo=None),
                    is_active=True,
                    notes="Auto-activated on login"
                )
                db.add(new_role)

        try:
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
    
    # 🔑 4. Generate Short-Lived Access Token & Refresh Token
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    # 🍪 5. Attach Secure, HttpOnly, SameSite Cookies
    max_age_access = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    max_age_refresh = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=max_age_access
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=max_age_refresh
    )
    
    # 📈 Log Successful Login Activity
    try:
        user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
        
        login_activity = Activity(
            user_id=user.id,
            username=user.username,
            action="Logged In",
            module="Auth",
            type="General",
            description=f"User {user.username} logged in successfully",
            message=f"User {user.username} logged in successfully",
            ip_address=request.client.host if request.client else "Unknown",
            status="Success"
        )

        db.add(login_activity)
        db.add(user)
        db.commit()
    except Exception as e:
        db.rollback()
    
    return {
        "role": user.role,
        "user_id": user.id,
        "user": UserOut.from_orm(user)
    }

@router.post("/refresh")
def refresh_token_endpoint(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Refreshes short-lived access token using HttpOnly refresh cookie."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    try:
        payload = decode_token(refresh_token, expected_type="refresh")
        user_id = payload.get("sub")
        old_jti = payload.get("jti")
        
        user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=401, detail="User account is inactive or deleted")
            
        # Rotate tokens: blacklist old refresh token
        if old_jti:
            blacklist_token(old_jti)
            
        new_access_token = create_access_token(subject=user.id)
        new_refresh_token = create_refresh_token(subject=user.id)
        
        response.set_cookie(
            key="access_token",
            value=new_access_token,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
        )
        
        return {"message": "Token refreshed successfully"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired refresh token: {str(e)}")

@router.post("/logout", response_model=dict)
def logout(
    request: Request,
    response: Response
):
    """Revokes active tokens and clears HttpOnly cookies."""
    # Extract access token from cookie to blacklist jti
    access_token = request.cookies.get("access_token")
    if access_token:
        try:
            payload = decode_token(access_token, expected_type="access")
            jti = payload.get("jti")
            if jti:
                blacklist_token(jti)
        except Exception:
            pass

    # Also blacklist the refresh token to prevent reuse
    refresh_tok = request.cookies.get("refresh_token")
    if refresh_tok:
        try:
            ref_payload = decode_token(refresh_tok, expected_type="refresh")
            ref_jti = ref_payload.get("jti")
            if ref_jti:
                blacklist_token(ref_jti)
        except Exception:
            pass

    response.delete_cookie(key="access_token", samesite=settings.COOKIE_SAMESITE, secure=settings.COOKIE_SECURE)
    response.delete_cookie(key="refresh_token", samesite=settings.COOKIE_SAMESITE, secure=settings.COOKIE_SECURE)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserOut)
def read_users_me(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user.
    """
    return current_user

@router.post("/change-password")
def change_password(
    obj_in: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not verify_password(obj_in.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    
    from app.core.security import get_password_hash
    current_user.hashed_password = get_password_hash(obj_in.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Password updated successfully"}

@router.post("/request-password-reset")
def request_password_reset(
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Step 1: Verify email exists and generate a 6-digit secure token.
    In a real system, this would be emailed. For this demo, it's verified in DB.
    """
    from sqlalchemy import or_
    import random
    from datetime import datetime
    
    user = db.query(User).filter(or_(User.email == email, User.username == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Invalid email address. User not found.")
    
    # Generate random 6-digit token
    token = str(random.randint(100000, 999999))
    user.reset_token = token
    user.reset_token_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.add(user)
    db.commit()
    
    # 🕵️ Governance Note: In production, never return the token in the API response.
    # For this stabilized demo, we return it so the UI can proceed without a real mail server.
    return {
        "status": "success", 
        "message": "Security token generated.",
        "token": token # SIMULATED EMAIL: Returning token for testing/demo purposes
    }

@router.post("/verify-reset-token")
def verify_reset_token(
    email: str = Form(...),
    token: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Step 2: Verify the 6-digit token is correct and not expired.
    """
    from sqlalchemy import or_
    from datetime import datetime, timedelta
    
    user = db.query(User).filter(or_(User.email == email, User.username == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if not user.reset_token or user.reset_token != token:
        raise HTTPException(status_code=400, detail="Invalid security token.")
        
    # Check expiration (e.g., 15 minutes)
    if not user.reset_token_at or (datetime.now(timezone.utc).replace(tzinfo=None) - user.reset_token_at) > timedelta(minutes=15):
        raise HTTPException(status_code=400, detail="Token has expired. Please request a new one.")
        
    return {"status": "success", "message": "Token verified."}

@router.post("/reset-password")
def reset_password(
    email: str = Form(...),
    token: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Step 3: Finalize password reset using the token as proof of authorization.
    """
    from sqlalchemy import or_
    from app.core.security import get_password_hash
    from datetime import datetime, timedelta
    
    user = db.query(User).filter(or_(User.email == email, User.username == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Re-verify token security
    if not user.reset_token or user.reset_token != token:
        raise HTTPException(status_code=400, detail="Security verification failed.")
        
    if not user.reset_token_at or (datetime.now(timezone.utc).replace(tzinfo=None) - user.reset_token_at) > timedelta(minutes=15):
        raise HTTPException(status_code=400, detail="Verification session expired.")

    # Update Password
    user.hashed_password = get_password_hash(new_password)
    # Clear token after use
    user.reset_token = None
    user.reset_token_at = None
    
    db.add(user)
    db.commit()
    
    return {"status": "success", "message": "Password updated successfully."}
