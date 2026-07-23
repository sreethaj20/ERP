import re
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.employee import Employee

def generate_next_employee_id(db: Session) -> str:
    """
    Centralized utility to generate the next sequential Employee ID (starting with E0, e.g. E001, E002).
    Scans the Employee table for the highest numeric suffix.
    """
    try:
        ids = db.query(Employee.employee_id).all()
        max_num = 0
        for (eid,) in ids:
            if eid:
                m = re.search(r'\d+', eid)
                if m:
                    try:
                        num = int(m.group(0))
                        if num > max_num:
                            max_num = num
                    except ValueError:
                        continue
        
        next_num = max_num + 1
        return f"E0{next_num:02d}"
    except Exception:
        max_id = db.query(func.max(Employee.id)).scalar() or 0
        next_num = max_id + 1
        return f"E0{next_num:02d}"
