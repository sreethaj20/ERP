import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getEmployees, getAttendance, getData, getAttendanceCorrections, updateAttendanceCorrection, getEmployeeShift, refreshEmployees, refreshAttendance, refreshAttendanceCorrections } from "../../utils/storage";
import { FaCheckCircle, FaExclamationCircle, FaFileExcel, FaSignInAlt, FaSignOutAlt, FaAngleRight, FaAngleDown, FaUsers, FaArrowRight, FaClock } from "react-icons/fa";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import { downloadCSV } from "../../utils/formatters";
import { isAdminRole } from "../../utils/storage";

export default function AttendanceManagement() {
  const [employees, setEmployees] = useState(getEmployees());
  const [attendance, setAttendance] = useState(getAttendance());
  const [requests, setRequests] = useState<any[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      // Proactively fetch latest data from MySQL
      await Promise.all([
        refreshEmployees(),
        refreshAttendance(),
        refreshAttendanceCorrections()
      ]);
      
      setEmployees(getEmployees());
      setAttendance(getAttendance());
      const allRequests = getAttendanceCorrections();
      setRequests(Array.isArray(allRequests) ? allRequests.filter((r: any) => (r.status || '').toLowerCase() === 'pending') : []);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter((a: any) => a.date === today);

  // Stats from today's actual presence
  const presentCount = todayAttendance.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
  const leaveCount = todayAttendance.filter((a: any) => a.status === 'Leave').length;
  const activeStaff = employees.length;
  const absentCount = Math.max(0, activeStaff - presentCount - leaveCount);

  const handleExportLog = () => {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const exportData = attendance.map((a: any) => ({
      Date: a.date,
      Employee: a.employee_name,
      ID: a.employee_id,
      Role: a.role,
      Login: a.login_time ? new Date(a.login_time).toLocaleTimeString() : 'N/A',
      Logout: a.logout_time ? new Date(a.logout_time).toLocaleTimeString() : 'N/A',
      Hours: a.hours_worked || 0,
      Status: a.status
    }));
    downloadCSV(exportData, `Attendance_Log_${currentMonth.replace(/\s/g, '_')}.csv`);
  };

  const handleCorrectionStatus = async (id: any, status: 'approved' | 'rejected') => {
    try {
      await updateAttendanceCorrection(id, { status });
      alert(`Request ${status} successfully.`);
    } catch (error) {
      console.error("Error updating correction:", error);
      alert("Failed to update status.");
    }
  };

  const renderEmployeeRow = (m: any, level: number = 0, reportsCount: number = 0, onToggle?: () => void) => {
    // Match on both business employee_id and numeric id
    const att = todayAttendance.find((a: any) =>
      a.employee_id === m.employee_id ||
      a.employee_id === m.id ||
      String(a.employee_id) === String(m.id)
    );
    const isExpanded = expandedNodes[m.id] || false;
    const shift = getEmployeeShift(m.id);

    return (
      <tr key={m.id} style={{ ...trStyle, background: level > 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
        <td style={{ padding: "12px", paddingLeft: `${12 + level * 20}px` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onToggle && (
              <div onClick={onToggle} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {isExpanded ? <FaAngleDown color="var(--accent-blue)" /> : <FaAngleRight color="var(--text-tertiary)" />}
              </div>
            )}
            <div>
              <div style={{ fontWeight: "600", fontSize: '14px' }}>
                {m.name}
                {reportsCount > 0 && <span style={{ fontSize: '10px', marginLeft: '8px', color: 'var(--accent-blue)', opacity: 0.8 }}><FaUsers size={10} /> {reportsCount} members</span>}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{m.id} • {m.role}</div>
            </div>
          </div>
        </td>
        <td style={{ padding: "12px", fontSize: '13px' }}>{m.department}</td>
        <td style={{ padding: "12px" }}>
          {shift ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: 'var(--accent-blue)' }}>
                <FaClock size={10} /> {shift.shift_name}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', paddingLeft: '15px' }}>{shift.start_time} - {shift.end_time}</div>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Standard / Universal</span>
          )}
        </td>
        <td style={{ padding: "12px" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: att?.login_time ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
            <FaSignInAlt size={12} />
            <span style={{ fontSize: '13px', fontWeight: '500' }}>
              {att?.login_time ? new Date(att.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
        </td>
        <td style={{ padding: "12px" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: att?.logout_time ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
            <FaSignOutAlt size={12} />
            <span style={{ fontSize: '13px', fontWeight: '500' }}>
              {att?.logout_time ? new Date(att.logout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
        </td>
        <td style={{ padding: "12px", fontSize: '13px', fontWeight: '600' }}>
          {att?.hours_worked || '0'}h
        </td>
        <td style={{ padding: "12px", fontSize: '13px', color: 'var(--text-secondary)' }}>
          {Math.round(att?.break_time || 0)}m
        </td>
        <td style={{ padding: "12px" }}>
          {att ? (
            <span style={{
              padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
              background: att.status === 'Present' ? 'rgba(48,209,88,0.15)' : 'rgba(255,159,10,0.15)',
              color: att.status === 'Present' ? '#30d158' : '#ff9f0a'
            }}>{att.status}</span>
          ) : <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Absent</span>}
        </td>
      </tr>
    );
  };

  return (
    <div className="dashboard-container">
      <Header role="HR" title="Attendance Control" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Attendance Management</h1>
        <p className="subtitle">Real-time attendance monitoring and correction approval</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Attendance Overview" subtitle="Company-wide presence snapshot">
            <div style={{ marginTop: '10px' }}>
              <AttendanceCalendar type="team" />
            </div>
          </GlassCard>

          <GlassCard title="Correction Requests" subtitle={`${requests.length} pending review`}>
            <div style={{ marginTop: "10px" }}>
              {requests.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>No pending correction requests</div>
              ) : requests.map((req: any, idx) => (
                <div key={idx} style={requestItem}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>{req.employee_name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)", display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {req.date} <FaArrowRight size={8} /> {req.corrected_status} ({req.reason})
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleCorrectionStatus(req.id, 'approved')} className="apple-btn" style={{ padding: "6px 10px", fontSize: "11px", background: "rgba(48,209,88,0.1)", color: "#30d158" }}>Approve</button>
                    <button onClick={() => handleCorrectionStatus(req.id, 'rejected')} className="apple-btn" style={{ padding: "6px 10px", fontSize: "11px", background: "rgba(255,69,58,0.1)", color: "#ff453a" }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Live Monitoring" subtitle="Today's presence stats">
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
              <div style={statRow}><span>On-Duty</span><span style={{ color: "var(--accent-green)", fontWeight: '700' }}>{presentCount}</span></div>
              <div style={statRow}><span>Unaccounted / Absent</span><span style={{ color: "var(--accent-red)", fontWeight: '700' }}>{absentCount}</span></div>
              <div style={statRow}><span>On Leave</span><span style={{ color: "var(--accent-orange)", fontWeight: '700' }}>{leaveCount}</span></div>
            </div>
          </GlassCard>
          <GlassCard title="Reporting" subtitle="Download Audit Sheets">
            <button onClick={handleExportLog} className="apple-btn" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: 'rgba(255,255,255,0.05)', height: '45px' }}>
              <FaFileExcel /> Export Monthly Log (.CSV)
            </button>
          </GlassCard>
        </div>
      </div>

      <GlassCard title="Today's Presence Audit" subtitle="Real-time employee login/logout activities">
        <div style={{ overflowX: "auto", marginTop: "15px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={thStyle}>
                <th style={{ padding: "12px" }}>EMPLOYEE</th>
                <th style={{ padding: "12px" }}>DEPARTMENT</th>
                <th style={{ padding: "12px" }}>SHIFT</th>
                <th style={{ padding: "12px" }}>LOGIN</th>
                <th style={{ padding: "12px" }}>LOGOUT</th>
                <th style={{ padding: "12px" }}>WORK HRS</th>
                <th style={{ padding: "12px" }}>BREAK MIN</th>
                <th style={{ padding: "12px" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const assignedIds = new Set();
                
                // Helper to render and mark as assigned
                const renderAndAssign = (list: any[]) => {
                  const filtered = list.filter(e => !assignedIds.has(e.id));
                  filtered.forEach(e => assignedIds.add(e.id));
                  return filtered.map((m: any) => renderEmployeeRow(m));
                };

                // 1. LEADERSHIP & MANAGEMENT
                const management = employees.filter((e: any) => 
                  ['hr', 'manager', 'admin', 'hradmin', 'administrator', 'superadmin'].includes((e.role || '').toLowerCase().replace(/[\s_]+/g, '')) ||
                  (e.department || '').toLowerCase().includes('management') ||
                  (e.department || '').toLowerCase().includes('human resource') ||
                  (e.department || '').toLowerCase().includes('admin')
                );

                // 2. RECRUITMENT & TALENT
                const recruiters = employees.filter((e: any) => 
                  ['recruiter', 'requiter'].includes((e.role || '').toLowerCase()) ||
                  (e.department || '').toLowerCase().includes('recruitment') ||
                  (e.department || '').toLowerCase().includes('talent')
                );

                // 3. IT INFRASTRUCTURE
                const itStaff = employees.filter((e: any) => 
                  ['it', 'itadmin', 'it_admin', 'itdepartment'].includes((e.role || '').toLowerCase().replace(/[\s_]+/g, '')) ||
                  (e.department || '').toLowerCase().includes('it') ||
                  (e.department || '').toLowerCase().includes('tech') ||
                  (e.department || '').toLowerCase().includes('infra')
                );

                // 4. TEAM LEADERS (and their subordinates)
                const tlRoles = ['teamleader', 'tl', 'team_leader'];
                const teamLeaders = employees.filter((e: any) => 
                  tlRoles.includes((e.role || '').toLowerCase().replace(/\s+/g, '')) || 
                  (e.designation || '').toLowerCase() === 'tl'
                );

                return (<>
                  {/* Management */}
                  {management.length > 0 && (
                    <>
                      <GroupHeader label="Leadership & Administrative Management" count={management.length} />
                      {renderAndAssign(management)}
                    </>
                  )}

                  {/* Recruitment */}
                  {recruiters.length > 0 && (
                    <>
                      <GroupHeader label="Recruitment & Talent Acquisition" count={recruiters.length} />
                      {renderAndAssign(recruiters)}
                    </>
                  )}

                  {/* IT Staff */}
                  {itStaff.length > 0 && (
                    <>
                      <GroupHeader label="IT Infrastructure & Support" count={itStaff.length} />
                      {renderAndAssign(itStaff)}
                    </>
                  )}

                  {/* Operations (TL Groups) */}
                  {teamLeaders.length > 0 && (
                    <>
                      <GroupHeader label="Operational Teams (TL Groups)" count={teamLeaders.length} />
                      {teamLeaders.filter(tl => !assignedIds.has(tl.id)).map((tl: any) => {
                        assignedIds.add(tl.id);
                        const subordinates = employees.filter((e: any) =>
                          String(e.reporting_to_id) === String(tl.id) ||
                          String(e.reporting_to_id) === String(tl.employee_id) ||
                          String(e.manager_id) === String(tl.employee_id)
                        );
                        // All subordinates will be rendered under the TL, even if they aren't marked as assigned yet
                        // (We mark them as assigned here so they don't show up in General Workforce)
                        subordinates.forEach(s => assignedIds.add(s.id));
                        const isExpanded = expandedNodes[tl.id] || false;
                        return (
                          <React.Fragment key={tl.id}>
                            {renderEmployeeRow(tl, 0, subordinates.length, () => setExpandedNodes({ ...expandedNodes, [tl.id]: !isExpanded }))}
                            {isExpanded && subordinates.map((sub: any) => renderEmployeeRow(sub, 1))}
                          </React.Fragment>
                        );
                      })}
                    </>
                  )}

                  {/* General Workforce */}
                  {(() => {
                    const generalStaff = employees.filter(e => !assignedIds.has(e.id));
                    return generalStaff.length > 0 ? (
                      <>
                        <GroupHeader label="General Workforce" count={generalStaff.length} />
                        {renderAndAssign(generalStaff)}
                      </>
                    ) : null;
                  })()}
                </>);
              })()}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

const statRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid var(--border-light)",
  fontSize: "14px"
};

const requestItem: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px",
  background: "rgba(255,255,255,0.02)",
  borderRadius: "10px",
  marginBottom: "8px",
  border: "1px solid var(--border-light)"
};

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--border-light)",
  color: "var(--text-tertiary)",
  fontSize: "11px",
  textTransform: 'uppercase'
};

const trStyle: React.CSSProperties = {
  borderBottom: "1px dotted var(--border-light)",
  color: "var(--text-primary)"
};
const GroupHeader = ({ label, count }: { label: string, count: number }) => (
  <tr>
    <td colSpan={8} style={{ padding: "20px 12px 10px 12px", fontSize: "10px", fontWeight: "800", color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "1px", borderBottom: '1px solid rgba(10,132,255,0.1)' }}>
      {label} <span style={{ marginLeft: '10px', opacity: 0.5, fontWeight: "400" }}>({count})</span>
    </td>
  </tr>
);
