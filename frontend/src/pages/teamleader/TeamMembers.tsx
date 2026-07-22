import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getEmployees, getUserPresence, isOnLeave, getAttendanceByEmployee, getLeaves } from "../../utils/storage";
import { HiUsers, HiDocumentArrowDown } from "react-icons/hi2";
import { HiOutlineX, HiOutlineMail, HiOutlinePhone, HiOutlineBriefcase, HiOutlineCalendar } from "react-icons/hi";
import { downloadCSV } from "../../utils/formatters";

const MemberRow = ({ m, presence, onClick }: any) => {
  const p = presence.find((px: any) => px.employee_id === (m.employee_id || m.id));

  const isActive = p && !p.logout_time;
  const onBreak = p?.on_break;
  const hasFinished = p && p.logout_time;

  const statusLabel = isActive ? (onBreak ? 'ON BREAK' : 'ACTIVE') : hasFinished ? 'COMPLETED' : 'OFFLINE';
  const statusColor = isActive ? (onBreak ? '#ff9f0a' : '#30d158') : hasFinished ? '#64d2ff' : '#ff453a';
  const statusBg = isActive ? (onBreak ? 'rgba(255,159,10,0.12)' : 'rgba(48,209,88,0.12)') : hasFinished ? 'rgba(100,210,255,0.12)' : 'rgba(255,69,58,0.06)';

  return (
    <tr
      style={{ borderBottom: "1px dotted var(--border-light)", fontSize: "13px", cursor: "pointer", transition: "background 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      onClick={() => onClick(m)}
    >
      {/* Member */}
      <td style={{ padding: "12px" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
            background: `linear-gradient(135deg, ${statusColor}, ${statusColor}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: '700', color: 'white',
            boxShadow: `0 4px 10px ${statusColor}40`
          }}>
            {(m.first_name || m.name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{m.first_name ? `${m.first_name} ${m.last_name || ''}` : m.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{m.employee_id || m.id}</div>
          </div>
        </div>
      </td>

      {/* Department */}
      <td style={{ padding: "12px", color: 'var(--text-secondary)' }}>{m.department_name || m.department || '—'}</td>

      {/* Login Time */}
      <td style={{ padding: "12px", fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '13px' }}>
        {p?.login_time
          ? new Date(p.login_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
      </td>

      {/* Status */}
      <td style={{ padding: "12px" }}>
        <span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', background: statusBg, color: statusColor, letterSpacing: '0.5px' }}>
          {statusLabel}
        </span>
      </td>
    </tr>
  );
};

import { getTeamMembers, getTeamAttendance } from "../../services/teamleaderService";
import api from "../../api/apiClient";

export default function TeamMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [presence, setPresence] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberAttendance, setMemberAttendance] = useState<any[]>([]);
  const [memberLeaves, setMemberLeaves] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mList, pList] = await Promise.all([
        getTeamMembers(),
        getTeamAttendance() // This contains live session data
      ]);
      setMembers(mList || []);
      // Map attendance to the expected presence format if necessary
      setPresence(pList || []);
    } catch (err) {
      console.error("Failed to load team data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMemberClick = async (m: any) => {
    setSelectedMember(m);
    // Fetch specific member history from API
    try {
      const eid = m.employee_id || m.id;
      const [attRes, leaveRes] = await Promise.all([
        api.get(`teamleader/members/${encodeURIComponent(eid)}/attendance`),
        api.get(`teamleader/members/${encodeURIComponent(eid)}/leaves`),
      ]);
      setMemberAttendance(attRes.data || []);
      setMemberLeaves((leaveRes.data || []).filter((l: any) => l.status?.toLowerCase() === 'approved'));
    } catch (err) {
      console.error("Error loading member history");
    }
  };

  const handleDownloadRoster = () => {
    const data = members.map(mem => {
      const p = presence.find((px: any) => px.employee_id === (mem.employee_id || mem.id));
      const status = p ? (!p.logout_time ? (p.on_break ? 'ON BREAK' : 'ACTIVE') : 'COMPLETED') : 'OFFLINE';
      return {
        "Employee ID": mem.employee_id || mem.id,
        "Name": mem.first_name ? `${mem.first_name} ${mem.last_name || ''}` : mem.name,
        "Department": mem.department_name || mem.department || '—',
        "Status": status,
        "Shift Start": p?.login_time ? new Date(p.login_time).toLocaleTimeString() : '—'
      };
    });
    downloadCSV(data, `Team_Roster_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const online = presence.filter(p => !p.logout_time);
  const onBreakCount = presence.filter(p => !p.logout_time && p.on_break);
  const completed = presence.filter(p => p.logout_time);
  const offlineCount = members.length - presence.length;
  return (
    <div className="dashboard-container">
      <Header role="Team Leader" title="Direct Reports" />

      <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Team Members</h1>
          <p className="subtitle">Real-time team presence and attendance status</p>
        </div>

        {/* Highlighted Team Size */}
        <div style={{
          background: "linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(10, 132, 255, 0.05))",
          border: "1px solid rgba(10, 132, 255, 0.3)",
          padding: "15px 30px", borderRadius: "16px",
          display: "flex", flexDirection: "column", alignItems: "center",
          boxShadow: "0 10px 30px rgba(10, 132, 255, 0.15)"
        }}>
          <div style={{ fontSize: "12px", color: "var(--accent-blue)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "1px", marginBottom: "4px" }}>
            Total Team Size
          </div>
          <div style={{ fontSize: "36px", fontWeight: "800", color: "#fff", lineHeight: 1 }}>
            {members.length}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-3" style={{ marginBottom: "30px" }}>
        <GlassCard title="Availability Snapshot" subtitle="Today's team pulse">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
            <div style={statRow}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#30d158', boxShadow: '0 0 8px #30d158', display: 'inline-block' }} />
                Active on Shift
              </span>
              <span style={{ color: "#30d158", fontWeight: '800', fontSize: "16px" }}>{online.length}</span>
            </div>
            <div style={statRow}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff9f0a', display: 'inline-block' }} />
                On Break
              </span>
              <span style={{ color: "#ff9f0a", fontWeight: '800', fontSize: "16px" }}>{onBreakCount.length}</span>
            </div>
            <div style={{ ...statRow, borderBottom: 'none' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#64d2ff', display: 'inline-block' }} />
                Completed
              </span>
              <span style={{ color: "#64d2ff", fontWeight: '800', fontSize: "16px" }}>{completed.length}</span>
            </div>
          </div>
        </GlassCard>

        {/* Member Table spanning 2 columns */}
        <GlassCard
          title="Team Directory"
          subtitle="Click on any member to view full details and attendance calendar"
          style={{ gridColumn: "span 2" }}
          headerAction={
            <button
              onClick={handleDownloadRoster}
              style={{ background: 'rgba(10, 132, 255, 0.1)', border: '1px solid rgba(10, 132, 255, 0.3)', color: '#0a84ff', padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: "600", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(10, 132, 255, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10, 132, 255, 0.1)'; e.currentTarget.style.transform = 'none'; }}
            >
              <HiDocumentArrowDown size={16} /> Export CSV
            </button>
          }
        >
          <div style={{ overflowX: "auto", marginTop: "10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-light)", color: "var(--text-secondary)", fontSize: "11px", textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <th style={{ padding: "12px" }}>Member</th>
                  <th style={{ padding: "12px" }}>Department</th>
                  <th style={{ padding: "12px" }}>Last Activity</th>
                  <th style={{ padding: "12px" }}>Live Status</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                      <HiUsers size={48} style={{ opacity: 0.3, marginBottom: "10px" }} />
                      <br />
                      No team members assigned to you yet.
                    </td>
                  </tr>
                ) : members.map(m => (
                  <MemberRow
                    key={m.id}
                    m={m}
                    presence={presence}
                    onClick={handleMemberClick}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* MEMBER DETAILS MODAL */}
      {selectedMember && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999,
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{
            width: "90%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto",
            background: "#161618", border: "1px solid var(--border-light)", borderRadius: "24px",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            display: "flex", flexDirection: "column"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "20px 30px", borderBottom: "1px solid var(--border-light)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "rgba(255,255,255,0.02)"
            }}>
              <h2 style={{ fontSize: "20px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}>
                Team Member Profile
              </h2>
              <button
                onClick={() => setSelectedMember(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: "5px" }}
                onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary)"}
              >
                <HiOutlineX size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "30px", display: "flex", flexDirection: "column", gap: "30px" }}>

              {/* Top Info Card */}
              <div style={{ display: "flex", gap: "24px", alignItems: "center", background: "rgba(255,255,255,0.03)", padding: "24px", borderRadius: "16px", border: "1px solid var(--border-light)" }}>
                <div style={{
                  width: "80px", height: "80px", borderRadius: "20px", flexShrink: 0,
                  background: `linear-gradient(135deg, var(--accent-blue), #005bb5)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px', fontWeight: '700', color: 'white',
                  boxShadow: `0 10px 20px rgba(10,132,255,0.3)`
                }}>
                  {selectedMember.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>{selectedMember.name}</h3>
                  <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px", display: "flex", gap: "15px", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><HiOutlineBriefcase /> {selectedMember.designation || "Employee"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><HiUsers /> {selectedMember.department || "General"}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>ID: {selectedMember.id}</span>
                  </div>
                  <div style={{ display: "flex", gap: "15px" }}>
                    <div style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-tertiary)", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "8px" }}>
                      <HiOutlineMail /> {selectedMember.email || "—"}
                    </div>
                    <div style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-tertiary)", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "8px" }}>
                      <HiOutlinePhone /> {selectedMember.phone || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Calendar for Current Month */}
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <HiOutlineCalendar color="var(--accent-blue)" /> Present Month Attendance
                </h3>
                <AttendanceCalendar employeeId={selectedMember.id} attendanceData={memberAttendance} leaveData={memberLeaves} />
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

const statRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "12px 0",
  borderBottom: "1px solid var(--border-light)",
  fontSize: "14px",
  alignItems: 'center'
};

import { getHolidays } from "../../utils/storage";

// MINI CALENDAR COMPONENT
const AttendanceCalendar = ({ employeeId, attendanceData, leaveData }: any) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

  const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingArr = Array.from({ length: firstDayOfWeek }, (_, i) => i);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fetch holidays within component execution
  const holidays = getHolidays();
  const monthName = today.toLocaleString('default', { month: 'long' });

  // Helper to determine status for a specific date
  const getStatusForDate = (dateNum: number) => {
    // Use local time construction to avoid strictly-UTC timezone shifting
    const dateObj = new Date(year, month, dateNum);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
    const dayOfWeek = dateObj.getDay();

    // Check Leaves (Approved leaves take priority for future & past dates)
    const isLeaved = leaveData.find((l: any) => {
      const startStr = l.start_date || l.startDate || l.from_date || l.fromDate;
      const endStr = l.end_date || l.endDate || l.to_date || l.toDate;
      if (!startStr || !endStr) return false;
      const start = new Date(startStr);
      const end = new Date(endStr);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return dateObj >= start && dateObj <= end;
    });
    if (isLeaved) return { type: 'leave', label: 'L', color: 'rgba(255, 159, 10, 0.2)', textColor: '#ff9f0a' };

    // Check Weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) return { type: 'weekend', label: 'W', color: 'rgba(255,255,255,0.05)', textColor: 'var(--text-tertiary)' };

    // Check Holidays
    const isHoliday = holidays.find((h: any) => h.date === dateStr);
    if (isHoliday) return { type: 'holiday', label: 'H', color: 'rgba(255, 214, 10, 0.15)', textColor: '#ffd60a' };

    // Prevent showing absent for future un-worked dates
    if (dateNum > today.getDate()) return { type: 'future', label: '', color: 'rgba(255,255,255,0.03)' };

    // Check Attendance
    const attObj = attendanceData.find((a: any) => a.date === dateStr);
    if (attObj) {
      const st = String(attObj.status || '').toLowerCase();
      if (st.includes('present') || st.includes('on time') || st.includes('active')) {
        return { type: 'present', label: 'P', color: 'rgba(48, 209, 88, 0.15)', textColor: '#30d158' };
      }
      if (st.includes('leave')) {
        return { type: 'leave', label: 'L', color: 'rgba(255, 159, 10, 0.2)', textColor: '#ff9f0a' };
      }
      if (st.includes('late')) {
        return { type: 'late', label: 'LT', color: 'rgba(255, 159, 10, 0.15)', textColor: '#ff9f0a' };
      }
      if (st.includes('half')) {
        return { type: 'half', label: 'HD', color: 'rgba(100, 210, 255, 0.15)', textColor: '#64d2ff' };
      }
    }

    if (!attObj) return { type: 'absent', label: 'A', color: 'rgba(255, 69, 58, 0.1)', textColor: '#ff453a' };

    return { type: 'unknown', label: '?', color: 'rgba(255,255,255,0.05)', textColor: 'var(--text-secondary)' };
  };


  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-light)", borderRadius: "16px", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>
          {monthName} {year}
        </h4>
        <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "var(--text-tertiary)", fontWeight: "600" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: "8px", height: "8px", background: "#30d158", borderRadius: "2px" }}></span> Present</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: "8px", height: "8px", background: "#ffd60a", borderRadius: "2px" }}></span> Holiday</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: "8px", height: "8px", background: "#ff453a", borderRadius: "2px" }}></span> Absent</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: "8px", height: "8px", background: "#ff9f0a", borderRadius: "2px" }}></span> Leave/Late</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", textAlign: "center" }}>
        {/* Week Days Header */}
        {weekDays.map(d => (
          <div key={d} style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-tertiary)", paddingBottom: "8px" }}>
            {d}
          </div>
        ))}

        {/* Padding for first day */}
        {paddingArr.map(p => (
          <div key={`pad-${p}`} style={{ height: "46px" }}></div>
        ))}

        {/* Actual Days */}
        {daysArr.map(d => {
          const status = getStatusForDate(d);
          const isToday = d === today.getDate();
          return (
            <div key={d} style={{
              height: "46px", borderRadius: "10px", background: status.color,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              border: isToday ? "2px solid var(--accent-blue)" : "1px solid rgba(255,255,255,0.05)",
              color: status.textColor || "var(--text-secondary)",
              position: "relative"
            }} title={status.type.toUpperCase()}>
              <span style={{ fontSize: "13px", fontWeight: "700" }}>{d}</span>
              {status.label && <span style={{ fontSize: "10px", fontWeight: "800", marginTop: "2px", opacity: 0.9 }}>{status.label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
