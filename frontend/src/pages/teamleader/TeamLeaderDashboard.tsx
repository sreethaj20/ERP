import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import { getDashboard, handleEarlyLogin } from "../../services/teamleaderService";
import webSocketService from "../../services/websocketService";
import api from "../../api/apiClient";
import {
    HiUsers, HiCalendarDays, HiClipboardDocumentCheck,
    HiRectangleStack, HiPresentationChartLine, HiDocumentChartBar,
    HiUserGroup, HiClock
} from "react-icons/hi2";
import {
    FaClock, FaCoffee, FaCheckCircle, FaUserClock, FaHistory, FaBullhorn
} from "react-icons/fa";
import CompanyInfoWidget from "../../components/CompanyInfoWidget";
import AnnouncementWidget from "../../components/AnnouncementWidget";
import ShiftActivityWidget from "../../components/ShiftActivityWidget";
import WelcomeBanner from "../../components/WelcomeBanner";
import { syncCompanyProfile } from "../../utils/companyUtils";

export default function TeamLeaderDashboard() {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [teamSessions, setTeamSessions] = useState<any[]>([]);
    const [earlyLoginRequests, setEarlyLoginRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getDashboard();
            setDashboardData(data);
            syncCompanyProfile(data.company);
            
            // Ensure session storage has user info for the banner
            if (data.employee_profile) {
                sessionStorage.setItem("department", data.employee_profile.department);
                sessionStorage.setItem("joinDate", data.employee_profile.joining_date);
                sessionStorage.setItem("reportingTo", data.employee_profile.reporting_to);
            }
            
            // Also fetch the live team shift snapshot
            const res = await api.get("teamleader/attendance");
            setTeamSessions(res.data || []);

            // Early login requests
            const elRes = await api.get("teamleader/early-login");
            setEarlyLoginRequests(elRes.data || []);

        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
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

    const approveEarlyLogin = async (id: number, action: string) => {
        try { await handleEarlyLogin(id, action); loadData(); } catch (e) { alert("Failed"); }
    };

    const onLeaveToday = dashboardData?.on_leave_today || 0;
    const activeOnShift = teamSessions.filter(s => !s.logout_time).length;
    const onBreakNow = teamSessions.filter(s => !s.logout_time && s.on_break).length;
    const completedShift = teamSessions.filter(s => s.logout_time).length;

    const stats = [
        { label: "Team Size", value: (dashboardData?.team_size || 0).toString(), color: "#0a84ff" },
        { label: "Active on Shift", value: activeOnShift.toString(), color: "#30d158" },
        { label: "On Leave Today", value: onLeaveToday.toString(), color: "#ff9f0a" },
        { label: "Pending Approvals", value: (dashboardData?.pending_approvals || 0).toString(), color: "#bf5af2" },
    ];

    function fmtTime(iso: string | null) {
        if (!iso) return '—';
        return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    function fmtSecs(s: number) {
        if (!s || s <= 0) return '0h 0m';
        return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    }

    const modules = [
        { title: "My Team", subtitle: "View team members & details", path: "/teamleader/members", icon: <HiUsers />, color: "#007aff" },
        { title: "Team Attendance", subtitle: "Monitor daily attendance", path: "/teamleader/attendance", icon: <HiCalendarDays />, color: "#34c759" },
        { title: "Leave Requests", subtitle: "Approve or reject leaves", path: "/teamleader/leaves", icon: <HiClipboardDocumentCheck />, color: "#ff9500" },
        { title: "Task Management", subtitle: "Assign & track tasks", path: "/teamleader/tasks", icon: <HiRectangleStack />, color: "#af52de" },
        { title: "Performance", subtitle: "Feedback & appraisals", path: "/teamleader/performance", icon: <HiPresentationChartLine />, color: "#5856d6" },
        { title: "Interviews", subtitle: "Technical panel rounds", path: "/teamleader/interviews", icon: <HiUserGroup />, color: "#ff2d55" },
        { title: "Reports", subtitle: "Download team reports", path: "/teamleader/reports", icon: <HiDocumentChartBar />, color: "#ffcc00" },
        { title: "Shift Attendance", subtitle: "Daily Login/Logout logs", path: "/teamleader/shift-timesheet", icon: <HiClock />, color: "#64d2ff" },
        { title: "Support Ticket", subtitle: "Raise IT or HR query", path: "/teamleader/support", icon: <FaBullhorn />, color: "#ff9500" },
        { title: "Early Login", subtitle: "Approve shift starts", path: "/teamleader/early-login", icon: <HiClock />, color: "#ff9f0a" },
        { title: "My Assets", subtitle: "Your assigned devices", path: "/teamleader/my-assets", icon: <FaHistory />, color: "#64d2ff" },
    ];

    return (
        <div className="dashboard-container">
            <Header role="Team Leader" title="Team Management" />

            <WelcomeBanner role="Team Leader" />

            {/* ── Own Shift Activity Widget ── */}
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

            {/* ── Today's Team Shift Activity ── */}
            <GlassCard
                title="Today's Team Activity"
                subtitle={`Live shift status of your team · ${activeOnShift} active · ${onBreakNow} on break · ${completedShift} completed`}
                headerAction={
                    <button
                        className="apple-btn"
                        onClick={() => navigate('/teamleader/shift-timesheet')}
                        style={{ fontSize: '12px', background: 'rgba(100,210,255,0.1)', color: '#64d2ff', border: '1px solid rgba(100,210,255,0.2)' }}
                    >
                        <FaHistory style={{ marginRight: '6px' }} />Full Timesheet
                    </button>
                }
                style={{ marginBottom: '30px' }}
            >
                {teamSessions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                        <FaUserClock size={36} style={{ marginBottom: '12px', opacity: 0.2 }} />
                        <div style={{ fontSize: '14px' }}>No team members have logged in yet today</div>
                        <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.6 }}>Shift activity will appear here once your team starts work</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                        {/* Column headers */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 110px',
                            gap: '10px', padding: '6px 16px',
                            fontSize: '10px', color: 'var(--text-tertiary)',
                            textTransform: 'uppercase', letterSpacing: '0.8px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)'
                        }}>
                            <div>Employee</div>
                            <div style={{ textAlign: 'center' }}>Login</div>
                            <div style={{ textAlign: 'center' }}>Work</div>
                            <div style={{ textAlign: 'center' }}>Break</div>
                            <div style={{ textAlign: 'center' }}>Logout</div>
                            <div style={{ textAlign: 'center' }}>Status</div>
                        </div>

                        {teamSessions.map((session: any) => {
                            const isActive = !session.logout_time;
                            const onBreak = session.on_break;
                            const workSec = session.total_work_seconds || 0;
                            const breakSec = session.total_break_seconds || 0;

                            // For active sessions, calculate live durations
                            let liveWorkSec = workSec, liveBreakSec = breakSec;
                            if (isActive) {
                                const now = Date.now();
                                const loginMs = new Date(session.login_time || session.started_at).getTime();
                                const totalSec = Math.floor((now - loginMs) / 1000);
                                let curBreak = 0;
                                if (onBreak && session.current_break_start) {
                                    curBreak = Math.floor((now - new Date(session.current_break_start).getTime()) / 1000);
                                }
                                liveBreakSec = breakSec + curBreak;
                                liveWorkSec = totalSec - liveBreakSec;
                            }

                            const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
                                'Present': { color: '#30d158', bg: 'rgba(48,209,88,0.1)' },
                                'Half Day': { color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)' },
                                'Tracking': { color: '#0a84ff', bg: 'rgba(10,132,255,0.1)' },
                                'Absent': { color: '#ff453a', bg: 'rgba(255,69,58,0.1)' },
                            };
                            const sc = STATUS_COLORS[session.status] || { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)' };

                            return (
                                <div key={session.id} style={{
                                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 110px',
                                    gap: '10px', alignItems: 'center',
                                    padding: '12px 16px', borderRadius: '12px',
                                    background: isActive ? (onBreak ? 'rgba(255,159,10,0.04)' : 'rgba(48,209,88,0.04)') : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${isActive ? (onBreak ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)') : 'rgba(255,255,255,0.04)'}`,
                                }}>
                                    {/* Employee Name + Status dot */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                                            background: !isActive ? 'rgba(255,255,255,0.2)' : onBreak ? '#ff9f0a' : '#30d158',
                                            boxShadow: isActive ? `0 0 6px ${onBreak ? '#ff9f0a' : '#30d158'}` : 'none'
                                        }} />
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '13px' }}>{session.employee_name}</div>
                                            {onBreak && (
                                                <div style={{ fontSize: '10px', color: '#ff9f0a', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                                    <FaCoffee size={8} /> On Break
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Login time */}
                                    <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#30d158' }}>
                                        {fmtTime(session.login_time)}
                                    </div>

                                    {/* Work duration (live) */}
                                    <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#64d2ff', fontFamily: 'monospace' }}>
                                        {fmtSecs(liveWorkSec)}
                                    </div>

                                    {/* Break duration (live) */}
                                    <div style={{ textAlign: 'center', fontSize: '13px', color: liveBreakSec > 0 ? '#bf5af2' : 'var(--text-tertiary)' }}>
                                        {fmtSecs(liveBreakSec)}
                                    </div>

                                    {/* Logout time */}
                                    <div style={{ textAlign: 'center', fontSize: '13px', color: isActive ? 'var(--text-tertiary)' : '#0a84ff' }}>
                                        {fmtTime(session.logout_time)}
                                    </div>

                                    {/* Status badge */}
                                    <div style={{ textAlign: 'center' }}>
                                        {isActive ? (
                                            <span style={{ background: 'rgba(48,209,88,0.12)', color: '#30d158', borderRadius: '6px', padding: '3px 8px', fontSize: '9px', fontWeight: '800' }}>
                                                ● LIVE
                                            </span>
                                        ) : (
                                            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', color: sc.color, background: sc.bg }}>
                                                {session.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </GlassCard>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "40px" }}>
                {/* Main Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <GlassCard title="Assigned Interviews" subtitle="Technical evaluation pipeline">
                        <div style={{ marginTop: "15px", display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>You have technical rounds assigned for this week.</p>
                            <button className="apple-btn" onClick={() => navigate('/teamleader/interviews')}
                                style={{ width: '100%', background: 'rgba(52, 199, 89, 0.1)', color: '#34c759' }}>
                                Open Interview Panel
                            </button>
                        </div>
                    </GlassCard>

                    <GlassCard title="Team Attendance" subtitle="Real-time availability map">
                        <div style={{ marginTop: "15px" }}>
                            <AttendanceCalendar type="team" />
                        </div>
                    </GlassCard>
                </div>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <AnnouncementWidget />
                    <CompanyInfoWidget />

                    {/* Early Login Approvals Widget */}
                    {earlyLoginRequests.length > 0 && (
                        <GlassCard
                            title="Early Login Requests"
                            subtitle="Action required for shift starts"
                            style={{ borderLeft: '3px solid #ff9f0a' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                                {earlyLoginRequests.map((req: any) => (
                                    <div key={req.id} style={{
                                        padding: '12px', borderRadius: '14px',
                                        background: 'rgba(255,159,10,0.05)', border: '1px solid rgba(255,159,10,0.1)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: '700' }}>{req.employee_name}</div>
                                                <div style={{ fontSize: '11px', color: '#ff9f0a', fontWeight: '600', marginTop: '2px' }}>
                                                    {req.date} @ {req.requested_start_time}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{req.created_at ? new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => approveEarlyLogin(req.id, 'approved')}
                                                style={{ flex: 1, padding: '6px', borderRadius: '8px', background: '#30d158', color: '#fff', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => approveEarlyLogin(req.id, 'rejected')}
                                                style={{ flex: 1, padding: '6px', borderRadius: '8px', background: 'rgba(255,69,58,0.2)', color: '#ff453a', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    )}

                    <GlassCard title="Team Status" subtitle="Daily overview" style={{ cursor: 'pointer' }} onClick={() => navigate("/teamleader/attendance")}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px", color: 'var(--text-secondary)', fontSize: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Active on Shift</span>
                                <span style={{ color: '#30d158', fontWeight: '700' }}>{activeOnShift}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>On Break</span>
                                <span style={{ color: '#ff9f0a', fontWeight: '700' }}>{onBreakNow}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Completed Shift</span>
                                <span style={{ color: '#0a84ff', fontWeight: '700' }}>{completedShift}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>On Leave</span>
                                <span style={{ color: '#ff453a', fontWeight: '700' }}>{onLeaveToday}</span>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Team Operations</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                {modules.map((mod, index) => (
                    <div
                        key={index}
                        onClick={() => navigate(mod.path)}
                        className="glass-module-card"
                    >
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: `${mod.color}18`, border: `1px solid ${mod.color}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', color: mod.color, marginBottom: '20px'
                        }}>
                            {mod.icon}
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>{mod.title}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>{mod.subtitle}</div>
                        <div style={{ 
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            fontSize: '12px', fontWeight: '600', color: mod.color,
                            padding: '6px 14px', borderRadius: '10px', background: `${mod.color}12`
                        }}>
                            Launch Tools →
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
