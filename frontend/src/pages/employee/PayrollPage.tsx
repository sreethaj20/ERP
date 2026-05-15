import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getDashboard } from "../../services/employeeService";
import { FaMoneyCheckAlt, FaCreditCard, FaHistory, FaCheckCircle, FaSpinner } from "react-icons/fa";

export default function PayrollPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await getDashboard();
        setData(d);
      } catch (e) {
        console.error("Failed to load payroll data:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePayrollPayment = () => {
    window.location.href = 'https://payroll.razorpay.com/login?redirect=/verify-2fa-otp?redirect=/dashboard';
  };

  return (
    <div className="dashboard-container">
      <Header role="Employee" title="Payroll & Remuneration" />

      <div style={{ marginTop: "35px", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Salary Hub</h1>
        <p className="subtitle">Secure portal for salary disbursements and financial records</p>
      </div>

      <div className="grid-3">
        {loading ? (
           <div style={{ textAlign: 'center', padding: '100px' }}><FaSpinner className="spin" /></div>
        ) : (
          <>
            <GlassCard title="Current Remuneration" subtitle="Last disbursement details">
              <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <FinRow label="Net Salary" value={`₹${data?.net_salary?.toLocaleString('en-IN') || '0'}`} color="#30d158" />
                <FinRow label="Cycle" value="Monthly" color="#0a84ff" />
                <FinRow label="Method" value="Direct Deposit" color="var(--text-tertiary)" />
                
                <button 
                  style={{ ...btnStyle, background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.2)' }} 
                  onClick={handlePayrollPayment}
                >
                  <FaCreditCard /> Access Razorpay Payroll
                </button>
              </div>
            </GlassCard>

            <GlassCard title="Compliance Status" subtitle="Tax & Deductions">
               <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                  <FinRow label="TDS" value="Deducted" color="#30d158" />
                  <FinRow label="PF / ESI" value="Processed" color="#30d158" />
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '10px' }}>
                    * All tax liability for this cycle has been remitted to authorities.
                  </div>
               </div>
            </GlassCard>

            <GlassCard title="Documents" subtitle="Available reports">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <button className="apple-btn" style={{ fontSize: '12px', background: 'rgba(255,255,255,0.03)' }}>
                    <FaHistory /> Payment History
                  </button>
                  <button className="apple-btn" style={{ fontSize: '12px', background: 'rgba(255,255,255,0.03)' }}>
                    <FaCheckCircle /> Tax Declaration
                  </button>
                </div>
            </GlassCard>
          </>
        )}
      </div>
    </div>
  );
}

const FinRow = ({ label, value, color }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontSize: '15px', fontWeight: '700', color }}>{value}</span>
  </div>
);

const btnStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "15px",
  padding: "12px",
  borderRadius: "12px",
  border: "none",
  background: "#0ea5e9",
  color: "white",
  fontWeight: "700",
  fontSize: '13px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  justifyContent: 'center',
  cursor: "pointer",
};
