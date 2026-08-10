import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getAllLeaves, approveLeave } from "../../services/managerService";
import { applyLeave, getMyLeaveBalance, getMyLeaves } from "../../services/employeeService";
import { FaCheck, FaTimes, FaCalendarPlus, FaClipboardList, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaSyncAlt, FaListUl } from "react-icons/fa";
import { getEmployees } from "../../utils/storage";
import webSocketService from "../../services/websocketService";

export default function LeaveApprovals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "apply" ? "apply" : "approvals";
  const [activeMainTab, setActiveMainTab] = useState<"approvals" | "apply">(initialTab);

  // --- Approvals Pipeline State ---
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Apply My Leave State ---
  const userId = sessionStorage.getItem("userId") || "";
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [myBalances, setMyBalances] = useState<any>(null);
  const [myLoading, setMyLoading] = useState(false);
  const [leaveType, setLeaveType] = useState("Casual/Earned");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      console.error("Failed to fetch approvals data:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyData = async () => {
    setMyLoading(true);
    try {
      const [balanceData, leavesData] = await Promise.all([
        getMyLeaveBalance(),
        getMyLeaves()
      ]);
      setMyBalances(balanceData);
      setMyLeaves(Array.isArray(leavesData) ? leavesData : []);
    } catch (e) {
      console.error("Failed to fetch my leave data:", e);
    } finally {
      setMyLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMyData();

    // Subscribe to real-time leave updates
    const handleRealtimeUpdate = (msg: any) => {
      if (msg.event === "data_updated" && (msg.data.type === "leaves" || msg.data.type === "attendance")) {
        console.log("[WS] Live data refresh from dashboard:", msg);
        fetchData();
        fetchMyData();
      }
    };
    webSocketService.on("data_updated", handleRealtimeUpdate);

    return () => {
      webSocketService.off("data_updated", handleRealtimeUpdate);
    };
  }, []);

  const handleTabChange = (tab: "approvals" | "apply") => {
    setActiveMainTab(tab);
    setSearchParams(tab === "apply" ? { tab: "apply" } : {});
  };

  const handleAction = async (leaveId: string, action: 'approve' | 'reject') => {
    try {
      await approveLeave(leaveId, action);
      fetchData();
    } catch (error: any) {
      alert(error?.response?.data?.detail || "Action failed");
    }
  };

  const handleMyLeaveSubmit = async () => {
    if (!fromDate || !toDate || !reason || reason.trim().length < 3) {
      setStatusMsg({
        type: "error",
        text: !reason ? "Please fill in all fields." : "Reason must be at least 3 characters long."
      });
      return;
    }

    if (!userId) {
      setStatusMsg({ type: "error", text: "User session not found." });
      return;
    }

    try {
      await applyLeave({
        employee_id: userId,
        leave_type: leaveType,
        start_date: fromDate,
        end_date: toDate,
        total_days: 0,
        reason: reason.trim()
      });

      setStatusMsg({ type: "success", text: "Manager leave request submitted successfully!" });
      setFromDate("");
      setToDate("");
      setReason("");
      setLeaveType("Casual/Earned");
      fetchMyData();
    } catch (e: any) {
      let errorText = "Submission failed.";
      const detail = e?.response?.data?.detail;
      if (typeof detail === "string") errorText = detail;
      else if (Array.isArray(detail)) errorText = detail.map((err: any) => err.msg).join(", ");
      else if (detail?.msg) errorText = detail.msg;

      setStatusMsg({ type: "error", text: errorText });
    }
  };

  const isPending = (status: string) => status === 'pending_manager' || status === 'pending';

  const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
    pending_tl: { color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)', label: '⏳ Forwarded to Manager' },
    pending_manager: { color: '#0a84ff', bg: 'rgba(10,132,255,0.12)', label: '⏳ Awaiting My Approval' },
    pending: { color: '#0a84ff', bg: 'rgba(10,132,255,0.12)', label: '⏳ Pending Approval' },
    approved: { color: '#30d158', bg: 'rgba(48,209,88,0.12)', label: '✓ Approved' },
    rejected: { color: '#ff453a', bg: 'rgba(255,69,58,0.12)', label: '✕ Rejected' },
  };

  const ss = (status: string) => statusStyles[status] || { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)', label: status };

  const roleColor: Record<string, string> = {
    hr: '#0a84ff', recruiter: '#bf5af2', teamleader: '#ff9f0a',
    itdepartment: '#64d2ff', it: '#64d2ff', employee: '#30d158', manager: '#bf5af2'
  };

  const getAvailableBalance = (type: string) => {
    if (!myBalances) return 0;
    const lower = type.toLowerCase().trim();
    if (lower.includes("casual") || lower.includes("earned")) {
      const casualVal = parseFloat(String(myBalances["casual_leave"] ?? myBalances["casual"] ?? 0));
      const earnedVal = parseFloat(String(myBalances["earned_leave"] ?? myBalances["earned"] ?? 0));
      const sum = (isNaN(casualVal) ? 0 : casualVal) + (isNaN(earnedVal) ? 0 : earnedVal);
      return isNaN(sum) ? 0 : sum;
    }
    const keyWithLeave = lower.endsWith("_leave") ? lower : `${lower}_leave`;
    const keyWithoutLeave = lower.replace(/_leave$/, "");
    const val = parseFloat(String(myBalances[keyWithLeave] ?? myBalances[keyWithoutLeave] ?? 0));
    return isNaN(val) ? 0 : val;
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-secondary)",
    marginBottom: "6px",
    display: "block"
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--border-light)",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none"
  };

  return (
    <div className="dashboard-container">
      <Header role="Manager" title="Leave Portal" />

      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "4px" }}>Leave Hub</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            {activeMainTab === "approvals"
              ? "Approve or reject leave requests from staff roles across departments"
              : "Apply for personal manager leave and manage your entitlement"}
          </p>
        </div>

        <button
          className="apple-btn-secondary"
          onClick={() => { fetchData(); fetchMyData(); }}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", fontSize: "13px" }}
        >
          <FaSyncAlt size={14} className={loading || myLoading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Main Mode Tabs Switcher */}
      <div style={{
        display: "flex",
        gap: "10px",
        marginBottom: "28px",
        background: "rgba(255,255,255,0.03)",
        padding: "6px",
        borderRadius: "16px",
        border: "1px solid var(--border-light)",
        width: "fit-content"
      }}>
        <button
          onClick={() => handleTabChange("approvals")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 22px",
            borderRadius: "12px",
            border: "none",
            background: activeMainTab === "approvals" ? "var(--accent-blue)" : "transparent",
            color: activeMainTab === "approvals" ? "#fff" : "var(--text-secondary)",
            fontWeight: "700",
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <FaClipboardList size={14} /> Organization Approvals
        </button>

        <button
          onClick={() => handleTabChange("apply")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 22px",
            borderRadius: "12px",
            border: "none",
            background: activeMainTab === "apply" ? "var(--accent-blue)" : "transparent",
            color: activeMainTab === "apply" ? "#fff" : "var(--text-secondary)",
            fontWeight: "700",
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <FaCalendarPlus size={14} /> Apply My Leave
        </button>
      </div>

      {/* ================= APPROVALS TAB ================= */}
      {activeMainTab === "approvals" && (
        <>
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
                        <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allLeaves.map((leave, i) => {
                      const sStatus = (leave.status || '').toLowerCase();
                      const s = statusStyles[sStatus] || { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)', label: leave.status };
                      const emp = employees.find((e: any) => String(e.id) === String(leave.employee_id) || String(e.employee_id) === String(leave.employee_id));
                      const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : leave.employee_name || 'Unknown User';
                      const empDisplayId = emp ? emp.employee_id : `ID: ${leave.employee_id}`;
                      const empRole = emp?.designation || emp?.role || leave.role || 'employee';
                      const rColor = roleColor[empRole.toLowerCase().replace(/[\s_]+/g, '')] || '#8e8e93';

                      const fromD = leave.start_date;
                      const toD = leave.end_date;
                      const days = leave.total_days;
                      const showAction = sStatus === 'pending_manager' || sStatus === 'pending';

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{empName}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{empDisplayId}</div>
                          </td>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', color: rColor, background: `${rColor}18`, textTransform: 'capitalize', whiteSpace: 'nowrap', display: 'inline-block' }}>
                              {empRole}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: 'var(--accent-blue)', fontWeight: '600', whiteSpace: 'nowrap' }}>{leave.leave_type}</td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {fromD} → {toD}
                          </td>
                          <td style={{ padding: '12px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{days}d</td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)', minWidth: '180px', maxWidth: '300px', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.4' }} title={leave.reason}>{leave.reason || '—'}</td>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: s.bg, color: s.color, whiteSpace: 'nowrap', display: 'inline-block' }}>
                              {s.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                            {showAction ? (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                <button
                                  onClick={() => handleAction(leave.leave_id || leave.id, 'approve')}
                                  style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'rgba(48,209,88,0.15)', color: '#30d158', fontWeight: '700', cursor: 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}
                                >
                                  <FaCheck size={10} /> Approve
                                </button>
                                <button
                                  onClick={() => handleAction(leave.leave_id || leave.id, 'reject')}
                                  style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'rgba(255,69,58,0.15)', color: '#ff453a', fontWeight: '700', cursor: 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}
                                >
                                  <FaTimes size={10} /> Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
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
        </>
      )}

      {/* ================= APPLY MY LEAVE TAB ================= */}
      {activeMainTab === "apply" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Info Banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "14px 18px", borderRadius: "14px",
            background: "rgba(10,132,255,0.08)", border: "1px solid rgba(10,132,255,0.2)",
            fontSize: "13px", color: "var(--accent-blue)"
          }}>
            <FaInfoCircle size={16} />
            <span>As a Manager, your leave requests are logged directly in the system pipeline and auto-routed for executive balance accounting.</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
            {/* Form */}
            <GlassCard title="Apply For Leave" subtitle="Submit your absence request">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "15px" }}>
                {statusMsg && (
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: statusMsg.type === 'success' ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)',
                    color: statusMsg.type === 'success' ? '#30d158' : '#ff453a',
                    border: `1px solid ${statusMsg.type === 'success' ? 'rgba(48,209,88,0.25)' : 'rgba(255,69,58,0.25)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px'
                  }}>
                    {statusMsg.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />} {statusMsg.text}
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Leave Category</label>
                  <select className="glass-input" value={leaveType} onChange={(e) => setLeaveType(e.target.value)} style={inputStyle}>
                    <option value="Casual/Earned">Casual/Earned Leave ({getAvailableBalance("Casual/Earned")} left)</option>
                    <option value="Sick">Sick Leave ({getAvailableBalance("Sick")} left)</option>
                    <option value="Maternity">Maternity Leave ({getAvailableBalance("Maternity")} left)</option>
                    <option value="Paternity">Paternity Leave ({getAvailableBalance("Paternity")} left)</option>
                    <option value="Bereavement">Bereavement Leave ({getAvailableBalance("Bereavement")} left)</option>
                    <option value="Unpaid">Unpaid Leave (Unlimited)</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={labelStyle}>Start Date</label>
                    <input type="date" className="glass-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>End Date</label>
                    <input type="date" className="glass-input" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    Reason for Leave <span style={{ color: 'var(--accent-blue)', fontSize: '11px' }}>(min 3 chars)</span>
                  </label>
                  <textarea
                    className="glass-input"
                    placeholder="Brief description of absence (minimum 3 characters required)..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ ...inputStyle, height: "100px", resize: "none" }}
                  />
                  {reason && reason.trim().length < 3 && (
                    <div style={{ fontSize: '11px', color: '#ff453a', marginTop: '4px' }}>
                      Reason too short ({reason.trim().length}/3)
                    </div>
                  )}
                </div>

                <button className="apple-btn" onClick={handleMyLeaveSubmit} style={{ height: "48px", marginTop: "8px", fontWeight: "700" }}>
                  <FaCalendarPlus style={{ marginRight: "8px" }} /> Submit Leave Request
                </button>
              </div>
            </GlassCard>

            {/* Quota Balances */}
            <GlassCard title="Leave Quota" subtitle="Your remaining leave entitlement">
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                {[
                  { type: "Casual/Earned", left: getAvailableBalance("Casual/Earned"), total: 12, color: "#0a84ff" },
                  { type: "Sick", left: getAvailableBalance("Sick"), total: 12, color: "#30d158" },
                  { type: "Maternity", left: getAvailableBalance("Maternity"), total: 90, color: "#bf5af2" },
                  { type: "Paternity", left: getAvailableBalance("Paternity"), total: 15, color: "#64d2ff" },
                  { type: "Bereavement", left: getAvailableBalance("Bereavement"), total: 5, color: "#ff9f0a" },
                ].map(b => (
                  <div key={b.type} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{b.type} Leave</span>
                      <span style={{ color: b.color, fontWeight: '700' }}>{b.left} / {b.total} days</span>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, (b.left / b.total) * 100))}%`, background: b.color, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* History */}
          <GlassCard title="My Submitted Leave History" subtitle="Track approval state of your leave applications">
            <div style={{ overflowX: "auto", marginTop: "16px" }}>
              {myLeaves.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>
                  <FaListUl size={36} style={{ opacity: 0.15, marginBottom: "12px" }} />
                  <p>No personal leave requests submitted yet.</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                      {["Type", "From", "To", "Days", "Reason", "Status"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-tertiary)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.map((l: any) => (
                      <tr key={l.id || l.leave_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "12px", fontWeight: "600", color: "var(--accent-blue)" }}>{l.leave_type}</td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{l.start_date}</td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{l.end_date}</td>
                        <td style={{ padding: "12px", fontWeight: "700" }}>{l.total_days || 0}d</td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)", minWidth: "200px", maxWidth: "320px", wordBreak: "break-word", whiteSpace: "normal", lineHeight: "1.4" }} title={l.reason}>{l.reason || "—"}</td>
                        <td style={{ padding: "12px" }}>
                          <span style={{
                            padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "700",
                            background: ss((l.status || "").toLowerCase()).bg,
                            color: ss((l.status || "").toLowerCase()).color
                          }}>
                            {ss((l.status || "").toLowerCase()).label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

