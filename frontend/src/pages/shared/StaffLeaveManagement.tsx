import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaCalendarPlus, FaListUl, FaChartPie, FaCheckCircle, FaClock, FaTimesCircle, FaInfoCircle, FaSyncAlt } from "react-icons/fa";
import { applyLeave, getMyLeaveBalance, getMyLeaves } from "../../services/employeeService";
import { getEmployees, getLeaves, refreshLeaves, getMyEmployee } from "../../utils/storage";

interface Props {
    role: string;
    roleLabel?: string;
}

export default function StaffLeaveManagement({ role, roleLabel }: Props) {
    const [activeTab, setActiveTab] = useState<"apply" | "status" | "balance">("apply");
    const userId = sessionStorage.getItem("userId") || "";
    const [leaveList, setLeaveList] = useState<any[]>([]);
    const [balances, setBalances] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Apply Leave State
    const [leaveType, setLeaveType] = useState("Casual");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [reason, setReason] = useState("");
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const refreshData = async () => {
        setLoading(true);
        try {
            // AUTHORITATIVE API FETCH
            const [balanceData, leavesData] = await Promise.all([
                getMyLeaveBalance(),
                getMyLeaves()
            ]);
            
            console.log("[DEBUG] Leave Balance:", balanceData);
            console.log("[DEBUG] Leave History:", leavesData);
            
            setBalances(balanceData);
            setLeaveList(Array.isArray(leavesData) ? leavesData : []);
        } catch (e) {
            console.error("Refresh failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
        // Listen for websocket/storage events if many tabs open
        window.addEventListener("storage", refreshData);
        return () => window.removeEventListener("storage", refreshData);
    }, [userId]);

    const handleSubmit = async () => {
        if (!fromDate || !toDate || !reason) {
            setStatusMsg({ type: "error", text: "Please fill in all required fields." });
            return;
        }
        const userName = sessionStorage.getItem("userName") || "";
        const userDept = sessionStorage.getItem("userDept") || "General";
        const userRole = sessionStorage.getItem("userRole") || role || "Employee";

        if (!userId) {
            setStatusMsg({ type: "error", text: "Your session has expired. Please log in again." });
            return;
        }

        try {
            await applyLeave({
                employee_id: userId || "PENDING",
                leave_type: leaveType,
                start_date: fromDate,
                end_date: toDate,
                total_days: 0, // Backend will re-calculate
                reason: reason,
            });

            setStatusMsg({ type: "success", text: "Leave request submitted! It will be routed for manager approval." });
            setFromDate(""); setToDate(""); setReason("");
            setTimeout(() => setStatusMsg(null), 4000);
            refreshData();
        } catch (error: any) {
            let errorText = "Could not submit leave. Please check your balance.";
            const detail = error?.response?.data?.detail;
            
            if (typeof detail === "string") {
                errorText = detail;
            } else if (Array.isArray(detail)) {
                errorText = detail.map((err: any) => err.msg).join(", ");
            } else if (detail && typeof detail === "object") {
                errorText = detail.msg || JSON.stringify(detail);
            }
            
            setStatusMsg({ type: "error", text: errorText });
        }
    };

    const getStatusPill = (status: string) => {
        const map: Record<string, { color: string; bg: string; label: string }> = {
            approved: { color: "#30d158", bg: "rgba(48,209,88,0.1)", label: "✓ Approved" },
            rejected: { color: "#ff453a", bg: "rgba(255,69,58,0.1)", label: "✕ Rejected" },
            pending_tl: { color: "#ff9f0a", bg: "rgba(255,159,10,0.1)", label: "⏳ Pending TL" },
            pending_manager: { color: "#0a84ff", bg: "rgba(10,132,255,0.1)", label: "⏳ Pending Manager" },
            pending: { color: "#8e8e93", bg: "rgba(142,142,147,0.1)", label: "⏳ Pending" },
        };
        const s_key = (status || "pending").toLowerCase();
        const s = map[s_key] || map.pending;
        
        return (
            <span style={{ 
                padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "700", 
                color: s?.color || "#8e8e93", 
                background: s?.bg || "rgba(142,142,147,0.1)" 
            }}>
                {s?.label || status || "Pending"}
            </span>
        );
    };

    const displayLabel = roleLabel || role;
    const tabs = [
        { id: "apply", label: "Apply Leave", icon: <FaCalendarPlus /> },
        { id: "status", label: "My Status", icon: <FaListUl /> },
        { id: "balance", label: "Leave Balance", icon: <FaChartPie /> },
    ];

    return (
        <div className="dashboard-container">
            <Header role={displayLabel} title="Leave Center" />

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "4px" }}>My Leave</h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
                            Logged in as: <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{sessionStorage.getItem("employeeId") || 'Unknown'}</span>
                        </p>
                    </div>
                    <button 
                        className="apple-btn-secondary" 
                        onClick={refreshData} 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
                    >
                        <FaSyncAlt size={14} className={loading ? "spin" : ""} />
                        Refresh Data
                    </button>
                </div>

            {/* Info Banner */}
            <div style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "14px 18px", borderRadius: "14px",
                background: "rgba(10,132,255,0.08)", border: "1px solid rgba(10,132,255,0.2)",
                marginBottom: "24px", fontSize: "13px", color: "var(--accent-blue)"
            }}>
                <FaInfoCircle size={16} />
                <span>Your leave requests are routed directly to your <b>Reporting Manager</b> for approval. Once approved, your calendar and attendance will update automatically.</span>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "28px", background: "rgba(255,255,255,0.03)", padding: "6px", borderRadius: "16px", border: "1px solid var(--border-light)", width: "fit-content" }}>
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "10px 20px", borderRadius: "12px", border: "none",
                        background: activeTab === tab.id ? "var(--accent-blue)" : "transparent",
                        color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
                        fontWeight: "600", fontSize: "13px", cursor: "pointer",
                        transition: "all 0.2s ease"
                    }}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Apply Tab */}
            {activeTab === "apply" && (
                <div style={{ maxWidth: "640px" }}>
                    <GlassCard title="New Leave Request" subtitle="Complete the form below">
                        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

                            {statusMsg && (
                                <div style={{
                                    padding: "14px 18px", borderRadius: "12px",
                                    background: statusMsg.type === "success" ? "rgba(48,209,88,0.1)" : "rgba(255,69,58,0.1)",
                                    border: `1px solid ${statusMsg.type === "success" ? "rgba(48,209,88,0.3)" : "rgba(255,69,58,0.3)"}`,
                                    color: statusMsg.type === "success" ? "#30d158" : "#ff453a",
                                    fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px"
                                }}>
                                    {statusMsg.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />}
                                    {statusMsg.text}
                                </div>
                            )}

                            <div>
                                <label style={labelStyle}>Leave Type</label>
                                <select className="glass-input" value={leaveType} onChange={e => setLeaveType(e.target.value)} style={inputStyle}>
                                    {["Casual", "Sick", "Earned", "Maternity", "Paternity", "Bereavement", "Unpaid"].map(t => <option key={t} value={t}>{t} Leave</option>)}
                                </select>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                <div>
                                    <label style={labelStyle}>From Date</label>
                                    <input type="date" className="glass-input" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>To Date</label>
                                    <input type="date" className="glass-input" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Reason for Leave</label>
                                <textarea
                                    className="glass-input" value={reason} onChange={e => setReason(e.target.value)}
                                    placeholder="Briefly describe the reason for your leave request..."
                                    style={{ ...inputStyle, height: "110px", resize: "none" }}
                                />
                            </div>

                            <button className="apple-btn" onClick={handleSubmit} style={{ padding: "14px", fontSize: "14px", fontWeight: "700" }}>
                                <FaCalendarPlus style={{ marginRight: "8px" }} />
                                Submit Leave Request
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Status Tab */}
            {activeTab === "status" && (
                <GlassCard title="My Leave History" subtitle="All requests submitted by you">
                    <div style={{ overflowX: "auto", marginTop: "16px" }}>
                        {leaveList.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "50px 0", color: "var(--text-tertiary)" }}>
                                <FaListUl size={40} style={{ opacity: 0.15, marginBottom: "14px" }} />
                                <p>No leave requests submitted yet.</p>
                            </div>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                                        {["Type", "From", "To", "Days", "Reason", "Status"].map(h => (
                                            <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: "var(--text-tertiary)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaveList.map((l: any) => (
                                        <tr key={l.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                            <td style={{ padding: "14px", fontWeight: "600" }}>{l.leave_type}</td>
                                            <td style={{ padding: "14px", color: "var(--text-secondary)" }}>{l.start_date}</td>
                                            <td style={{ padding: "14px", color: "var(--text-secondary)" }}>{l.end_date}</td>
                                            <td style={{ padding: "14px", fontWeight: "700" }}>{l.total_days || 0}d</td>
                                            <td style={{ padding: "14px", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.reason}>{l.reason}</td>
                                            <td style={{ padding: "14px" }}>{getStatusPill(l.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </GlassCard>
            )}

            {/* Balance Tab */}
            {activeTab === "balance" && (
                <div style={{ maxWidth: "700px" }}>
                    <GlassCard title="Leave Balance" subtitle="Remaining entitlement for this year">
                        {!balances ? (
                            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-tertiary)" }}>
                                Loading your leave balance...
                            </div>
                        ) : (
                            <>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginTop: "20px" }}>
                                {[
                                    { type: "Casual", total: 24, left: balances.casual_leave, color: "#0a84ff" },
                                    { type: "Sick", total: 15, left: balances.sick_leave, color: "#30d158" },
                                    { type: "Earned", total: 30, left: balances.earned_leave, color: "#bf5af2" },
                                    { type: "Maternity", total: 90, left: balances.maternity_leave || 0, color: "#ff9f0a" },
                                    { type: "Paternity", total: 15, left: balances.paternity_leave || 0, color: "#007aff" },
                                    { type: "Bereavement", total: 5, left: balances.bereavement_leave || 0, color: "#ff453a" },
                                ].map(b => (
                                    <div key={b.type} style={{
                                        padding: "18px", borderRadius: "16px",
                                        background: "rgba(255,255,255,0.03)",
                                        border: `1px solid var(--border-light)`,
                                        borderTop: `3px solid ${b.color}`,
                                        textAlign: "center"
                                    }}>
                                        <div style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)" }}>{b.left || 0}</div>
                                        <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "4px 0" }}>{b.type}</div>
                                        <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Available</div>
                                        <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", marginTop: "10px" }}>
                                            <div style={{ height: "100%", width: `${Math.max(0, (parseFloat(b.left as string || "0") / b.total) * 100 || 0)}%`, background: b.color, borderRadius: "2px" }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: "20px", padding: "16px", borderRadius: "14px", background: "rgba(255,69,58,0.06)", border: "1px solid rgba(255,69,58,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontWeight: "600", color: "var(--text-secondary)", fontSize: "14px" }}>Total Days Used This Year</span>
                                <span style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>{balances.total_used || 0}</span>
                            </div>
                            </>
                        )}
                    </GlassCard>
                </div>
            )}
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: "block", marginBottom: "8px", fontSize: "12px",
    fontWeight: "700", color: "var(--text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.5px"
};

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--border-light)",
    borderRadius: "14px", color: "var(--text-primary)",
    fontSize: "14px", outline: "none",
    boxSizing: "border-box" as const
};
