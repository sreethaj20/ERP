import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getVisibleShiftSessions, getBreakLogs, getEmployees } from "../../utils/storage";
import {
    FaClock, FaCoffee, FaCheckCircle, FaExclamationTriangle,
    FaMoon, FaUsers, FaSearch, FaBuilding, FaHistory
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { formatLocalTime, parseISOToLocalDate } from "../../utils/formatters";

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
    'Present': { color: '#30d158', bg: 'rgba(48,209,88,0.1)' },
    'Half Day': { color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)' },
    'Absent': { color: '#ff453a', bg: 'rgba(255,69,58,0.1)' },
    'Tracking': { color: '#0a84ff', bg: 'rgba(10,132,255,0.1)' },
    'Shift Extension': { color: '#bf5af2', bg: 'rgba(191,90,242,0.1)' },
};

const ROLE_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
    'hr': { color: '#0a84ff', label: 'HR', icon: '🏢' },
    'teamleader': { color: '#ff9f0a', label: 'Team Leader', icon: '👥' },
    'recruiter': { color: '#bf5af2', label: 'Recruiter', icon: '📋' },
    'it': { color: '#64d2ff', label: 'IT', icon: '💻' },
};

function fmtTime(iso: string | null) {
    return formatLocalTime(iso);
}

function fmtSecs(s: number) {
    if (!s || s <= 0) return '0h 0m';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function ManagerStaffTimesheet() {
    const navigate = useNavigate();
    const userId = sessionStorage.getItem("userId") || "";

    const [sessions, setSessions] = useState<any[]>([]);
    const [breakLogs, setBreakLogs] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [view, setView] = useState<'today' | 'history'>('today');
    const [historyMonth, setHistoryMonth] = useState(new Date().getMonth());
    const [historyYear, setHistoryYear] = useState(new Date().getFullYear());

    const loadData = async () => {
        const [raw, logs] = await Promise.all([
            getVisibleShiftSessions('manager', userId),
            getBreakLogs()
        ]);
        
        // Remove 'employee' role from STAFF view
        const staffOnly = (raw || []).filter((s: any) => {
            const sr = (s.role || '').toLowerCase().replace(/[\s_]+/g, '');
            return sr !== 'employee';
        });
        setSessions(staffOnly);
        setBreakLogs(logs || []);
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000); // refresh every 10s
        window.addEventListener('storage', loadData);
        return () => { clearInterval(interval); window.removeEventListener('storage', loadData); };
    }, []);

    // TODAY view sessions
    const todaySessions = sessions.filter((s: any) => s.date === selectedDate);

    // HISTORY view sessions
    const historySessions = sessions.filter((s: any) => {
        const d = new Date(s.date);
        return d.getMonth() === historyMonth && d.getFullYear() === historyYear;
    });

    // Apply search + role filter
    const applyFilters = (list: any[]) =>
        list.filter((s: any) => {
            if (searchTerm && !s.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) && !s.department?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (roleFilter !== 'all') {
                let sr = (s.role || '').toLowerCase().replace(/[\s_]+/g, '');
                if (sr === 'itdepartment') sr = 'it';
                if (sr !== roleFilter) return false;
            }
            return true;
        }).sort((a: any, b: any) => {
            if (!a.logout_time && b.logout_time) return -1;
            if (a.logout_time && !b.logout_time) return 1;
            return new Date(b.login_time || b.started_at || 0).getTime() - new Date(a.login_time || a.started_at || 0).getTime();
        });

    const displayedTodaySessions = applyFilters(todaySessions);
    const displayedHistorySessions = applyFilters(historySessions);

    // Today stats by role
    const roleGroups = Object.keys(ROLE_CONFIG).reduce((acc: any, r) => {
        acc[r] = todaySessions.filter((s: any) => {
            let sr = (s.role || '').toLowerCase().replace(/[\s_]+/g, '');
            if (sr === 'itdepartment') sr = 'it'; // canonicalize
            return sr === r;
        });
        return acc;
    }, {} as Record<string, any[]>);

    const activeNow = todaySessions.filter(s => !s.logout_time).length;
    const completedNow = todaySessions.filter(s => s.logout_time).length;
    const onBreak = todaySessions.filter(s => s.on_break).length;

    const availableRoles = [...new Set(sessions.map((s: any) => {
        let sr = (s.role || '').toLowerCase().replace(/[\s_]+/g, '');
        if (sr === 'itdepartment') sr = 'it';
        return sr;
    }))].filter(Boolean);

    return (
        <div className="dashboard-container">
            <Header role="Manager" title="Staff Timesheets" />

            {/* Page Title */}
            <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '30px', fontWeight: '700', margin: 0 }}>Staff Shift Timesheets</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '14px' }}>
                        Real-time overview of all staff login activity — HR, Team Leaders, Recruiters & IT
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setView('today')}
                        className="apple-btn"
                        style={{
                            background: view === 'today' ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.05)',
                            color: view === 'today' ? '#0a84ff' : 'var(--text-secondary)',
                            border: view === 'today' ? '1px solid rgba(10,132,255,0.3)' : '1px solid rgba(255,255,255,0.08)'
                        }}
                    >
                        <FaClock style={{ marginRight: '6px' }} />Today's Activity
                    </button>
                    <button
                        onClick={() => setView('history')}
                        className="apple-btn"
                        style={{
                            background: view === 'history' ? 'rgba(191,90,242,0.2)' : 'rgba(255,255,255,0.05)',
                            color: view === 'history' ? '#bf5af2' : 'var(--text-secondary)',
                            border: view === 'history' ? '1px solid rgba(191,90,242,0.3)' : '1px solid rgba(255,255,255,0.08)'
                        }}
                    >
                        <FaHistory style={{ marginRight: '6px' }} />History
                    </button>
                </div>
            </div>

            {/* TODAY VIEW */}
            {view === 'today' && (
                <>
                    {/* Live Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        <GlassCard style={{ border: activeNow > 0 ? '1px solid rgba(48,209,88,0.25)' : undefined, boxShadow: activeNow > 0 ? '0 0 20px rgba(48,209,88,0.08)' : undefined }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '14px', background: 'rgba(48,209,88,0.12)', borderRadius: '14px', color: '#30d158' }}><FaClock size={22} /></div>
                                <div>
                                    <div style={{ fontSize: '30px', fontWeight: '800', color: '#30d158' }}>{activeNow}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Currently on Shift</div>
                                </div>
                            </div>
                        </GlassCard>
                        <GlassCard style={{ border: onBreak > 0 ? '1px solid rgba(255,159,10,0.25)' : undefined }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '14px', background: 'rgba(255,159,10,0.12)', borderRadius: '14px', color: '#ff9f0a' }}><FaCoffee size={22} /></div>
                                <div>
                                    <div style={{ fontSize: '30px', fontWeight: '800', color: '#ff9f0a' }}>{onBreak}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Currently on Break</div>
                                </div>
                            </div>
                        </GlassCard>
                        <GlassCard>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '14px', background: 'rgba(10,132,255,0.12)', borderRadius: '14px', color: '#0a84ff' }}><FaCheckCircle size={22} /></div>
                                <div>
                                    <div style={{ fontSize: '30px', fontWeight: '800', color: '#0a84ff' }}>{completedNow}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Completed Shifts</div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Role Breakdown */}
                    <GlassCard title="Role-wise Activity" subtitle="Staff presence grouped by department role" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '16px' }}>
                            {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
                                const group = roleGroups[key] || [];
                                const active = group.filter((s: any) => !s.logout_time).length;
                                return (
                                    <div
                                        key={key}
                                        onClick={() => setRoleFilter(roleFilter === key ? 'all' : key)}
                                        style={{
                                            padding: '14px',
                                            borderRadius: '14px',
                                            background: roleFilter === key ? `${cfg.color}15` : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${roleFilter === key ? `${cfg.color}35` : 'rgba(255,255,255,0.06)'}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <div style={{ fontSize: '20px', marginBottom: '6px' }}>{cfg.icon}</div>
                                        <div style={{ fontSize: '22px', fontWeight: '800', color: cfg.color }}>{active}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{cfg.label}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>active / {group.length} today</div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>

                    {/* Date picker + search */}
                    <GlassCard>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: '700', fontSize: '15px' }}>Shift Details</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '20px' }}>
                                    {displayedTodaySessions.length} records
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ position: 'relative' }}>
                                    <FaSearch style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '11px' }} />
                                    <input type="text" className="apple-input" placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        style={{ paddingLeft: '30px', fontSize: '13px', width: '160px' }} />
                                </div>
                                <input type="date" className="apple-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                                    style={{ fontSize: '13px', width: 'auto' }} />
                            </div>
                        </div>
                        {displayedTodaySessions.length === 0 && sessions.length > 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,159,10,0.05)', borderRadius: '12px', border: '1px solid rgba(255,159,10,0.15)', marginBottom: '16px' }}>
                                <FaExclamationTriangle style={{ color: '#ff9f0a', marginRight: '8px' }} />
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    No activity found for <strong>{fmtDate(selectedDate)}</strong>. 
                                    Try checking the <strong>History</strong> tab for past records.
                                </span>
                            </div>
                        )}

                        <ShiftTable sessions={displayedTodaySessions} breakLogs={breakLogs} expanded={expanded} setExpanded={setExpanded} showEmployee showDate />
                    </GlassCard>
                </>
            )}

            {/* HISTORY VIEW */}
            {view === 'history' && (
                <GlassCard>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: '700', fontSize: '15px' }}>Monthly History</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '20px' }}>
                                {displayedHistorySessions.length} records
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <FaSearch style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '11px' }} />
                                <input type="text" className="apple-input" placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: '30px', fontSize: '13px', width: '160px' }} />
                            </div>
                            <select className="apple-input" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ fontSize: '13px', width: 'auto' }}>
                                <option value="all">All Roles</option>
                                {availableRoles.map(r => <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>)}
                            </select>
                            <select className="apple-input" value={historyMonth} onChange={e => setHistoryMonth(parseInt(e.target.value))} style={{ fontSize: '13px', width: 'auto' }}>
                                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <select className="apple-input" value={historyYear} onChange={e => setHistoryYear(parseInt(e.target.value))} style={{ fontSize: '13px', width: 'auto' }}>
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <ShiftTable sessions={displayedHistorySessions} breakLogs={breakLogs} expanded={expanded} setExpanded={setExpanded} showEmployee showDate />
                </GlassCard>
            )}
        </div>
    );
}

