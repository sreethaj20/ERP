import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaCalendarPlus, FaListUl, FaChartPie, FaCheckCircle, FaInfoCircle, FaClock, FaTrash, FaSyncAlt } from "react-icons/fa";
import { getMyLeaves, applyLeave, getMyLeaveBalance, cancelLeave } from "../../services/employeeService";
import webSocketService from "../../services/websocketService";

export default function LeaveManagement() {
    const userId = sessionStorage.getItem("userId");
    const [activeTab, setActiveTab] = useState<"apply" | "status" | "balance">("apply");
    const [leaveList, setLeaveList] = useState<any[]>([]);
    const [balancesData, setBalancesData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Apply Leave State
    const [leaveType, setLeaveType] = useState("Casual");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [reason, setReason] = useState("");
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const refreshData = async () => {
        setLoading(true);
        try {
            const [leaves, balances] = await Promise.all([
                getMyLeaves(),
                getMyLeaveBalance()
            ]);
            setLeaveList(leaves);
            setBalancesData(balances);
        } catch (e) {
            console.error("Failed to refresh leave data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
        const handleUpdate = (msg: any) => {
            if (msg.event === "data_updated" && msg.data?.type === "leaves") {
                refreshData();
            }
        };
        webSocketService.on("data_updated", handleUpdate);
        return () => {
          webSocketService.off("data_updated", handleUpdate);
        };
    }, []);

    const getAvailable = (type: string) => {
        if (!balancesData) return 0;
        const key = `${type.toLowerCase()}_leave`;
        return balancesData[key] || 0;
    };

const handleLeaveSubmit = async () => {
        if (!fromDate || !toDate || !reason || reason.length < 3) {
            setStatusMsg({ type: 'error', text: !reason ? 'Please fill in all fields.' : 'Reason must be at least 3 characters long.' });
            return;
        }

        if (!userId) {
            setStatusMsg({ type: 'error', text: 'You must be logged in to apply for leave.' });
            return;
        }

        // Calculate total days (excluding weekends)
        const calculateDays = (from: string, to: string) => {
            let count = 0;
            let cur = new Date(from);
            const last = new Date(to);
            while (cur <= last) {
                if (cur.getDay() !== 0 && cur.getDay() !== 6) count++; // Exclude Sat/Sun
                cur.setDate(cur.getDate() + 1);
            }
            return count;
        };

        const totalDays = calculateDays(fromDate, toDate);
        const available = getAvailable(leaveType);

        if (totalDays > available && leaveType !== 'Unpaid') {
            setStatusMsg({ type: 'error', text: `Insufficient balance! Requested ${totalDays} working days.` });
            return;
        }

        const leaveData = {
            employee_id: userId || "PENDING",
            leave_type: leaveType,
            start_date: fromDate,
            end_date: toDate,
            total_days: totalDays,
            reason: reason.trim()
        };

        try {
            await applyLeave(leaveData);
            setStatusMsg({ type: 'success', text: `Leave request submitted successfully! (${totalDays} working days)` });
            setFromDate("");
            setToDate("");
            setReason("");
            setLeaveType("Casual");
            refreshData();
        } catch (e: any) {
            let errorText = "Submission failed.";
            const detail = e?.response?.data?.detail;
            if (typeof detail === "string") errorText = detail;
            else if (Array.isArray(detail)) errorText = detail.map((err: any) => err.msg).join(", ");
            else if (detail?.msg) errorText = detail.msg;

            setStatusMsg({ type: 'error', text: errorText });
        }
    };

    const handleCancel = async (leaveId: string) => {
        if (!window.confirm("Are you sure you want to cancel this leave request?")) return;
        try {
            await cancelLeave(leaveId);
            setStatusMsg({ type: 'success', text: 'Leave request cancelled successfully.' });
            refreshData();
        } catch (e: any) {
            setStatusMsg({ type: 'error', text: 'Cancellation failed.' });
        }
    };

    const getStatusInfo = (status: string) => {
        const s = status ? status.toLowerCase() : 'pending';
        switch (s) {
            case 'approved': return { color: '#30d158', label: 'Approved', step: 2 };
            case 'rejected': return { color: '#ff453a', label: 'Rejected', step: 0 };
            case 'cancelled': return { color: '#8e8e93', label: 'Cancelled', step: 0 };
            case 'recommended': return { color: '#ff9f0a', label: 'Recommended', step: 1 };
            case 'recommended-by-manager': return { color: '#0a84ff', label: 'Rec. by Manager', step: 1 };
            case 'pending': return { color: '#ff9f0a', label: 'Pending', step: 1 };
            default: return { color: '#8e8e93', label: status || 'Pending', step: 1 };
        }
    };

    return (
        <div className="dashboard-container">
            <Header role="Employee" title="Leave Center" />

            <div style={{ marginBottom: "30px", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: '4px' }}>Leave Management</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Request absence, track progress and view balances</p>
                </div>
                <button 
                    className="apple-btn-secondary" 
                    onClick={refreshData}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '13px' }}
                >
                    <FaSyncAlt size={14} className={loading ? "spin" : ""} />
                    Refresh Policy
                </button>
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex', gap: '10px', marginBottom: '24px',
                background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '6px',
                border: '1px solid var(--border-light)', width: 'fit-content'
            }}>
                <TabButton active={activeTab === 'apply'} onClick={() => setActiveTab('apply')} icon={<FaCalendarPlus />} label="Apply Leave" />
                <TabButton active={activeTab === 'status'} onClick={() => setActiveTab('status')} icon={<FaListUl />} label="Track Status" />
                <TabButton active={activeTab === 'balance'} onClick={() => setActiveTab('balance')} icon={<FaChartPie />} label="Leave Balance" />
            </div>

            {activeTab === 'apply' && (
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
                    <div>
                        {statusMsg && (
                            <div style={{
                                padding: '15px', borderRadius: '12px', marginBottom: '20px',
                                background: statusMsg.type === 'success' ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)',
                                color: statusMsg.type === 'success' ? '#30d158' : '#ff453a',
                                border: `1px solid ${statusMsg.type === 'success' ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)'}`,
                                display: 'flex', alignItems: 'center', gap: '10px'
                            }}>
                                <FaCheckCircle /> {statusMsg.text}
                            </div>
                        )}
                        <GlassCard title="Request Time Off" subtitle="Submit your leave application">
                            <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "15px" }}>
                                <div style={inputGroup}>
                                    <label style={labelStyle}>Leave Category</label>
                                    <select className="apple-input" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                                        <option value="Casual">Casual Leave</option>
                                        <option value="Sick">Sick Leave</option>
                                        <option value="Earned">Earned Leave</option>
                                        <option value="Maternity">Maternity Leave</option>
                                        <option value="Paternity">Paternity Leave</option>
                                        <option value="Bereavement">Bereavement Leave</option>
                                        <option value="Unpaid">Unpaid Leave</option>
                                    </select>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                                    <div style={inputGroup}>
                                        <label style={labelStyle}>Start Date</label>
                                        <input type="date" className="apple-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                                    </div>
                                    <div style={inputGroup}>
                                        <label style={labelStyle}>End Date</label>
                                        <input type="date" className="apple-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                                    </div>
                                </div>

