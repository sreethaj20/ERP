import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import api from "../../api/apiClient";
import { FaDesktop, FaTicketAlt, FaShieldAlt, FaBoxOpen, FaTools, FaDownload, FaSync } from "react-icons/fa";
import { downloadCSV } from "../../utils/formatters";

export default function ITReports() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('it/reports');
      setStats(res.data);
    } catch (e) {
      console.warn('[IT Reports] Failed to load stats:', e);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (type: string, endpoint: string) => {
    setDownloading(type);
    try {
      const res = await api.get(endpoint);
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || [res.data]);
      if (data.length > 0) {
        downloadCSV(data, `IT_${type.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.csv`);
      } else {
        alert(`No data found for ${type} report.`);
      }
    } catch (e: any) {
      alert(`Failed to download ${type} report: ` + (e.response?.data?.detail || e.message));
    } finally {
      setDownloading(null);
    }
  };

  const statCards = stats ? [
    {
      label: 'Total Assets',
      value: stats.total_assets ?? '—',
      subLabel: 'Hardware inventory',
      color: '#0a84ff',
      icon: <FaDesktop size={20} />
    },
    {
      label: 'Allocated Assets',
      value: stats.allocated_assets ?? '—',
      subLabel: `${stats.allocation_rate ?? '—'}% allocation rate`,
      color: '#30d158',
      icon: <FaBoxOpen size={20} />
    },
    {
      label: 'Under Maintenance',
      value: stats.maintenance_count ?? '—',
      subLabel: 'Pending maintenance',
      color: '#ff9f0a',
      icon: <FaTools size={20} />
    },
    {
      label: 'Open Tickets',
      value: stats.open_tickets ?? '—',
      subLabel: 'Unresolved requests',
      color: '#ff453a',
      icon: <FaTicketAlt size={20} />
    },
    {
      label: 'Active Accesses',
      value: stats.active_accesses ?? '—',
      subLabel: 'System access grants',
      color: '#bf5af2',
      icon: <FaShieldAlt size={20} />
    },
  ] : [];

  const reports = [
    { type: 'Asset Inventory', endpoint: 'it/assets', icon: <FaDesktop />, color: '#0a84ff', desc: 'Complete hardware asset list with serial numbers and status' },
    { type: 'Asset Allocations', endpoint: 'it/allocations', icon: <FaBoxOpen />, color: '#30d158', desc: 'Asset assignments per employee with allocation dates' },
    { type: 'Maintenance Log', endpoint: 'it/maintenance', icon: <FaTools />, color: '#ff9f0a', desc: 'Service records, repair logs, and incident tracking' },
    { type: 'Support Tickets', endpoint: 'it/tickets', icon: <FaTicketAlt />, color: '#ff453a', desc: 'All raised IT support tickets with resolution status' },
    { type: 'Access Provisioning', endpoint: 'it/access', icon: <FaShieldAlt />, color: '#bf5af2', desc: 'System access grants and permission assignments' },
  ];

  return (
    <div className="dashboard-container">
      <Header role="IT Department" title="IT Reports & Analytics" />

      {/* Page Header */}
      <div style={{ marginTop: '35px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', background: 'linear-gradient(135deg, #64d2ff, #0a84ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '6px' }}>
            IT Operations Intelligence
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Live asset compliance, ticket analytics, and access governance reports
          </p>
        </div>
        <button
          onClick={loadStats}
          className="apple-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(100,210,255,0.1)', color: '#64d2ff', border: '1px solid rgba(100,210,255,0.2)', fontSize: '13px' }}
        >
          <FaSync size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh Stats
        </button>
      </div>

      {/* Live Stats Grid */}
      {loading ? (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '30px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ flex: 1, height: '100px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : stats ? (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '30px', flexWrap: 'wrap' }}>
          {statCards.map(stat => (
            <div key={stat.label} style={{
              flex: 1, minWidth: '140px', padding: '20px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.08)`,
              borderLeft: `3px solid ${stat.color}`, backdropFilter: 'blur(20px)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${stat.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                  {stat.icon}
                </div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: stat.color, textTransform: 'uppercase', marginTop: '6px' }}>{stat.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{stat.subLabel}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '20px', background: 'rgba(255,69,58,0.05)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: '12px', marginBottom: '30px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          ⚠️ Live stats unavailable — backend may not be running. Reports download is still available below.
        </div>
      )}

      {/* Report Download Cards */}
      <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>
        📥 Download Reports
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {reports.map(r => (
          <GlassCard key={r.type} style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${r.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.color, fontSize: '18px' }}>
                {r.icon}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>{r.type}</div>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px', lineHeight: '1.5' }}>{r.desc}</p>
            <button
              onClick={() => downloadReport(r.type, r.endpoint)}
              disabled={downloading === r.type}
              className="apple-btn"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}33`,
                fontSize: '13px', fontWeight: '600', opacity: downloading === r.type ? 0.6 : 1
              }}
            >
              <FaDownload size={12} />
              {downloading === r.type ? 'Downloading...' : 'Download CSV'}
            </button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
