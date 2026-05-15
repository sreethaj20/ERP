import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import { getDashboard } from "../../services/managerService";
import webSocketService from "../../services/websocketService";
import api from "../../api/apiClient";
import AnnouncementWidget from "../../components/AnnouncementWidget";
import {
  FaSync, FaBullhorn,
  FaUserPlus, FaUserMinus, FaClipboardList,
  FaChartBar, FaCalendarCheck, FaUserShield, FaBuilding,
  FaKey, FaProjectDiagram, FaUserCheck, FaCogs, FaWrench, FaSearch, FaClock, FaUser,
  FaGlobe, FaShieldAlt, FaTimes, FaUserTie, FaUsers
} from "react-icons/fa";
import { syncCompanyProfile } from "../../utils/companyUtils";






import ShiftActivityWidget from "../../components/ShiftActivityWidget";

import WelcomeBanner from "../../components/WelcomeBanner";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [todayActive, setTodayActive] = useState<any[]>([]);
  const [todayOnBreak, setTodayOnBreak] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getDashboard();
      setDashboardData(data);
      syncCompanyProfile(data.company);

      // Ensure session storage has user info for the banner
      if (!sessionStorage.getItem("department") && data.employee_profile) {
        sessionStorage.setItem("department", data.employee_profile.department);
        sessionStorage.setItem("joinDate", data.employee_profile.joining_date);
        sessionStorage.setItem("reportingTo", data.employee_profile.reporting_to);
      }

      // Fetch live shift snapshot
      const res = await api.get("manager/staff-timesheet");
      const staffSessions = (res.data || []).filter((s: any) => (s.role || '').toLowerCase() !== 'employee');
      setTodayActive(staffSessions.filter((s: any) => !s.logout_time));
      setTodayOnBreak(staffSessions.filter((s: any) => !s.logout_time && s.on_break));

      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = (msg: any) => {
      if (msg.event === "data_updated") loadData();
    }
    webSocketService.on("data_updated", handleUpdate);
    return () => {
      webSocketService.off("data_updated", handleUpdate);
    };
  }, []);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [access, setAccess] = useState({
    hr: true,
    recruiter: true,
    teamleader: true,
    it: true
  });

  const toggleAccess = (role: keyof typeof access) => {
    setAccess(prev => ({ ...prev, [role]: !prev[role] }));
  };

  const stats = dashboardData?.stats || {};
  const companyStats = [
    { label: "Total Staff", value: (stats.total_staff || 0).toString(), color: "#0a84ff", icon: <FaUsers /> },
    { label: "At Work", value: (stats.at_work || 0).toString(), color: "#30d158", icon: <FaUserCheck /> },
    { label: "Pending Leaves", value: (stats.pending_leaves || 0).toString(), color: "#bf5af2", icon: <FaClipboardList /> },
    { label: "LOP Month", value: (stats.lop_month || 0).toString(), color: "#ff9f0a", icon: <FaCalendarCheck /> }
  ];

  const attentionItems = dashboardData?.attention_items || [];

  const coreModules = [
    { title: "Company Profile", subtitle: "Org settings & branding", path: "/manager/company-profile", icon: <FaBuilding color="#ff9f0a" /> },
    { title: "Lifecycle Governance", subtitle: "Employee stage control", path: "/manager/lifecycle", icon: <FaSync color="#bf5af2" /> },
    { title: "Access Control", subtitle: "System-wide permissions", path: "/manager/access-control", icon: <FaKey color="#0a84ff" /> },
    { title: "Audit Trails", subtitle: "Transaction history logs", path: "/manager/audit", icon: <FaClipboardList color="#ffd60a" /> },
    { title: "Broadcast Center", subtitle: "Org-wide communications", path: "/manager/broadcast", icon: <FaBullhorn color="#ff375f" /> },
    { title: "Strategic Reports", subtitle: "Global analytics & KPIs", path: "/manager/reports", icon: <FaChartBar color="#30d158" /> },
    { title: "Corporate Hierarchy", subtitle: "Org chart & reporting lines", path: "/manager/hierarchy", icon: <FaProjectDiagram color="#5856d6" /> },
  ];

  const operationalModules = [
    { title: "Pre-boarding", subtitle: "New hire monitoring", path: "/manager/lifecycle?tab=preboarding", icon: <FaUserCheck color="#30b0c7" /> },
    { title: "Interview Panel", subtitle: "Strategic participation", path: "/manager/interviews", icon: <FaCalendarCheck color="#30d158" /> },
    { title: "Leave Pulse", subtitle: "Executive approvals", path: "/manager/leaves", icon: <FaCalendarCheck color="#ff9500" /> },
  ];

  const departmentalViews = [
    { title: "IT Ticket Pulse", subtitle: "System support health", path: "/manager/it-tickets", icon: <FaWrench color="#a2845e" /> },
    { title: "HR Governance Hub", subtitle: "Workforce & attendance health", path: "/hr/dashboard", icon: <FaUserTie color="#0a84ff" /> },
    { title: "Recruiting Funnel", subtitle: "Pipeline & job health", path: "/manager/pipeline", icon: <FaSearch color="#ff2d55" /> },
    { title: "Leadership Status", subtitle: "TL & team connectivity", path: "/manager/team-status", icon: <FaUserShield color="#5e5ce6" /> },
    { title: "Staff Timesheets", subtitle: "All roles shift activity", path: "/manager/staff-timesheet", icon: <FaClock color="#30d158" /> },
  ];

  return (
    <>
      <Header role="Manager" title="Command Center" />

      <WelcomeBanner role="Strategic Manager" />

      {/* Shift Activity System */}
      <ShiftActivityWidget />

      {/* Hero Stats & Intelligence */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "20px", marginBottom: "40px" }}>
        {/* Main Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" }}>
          {companyStats.map((stat, index) => (
            <GlassCard key={index} style={{ borderLeft: `4px solid ${stat.color}`, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: "32px", fontWeight: "800", color: "#fff", letterSpacing: '-0.5px' }}>{stat.value}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: "600", textTransform: "uppercase", marginTop: '4px' }}>{stat.label}</div>
                </div>
                <div style={{ fontSize: '24px', opacity: 0.3, color: stat.color }}>{stat.icon}</div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Intelligence Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Strategic Intelligence (Executive Alerts) */}
          {attentionItems.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <SectionHeader title="Strategic Intelligence" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {attentionItems.map((item: any, i: number) => (
                  <div key={i} style={{
                    padding: '16px 20px',
                    borderRadius: '20px',
                    background: item.type === 'risk' ? 'rgba(255,69,58,0.08)' : item.type === 'task' ? 'rgba(10,132,255,0.08)' : 'rgba(255,159,10,0.08)',
                    border: `1px solid ${item.type === 'risk' ? '#ff453a30' : item.type === 'task' ? '#0a84ff30' : '#ff9f0a30'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: item.type === 'risk' ? '#ff453a' : item.type === 'task' ? '#0a84ff' : '#ff9f0a',
                      boxShadow: `0 0 10px ${item.type === 'risk' ? '#ff453a' : item.type === 'task' ? '#0a84ff' : '#ff9f0a'}`
                    }} />
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>{item.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Shift Activity Panel */}
          {todayActive.length > 0 && (
            <GlassCard
              title="Live Shift Activity"
              subtitle={`${todayActive.length} staff currently on shift`}
              headerAction={
                <button className="apple-btn" onClick={() => navigate('/manager/staff-timesheet')}
                  style={{ background: 'rgba(48,209,88,0.12)', color: '#30d158', border: '1px solid rgba(48,209,88,0.2)', fontSize: '12px' }}>
                  <FaClock style={{ marginRight: '6px' }} />View
                </button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {todayActive.slice(0, 5).map((s: any) => {
                  let r = (s.role || '').toLowerCase().replace(/[\s_]+/g, '');
                  if (r === 'itdepartment') r = 'it';
                  const roleColors: Record<string, string> = {
                    employee: '#30d158', hr: '#0a84ff', teamleader: '#ff9f0a',
                    recruiter: '#bf5af2', it: '#64d2ff'
                  };
                  const c = roleColors[r] || '#fff';
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.on_break ? '#ff9f0a' : '#30d158' }} />
                      <div style={{ fontSize: '12px', fontWeight: '500' }}>{s.employee_name}</div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      <SectionHeader title="Strategic Command" />
      <div style={{ display: "flex", gap: "20px", marginBottom: "40px" }}>
        <div
          onClick={() => setActiveModal('presence')}
          className="glass-module-card"
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}
        >
          <div style={{ ...iconCircleStyle, background: 'rgba(10, 132, 255, 0.15)', color: '#0a84ff' }}>
            <FaGlobe size={20} />
          </div>
          <div>
            <div style={controlTitleStyle}>Global Presence Map</div>
            <div style={controlSubtitleStyle}>Check real-time availability</div>
          </div>
        </div>

        <div
          onClick={() => setActiveModal('emergency')}
          className="glass-module-card"
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}
        >
          <div style={{ ...iconCircleStyle, background: 'rgba(255, 69, 58, 0.15)', color: '#ff453a' }}>
            <FaShieldAlt size={20} />
          </div>
          <div>
            <div style={controlTitleStyle}>Emergency Control</div>
            <div style={controlSubtitleStyle}>Instant system access</div>
          </div>
        </div>
      </div>

      {/* Modal System */}
      {activeModal && (
        <div style={modalOverlayStyle} onClick={() => setActiveModal(null)}>
          <div
            style={modalContentStyle}
            onClick={e => e.stopPropagation()}
          >
            <div style={modalHeaderStyle}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                  {activeModal === 'presence' ? 'Global Presence' : 'Emergency Control'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {activeModal === 'presence' ? 'Real-time company-wide availability map' : 'Manage system-wide portal permissions'}
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={closeBtnStyle}
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {activeModal === 'presence' ? (
                <AttendanceCalendar type="team" />
              ) : (
                <div className="emergency-control-container">
                  <div style={{ marginBottom: '20px', color: 'var(--accent-red)', fontSize: '12px', background: 'rgba(255,69,58,0.08)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,69,58,0.15)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <FaShieldAlt size={24} style={{ flexShrink: 0 }} />
                    <div>
                      <b style={{ display: 'block', marginBottom: '2px' }}>CRITICAL GOVERNANCE OVERRIDE</b>
                      Toggling these switches will immediately grant or revoke access to the selected modules across the entire organization.
                    </div>
                  </div>
                  <AccessRow
                    label="HR Governance Portal"
                    desc="Core HR operations, Payroll & Attendance"
                    icon={<FaUserTie />}
                    iconBg="rgba(10, 132, 255, 0.15)"
                    iconColor="#0a84ff"
                    checked={access.hr}
                    onChange={() => toggleAccess('hr')}
                  />
                  <AccessRow
                    label="Talent Acquisition"
                    desc="Recruitment, Job Postings & Interviews"
                    icon={<FaSearch />}
                    iconBg="rgba(255, 55, 95, 0.15)"
                    iconColor="#ff375f"
                    checked={access.recruiter}
                    onChange={() => toggleAccess('recruiter')}
                  />
                  <AccessRow
                    label="Team Leader Nexus"
                    desc="Field management & Team performance"
                    icon={<FaUsers />}
                    iconBg="rgba(48, 209, 88, 0.15)"
                    iconColor="#30d158"
                    checked={access.teamleader}
                    onChange={() => toggleAccess('teamleader')}
                  />
                  <AccessRow
                    label="IT System Core"
                    desc="Assets, Infrastructure & Admin controls"
                    icon={<FaCogs />}
                    iconBg="rgba(94, 92, 230, 0.15)"
                    iconColor="#5e5ce6"
                    checked={access.it}
                    onChange={() => toggleAccess('it')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '40px' }}>
        <AnnouncementWidget />
      </div>

      <SectionHeader title="System Governance" />
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {coreModules.map((mod, i) => <ModuleCard key={i} {...mod} onClick={() => navigate(mod.path)} />)}
      </div>

      <SectionHeader title="Employee Lifecycle" />
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {operationalModules.map((mod, i) => <ModuleCard key={i} {...mod} onClick={() => navigate(mod.path)} />)}
      </div>

      <SectionHeader title="Departmental Dashboards" />
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {departmentalViews.map((mod, i) => <ModuleCard key={i} {...mod} onClick={() => navigate(mod.path)} />)}
      </div>
    </>
  );
}

              const SectionHeader = ({title}: {title: string }) => (
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {title}
                </h2>
              </div>
              );

              const ModuleCard = ({title, subtitle, icon, onClick}: any) => (
              <div onClick={onClick} className="glass-module-card">
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                  <div style={{ opacity: 0.9, marginBottom: '20px' }}>
                    {React.cloneElement(icon, { size: 32 })}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{subtitle}</div>
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', fontWeight: '600',
                    color: 'var(--accent-blue)',
                    background: 'rgba(14, 165, 233, 0.1)',
                    padding: '8px 16px', borderRadius: '12px', alignSelf: 'flex-start'
                  }}>
                    Command Center →
                  </div>
                </div>
              </div>
              );

              const AccessRow = ({label, desc, icon, iconBg, iconColor, checked, onChange}: any) => (
              <div className="access-row-card">
                <div className="access-info">
                  <div className="access-icon-wrapper" style={{ background: iconBg, color: iconColor }}>
                    {icon}
                  </div>
                  <div>
                    <div className="access-label">{label}</div>
                    <div className="access-desc">{desc}</div>
                  </div>
                </div>
                <label className="switch-premium">
                  <input type="checkbox" checked={checked} onChange={onChange} />
                  <span className="slider-premium"></span>
                </label>
              </div>
              );

              // Strategic Command Styles
              const controlWidgetStyle: React.CSSProperties = {
                flex: 1,
              padding: '16px 20px',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--border-light)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
};

              const iconCircleStyle: React.CSSProperties = {
                width: '45px',
              height: '45px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
};

              const controlTitleStyle: React.CSSProperties = {
                fontSize: '15px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '2px'
};

              const controlSubtitleStyle: React.CSSProperties = {
                fontSize: '11px',
              color: 'var(--text-tertiary)',
              fontWeight: '500'
};

              // Modal Styles
              const modalOverlayStyle: React.CSSProperties = {
                position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
};

              const modalContentStyle: React.CSSProperties = {
                background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid var(--border-light)',
              borderRadius: '30px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
              position: 'relative'
};

              const modalHeaderStyle: React.CSSProperties = {
                padding: '24px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: 'rgba(15, 23, 42, 0.98)',
              zIndex: 10
};

              const closeBtnStyle: React.CSSProperties = {
                background: 'rgba(255,255,255,0.05)',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
};


