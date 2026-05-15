import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaClock, FaCheck, FaTimes, FaHistory } from "react-icons/fa";
import api from "../../api/apiClient";
import { handleEarlyLogin } from "../../services/teamleaderService";

export default function EarlyLoginApprovals() {
    const [requests, setRequests] = useState<any[]>([]);
    const [tab, setTab] = useState<'pending' | 'history'>('pending');
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get("teamleader/early-login");
            setRequests(res.data || []);
        } catch (err) {
            console.error("Error fetching early logins:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (id: number, action: 'approved' | 'rejected') => {
        try {
            await handleEarlyLogin(id, action);
            fetchData();
        } catch (err) {
            alert("Action failed.");
        }
    };

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const historyRequests = requests.filter(r => r.status !== 'pending');

    const statusColor = (status: string) => {
        if (status === 'approved') return { color: '#30d158', bg: 'rgba(48,209,88,0.12)' };
        if (status === 'rejected') return { color: '#ff453a', bg: 'rgba(255,69,58,0.12)' };
        return { color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)' };
    };

    return (
        <div className="dashboard-container">
            <Header role="Team Leader" title="Early Login Approvals" />

            <div style={{ marginBottom: "30px" }}>
                <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Early Login Management</h1>
                <p className="subtitle">Approve shift starts before regular hours for your team</p>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
                <button onClick={() => setTab('pending')} style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: tab === 'pending' ? '#ff9f0a' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaClock size={12} /> Pending ({pendingRequests.length})
                </button>
                <button onClick={() => setTab('history')} style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: tab === 'history' ? '#0a84ff' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaHistory size={12} /> History ({historyRequests.length})
                </button>
            </div>

            {tab === 'pending' ? (
                <GlassCard title="⏳ Pending Approvals" subtitle="Requests waiting for your decision">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
                        {pendingRequests.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                No pending early login requests.
                            </div>
                        ) : pendingRequests.map(req => (
                            <div key={req.id} style={{
                                padding: "16px",
                                borderRadius: "16px",
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid var(--border-light)",
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,159,10,0.15)', color: '#ff9f0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FaClock />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '700', fontSize: '16px' }}>{req.employee_name}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            Requested: <span style={{ color: '#ff9f0a', fontWeight: '700' }}>{req.date} @ {req.requested_start_time}</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Reason: {req.reason}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleAction(req.id, 'approved')} className="apple-btn" style={{ background: '#30d158', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FaCheck size={12} /> Approve
                                    </button>
                                    <button onClick={() => handleAction(req.id, 'rejected')} className="apple-btn" style={{ background: 'rgba(255,69,58,0.2)', color: '#ff453a', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FaTimes size={12} /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            ) : (
                <GlassCard title="📋 Approval History" subtitle="Previous early login decisions">
                    <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                        {historyRequests.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                No history found.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left' }}>
                                        <th style={thStyle}>Employee</th>
                                        <th style={thStyle}>Date</th>
                                        <th style={thStyle}>Req. Time</th>
                                        <th style={thStyle}>Reason</th>
                                        <th style={thStyle}>Status</th>
                                        <th style={thStyle}>Processed At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyRequests.map((req, i) => {
                                        const sc = statusColor(req.status);
                                        return (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                <td style={{ padding: '12px', fontWeight: '600' }}>{req.employee_name}</td>
                                                <td style={{ padding: '12px' }}>{req.date}</td>
                                                <td style={{ padding: '12px', fontWeight: '600', color: '#ff9f0a' }}>{req.requested_start_time}</td>
                                                <td style={{ padding: '12px', color: 'var(--text-tertiary)' }}>{req.reason}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: sc.bg, color: sc.color, textTransform: 'uppercase' }}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px', color: 'var(--text-tertiary)' }}>
                                                    {req.updated_at ? new Date(req.updated_at).toLocaleString('en-IN') : (req.created_at ? new Date(req.created_at).toLocaleString('en-IN') : '—')}
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

const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};
