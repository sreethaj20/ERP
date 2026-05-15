import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaTicketAlt, FaTools, FaCheckCircle, FaExclamationTriangle, FaDownload, FaDesktop, FaServer } from "react-icons/fa";

import { getWorkforce, getITTickets, getITAssets } from "../../services/managerService";

export default function ITTicketsView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
        setLoading(true);
        const [t, a, w] = await Promise.all([
            getITTickets(),
            getITAssets(),
            getWorkforce()
        ]);
        setTickets(t || []);
        setAssets(a || []);
        // Handle workforce object or array
        setEmployees(Array.isArray(w) ? w : (w?.employees || []));
    } catch (e) {
        console.error("IT Pulse Load Failed:", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => {
      window.removeEventListener('storage', loadData);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="dashboard-container">
      <Header role="Manager" title="Infrastucture Pulse" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>IT Operations Health</h1>
        <p className="subtitle">Managerial overview of system uptime, support ticketing, and hardware fulfillment</p>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: "1.8fr 1.2fr", gap: "24px", marginBottom: "30px" }}>
        {/* Main Ticket Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Global Ticket Overflow" subtitle="Cross-departmental system issues">
            <div style={{ marginTop: "15px" }}>
              {tickets.length > 0 ? (
                tickets.map((t: any) => (
                  <div key={t.id} style={ticketCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ ...statusIndicator, background: t.priority === 'High' ? '#ff453a' : t.priority === 'Medium' ? '#ff9f0a' : '#64d2ff' }} />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '700' }}>#{t.id}: {t.issue || t.subject}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Requester: {t.sender_name || t.emp_id} • Status: {t.status}</div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{(t.priority || 'Medium').toUpperCase()}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{t.date}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No active IT tickets found.</div>
              )}
            </div>
          </GlassCard>

          <GlassCard title="Hardware Provisioning Queue" subtitle="Manager-approved allocations">
            <div style={{ marginTop: "15px" }}>
              {employees.filter((e: any) => e.onboarding?.it_verification === 'pending').map((emp: any) => (
                <div key={emp.id} style={{ ...ticketCard, flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{emp.first_name} {emp.last_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Role: {(emp.active_status?.role_name || emp.active_status?.role_type || 'Unspecified').toUpperCase()}</div>
                  </div>
                    <div style={{ padding: '4px 8px', background: 'rgba(255,159,10,0.1)', color: '#ff9f0a', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}>PENDING VERIFICATION</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                    <AllocationStat label="Laptops" val={emp.onboarding?.hardware_allocation?.laptop_qty} />
                    <AllocationStat label="Phones" val={emp.onboarding?.hardware_allocation?.phone_qty} />
                    <AllocationStat label="Tablets" val={emp.onboarding?.hardware_allocation?.tablet_qty} />
                    <AllocationStat label="Monitors" val={emp.onboarding?.hardware_allocation?.monitor_qty} />
                  </div>

                  <div style={{ width: '100%' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-tertiary)', marginBottom: '8px' }}>ADD ACCESSORIES</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <AccessoryChip label="Mouse" />
                      <AccessoryChip label="Keyboard" />
                      <AccessoryChip label="Headset" />
                      <AccessoryChip label="Webcam" />
                    </div>
                  </div>

                  <button className="apple-btn" style={{ width: '100%', background: '#30d158', border: 'none', color: 'white', fontWeight: 'bold' }}>
                    Verify & Release Inventory
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* SLA & Health Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="SLA Compliance" subtitle="Resolution time targets">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
              <SLARow label="Critical Issues" percent={tickets.length > 0 ? Math.round((tickets.filter((t: any) => t.priority === 'High' && t.status === 'Resolved').length / (tickets.filter((t: any) => t.priority === 'High').length || 1)) * 100) : 100} color="#ff453a" />
              <SLARow label="Service Requests" percent={tickets.length > 0 ? Math.round((tickets.filter((t: any) => t.status === 'Resolved').length / tickets.length) * 100) : 100} color="#30d158" />
              <SLARow label="Onboarding Access" percent={Math.round((employees.filter((e: any) => e.onboarding?.it_verification === 'verified').length / (employees.length || 1)) * 100)} color="#0a84ff" />
            </div>
          </GlassCard>

          <GlassCard title="System Uptime" subtitle="Core infrastructure health">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <HealthStat icon={<FaDesktop />} label="VDI Clusters" val={tickets.filter((t: any) => (t.issue || t.subject || '').includes('VDI') || (t.issue || t.subject || '').includes('Display')).length > 2 ? "Degraded" : "99.9%"} />
              <HealthStat icon={<FaServer />} label="IDM Vault" val="100%" />
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid-3">
        <GlassCard title="Inventory Requisitions" subtitle="Managerial resource approval">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Available Hardware Assets</span>
            <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-blue)' }}>{assets.filter((a: any) => a.status === 'Available').length}</span>
          </div>
          <button className="apple-btn" style={{ width: '100%', marginTop: '15px', background: 'var(--accent-blue)' }}>
            Authorize Batch Procurement
          </button>
        </GlassCard>

        <GlassCard title="Compliance Audit" subtitle="IT Security and Policy">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', color: '#30d158', fontSize: '14px', fontWeight: '600' }}>
            <FaCheckCircle /> All end-points encrypted
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', color: '#ff9f0a', fontSize: '14px', fontWeight: '600' }}>
            <FaExclamationTriangle /> 4 OS patches pending
          </div>
        </GlassCard>

        <GlassCard title="Incident Logging" subtitle="Strategic Exports">
          <button className="apple-btn" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <FaDownload /> Monthly System Report
          </button>
        </GlassCard>
      </div>
    </div>
  );
}

const AllocationStat = ({ label, val }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</span>
    <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{val || 0}</span>
  </div>
);

const AccessoryChip = ({ label }: any) => (
  <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '11px', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
    {label}
  </div>
);

const SLARow = ({ label, percent, color }: any) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 'bold' }}>{percent}%</span>
    </div>
    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${percent}%`, background: color }} />
    </div>
  </div>
);

const HealthStat = ({ icon, label, val }: any) => (
  <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
    <div style={{ color: 'var(--accent-blue)', fontSize: '18px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '14px', fontWeight: '700', color: '#30d158' }}>{val}</div>
  </div>
);

const ticketCard = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
  border: '1px solid var(--border-light)', marginBottom: '12px'
};

const statusIndicator = {
  width: '4px', height: '30px', borderRadius: '2px'
};
