import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getMyPayslips } from "../../services/employeeService";
import { FaFileInvoiceDollar, FaRegSmile, FaDownload, FaChartLine, FaShieldAlt } from "react-icons/fa";

export default function MyPayslips() {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayslips = async () => {
      try {
        const data = await getMyPayslips();
        setPayslips(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load payslips:", e);
      } finally {
        setLoading(false);
      }
    };
    loadPayslips();
  }, []);

  const handleDownload = (id: string, month: string) => {
      alert(`Downloading payslip for ${month}...`);
      // In production, this would be a URL to a PDF
  };

  return (
    <div className="dashboard-container">
      <Header role="Employee" title="Financial Statements" />

      <div style={{ marginTop: "35px", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Monthly Payslips</h1>
        <p className="subtitle">Securely view and download your verified salary records</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <GlassCard title="Payslip Repository" subtitle="Historical salary slips">
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading records...</div>
            ) : payslips.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                    <FaRegSmile size={32} style={{ opacity: 0.2, marginBottom: '15px' }} />
                    <p>No payslips generated yet for the current financial year.</p>
                </div>
            ) : payslips.map(ps => (
                <div key={ps.id} style={itemStyle}>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{ps.month} {ps.year}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Net Pay: ₹{ps.net_amount.toLocaleString('en-IN')}</div>
                    </div>
                    <button style={actionBtnStyle} onClick={() => handleDownload(ps.id, ps.month)}>
                        <FaDownload /> Download PDF
                    </button>
                </div>
            ))}
          </div>
        </GlassCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Tax & Compliance" subtitle="Annual summary">
             <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#30d158' }}>
                    <FaShieldAlt /> <span style={{ fontSize: '13px', fontWeight: '600' }}>TDS Fully Compliant</span>
                </div>
                <button className="apple-btn" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '12px' }}>
                    View Tax Form 16
                </button>
             </div>
          </GlassCard>

          <GlassCard title="Earnings Trend" subtitle="Yearly projection">
             <div style={{ textAlign: 'center', padding: '20px' }}>
                <FaChartLine size={48} style={{ color: 'var(--accent-blue)', opacity: 0.3 }} />
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '10px' }}>Earnings trends will be calculated after 3 months of salary history.</p>
             </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

const itemStyle: React.CSSProperties = {
    padding: '16px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-light)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const actionBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '10px',
    border: 'none',
    background: 'rgba(14, 165, 233, 0.15)',
    color: '#0ea5e9',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer'
};
