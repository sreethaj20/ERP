import { getVisibleCandidates, updateCandidateStage } from "../../utils/storage";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";

export default function ManagerApproval() {
  const userId = sessionStorage.getItem('userId') || '';
  const userRole = sessionStorage.getItem('userRole') || 'Recruiter';

  const candidates = getVisibleCandidates(userRole, userId).filter((c: any) => c.current_stage?.toLowerCase() === "selected");

  return (
    <div className="dashboard-container">
      <Header role="Recruiter" title="Internal Approvals" />

      <GlassCard title="Candidates Pending Final Approval">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {candidates.map((c: any) => (
            <div key={c.candidate_id || c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <div>
                <h4 style={{ margin: '0' }}>{c.name || `${c.first_name} ${c.last_name}`}</h4>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--text-tertiary)' }}>{c.email}</p>
              </div>
              <button
                className="apple-btn"
                style={{ background: 'var(--accent-green)' }}
                onClick={() => {
                  updateCandidateStage(c.candidate_id || c.id, "Joined");
                  alert("Candidate approved and moved to Joined status.");
                }}
              >
                Confirm Approval
              </button>
            </div>
          ))}
          {candidates.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>No pending approvals</div>}
        </div>
      </GlassCard>
    </div>
  );
}
