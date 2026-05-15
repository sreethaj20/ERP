import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaCalendarAlt, FaCircle, FaChevronDown, FaChevronRight } from "react-icons/fa";
import { refreshAttendance, getEmployeesAsync, refreshPresence, getWorkingDaysInMonth, getEmployeeShift } from "../../utils/storage";

export default function MonthlyAttendance() {
    const [records, setRecords] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [presence, setPresence] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<"daily" | "monthly">("daily");
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [expandedTL, setExpandedTL] = useState<string | null>(null);
    const todayStr = new Date().toISOString().split('T')[0];

    const adminRoles = ['hr', 'teamleader', 'team leader', 'recruiter', 'it'];

    const isPresent = (status: string) => {
        const s = (status || '').toLowerCase();
        return s === 'present' || s === 'wfh' || s === 'on shift' || s === 'tracking';
    };

    const fetchData = async () => {
        if (loading) return;
        setLoading(true);
        try {
            console.log("[Attendance] Fetching data for", month, year);
            const [empResult, attResult, presResult] = await Promise.all([
                getEmployeesAsync('manager'),
                refreshAttendance(),
                refreshPresence()
            ]);

            const filteredAtt = (attResult || []).filter((r: any) => {
                try {
                    const d = new Date(r.date);
                    return d.getFullYear() === year && (d.getMonth() + 1) === month;
                } catch (e) { return false; }
            });

            setRecords(filteredAtt);
            setEmployees(empResult || []);
            setPresence(presResult || []);
        } catch (err) {
            console.error("Failed to load attendance data via active fetch:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => {
            clearInterval(interval);
        };
    }, [month, year]);

    const isAdminRole = (roleOrDept: string) => {
        const r = (roleOrDept || '').toLowerCase().replace(/\s+/g, '');
        return adminRoles.some(a => r === a.replace(/\s+/g, '') || r.includes(a.replace(/\s+/g, '')));
    };

    const visibleReports = employees;

    // Working days helper
    const calculateWorkingDays = (empId: string, m: number, y: number) => {
        const shift = getEmployeeShift(empId);
        const weekOffs = shift?.week_off_days || ['Sunday', 'Saturday'];
        return getWorkingDaysInMonth(y, m - 1, weekOffs);
    };

    // Role badge style helper
    const roleBadge = (role: string) => {
        const r = (role || '').toLowerCase().replace(/\s+/g, '');
        const map: any = {
            hr: { bg: 'rgba(10,132,255,0.15)', color: '#0a84ff', label: 'HR' },
            teamleader: { bg: 'rgba(191,90,242,0.15)', color: '#bf5af2', label: 'TL' },
            recruiter: { bg: 'rgba(48,209,88,0.15)', color: '#30d158', label: 'RECRUITER' },
            it: { bg: 'rgba(100,210,255,0.15)', color: '#64d2ff', label: 'IT' },
        };
        return map[r] || { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', label: role?.toUpperCase() || 'STAFF' };
    };

    return (
        <div className="dashboard-container">
            <Header role="Manager" title="Attendance Analytics" />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <div>
                    <h1 style={{ fontSize: "28px", fontWeight: "700" }}>Staff Attendance Center</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Real-time & monthly attendance for HR, IT, Recruiting, and TL modules</p>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: 'center' }}>
                    {/* View Toggle */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
                        <button onClick={() => setView("daily")} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: view === 'daily' ? '#0a84ff' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            Today's Status
                        </button>
                        <button onClick={() => setView("monthly")} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: view === 'monthly' ? '#0a84ff' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            Monthly Summary
                        </button>
                    </div>

                    {/* Month/Year Picker - only for monthly */}
                    {view === 'monthly' && (
                        <div className="glass-morphism" style={{ padding: "8px 15px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                            <FaCalendarAlt color="var(--accent-blue)" />
                            <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ background: "none", border: "none", color: "#fff", outline: "none", cursor: "pointer" }}>
                                {[...Array(12)].map((_, i) => (
                                    <option key={i + 1} value={i + 1} style={{ background: "#1a1a1a" }}>
                                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                            <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ background: "none", border: "none", color: "#fff", outline: "none", cursor: "pointer" }}>
                                {[year - 1, year, year + 1].map(y => (
                                    <option key={y} value={y} style={{ background: "#1a1a1a" }}>{y}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── DAILY VIEW: Today's Login/Logout Status ─── */}
            {view === 'daily' && (
                <GlassCard title="🟢 Today's Login & Logout Status" subtitle={`Live presence for ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}>
                    <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left' }}>
                                    {['Staff Member', 'Role', 'Department', 'Login Time', 'Logout Time', 'Status', 'Action'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleReports.length === 0 ? (
                                    <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                        No staff found.
                                    </td></tr>
                                ) : visibleReports.map((emp: any) => {
                                    const p = presence.find((x: any) =>
                                        String(x.employee_id) === String(emp.employee_id) ||
                                        String(x.user_id) === String(emp.employee_id)
                                    );

                                    // Find official attendance record for today
                                    const att = records.find((r: any) =>
                                        String(r.employee_id) === String(emp.employee_id) &&
                                        r.date === todayStr
                                    );

                                    const badge = roleBadge(emp.role);
                                    const isTL = (emp.role || '').toLowerCase().replace(/\s+/g, '') === 'teamleader';
                                    const isExp = expandedTL === emp.employee_id;

                                    return (
                                        <React.Fragment key={emp.id}>
                                            <tr
                                                style={{ borderBottom: '1px solid var(--border-light)', background: isExp ? 'rgba(10,132,255,0.04)' : 'transparent', transition: 'background 0.2s' }}
                                            >
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{
                                                            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                                                            background: p?.is_online ? '#30d158' : '#ff453a',
                                                            boxShadow: p?.is_online ? '0 0 8px #30d158' : 'none'
                                                        }} />
                                                        <div>
                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{emp.name}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{emp.employee_id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: badge.bg, color: badge.color }}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '13px' }}>{emp.department || '—'}</td>
                                                <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                                    {att?.login_time ? new Date(att.login_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : <span style={{ color: 'var(--text-tertiary)' }}>Not logged in</span>}
                                                </td>
                                                <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                                    {att?.logout_time
                                                        ? new Date(att.logout_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                                                        : p?.is_online ? <span style={{ color: '#30d158' }}>Active</span>
                                                            : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                                                        background: p?.is_online ? 'rgba(48,209,88,0.15)' : att?.status === 'On Leave' ? 'rgba(0,122,255,0.15)' : att?.login_time ? 'rgba(255,159,10,0.15)' : 'rgba(255,69,58,0.08)',
                                                        color: p?.is_online ? '#30d158' : att?.status === 'On Leave' ? '#0a84ff' : att?.login_time ? '#ff9f0a' : '#ff453a'
                                                    }}>
                                                        {p?.is_online ? 'ONLINE' : att?.status === 'On Leave' ? 'ON LEAVE' : att?.login_time ? 'LOGGED OUT' : 'OFFLINE'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    {isTL && (
                                                        <button
                                                            onClick={() => setExpandedTL(isExp ? null : emp.employee_id)}
                                                            style={{ background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.2)', borderRadius: '8px', padding: '5px 10px', color: '#0a84ff', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                        >
                                                            {isExp ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                                            Team
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            {/* Expanded TL Team Members */}
                                            {isExp && (() => {
                                                const teamMembers = employees.filter((e: any) => 
                                                    String(e.reporting_to_id || e.manager_id || e.reporting_manager_id || e.team_leader_id) === String(emp.employee_id)
                                                );
                                                return (
                                                    <tr>
                                                        <td colSpan={7} style={{ padding: '0 14px 14px 40px' }}>
                                                            <div style={{ padding: '16px', background: 'rgba(10,132,255,0.04)', borderRadius: '12px', border: '1px solid rgba(10,132,255,0.15)' }}>
                                                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0a84ff', marginBottom: '12px', textTransform: 'uppercase' }}>
                                                                    Team of {emp.name} — {teamMembers.length} Members
                                                                </div>
                                                                {teamMembers.length === 0 ? (
                                                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>No direct reports assigned to this Team Leader.</p>
                                                                ) : (
                                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                        <thead>
                                                                            <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-tertiary)' }}>
                                                                                {['Member', 'Login Time', 'Logout Time', 'Status'].map(h => (
                                                                                    <th key={h} style={{ padding: '8px', textAlign: 'left', fontWeight: '600', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>{h}</th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {teamMembers.map((m: any) => {
                                                                                const mp = presence.find((x: any) =>
                                                                                    String(x.employee_id) === String(m.employee_id) ||
                                                                                    String(x.user_id) === String(m.employee_id)
                                                                                );
                                                                                const matt = records.find((r: any) =>
                                                                                    String(r.employee_id) === String(m.employee_id) &&
                                                                                    r.date === todayStr
                                                                                );
                                                                                return (
                                                                                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                                        <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: '600' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: mp?.is_online ? '#30d158' : '#ff453a', flexShrink: 0 }} />
                                                                                                <div>
                                                                                                    <div>{m.name}</div>
                                                                                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'normal' }}>{m.employee_id}</div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td style={{ padding: '8px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                                                                            {matt?.login_time ? new Date(matt.login_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                                                                        </td>
                                                                                        <td style={{ padding: '8px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                                                                            {matt?.logout_time ? new Date(matt.logout_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                                                                                                : mp?.is_online ? <span style={{ color: '#30d158' }}>Active</span> : '—'}
                                                                                        </td>
                                                                                        <td style={{ padding: '8px' }}>
                                                                                            <span style={{
                                                                                                padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                                                                                                background: mp?.is_online ? 'rgba(48,209,88,0.15)' : matt?.login_time ? 'rgba(255,159,10,0.12)' : 'rgba(255,69,58,0.08)',
                                                                                                color: mp?.is_online ? '#30d158' : matt?.login_time ? '#ff9f0a' : '#ff453a'
                                                                                            }}>
                                                                                                {mp?.is_online ? 'ONLINE' : matt?.login_time ? 'LOGGED OUT' : 'OFFLINE'}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })()}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            )}

            {/* ─── MONTHLY VIEW: Attendance Summary ─── */}
            {view === 'monthly' && (
                <GlassCard title="📊 Monthly Attendance Summary" subtitle={`${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year}`}>
                    <div style={{ overflowX: 'auto', marginTop: '20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {['Employee', 'Role', 'Department', 'Working Days', 'Present', 'Leave', 'Absent/LOP', 'Fulfillment %'].map(h => (
                                        <th key={h} style={{ padding: '12px 14px' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody style={{ fontSize: '13px' }}>
                                {loading ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
                                ) : visibleReports.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                        No staff found.
                                    </td></tr>
                                ) : visibleReports.map((emp: any, idx: number) => {
                                    const empRecs = records.filter((r: any) => String(r.employee_id) === String(emp.employee_id));
                                    const present = empRecs.filter((r: any) => isPresent(r.status)).length;
                                    const leave = empRecs.filter((r: any) => r.status === 'Leave').length;
                                    const empWorkingDays = calculateWorkingDays(emp.employee_id, month, year);
                                    const absent = Math.max(0, empWorkingDays - present - leave);
                                    const fulfillment = empWorkingDays > 0 ? Math.round((present / empWorkingDays) * 100) : 0;
                                    const badge = roleBadge(emp.role);
                                    const isTL = (emp.role || '').toLowerCase().replace(/\s+/g, '') === 'teamleader';
                                    const isExp = expandedTL === emp.employee_id + '_monthly';

                                    return (
                                        <React.Fragment key={emp.id}>
                                            <tr
                                                onClick={() => isTL && setExpandedTL(isExp ? null : emp.employee_id + '_monthly')}
                                                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: isTL ? 'pointer' : 'default', background: isExp ? 'rgba(10,132,255,0.04)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                                            >
                                                <td style={{ padding: '14px' }}>
                                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                                        {emp.name}
                                                        {isTL && <span style={{ fontSize: '10px', color: '#0a84ff', marginLeft: '6px' }}>{isExp ? '▼' : '▶'} Team</span>}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{emp.employee_id}</div>
                                                </td>
                                                <td style={{ padding: '14px' }}>
                                                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: badge.bg, color: badge.color }}>{badge.label}</span>
                                                </td>
                                                <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{emp.department || '—'}</td>
                                                <td style={{ padding: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>{empWorkingDays}</td>
                                                <td style={{ padding: '14px', fontWeight: '700', color: '#30d158' }}>{present}</td>
                                                <td style={{ padding: '14px', fontWeight: '700', color: '#ff9f0a' }}>{leave}</td>
                                                <td style={{ padding: '14px', fontWeight: '700', color: '#ff453a' }}>{absent}</td>
                                                <td style={{ padding: '14px', minWidth: '140px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${fulfillment}%`, height: '100%', background: fulfillment > 90 ? '#30d158' : fulfillment > 70 ? '#ff9f0a' : '#ff453a', transition: 'width 0.6s ease' }} />
                                                        </div>
                                                        <span style={{ fontSize: '12px', fontWeight: '700', minWidth: '36px' }}>{fulfillment}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* TL expanded team monthly */}
                                            {isExp && (() => {
                                                const teamMembers = employees.filter((e: any) => String(e.reporting_to_id || e.manager_id) === String(emp.employee_id));
                                                return (
                                                    <tr>
                                                        <td colSpan={8} style={{ padding: '0 14px 14px 50px' }}>
                                                            <div style={{ padding: '16px', background: 'rgba(191,90,242,0.04)', borderRadius: '12px', border: '1px solid rgba(191,90,242,0.15)' }}>
                                                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#bf5af2', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                    Team Members of {emp.name} — Monthly Performance
                                                                </div>
                                                                {teamMembers.length === 0 ? (
                                                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>No direct reports found.</p>
                                                                ) : (
                                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                        <thead>
                                                                            <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                                                                                {['Member', 'Present', 'Leave', 'Absent', 'Fulfillment'].map(h => (
                                                                                    <th key={h} style={{ padding: '8px', textAlign: 'left' }}>{h}</th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {teamMembers.map((m: any) => {
                                                                                const mWorkingDays = calculateWorkingDays(m.employee_id, month, year);
                                                                                const mr = records.filter((r: any) => String(r.employee_id) === String(m.employee_id));
                                                                                const mp = mr.filter((r: any) => r.status === 'Present' || r.status === 'WFH').length;
                                                                                const ml = mr.filter((r: any) => r.status === 'Leave').length;
                                                                                const ma = Math.max(0, mWorkingDays - mp - ml);
                                                                                const mf = mWorkingDays > 0 ? Math.round((mp / mWorkingDays) * 100) : 0;
                                                                                return (
                                                                                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                                                        <td style={{ padding: '8px', color: '#fff' }}>
                                                                                            <div style={{ fontWeight: '600' }}>{m.name}</div>
                                                                                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{m.employee_id}</div>
                                                                                        </td>
                                                                                        <td style={{ padding: '8px', color: '#30d158', fontWeight: '700' }}>{mp}</td>
                                                                                        <td style={{ padding: '8px', color: '#ff9f0a' }}>{ml}</td>
                                                                                        <td style={{ padding: '8px', color: '#ff453a' }}>{ma}</td>
                                                                                        <td style={{ padding: '8px' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                                <div style={{ width: '60px', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                                                    <div style={{ width: `${mf}%`, height: '100%', background: mf > 90 ? '#30d158' : mf > 70 ? '#ff9f0a' : '#ff453a' }} />
                                                                                                </div>
                                                                                                <span style={{ fontWeight: '700', fontSize: '11px' }}>{mf}%</span>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })()}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
