import React from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getVisibleCandidates } from "../../utils/storage";

export default function Applications() {
  const userId = sessionStorage.getItem('userId') || '';
  const userRole = sessionStorage.getItem('userRole') || 'Recruiter';

  const candidates = getVisibleCandidates(userRole, userId).filter((c: any) => c.current_stage === "applied");

  return (
    <div className="dashboard-container">
      <Header role="Recruiter" title="Applications Received" />

      <GlassCard title="Applied Candidates">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {candidates.map((c: any) => (
            <div key={c.candidate_id || c.id} style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 5px 0' }}>{c.name || `${c.first_name} ${c.last_name}`}</h4>
              <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>{c.email}</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: 'var(--accent-blue)' }}>Experience: {c.total_experience_years || c.experience_years} years</p>
            </div>
          ))}
          {candidates.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>No applications received</div>}
        </div>
      </GlassCard>
    </div>
  );
}