<div style={inputGroup}>
                                    <label style={labelStyle}>Reason <span style={{color: 'var(--accent-blue)', fontSize: '11px'}}>(min 3 chars)</span></label>
                                    <textarea
                                        className="apple-input"
                                        placeholder="Brief description of absence (minimum 3 characters required)..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        style={{ height: "100px", resize: "none" }}
                                    />
                                    {reason && reason.length < 3 && (
                                        <div style={{fontSize: '11px', color: '#ff453a', marginTop: '4px'}}>
                                            Reason too short ({reason.length}/3)
                                        </div>
                                    )}
                                    {reason && reason.length >= 3 && (
                                        <div style={{fontSize: '11px', color: '#30d158', marginTop: '4px'}}>
                                            ✓ Valid ({reason.length} chars)
                                        </div>
                                    )}
                                </div>

                                <button className="apple-btn" onClick={handleLeaveSubmit} style={{ height: "50px", marginTop: "10px", background: 'var(--accent-blue)', color: 'white' }}>
                                    <FaCheckCircle /> Submit Request
                                </button>
                            </div>
                        </GlassCard>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <GlassCard title="Quick Balance" subtitle="Remaining quota overview">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                                <MiniBalance label="Casual" val={getAvailable("Casual")} total={24} color="#0a84ff" />
                                <MiniBalance label="Sick" val={getAvailable("Sick")} total={15} color="#ff453a" />
                                <MiniBalance label="Earned" val={getAvailable("Earned")} total={30} color="#30d158" />
                            </div>
                        </GlassCard>
                        <GlassCard title="Approval Policy" subtitle="Workflow info">
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}><FaInfoCircle color="var(--accent-blue)" /> <span>Final approval by your Team Leader (TL).</span></div>
                                <div style={{ display: 'flex', gap: '8px' }}><FaInfoCircle color="var(--accent-blue)" /> <span>HR retains governance oversight for auditing.</span></div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            )}

            {activeTab === 'status' && (
                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "24px" }}>
                    <GlassCard title="Application History" subtitle="Track your requests">
                        <div style={{ maxHeight: "600px", overflowY: "auto", marginTop: "15px" }}>
                            {leaveList.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                    <FaClock size={40} style={{ opacity: 0.2, marginBottom: '15px' }} />
                                    <p>No leave requests found.</p>
                                </div>
                            ) : leaveList.map((l) => {
                                const info = getStatusInfo(l.status);
                                return (
                                    <div key={l.id} style={{
                                        padding: "16px", borderRadius: "14px", marginBottom: "12px",
                                        background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-light)",
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: '700', fontSize: '15px' }}>{l.leave_type} Leave</span>
                                                <span style={{ fontSize: '10px', color: info.color, background: `${info.color}15`, padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>{info.label}</span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{l.start_date} — {l.end_date} ({l.total_days} days)</div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{new Date(l.applied_at || l.created_at).toLocaleDateString()}</div>
                                            {l.status && ['pending', 'recommended', 'recommendation-review'].includes(l.status.toLowerCase()) && (
                                                <button 
                                                    onClick={() => handleCancel(l.leave_id || l.id)} 
                                                    style={{ background: 'rgba(255,69,58,0.12)', border: 'none', color: '#ff453a', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                                    <FaTrash size={9} /> Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>
                    <GlassCard title="What's Next?" subtitle="Next steps in workflow">
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            Your request is processed sequentially. Once submitted, your Team Lead is notified via email/portal to approve or reject based on team availability.
                        </p>
                    </GlassCard>
                </div>
            )}

            {activeTab === 'balance' && (
                <div className="grid-3">
                    <BalanceCard title="Casual Leave" val={getAvailable("Casual")} quota={24} color="#0a84ff" />
                    <BalanceCard title="Sick Leave" val={getAvailable("Sick")} quota={15} color="#ff453a" />
                    <BalanceCard title="Earned Leave" val={getAvailable("Earned")} quota={30} color="#30d158" />
                    <BalanceCard title="Maternity" val={getAvailable("maternity")} quota={90} color="#bf5af2" />
                    <BalanceCard title="Paternity" val={getAvailable("paternity")} quota={15} color="#007aff" />
                    <BalanceCard title="Bereavement" val={getAvailable("bereavement")} quota={5} color="#ff9f0a" />
                    <BalanceCard title="Year to Date" val={balancesData?.total_used || 0} quota={0} color="#ff9f0a" subtitle="Used leaves" isUsed />
                </div>
            )}
        </div>
    );
}

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
        borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
        background: active ? 'var(--accent-blue)' : 'transparent',
        color: active ? 'white' : 'var(--text-secondary)',
        transition: 'all 0.2s'
    }}>
        {icon} {label}
    </button>
);

const MiniBalance = ({ label, val, total, color }: any) => (
    <div style={{ fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>{label}</span>
            <span style={{ fontWeight: '700' }}>{val}/{total}</span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
            <div style={{ height: '100%', width: `${(val / total) * 100}%`, background: color, borderRadius: '2px' }} />
        </div>
    </div>
);

const BalanceCard = ({ title, val, quota, color, subtitle, isUsed }: any) => (
    <GlassCard title={title} subtitle={subtitle || `${quota} Days Quota`}>
        <h2 style={{ fontSize: '32px', fontWeight: '800', marginTop: '10px', color: color }}>
            {val} {isUsed ? 'Days' : 'Left'}
        </h2>
    </GlassCard>
);

const inputGroup = { display: "flex", flexDirection: "column" as const, gap: "6px" };
const labelStyle = { fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.5px" };
