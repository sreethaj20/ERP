import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getMyLeaveBalance } from "../../services/employeeService";
import { getLeaves, getMyEmployee, refreshLeaves } from "../../utils/storage";

export default function LeaveBalanceView() {
  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getMyLeaveBalance();
        setBalances(data);
      } catch (error) {
        console.error("Error fetching leave balance:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="dashboard-container">
      <Header role="Employee" title="Leave Balances" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Leave Quota</h1>
        <p className="subtitle">Your remaining leave entitlement for the current year</p>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-secondary)" }}>Loading balances...</div>
      ) : balances ? (
        <div className="grid-3">
          <GlassCard title="Casual Leave" subtitle="Annual Balance">
            <h2 style={balanceStyle}>{balances.casual_leave} Days Left</h2>
          </GlassCard>
  
          <GlassCard title="Sick Leave" subtitle="Annual Balance">
            <h2 style={balanceStyle}>{balances.sick_leave} Days Left</h2>
          </GlassCard>
  
          <GlassCard title="Earned Leave" subtitle="Annual Balance">
            <h2 style={balanceStyle}>{balances.earned_leave} Days Left</h2>
          </GlassCard>
  
          <GlassCard title="Maternity Leave" subtitle="Special Category">
            <h2 style={balanceStyle}>{balances.maternity_leave} Days Left</h2>
          </GlassCard>

          <GlassCard title="Paternity Leave" subtitle="Special Category">
            <h2 style={balanceStyle}>{balances.paternity_leave} Days Left</h2>
          </GlassCard>

          <GlassCard title="Bereavement" subtitle="Special Category">
            <h2 style={balanceStyle}>{balances.bereavement_leave} Days Left</h2>
          </GlassCard>
  
          <GlassCard title="Used Leaves" subtitle="Year to date">
            <h2 style={{ ...balanceStyle, color: '#ff9f0a' }}>{balances.total_used} Days</h2>
          </GlassCard>
  
          <GlassCard title="Total Available" subtitle="Combined Quota">
            <h2 style={{ ...balanceStyle, color: '#30d158' }}>
                {(
                  parseFloat(balances.casual_leave || 0) + 
                  parseFloat(balances.sick_leave || 0) + 
                  parseFloat(balances.earned_leave || 0) +
                  parseFloat(balances.maternity_leave || 0) +
                  parseFloat(balances.paternity_leave || 0) +
                  parseFloat(balances.bereavement_leave || 0)
                ).toFixed(1)} Days
            </h2>
          </GlassCard>
        </div>
      ) : (
        <div style={{ color: "var(--text-secondary)" }}>No balance information found.</div>
      )}
    </div>
  );
}

const balanceStyle: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: "700",
  marginTop: "20px",
  color: "var(--accent-blue)",
};