// ============ Reusable Table Component ============
function ShiftTable({
    sessions, breakLogs, expanded, setExpanded, showEmployee = false, showDate = false
}: {
    sessions: any[], breakLogs: any[], expanded: string | null, setExpanded: (id: string | null) => void,
    showEmployee?: boolean, showDate?: boolean
}) {
    if (sessions.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-tertiary)' }}>
                <FaUsers size={36} style={{ marginBottom: '16px', opacity: 0.2 }} />
                <div>No shift records found</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sessions.map((session: any) => {
                const isExpanded = expanded === session.id;
                const sessionBreaks = (session.break_logs && session.break_logs.length > 0)
                    ? session.break_logs
                    : breakLogs.filter((b: any) => String(b.session_id) === String(session.session_id) || String(b.session_id) === String(session.id));
                
                const displayStatus = session.remark === 'Shift Extension' ? 'Shift Extension' : session.status;
                const statusStyle = STATUS_STYLES[displayStatus] || STATUS_STYLES[session.status] || { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.04)' };
                
                const isActive = !session.logout_time && !session.ended_at;
                const roleKey = (session.role || '').toLowerCase().replace(/[\s_]+/g, '');
                const roleCfg = ROLE_CONFIG[roleKey];
                const onBreak = session.on_break;

                const loginRaw = session.login_time || session.started_at;
                const logoutRaw = session.logout_time || session.ended_at;

                const loginMs = loginRaw ? parseISOToLocalDate(loginRaw).getTime() : 0;
                const logoutMs = logoutRaw ? parseISOToLocalDate(logoutRaw).getTime() : Date.now();

                // Total Shift Duration
                const shiftSec = session.total_shift_seconds || (loginMs > 0 ? Math.max(0, Math.floor((logoutMs - loginMs) / 1000)) : 0);

                // Total Break Time
                let breakSec = session.total_break_seconds || 0;
                if (isActive && onBreak && session.current_break_start) {
                    const curBreak = Math.max(0, Math.floor((Date.now() - parseISOToLocalDate(session.current_break_start).getTime()) / 1000));
                    breakSec += curBreak;
                }

                // Total Work Time
                let workSec = session.total_work_seconds || 0;
                if (isActive || !workSec || workSec <= 0) {
                    workSec = Math.max(0, shiftSec - breakSec);
                }

                return (
                    <div
                        key={session.id}
                        style={{
                            background: isActive ? 'rgba(48,209,88,0.03)' : 'rgba(255,255,255,0.02)',
                            borderRadius: '12px',
                            border: `1px solid ${isActive ? 'rgba(48,209,88,0.18)' : 'rgba(255,255,255,0.05)'}`,
                            overflow: 'hidden'
                        }}
                    >
                        <div
                            onClick={() => setExpanded(isExpanded ? null : session.id)}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 110px 28px',
                                alignItems: 'center', gap: '10px',
                                padding: '12px 18px', cursor: 'pointer'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {showDate && <span style={{ fontSize: '13px', fontWeight: '600' }}>{fmtDate(session.date)}</span>}
                                    {showEmployee && (
                                        <>
                                            <span style={{ fontSize: '13px', fontWeight: '700' }}>{session.employee_name}</span>
                                            {roleCfg && (
                                                <span style={{ fontSize: '9px', fontWeight: '700', color: roleCfg.color, background: `${roleCfg.color}18`, borderRadius: '4px', padding: '1px 6px' }}>
                                                    {roleCfg.label}
                                                </span>
                                            )}
                                        </>
                                    )}
                                    {isActive && (
                                        <span style={{ background: 'rgba(48,209,88,0.12)', color: '#30d158', borderRadius: '5px', padding: '1px 7px', fontSize: '9px', fontWeight: '800' }}>
                                            ● LIVE
                                        </span>
                                    )}
                                    {session.on_break && (
                                        <span style={{ background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', borderRadius: '5px', padding: '1px 7px', fontSize: '9px', fontWeight: '800' }}>
                                            ☕ BREAK
                                        </span>
                                    )}
                                </div>
                                {session.department && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{session.department}</div>
                                )}
                            </div>
                            <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#30d158' }}>{fmtTime(session.login_time)}</div>
                            <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '600', color: session.logout_time ? '#0a84ff' : 'var(--text-tertiary)' }}>{fmtTime(session.logout_time)}</div>
                            <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#64d2ff', fontFamily: 'monospace' }}>{fmtSecs(workSec)}</div>
                            <div style={{ textAlign: 'center', fontSize: '13px', color: breakSec > 0 ? '#bf5af2' : 'var(--text-tertiary)' }}>{fmtSecs(breakSec)}</div>
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ padding: '3px 10px', borderRadius: '7px', fontSize: '10px', fontWeight: '800', color: statusStyle.color, background: statusStyle.bg }}>
                                    {displayStatus}
                                </span>
                            </div>
                            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px' }}>{isExpanded ? '▲' : '▼'}</div>
                        </div>

                        {isExpanded && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 18px', background: 'rgba(0,0,0,0.2)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Shift Summary</div>
                                        {[
                                            { label: 'Shift Date', value: session.date || '—', color: 'var(--accent-blue)' },
                                            { label: 'Total Shift Duration', value: fmtSecs(shiftSec), color: '#fff' },
                                            { label: 'Work Time', value: fmtSecs(workSec), color: '#64d2ff' },
                                            { label: 'Break Time', value: fmtSecs(breakSec), color: '#bf5af2' },
                                            { label: 'Breaks Count', value: (session.breaks_count || 0).toString(), color: '#ff9f0a' },
                                        ].map((row, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.label}</span>
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: row.color }}>{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Break Log</div>
                                        {sessionBreaks.length === 0 ? (
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px' }}>No breaks recorded</div>
                                        ) : (
                                            sessionBreaks.map((b: any, i: number) => (
                                                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(191,90,242,0.06)', borderRadius: '8px', marginBottom: '5px' }}>
                                                    <span style={{ fontSize: '12px' }}>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>#{i + 1}</span>
                                                        <span style={{ margin: '0 5px' }}>{fmtTime(b.start_time)}</span>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                                                        <span style={{ margin: '0 5px', color: b.end_time ? 'var(--text-primary)' : '#ff9f0a' }}>
                                                            {b.end_time ? fmtTime(b.end_time) : 'Active'}
                                                        </span>
                                                    </span>
                                                    <span style={{ fontSize: '12px', color: '#bf5af2', fontWeight: '700' }}>{fmtSecs(b.duration_seconds)}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
