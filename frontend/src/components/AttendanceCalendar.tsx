import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { getAttendance, getHolidays, getLeaves, getEmployees, getEmployeeShift } from '../utils/storage';

interface AttendanceCalendarProps {
    type?: 'individual' | 'team';
    minimal?: boolean;
    viewDate?: Date;
    onViewDateChange?: (date: Date) => void;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
    type = 'individual',
    minimal = false,
    viewDate: externalViewDate,
    onViewDateChange
}) => {
    const [internalViewDate, setInternalViewDate] = useState(new Date());
    const viewDate = externalViewDate || internalViewDate;

    const setViewDate = (date: Date) => {
        if (onViewDateChange) {
            onViewDateChange(date);
        } else {
            setInternalViewDate(date);
        }
    };

    const [records, setRecords] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const userId = sessionStorage.getItem("userId");
    const employeeId = sessionStorage.getItem("employeeId"); // business EMP-XXX id

    const refreshData = async () => {
        try {
            const [attendanceData, holidayData, leaveData, employeeData] = await Promise.all([
                getAttendance(),
                getHolidays(),
                getLeaves(),
                getEmployees()
            ]);
            console.log("[CALENDAR] Fetched holidays for render:", holidayData);
            setRecords(Array.isArray(attendanceData) ? attendanceData : []);
            setHolidays(Array.isArray(holidayData) ? holidayData : []);
            setLeaves(Array.isArray(leaveData) ? leaveData : []);
            setEmployees(Array.isArray(employeeData) ? employeeData : []);
        } catch (error) {
            console.error("Error refreshing calendar data:", error);
        }
    };

    useEffect(() => {
        refreshData();

        const handleSync = () => {
            console.log("[CALENDAR] Storage change detected, refreshing...");
            refreshData();
        };
        window.addEventListener('storage', handleSync);
        return () => window.removeEventListener('storage', handleSync);
    }, []);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const prevMonth = () => {
        setViewDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(new Date(year, month + 1, 1));
    };

    const goToCurrent = () => {
        setViewDate(new Date());
    };

    // Helper for date normalization
    const normalizeDate = (dStr: any) => {
        if (!dStr) return '';
        const s = String(dStr).trim();
        return s.includes('T') ? s.split('T')[0] : s.substring(0, 10);
    };

    // Helper for employee matching
    const isEmpMatch = (rEmpId: any) => {
        if (!rEmpId) return false;
        const target = String(rEmpId).trim().toLowerCase();
        const eCode = String(employeeId || '').trim().toLowerCase();
        const uId = String(userId || '').trim().toLowerCase();
        if ((eCode !== '' && target === eCode) || (uId !== '' && target === uId)) return true;

        const myEmp = employees.find((e: any) =>
            (eCode !== '' && String(e.employee_id || '').trim().toLowerCase() === eCode) ||
            (uId !== '' && String(e.id || '').trim().toLowerCase() === uId) ||
            (uId !== '' && String(e.user_id || '').trim().toLowerCase() === uId)
        );

        if (myEmp) {
            const mCode = String(myEmp.employee_id || '').trim().toLowerCase();
            const mId = String(myEmp.id || '').trim().toLowerCase();
            const mUserId = String(myEmp.user_id || '').trim().toLowerCase();
            if (mCode !== '' && target === mCode) return true;
            if (mId !== '' && target === mId) return true;
            if (mUserId !== '' && target === mUserId) return true;
        }

        return false;
    };

    // Real attendance logic
    const getStatus = (day: number) => {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dateObj = new Date(year, month, day);
        dateObj.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = dateObj.getTime() === today.getTime();

        // 1. Fetch Actual Attendance Records First
        let dayRecords = [];
        if (type === 'individual') {
            dayRecords = records.filter(r =>
                normalizeDate(r.date) === dateStr && isEmpMatch(r.employee_id)
            );
        } else {
            const userRole = sessionStorage.getItem("userRole");
            if (userRole === 'teamleader') {
                const myTeamIds = employees
                    .filter((e: any) => {
                        const tlId = String(e.team_leader_id || '');
                        const repId = String(e.reporting_to_id || '');
                        const mgrId = String(e.manager_id || '');
                        const repMgrId = String(e.reporting_manager_id || '');
                        return tlId === String(userId) || tlId === String(employeeId) ||
                            repId === String(userId) || repId === String(employeeId) ||
                            mgrId === String(userId) || mgrId === String(employeeId) ||
                            repMgrId === String(userId) || repMgrId === String(employeeId);
                    })
                    .flatMap((e: any) => [String(e.employee_id), String(e.id)]);

                // Include the Team Leader themselves in the team aggregate view
                if (employeeId) myTeamIds.push(String(employeeId));
                if (userId) myTeamIds.push(String(userId));

                dayRecords = records.filter(r => normalizeDate(r.date) === dateStr && myTeamIds.includes(String(r.employee_id)));
            } else {
                dayRecords = records.filter(r => normalizeDate(r.date) === dateStr);
            }
        }

        // Determine if they actually worked (Team Aggregation Logic)
        let workedRecordStatus = null;
        if (dayRecords.length > 0) {
            // Check all records for highest priority status
            const hasExtension = dayRecords.some(r => String(r.status || '').toLowerCase().includes('extension') || String(r.remark || '').toLowerCase().includes('extension'));
            const hasPresent = dayRecords.some(r => {
                const st = String(r.status || '').toLowerCase();
                const hasLogin = !!(r.login_time || r.check_in || r.check_in_time || r.started_at);
                return st.includes('present') || st.includes('active') || st.includes('wfh') || st.includes('tracking') || st.includes('closed') || st.includes('shift') || hasLogin;
            });
            const hasHalfDay = dayRecords.some(r => String(r.status || '').toLowerCase().includes('half'));
            const hasLeave = dayRecords.some(r => String(r.status || '').toLowerCase().includes('leave') || String(r.remark || '').toLowerCase().includes('leave'));

            if (hasExtension) workedRecordStatus = 'shift-extension';
            else if (hasPresent) workedRecordStatus = 'present';
            else if (hasHalfDay) workedRecordStatus = 'half-day';
            else if (hasLeave) workedRecordStatus = 'leave';
            else workedRecordStatus = 'absent';
        }

        // 2. Check Approved Leaves (Takes priority over passive live session presence)
        let approvedLeave = null;
        if (type === 'individual') {
            approvedLeave = leaves.find(l => {
                const lStart = String(l.start_date || l.startDate || l.from_date || l.fromDate || '').substring(0, 10);
                const lEnd = String(l.end_date || l.endDate || l.to_date || l.toDate || '').substring(0, 10);
                const st = String(l.status || '').toLowerCase();
                return isEmpMatch(l.employee_id) && (st === 'approved' || st === 'pending') && dateStr >= lStart && dateStr <= lEnd;
            });
        } else {
            const myTeam = employees
                .filter((e: any) => {
                    const tlId = String(e.team_leader_id || '');
                    const repId = String(e.reporting_to_id || '');
                    const mgrId = String(e.manager_id || '');
                    const repMgrId = String(e.reporting_manager_id || '');
                    return tlId === String(userId) || tlId === String(employeeId) || repId === String(userId) || repId === String(employeeId) || mgrId === String(userId) || mgrId === String(employeeId) || repMgrId === String(userId) || repMgrId === String(employeeId);
                })
                .map((e: any) => String(e.employee_id || e.id));

            approvedLeave = leaves.find(l => {
                const lStart = String(l.start_date || l.startDate || l.from_date || l.fromDate || '').substring(0, 10);
                const lEnd = String(l.end_date || l.endDate || l.to_date || l.toDate || '').substring(0, 10);
                const isTeamMember = myTeam.includes(String(l.employee_id));
                const isDirectlyManaged = (employeeId && (String(l.manager_id) === String(employeeId) || String(l.team_leader_id) === String(employeeId))) || (String(l.manager_id) === String(userId) || String(l.team_leader_id) === String(userId));
                const st = String(l.status || '').toLowerCase();
                return ((isTeamMember || isDirectlyManaged) && (st === 'approved' || st === 'pending') && dateStr >= lStart && dateStr <= lEnd);
            });
        }

        if (approvedLeave || workedRecordStatus === 'leave') return 'leave';

        // 🟢 LIVE PRESENCE FALLBACK FOR TODAY: If current user is logged in today & no leave active, mark as Present
        if (!workedRecordStatus && isToday && type === 'individual') {
            const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true" || !!sessionStorage.getItem("token");
            if (isLoggedIn) {
                workedRecordStatus = 'present';
            }
        }

        // 3. Priorities & Overrides
        const holiday = holidays.find(h => String(h.date || '').substring(0, 10) === dateStr);
        const myShift = getEmployeeShift((employeeId || userId) as string);
        const weekOffs = (myShift && myShift.week_off_days && myShift.week_off_days.length > 0) ? myShift.week_off_days : ['Sunday'];
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

        if (workedRecordStatus === 'shift-extension' || workedRecordStatus === 'present' || workedRecordStatus === 'half-day') {
            return workedRecordStatus;
        }

        if (holiday) return 'holiday';
        if (weekOffs.includes(dayName)) return 'weekend';
        if (dateObj > today) return 'future';

        // Check if date is before employee joining date
        const empJoinDateStr = sessionStorage.getItem("joinDate") || (employees.find(e => String(e.employee_id) === String(employeeId) || String(e.id) === String(userId))?.joining_date);
        if (empJoinDateStr) {
            const joinDateObj = new Date(empJoinDateStr.substring(0, 10) + "T00:00:00");
            joinDateObj.setHours(0, 0, 0, 0);
            if (dateObj < joinDateObj) return 'future';
        }

        // 4. Default to absent if past date with no work record
        return 'absent';
    };

    const statusColors: Record<string, string> = {
        present: '#30d158',
        'shift-extension': '#5e5ce6',
        leave: '#bf5af2',
        absent: '#ff453a',
        'half-day': '#ff9f0a',
        holiday: '#ffd60a',
        weekend: 'rgba(255, 255, 255, 0.15)',
        future: 'rgba(255, 255, 255, 0.05)'
    };

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    return (
        <div className="attendance-calendar" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', userSelect: 'none' }}>
            {/* Calendar Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: minimal ? '15px' : '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h4 style={{ fontSize: minimal ? '15px' : '18px', fontWeight: '700', color: '#fff', margin: 0 }}>
                            {minimal ? monthNames[month] : `${monthNames[month]} ${year}`}
                        </h4>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={prevMonth} style={navBtnStyle}><FaChevronLeft size={minimal ? 8 : 10} /></button>
                            <button onClick={goToCurrent} style={todayBtnStyle}>{minimal ? '•' : 'Today'}</button>
                            <button onClick={nextMonth} style={navBtnStyle}><FaChevronRight size={minimal ? 8 : 10} /></button>
                        </div>
                    </div>

                    {!minimal && (
                        <div style={{ display: 'flex', gap: '8px 12px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <LegendItem color={statusColors.present} label="Present" />
                            <LegendItem color={statusColors['shift-extension']} label="Shift Extension" />
                            <LegendItem color={statusColors.holiday} label="Holiday" />
                            <LegendItem color={statusColors.leave} label="Leave" />
                            <LegendItem color={statusColors.absent} label="Absent" />
                            <LegendItem color={statusColors['half-day']} label="Half Day" />
                            <LegendItem color={statusColors.weekend} label="Week Off" />
                        </div>
                    )}
                    {minimal && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158' }} />
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff453a' }} />
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffd60a' }} />
                        </div>
                    )}
                </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: minimal ? '4px' : '8px', width: '100%' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.2)', paddingBottom: minimal ? '4px' : '10px' }}>
                        {d}
                    </div>
                ))}

                {blanks.map(i => (
                    <div key={`blank-${i}`} style={{ height: minimal ? '30px' : '45px' }} />
                ))}

                {days.map(day => {
                    const status = getStatus(day);
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    const holiday = status === 'holiday' ? holidays.find(h => String(h.date || '').substring(0, 10) === dateStr) : null;

                    return (
                        <div
                            key={day}
                            style={{
                                height: minimal ? '35px' : '55px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: minimal ? '12px' : '14px',
                                borderRadius: minimal ? '8px' : '12px',
                                background: isToday ? 'rgba(10, 132, 255, 0.15)' : 'rgba(255,255,255,0.02)',
                                border: isToday ? '1px solid #0a84ff' : '1px solid rgba(255,255,255,0.03)',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                overflow: 'hidden'
                            }}
                        >
                            <span style={{
                                fontWeight: '600',
                                color: status === 'future' ? 'rgba(255,255,255,0.1)' : '#fff',
                                zIndex: 2
                            }}>
                                {day}
                            </span>

                            {!minimal && status === 'holiday' && holiday && (
                                <div style={{
                                    fontSize: '8px',
                                    color: statusColors.holiday,
                                    fontWeight: '700',
                                    textAlign: 'center',
                                    width: '90%',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    marginTop: '2px'
                                }}>
                                    {holiday.name.toUpperCase()}
                                </div>
                            )}

                            {status !== 'weekend' && status !== 'future' && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: minimal ? '4px' : (status === 'holiday' ? '3px' : '8px'),
                                        width: minimal ? '3px' : '5px',
                                        height: minimal ? '3px' : '5px',
                                        borderRadius: '50%',
                                        background: statusColors[status],
                                        boxShadow: minimal ? 'none' : `0 0 8px ${statusColors[status]}`
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const navBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
};

const todayBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    padding: '0 12px',
    height: '28px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
};

const LegendItem = ({ color, label }: { color: string, label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}` }} />
        {label}
    </div>
);

export default AttendanceCalendar;
