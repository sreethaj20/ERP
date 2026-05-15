import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import { getEmployees } from "../../utils/storage";
import { getTeamTimesheets } from "../../utils/teamleaderAPI";
import { FaClock, FaCalendarCheck, FaUserFriends, FaSignOutAlt, FaSignInAlt, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { downloadCSV } from "../../utils/formatters";

export default function TeamAttendance() {
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const userId = sessionStorage.getItem("userId") || "";
  const today = new Date().toISOString().split('T')[0];
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loadTeamData = async () => {
      const empId = sessionStorage.getItem("employeeId") || "";
      const allEmployees = getEmployees();
      const team = allEmployees.filter((e: any) => {
        const tlId = String(e.team_leader_id || '');
        const repId = String(e.reporting_to_id || '');
        const mgrId = String(e.manager_id || '');
        const repMgrId = String(e.reporting_manager_id || '');

        return tlId === String(userId) || tlId === String(empId) ||
               repId === String(userId) || repId === String(empId) ||
               mgrId === String(userId) || mgrId === String(empId) ||
               repMgrId === String(userId) || repMgrId === String(empId);
      });
      setMembers(team);

      // 🕐 SERVER-SIDE TEAM FILTERING
      const teamAttendance = await getTeamTimesheets(userId);
      setAttendance(teamAttendance);
    };
    
    loadTeamData();
  }, [userId]);

  const handleExportToday = () => {
    const data = members.map(m => {
      const att = attendance.find(a => 
        (String(a.employee_id) === String(m.id) || String(a.employee_id) === String(m.employee_id)) && 
        a.date === today
      );
      return {
        "Employee ID": m.id,
        "Name": m.name,
        "Login Time": att?.login_time ? new Date(att.login_time).toLocaleTimeString() : 'N/A',
        "Logout Time": att?.logout_time ? new Date(att.logout_time).toLocaleTimeString() : 'N/A',
        "Hours Worked": att?.hours_worked || 0,
        "Status": att?.status || 'Absent'
      };
    });
    downloadCSV(data, `Team_Attendance_Daily_${today}.csv`);
  };

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
                  const todayAtt = attendance.find(a => 
                    (String(a.employee_id) === String(m.id) || String(a.employee_id) === String(m.employee_id)) && 
                    a.date === today
                  );
                  return (
                    <tr key={m.id} style={trStyle}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: "600", fontSize: '14px' }}>{m.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{m.id}</div>
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
                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
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
              <StatRow label="On Clock" value={attendance.filter(a => a.date === today && !a.logout_time).length} icon={<FaClock color="#30d158" />} />
              <StatRow label="Completed" value={attendance.filter(a => a.date === today && a.logout_time).length} icon={<FaCheckCircle color="#0a84ff" />} />
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
          <div style={{ display: 'flex', gap: '10px' }}>
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
                const month = new Date().getMonth();
                const year = new Date().getFullYear();
                const stats = attendance.filter(a => {
                  if (!a.date) return false;
                  const d = new Date(a.date);
                  const isMatch = String(a.employee_id) === String(m.id) || String(a.employee_id) === String(m.employee_id);
                  return isMatch && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
                });

                const present = stats.filter(s => s.status === 'Present').length;
                const leaves = stats.filter(s => s.status === 'Leave').length;
                const lop = stats.filter(s => s.status === 'Absent').length;
                const halfDay = stats.filter(s => s.status === 'Half Day').length;
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
    </div>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  let color = 'var(--text-tertiary)';
  let bg = 'rgba(255,255,255,0.05)';

  if (status === 'Present') { color = '#30d158'; bg = 'rgba(48, 209, 88, 0.1)'; }
  else if (status === 'Half Day') { color = '#ff9f0a'; bg = 'rgba(255, 159, 10, 0.1)'; }
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
