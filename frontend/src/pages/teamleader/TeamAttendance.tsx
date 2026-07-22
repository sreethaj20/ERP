import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import { getTeamMembers, getTeamAttendanceRecords } from "../../services/teamleaderService";
import { FaClock, FaCalendarCheck, FaUserFriends, FaSignOutAlt, FaSignInAlt, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { downloadCSV } from "../../utils/formatters";
import { refreshAttendanceCorrections, approveAttendanceCorrection } from "../../utils/storage";

export default function TeamAttendance() {
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const today = new Date().toISOString().split('T')[0];
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loadTeamData = async () => {
      try {
        const team = await getTeamMembers();
        const normalizedTeam = (team || []).map((e: any) => ({
          ...e,
          name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim()
        }));
        setMembers(normalizedTeam);
      } catch (err) {
        console.error("Error loading team members:", err);
      }

      try {
        const teamAttendance = await getTeamAttendanceRecords();
        setAttendance(teamAttendance);
      } catch (err) {
        console.error("Error loading team attendance records:", err);
      }

      try {
        const corr = await refreshAttendanceCorrections();
        setCorrections(Array.isArray(corr) ? corr : []);
      } catch (err) {
        console.error("Error loading corrections:", err);
      }
    };
    
    loadTeamData();
  }, []);

  const matchEmp = (a: any, m: any) => {
    const aEmpId = String(a.employee_id || '').trim();
    const aUserId = String(a.user_id || '').trim();
    const mId = String(m.id || '').trim();
    const mEmpId = String(m.employee_id || '').trim();
    const mUserId = String(m.user_id || '').trim();
    return (
      (aEmpId && (aEmpId === mId || aEmpId === mEmpId || aEmpId === mUserId)) ||
      (aUserId && (aUserId === mId || aUserId === mEmpId || aUserId === mUserId))
    );
  };

  const isSameDate = (d1: any, targetDateStr: string) => {
    if (!d1) return false;
    const str = String(d1).includes('T') ? String(d1).split('T')[0] : String(d1).substring(0, 10);
    return str === targetDateStr;
  };

  const handleExportToday = () => {
    const data = members.map(m => {
      const att = attendance.find(a => matchEmp(a, m) && isSameDate(a.date, today));
      return {
        "Employee ID": m.employee_id || m.id,
        "Name": m.name,
        "Login Time": att?.login_time ? new Date(att.login_time).toLocaleTimeString() : 'N/A',
        "Logout Time": att?.logout_time ? new Date(att.logout_time).toLocaleTimeString() : 'N/A',
        "Hours Worked": att?.hours_worked || 0,
        "Status": att?.status || 'Absent'
      };
    });
    downloadCSV(data, `Team_Attendance_Daily_${today}.csv`);
  };

  const handleExportMonthly = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data = members.map(m => {
      const stats = attendance.filter(a => {
        if (!a.date || !matchEmp(a, m)) return false;
        const dateStr = String(a.date).includes('T') ? String(a.date).split('T')[0] : String(a.date).substring(0, 10);
        const parts = dateStr.split('-');
        if (parts.length < 3) return false;
        const aYear = parseInt(parts[0], 10);
        const aMonth = parseInt(parts[1], 10) - 1;
        return aMonth === selectedMonth && aYear === selectedYear;
      });

      const present = stats.filter(s => {
        const status = String(s.status || '').toLowerCase();
        const remark = String(s.remark || '').toLowerCase();
        return status.includes('present') || status.includes('extension') || status.includes('active') || remark.includes('extension');
      }).length;
      const leaves = stats.filter(s => {
        const status = String(s.status || '').toLowerCase();
        const remark = String(s.remark || '').toLowerCase();
        return status.includes('leave') || remark.includes('leave');
      }).length;
      const lop = stats.filter(s => String(s.status || '').toLowerCase().includes('absent')).length;
      const halfDay = stats.filter(s => String(s.status || '').toLowerCase().includes('half')).length;
      const totalDays = stats.length;

      return {
        "Employee ID": m.employee_id || m.id,
        "Name": m.name,
        "Month": monthNames[selectedMonth],
        "Year": selectedYear,
        "Present": present,
        "Leaves": leaves,
        "LOP (Absent)": lop,
        "Half Day": halfDay,
        "Total Days": totalDays
      };
    });
    downloadCSV(data, `Team_Attendance_Monthly_${monthNames[selectedMonth]}_${selectedYear}.csv`);
  };

  // Compute Unit Statistics strictly for the assigned team members
  const onClockCount = members.filter(m => {
    const att = attendance.find(a => matchEmp(a, m) && isSameDate(a.date, today));
    return att && att.login_time && !att.logout_time;
  }).length;

  const completedCount = members.filter(m => {
    const att = attendance.find(a => matchEmp(a, m) && isSameDate(a.date, today));
    return att && att.logout_time;
  }).length;

  return (
    <div className="dashboard-container">
      <Header role="Team Leader" title="Team Attendance" />

      <div style={{ marginTop: "35px", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Team Presence Hub</h1>
        <p style={{ color: "var(--text-secondary)" }}>Monitor your unit's real-time connectivity and monthly reliability</p>
      </div>

      {/* Real-time Status Grid */}
      <div className="grid-2" style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '24px' }}>
        <GlassCard title="Today's Activity" subtitle="Real-time login & logout tracking">
          <div style={{ overflowX: "auto", marginTop: "15px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={thStyle}>
                  <th style={{ padding: "12px" }}>EMPLOYEE</th>
                  <th style={{ padding: "12px" }}>LOGIN TIME</th>
                  <th style={{ padding: "12px" }}>LOGOUT TIME</th>
                  <th style={{ padding: "12px" }}>WORK HRS</th>
                  <th style={{ padding: "12px" }}>BREAK MIN</th>
                  <th style={{ padding: "12px" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const todayAtt = attendance.find(a => matchEmp(a, m) && isSameDate(a.date, today));
                  return (
                    <tr key={m.id} style={trStyle}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: "600", fontSize: '14px' }}>{m.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{m.employee_id || m.id}</div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: todayAtt?.login_time ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                          <FaSignInAlt size={12} />
                          <span style={{ fontSize: '13px', fontWeight: '500' }}>
                            {todayAtt?.login_time ? new Date(todayAtt.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: todayAtt?.logout_time ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
                          <FaSignOutAlt size={12} />
                          <span style={{ fontSize: '13px', fontWeight: '500' }}>
                            {todayAtt?.logout_time ? new Date(todayAtt.logout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px", fontWeight: '700', fontFamily: 'monospace' }}>
                        {todayAtt?.hours_worked ? `${todayAtt.hours_worked}h` : '0h'}
                      </td>
                      <td style={{ padding: "12px", color: 'var(--text-tertiary)', fontSize: '13px' }}>
                        {Math.round(todayAtt?.break_time || 0)}m
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <StatusBadge status={todayAtt?.status || (m.status === 'Active' ? 'Expected' : m.status)} />
                          {todayAtt?.is_extra_break && (
                            <FaExclamationCircle color="#ff453a" title="Exceeded 1h break limit" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No direct reports found in your unit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Unit Statistics" subtitle="Today's deployment">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
              <StatRow label="On Clock" value={onClockCount} icon={<FaClock color="#30d158" />} />
              <StatRow label="Completed" value={completedCount} icon={<FaCheckCircle color="#0a84ff" />} />
              <StatRow label="Expected" value={members.length} icon={<FaUserFriends color="#bf5af2" />} />
            </div>
          </GlassCard>

          <button
            className="apple-btn"
            style={{ width: '100%', background: 'var(--accent-blue)', color: '#fff' }}
            onClick={handleExportToday}
          >
            Daily Roster Export
          </button>
        </div>
      </div>

      {/* Monthly Summary Section */}
      <GlassCard
        title="Monthly Individual Summary"
        subtitle="Aggregate performance audit"
        headerAction={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              className="apple-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{ padding: '4px 10px', fontSize: '12px', width: 'auto' }}
            >
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              className="apple-input"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{ padding: '4px 10px', fontSize: '12px', width: 'auto' }}
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={handleExportMonthly}
              className="apple-btn"
              style={{ padding: '4px 12px', fontSize: '12px', background: 'var(--accent-blue)', color: '#fff', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Export CSV
            </button>
          </div>
        }
      >
        <div style={{ overflowX: "auto", marginTop: "15px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={thStyle}>
                <th style={{ padding: "12px" }}>EMPLOYEE</th>
                <th style={{ padding: "12px" }}>PRESENT</th>
                <th style={{ padding: "12px" }}>LEAVES</th>
                <th style={{ padding: "12px" }}>LOP (ABSENT)</th>
                <th style={{ padding: "12px" }}>HALF DAY</th>
                <th style={{ padding: "12px" }}>TOTAL DAYS</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const stats = attendance.filter(a => {
                  if (!a.date || !matchEmp(a, m)) return false;
                  const dateStr = String(a.date).includes('T') ? String(a.date).split('T')[0] : String(a.date).substring(0, 10);
                  const parts = dateStr.split('-');
                  if (parts.length < 3) return false;
                  const aYear = parseInt(parts[0], 10);
                  const aMonth = parseInt(parts[1], 10) - 1; // 0-indexed
                  return aMonth === selectedMonth && aYear === selectedYear;
                });

                const present = stats.filter(s => {
                  const status = String(s.status || '').toLowerCase();
                  const remark = String(s.remark || '').toLowerCase();
                  return status.includes('present') || status.includes('extension') || status.includes('active') || remark.includes('extension');
                }).length;
                const leaves = stats.filter(s => {
                  const status = String(s.status || '').toLowerCase();
                  const remark = String(s.remark || '').toLowerCase();
                  return status.includes('leave') || remark.includes('leave');
                }).length;
                const lop = stats.filter(s => String(s.status || '').toLowerCase().includes('absent')).length;
                const halfDay = stats.filter(s => String(s.status || '').toLowerCase().includes('half')).length;
                const totalDays = stats.length;

                return (
                  <tr key={m.id} style={trStyle}>
                    <td style={{ padding: "12px", fontWeight: '600' }}>{m.name}</td>
                    <td style={{ padding: "12px", color: 'var(--text-primary)', fontWeight: 'bold' }}>{present}</td>
                    <td style={{ padding: "12px", color: 'var(--text-primary)', fontWeight: 'bold' }}>{leaves}</td>
                    <td style={{ padding: "12px", color: 'var(--text-primary)', fontWeight: 'bold' }}>{lop}</td>
                    <td style={{ padding: "12px", color: 'var(--text-primary)', fontWeight: 'bold' }}>{halfDay}</td>
                    <td style={{ padding: "12px", fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>
                      {totalDays}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

    {/* Clock Correction Approvals */}
    <div style={{ marginTop: '30px' }}>
      <GlassCard title="Clock Correction Requests" subtitle="Approve or reject your unit's check-in/out adjustments">
        <div style={{ overflowX: 'auto', marginTop: '15px' }}>
          {corrections.filter(c => c.status === 'Pending').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>No pending correction requests.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={thStyle}>
                  {['Employee', 'Date', 'Requested In', 'Requested Out', 'Reason', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrections.filter(c => c.status === 'Pending').map((c: any) => (
                  <tr key={c.id} style={trStyle}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '600' }}>{c.employee_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{c.employee_id}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>{c.date}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--accent-blue)' }}>
                      {c.requested_check_in ? new Date(c.requested_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--accent-blue)' }}>
                      {c.requested_check_out ? new Date(c.requested_check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', maxWidth: '180px', wordBreak: 'break-word' }}>{c.reason}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={async () => { try { await approveAttendanceCorrection(c.id, 'Approved'); const corr = await refreshAttendanceCorrections(); setCorrections(Array.isArray(corr) ? corr : []); } catch(e: any) { alert(e.message); } }}
                          className="apple-btn" style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--accent-green)', height: '28px' }}
                        >Approve</button>
                        <button
                          onClick={async () => { try { await approveAttendanceCorrection(c.id, 'Rejected'); const corr = await refreshAttendanceCorrections(); setCorrections(Array.isArray(corr) ? corr : []); } catch(e: any) { alert(e.message); } }}
                          className="apple-btn" style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--accent-red)', height: '28px' }}
                        >Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>
    </div>
    </div>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  let color = 'var(--text-tertiary)';
  let bg = 'rgba(255,255,255,0.05)';

  if (status === 'Present') { color = '#30d158'; bg = 'rgba(48, 209, 88, 0.1)'; }
  else if (status === 'Half Day') { color = '#ff9f0a'; bg = 'rgba(255, 159, 10, 0.1)'; }
  else if (status && status.toLowerCase().includes('leave')) { color = '#bf5af2'; bg = 'rgba(191, 90, 242, 0.1)'; }
  else if (status === 'Short Login') { color = '#ff453a'; bg = 'rgba(255, 69, 58, 0.1)'; }
  else if (status === 'Extra Break') { color = '#ff453a'; bg = 'rgba(255, 69, 58, 0.1)'; }
  else if (status === 'Expected') { color = 'var(--accent-blue)'; bg = 'rgba(10, 132, 255, 0.1)'; }

  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '700',
      color,
      background: bg,
      textTransform: 'uppercase'
    }}>
      {status}
    </span>
  );
};

const StatRow = ({ label, value, icon }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {icon}
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
    </div>
    <span style={{ fontSize: '16px', fontWeight: '700' }}>{value}</span>
  </div>
);

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--border-light)",
  color: "var(--text-tertiary)",
  fontSize: "11px",
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

const trStyle: React.CSSProperties = {
  borderBottom: "1px dotted var(--border-light)",
  color: "var(--text-primary)"
};
