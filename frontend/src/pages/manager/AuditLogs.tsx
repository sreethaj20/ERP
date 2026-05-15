import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getActivities } from "../../utils/storage";
import { FaHistory, FaFileExport, FaSearch, FaShieldAlt, FaTerminal } from "react-icons/fa";

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await getActivities();
        setLogs(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load activities", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="dashboard-container">
      <Header role="Manager" title="Governance Ledger" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>System Audit Trails</h1>
        <p className="subtitle">Immutable ledger of administrative actions, security resets, and financial authorizations</p>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "30px" }}>
        {/* Main Audit Feed */}
        <GlassCard title="Transaction History" subtitle="Live cryptographic log feed">
          <div style={{ marginTop: "15px", display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Fetching system archives...</div>
            ) : (logs || []).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No activities logged yet.</div>
            ) : (logs || []).map((log) => (
              <div key={log.id} style={logRow}>
                <div style={{ flex: 0.1 }}>
                  <div style={{ ...sevDot, background: '#0a84ff' }} />
                </div>
                <div style={{ flex: 1.5 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>{log.message}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>Type: {log.type?.toUpperCase() || 'SYSTEM'}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Manager</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}</div>
                </div>
              </div>
            ))}
            <button className="apple-btn" style={{ width: '100%', marginTop: '10px', background: 'rgba(255,255,255,0.03)', fontSize: '12px' }}>
              Load Historical Archives (T-30 Days)
            </button>
          </div>
        </GlassCard>

        {/* Audit Search & Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Audit Constraints" subtitle="Filter by security metadata">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <div style={searchContainer}>
                <FaSearch color="var(--text-tertiary)" size={12} />
                <input placeholder="Search ID, User, or Action..." style={minimalInput} />
              </div>
              <select className="apple-input" style={{ fontSize: '12px', height: '40px' }}>
                <option>Current billing cycle (Feb)</option>
                <option>Previous cycle (Jan)</option>
                <option>Annual Governance Report</option>
              </select>
            </div>
          </GlassCard>

          <GlassCard title="Trust Verification" subtitle="Digital signature status">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
              <FaShieldAlt size={28} color="#0a84ff" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#30d158' }}>Ledger Intact</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Hash: 0x82...FA91-2026</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid-3">
        <GlassCard title="Security Pulse" subtitle="Incident response metrics">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <div style={pulseBox}>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>4</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Elevated Actions</div>
            </div>
            <div style={pulseBox}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#30d158' }}>0</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Breach Attempts</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Regulatory Export" subtitle="Compliance Documentation">
          <button className="apple-btn" style={{ width: '100%', gap: '10px' }}>
            <FaFileExport /> Export Signed PDF
          </button>
        </GlassCard>

        <GlassCard title="Terminal Access" subtitle="Low-level log extraction">
          <button className="apple-btn" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', gap: '10px' }}>
            <FaTerminal /> Open System CLI
          </button>
        </GlassCard>
      </div>
    </div>
  );
}

const pulseBox = {
  flex: 1, padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-light)', textAlign: 'center' as const
};

const logRow = {
  display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid var(--border-light)'
};

const sevDot = { width: '6px', height: '6px', borderRadius: '50%' };

const searchContainer = {
  display: 'flex', alignItems: 'center', gap: '10px', padding: '0 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid var(--border-light)'
};

const minimalInput = {
  background: 'none', border: 'none', color: 'white', fontSize: '13px', padding: '10px 0', width: '100%', outline: 'none'
};
