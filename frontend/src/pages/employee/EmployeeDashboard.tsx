import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import ShiftActivityWidget from "../../components/ShiftActivityWidget";
import { getDashboard, getMyLeaves, getMyLeaveBalance } from "../../services/employeeService";
import {
  FaUser, FaClock, FaCalendarPlus, FaMoneyCheckAlt,
  FaFileInvoiceDollar, FaTasks, FaBullhorn, FaFileAlt,
  FaHistory, FaChartPie, FaBuilding, FaIdCard
} from "react-icons/fa";
import NoticePeriodBanner from "../../components/NoticePeriodBanner";
import CompanyInfoWidget from "../../components/CompanyInfoWidget";
import AnnouncementWidget from "../../components/AnnouncementWidget";
import { calculateExperience } from "../../utils/dateHelpers";
import WelcomeBanner from "../../components/WelcomeBanner";
import { syncCompanyProfile } from "../../utils/companyUtils";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const userId = sessionStorage.getItem("userId") || "";

  const [userName, setUserName] = React.useState(sessionStorage.getItem("userName") || "Employee");
  const [currentUser, setCurrentUser] = React.useState({} as any);
  const [attendance, setAttendance] = React.useState([] as any[]);
  const [leaves, setLeaves] = React.useState([] as any[]);
  const [holidays, setHolidays] = React.useState([] as any[]);
  const [pendingCount, setPendingCount] = React.useState(0);

  const [dashboardData, setDashboardData] = React.useState<any>(null);

  const loadData = async () => {
    try {
      const [dData, pLeaves] = await Promise.all([
        getDashboard(),
        getMyLeaves()
      ]);

      setDashboardData(dData);
      syncCompanyProfile(dData.company);
      setLeaves(pLeaves);
      setPendingCount(dData.pending_requests || 0);

      // Sync employee profile for the banner
      if (dData.employee_profile) {
        sessionStorage.setItem("department", dData.employee_profile.department);
        sessionStorage.setItem("joinDate", dData.employee_profile.joining_date);
        sessionStorage.setItem("reportingTo", dData.employee_profile.reporting_to);
      }

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  React.useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [userId]);

  const myAttendance = attendance;
  const myLeaves = leaves;

  // Calculate current month stats
  const calculateCurrentMonthStats = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    today.setHours(0, 0, 0, 0);

    let present = 0;
    let leave = 0;
    let lop = 0;
    let halfDay = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      if (dateObj > today) continue;
      if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (holidays.some((h: any) => h.date === dateStr)) continue;

      // Check attendance records
      const dayRecord = myAttendance.find((r: any) => r.date === dateStr);

      // Also check leaves directly (takes precedence over absenteeism)
      const isApprovedLeave = myLeaves.some((l: any) =>
        l.status === 'approved' &&
        dateStr >= (l.start_date || l.from_date) &&
        dateStr <= (l.end_date || l.to_date)
      );

      if (isApprovedLeave) {
        leave++;
      } else if (!dayRecord) {
        lop++;
      } else {
        const status = (dayRecord.status || '').toLowerCase();
        const remark = (dayRecord.remark || '').toLowerCase();
        if (
          status.includes('present') || 
          status.includes('extension') || 
          status.includes('active') || 
          remark.includes('extension')
        ) {
          present++;
        } else if (status.includes('leave') || remark.includes('leave')) {
          leave++;
        } else if (status.includes('half')) {
          halfDay++;
          present += 0.5;
          lop += 0.5;
        } else if (status.includes('absent')) {
          lop++;
        }
      }
    }
    return { present, leave, lop, halfDay };
  };

  const monthStats = calculateCurrentMonthStats();

  const stats = [
    { label: "Present (Month)", value: (dashboardData?.present_month || 0).toString(), color: "#30d158" },
    { label: "Half Days (Month)", value: (dashboardData?.half_days_month || 0).toString(), color: "#ff9f0a" },
    { label: "Leaves (Month)", value: (dashboardData?.leaves_month || 0).toString(), color: "#bf5af2" },
    { label: "LOP (Month)", value: (dashboardData?.lop_month || 0).toString(), color: "#ff453a" },
    { label: "Pending Requests", value: (dashboardData?.pending_requests || 0).toString(), color: "#0a84ff" }
  ];

  const modules = [
    { title: "Early Login", subtitle: "Request early shift access", path: "/employee/early-login", icon: <FaClock size={24} color="#ff9f0a" /> },
    { title: "My Profile", subtitle: "Personal & employment info", path: "/employee/profile", icon: <FaUser size={24} color="#64d2ff" /> },
    { title: "Shift Attendance", subtitle: "Daily Login/Logout logs", path: "/employee/shift-timesheet", icon: <FaClock size={24} color="#0a84ff" /> },
    { title: "Attendance History", subtitle: "Review past logs", path: "/employee/attendance/history", icon: <FaHistory size={24} color="#0a84ff" /> },
    { title: "Leave Management", subtitle: "Apply, Track & View Quotas", path: "/employee/leave", icon: <FaCalendarPlus size={24} color="#ff9f0a" /> },
    { title: "My Payslips", subtitle: "View & download payslips", path: "/employee/payslips", icon: <FaFileInvoiceDollar size={24} color="#30d158" /> },
    { title: "My Tasks", subtitle: "Work assigned to you", path: "/employee/tasks", icon: <FaTasks size={24} color="#ff453a" /> },
    { title: "Support Ticket", subtitle: "Raise IT or HR query", path: "/employee/support", icon: <FaBullhorn size={24} color="#64d2ff" /> },
    { title: "My Assets", subtitle: "Assigned devices & hardware", path: "/employee/assets", icon: <FaHistory size={24} color="#64d2ff" /> },
    { title: "Documents", subtitle: "Policies & handbooks", path: "/employee/documents", icon: <FaFileAlt size={24} color="#0a84ff" /> },
  ];

  return (
    <div className="dashboard-container">
      <Header role="Employee" title="Personal Workspace" />

      {/* Shift Activity System */}
      <ShiftActivityWidget />

      <WelcomeBanner role="Team Member" />

      <NoticePeriodBanner noticePeriod={dashboardData?.notice_period} />

      {/* Hero Stats */}
      <div className="grid-5" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px", marginTop: "20px", marginBottom: "40px" }}>
        {stats.map((stat, index) => (
          <GlassCard key={index} className="stat-card" style={{ borderLeft: `3px solid ${stat.color}` }}>
            <div className="stat-value-glow" style={{ fontSize: "36px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
              {stat.value}
            </div>
            <div style={{ fontSize: "14px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {stat.label}
            </div>
          </GlassCard>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "40px" }}>
        {/* Attendance Calendar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard
            title="My Attendance"
            subtitle="Monthly presence overview"
            headerAction={
              <button
                onClick={() => navigate('/employee/leave')}
                className="apple-btn"
                style={{ fontSize: '11px', padding: '6px 12px', background: 'rgba(48,209,88,0.1)', color: '#30d158' }}
              >
                Approval Pipeline
              </button>
            }
          >
            <div style={{ marginTop: "15px" }}>
              <AttendanceCalendar type="individual" />
            </div>
          </GlassCard>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <AnnouncementWidget />
          <CompanyInfoWidget />

          <GlassCard title="My Details" subtitle="Employment Information">
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "15px" }}>
              <DetailRow label="Full Name" value={dashboardData?.employee_profile?.name || userName} color="#0a84ff" />
              <DetailRow label="Email" value={dashboardData?.employee_profile?.email || '—'} color="#30d158" />
              <DetailRow label="Designation" value={dashboardData?.employee_profile?.designation || '—'} color="#bf5af2" />
              <DetailRow label="Status" value={dashboardData?.employee_profile?.status || 'Active'} color="#30d158" />
              <DetailRow label="Join Date" value={dashboardData?.employee_profile?.joining_date || '—'} color="#ff9f0a" />
            </div>
          </GlassCard>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Quick Access</h2>
      </div>

      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {modules.map((mod, index) => (
          <div key={index} onClick={() => navigate(mod.path)} className="glass-module-card">
            <div style={{ position: "absolute", top: "20px", right: "20px", opacity: 0.2 }}>
              {React.cloneElement(mod.icon as React.ReactElement, { size: 40 })}
            </div>
            <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>{mod.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>{mod.subtitle}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', fontWeight: '600',
              color: 'var(--accent-blue)',
              background: 'rgba(14, 165, 233, 0.1)',
              padding: '6px 14px', borderRadius: '10px'
            }}>
              Launch →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DetailRow = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--border-light)" }}>
    <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{label}</span>
    <span style={{ fontSize: "14px", fontWeight: "600", color }}>{value}</span>
  </div>
);

