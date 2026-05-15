import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getMyTasks, updateTaskStatus } from "../../services/employeeService";
import { FaTasks, FaCheckCircle, FaSpinner, FaClock, FaCalendarAlt } from "react-icons/fa";

export default function MyTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const data = await getMyTasks();
      setTasks(data);
    } catch (e) {
      console.error("Failed to load tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleComplete = async (id: number) => {
    try {
      await updateTaskStatus(id, 'Completed');
      loadTasks();
    } catch (e) {
      alert("Failed to update task status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#30d158';
      case 'in progress': return '#0a84ff';
      case 'pending': return '#ff9f0a';
      default: return 'var(--text-tertiary)';
    }
  };

  return (
    <div className="dashboard-container">
      <Header role="Employee" title="My Deliverables" />

      <div style={{ marginTop: "35px", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>My Tasks</h1>
        <p className="subtitle">Track and update work assigned to you by your team leader</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <GlassCard title="Task Pipeline" subtitle="Work assigned to you">
          <div style={{ maxHeight: "600px", overflowY: "auto", marginTop: "15px" }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '100px' }}><FaSpinner className="spin" /></div>
            ) : tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                <FaTasks size={32} style={{ opacity: 0.2, marginBottom: '15px' }} />
                <p>No tasks assigned yet.</p>
              </div>
            ) : tasks.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  marginBottom: "16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-light)",
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>{t.title}</span>
                    <span style={{ 
                      fontSize: '9px', fontWeight: '800', 
                      background: `${getStatusColor(t.status)}15`, 
                      color: getStatusColor(t.status), 
                      padding: '2px 8px', borderRadius: '6px', 
                      textTransform: 'uppercase' 
                    }}>
                      {t.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', gap: '15px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FaCalendarAlt size={10} /> Created: {new Date(t.created_at || Date.now()).toLocaleDateString()}</span>
                    {t.due_date && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FaClock size={10} /> Due: {t.due_date}</span>}
                  </div>
                </div>

                {t.status !== 'Completed' && (
                  <button 
                    style={{ ...btnStyle, width: 'auto', padding: '8px 16px', background: 'rgba(48,209,88,0.15)', color: '#30d158' }} 
                    onClick={() => handleComplete(t.id)}
                  >
                    <FaCheckCircle /> Mark Complete
                  </button>
                )}
              </div>
            ))}
          </div>
        </GlassCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Efficiency Analytics" subtitle="Monthly task metrics">
             <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                <AnalyticRow label="Tasks Completed" value={tasks.filter(t => t.status === 'Completed').length} color="#30d158" />
                <AnalyticRow label="Pending" value={tasks.filter(t => t.status !== 'Completed').length} color="#ff9f0a" />
             </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

const AnalyticRow = ({ label, value, color }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontSize: '16px', fontWeight: '700', color }}>{value}</span>
  </div>
);

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  borderRadius: '12px',
  border: "none",
  background: "#0ea5e9",
  color: "white",
  fontWeight: "700",
  fontSize: '12px',
  cursor: "pointer",
  transition: 'all 0.2s'
};
