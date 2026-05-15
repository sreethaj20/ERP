import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { getRole, initStorage } from './utils/storage';
import LoginPage from './pages/auth/LoginPage';
import RoleGuard from './components/RoleGuard';

// HR Pages
import HRDashboard from "./pages/hr/HRDashboard";
import OrganizationManagement from "./pages/hr/OrganizationManagement";
import EmployeeMaster from "./pages/hr/EmployeeMaster";
import AttendanceManagement from "./pages/hr/AttendanceManagement";
import LeaveManagement from "./pages/hr/LeaveManagement";
import LeaveBalance from "./pages/hr/LeaveBalance";
import HRCalendar from "./pages/hr/HRCalendar";
import PayrollPreparation from "./pages/hr/PayrollPreparation";
import OnboardingEmployees from "./pages/hr/OnboardingEmployees";
import PreboardingStatus from "./pages/hr/PreboardingStatus";
import OffboardingManagement from "./pages/hr/OffboardingManagement";
import HRReports from "./pages/hr/HRReports";
import HiringManagement from "./pages/hr/HiringManagement";
import HRPanelInterviews from "./pages/hr/PanelInterviews";
import ShiftManagement from "./pages/hr/ShiftManagement";
import HRTickets from "./pages/hr/HRTickets";

// Recruiter Pages
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import JobPosting from "./pages/recruiter/JobPosting";
import CandidatePipeline from "./pages/recruiter/CandidatePipeline";
import InterviewSchedule from "./pages/recruiter/InterviewSchedule";
import OfferManagement from "./pages/recruiter/OfferManagement";
import RecruiterReports from "./pages/recruiter/RecruiterReports";

// Team Leader Pages
import TeamLeaderDashboard from "./pages/teamleader/TeamLeaderDashboard";
import TeamMembers from "./pages/teamleader/TeamMembers";
import TeamAttendance from "./pages/teamleader/TeamAttendance";
import LeaveRecommendations from "./pages/teamleader/LeaveRecommendations";
import TaskManagement from "./pages/teamleader/TaskManagement";
import PerformanceFeedback from "./pages/teamleader/PerformanceFeedback";
import TeamLeaderReports from "./pages/teamleader/TeamLeaderReports";
import TeamPanelInterviews from "./pages/teamleader/PanelInterviews";
import EarlyLoginApprovals from "./pages/teamleader/EarlyLoginApprovals";

// IT Pages
import ITDashboard from "./pages/it/ITDashboard";
import AssetInventory from "./pages/it/AssetInventory";
import AssetDetails from "./pages/it/AssetDetails";
import AssetAllocation from "./pages/it/AssetAllocation";
import SupportTickets from "./pages/it/SupportTickets";
import AccessProvisioning from "./pages/it/AccessProvisioning";
import AccessRevocation from "./pages/it/AccessRevocation";
import ITReports from "./pages/it/ITReports";
import AssetLifecycle from "./pages/it/AssetLifecycle";
import StaffLeaveManagement from "./pages/shared/StaffLeaveManagement";

// Employee Pages
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import MyProfile from "./pages/employee/MyProfile";
import MyAssets from "./pages/employee/MyAssets";

import AttendanceHistory from "./pages/employee/AttendanceHistory";
import EmployeeLeaveManagement from "./pages/employee/LeaveManagement";
import PayrollPage from "./pages/employee/PayrollPage";
import MyPayslips from "./pages/employee/MyPayslips";
import MyTasks from "./pages/employee/MyTasks";
import SupportTicket from "./pages/employee/SupportTicket";
import EmployeeDocuments from "./pages/employee/EmployeeDocuments";
import ShiftTimesheetPage from "./pages/employee/ShiftTimesheetPage";
import EarlyLoginRequest from "./pages/employee/EarlyLoginRequest";

// Manager Pages
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import CompanyProfile from "./pages/manager/CompanyProfile";
import LifecycleControl from "./pages/manager/LifecycleControl";
import OnboardingRequests from "./pages/manager/OnboardingRequests";
import PreboardingMonitoring from "./pages/manager/PreboardingMonitoring";
import RoleAccessControl from "./pages/manager/RoleAccessControl";
import OffboardingGovernance from "./pages/manager/OffboardingGovernance";
import LeaveApprovals from "./pages/manager/LeaveApprovals";
import RecruiterPipelineView from "./pages/manager/RecruiterPipelineView";
import TeamLeaderStatusView from "./pages/manager/TeamLeaderStatusView";
import ITTicketsView from "./pages/manager/ITTicketsView";
import ManagerReports from "./pages/manager/ManagerReports";
import AuditLogs from "./pages/manager/AuditLogs";
import BroadcastCenter from "./pages/manager/BroadcastCenter";
import MonthlyAttendance from "./pages/manager/MonthlyAttendance";
import PerformanceMonitoring from "./pages/manager/PerformanceMonitoring";
import OrganizationHierarchy from "./pages/manager/OrganizationHierarchy";
import ManagerPanelInterviews from "./pages/manager/PanelInterviews";
import ManagerStaffTimesheet from "./pages/manager/ManagerStaffTimesheet";
import OnboardingWorkflow from "./pages/manager/OnboardingWorkflow";

