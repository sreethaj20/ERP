import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaCalendarAlt, FaCheck, FaTimes, FaFileDownload, FaInfoCircle, FaEdit } from "react-icons/fa";
import api from "../../api/apiClient";
import { getLeavePolicies, updateLeavePolicy } from "../../utils/storage";
import webSocketService from "../../services/websocketService";

export default function LeaveManagement() {
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [newDays, setNewDays] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const location = useLocation();

  const isRecruiter = location.pathname.includes('/recruiter/');
  const currentRole = isRecruiter ? 'Recruiter' : 'HR';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, policiesRes, empRes] = await Promise.allSettled([
        api.get("hr/leaves"),
        getLeavePolicies(),
        api.get("employees")
      ]);

      const leavesData = leavesRes.status === 'fulfilled' ? leavesRes.value.data || [] : [];
      const policiesData = policiesRes.status === 'fulfilled' ? policiesRes.value : [];
      const empData = empRes.status === 'fulfilled' ? empRes.value.data || [] : [];

      const map: Record<string, string> = {};
      if (Array.isArray(empData)) {
        empData.forEach((emp: any) => {
          const fullName = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
          if (fullName) {
            if (emp.employee_id) map[String(emp.employee_id)] = fullName;
            if (emp.id) map[String(emp.id)] = fullName;
            if (emp.user_id) map[String(emp.user_id)] = fullName;
          }
        });
      }
      setEmployeesMap(map);
      setAllLeaves(leavesData);
      setPolicies(policiesData);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleRealtimeUpdate = (msg: any) => {
      if (msg.event === "data_updated" && (msg.data.type === "leaves" || msg.data.type === "attendance")) {
        fetchData();
      }
    };
    webSocketService.on("data_updated", handleRealtimeUpdate);

    return () => {
      webSocketService.off("data_updated", handleRealtimeUpdate);
    };
  }, [location.pathname]);

  const handleAction = async (leaveId: string, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`hr/leaves/${leaveId}/status?status=${status}`);
      fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Action failed");
    }
  };

  const handleSavePolicy = async () => {
    if (!editingPolicy || !newDays) return;
    try {
      await updateLeavePolicy({
        leave_type: editingPolicy.leave_type,
        total_days: parseInt(newDays)
      });
      setEditingPolicy(null);
      fetchData();
      alert("Policy updated successfully!");
    } catch (e) {
      alert("Failed to update policy");
    }
  };

  const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)', label: '⏳ Pending' },
    recommended: { color: '#0a84ff', bg: 'rgba(10,132,255,0.12)', label: 'Recommended' },
    approved: { color: '#30d158', bg: 'rgba(48,209,88,0.12)', label: 'Approved' },
    rejected: { color: '#ff453a', bg: 'rgba(255,69,58,0.12)', label: 'Rejected' },
    cancelled: { color: '#8e8e93', bg: 'rgba(255,255,255,0.05)', label: 'Cancelled' },
  };

  const getS = (status: string) => {
    const s = String(status || 'pending').toLowerCase();
    return statusStyles[s] || { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)', label: status };
  };

  // Default policies if DB is empty
  const defaultPolicies = [
    { leave_type: "Casual/Earned", total_days: 12 },
    { leave_type: "Sick", total_days: 12 },
    { leave_type: "Maternity", total_days: 90 },
    { leave_type: "Paternity", total_days: 15 },
    { leave_type: "Bereavement", total_days: 5 },
  ];

  // Merge DB policies with defaults to ensure all types are always visible
  const activePolicies = defaultPolicies.map(dp => {
    const found = policies.find(p => p.leave_type && p.leave_type.toLowerCase() === dp.leave_type.toLowerCase());
    return found ? found : dp;
  });

  // Extract available years dynamically
  const availableYears = Array.from(
    new Set([
      String(new Date().getFullYear()),
      ...allLeaves.map(l => String(l.start_date || l.created_at || '').slice(0, 4)).filter(y => y && y.length === 4)
    ])
  ).sort().reverse();

  // Filter leaves based on Month and Year selection
  const filteredLeaves = allLeaves.filter(leave => {
    const dateStr = leave.start_date || leave.created_at || leave.applied_at || "";
    if (!dateStr) return true;

    const yyyy = String(dateStr).slice(0, 4);
    const mm = String(dateStr).slice(5, 7);

    if (selectedYear !== "all" && yyyy !== selectedYear) return false;
    if (selectedMonth !== "all" && mm !== selectedMonth) return false;

    return true;
  });

  const monthOptions = [
    { value: "all", label: "All Months" },
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  return (
    <div className="dashboard-container" style={{ paddingBottom: "100px" }}>
      <Header role={currentRole} title={`${currentRole} Leave Oversight`} />

      <div style={{ marginBottom: "clamp(1rem, 3vw, 1.875rem)" }}>
        <h1 style={{ fontSize: "clamp(1.35rem, 1rem + 1.8vw, 2rem)", fontWeight: "700" }}>{currentRole} Status Oversight</h1>
        <p className="subtitle" style={{ fontSize: "clamp(0.8125rem, 0.75rem + 0.3vw, 0.9375rem)" }}>Monitoring all employee leave requests and approvals across the organization</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(8.5rem, 100%, 12rem), 1fr))', gap: 'clamp(0.625rem, 1.5vw, 1rem)', marginBottom: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
        {[
          { label: 'Pending', value: filteredLeaves.filter(l => (l.status || '').toLowerCase() === 'pending').length, color: '#ff9f0a' },
          { label: 'Recommended', value: filteredLeaves.filter(l => (l.status || '').toLowerCase() === 'recommended').length, color: '#0a84ff' },
          { label: 'Approved', value: filteredLeaves.filter(l => (l.status || '').toLowerCase() === 'approved').length, color: '#30d158' },
          { label: 'Rejected', value: filteredLeaves.filter(l => (l.status || '').toLowerCase() === 'rejected').length, color: '#ff453a' },
        ].map(stat => (
          <div key={stat.label} style={{ flex: 1, padding: 'clamp(0.75rem, 1.5vw, 1rem)', borderRadius: 'var(--input-radius)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 'clamp(1.25rem, 1rem + 1vw, 1.625rem)', fontWeight: '700', color: 'var(--text-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.25rem' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <GlassCard title="📋 Organization Leave Records" subtitle="Complete visibility into the leave pipeline">
        {/* Month & Year Filter Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '15px', marginBottom: '15px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '600' }}>Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {monthOptions.map(m => (
                  <option key={m.value} value={m.value} style={{ background: '#1c1c1e', color: '#fff' }}>{m.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '600' }}>Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all" style={{ background: '#1c1c1e', color: '#fff' }}>All Years</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr} style={{ background: '#1c1c1e', color: '#fff' }}>{yr}</option>
                ))}
              </select>
            </div>

            {(selectedMonth !== 'all' || selectedYear !== 'all') && (
              <button
                onClick={() => { setSelectedMonth('all'); setSelectedYear('all'); }}
                style={{
                  background: 'rgba(255,69,58,0.12)',
                  color: '#ff453a',
                  border: '1px solid rgba(255,69,58,0.25)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Reset Filter
              </button>
            )}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredLeaves.length}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{allLeaves.length}</strong> records
          </div>
        </div>

        <div style={{ overflowX: 'auto', marginTop: '10px' }}>
          {filteredLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              No leave requests found for the selected month/year filter.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left' }}>
                  {['Employee', 'Hierarchy', 'Dept', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((leave, i) => {
                  const sStatus = (leave.status || '').toLowerCase();
                  const s = getS(leave.status);
                  const fromD = leave.start_date;
                  const toD = leave.end_date;
                  const isPending = sStatus === 'pending' || sStatus === 'recommended' || sStatus === 'recommendation-review';

                  // Resolve TL and Manager Names
                  const rawTl = leave.team_leader_name || employeesMap[leave.team_leader_id] || leave.team_leader_id;
                  const tlDisplay = rawTl ? (String(rawTl).toLowerCase().startsWith('tl:') ? rawTl : `TL: ${rawTl}`) : 'TL: Self';

                  const rawMgr = leave.manager_name || employeesMap[leave.manager_id] || leave.manager_id;
                  const mgrDisplay = rawMgr ? (String(rawMgr).toLowerCase().startsWith('mgr:') ? rawMgr : `MGR: ${rawMgr}`) : 'MGR: CEO';

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{leave.employee_name || leave.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{leave.employee_id}</div>
                      </td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '12px', color: '#bf5af2', fontWeight: '600', whiteSpace: 'nowrap' }}>{tlDisplay}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{mgrDisplay}</div>
                      </td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: 'var(--text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' }}>{leave.department || '—'}</td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: '#0a84ff', fontWeight: '600', whiteSpace: 'nowrap' }}>{leave.leave_type}</td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fromD}</td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{toD}</td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontWeight: '700', whiteSpace: 'nowrap' }}>{leave.total_days}d</td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: 'var(--text-secondary)', minWidth: '160px', maxWidth: '250px', wordBreak: 'break-word' }} title={leave.reason}>{leave.reason || '—'}</td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: '6px', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => handleAction(leave.leave_id || leave.id, 'approved')}
                              style={{ background: 'rgba(48,209,88,0.15)', color: '#30d158', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                            >
                              <FaCheck size={10} /> Approve
                            </button>
                            <button
                              onClick={() => handleAction(leave.leave_id || leave.id, 'rejected')}
                              style={{ background: 'rgba(255,69,58,0.15)', color: '#ff453a', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                            >
                              <FaTimes size={10} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Finalized</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      <div className="grid-3" style={{ marginTop: "30px" }}>
        <GlassCard title="Leave Policies" subtitle="Current active rules">
          <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
            {activePolicies.map(p => (
              <div key={p.leave_type} style={policyRow}>
                <span>{p.leave_type} Leave</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.total_days} Days</span>
                  <FaEdit 
                    style={{ cursor: 'pointer', color: 'var(--accent-blue)', opacity: 0.7 }} 
                    onClick={() => {
                      setEditingPolicy(p);
                      setNewDays(p.total_days.toString());
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '15px' }}>
            * Changes to policies affect new employees and balance resets.
          </p>
        </GlassCard>

        <GlassCard title="Export Center" subtitle="Archive and audits">
          <div style={{ marginTop: "10px", marginBottom: "25px", display: "flex", alignItems: "flex-start", gap: "12px", color: "var(--text-tertiary)", fontSize: "13px", lineHeight: '1.4' }}>
            <FaInfoCircle size={18} style={{ marginTop: '2px', color: 'var(--accent-blue)' }} />
            <span>All leave transactions are stored securely and available for audit.</span>
          </div>
          <button className="apple-btn" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <FaFileDownload /> Export Leave Data
          </button>
        </GlassCard>
      </div>

      {/* Edit Modal */}
      {editingPolicy && (
        <div style={modalOverlay}>
          <GlassCard title={`Edit ${editingPolicy.leave_type} Policy`} subtitle="Update organization-wide quota" style={{ width: '400px' }}>
            <div style={{ marginTop: '15px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '8px' }}>Annual Quota (Days)</label>
              <input 
                type="number"
                value={newDays}
                onChange={(e) => setNewDays(e.target.value)}
                style={modalInput}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  className="apple-btn" 
                  style={{ flex: 1, background: 'var(--accent-blue)' }}
                  onClick={handleSavePolicy}
                >
                  Save Changes
                </button>
                <button 
                  className="apple-btn" 
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}
                  onClick={() => setEditingPolicy(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

const policyRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "12px 0",
  borderBottom: "1px dotted var(--border-light)",
  fontSize: "13px",
  color: "var(--text-secondary)"
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(10px)'
};

const modalInput: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border-light)',
  color: 'white',
  fontSize: '16px'
};
