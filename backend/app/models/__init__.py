from app.db.base import Base
from app.models.user import User
from app.models.employee import Employee
from app.models.company_profile import CompanyProfile, Department
from app.models.role_assignment import RoleAssignment
from app.models.attendance import Attendance, AttendanceCorrection
from app.models.leave import LeaveRequest, LeaveBalance, EarlyLoginRequest
from app.models.holiday import Holiday
from app.models.job import Job, Candidate, ScreeningLog, Interview, Offer, Application
from app.models.ticket import Ticket, TicketComment
from app.models.asset import Asset, AssetAllocation, AssetMaintenance, AccessProvision
from app.models.notification import Notification, Announcement, Activity, AuditLog
from app.models.hr_onboarding import HROnboarding, HROnboardingRequest
from app.models.manager_onboarding import ManagerOnboardingRequest, ManagerOnboarding
from app.models.preboarding import EmployeePreboarding, Preboarding
from app.models.offboarding import OffboardingRequest, Offboarding
from app.models.shift import ShiftDefinition, ShiftAssignment, ShiftSession, BreakLog
from app.models.document import Document
from app.models.performance import PerformanceReview
from app.models.task import Task
