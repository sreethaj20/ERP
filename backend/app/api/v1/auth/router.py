from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user, get_current_active_user
from app.core.rate_limiter import limiter, get_remote_address
from app.core.config import settings
from app.models.user import User
from app.models.notification import Activity
from app.schemas.auth import Token, UserOut, PasswordChange

router = APIRouter()

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    username = username.strip()
    print(f"[DEBUG] Login attempt for: {username}")
    
    try:
        user = db.query(User).filter(
            or_(
                User.username == username, 
                User.email == username,
                User.employee_id == username,
                User.email.like(f"{username}@%")
            )
        ).first()
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error. Please ensure the database service is running."
        )
    
    if not user:
        print(f"[AUTH] User not found: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(password, user.hashed_password):
        print(f"[AUTH] Password verification failed for: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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
                        print(f"[OFFBOARDING] User '{user.username}' (employee_id={emp.employee_id}) has been DEACTIVATED dynamically during login attempt.")
                    except Exception as e:
                        db.rollback()
                        print(f"[OFFBOARDING ERROR] Dynamic deactivation during login failed: {e}")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="User account is inactive. Please contact admin."
        )
    
    # Also check if login_enabled is False in role_assignments (probation over or manually locked)
    try:
        from app.models.role_assignment import RoleAssignment
        from app.models.employee import Employee as EmpModel
        emp_for_role = db.query(EmpModel).filter(EmpModel.user_id == user.id, EmpModel.deleted_at == None).first()
        if emp_for_role:
            active_role = db.query(RoleAssignment).filter(
                RoleAssignment.employee_id == emp_for_role.employee_id,
                RoleAssignment.is_active == True
            ).first()
            if active_role and not active_role.login_enabled:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Login access has been disabled for your account. Please contact your manager or HR."
                )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH WARNING] Role assignment login check failed: {e}")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    
    # 📈 Log Activity & Update Last Login
    try:
        user.last_login_at = datetime.now()
        
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
        print(f"[AUTH ERROR] Failed to log activity: {e}")
        db.rollback()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "user": UserOut.from_orm(user)
    }

@router.post("/logout", response_model=dict)
def logout():
    """
    Invalidate token (client-side only for now).
    """
    return {"msg": "Logout successful - clear your token"}

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
    user.reset_token_at = datetime.now()
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
    if not user.reset_token_at or (datetime.now() - user.reset_token_at) > timedelta(minutes=15):
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
        
    if not user.reset_token_at or (datetime.now() - user.reset_token_at) > timedelta(minutes=15):
        raise HTTPException(status_code=400, detail="Verification session expired.")

    # Update Password
    user.hashed_password = get_password_hash(new_password)
    # Clear token after use
    user.reset_token = None
    user.reset_token_at = None
    
    db.add(user)
    db.commit()
    
    return {"status": "success", "message": "Password updated successfully."}