// NEW Notifications + Support
import Notifications from "./pages/shared/Notifications";
import SupportTicketsComponent from "./pages/shared/SupportTickets";

// Layout
import Layout from "./components/Layout";

function App() {
    const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
    const token = sessionStorage.getItem("token");
    const [hydrated, setHydrated] = React.useState(false);
    
    React.useEffect(() => {
        if (isLoggedIn && token) {
            initStorage().then(() => setHydrated(true));
        } else {
            setHydrated(true); // Pre-login state is technically 'hydrated' with null
        }
    }, [isLoggedIn, token]);

    if (!hydrated) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>Connecting to HRMS Secure Network...</div>;
    }

    const role = (isLoggedIn && token) ? getRole() : "";
    
    // Secure routing: If not logged in OR no token, always go to login
    // Redirect to correct dashboard based on role
    let homePath = "/login";
    if (isLoggedIn && token && role) {
        homePath = `/${role}/dashboard`;
    }

    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                <Route path="/" element={<Navigate to={homePath} replace />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Routes wrapped in Layout */}
                <Route element={<Layout />}>
                    {/* HR ONLY Routes */}
                    <Route element={<RoleGuard allowedRoles={['hr', 'manager']} />}>
                        <Route path="/hr/dashboard" element={<HRDashboard />} />
                        <Route path="/hr/organization" element={<OrganizationManagement />} />
                        <Route path="/hr/assets" element={<AssetInventory />} />
                        <Route path="/hr/hiring" element={<HiringManagement />} />
                        <Route path="/hr/pipeline" element={<CandidatePipeline />} />
                        <Route path="/hr/jobs" element={<JobPosting />} />
                        <Route path="/hr/employees" element={<EmployeeMaster />} />
                        <Route path="/hr/attendance" element={<AttendanceManagement />} />
                        <Route path="/hr/my-assets" element={<MyAssets />} />
                        <Route path="/hr/leaves" element={<LeaveManagement />} />
                        <Route path="/hr/leave-balance" element={<LeaveBalance />} />
                        <Route path="/hr/calendar" element={<HRCalendar />} />
                        <Route path="/hr/payroll" element={<PayrollPreparation />} />
                        <Route path="/hr/onboarding" element={<OnboardingEmployees />} />
                        <Route path="/hr/preboarding" element={<PreboardingStatus />} />
                        <Route path="/hr/offboarding" element={<OffboardingManagement />} />
                        <Route path="/hr/interviews" element={<HRPanelInterviews />} />
                        <Route path="/hr/reports" element={<HRReports />} />
                        <Route path="/hr/shifts" element={<ShiftManagement />} />
                        <Route path="/hr/tickets" element={<HRTickets />} />
                        <Route path="/hr/my-leave" element={<StaffLeaveManagement role="HR" roleLabel="HR" />} />
                        <Route path="/hr/shift-timesheet" element={<ShiftTimesheetPage />} />
                        <Route path="/hr/support" element={<SupportTicket />} />
                    </Route>

                    {/* RECRUITER ONLY Routes */}
                    <Route element={<RoleGuard allowedRoles={['recruiter']} />}>
                        <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
                        <Route path="/recruiter/my-assets" element={<MyAssets />} />
                        <Route path="/recruiter/jobs" element={<JobPosting />} />
                        <Route path="/recruiter/pipeline" element={<CandidatePipeline />} />
                        <Route path="/recruiter/interviews" element={<InterviewSchedule />} />
                        <Route path="/recruiter/offers" element={<OfferManagement />} />
                        <Route path="/recruiter/leaves" element={<LeaveManagement />} />
                        <Route path="/recruiter/reports" element={<RecruiterReports />} />
                        <Route path="/recruiter/support" element={<SupportTicket />} />
                        <Route path="/recruiter/my-leave" element={<StaffLeaveManagement role="Recruiter" roleLabel="Recruiter" />} />
                        <Route path="/recruiter/shift-timesheet" element={<ShiftTimesheetPage />} />
                        <Route path="/recruiter/profile" element={<MyProfile />} />
                    </Route>

                    {/* TEAM LEADER ONLY Routes */}
                    <Route element={<RoleGuard allowedRoles={['teamleader']} />}>
                        <Route path="/teamleader/dashboard" element={<TeamLeaderDashboard />} />
                        <Route path="/teamleader/my-assets" element={<MyAssets />} />
                        <Route path="/teamleader/members" element={<TeamMembers />} />
                        <Route path="/teamleader/attendance" element={<TeamAttendance />} />
                        <Route path="/teamleader/leaves" element={<LeaveRecommendations />} />
                        <Route path="/teamleader/tasks" element={<TaskManagement />} />
                        <Route path="/teamleader/performance" element={<PerformanceFeedback />} />
                        <Route path="/teamleader/interviews" element={<TeamPanelInterviews />} />
                        <Route path="/teamleader/reports" element={<TeamLeaderReports />} />
                        <Route path="/teamleader/support" element={<SupportTicket />} />
                        <Route path="/teamleader/profile" element={<MyProfile />} />
                        <Route path="/teamleader/my-leave" element={<StaffLeaveManagement role="Team Leader" roleLabel="Team Leader" />} />
                        <Route path="/teamleader/shift-timesheet" element={<ShiftTimesheetPage />} />
                        <Route path="/teamleader/early-login" element={<EarlyLoginApprovals />} />
                    </Route>

                    {/* IT ONLY Routes */}
                    <Route element={<RoleGuard allowedRoles={['it']} />}>
                        <Route path="/it/dashboard" element={<ITDashboard />} />
                        <Route path="/it/assets" element={<AssetInventory />} />
                        <Route path="/it/assets/:assetId" element={<AssetDetails />} />
                        <Route path="/it/allocation" element={<AssetAllocation />} />
                        <Route path="/it/tickets" element={<SupportTickets />} />
                        <Route path="/it/access" element={<AccessProvisioning />} />
                        <Route path="/it/revocation" element={<AccessRevocation />} />
                        <Route path="/it/reports" element={<ITReports />} />
                        <Route path="/it/lifecycle" element={<AssetLifecycle />} />
                        <Route path="/it/my-leave" element={<StaffLeaveManagement role="IT Department" roleLabel="IT Admin" />} />
                        <Route path="/it/shift-timesheet" element={<ShiftTimesheetPage />} />
                    </Route>

                    {/* EMPLOYEE ONLY Routes */}
                    <Route element={<RoleGuard allowedRoles={['employee']} />}>
                        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
                        <Route path="/employee/profile" element={<MyProfile />} />
                        <Route path="/employee/assets" element={<MyAssets />} />
                        <Route path="/employee/early-login" element={<EarlyLoginRequest />} />
                        <Route path="/employee/attendance/history" element={<AttendanceHistory />} />
                        <Route path="/employee/leave" element={<EmployeeLeaveManagement />} />
                        <Route path="/employee/payroll" element={<PayrollPage />} />
                        <Route path="/employee/payslips" element={<MyPayslips />} />
                        <Route path="/employee/tasks" element={<MyTasks />} />
                        <Route path="/employee/support" element={<SupportTicket />} />
                        <Route path="/employee/documents" element={<EmployeeDocuments />} />
                        <Route path="/employee/shift-timesheet" element={<ShiftTimesheetPage />} />
                    </Route>

                    {/* MANAGER ONLY Routes */}
                    <Route element={<RoleGuard allowedRoles={['manager']} />}>
                        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
                        <Route path="/manager/lifecycle" element={<LifecycleControl />} />
                        <Route path="/manager/company-profile" element={<CompanyProfile />} />
                        <Route path="/manager/onboarding" element={<OnboardingRequests />} />
                        <Route path="/manager/preboarding" element={<PreboardingMonitoring />} />
                        <Route path="/manager/access-control" element={<RoleAccessControl />} />
                        <Route path="/manager/offboarding" element={<OffboardingGovernance />} />
                        <Route path="/manager/leaves" element={<LeaveApprovals />} />
                        <Route path="/manager/pipeline" element={<RecruiterPipelineView />} />
                        <Route path="/manager/team-status" element={<TeamLeaderStatusView />} />
                        <Route path="/manager/it-tickets" element={<ITTicketsView />} />
                        <Route path="/manager/reports" element={<ManagerReports />} />
                        <Route path="/manager/audit" element={<AuditLogs />} />
                        <Route path="/manager/broadcast" element={<BroadcastCenter />} />
                        <Route path="/manager/attendance" element={<MonthlyAttendance />} />
                        <Route path="/manager/performance" element={<PerformanceMonitoring />} />
                        <Route path="/manager/interviews" element={<ManagerPanelInterviews />} />
                        <Route path="/manager/hierarchy" element={<OrganizationHierarchy />} />
                        <Route path="/manager/workflow" element={<OnboardingWorkflow />} />
                        <Route path="/manager/staff-timesheet" element={<ManagerStaffTimesheet />} />
                    </Route>

                    {/* SHARED Routes (Profile, Notifications, Support) */}
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/support" element={<SupportTicketsComponent />} />
                    <Route path="/manager/profile" element={<MyProfile />} />
                    <Route path="/hr/profile" element={<MyProfile />} />
                    <Route path="/it/profile" element={<MyProfile />} />
                    <Route path="/employee/profile" element={<MyProfile />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
