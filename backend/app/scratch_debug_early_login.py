from app.db.session import SessionLocal
from app.repositories.attendance_repo import attendance_repo
from app.models.employee import Employee
from app.models.user import User

db = SessionLocal()
try:
    print("--- ALL EARLY LOGIN REQUESTS ---")
    requests = db.query(attendance_repo.early_login_model).all()
    print(f"Found {len(requests)} early login requests:")
    for r in requests:
        print(f"ID: {r.id}, EmpID: {r.employee_id}, Date: {r.date}, StartTime: {r.requested_start_time}, Reason: {r.reason}, Status: {r.status}, ApprovedBy: {r.approved_by}")
        # Let's find the employee
        emp = db.query(Employee).filter(Employee.employee_id == r.employee_id).first()
        if emp:
            print(f"  Employee Name: {emp.first_name} {emp.last_name}, TL ID: {emp.team_leader_id}, Reporting To: {emp.reporting_to_id}, Manager: {emp.manager_id}, Rep Manager: {emp.reporting_manager_id}")
        else:
            print(f"  No Employee profile found for EmpID: {r.employee_id}")

    print("\n--- TEAM LEADERS & USERS ---")
    tls = db.query(Employee).filter(Employee.role.ilike('%leader%') | Employee.role.ilike('%tl%') | Employee.reporting_to_id.isnot(None)).all()
    for tl in tls:
        print(f"TL Name: {tl.first_name} {tl.last_name}, EmpID: {tl.employee_id}, UserID: {tl.user_id}, Role: {tl.role}")
        
    users = db.query(User).filter(User.role == 'teamleader').all()
    for u in users:
        print(f"User ID: {u.id}, Username: {u.username}, Role: {u.role}, EmpID: {u.employee_id}")

finally:
    db.close()
