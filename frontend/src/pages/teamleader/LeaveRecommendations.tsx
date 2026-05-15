import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaCalendarAlt, FaUserFriends, FaCheck, FaTimes } from "react-icons/fa";
import { getPendingRecommendations, recommendLeave, getTeamMembers } from "../../services/teamleaderService";
import api from "../../api/apiClient";

export default function LeaveRecommendations() {
    const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
    const [allTeamLeaves, setAllTeamLeaves] = useState<any[]>([]);
    const [tab, setTab] = useState<'pending' | 'history'>('pending');
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Backend /teamleader/leaves returns all team leaves for this TL
            const data = await api.get("teamleader/leaves");
            const teamLeaves = data.data || [];
            
            setPendingLeaves(teamLeaves.filter((l: any) => l.status === 'pending'));
            setAllTeamLeaves(teamLeaves);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        try {
            await recommendLeave(id.toString(), action);
            alert(`Leave ${action}d successfully.`);
            fetchData();
        } catch (err) {
            alert("Action failed.");
        }
    };

    const statusColor = (status: string) => {
        if (status === 'approved') return { color: '#30d158', bg: 'rgba(48,209,88,0.12)' };
        if (status === 'rejected') return { color: '#ff453a', bg: 'rgba(255,69,58,0.12)' };
        if (status === 'pending') return { color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)' };
        return { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)' };
  };

    const statusLabel = (status: string) => {
        const map: any = {
            pending: 'Awaiting Your Approval',
            approved: 'Approved',
            rejected: 'Rejected'
        };
        return map[status] || status;
    };

    return (
        <div className="dashboard-container">
            <Header role="Team Leader" title="Leave Approvals" />

            <div style={{ marginBottom: "30px" }}>
                <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Leave Management</h1>
                <p className="subtitle">Review and manage leave requests from your team</p>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '30px' }}>
                {[
                    { label: 'Pending Approval', value: pendingLeaves.length, color: '#ff9f0a' },
                    { label: 'Total Team Leaves', value: allTeamLeaves.length, color: '#0a84ff' },
                    { label: 'Approved', value: allTeamLeaves.filter(l => l.status === 'approved').length, color: '#30d158' },
                    { label: 'Rejected', value: allTeamLeaves.filter(l => l.status === 'rejected').length, color: '#ff453a' },
                ].map(stat => (
                    <div key={stat.label} style={{ flex: 1, padding: '16px 20px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>{stat.value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
                <button onClick={() => setTab('pending')} style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: tab === 'pending' ? '#ff9f0a' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaCalendarAlt size={12} /> Pending ({pendingLeaves.length})
                </button>
                <button onClick={() => setTab('history')} style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: tab === 'history' ? '#0a84ff' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaUserFriends size={12} /> All Team Leaves ({allTeamLeaves.length})
                </button>
            </div>

            {/* Pending approvals */}
            {tab === 'pending' && (
                <GlassCard title="⏳ Pending Your Approval" subtitle="Leave requests from your direct reports waiting for your review">
                    <div style={{ maxHeight: "500px", overflowY: "auto", marginTop: "15px" }}>
                        {pendingLeaves.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                                <div style={{ fontWeight: '600' }}>No pending leave requests</div>
                                <div style={{ fontSize: '13px', marginTop: '6px' }}>Your recommendations have been sent to HR for finalization.</div>
                            </div>
                        ) : pendingLeaves.map((leave) => (
                            <div
                                key={leave.id}
                                style={{
                                    padding: "16px",
                                    borderRadius: "16px",
                                    marginBottom: "12px",
                                    background: "rgba(255,255,255,0.02)",
                                    border: "1px solid var(--border-light)",
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '15px'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#bf5af2,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '18px', flexShrink: 0 }}>
                                        {(leave.employee_name || '?').charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>{leave.employee_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                            <span style={{ color: '#0a84ff', fontWeight: '600' }}>{leave.leave_type}</span> • {leave.start_date} → {leave.end_date}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Reason: {leave.reason}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => handleAction(leave.id, 'approve')} className="apple-btn" style={{ padding: '8px 18px', fontSize: '12px', background: 'rgba(48,209,88,0.12)', color: '#30d158', border: '1px solid rgba(48,209,88,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FaCheck size={11} /> Approve
                                    </button>
                                    <button onClick={() => handleAction(leave.id, 'reject')} className="apple-btn" style={{ padding: '8px 18px', fontSize: '12px', background: 'rgba(255,69,58,0.12)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FaTimes size={11} /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* All team leave history */}
            {tab === 'history' && (
                <GlassCard title="📋 All Team Leave Requests" subtitle="Complete leave history for all your direct reports">
                    <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                        {allTeamLeaves.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                No leave requests from your team yet.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left' }}>
                                        {['Employee', 'Leave Type', 'From', 'To', 'Reason', 'Status', 'Applied On'].map(h => (
                                            <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTeamLeaves.map((leave, i) => {
                                        const sc = statusColor(leave.status);
                                        return (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                <td style={{ padding: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{leave.employee_name}</td>
                                                <td style={{ padding: '12px', color: '#0a84ff' }}>{leave.leave_type}</td>
                                                <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{leave.start_date}</td>
                                                <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{leave.end_date}</td>
                                                <td style={{ padding: '12px', color: 'var(--text-tertiary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leave.reason}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: sc.bg, color: sc.color }}>
                                                        {statusLabel(leave.status)}
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
            )}
        </div>
    );
}
