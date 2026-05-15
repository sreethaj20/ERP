from typing import List, Callable, Optional
from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.core.dependencies import get_current_user
from app.core.exceptions import PermissionDeniedException

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role.lower() not in [role.lower() for role in self.allowed_roles]:
            raise PermissionDeniedException(f"Role {self.allowed_roles} required. Current role: {user.role}")
        return user

def has_permission(required_role: str):
    return RoleChecker([required_role])

def is_any_of(allowed_roles: List[str]):
    return RoleChecker(allowed_roles)

def is_self_or_admin(user_id_field: str):
    # This would be used in endpoints like /employee/{id}
    def decorator(id: int, user: User = Depends(get_current_user)):
        if user.role.lower() in ["admin", "manager", "it"]:
            return True
        if getattr(user, user_id_field) == id:
            return True
        raise PermissionDeniedException()
    return decorator
