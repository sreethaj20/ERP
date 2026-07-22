import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getPayrollHistory, refreshPayrollHistory } from "../../utils/storage";
import { FaMoneyBillWave, FaCheckCircle, FaExclamationTriangle, FaExternalLinkAlt, FaCreditCard } from "react-icons/fa";
import api from "../../api/apiClient";

export default function PayrollPreparation() {
  const [empId, setEmpId] = useState("");
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [payrollResult, setPayrollResult] = useState<any>(null);
  const [pendingPayroll, setPendingPayroll] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
    // Listen for WebSocket updates
    const handleSync = () => loadHistory();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, []);

  const loadHistory = async () => {
    const data = await refreshPayrollHistory();
    setPendingPayroll(Array.isArray(data) ? data : []);
  };

  const handleCalculate = async () => {
    if (!empId || !month) return alert("Enter Emp ID and Month (YYYY-MM)");
    setLoading(true);
    try {
      const response = await api.get(`hr/payroll/calculate?emp_id=${empId}&month=${month}`);
      setPayrollResult(response.data);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Employee not found or data missing");
    } finally {
      setLoading(false);
    }
  };

  const handleDisburse = async (payrollId: number) => {
    if (!window.confirm("Authorize instant salary disbursement via Razorpay API?")) return;
    try {
        const response = await api.post('hr/payroll/disburse', { payroll_id: payrollId });
        alert(`🚀 Disbursement Initiated!\nTransaction: ${response.data.transaction_id}`);
        loadHistory();
    } catch (err: any) {
        console.error(err);
        alert(`Error: ${err.response?.data?.detail || "Disbursement failed"}`);
    }
  };

  const handleSubmit = async () => {
    if (!payrollResult) return;
    try {
      const response = await api.post('hr/payroll/submit', payrollResult);
      alert(`✅ Payroll Record Finalized!\nTransaction ID: ${response.data.transaction_id}\n\nYou can now initiate disbursement via Razorpay.`);
      setPayrollResult(null);
      loadHistory();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Submission failed");
    }
  };

  const handlePayment = async (amount: number, empId: string) => {
    try {
      // 1. Create Order on Backend via standard Axios
      const orderRes = await api.post('payments/orders', {
        amount: amount,
        currency: 'INR',
        notes: { employee_id: empId, module: 'payroll' }
      });

      const order = orderRes.data;

      // 2. Open Razorpay Checkout
      const options = {
        key: 'rzp_test_YOUR_KEY_ID', // Ideal to fetch from backend configuration
        amount: order.amount,
        currency: order.currency,
        name: "Mercure HRMS",
        description: `Salary Disbursement for ${empId}`,
        order_id: order.id,
        handler: async function (response: any) {
          // 3. Verify Payment on Backend
          try {
            await api.post('payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            alert("✅ Payment Successful and Verified!");
            loadHistory();
          } catch (verifyErr) {
            alert("❌ Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: "HR Admin",
          email: "hr@mercure.com"
        },
        theme: {
          color: "#007AFF"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert("Payment Initiation Failed: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleRazorpayRedirect = () => {
    alert("Use the individual payment buttons or contact IT for Bulk Payout API keys.");
  };

  return (
    <div className="dashboard-container">
      <Header role="HR" title="Payroll Engine" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Payroll Preparation</h1>
        <p className="subtitle">Execute salary computations and disbursement workflows</p>
      </div>

      <div className="grid-3">
        {/* Entry Form */}
        <GlassCard title="Compute Salary" subtitle="Generate record for approval">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
            <input placeholder="Employee ID (e.g. EMP001)" className="apple-input" value={empId} onChange={(e) => setEmpId(e.target.value)} />
            <input placeholder="Billing Month (YYYY-MM)" className="apple-input" value={month} onChange={(e) => setMonth(e.target.value)} />
            
            {payrollResult && (
               <div style={{ padding: '12px', background: 'rgba(48,209,88,0.05)', borderRadius: '10px', border: '1px solid rgba(48,209,88,0.2)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>Computed Net: ₹{payrollResult.net_payable}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Days Present: {payrollResult.attendance_count} | Base: ₹{payrollResult.base_salary}
                  </div>
               </div>
            )}

            <button 
                onClick={payrollResult ? handleSubmit : handleCalculate}
                className="apple-btn" 
                style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: payrollResult ? '#30d158' : 'var(--accent-blue)', color: 'white' }}
                disabled={loading}
            >
              <FaMoneyBillWave /> {loading ? "Generating..." : (payrollResult ? "Finalize & Submit" : "Calculate & Review")}
            </button>
          </div>
        </GlassCard>

        {/* Status List */}
        <GlassCard title="Processing Status" subtitle="In-flight payroll cycles" style={{ gridColumn: "span 2" }}>
          <div style={{ marginTop: "10px", maxHeight: '300px', overflowY: 'auto' }}>
            {pendingPayroll.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', fontSize: '14px' }}>No active payroll cycles found.</div>
            ) : pendingPayroll.map(pay => (
              <div key={pay.id} style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "15px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "12px",
                marginBottom: "10px",
                border: "1px solid var(--border-light)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                    <div style={{ fontSize: "14px", fontWeight: "600" }}>{pay.employee_id} • {pay.month}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Ref: {pay.transaction_id || pay.id} • {new Date(pay.generated_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--accent-green)" }}>₹{pay.net_salary}</div>
                    <div style={{
                        fontSize: "10px",
                        color: pay.payment_status === "Success" ? "var(--accent-green)" : (pay.payment_status === "Processing" ? "var(--accent-blue)" : "var(--accent-orange)"),
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        justifyContent: "flex-end",
                        marginTop: "4px"
                    }}>
                        {pay.payment_status === "Success" ? <FaCheckCircle /> : <FaExclamationTriangle />} {pay.payment_status || "Unpaid"}
                    </div>
                    </div>
                </div>
                
                <div style={{ display: "flex", gap: "15px", fontSize: "10px", color: "var(--text-tertiary)", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px" }}>
                    <span>Basic: ₹{pay.basic_salary}</span>
                    <span>HRA: ₹{pay.hra}</span>
                    <span>Alw: ₹{pay.allowances}</span>
                    <span style={{ color: "var(--accent-red)" }}>Ded: ₹{pay.deductions}</span>
                </div>

                {pay.status !== "Paid" && (
                    <button 
                        className="apple-btn" 
                        style={{ height: '30px', padding: '0 12px', fontSize: '11px', background: 'var(--accent-blue)', color: 'white', alignSelf: 'flex-end' }}
                        onClick={() => handlePayment(parseFloat(pay.net_salary), pay.employee_id)}
                    >
                         Disburse via Razorpay
                    </button>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid-3" style={{ marginTop: "30px" }}>
        <GlassCard title="Disbursement" subtitle="Razorpay PayOuts Hub">
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: '0 0 10px var(--accent-blue)' }}></div>
                GATEWAY CONNECTED
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                Execute safe, instant salary transfers to all employee bank accounts via API-linked Payouts.
            </p>
          </div>
          <button className="apple-btn" style={{ background: "linear-gradient(135deg, #3395FF, #0070E0)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }} onClick={handleRazorpayRedirect}>
            <FaCreditCard size={14} /> Process Bulk Payout
          </button>
        </GlassCard>

        <GlassCard title="Tax Compliance" subtitle="PF, ESI & TDS filings">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
             <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}><span>PF Deductions</span> <span style={{ color: 'var(--accent-blue)' }}>Calculated</span></div>
             <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}><span>Professional Tax</span> <span style={{ color: 'var(--accent-blue)' }}>Calculated</span></div>
             <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}><span>TDS Compliance</span> <span style={{ color: 'var(--accent-orange)' }}>Pending Review</span></div>
          </div>
        </GlassCard>
        
        <GlassCard title="Analytics" subtitle="Salary Trends">
           <div style={{ height: '100px', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              {[40, 70, 45, 90, 65, 80].map((h, i) => (
                <div key={i} style={{ flex: 1, background: 'rgba(100,210,255,0.2)', height: `${h}%`, borderRadius: '4px' }}></div>
              ))}
           </div>
           <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'center' }}>Monthly Outflow Projection</div>
        </GlassCard>
      </div>
    </div>
  );
}
