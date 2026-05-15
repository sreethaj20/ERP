import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { api, fetchData, sendData } from "../../utils/storage";
import { FaProjectDiagram, FaCheck, FaTimes, FaUsers, FaTools, FaTrophy, FaSync } from "react-icons/fa";

export default function OnboardingWorkflow() {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [checklistData, empData] = await Promise.all([
        api.get('manager/onboarding-workflow').then(res => res.data),
        fetchData('hr/employees')
      ]);
      const rawData = Array.isArray(checklistData) ? checklistData : [];
      // deduplicate by employee_id for UI stability
      const uniqueData = rawData.filter((v, i, a) => a.findIndex(t => t.employee_id === v.employee_id) === i);
      setChecklists(uniqueData);
      setEmployees(Array.isArray(empData) ? empData : []);

    } catch (error) {
      console.error('[WORKFLOW] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getEmpName = (empId: string) => employees.find((e: any) => e.employee_id === empId || String(e.id) === String(empId))?.name || empId;

  const toggleStep = async (employee_id: string, step: string, currentVal: boolean) => {
    try {
      const updates = { [step]: !currentVal };
      await api.put(`manager/onboarding-workflow/${employee_id}`, updates);
      
      // Update local state for immediate feedback
      setChecklists(prev => prev.map(c => 
        c.employee_id === employee_id ? { ...c, ...updates } : c
      ));
      
      if (selected?.employee_id === employee_id) {
        setSelected((prev: any) => ({ ...prev, ...updates }));
      }
    } catch (error) {
      alert('Error updating step. Please try again.');
    }
  };

  return (
    <>
      <Header role="Manager" title="Operational Excellence" />

      <div style={{ marginBottom: "30px", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Onboarding Workflow</h1>
          <p className="subtitle">Operational integration of authorized talent into departmental ecosystems</p>
        </div>
        <button onClick={loadData} className="apple-btn" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)' }}>
          <FaSync className={loading ? 'spin' : ''} /> Sync Pipeline
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Left: Active Onboarding Pipeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <GlassCard title="Integration Queue" subtitle="Post-approval operational steps">
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
              {checklists.length === 0 && (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                  No active workflows found. Approve a request to start.
                </p>
              )}
              {checklists.map(c => (
                <div key={c.employee_id} onClick={() => setSelected(c)} style={{
                  padding: "16px",
                  borderRadius: "16px",
                  background: selected?.employee_id === c.employee_id ? "rgba(10, 132, 255, 0.1)" : "rgba(255,255,255,0.02)",
                  border: selected?.employee_id === c.employee_id ? "1px solid #0a84ff" : "1px solid var(--border-light)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>{getEmpName(c.employee_id)}</span>
                    <span style={{ 
                      fontSize: '10px', 
                      background: c.status === 'Completed' ? 'rgba(48,209,88,0.15)' : 'rgba(10,132,255,0.15)',
                      color: c.status === 'Completed' ? 'var(--accent-green)' : 'var(--accent-blue)',
                      padding: '3px 8px',
                      borderRadius: '10px',
                      fontWeight: 'bold'
                    }}>
                      {c.status?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <ProgressDot active={c.step_team_intro} />
                    <ProgressDot active={c.step_tools_access} />
                    <ProgressDot active={c.step_probation_goals} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right: Detailed Workflow Execution */}
        <GlassCard title="Workflow Blueprint" subtitle="Actionable integration checklist">
          {selected ? (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <WorkflowItem 
                  icon={<FaUsers />} 
                  title="Team Introduction" 
                  description="Introduce the new hire to the immediate team and stakeholders."
                  active={selected.step_team_intro}
                  onToggle={() => toggleStep(selected.employee_id, 'step_team_intro', selected.step_team_intro)}
                />
                <WorkflowItem 
                  icon={<FaTools />} 
                  title="Operational Tooling" 
                  description="Ensure first-day access to Jira, Slack, GitHub, and internal dashboards."
                  active={selected.step_tools_access}
                  onToggle={() => toggleStep(selected.employee_id, 'step_tools_access', selected.step_tools_access)}
                />
                <WorkflowItem 
                  icon={<FaTrophy />} 
                  title="30-60-90 Day Goals" 
                  description="Establish clear performance metrics and probation success criteria."
                  active={selected.step_probation_goals}
                  onToggle={() => toggleStep(selected.employee_id, 'step_probation_goals', selected.step_probation_goals)}
                />
              </div>

              {selected.step_team_intro && selected.step_tools_access && selected.step_probation_goals && (
                <div style={{ 
                  marginTop: '40px', 
                  padding: '24px', 
                  background: 'rgba(48,209,88,0.05)', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(48,209,88,0.2)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '30px', marginBottom: '10px' }}>🥇</div>
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--accent-green)' }}>Workflow Validated</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>This employee is now fully integrated into the department.</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              Select an employee from the queue to execute integration steps
            </div>
          )}
        </GlassCard>
      </div>
    </>
  );
}

const ProgressDot = ({ active }: { active: boolean }) => (
  <div style={{ 
    height: '4px', 
    flex: 1, 
    background: active ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)', 
    borderRadius: '2px' 
  }} />
);

const WorkflowItem = ({ icon, title, description, active, onToggle }: any) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    border: '1px solid var(--border-light)'
  }}>
    <div style={{ 
      width: '48px', 
      height: '48px', 
      borderRadius: '12px', 
      background: active ? 'rgba(48,209,88,0.1)' : 'rgba(255,255,255,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: active ? 'var(--accent-green)' : 'var(--text-tertiary)',
      fontSize: '20px'
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{description}</div>
    </div>
    <button 
      onClick={onToggle}
      className="apple-btn"
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
        color: active ? 'white' : 'var(--text-tertiary)',
        border: active ? 'none' : '1px solid var(--border-light)'
      }}
    >
      {active ? <FaCheck /> : <FaCheck style={{ opacity: 0.3 }} />}
    </button>
  </div>
);
