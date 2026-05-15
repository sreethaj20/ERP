import React, { useEffect, useState, useCallback } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { 
  getWorkforce, 
  getAnalytics, 
  getPerformanceReviews, 
  getPendingLeaves 
} from "../../services/managerService";
import { downloadCSV } from "../../utils/formatters";
import { FaUserShield, FaUsers, FaChartPie, FaDownload, FaCircle, FaTasks, FaCommentAlt, FaStar, FaTimes, FaCalendarAlt, FaSpinner } from "react-icons/fa";

export default function TeamLeaderStatusView() {
  // Real API states
  const [employees, setEmployees] = useState<any[]>([]);
  const [teamStatus, setTeamStatus] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [tlFilter, setTlFilter] = useState<string>("All"); // Added for dividing reviews

  // Loading & Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Oversight Modal State
  const [selectedTL, setSelectedTL] = useState<any | null>(null);
  const [oversightTeam, setOversightTeam] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Parallel API calls
      const [workforceRes, analyticsRes, reviewsRes, leavesRes] = await Promise.all([
        getWorkforce(),
        getAnalytics(),
        getPerformanceReviews(),
        getPendingLeaves()
      ]);

      const workforceArray = Array.isArray(workforceRes) ? workforceRes : (workforceRes?.employees || []);
      const leavesArray = Array.isArray(leavesRes) ? leavesRes : [];
      
      setEmployees(workforceArray);
      setAnalytics(analyticsRes || {});
      setReviews(Array.isArray(reviewsRes) ? reviewsRes : []);
      setPendingLeaves(leavesArray);

      // Process team leaders using the FRESHLY fetched leavesArray, not the state pendingLeaves
      const teamLeaders = workforceArray.filter((e: any) =>
        (e.role || '').toLowerCase().replace(/\s+/g, '') === 'teamleader'
      );

      const realTeamStatus = teamLeaders.map((tl: any) => {
        const team = workforceArray.filter((e: any) => 
          String(e.manager_id) === String(tl.employee_id) || 
          String(e.reporting_to_id) === String(tl.employee_id) ||
          String(e.team_leader_id) === String(tl.employee_id) ||
          String(e.reporting_manager_id) === String(tl.employee_id)
        );
        
        // Real metrics from data
        const active = team.filter((e: any) => e.status === 'Active').length;
        const total = team.length;
        const avgPerf = team.reduce((sum: number, e: any) => sum + Number(e.performance_score || 0), 0) / Math.max(total, 1);

        return {
          tl_id: tl.employee_id,
          tl_name: tl.name || `${tl.first_name} ${tl.last_name}`.trim(),
          team_size: total,
          active,
          on_leave: leavesArray.filter((l: any) => 
            team.some((t: any) => String(t.employee_id) === String(l.employee_id))
          ).length,
          avg_perf: avgPerf.toFixed(1),
          tasks_done: `${Math.round((active / Math.max(total, 1)) * 100)}%`
        };
      });

      setTeamStatus(realTeamStatus);

      // Refresh modal team if open
      if (selectedTL && workforceArray.length > 0) {
        const team = workforceArray.filter((e: any) => 
          String(e.reporting_to_id) === String(selectedTL.tl_id) ||
          String(e.manager_id) === String(selectedTL.tl_id) ||
          String(e.team_leader_id) === String(selectedTL.tl_id) ||
          String(e.reporting_manager_id) === String(selectedTL.tl_id)
        );
        setOversightTeam(team);
      }
    } catch (err: any) {
      console.error('Manager dashboard load failed:', err);
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [selectedTL]); // Only depend on selectedTL for modal refreshing

  useEffect(() => {
    loadData();
    
    // Poll every 30s for updates
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, [loadData]);

  const handleOversight = (t: any) => {
    setSelectedTL(t);
    // Filter current employees for oversight using employee_id (tl_id is already mapped to employee_id in realTeamStatus)
    const team = employees.filter((e: any) => 
      String(e.reporting_to_id) === String(t.tl_id) ||
      String(e.manager_id) === String(t.tl_id) ||
      String(e.team_leader_id) === String(t.tl_id) ||
      String(e.reporting_manager_id) === String(t.tl_id)
    );
    setOversightTeam(team);
  };

  const handleDownload = () => {
    const exportData = teamStatus.map(t => ({
      'TL ID': t.tl_id,
      'TL Name': t.tl_name,
      'Team Size': t.team_size,
      'Active Members': t.active,
      'Pending Leaves': t.on_leave,
      'Avg Performance': `${t.avg_perf}/5.0`,
      'Team Health': t.tasks_done
    }));
    downloadCSV(exportData, `Manager_Team_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <FaSpinner className="spin" size={48} />
          <div style={{ marginTop: '20px', fontSize: '18px' }}>Loading Manager Dashboard...</div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>Connecting to live team data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header role="Manager" title="Live Team Leadership Dashboard" />
      
      {error && (
        <GlassCard title="⚠️ Connection Issue" subtitle="Dashboard temporarily unavailable">
          <div style={{ color: '#ff9f0a', padding: '20px', textAlign: 'center' }}>
            {error}
            <br />
            <button className="apple-btn" onClick={loadData} style={{ marginTop: '15px' }}>
              🔄 Retry
            </button>
          </div>
        </GlassCard>
      )}

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>
          Team Leader Status Hub ({analytics.headcount || 0} total reports)
        </h1>
        <p className="subtitle">
          Live metrics: {pendingLeaves.length} pending leaves | {analytics.active_transitions || 0} transitions
        </p>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "30px" }}>
        {/* Main Leadership Table */}
        <GlassCard title="Leadership Index" subtitle={`Live team connectivity (${teamStatus.length} leaders)`}>
          {teamStatus.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No team leaders found. Check role assignments in <strong>/manager/roles</strong>.
            </div>
          ) : (
            <div style={{ marginTop: "15px" }}>
              {teamStatus.map((t, index) => (
                <div key={index} style={leadRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1.2 }}>
                    <div style={leadAvatar}><FaUserShield /></div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700' }}>{t.tl_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>ID: {t.tl_id}</div>
                    </div>
                  </div>

                  <div style={{ flex: 1.5, display: 'flex', gap: '15px' }}>
                    <MetricBox label="Team Size" val={t.team_size} />
                    <MetricBox label="Active" val={t.active} color="#30d158" />
                    <MetricBox label="Leaves" val={t.on_leave} color="#bf5af2" />
                  </div>

                  <div style={{ flex: 1, textAlign: 'right', paddingRight: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-blue)' }}>{t.avg_perf}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Perf Score</div>
                  </div>

                  <button
                    onClick={() => handleOversight(t)}
                    className="apple-btn"
                    style={{ padding: '8px 15px', fontSize: '11px' }}
                  >
                    👁️ View Team
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Live Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Live Metrics" subtitle="Real-time workforce pulse">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#30d158' }}>{analytics.headcount || 0}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Headcount</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#ff453a' }}>{pendingLeaves.length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Pending Leaves</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Action Items" subtitle="Immediate attention">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={alertItem}>
                <FaCircle size={6} color="#ff9f0a" /> 
                {analytics.onboarding_count || 0} onboarding actions
              </div>
              <div style={alertItem}>
                <FaCircle size={6} color="#30d158" /> 
                {Number(analytics.department_health || 0).toFixed(1)}% team health
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Performance Reviews Feed */}
      <div style={{ marginBottom: "30px" }}>
        <GlassCard title="Recent Performance Reviews" subtitle="Live feedback from team">
          {/* Divider/Filter for Team Leaders */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setTlFilter("All")}
              style={{ 
                padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600',
                background: tlFilter === "All" ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                color: tlFilter === "All" ? '#fff' : 'var(--text-secondary)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              All Reviews
            </button>
            {teamStatus.map(tl => (
              <button 
                key={tl.tl_id}
                onClick={() => setTlFilter(tl.tl_id)}
                style={{ 
                  padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600',
                  background: tlFilter === tl.tl_id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                  color: tlFilter === tl.tl_id ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {tl.tl_name}'s Team
              </button>
            ))}
          </div>

          <div style={{ marginTop: "15px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <th style={{ padding: "12px", fontSize: "11px", color: 'var(--text-tertiary)' }}>DATE</th>
                  <th style={{ padding: "12px", fontSize: "11px", color: 'var(--text-tertiary)' }}>LEADER</th>
                  <th style={{ padding: "12px", fontSize: "11px", color: 'var(--text-tertiary)' }}>EMPLOYEE</th>
                  <th style={{ padding: "12px", fontSize: "11px", color: 'var(--text-tertiary)' }}>SCORE</th>
                  <th style={{ padding: "12px", fontSize: "11px", color: 'var(--text-tertiary)' }}>FEEDBACK SYNOPSIS</th>
                </tr>
              </thead>
              <tbody>
                {reviews.filter(r => {
                  if (tlFilter === "All") return true;
                  // Divide by team leader (submitted_by_id)
                  return String(r.submitted_by_id) === String(tlFilter);
                }).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      <FaCommentAlt size={40} style={{ opacity: 0.1, marginBottom: '10px' }} />
                      <br />No performance records found for this selection.
                    </td>
                  </tr>
                ) : reviews.filter(r => {
                  if (tlFilter === "All") return true;
                  const rid = String(r.submitted_by_id || '').trim().toUpperCase();
                  const fid = String(tlFilter || '').trim().toUpperCase();
                  return rid === fid;
                }).slice(0, 15).map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: 'background 0.2s' }}>
                    <td style={{ padding: "16px 12px", fontSize: '12px' }}>
                      <div style={{ color: '#fff', fontWeight: '600' }}>{r.created_at?.split('T')[0] || r.review_date?.split('T')[0] || 'Recent'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{r.review_month} {r.review_year}</div>
                    </td>
                    <td style={{ padding: "16px 12px" }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(10,132,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#0a84ff', fontWeight: '800' }}>
                          {r.submitted_by_name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '13px' }}>{r.submitted_by_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "16px 12px" }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#fff' }}>{r.employee_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--accent-blue)' }}>#{r.employee_id}</div>
                    </td>
                    <td style={{ padding: "16px 12px" }}>
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 10px', borderRadius: '8px',
                        background: Number(r.score) >= 8 ? 'rgba(48,209,88,0.1)' : 'rgba(255,159,10,0.1)',
                        color: Number(r.score) >= 8 ? '#30d158' : '#ff9f0a',
                        fontWeight: '800', fontSize: '14px'
                      }}>
                        <FaStar size={10} /> {Number(r.score || 0).toFixed(1)}
                      </div>
                    </td>
                    <td style={{ padding: "16px 12px" }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-blue)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', textTransform: 'uppercase', marginBottom: '2px' }}>Leader Feedback</span>
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }} title={r.tl_feedback}>
                            "{r.tl_feedback || 'No comments provided'}"
                          </span>
                        </div>
                        <div style={{ background: 'rgba(48,209,88,0.02)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #30d158' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', textTransform: 'uppercase', marginBottom: '2px' }}>Employee Input</span>
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }} title={r.employee_self_input}>
                            "{r.employee_self_input || 'No input provided'}"
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <div className="grid-3">
        <GlassCard title="Export Reports">
          <button onClick={handleDownload} className="apple-btn" style={{ width: '100%' }}>
            <FaDownload /> Download Team CSV
          </button>
        </GlassCard>
        <GlassCard title="Quick Actions">
          <button className="apple-btn" style={{ width: '100%', background: 'rgba(255,255,255,0.08)' }}>
            📋 Manage Leaves ({pendingLeaves.length})
          </button>
        </GlassCard>
        <GlassCard title="System">
          <div style={{ textAlign: 'center', fontSize: '28px', color: analytics.department_health > 70 ? '#30d158' : '#ff9f0a' }}>
            {Number(analytics.department_health || 0).toFixed(0)}%
          </div>
          <div style={{ fontSize: '11px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Health Score</div>
        </GlassCard>
      </div>

      {/* OVERSIGHT MODAL */}
      {/* OVERSIGHT MODAL */}
      {selectedTL && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000
        }}>
          <div style={{
            width: "90%", maxWidth: "1200px", maxHeight: "90vh", overflow: 'auto',
            background: "#161618", border: "1px solid var(--border-light)", borderRadius: "24px",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
          }}>
            <div style={{
              padding: "24px 30px", borderBottom: "1px solid var(--border-light)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <h2 style={{ fontSize: "22px", fontWeight: "700" }}>
                👥 {selectedTL.tl_name} Team Overview
              </h2>
              <button onClick={() => setSelectedTL(null)} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,69,58,0.2)', color: '#fff' }}>
                <FaTimes size={20} />
              </button>
            </div>
            
            <div style={{ padding: "30px" }}>
              {oversightTeam.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                  No direct reports found for this leader.
                </div>
              ) : (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: '30px' }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-light)" }}>
                        <th style={{ padding: "16px 12px", fontSize: '13px', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: "16px 12px", fontSize: '13px', textAlign: 'left' }}>Role</th>
                        <th style={{ padding: "16px 12px", fontSize: '13px', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: "16px 12px", fontSize: '13px', textAlign: 'left' }}>Perf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oversightTeam.map((member: any) => (
                        <tr key={member.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "16px 12px" }}>{member.name}</td>
                          <td style={{ padding: "16px 12px" }}>{member.role || member.designation}</td>
                          <td style={{ padding: "16px 12px" }}>
                            <span style={{ 
                              color: (member.status || 'Active') === 'Active' ? '#30d158' : '#ff453a',
                              fontWeight: 600 
                            }}>
                              {member.status || 'Active'}
                            </span>
                          </td>
                          <td style={{ padding: "16px 12px" }}>
                            {member.performance_score !== null && member.performance_score !== undefined 
                              ? `${Number(member.performance_score).toFixed(1)}/5` 
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Team Specific Reviews */}
                  <div style={{ marginTop: '40px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FaStar color="#ffd60a" /> {selectedTL.tl_name} Performance History
                    </h3>
                    
                    {reviews.filter(r => {
                      const rid = String(r.submitted_by_id || '').trim().toUpperCase();
                      const fid = String(selectedTL.tl_id || '').trim().toUpperCase();
                      return rid === fid;
                    }).length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', color: 'var(--text-tertiary)' }}>
                        No performance reviews submitted by this leader yet.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                              <th style={{ padding: "12px", fontSize: "11px", textAlign: 'left' }}>Date</th>
                              <th style={{ padding: "12px", fontSize: "11px", textAlign: 'left' }}>Employee</th>
                              <th style={{ padding: "12px", fontSize: "11px", textAlign: 'left' }}>Score</th>
                              <th style={{ padding: "12px", fontSize: "11px", textAlign: 'left' }}>TL Feedback</th>
                              <th style={{ padding: "12px", fontSize: "11px", textAlign: 'left' }}>Emp Input</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reviews.filter(r => {
                              const rid = String(r.submitted_by_id || '').trim().toUpperCase();
                              const fid = String(selectedTL.tl_id || '').trim().toUpperCase();
                              return rid === fid;
                            }).map((r: any) => (
                              <tr key={r.id} style={{ borderBottom: "1px dotted rgba(255,255,255,0.05)" }}>
                                <td style={{ padding: "12px", fontSize: '13px' }}>{r.created_at?.split('T')[0] || r.review_date?.split('T')[0] || 'Recent'}</td>
                                <td style={{ padding: "12px", fontWeight: 600, fontSize: '13px' }}>{r.employee_name}</td>
                                <td style={{ padding: "12px" }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FaStar size={12} color="#ffd60a" />
                                    <span style={{ fontWeight: 800, fontSize: '13px' }}>{Number(r.score || 0).toFixed(1)}</span>
                                  </div>
                                </td>
                                <td style={{ padding: "12px", fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '250px' }}>
                                  <span title={r.tl_feedback}>
                                    {r.tl_feedback ? `"${r.tl_feedback.substring(0, 100)}${r.tl_feedback.length > 100 ? '...' : ''}"` : "—"}
                                  </span>
                                </td>
                                <td style={{ padding: "12px", fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '200px', fontStyle: 'italic' }}>
                                  <span title={r.employee_self_input}>
                                    {r.employee_self_input ? `"${r.employee_self_input.substring(0, 80)}${r.employee_self_input.length > 80 ? '...' : ''}"` : "No input"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Reusable components (unchanged)
const MetricBox = ({ label, val, color }: any) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{ fontSize: '18px', fontWeight: '800', color: color || '#fff' }}>
      {val}
    </div>
  </div>
);

const leadRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px',
  border: '1px solid var(--border-light)', marginBottom: '16px', cursor: 'pointer',
  transition: 'all 0.2s'
};

const leadAvatar: React.CSSProperties = {
  width: '48px', height: '48px', borderRadius: '16px', 
  background: 'linear-gradient(135deg, rgba(100,210,255,0.2), rgba(10,132,255,0.3))',
  display: 'flex', alignItems: 'center', justifyContent: 'center', 
  color: '#64d2ff', fontSize: '20px', fontWeight: 600
};

const alertItem: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px', 
  fontSize: '14px', padding: '8px 0'
};
