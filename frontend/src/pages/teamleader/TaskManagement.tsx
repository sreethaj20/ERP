import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaTasks, FaUserTag, FaPlusCircle, FaFileExcel, FaCheckDouble, FaTrash } from "react-icons/fa";
import { getTeamTasks, createTeamTask, deleteTeamTask, getTeamMembers } from "../../services/teamleaderService";

export default function TaskManagement() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [empId, setEmpId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
        const [tList, mList] = await Promise.all([
            getTeamTasks(),
            getTeamMembers()
        ]);
        setTasks(tList || []);
        setMembers(mList || []);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    if (!empId || !taskTitle) return alert("Please fill assignee and title");
    try {
      await createTeamTask({
        employee_id: empId,
        title: taskTitle,
        priority: priority,
        status: 'Pending'
      });
      alert("Task assigned successfully.");
      setTaskTitle("");
      setEmpId("");
      loadData();
    } catch (e) {
      alert("Failed to assign task");
    }
  };

  const handleDelete = async (id: any) => {
    if (window.confirm("Delete this task?")) {
      try {
          await deleteTeamTask(id);
          loadData();
      } catch (err) {
          alert("Delete failed.");
      }
    }
  };

  return (
    <div className="dashboard-container">
      <Header role="Team Leader" title="Team Execution" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Task Management</h1>
        <p className="subtitle">Delegate responsibilities and track sprint progress</p>
      </div>

      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Assignment Form */}
        <GlassCard title="Assign Objective" subtitle="Create new team task">
          <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
            <div style={inputGroup}>
              <label style={labelStyle}>Assignee</label>
              <select className="apple-input" value={empId} onChange={(e) => setEmpId(e.target.value)}>
                <option value="">Select Team Member...</option>
                {members.map(m => <option key={m.id} value={m.employee_id}>{m.name} ({m.employee_id})</option>)}
              </select>
            </div>
            <div style={inputGroup}>
              <label style={labelStyle}>Task Title</label>
              <input placeholder="Feature or Bugfix..." className="apple-input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
            <div style={inputGroup}>
              <label style={labelStyle}>Priority Level</label>
              <select className="apple-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>
            <button className="apple-btn" style={{ height: '48px', marginTop: '10px', background: 'var(--accent-blue)', color: '#fff' }} onClick={handleCreate}>
              <FaPlusCircle style={{marginRight: '8px'}} /> Delegate Task
            </button>
          </div>
        </GlassCard>

        {/* Task List */}
        <GlassCard title="Board View" subtitle="Active tasks by status" style={{ gridColumn: 'span 2' }}>
          <div style={{ marginTop: '15px' }}>
            {tasks.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)'}}>No tasks assigned yet.</div>
            ) : tasks.map((t) => (
              <div key={t.id} style={taskItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)'
                  }}>
                    <FaTasks />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600' }}>{t.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{t.employee_id} • Priority: <span style={{ color: t.priority === 'Critical' ? '#ff453a' : '#0a84ff', fontWeight: '700' }}>{t.priority}</span></div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800',
                    background: t.status === 'Completed' ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 159, 10, 0.12)',
                    color: t.status === 'Completed' ? '#30d158' : '#ff9f0a', textTransform: 'uppercase'
                  }}>
                    {t.status}
                  </span>
                  <button onClick={() => handleDelete(t.id)} style={{background: 'none', border: 'none', color: 'rgba(255,69,58,0.4)', cursor: 'pointer'}} onMouseEnter={e => e.currentTarget.style.color = '#ff453a'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,69,58,0.4)'}>
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

const inputGroup = { display: "flex", flexDirection: "column" as const, gap: "5px" };
const labelStyle = { fontSize: "11px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase" as const, marginBottom: '2px' };
const taskItem = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
  border: '1px solid var(--border-light)', marginBottom: '12px', transition: 'all 0.2s ease'
};
