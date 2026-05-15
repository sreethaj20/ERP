import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaCalendarPlus, FaInfoCircle, FaCheckCircle } from "react-icons/fa";
import { applyLeave, getMyLeaveBalance } from "../../services/employeeService";
// import { useAuth } from "../../context/AuthContext";

export default function ApplyLeave() {
  const userId = sessionStorage.getItem("userId");
  const [leaveType, setLeaveType] = useState("Casual");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [balancesData, setBalancesData] = useState<any>(null);

  const fetchData = async () => {
    try {
        const data = await getMyLeaveBalance();
        setBalancesData(data);
    } catch (e) {
        console.error("Failed to fetch balances:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getAvailableBalance = (type: string) => {
    if (!balancesData) return 0;
    const key = `${type.toLowerCase()}_leave`;
    return balancesData[key] || 0;
  };

  const balances = [
    { type: "Casual", available: getAvailableBalance("Casual"), total: 12, color: "#0a84ff" },
    { type: "Sick", available: getAvailableBalance("Sick"), total: 10, color: "#ff453a" },
    { type: "Earned", available: getAvailableBalance("Earned"), total: 15, color: "#30d158" },
    { type: "Maternity", available: getAvailableBalance("Maternity"), total: 90, color: "#bf5af2" },
    { type: "Paternity", available: getAvailableBalance("Paternity"), total: 15, color: "#007aff" },
    { type: "Bereavement", available: getAvailableBalance("Bereavement"), total: 5, color: "#ff9f0a" },
  ];

  const handleLeaveSubmit = async () => {
    if (!fromDate || !toDate || !reason || reason.length < 3) {
      setStatusMsg({ type: 'error', text: !reason ? 'Please fill in all fields.' : 'Reason must be at least 3 characters long.' });
      return;
    }

    if (!userId) {
      setStatusMsg({ type: 'error', text: 'User session not found.' });
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
    const available = getAvailableBalance(leaveType);

    if (totalDays > available) {
      setStatusMsg({ 
        type: 'error', 
        text: `Insufficient balance! Requested ${totalDays} days, but only ${available} available.` 
      });
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
      // Reset form
      setFromDate("");
      setToDate("");
      setReason("");
      setLeaveType("Casual");
      fetchData(); // refresh balances
    } catch (e: any) {
      let errorText = "Submission failed.";
      const detail = e?.response?.data?.detail;
      if (typeof detail === "string") errorText = detail;
      else if (Array.isArray(detail)) errorText = detail.map((err: any) => err.msg).join(", ");
      else if (detail?.msg) errorText = detail.msg;

      setStatusMsg({ type: 'error', text: errorText });
    }
  };


  return (
    <div className="dashboard-container">
      <Header role="Employee" title="Time Off" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Apply Leave</h1>
        <p className="subtitle">Request absence and track approval status</p>
      </div>

      {statusMsg && (
        <div style={{
          padding: '15px',
          borderRadius: '12px',
          marginBottom: '20px',
          background: statusMsg.type === 'success' ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)',
          color: statusMsg.type === 'success' ? '#30d158' : '#ff453a',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <FaCheckCircle /> {statusMsg.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
        <GlassCard title="Leave Request" subtitle="Submission details">
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "15px" }}>
            <div style={inputGroup}>
              <label style={labelStyle}>Leave Category</label>
              <select className="apple-input" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                <option value="Casual">Casual Leave ({getAvailableBalance("Casual")} left)</option>
                <option value="Sick">Sick Leave ({getAvailableBalance("Sick")} left)</option>
                <option value="Earned">Earned Leave ({getAvailableBalance("Earned")} left)</option>
                <option value="Maternity">Maternity Leave ({getAvailableBalance("Maternity")} left)</option>
                <option value="Paternity">Paternity Leave ({getAvailableBalance("Paternity")} left)</option>
                <option value="Bereavement">Bereavement Leave ({getAvailableBalance("Bereavement")} left)</option>
                <option value="Unpaid">Unpaid Leave (Unlimited)</option>
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

            <button className="apple-btn" onClick={handleLeaveSubmit} style={{ height: "50px", marginTop: "10px" }}>
              <FaCheckCircle /> Submit Request
            </button>
          </div>
        </GlassCard>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <GlassCard title="Available Quota" subtitle="Current leave balances">
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
              {balances.map(b => (
                <div key={b.type} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ fontWeight: '600' }}>{b.type} Leave</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{b.available} Days Available</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(b.available / b.total) * 100}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard title="Fulfillment Policy" subtitle="Approval workflow">
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <FaInfoCircle color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span>Requests are routed to your immediate Team Lead for initial review.</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <FaInfoCircle color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span>HR finalization occurs within 24 hours of TL approval.</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

const inputGroup = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px"
};

const labelStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "var(--text-tertiary)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px"
};
