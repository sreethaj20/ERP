import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import { getDashboard } from "../../services/hrService";
import webSocketService from "../../services/websocketService";
import api from "../../api/apiClient";
import {
  FaUsers, FaClock, FaCalendarCheck, FaMoneyCheckAlt,
  FaUserPlus, FaUserMinus, FaFileDownload,
  FaCalendarAlt, FaHistory, FaCog, FaBuilding,
  FaUserCheck, FaHeadset, FaCoffee
} from "react-icons/fa";
import CompanyInfoWidget from "../../components/CompanyInfoWidget";
import AnnouncementWidget from "../../components/AnnouncementWidget";
import ShiftActivityWidget from "../../components/ShiftActivityWidget";
import WelcomeBanner from "../../components/WelcomeBanner";
import { syncCompanyProfile } from "../../utils/companyUtils";
import NoticePeriodBanner from "../../components/NoticePeriodBanner";

export default function HRDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [hrSessions, setHrSessions] = useState<any[]>([]);
  const [tickTime, setTickTime] = useState<number>(Date.now());
  const [pingLoading, setPingLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const role = sessionStorage.getItem("userRole") || "hr";
      const timesheetEndpoint = role === "manager" ? "manager/staff-timesheet" : "hr/staff-timesheet";
      const [data, sRes] = await Promise.all([
        getDashboard(),
        api.get(timesheetEndpoint)
      ]);
      setDashboardData(data);
      syncCompanyProfile(data.company);

      // Sync live HR staff sessions
      const todayStr = new Date().toISOString().split('T')[0];
      const activeSessions = (sRes.data || []).filter((s: any) => {
        if (s.logout_time) return false;
        const sessDate = s.date ? s.date.split('T')[0] : '';
        return sessDate === todayStr;
      });
      const hrActives = activeSessions.filter((s: any) => 
        (s.role || '').toLowerCase().replace(/[\s_]+/g, '').includes('hr')
      );
      setHrSessions(hrActives);

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
    const interval = setInterval(loadAllData, 20000);
    const ticker = setInterval(() => setTickTime(Date.now()), 1000);

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
      clearInterval(interval);
      clearInterval(ticker);
    };
  }, []);

  const handlePing = async (empId: string, empName: string, onBreak: boolean) => {
    const defaultMsg = onBreak 
      ? `Critical payroll approvals or onboarding clearances are waiting. Please end your break and resume active duties immediately.` 
      : `HR Governance Operational Alert: Please confirm compliance logs and payroll preparation updates.`;
    const message = window.prompt(`Operational Alert to HR Specialist ${empName}:`, defaultMsg);
    if (message === null) return;
    
    try {
      setPingLoading(empId);
      await api.post(`manager/ping-employee/${empId}`, { message });
      alert(`🚀 Direct operational alert sent to HR Specialist ${empName}!`);
    } catch (e: any) {
      alert(`❌ Transmission failed: ${e.message}`);
    } finally {
      setPingLoading(null);
    }
  };

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
    { title: "Interview Panel", subtitle: "Conduct & review scorecards", path: "/hr/interviews", icon: <FaCalendarAlt size={24} color="#bf5af2" /> },
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

      <NoticePeriodBanner noticePeriod={dashboardData?.notice_period} />

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

        {/* Sidebar Info & Active HR Staff Tracker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Live HR Operational Shift Activity */}
          <GlassCard title="Live HR Governance Pulse" subtitle="HR Specialists active sessions">
            <style>{`
              @keyframes pulseDot {
                0% { box-shadow: 0 0 0 0 rgba(48, 209, 88, 0.4); }
                70% { box-shadow: 0 0 0 6px rgba(48, 209, 88, 0); }
                100% { box-shadow: 0 0 0 0 rgba(48, 209, 88, 0); }
              }
              .pulse-green-dot {
                animation: pulseDot 2s infinite;
              }
            `}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
              {hrSessions.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                  No HR specialists currently active.
                </div>
              ) : (
                hrSessions.map((s: any) => {
                  const startedTime = new Date(s.login_time || s.started_at).getTime();
                  const elapsedSecs = Math.max(0, Math.floor((tickTime - startedTime) / 1000));
                  
                  let breakSec = s.total_break_seconds || 0;
                  if (s.on_break && s.current_break_start) {
                    breakSec += Math.floor((tickTime - new Date(s.current_break_start).getTime()) / 1000);
                  }
                  
                  const workSec = Math.max(0, elapsedSecs - breakSec);
                  
                  const formatSecs = (secs: number) => {
                    const h = Math.floor(secs / 3600);
                    const m = Math.floor((secs % 3600) / 60);
                    const sec = secs % 60;
                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
                  };

                  return (
                    <div key={s.id || s.session_id} style={{
                      padding: '12px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className={s.on_break ? '' : 'pulse-green-dot'} style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: s.on_break ? '#ff9f0a' : '#30d158',
                          }} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{s.employee_name}</div>
                            <div style={{ fontSize: '10px', color: '#0a84ff', fontWeight: '800', textTransform: 'uppercase', marginTop: '2px' }}>
                              {s.role} • {s.department}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handlePing(s.employee_id || s.user_id, s.employee_name, s.on_break)}
                          disabled={pingLoading === s.employee_id}
                          className="apple-btn"
                          style={{
                            background: s.on_break ? 'rgba(255,159,10,0.12)' : 'rgba(10,132,255,0.12)',
                            color: s.on_break ? '#ff9f0a' : '#0a84ff',
                            border: 'none',
                            padding: '4px 8px',
                            fontSize: '9px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          {pingLoading === s.employee_id ? 'Pinging...' : s.on_break ? '🚨 Call back' : '✉️ Ping'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px' }}>
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '4px' }}>Work:</span>
                          <span style={{ color: '#fff', fontWeight: '700', fontFamily: 'monospace' }}>{formatSecs(workSec)}</span>
                        </div>
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '4px' }}>Break:</span>
                          <span style={{ color: s.on_break ? '#ff9f0a' : '#fff', fontWeight: '700', fontFamily: 'monospace' }}>{formatSecs(breakSec)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>

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
