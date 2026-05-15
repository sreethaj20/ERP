import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getPreboardingList, updatePreboarding, getEmployees } from "../../utils/storage";
import { FaUserClock, FaTasks, FaUniversity, FaFileSignature, FaClipboardCheck, FaInfoCircle, FaCheckDouble } from "react-icons/fa";

export default function PreboardingMonitoring() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [employees, setEmployeesState] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [goals, setGoals] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await getPreboardingList();
    setCandidates(Array.isArray(list) ? list : []);
    const emps = await getEmployees();
    setEmployeesState(Array.isArray(emps) ? emps : []);
  };

  const getEmpName = (empId: string) => employees.find((e: any) => e.id === empId)?.name || empId;

  useEffect(() => {
    if (selected) {
      setNotes(selected.manager_notes || "");
      setGoals(selected.thirty_day_goals || "");
    }
  }, [selected]);

  const handleSave = async () => {
    if (!selected) return;
    await updatePreboarding(selected.preboard_id, {
      manager_notes: notes,
      thirty_day_goals: goals
    });
    await loadData();
    alert("Updates saved to real-time storage!");
  };

  const handleDay1Ready = async () => {
    if (!selected) return;
    await updatePreboarding(selected.preboard_id, {
      preboard_status: 'completed',
      training_completed: true,
      policy_acknowledged: true,
      documents_verified: true
    });
    await loadData();
    setSelected((prev: any) => ({ ...prev, preboard_status: 'completed', training_completed: true, policy_acknowledged: true, documents_verified: true }));
    alert("Employee flagged as Day-1 Ready!");
  };

  return (
    <>
      <Header role="Manager" title="Strategic Readiness" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Pre-boarding Monitoring</h1>
        <p className="subtitle">Track candidate engagement, training progress, and day-0 compliance</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Left Column: Incoming Talent */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <GlassCard title="Incoming Talent" subtitle="Day-0 Readiness Pipeline">
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
              {candidates.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>No preboarding entries.</p>}
              {candidates.map(c => (
                <div key={c.preboard_id} onClick={() => setSelected(c)} style={{
                  padding: "16px",
                  borderRadius: "16px",
                  background: selected?.preboard_id === c.preboard_id ? "rgba(10, 132, 255, 0.1)" : "rgba(255,255,255,0.02)",
                  border: selected?.preboard_id === c.preboard_id ? "1px solid #0a84ff" : "1px solid var(--border-light)",
                  cursor: "pointer"
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700' }}>{c.employee_name || getEmpName(c.employee_id)}</span>
                    <span style={{ fontSize: '10px', color: (c.self_onboarding_status || c.preboard_status) === 'completed' ? '#30d158' : '#ff9f0a', fontWeight: 'bold' }}>
                      {(c.self_onboarding_status || c.preboard_status || 'Pending').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <div style={{ height: '4px', flex: 1, background: c.training_completed ? '#30d158' : 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />
                    <div style={{ height: '4px', flex: 1, background: c.policy_acknowledged ? '#30d158' : 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />
                    <div style={{ height: '4px', flex: 1, background: (c.documents_verified_by_hr || c.documents_verified) ? '#30d158' : 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard title="Strategic Goals" subtitle="30-Day Objective Health">
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
              Average candidate alignment with departmental goals is at <b>88%</b>.
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Pre-boarding Blueprint */}
        <GlassCard title="Pre-boarding Blueprint" subtitle="Candidate engagement & compliance matrix">
          {selected ? (
            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '30px' }}>
                <StatusTile icon={<FaTasks />} label="Training" active={selected.training_completed} />
                <StatusTile icon={<FaFileSignature />} label="Policies" active={selected.policy_acknowledged} />
                <StatusTile icon={<FaCheckDouble />} label="Documents" active={selected.documents_verified_by_hr || selected.documents_verified} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <SectionTitle icon={<FaUniversity />} text="Financial & Contact" />
                  <div style={infoGrid}>
                    <InfoLabel>Emergency</InfoLabel><InfoVal>{selected.emergency_contact_phone || selected.emergency_contact || 'N/A'}</InfoVal>
                    <InfoLabel>Bank Acc</InfoLabel><InfoVal style={{ fontFamily: 'monospace' }}>{selected.bank_account_number || selected.bank_account || 'N/A'}</InfoVal>
                    <InfoLabel>IFSC Code</InfoLabel><InfoVal>{selected.bank_ifsc_code || selected.ifsc_code || 'N/A'}</InfoVal>
                    <InfoLabel>Status</InfoLabel><InfoVal style={{ color: (selected.self_onboarding_status || selected.preboard_status) === 'completed' ? '#30d158' : '#ff9f0a' }}>{(selected.self_onboarding_status || selected.preboard_status || 'Pending').toUpperCase()}</InfoVal>
                  </div>
                </div>
                <div>
                  <SectionTitle icon={<FaInfoCircle />} text="Managerial Observations" />
                  <textarea
                    className="apple-input"
                    placeholder="Enter observation notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ height: '80px', fontSize: '13px', resize: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '30px' }}>
                <SectionTitle icon={<FaClipboardCheck />} text="Candidate 30-Day Strategic Goals" />
                <textarea
                  className="apple-input"
                  placeholder="Enter 30-day objectives (one per line)..."
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  style={{ height: '100px', fontSize: '13px', resize: 'none' }}
                />
              </div>

              <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
                <button className="apple-btn" onClick={handleSave} style={{ flex: 1, height: '54px', background: 'var(--accent-blue)' }}>
                  Save Engagement Updates
                </button>
                <button className="apple-btn" onClick={handleDay1Ready} style={{ flex: 1, height: '54px', background: 'rgba(255,255,255,0.05)' }}>
                  Flag as Ready for Day-1
                </button>
              </div>
            </div>
          ) : (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              Select a candidate to review and update readiness data
            </div>
          )}
        </GlassCard>
      </div>
    </>
  );
}

const SectionTitle = ({ icon, text }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '15px' }}>
    {icon} {text}
  </div>
);

const InfoLabel = ({ children }: any) => <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{children}</span>;
const InfoVal = ({ children, style }: any) => <span style={{ fontSize: '14px', fontWeight: '600', ...style }}>{children}</span>;
const infoGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 10px' };

const StatusTile = ({ label, active, icon }: any) => (
  <div style={{
    padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-light)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
  }}>
    <div style={{ color: active ? '#30d158' : 'var(--text-tertiary)' }}>{icon}</div>
    <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? '#30d158' : '#ff453a' }} />
  </div>
);
