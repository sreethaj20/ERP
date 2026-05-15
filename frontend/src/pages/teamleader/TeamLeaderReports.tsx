import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { 
  getEmployees, 
  getVisibleAttendance, 
  getEarlyLoginRequests, 
  approveEarlyLogin,
  getPendingLeavesForTL
} from "../../utils/storage";
import { downloadCSV } from "../../utils/formatters";
import {
  HiArrowDownTray, HiAdjustmentsHorizontal, HiUsers,
  HiCalendarDays, HiTableCells
} from "react-icons/hi2";
import { FaCalendarCheck } from "react-icons/fa";

export default function TeamLeaderReports() {
  const userId = sessionStorage.getItem("userId") || "";
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [earlyRequests, setEarlyRequests] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());


  useEffect(() => {
    const loadData = async () => {
      try {
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
        setTeamMembers(team);

        // Fetch team attendance
        const teamAttendance = getVisibleAttendance('teamleader', userId);
        setAttendance(teamAttendance);

        // 🔧 FIXED: Async early login + error handling
        const allReqs = await getEarlyLoginRequests(userId);
        setEarlyRequests(allReqs);

        // 🆕 Load pending leaves for approval
        const tlLeaves = await getPendingLeavesForTL(userId);
        setPendingLeaves(tlLeaves);
      } catch (error) {
        console.error("Failed to load reports data:", error);
        setEarlyRequests([]);
        setPendingLeaves([]);
      }
    };


    loadData();

    const handleSync = async () => {
      try {
        setAttendance(getVisibleAttendance('teamleader', userId));
        const allReqs = await getEarlyLoginRequests(userId);
        setEarlyRequests(allReqs);
        const tlLeaves = await getPendingLeavesForTL(userId);
        setPendingLeaves(tlLeaves);
      } catch (error) {
        console.warn("Sync failed, keeping existing data:", error);
      }
    };

    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, [userId]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = [2024, 2025, 2026];

  // Logic to process monthly report
  const processReportData = () => {
    return teamMembers.map(m => {
      const filtered = attendance.filter(a => {
        if (!a.date) return false;
        const d = new Date(a.date);
        const empIdMatch = String(a.employee_id) === String(m.employee_id || m.id);
        return empIdMatch && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });

      const present = filtered.filter(s => s.status === 'Present').length;
      const halfDay = filtered.filter(s => s.status === 'Half Day').length;
      const absent = filtered.filter(s => s.status === 'Absent').length;
      const totalHours = filtered.reduce((acc, curr) => acc + (parseFloat(curr.hours_worked) || 0), 0);

      return {
        "Employee ID": m.id,
        "Name": m.name,
        "Department": m.department,
        "Designation": m.designation,
        "Days Present": present,
        "Half Days": halfDay,
        "Total Hours": totalHours.toFixed(1),
        "Month": months[selectedMonth],
        "Year": selectedYear
      };
    });
  };

  const handleDownload = () => {
    const data = processReportData();
    if (data.length === 0) {
      alert("No data available for the selected period.");
      return;
    }
    downloadCSV(data, `Team_Attendance_${months[selectedMonth]}_${selectedYear}.csv`);
  };

  const reportData = processReportData();

  return (
    <div className="dashboard-container">
      <Header role="Team Leader" title="Intelligence & Reports" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Analytical Insights</h1>
        <p className="subtitle">Consolidated performance & attendance metrics for your direct reports</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '30px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Report Configuration" subtitle="Select timeline for extraction">
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={labelStyle}>SELECT MONTH</label>
                <select
                  className="apple-input"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{ appearance: 'none' }}
                >
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={labelStyle}>SELECT YEAR</label>
                <select
                  className="apple-input"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{ appearance: 'none' }}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <button className="apple-btn" onClick={handleDownload} style={{ marginTop: '10px', background: '#007aff', color: '#fff' }}>
                <HiArrowDownTray /> Download Attendance Report
              </button>
            </div>
          </GlassCard>

          <GlassCard title="Quick Totals" subtitle="Direct reports summary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
              <StatItem icon={<HiUsers color="#007aff" />} label="Team Size" value={teamMembers.length} />
              <StatItem icon={<HiCalendarDays color="#34c759" />} label="Active Period" value={`${months[selectedMonth].substring(0, 3)} ${selectedYear}`} />
            </div>
          </GlassCard>
        </div>

        {/* Preview Table */}
        <GlassCard
          title="Monthly Attendance Preview"
          subtitle={`Reviewing statistics for ${months[selectedMonth]} ${selectedYear}`}
          headerAction={
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#30d158', background: 'rgba(48,209,88,0.1)', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>DATA READY</span>
            </div>
          }
        >
          <div style={{ overflowX: "auto", marginTop: "15px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={thStyle}>
                  <th style={{ padding: "12px" }}>EMPLOYEE</th>
                  <th style={{ padding: "12px" }}>PRES.</th>
                  <th style={{ padding: "12px" }}>HALF</th>
                  <th style={{ padding: "12px" }}>HOURS</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => (
                  <tr key={idx} style={trStyle}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: '600' }}>{row["Name"]}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{row["Employee ID"]}</div>
                    </td>
                    <td style={{ padding: "12px", color: '#30d158', fontWeight: 'bold' }}>{row["Days Present"]}</td>
                    <td style={{ padding: "12px", color: '#ff9f0a', fontWeight: 'bold' }}>{row["Half Days"]}</td>
                    <td style={{ padding: "12px", fontWeight: '700' }}>{row["Total Hours"]}h</td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No attendance data found for this team in {months[selectedMonth]}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Early Login Management Feature */}
      <div style={{ marginBottom: "40px" }}>
        <GlassCard
          title="Early Login Management"
          subtitle="Review and authorize early shift starts for team members"
        >
          <div style={{ overflowX: "auto", marginTop: "15px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={thStyle}>
                  <th style={{ padding: "12px" }}>EMPLOYEE</th>
                  <th style={{ padding: "12px" }}>DATE</th>
                  <th style={{ padding: "12px" }}>REQUESTED AT</th>
                  <th style={{ padding: "12px" }}>STATUS</th>
                  <th style={{ padding: "12px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {earlyRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No early login requests found.
                    </td>
                  </tr>
                ) : earlyRequests.map((req: any) => (
                  <tr key={req.id} style={trStyle}>
                    <td style={{ padding: "12px", fontWeight: '600' }}>{req.employee_name}</td>
                    <td style={{ padding: "12px" }}>{req.date}</td>
                    <td style={{ padding: "12px" }}>{req.requested_start_time || '—'}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold',
                        background: req.status === 'approved' ? 'rgba(48,209,88,0.1)' : req.status === 'rejected' ? 'rgba(255,69,58,0.1)' : 'rgba(255,159,10,0.1)',
                        color: req.status === 'approved' ? '#30d158' : req.status === 'rejected' ? '#ff453a' : '#ff9f0a'
                      }}>
                        {req.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      {req.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={async () => {
                              try {
                                await approveEarlyLogin(req.id, 'approved');
                                const allReqs = await getEarlyLoginRequests(userId);
                                setEarlyRequests(allReqs);
                              } catch(e) {}
                            }}
                            style={{ background: '#30d158', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await approveEarlyLogin(req.id, 'rejected');
                                const allReqs = await getEarlyLoginRequests(userId);
                                setEarlyRequests(allReqs);
                              } catch(e) {}
                            }}
                            style={{ background: 'rgba(255,69,58,0.2)', color: '#ff453a', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status !== 'pending' && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          Processed at {req.updated_at ? new Date(req.updated_at).toLocaleTimeString() : (req.created_at ? new Date(req.created_at).toLocaleTimeString() : '—')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <h2 style={{ fontSize: "24px", color: "var(--text-primary)", marginBottom: "20px" }}>Detailed Extractions</h2>
      <div className="grid-3">
        <GlassCard
          title="Leave Summary"
          subtitle="Annual leave trends"
          style={{ cursor: 'pointer' }}
          onClick={() => alert("Extracting Leave Summary for " + months[selectedMonth])}
        >
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ff9500', fontSize: '13px' }}>
            <HiTableCells /> <span>Ready to Export</span>
          </div>
        </GlassCard>
        <GlassCard
          title="Task Performance"
          subtitle="Deliverables audit"
          style={{ cursor: 'pointer' }}
          onClick={() => alert("Extracting Task Performance for " + months[selectedMonth])}
        >
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ff3b30', fontSize: '13px' }}>
            <HiTableCells /> <span>Ready to Export</span>
          </div>
        </GlassCard>
        <GlassCard
          title="Shift Log"
          subtitle="Clock-in pattern analysis"
          style={{ cursor: 'pointer' }}
          onClick={() => alert("Extracting Shift Log for " + months[selectedMonth])}
        >
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#007aff', fontSize: '13px' }}>
            <HiTableCells /> <span>Ready to Export</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

const StatItem = ({ icon, label, value }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {icon}
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
    </div>
    <span style={{ fontSize: '15px', fontWeight: '700' }}>{value}</span>
  </div>
);

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  color: 'var(--text-tertiary)',
  letterSpacing: '0.5px'
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
