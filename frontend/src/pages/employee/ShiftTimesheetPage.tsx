import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
    FaClock, FaCoffee, FaCheckCircle, FaExclamationTriangle,
    FaMoon, FaCalendarAlt, FaSearch, FaUserTie, FaCalendarCheck
} from "react-icons/fa";
import shiftService, { ShiftSession, ShiftDefinition, BreakLog } from "../../services/shiftService";
import { getWorkingDaysInMonth, getEmployees, getEmployeeShift, getHolidays } from "../../utils/storage";
import { formatLocalTime, parseISOToLocalDate } from "../../utils/formatters";

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
    'Present': { color: '#30d158', bg: 'rgba(48,209,88,0.1)' },
    'Half Day': { color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)' },
    'Absent': { color: '#ff453a', bg: 'rgba(255,69,58,0.1)' },
    'Tracking': { color: '#0a84ff', bg: 'rgba(10,132,255,0.1)' },
    'Shift Extension': { color: '#bf5af2', bg: 'rgba(191,90,242,0.1)' },
    'Week Off': { color: '#64d2ff', bg: 'rgba(100,210,255,0.1)' },
};

const ROLE_BADGE: Record<string, { color: string; label: string }> = {
    'employee': { color: '#30d158', label: 'Employee' },
    'hr': { color: '#0a84ff', label: 'HR' },
    'teamleader': { color: '#ff9f0a', label: 'Team Leader' },
    'recruiter': { color: '#bf5af2', label: 'Recruiter' },
    'it': { color: '#64d2ff', label: 'IT Dept.' },
    'itdepartment': { color: '#64d2ff', label: 'IT Dept.' },
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function fmtTime(iso: string | null) {
    return formatLocalTime(iso);
}
function fmtSeconds(s: number) {
    if (!s || s <= 0) return '0h 0m';
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}
function fmtDate(dateStr: string | null) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
}

// Get the shift assigned to an employee at session time (use shift on employee record)
function getShiftForEmployee(empId: string, allShifts: any[]) {
    return allShifts.find((sh: any) =>
        (sh.assignments || []).some((a: any) => String(a.employee_id) === String(empId))
    ) || null;
}

