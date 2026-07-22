import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getAllLeaves, approveLeave } from "../../services/managerService";
import { FaCheck, FaTimes } from "react-icons/fa";
import { getEmployees } from "../../utils/storage";
import webSocketService from "../../services/websocketService";

export default function LeaveApprovals() {
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [leaves, empData] = await Promise.all([
          getAllLeaves(),
          getEmployees()
        ]);
        setAllLeaves(leaves);
        setEmployees(empData);
    } catch (e) {
        console.error("Failed to fetch data:", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Subscribe to real-time leave updates
    const handleRealtimeUpdate = (msg: any) => {
        if (msg.event === "data_updated" && (msg.data.type === "leaves" || msg.data.type === "attendance")) {
            console.log("[WS] Live data refresh from dashboard:", msg);
            fetchData();
        }
    };
    webSocketService.on("data_updated", handleRealtimeUpdate);

    return () => {
      webSocketService.off("data_updated", handleRealtimeUpdate);
    };
  }, []);

  const handleAction = async (leaveId: string, action: 'approve' | 'reject') => {
    try {
        await approveLeave(leaveId, action);
        fetchData();
    } catch (error: any) {
        alert(error?.response?.data?.detail || "Action failed");
    }
  };

  const isPending = (status: string) => status === 'pending_manager' || status === 'pending';

  const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
    pending_tl: { color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)', label: '⏳ Forwarded to Manager' },
    pending_manager: { color: '#0a84ff', bg: 'rgba(10,132,255,0.12)', label: '⏳ Awaiting My Approval' },
    pending: { color: '#0a84ff', bg: 'rgba(10,132,255,0.12)', label: '⏳ Awaiting My Approval' },
    approved: { color: '#30d158', bg: 'rgba(48,209,88,0.12)', label: '✓ Approved' },
    rejected: { color: '#ff453a', bg: 'rgba(255,69,58,0.12)', label: '✕ Rejected' },
  };

  const ss = (status: string) => statusStyles[status] || { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)', label: status };

  const roleColor: Record<string, string> = {
    hr: '#0a84ff', recruiter: '#bf5af2', teamleader: '#ff9f0a',
    itdepartment: '#64d2ff', it: '#64d2ff', employee: '#30d158'
  };

  return (
    <div className="dashboard-container">
      <Header role="Manager" title="Leave Pipeline" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Organization Leave Pipeline</h1>
        <p className="subtitle">Approve or reject leave requests from all staff roles across departments</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Awaiting Approval', value: allLeaves.filter(l => isPending((l.status || '').toLowerCase())).length, color: '#ff9f0a' },
          { label: 'Approved', value: allLeaves.filter(l => (l.status || '').toLowerCase() === 'approved').length, color: '#30d158' },
          { label: 'Rejected', value: allLeaves.filter(l => (l.status || '').toLowerCase() === 'rejected').length, color: '#ff453a' },
          { label: 'Total Requests', value: allLeaves.length, color: 'var(--text-secondary)' },
        ].map(stat => (
          <div key={stat.label} style={{ flex: 1, padding: '14px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', borderLeft: `3px solid ${stat.color}` }}>
            <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <GlassCard title="All Leave Requests" subtitle="Approve or reject directly from this view">
        <div style={{ overflowX: 'auto', marginTop: '15px' }}>
          {allLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              No leave requests in the system currently.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left' }}>
                  {['Employee', 'Role', 'Leave Type', 'Period', 'Days', 'Reason', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allLeaves.map((leave, i) => {
                  const sStatus = (leave.status || '').toLowerCase();
                  const s = statusStyles[sStatus] || { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)', label: leave.status };
                  // Safely Map Employee Identity 
                  const emp = employees.find((e: any) => String(e.id) === String(leave.employee_id) || String(e.employee_id) === String(leave.employee_id));
                  const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : leave.employee_name || 'Unknown User';
                  const empDisplayId = emp ? emp.employee_id : `ID: ${leave.employee_id}`;
                  const empRole = emp?.designation || emp?.role || leave.role || 'employee';
                  const rColor = roleColor[empRole.toLowerCase().replace(/[\s_]+/g, '')] || '#8e8e93';

                  const fromD = leave.start_date;
                  const toD = leave.end_date;
                  const days = leave.total_days;

                  // Show approval buttons for both legacy 'pending' and precise 'pending_manager' 
                  const showAction = sStatus === 'pending_manager' || sStatus === 'pending';
                  
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{empName}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{empDisplayId}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', color: rColor, background: `${rColor}18`, textTransform: 'capitalize' }}>
                          {empRole}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--accent-blue)', fontWeight: '600' }}>{leave.leave_type}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'monospace' }}>
                        {fromD} → {toD}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{days}d</td>
                      <td style={{ padding: '12px', color: 'var(--text-tertiary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>{leave.reason}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {showAction ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleAction(leave.leave_id || leave.id, 'approve')}
                              style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'rgba(48,209,88,0.15)', color: '#30d158', fontWeight: '700', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                              <FaCheck size={10} /> Approve
                            </button>
                            <button
                              onClick={() => handleAction(leave.leave_id || leave.id, 'reject')}
                              style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'rgba(255,69,58,0.15)', color: '#ff453a', fontWeight: '700', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                              <FaTimes size={10} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                            {sStatus === 'approved' ? '✓ Done' : sStatus === 'rejected' ? '✕ Done' : 'Waiting...'}
                          </span>
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
    </div>
  );
}
