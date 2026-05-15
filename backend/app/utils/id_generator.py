from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.employee import Employee

def generate_next_employee_id(db: Session) -> str:
    """
    Centralized utility to generate the next sequential Employee ID (EMP-XXXX).
    Scans the Employee table for the highest numeric suffix.
    """
    # 1. Try to get the max numeric part from the string 'EMP-XXXX'
    # We use a subquery to extract the suffix and convert to integer
    # Note: This works for 'EMP-001', 'EMP-10', 'EMP-1000' etc.
    
    # Simple approach for now: Get the max id and increment
    # But to be safer, we check the actual employee_id strings
    
    try:
        # Fetch all employee IDs to find the max suffix
        # (For very large DBs, this would be optimized with SQL regex/substring)
        ids = db.query(Employee.employee_id).all()
        max_num = 0
        for (eid,) in ids:
            if eid and eid.startswith("EMP-"):
                try:
                    num = int(eid.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    continue
        
        # Next ID is max_num + 1
        next_id = f"EMP-{(max_num + 1):03d}"
        return next_id
    except Exception:
        # Fallback to simple Max(id)
        max_id = db.query(func.max(Employee.id)).scalar() or 0
        return f"EMP-{(max_id + 1):03d}"
