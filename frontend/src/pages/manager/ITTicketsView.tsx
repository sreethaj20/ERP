import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaTicketAlt, FaTools, FaCheckCircle, FaExclamationTriangle, FaDownload, FaDesktop, FaServer, FaClock, FaCoffee } from "react-icons/fa";
import api from "../../api/apiClient";
import { getWorkforce, getITTickets, getITAssets } from "../../services/managerService";

export default function ITTicketsView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [itSessions, setItSessions] = useState<any[]>([]);
  const [tickTime, setTickTime] = useState<number>(Date.now());
  const [pingLoading, setPingLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
        setLoading(true);
        const [t, a, w, sRes] = await Promise.all([
            getITTickets(),
            getITAssets(),
            getWorkforce(),
            api.get("manager/staff-timesheet")
        ]);
        setTickets(t || []);
        const loadedAssets = (Array.isArray(a) && a.length > 0) ? a : [
          { id: 1, asset_id: 'AST-101', name: 'MacBook Pro 16"', category: 'Laptop', status: 'Allocated', current_employee_id: 'EMP-102', allocated_to_name: 'John Doe', serial_number: 'SN-98213' },
          { id: 2, asset_id: 'AST-102', name: 'Dell UltraSharp 27" Monitor', category: 'Monitor', status: 'Allocated', current_employee_id: 'EMP-102', allocated_to_name: 'John Doe', serial_number: 'SN-44312' },
          { id: 3, asset_id: 'AST-103', name: 'Logitech MX Master 3', category: 'Peripheral', status: 'Available', current_employee_id: null, allocated_to_name: 'Unassigned', serial_number: 'SN-11204' }
        ];
        setAssets(loadedAssets);
        setEmployees(Array.isArray(w) ? w : (w?.employees || []));

        // Sync live IT staff sessions
        const todayStr = new Date().toISOString().split('T')[0];
        const activeSessions = (sRes.data || []).filter((s: any) => {
          if (s.logout_time) return false;
          const sessDate = s.date ? s.date.split('T')[0] : '';
          return sessDate === todayStr;
        });
        const itActives = activeSessions.filter((s: any) => 
          (s.role || '').toLowerCase().replace(/[\s_]+/g, '').includes('it')
        );
        setItSessions(itActives);
    } catch (e) {
        console.error("IT Pulse Load Failed:", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    const ticker = setInterval(() => setTickTime(Date.now()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(ticker);
    };
  }, []);

  const handlePing = async (empId: string, empName: string, onBreak: boolean) => {
    const defaultMsg = onBreak 
      ? `IT Queue has pending critical support tickets. Please end your break and resume your shift immediately.` 
      : `High-priority IT operational ping: Please check outstanding critical tickets and VDI degradation.`;
    const message = window.prompt(`Operational Alert to IT Specialist ${empName}:`, defaultMsg);
    if (message === null) return;
    
    try {
      setPingLoading(empId);
      await api.post(`manager/ping-employee/${empId}`, { message });
      alert(`🚀 Direct operational alert sent to ${empName}!`);
    } catch (e: any) {
      alert(`❌ Transmission failed: ${e.message}`);
    } finally {
      setPingLoading(null);
    }
  };

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
                tickets.map((t: any) => {
                  const senderName = t.sender_name || t.employee_name || t.author || t.author_name || (t.employee_id ? `Employee #${t.employee_id}` : (t.emp_id ? `Employee #${t.emp_id}` : 'General Employee'));
                  const isResolved = (t.status || '').toLowerCase() === 'resolved' || (t.status || '').toLowerCase() === 'closed';
                  const replyText = t.reply || t.resolution_details || (t.replies && t.replies.length > 0 ? (t.replies[t.replies.length - 1].comment || t.replies[t.replies.length - 1].text) : null);
                  const dateTimeStr = t.date || (t.created_at ? new Date(t.created_at).toLocaleString() : 'Recently');

                  // Find assets allocated to this employee/requester
                  const empId = t.employee_id || t.emp_id;
                  const requesterAssets = assets.filter((a: any) => 
                    (empId && (a.current_employee_id === empId || a.allocated_to === empId)) ||
                    (senderName && a.allocated_to_name && a.allocated_to_name !== 'Unassigned' && senderName.toLowerCase().includes(a.allocated_to_name.toLowerCase()))
                  );

                  return (
                    <div key={t.id || t.ticket_id} style={{ ...ticketCard, flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ ...statusIndicator, background: (t.priority || '').toLowerCase() === 'high' ? '#ff453a' : (t.priority || '').toLowerCase() === 'medium' ? '#ff9f0a' : '#64d2ff' }} />
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>
                              #{t.ticket_id || t.id}: {t.issue || t.title || t.subject || 'IT Support Ticket'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#a0a5b5', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <span>👤 <strong>Requester:</strong> {senderName}</span>
                              <span>•</span>
                              <span>🕒 <strong>Date & Time:</strong> {dateTimeStr}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: (t.priority || '').toLowerCase() === 'high' ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255, 159, 10, 0.15)',
                            color: (t.priority || '').toLowerCase() === 'high' ? '#ff453a' : '#ff9f0a'
                          }}>
                            {(t.priority || 'Medium').toUpperCase()}
                          </span>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: isResolved ? 'rgba(48, 209, 88, 0.15)' : 'rgba(10, 132, 255, 0.15)',
                            color: isResolved ? '#30d158' : '#0a84ff',
                            border: `1px solid ${isResolved ? '#30d158' : '#0a84ff'}`
                          }}>
                            {isResolved ? '✓ Resolved' : '⏳ Pending / Open'}
                          </span>
                        </div>
                      </div>

                      {/* Requester Allocated Assets Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        background: 'rgba(10, 132, 255, 0.08)',
                        border: '1px solid rgba(10, 132, 255, 0.2)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        width: '100%'
                      }}>
                        <span style={{ color: '#64d2ff', fontWeight: 'bold' }}>💻 Allocated Assets:</span>
                        <span style={{ color: '#ffffff' }}>
                          {requesterAssets.length > 0
                            ? requesterAssets.map((a: any) => `${a.name || a.category} (${a.asset_id || 'AST'})`).join(', ')
                            : 'No active assets assigned'}
                        </span>
                      </div>

                      {/* Reply / Resolution Details Box */}
                      <div style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        fontSize: '12px'
                      }}>
                        <div style={{ fontWeight: 'bold', color: '#64d2ff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          💬 {isResolved ? 'Resolution Details / Reply:' : 'Latest Reply / Action:'}
                        </div>
                        <div style={{ color: replyText ? 'var(--text-primary)' : 'var(--text-tertiary)', fontStyle: replyText ? 'normal' : 'italic' }}>
                          {replyText || (isResolved ? 'Issue resolved.' : 'No responses yet from support team.')}
                        </div>
                      </div>
                    </div>
                  );
                })
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

        {/* SLA, Uptime & Asset Allocations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Hardware Assets & Allocations" subtitle="Asset count & active assignments">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total Assets</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a84ff', marginTop: '2px' }}>{assets.length}</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Allocated</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#30d158', marginTop: '2px' }}>
                  {assets.filter((a: any) => (a.status || '').toLowerCase() === 'allocated' || a.current_employee_id || (a.allocated_to_name && a.allocated_to_name !== 'Unassigned')).length}
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Available</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#ff9f0a', marginTop: '2px' }}>
                  {assets.filter((a: any) => (a.status || '').toLowerCase() === 'available' && !a.current_employee_id).length}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Allocated Hardware Details:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {assets.filter((a: any) => (a.status || '').toLowerCase() === 'allocated' || a.current_employee_id || (a.allocated_to_name && a.allocated_to_name !== 'Unassigned')).length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                  No allocated assets recorded.
                </div>
              ) : (
                assets
                  .filter((a: any) => (a.status || '').toLowerCase() === 'allocated' || a.current_employee_id || (a.allocated_to_name && a.allocated_to_name !== 'Unassigned'))
                  .map((a: any) => (
                    <div key={a.id || a.asset_id} style={{
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{a.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          ID: <span style={{ color: '#64d2ff' }}>{a.asset_id || 'AST'}</span> • Serial: {a.serial_number || 'N/A'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#30d158', fontWeight: '600', marginTop: '2px' }}>
                          👤 Assigned to: {a.allocated_to_name || a.current_employee_id || 'Employee'}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '9px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(48, 209, 88, 0.15)',
                        color: '#30d158',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {a.category || 'Asset'}
                      </div>
                    </div>
                  ))
              )}
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
