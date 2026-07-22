import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import { getDashboard } from "../../services/itService";
import webSocketService from "../../services/websocketService";
import api from "../../api/apiClient";
import {
  FaLaptop, FaTools, FaTicketAlt, FaKey, FaShieldAlt,
  FaFileDownload, FaWrench, FaClock
} from "react-icons/fa";
import CompanyInfoWidget from "../../components/CompanyInfoWidget";
import AnnouncementWidget from "../../components/AnnouncementWidget";
import ShiftActivityWidget from "../../components/ShiftActivityWidget";
import WelcomeBanner from "../../components/WelcomeBanner";
import { syncCompanyProfile } from "../../utils/companyUtils";
import NoticePeriodBanner from "../../components/NoticePeriodBanner";

export default function ITDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await getDashboard();
        
        // Robust Fallback: If backend is stale and missing new keys, fetch them manually
        let pending = data.pending_tickets;
        let tasks = data.hardware_tasks;

        if (pending === undefined) {
            console.warn("[IT-DASHBOARD] Stale backend detected. Fetching tickets fallback...");
            const tickets = await api.get("it/tickets").then(r => r.data).catch(() => []);
            pending = tickets.filter((t: any) => t.status !== 'Resolved' && t.status !== 'Closed').length;
        }

        if (tasks === undefined) {
            console.warn("[IT-DASHBOARD] Stale backend detected. Fetching tasks fallback...");
            const onboarding = await api.get("it/onboarding-requests").then(r => r.data).catch(() => []);
            tasks = onboarding.length;
        }

        const enrichedData = {
            ...data,
            pending_tickets: pending,
            hardware_tasks: tasks,
            sla_met_pct: data.sla_met_pct ?? 100,
            avg_response_min: data.avg_response_min ?? 0
        };

        setDashboardData(enrichedData);
        syncCompanyProfile(data.company);
        
        // Ensure session storage has user info for the banner
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
    loadData();
    const handleUpdate = (msg: any) => {
        if (msg.event === "data_updated" || msg.event === "ticket_updated") {
            loadData();
        }
    };
    webSocketService.on("data_updated", handleUpdate);
    return () => {
      webSocketService.off("data_updated", handleUpdate);
    };
  }, []);

  const stats = [
    { label: "Hardware Assets", value: (dashboardData?.hardware_assets || 0).toString(), color: "#64d2ff" },
    { label: "Unallocated", value: (dashboardData?.unallocated_assets || 0).toString(), color: "#ffd60a" },
    { label: "Active Staff", value: (dashboardData?.active_staff || 0).toString(), color: "#30d158" },
    { label: "Hardware Tasks", value: (dashboardData?.hardware_tasks || 0).toString(), color: "#bf5af2" }
  ];

  const modules = [
    { title: "Asset Inventory", subtitle: "Manage hardware & software", path: "/it/assets", icon: <FaLaptop size={24} color="#64d2ff" /> },
    { title: "Asset Allocation", subtitle: "Assign assets to users", path: "/it/allocation", icon: <FaTools size={24} color="#30d158" /> },
    { title: "Asset Lifecycle", subtitle: "Maintenance & Transfers", path: "/it/lifecycle", icon: <FaWrench size={24} color="#ff9f0a" /> },
    { title: "Support Tickets", subtitle: "Resolve employee issues", path: "/it/tickets", icon: <FaTicketAlt size={24} color="#ff9f0a" /> },
    { title: "Access Provisioning", subtitle: "Grant role-based access", path: "/it/access", icon: <FaKey size={24} color="#0a84ff" /> },
    { title: "Revocation", subtitle: "Revoke access rights", path: "/it/revocation", icon: <FaShieldAlt size={24} color="#ff453a" /> },
    { title: "Reports", subtitle: "IT compliance reports", path: "/it/reports", icon: <FaFileDownload size={24} color="#bf5af2" /> },
    { title: "Shift Attendance", subtitle: "Daily Login/Logout logs", path: "/it/shift-timesheet", icon: <FaClock size={24} color="#30d158" /> },
  ];

  return (
    <div className="dashboard-container">
      <Header role="IT Admin" title="IT Operations" />

      <WelcomeBanner role="IT Administrator" />

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
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Support Team Availability" subtitle="IT desk presence map">
            <div style={{ marginTop: "15px" }}>
              <AttendanceCalendar type="team" />
            </div>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <AnnouncementWidget />
          <CompanyInfoWidget />

          <GlassCard title="Ticket Analytics" subtitle="Service levels">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px", color: 'var(--text-secondary)', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Open Tickets</span>
                <span style={{ color: dashboardData?.pending_tickets > 0 ? '#ff453a' : '#30d158', fontWeight: 600 }}>
                  {dashboardData?.pending_tickets ?? '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>SLA Met</span>
                <span style={{ color: '#30d158', fontWeight: 600 }}>
                  {dashboardData?.sla_met_pct ?? 100}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Avg Response</span>
                <span style={{ fontWeight: 600 }}>
                  {dashboardData?.avg_response_min ?? 0}m
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Hardware Tasks</span><span style={{ fontWeight: 600 }}>{dashboardData?.hardware_tasks ?? '—'}</span></div>
              <button className="apple-btn" onClick={() => navigate("/it/tickets")} style={{ marginTop: '10px', background: 'var(--accent-blue)' }}>Resolve Now</button>
            </div>
          </GlassCard>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>IT Management</h2>
      </div>

      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {modules.map((mod, index) => (
          <div key={index} onClick={() => navigate(mod.path)} className="glass-module-card">
            <div style={{ position: "absolute", top: "20px", right: "20px", opacity: 0.3 }}>
                 {React.cloneElement(mod.icon as React.ReactElement, { size: 40 })}
            </div>
            <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>{mod.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '80%' }}>{mod.subtitle}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', fontWeight: '600',
              color: 'var(--accent-blue)',
              background: 'rgba(14, 165, 233, 0.1)',
              padding: '8px 16px', borderRadius: '12px'
            }}>
              Manage Module →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
