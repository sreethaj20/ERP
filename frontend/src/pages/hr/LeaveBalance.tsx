import React, { useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getEmployees, updateEmployeeLeaveBalance } from "../../utils/storage";

export default function LeaveBalance() {
  const [empId, setEmpId] = useState("");
  const [leaveType, setLeaveType] = useState("casual");
  const [totalDays, setTotalDays] = useState("");
  const [employees, setEmployees] = useState(getEmployees());

  const handleAllocate = () => {
    if (!empId || !totalDays) {
      alert("Please fill all fields");
      return;
    }
    
    updateEmployeeLeaveBalance(empId, { [leaveType]: parseInt(totalDays) });
    setEmployees(getEmployees());
    setEmpId("");
    setTotalDays("");
    alert("Leave balance allocated successfully");
  };

  return (
    <div className="dashboard-container">
      <Header role="HR" title="Leave Quota Management" />

      <div style={{ marginTop: "35px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Leave Balance Allocation</h1>
        <div className="subtitle">Set and manage annual leave quotas for employees</div>
      </div>

      <div className="grid-3" style={{ marginTop: "20px" }}>
        <GlassCard title="Allocate Quota" subtitle="Assign leave types">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select 
              value={empId} 
              onChange={(e) => setEmpId(e.target.value)} 
              style={inputStyle}
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
              ))}
            </select>

            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} style={inputStyle}>
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="earned">Earned Leave</option>
              <option value="maternity">Maternity Leave</option>
              <option value="paternity">Paternity Leave</option>
              <option value="bereavement">Bereavement Leave</option>
            </select>

            <input
              placeholder="Total Days (e.g. 12)"
              type="number"
              value={totalDays}
              onChange={(e) => setTotalDays(e.target.value)}
              style={inputStyle}
            />

            <button style={btnStyle} onClick={handleAllocate}>Update Balance</button>
          </div>
        </GlassCard>

        <GlassCard title="Employee Quotas" subtitle="Current leave status" style={{ gridColumn: 'span 2' }}>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left', color: 'var(--text-tertiary)' }}>
                  <th style={{ padding: '12px 8px' }}>Employee</th>
                  <th style={{ padding: '12px 8px' }}>Casual</th>
                  <th style={{ padding: '12px 8px' }}>Sick</th>
                  <th style={{ padding: '12px 8px' }}>Earned</th>
                  <th style={{ padding: '12px 8px' }}>Maternity</th>
                  <th style={{ padding: '12px 8px' }}>Paternity</th>
                  <th style={{ padding: '12px 8px' }}>Berev.</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const b = emp.leave_balances || { casual: 0, sick: 0, earned: 0, maternity: 0 };
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: '600' }}>{emp.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{emp.id}</div>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--accent-blue)' }}>{b.casual}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--accent-orange)' }}>{b.sick}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--accent-green)' }}>{b.earned}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--accent-purple)' }}>{b.maternity}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--accent-blue)' }}>{b.paternity || 0}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--accent-red)' }}>{b.bereavement || 0}</td>
                    </tr>
                  );
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)' }}>
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.4)",
  color: "white",
  marginBottom: "12px",
};

const btnStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "none",
  background: "#00BFFF",
  color: "white",
  fontWeight: "600",
  cursor: "pointer",
};
