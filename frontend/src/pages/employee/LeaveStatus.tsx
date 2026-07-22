import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaCheckCircle, FaCalendarPlus } from "react-icons/fa";
import { getMyLeaves } from "../../services/employeeService";
import webSocketService from "../../services/websocketService";

export default function LeaveStatus() {
  const [leaveList, setLeaveList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getMyLeaves();
      setLeaveList(data);
    } catch (e) {
      console.error("Failed to fetch leaves:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = (msg: any) => {
      if (msg.event === "data_updated" && msg.data.type === "leaves") {
        fetchData();
      }
    };
    webSocketService.on("data_updated", handleUpdate);
    return () => {
      webSocketService.off("data_updated", handleUpdate);
    };
  }, []);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'approved': return { color: '#30d158', label: 'Approved', step: 2 };
      case 'rejected': return { color: '#ff453a', label: 'Rejected', step: 0 };
      default: return { color: '#ff9f0a', label: 'Awaiting Action', step: 1 };
    }
  };

  const Pipeline = ({ leave }: { leave: any }) => {
    const info = getStatusInfo(leave.status);
    const userRole = (sessionStorage.getItem('userRole') || 'employee').toLowerCase();

    // Who is the official approver for this user?
    const approverLabel = userRole === 'employee' ? 'Team Leader' : 'Manager';

    const stages = [
      { id: 'approver', label: approverLabel },
      { id: 'final', label: 'Final' }
    ];

    const currentStep = info.step;
    const isRejected = leave.status === 'rejected';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {stages.map((s, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < currentStep || leave.status === 'approved';
            const isCurrent = stepNum === currentStep;

            return (
              <React.Fragment key={s.id}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 'bold',
                    background: isRejected ? 'rgba(255,69,58,0.1)' : isCompleted ? 'var(--accent-blue)' : isCurrent ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.05)',
                    color: isRejected ? '#ff453a' : isCompleted ? '#fff' : isCurrent ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                    border: isCurrent ? '1px solid var(--accent-blue)' : '1px solid transparent',
                    transition: 'all 0.3s ease'
                  }}>
                    {isCompleted ? <FaCheckCircle size={14} /> : s.label}
                  </div>
                </div>
                {i < stages.length - 1 && (
                  <div style={{ height: '2px', width: '30px', background: isCompleted ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)', marginTop: '-15px' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
          {leave.status === 'rejected' ? (
            <span style={{ color: '#ff453a' }}>Request Rejected</span>
          ) : leave.status === 'approved' ? (
            <span style={{ color: '#30d158' }}>Fully Approved!</span>
          ) : (
            <span>Currently with <b>{approverLabel} Approver</b></span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <Header role="Employee" title="Leave History" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Leave Track</h1>
        <p className="subtitle">Real-time approval pipeline monitoring</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "24px" }}>
        <GlassCard title="Leave Requests" subtitle="Workflow status details">
          <div style={{ maxHeight: "600px", overflowY: "auto", marginTop: "15px" }}>
            {leaveList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                <FaCalendarPlus size={40} style={{ opacity: 0.2, marginBottom: '15px' }} />
                <p>No leave history available.</p>
              </div>
            ) : leaveList.map((l) => {
              const info = getStatusInfo(l.status);
              return (
                <div
                  key={l.id}
                  style={{
                    padding: "20px",
                    borderRadius: "18px",
                    marginBottom: "15px",
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid var(--border-light)",
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: info.color }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '18px' }}>{l.leave_type} Leave</span>
                        <span style={{ fontSize: '11px', background: `${info.color}15`, color: info.color, padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{info.label}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {l.from_date} — {l.to_date}
                      </div>

                      <Pipeline leave={l} />
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      <div>Requested on</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <b>Reason:</b> {l.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard title="Approval Flow" subtitle="Who approves what">
          <p style={{ color: "var(--text-secondary)", fontSize: '13px', lineHeight: '1.6' }}>
            To simplify approvals, <b>Standard Employees</b> are now approved directly by their <b>Team Leader</b>.
            <br /><br />
            <b>Staff Personnel</b> (HR, IT, Recruiter, TLs) are approved directly by the <b>Reporting Manager</b>. All approvals are final upon one click.
          </p>
        </GlassCard>

        <GlassCard title="Download Leave Report" subtitle="Export leave history">
          <button style={btnStyle}>Download Excel</button>
        </GlassCard>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "15px",
  padding: "12px",
  borderRadius: "12px",
  border: "none",
  background: "#00BFFF",
  color: "white",
  fontWeight: "600",
  cursor: "pointer",
};