export default function ShiftTimesheetPage() {
    const userId = sessionStorage.getItem("userId") || "";
    const employeeId = sessionStorage.getItem("employeeId") || "";
    const userRole = sessionStorage.getItem("userRole") || "employee";
    const me = getEmployees().find((e: any) => String(e.employee_id) === String(employeeId) || String(e.id) === String(userId));

    const roleNorm = userRole.toLowerCase().replace(/[\s_]+/g, '');
    const isManager = roleNorm === 'manager';
    const isHR = roleNorm === 'hr';
    const isTL = roleNorm === 'teamleader';
    const showOthers = isManager || isHR || isTL;

    const pageTitle = isManager ? "All Staff Timesheets"
        : isHR ? "Staff Timesheets (HR View)"
            : isTL ? "My Team Timesheets"
                : "My Shift Timesheet";

    const [sessions, setSessions] = useState<ShiftSession[]>([]);
    const [breakLogs, setBreakLogs] = useState<BreakLog[]>([]);
    const [allShifts, setAllShifts] = useState<ShiftDefinition[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState(0);
    const [expandedSession, setExpandedSession] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [shiftFilter, setShiftFilter] = useState('all');
    const [allHolidays, setAllHolidays] = useState<any[]>([]);

    const loadData = async () => {
        try {
            const shifts = await shiftService.getShifts();
            setAllShifts(shifts);

            const holidays = getHolidays();
            setAllHolidays(holidays);

            let visibleSessions;
            if (isHR || isManager) {
                visibleSessions = await shiftService.getStaffTimesheets();
            } else if (isTL) {
                visibleSessions = await shiftService.getTeamAttendance();
            } else {
                visibleSessions = await shiftService.getAttendanceHistory();
            }
            setSessions(visibleSessions);
            console.log(`[ShiftTimesheet] Loaded ${visibleSessions.length} sessions for role: ${userRole}`);

            if (!showOthers) {
                const logs = await shiftService.getBreaks();
                setBreakLogs(logs);
            }
        } catch (error) {
            console.error("Failed to load shift data:", error);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedMonth, selectedYear, selectedDay]);

    // Filter sessions for display: remove own session from team-wide stats if TL
    // Filter sessions for display: for TL, we might want to see both team AND own sessions in the log, 
    // but the backend /teamleader/attendance only returns team. 
    // If the TL wants to see their own, they are already fetched if the backend includes them.
    const teamSessions = sessions; // Don't filter out self if it happens to be in the list

    // Filter by month/year, search, role and shift
    const filteredSessions = teamSessions.filter((s: any) => {
        // Filter by Month & Year
        if (s.month !== undefined && s.month !== null && s.year !== undefined && s.year !== null) {
            if ((s.month - 1) !== selectedMonth || s.year !== selectedYear) return false;
        } else {
            // Fallback for legacy records
            if (!s.date) return false;
            const d = new Date(s.date + 'T00:00:00');
            if (isNaN(d.getTime())) return false;
            if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) return false;
        }

        // Filter by Day (if not 'all')
        if (selectedDay !== 0) {
            const d = new Date(s.date + 'T00:00:00');
            if (!isNaN(d.getTime()) && d.getDate() !== selectedDay) return false;
        }

        if (searchTerm && !s.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (roleFilter !== 'all') {
            const sr = (s.role || '').toLowerCase().replace(/[\s_]+/g, '');
            if (sr !== roleFilter) return false;
        }
        if (shiftFilter !== 'all') {
            const empShift = getShiftForEmployee(s.employee_id, allShifts);
            if (!empShift || String(empShift.id) !== String(shiftFilter)) return false;
        }
        return true;
    }).sort((a: any) => {
        if (!a.logout_time) return -1;
        return 1;
    }).sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // ── Monthly Summary: per employee, calculate expected vs actual working days ──
    // Build unique employee list: for HR/TL/Manager, use the full list of relevant employees
    const myEmpId = me?.employee_id || employeeId || "";
    const myUserId = String(userId);

    const allRelevantEmployees = showOthers
        ? (isTL
            ? getEmployees().filter((e: any) => {
                const tlId = String(e.team_leader_id || '');
                const repId = String(e.reporting_to_id || '');
                const mgrId = String(e.manager_id || '');
                const repMgrId = String(e.reporting_manager_id || '');

                return (myEmpId && tlId === myEmpId) || (myUserId && tlId === myUserId) ||
                       (myEmpId && repId === myEmpId) || (myUserId && repId === myUserId) ||
                       (myEmpId && mgrId === myEmpId) || (myUserId && mgrId === myUserId) ||
                       (myEmpId && repMgrId === myEmpId) || (myUserId && repMgrId === myUserId);
            })
            : getEmployees())
        : [];
    const uniqueEmps = showOthers
        ? allRelevantEmployees.map(e => ({ id: e.employee_id || String(e.id), name: e.name || `${e.first_name} ${e.last_name || ''}`.trim(), role: e.role }))
        : [];

    // For "own" view, show the single-employee monthly shift summary prominently
    const myShift = getEmployeeShift(employeeId);
    const expectedWorkDays = myShift
        ? getWorkingDaysInMonth(selectedYear, selectedMonth, myShift.week_off_days || [], allHolidays)
        : getWorkingDaysInMonth(selectedYear, selectedMonth, ['Sunday'], allHolidays);

    // Stats calculation based on filteredSessions (which now excludes TL if isTL is true)
    const totalPresent = filteredSessions.filter(s => s.status === 'Present').length;
    const totalHalfDay = filteredSessions.filter(s => s.status === 'Half Day').length;
    const totalAbsent = filteredSessions.filter(s => s.status === 'Absent').length;
    const totalWorkSecs = filteredSessions.reduce((acc, s) => acc + (s.total_work_seconds || 0), 0);
    const totalBreakSecs = filteredSessions.reduce((acc, s) => acc + (s.total_break_seconds || 0), 0);
    const activeCount = filteredSessions.filter(s => !s.logout_time).length;

    // Separate progress for the current user
    const mySessions = sessions.filter((s: any) => String(s.employee_id) === String(employeeId) && s.date && s.date.includes(String(selectedYear)));
    const myMonthSessions = mySessions.filter((s: any) => {
        if (s.month !== undefined && s.year !== undefined) {
            return (s.month - 1) === selectedMonth && s.year === selectedYear;
        }
        if (!s.date) return false;
        const d = new Date(s.date + 'T00:00:00');
        return !isNaN(d.getTime()) && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
    const personalPresent = myMonthSessions.filter(s => s.status === 'Present').length;
    const personalProgress = `${personalPresent}/${expectedWorkDays}`;

    const availableRoles = [...new Set(sessions.map((s: any) => (s.role || '').toLowerCase().replace(/[\s_]+/g, '')))].filter(Boolean);
    const headerRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);

    return (
        <div className="dashboard-container">
            <Header role={headerRole} title="Shift Timesheet" />

            {/* Page Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '30px', fontWeight: '700', margin: 0 }}>{pageTitle}</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '14px' }}>
                    {isManager ? "Complete shift logs for all HR, Team Leaders, Recruiters, IT staff and Employees"
                        : isHR ? "Shift attendance records for all staff — based on their assigned shift & week-off schedules"
                            : isTL ? "Monitor your team's shift activity, work hours, and break usage"
                                : "Your complete shift history — work hours, breaks, and attendance based on your assigned shift"}
                </p>
            </div>

            {/* ── Shift Info Banner (Personal View) ── */}
            {myShift && (
                <div style={{
                    marginBottom: '24px', padding: '16px 22px', borderRadius: '16px',
                    background: `${myShift.color || '#0a84ff'}12`,
                    border: `1px solid ${myShift.color || '#0a84ff'}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '20px' }}>🏷️</div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{myShift.name || 'Standard Shift'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FaClock /> {myShift.shift_start} — {myShift.shift_end} ({myShift.work_hours_required}h work)
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '12px' }}>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Reporting To</div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                {me?.reporting_to || (isManager ? 'Company HQ' : 'Main Manager')}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => {
                            const isOff = (myShift.week_off_days || []).includes(d);
                            return <span key={d} style={{
                                padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                                background: isOff ? 'rgba(255,69,58,0.12)' : 'rgba(48,209,88,0.08)',
                                color: isOff ? '#ff453a' : '#30d158'
                            }}>{d.slice(0, 3)}</span>;
                        })}
                        <span style={{ padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: 'rgba(100,210,255,0.1)', color: '#64d2ff' }}>
                            {expectedWorkDays} working days this month
                        </span>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: 'Active Now', value: activeCount, color: '#0a84ff', icon: <FaClock />, glow: activeCount > 0 },
                    { label: 'Working Days (Present)', value: totalPresent, color: '#30d158', icon: <FaCheckCircle /> },
                    { label: 'Half Days', value: totalHalfDay, color: '#ff9f0a', icon: <FaMoon /> },
                    { label: 'Absent', value: totalAbsent, color: '#ff453a', icon: <FaExclamationTriangle /> },
                    { label: 'Work Hours', value: fmtSeconds(totalWorkSecs), color: '#64d2ff', icon: <FaClock /> },
                    { label: 'Break Time', value: fmtSeconds(totalBreakSecs), color: '#bf5af2', icon: <FaCoffee /> },
                    { label: 'Working Days / Expected', value: personalProgress, color: '#30d158', icon: <FaCalendarCheck />, glow: true },
                ].map((card: any, i) => (
                    <GlassCard key={i} className="stat-card" style={{
                        border: card.glow ? `1px solid rgba(10,132,255,0.35)` : undefined,
                        boxShadow: card.glow ? '0 0 16px rgba(10,132,255,0.15)' : undefined,
                        padding: '16px'
                    }}>
                        <div style={{ color: card.color, fontSize: '16px', marginBottom: '8px', opacity: 0.85 }}>{card.icon}</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: card.color }}>{card.value}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{card.label}</div>
                    </GlassCard>
                ))}
            </div>

            {/* ── Per-Employee Shift Summary (for HR/TL/Manager) ── */}
            {showOthers && uniqueEmps.length > 0 && (
                <GlassCard style={{ marginBottom: '24px' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaCalendarCheck color="#ff9f0a" /> Monthly Attendance Summary — {MONTHS[selectedMonth]} {selectedYear}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 1fr', gap: '8px', padding: '6px 14px', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div>Employee</div>
                            <div>Assigned Shift</div>
                            <div style={{ textAlign: 'center' }}>Expected Days</div>
                            <div style={{ textAlign: 'center' }}>Present</div>
                            <div style={{ textAlign: 'center' }}>Half Day</div>
                            <div style={{ textAlign: 'center' }}>Absent</div>
                            <div style={{ textAlign: 'center' }}>Work Hours</div>
                        </div>
                        {uniqueEmps.map((emp: any) => {
                            const empSessions = sessions.filter((s: any) =>
                                String(s.employee_id) === String(emp.id) &&
                                (s.month !== undefined ? (s.month - 1) === selectedMonth : true) &&
                                (s.year !== undefined ? s.year === selectedYear : true)
                            );
                            const empShift = getEmployeeShift(emp.id);
                            const expDays = empShift
                                ? getWorkingDaysInMonth(selectedYear, selectedMonth, empShift.week_off_days || [], allHolidays)
                                : getWorkingDaysInMonth(selectedYear, selectedMonth, ['Sunday'], allHolidays);
                            const pres = empSessions.filter((s: any) => s.status === 'Present').length;
                            const half = empSessions.filter((s: any) => s.status === 'Half Day').length;
                            const abs = empSessions.filter((s: any) => s.status === 'Absent').length;

                            const wkSec = empSessions.reduce((a: number, s: any) => {
                                let sSec = s.total_work_seconds || 0;
                                if (!s.logout_time) {
                                    const now = Date.now();
                                    const loginMs = new Date(s.login_time || s.started_at).getTime();
                                    const totalSec = Math.max(0, Math.floor((now - loginMs) / 1000));
                                    let curBreak = 0;
                                    if (s.on_break && s.current_break_start) {
                                        curBreak = Math.max(0, Math.floor((now - new Date(s.current_break_start).getTime()) / 1000));
                                    }
                                    sSec = Math.max(0, totalSec - ((s.total_break_seconds || 0) + curBreak));
                                }
                                return a + sSec;
                            }, 0);
                            const rb = ROLE_BADGE[(emp.role || '').toLowerCase().replace(/[\s_]+/g, '')] || { color: '#fff', label: emp.role };
                            const sc = empShift?.color || '#0a84ff';

                            return (
                                <div key={emp.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 1fr', gap: '8px', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{emp.name}</div>
                                        <span style={{ fontSize: '9px', fontWeight: '700', color: rb.color, background: `${rb.color}18`, borderRadius: '4px', padding: '1px 5px' }}>{rb.label}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {empShift ? (
                                            <>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc, flexShrink: 0 }} />
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: '600', color: sc }}>{empShift.shift_name}</div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{empShift.start_time}–{empShift.end_time}</div>
                                                </div>
                                            </>
                                        ) : (
                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>No Shift Assigned</span>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '14px', color: '#64d2ff' }}>{expDays}</div>
                                    <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '14px', color: '#30d158' }}>{pres}</div>
                                    <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '14px', color: '#ff9f0a' }}>{half}</div>
                                    <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '14px', color: '#ff453a' }}>{abs}</div>
                                    <div style={{ textAlign: 'center', fontWeight: '600', fontSize: '12px', color: '#fff' }}>{fmtSeconds(wkSec)}</div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            )}

            {/* Detailed Shift Logs */}
            <GlassCard>
                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaCalendarAlt color="#0a84ff" />
                        <span style={{ fontWeight: '700', fontSize: '16px' }}>Shift Log</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '20px' }}>
                            {filteredSessions.length} records
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {showOthers && (
                            <div style={{ position: 'relative' }}>
                                <FaSearch style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '11px' }} />
                                <input type="text" className="apple-input" placeholder="Search staff..."
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: '30px', fontSize: '13px', width: '150px' }} />
                            </div>
                        )}
                        {(isManager || isHR) && (
                            <select className="apple-input" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ fontSize: '13px', width: 'auto' }}>
                                <option value="all">All Roles</option>
                                {availableRoles.map(r => <option key={r} value={r}>{ROLE_BADGE[r]?.label || r}</option>)}
                            </select>
                        )}
                        {(isManager || isHR) && allShifts.length > 0 && (
                            <select className="apple-input" value={shiftFilter} onChange={e => setShiftFilter(e.target.value)} style={{ fontSize: '13px', width: 'auto' }}>
                                <option value="all">All Shifts</option>
                                {allShifts.map((sh: any) => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
                            </select>
                        )}
                        <select className="apple-input" value={selectedDay} onChange={e => setSelectedDay(parseInt(e.target.value))} style={{ fontSize: '13px', width: 'auto' }}>
                            <option value={0}>All Days</option>
                            {[...Array(31)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                        </select>
                        <select className="apple-input" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} style={{ fontSize: '13px', width: 'auto' }}>
                            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select className="apple-input" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ fontSize: '13px', width: 'auto' }}>
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                {/* Column Headers */}
                {filteredSessions.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: showOthers ? '1.8fr 1fr 0.8fr 1fr 1fr 1fr 1fr 110px 28px' : '1.5fr 1fr 0.8fr 1fr 1fr 1fr 1fr 110px 28px',
                        gap: '10px', padding: '8px 20px',
                        fontSize: '10px', color: 'var(--text-tertiary)',
                        textTransform: 'uppercase', letterSpacing: '1px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                    }}>
                        <div>{showOthers ? 'Employee / Date' : 'Date'}</div>
                        <div style={{ textAlign: 'center' }}>Month</div>
                        <div style={{ textAlign: 'center' }}>Year</div>
                        <div style={{ textAlign: 'center' }}>Login</div>
                        <div style={{ textAlign: 'center' }}>Logout</div>
                        <div style={{ textAlign: 'center' }}>Work</div>
                        <div style={{ textAlign: 'center' }}>Break</div>
                        <div style={{ textAlign: 'center' }}>Status</div>
                        <div></div>
                    </div>
                )}

                {filteredSessions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                        <FaCalendarAlt size={38} style={{ marginBottom: '16px', opacity: 0.25 }} />
                        <div style={{ fontSize: '15px', marginBottom: '6px' }}>No shift records found</div>
                        <div style={{ fontSize: '12px' }}>
                            {searchTerm ? `No results for "${searchTerm}"` : 'No shifts logged for this period'}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {filteredSessions.map((session: any) => {
                            const isExpanded = expandedSession === session.id;
                            const sessionBreaks = (session.break_logs && session.break_logs.length > 0)
                                ? session.break_logs
                                : breakLogs.filter((b: any) => String(b.session_id) === String(session.session_id) || String(b.session_id) === String(session.id));
                            
                            const displayStatus = session.remark === 'Shift Extension' ? 'Shift Extension' : session.status;
                            const statusStyle = STATUS_STYLES[displayStatus] || STATUS_STYLES[session.status] || { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.04)' };
                            const isActive = !session.logout_time && !session.ended_at;
                            const onBreak = session.on_break;

                            const loginRaw = session.login_time || session.started_at;
                            const logoutRaw = session.logout_time || session.ended_at;

                            const loginMs = loginRaw ? parseISOToLocalDate(loginRaw).getTime() : 0;
                            const logoutMs = logoutRaw ? parseISOToLocalDate(logoutRaw).getTime() : Date.now();

                            // Total Shift Duration (seconds from login to logout or current time)
                            const totalShiftSec = session.total_shift_seconds || (loginMs > 0 ? Math.max(0, Math.floor((logoutMs - loginMs) / 1000)) : 0);

                            // Total Break Time
                            let breakSec = session.total_break_seconds || 0;
                            if (isActive && onBreak && session.current_break_start) {
                                const curBreak = Math.max(0, Math.floor((Date.now() - parseISOToLocalDate(session.current_break_start).getTime()) / 1000));
                                breakSec += curBreak;
                            }

                            // Total Work Time (Shift Duration - Break Time)
                            let workSec = session.total_work_seconds || 0;
                            if (isActive || !workSec || workSec <= 0) {
                                workSec = Math.max(0, totalShiftSec - breakSec);
                            }
                            const roleKey = (session.role || '').toLowerCase().replace(/[\s_]+/g, '');
                            const roleBadge = ROLE_BADGE[roleKey];
                            const empShift = getShiftForEmployee(session.employee_id, allShifts);
                            const sc = empShift?.color || '#0a84ff';

                            return (
                                <div key={session.id} style={{
                                    background: isActive ? 'rgba(10,132,255,0.04)' : 'rgba(255,255,255,0.02)',
                                    borderRadius: '14px',
                                    border: `1px solid ${isActive ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                                    overflow: 'hidden',
                                }}>
                                    {/* Main Row */}
                                    <div
                                        onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: showOthers ? '1.8fr 1fr 0.8fr 1fr 1fr 1fr 1fr 110px 28px' : '1.5fr 1fr 0.8fr 1fr 1fr 1fr 1fr 110px 28px',
                                            alignItems: 'center', gap: '10px',
                                            padding: '14px 20px', cursor: 'pointer'
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: '600', fontSize: '14px' }}>
                                                    {session.date ? `${new Date(session.date + 'T00:00:00').getDate()} ${MONTHS[new Date(session.date + 'T00:00:00').getMonth()].slice(0, 3)}` : '—'}
                                                </span>
                                                {isActive && (
                                                    <span style={{ background: 'rgba(10,132,255,0.15)', color: '#0a84ff', borderRadius: '5px', padding: '1px 7px', fontSize: '9px', fontWeight: '800' }}>
                                                        ● LIVE
                                                    </span>
                                                )}
                                                {empShift && (
                                                    <span style={{ fontSize: '9px', fontWeight: '700', color: sc, background: `${sc}18`, borderRadius: '4px', padding: '1px 6px' }}>
                                                        {empShift.name}
                                                    </span>
                                                )}
                                            </div>
                                            {showOthers && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>{session.employee_name}</span>
                                                    {roleBadge && (
                                                        <span style={{ fontSize: '9px', fontWeight: '700', color: roleBadge.color, background: `${roleBadge.color}18`, borderRadius: '4px', padding: '1px 6px' }}>
                                                            {roleBadge.label}
                                                        </span>
                                                    )}
                                                    {session.department && (
                                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>· {session.department}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#ff9f0a' }}>
                                                {session.month ? MONTHS[session.month - 1] : MONTHS[new Date(session.date).getMonth()]}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#64d2ff' }}>
                                                {session.year || new Date(session.date).getFullYear()}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#30d158' }}>{fmtTime(session.login_time)}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: session.logout_time ? '#0a84ff' : 'var(--text-tertiary)' }}>{fmtTime(session.logout_time)}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64d2ff', fontFamily: 'monospace' }}>{fmtSeconds(workSec)}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: breakSec > 0 ? '#bf5af2' : 'var(--text-tertiary)' }}>{fmtSeconds(breakSec)}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', color: statusStyle.color, background: statusStyle.bg }}>
                                                {displayStatus}
                                            </span>
                                        </div>
                                        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                                            {isExpanded ? '▲' : '▼'}
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 20px', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                {/* Shift Summary */}
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📊 Shift Summary</div>
                                                    {[
                                                        { label: 'Date', value: fmtDate(session.date), color: '#fff' },
                                                        { label: 'Month', value: session.month ? MONTHS[session.month - 1] : (session.date ? MONTHS[new Date(session.date + 'T00:00:00').getMonth()] : '—'), color: '#ff9f0a' },
                                                        { label: 'Year', value: (session.year || (session.date ? new Date(session.date + 'T00:00:00').getFullYear() : '—')).toString(), color: '#64d2ff' },
                                                        { label: 'Total Shift Duration', value: fmtSeconds(totalShiftSec), color: '#fff' },
                                                        { label: 'Total Work Time', value: fmtSeconds(workSec), color: '#64d2ff' },
                                                        { label: 'Total Break Time', value: fmtSeconds(breakSec), color: '#bf5af2' },
                                                        { label: 'Breaks Taken', value: (session.breaks_count || 0).toString(), color: '#ff9f0a' },
                                                        { label: 'Logged In At', value: fmtTime(session.login_time), color: '#30d158' },
                                                        {
                                                            label: 'Login Status',
                                                            value: session.remark === 'Shift Extension' ? 'Shift Extension' : (session.is_early_login ? 'Early Login' : 'Normal'),
                                                            color: session.remark === 'Shift Extension' ? '#ff9f0a' : (session.is_early_login ? '#0a84ff' : 'var(--text-secondary)')
                                                        },
                                                        { label: 'Logged Out At', value: fmtTime(session.logout_time), color: '#0a84ff' },
                                                        ...(empShift ? [
                                                            { label: 'Assigned Shift', value: empShift.name, color: empShift.color || '#0a84ff' },
                                                            { label: 'Shift Timing', value: `${empShift.shift_start} – ${empShift.shift_end}`, color: 'var(--text-primary)' },
                                                            { label: 'Week-Off Days', value: (empShift.week_off_days || []).join(', ') || 'None', color: '#ff453a' },
                                                        ] : []),
                                                    ].map((row, i) => (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.label}</span>
                                                            <span style={{ fontSize: '12px', fontWeight: '700', color: row.color }}>{row.value}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Break Log */}
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>☕ Break Log</div>
                                                    {sessionBreaks.length === 0 ? (
                                                        <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                                                            No breaks recorded for this shift
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {sessionBreaks.map((b: any, i: number) => (
                                                                <div key={b.id} style={{
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    padding: '8px 12px', background: 'rgba(191,90,242,0.06)',
                                                                    border: '1px solid rgba(191,90,242,0.12)', borderRadius: '10px'
                                                                }}>
                                                                    <div style={{ fontSize: '12px' }}>
                                                                        <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Break {i + 1}</span>
                                                                        <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>·</span>
                                                                        <span style={{ fontWeight: '600' }}>{fmtTime(b.start_time)}</span>
                                                                        <span style={{ color: 'var(--text-tertiary)', margin: '0 4px' }}>→</span>
                                                                        <span style={{ fontWeight: '600', color: b.end_time ? 'var(--text-primary)' : '#ff9f0a' }}>
                                                                            {b.end_time ? fmtTime(b.end_time) : 'Still on break'}
                                                                        </span>
                                                                    </div>
                                                                    <span style={{ fontSize: '12px', color: '#bf5af2', fontWeight: '700' }}>
                                                                        {b.duration_seconds > 0 ? fmtSeconds(b.duration_seconds) : '—'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
