import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaCalendarAlt, FaCheck, FaTimes, FaFileDownload, FaInfoCircle, FaEdit } from "react-icons/fa";
import api from "../../api/apiClient";
import { getLeavePolicies, updateLeavePolicy } from "../../utils/storage";

export default function LeaveManagement() {
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [newDays, setNewDays] = useState<string>("");
  const location = useLocation();

  const isRecruiter = location.pathname.includes('/recruiter/');
  const currentRole = isRecruiter ? 'Recruiter' : 'HR';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, policiesRes] = await Promise.all([
        api.get("hr/leaves"),
        getLeavePolicies()
      ]);
      setAllLeaves(leavesRes.data || []);
      setPolicies(policiesRes || []);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [location.pathname]);

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
    { leave_type: "Casual", total_days: 24 },
    { leave_type: "Sick", total_days: 15 },
    { leave_type: "Earned", total_days: 30 },
    { leave_type: "Maternity", total_days: 90 },
    { leave_type: "Paternity", total_days: 15 },
    { leave_type: "Bereavement", total_days: 5 },
  ];

  // Merge DB policies with defaults to ensure all types are always visible
  const activePolicies = defaultPolicies.map(dp => {
    const found = policies.find(p => p.leave_type && p.leave_type.toLowerCase() === dp.leave_type.toLowerCase());
    return found ? found : dp;
  });

  return (
    <div className="dashboard-container">
      <Header role={currentRole} title={`${currentRole} Leave Oversight`} />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>{currentRole} Status Oversight</h1>
        <p className="subtitle">Monitoring all employee leave requests and approvals across the organization</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Pending', value: allLeaves.filter(l => (l.status || '').toLowerCase() === 'pending').length, color: '#ff9f0a' },
          { label: 'Recommended', value: allLeaves.filter(l => (l.status || '').toLowerCase() === 'recommended').length, color: '#0a84ff' },
          { label: 'Approved', value: allLeaves.filter(l => (l.status || '').toLowerCase() === 'approved').length, color: '#30d158' },
          { label: 'Rejected', value: allLeaves.filter(l => (l.status || '').toLowerCase() === 'rejected').length, color: '#ff453a' },
        ].map(stat => (
          <div key={stat.label} style={{ flex: 1, padding: '14px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <GlassCard title="📋 Organization Leave Records" subtitle="Complete visibility into the leave pipeline">
        <div style={{ overflowX: 'auto', marginTop: '15px' }}>
          {allLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              No leave requests have been submitted yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left' }}>
                  {['Employee', 'Hierarchy', 'Dept', 'Type', 'From', 'To', 'Days', 'Status', 'Applied'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allLeaves.map((leave, i) => {
                  const s = getS(leave.status);
                  const fromD = leave.start_date;
                  const toD = leave.end_date;

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{leave.employee_name || leave.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{leave.employee_id}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#bf5af2', fontWeight: '600' }}>TL: {leave.team_leader_id || 'Self'}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>MGR: {leave.manager_id || 'CEO'}</div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>{leave.department || '—'}</td>
                      <td style={{ padding: '12px', color: '#0a84ff', fontWeight: '600' }}>{leave.leave_type}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{fromD}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{toD}</td>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{leave.total_days}d</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                        {leave.created_at ? new Date(leave.created_at).toLocaleDateString('en-IN') : '—'}
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
