from app.db.session import SessionLocal
from app.models.shift import ShiftDefinition, ShiftAssignment
import json

db = SessionLocal()
try:
    shifts = db.query(ShiftDefinition).all()
    print(f"Found {len(shifts)} shifts")
    for s in shifts:
        print(f"Shift ID: {s.id}, Name: {s.shift_name}, Start: {s.start_time}, End: {s.end_time}")
        assignments = db.query(ShiftAssignment).filter(ShiftAssignment.shift_id == s.id).all()
        print(f"  Assignments: {len(assignments)}")
        for a in assignments:
            print(f"    Assign ID: {a.id}, Emp: {a.employee_id}, At: {a.assigned_at}")
finally:
    db.close()
