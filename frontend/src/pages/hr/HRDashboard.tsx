import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import { getDashboard } from "../../services/hrService";
import webSocketService from "../../services/websocketService";
import {
  FaUsers, FaClock, FaCalendarCheck, FaMoneyCheckAlt,
  FaUserPlus, FaUserMinus, FaFileDownload,
  FaCalendarAlt, FaHistory, FaCog, FaBuilding,
  FaUserCheck, FaHeadset
} from "react-icons/fa";
import CompanyInfoWidget from "../../components/CompanyInfoWidget";
import AnnouncementWidget from "../../components/AnnouncementWidget";
import ShiftActivityWidget from "../../components/ShiftActivityWidget";
import WelcomeBanner from "../../components/WelcomeBanner";
import { syncCompanyProfile } from "../../utils/companyUtils";

export default function HRDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const data = await getDashboard();
      setDashboardData(data);
      syncCompanyProfile(data.company);

      // Ensure session storage has user info for the banner if missing
      if (data.employee_profile) {
        sessionStorage.setItem("department", data.employee_profile.department);
        sessionStorage.setItem("joinDate", data.employee_profile.joining_date);
        sessionStorage.setItem("reportingTo", data.employee_profile.reporting_to);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    const handleUpdate = (msg: any) => {
      if (msg.event === "data_updated" || msg.event === "lifecycle_updated") {
        loadAllData();
      }
    };
    webSocketService.on("data_updated", handleUpdate);
    webSocketService.on("lifecycle_updated", handleUpdate);

    return () => {
      webSocketService.off("data_updated", handleUpdate);
      webSocketService.off("lifecycle_updated", handleUpdate);
    };
  }, []);

  const stats = [
    { label: "Total Employees", value: (dashboardData?.total_employees || 0).toString(), color: "#0a84ff" },
    { label: "Present Today", value: (dashboardData?.present_today || 0).toString(), color: "#30d158" },
    { label: "On Leave Today", value: (dashboardData?.leave_today || 0).toString(), color: "#ff9f0a" },
    { label: "Leave Requests", value: (dashboardData?.leave_requests || 0).toString(), color: "#ff375f" }
  ];


  const modules = [
    { title: "Employee Master", subtitle: "Profiles & Records", path: "/hr/employees", icon: <FaUsers size={24} color="#64d2ff" /> },
    { title: "Attendance", subtitle: "Monitor employee logs", path: "/hr/attendance", icon: <FaClock size={24} color="#30d158" /> },
    { title: "Leave Approval", subtitle: "Finalize leave requests", path: "/hr/leaves", icon: <FaCalendarCheck size={24} color="#ff9f0a" /> },
    { title: "Hiring Selection", subtitle: "Finalize candidate hires", path: "/hr/hiring", icon: <FaUserCheck size={24} color="#30d158" /> },
    { title: "Payroll Prep", subtitle: "Process monthly salaries", path: "/hr/payroll", icon: <FaMoneyCheckAlt size={24} color="#bf5af2" /> },
    { title: "Onboarding", subtitle: "New hire checklists", path: "/hr/onboarding", icon: <FaUserPlus size={24} color="#32ade6" /> },
    { title: "Offboarding", subtitle: "Exit process tracking", path: "/hr/offboarding", icon: <FaUserMinus size={24} color="#ff375f" /> },
    { title: "Reports", subtitle: "Custom data exports", path: "/hr/reports", icon: <FaFileDownload size={24} color="#0a84ff" /> },
    { title: "Organization", subtitle: "Company info & Announcements", path: "/hr/organization", icon: <FaBuilding size={24} color="#bf5af2" /> },
    { title: "Shift Management", subtitle: "Create shifts & assign staff", path: "/hr/shifts", icon: <FaCog size={24} color="#ff9f0a" /> },
    { title: "Shift Attendance", subtitle: "Daily Login/Logout logs", path: "/hr/shift-timesheet", icon: <FaHistory size={24} color="#30d158" /> },
    { title: "Calendar MGMT", subtitle: "Managed Holidays & OFFs", path: "/hr/calendar", icon: <FaCalendarAlt size={24} color="#ff375f" /> },
    { title: "IT Support Desk", subtitle: "Technical & HR staff queries", path: "/hr/tickets", icon: <FaHeadset size={24} color="#64d2ff" /> },
    { title: "My Assets", subtitle: "Your assigned devices", path: "/hr/my-assets", icon: <FaHistory size={24} color="#64d2ff" /> },
  ];

  return (
    <div className="dashboard-container">
      <Header role="HR" title="Human Resources" />

      <WelcomeBanner role="Human Resources Admin" />

      {/* Shift Activity System */}
      <ShiftActivityWidget />

      {/* Hero Stats */}

      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "40px" }}>
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
        {/* Attendance - Main Focus */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Attendance Overview" subtitle="Company-wide presence map">
            <div style={{ marginTop: "15px" }}>
              <AttendanceCalendar type="team" />
            </div>
          </GlassCard>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <AnnouncementWidget />
          <CompanyInfoWidget />
        </div>
      </div>

      <div style={{ marginTop: "40px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "28px", margin: 0 }}>Command Center</h2>
        <div className="subtitle" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Lifecycle, Recruitment & IT Governance</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {modules.map((mod, index) => (
          <div
            key={index}
            onClick={() => navigate(mod.path)}
            className="glass-module-card"
          >
            {/* Icon badge */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '14px'
            }}>
              {mod.icon}
            </div>
            <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{mod.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{mod.subtitle}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', fontWeight: '600',
              color: 'var(--accent-blue)',
              background: 'rgba(14, 165, 233, 0.1)',
              padding: '6px 14px', borderRadius: '10px'
            }}>
              Configure →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
