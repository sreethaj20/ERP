import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaDownload, FaFilter, FaSearch, FaBriefcase, FaUserCheck } from "react-icons/fa";
import { getJobs, getCandidates, getScreeningLogs, getWorkforce } from "../../services/managerService";

// Sub-components moved to top for better HMR reliability
const FunnelStep = ({ label, val, color }: any) => (
  <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 'bold' }}>{label}</div>
    <div style={{ fontSize: '14px', fontWeight: '700', color }}>{val}</div>
  </div>
);

const RecruiterPerf = ({ name, id, hires, conversion, isActive, onClick }: any) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 15px',
      background: isActive ? 'rgba(10, 132, 255, 0.1)' : 'rgba(255,255,255,0.02)',
      borderRadius: '12px',
      border: `1px solid ${isActive ? 'var(--accent-blue)' : 'var(--border-light)'}`,
      cursor: 'pointer',
      transition: '0.2s'
    }}
  >
    <div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: isActive ? 'var(--accent-blue)' : 'inherit' }}>{name}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>ID: {id}</div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-green)' }}>{hires} Hires</div>
      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{conversion} Acc. Rate</div>
    </div>
  </div>
);

const stageColors: any = {
  'telephonic': '#64d2ff',
  'screening (zoom meeting)': '#0a84ff',
  'assignment': '#5856d6',
  'screening': '#0a84ff',
  'interview': '#ff9f0a',
  'final round': '#bf5af2',
  'selected': 'var(--accent-green)',
  'hired': 'var(--accent-green)',
  'rejected': '#ff453a'
};

const requisitionRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '20px',
  padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px',
  border: '1px solid var(--border-light)', marginBottom: '15px'
};

const channelRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)'
};

const stages = ["Telephonic", "Screening (Zoom Meeting)", "Assignment", "Interview", "Final Round", "Selected", "Hired", "Rejected"];

export default function RecruiterPipelineView() {
  const userId = sessionStorage.getItem('userId') || '';
  const userRole = sessionStorage.getItem('userRole') || 'Manager';
  const userName = sessionStorage.getItem('userName') || 'System User';

  const [pipeline, setPipeline] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"funnel" | "board">("funnel");
  const [efficiency, setEfficiency] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [filterRecruiterId, setFilterRecruiterId] = useState<string>("all");
  const [screeningLogs, setScreeningLogs] = useState<any[]>([]);
  const [employeeMap, setEmployeeMap] = useState<any>({});
  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
        setLoading(true);
        const [jobsRes, candRes, logsRes, empRes] = await Promise.all([
          getJobs(),
          getCandidates(),
          getScreeningLogs(),
          getWorkforce()
        ]);
        
        const logs = logsRes || [];
        setScreeningLogs(logs);
        
        const employees = Array.isArray(empRes) ? empRes : (empRes?.employees || []);
        const empMap: any = {};
        employees.forEach((e: any) => { empMap[e.employee_id || e.id] = e.name || `${e.first_name} ${e.last_name}`; });
        setEmployeeMap(empMap);

        const jobs = (jobsRes || []).filter((j: any) => j.status !== 'closed');
        const allCandidates = candRes || [];

        const enriched = jobs.map((j: any) => {
          const jobId = String(j.job_id || j.id);
          const jobCandidates = allCandidates.filter((c: any) =>
            String(c.job_id) === jobId ||
            String(c.id) === jobId ||
            (c.job && String(c.job).toLowerCase() === String(j.title).toLowerCase())
          );

          const getStage = (c: any) => (c.current_stage || c.stage || 'Screening').toLowerCase().trim();
          const isHired = (c: any) => getStage(c) === 'hired' || (c.application_status || '').toLowerCase() === 'hired';

          return {
            job: j.title,
            id: jobId,
            applicants: jobCandidates,
            applied: jobCandidates.length,
            screening: jobCandidates.filter((c: any) => {
              const s = getStage(c);
              return s.includes('screen') || s.includes('telephonic');
            }).length,
            shortlisted: jobCandidates.filter((c: any) => {
              const s = getStage(c);
              return s.includes('assign') || s.includes('select') || s.includes('interview') || s.includes('round') || isHired(c);
            }).length,
            interviewed: jobCandidates.filter((c: any) => {
              const s = getStage(c);
              return s.includes('interview') || s.includes('round');
            }).length,
            offered: jobCandidates.filter((c: any) => getStage(c).includes('selected') || isHired(c)).length,
            joined: jobCandidates.filter((c: any) => isHired(c)).length,
            conversion: jobCandidates.length > 0 ? ((jobCandidates.filter((c: any) => getStage(c).includes('selected') || isHired(c)).length / jobCandidates.length) * 100).toFixed(1) + '%' : '0%',
            owner: empMap[j.created_by] || j.created_by || 'Unknown Recruiter',
            created_by: j.created_by
          };
        });

        setPipeline(enriched);
        setAllCandidates(allCandidates);
        setAllJobs(jobsRes || []);

        const recruiters: any = {};
        allCandidates.forEach((c: any) => {
          const name = c.recruiter_name || empMap[c.created_by] || 'Unknown Recruiter';
          const rid = c.created_by || 'N/A';
          if (!recruiters[name]) recruiters[name] = { hires: 0, total: 0, id: rid };
          recruiters[name].total++;
          if ((c.current_stage || '').toLowerCase() === 'hired' || (c.application_status || '').toLowerCase() === 'hired') {
            recruiters[name].hires++;
          }
        });
        setEfficiency(Object.entries(recruiters).map(([name, data]: any) => ({
          name,
          id: data.id || 'N/A',
          hires: data.hires,
          conversion: data.total > 0 ? ((data.hires / data.total) * 100).toFixed(0) + '%' : '0%'
        })));

        const sourceMap: any = {};
        allCandidates.forEach((c: any) => {
          const s = c.source || 'Other';
          sourceMap[s] = (sourceMap[s] || 0) + 1;
        });
        const total = allCandidates.length;
        setChannels(Object.entries(sourceMap).map(([label, count]: any) => ({
          label,
          percent: total > 0 ? ((count / total) * 100).toFixed(0) + '%' : '0%'
        })));
    } catch (e) {
        console.error("Pipeline Pulse Load Failed:", e);
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

  const totalApplied = pipeline.reduce((acc: number, p: any) => acc + p.applied, 0);
  const totalInterviewed = pipeline.reduce((acc: number, p: any) => acc + p.interviewed, 0);
  const totalOffered = pipeline.reduce((acc: number, p: any) => acc + (p.offered || 0), 0);
  const totalJoined = pipeline.reduce((acc: number, p: any) => acc + (p.joined || 0), 0);

  const downloadFeedbackExcel = () => {
    const candidates = allCandidates.filter((c: any) =>
      filterRecruiterId === 'all' || c.created_by === filterRecruiterId
    );
    const headers = ["Candidate Name", "Email", "Job Title", "Recruiter", "Skill Score", "Comm Score", "Screening Notes", "Current Stage", "Application Date"];
    const rows = candidates.map((c: any) => {
      const log = screeningLogs.find((l: any) => l.candidate_id === (c.candidate_id || c.id));
      const job = allJobs.find((j: any) => String(j.job_id || j.id) === String(c.job_id));
      const recruiter = employeeMap[c.created_by] || c.recruiter_name || c.created_by || 'Unknown';

      return [
        `"${c.first_name} ${c.last_name}"`,
        `"${c.email}"`,
        `"${job?.title || 'Unknown'}"`,
        `"${recruiter}"`,
        log?.skill_match_score || 0,
        log?.comm_score || 0,
        `"${(log?.notes || '').replace(/"/g, '""')}"`,
        `"${c.current_stage}"`,
        `"${new Date(c.created_at).toLocaleDateString()}"`
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const filename = filterRecruiterId === 'all'
      ? `Full_Team_Feedback_${new Date().toISOString().split('T')[0]}.csv`
      : `Recruiter_${filterRecruiterId}_Feedback_${new Date().toISOString().split('T')[0]}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-container">
      <Header role="Manager" title="Strategic Sourcing" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: "30px" }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Talent Acquisition Pulse</h1>
            {userRole.toLowerCase() === 'recruiter' && (
              <div style={{
                background: 'var(--accent-blue-light)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--accent-blue)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{userName}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Employee ID: {userId}</span>
              </div>
            )}
          </div>
          <p className="subtitle">Global recruitment funnel monitoring and offer conversion analytics</p>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <button
            onClick={() => setViewMode('funnel')}
            style={{
              padding: '8px 16px', fontSize: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: viewMode === 'funnel' ? 'var(--accent-blue)' : 'transparent',
              color: viewMode === 'funnel' ? 'white' : 'var(--text-secondary)'
            }}
          >
            Funnel Overview
          </button>
          <button
            onClick={() => setViewMode('board')}
            style={{
              padding: '8px 16px', fontSize: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: viewMode === 'board' ? 'var(--accent-blue)' : 'transparent',
              color: viewMode === 'board' ? 'white' : 'var(--text-secondary)'
            }}
          >
            Live Pipeline Board
          </button>
        </div>
      </div>

      {viewMode === 'funnel' ? (
        <>
          <div className="grid-4" style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <GlassCard>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Applications</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{totalApplied}</div>
            </GlassCard>
            <GlassCard>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Interviews</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff9f0a' }}>{totalInterviewed}</div>
            </GlassCard>
            <GlassCard>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Offers Released</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-green)' }}>{totalOffered}</div>
            </GlassCard>
            <GlassCard>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Successful Hires</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#bf5af2' }}>{totalJoined}</div>
            </GlassCard>
          </div>

          <div className="grid-3" style={{ gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "30px" }}>
            {/* Main Pipeline Table */}
            <GlassCard
              title={filterRecruiterId === 'all' ? "Global Hiring Funnel" : "Filtered Recruiter Funnel"}
              subtitle={filterRecruiterId === 'all' ? "Live requisition status across departments" : `Showing active roles for Recruiter ID: ${filterRecruiterId}`}
            >
              <div style={{ marginTop: "15px" }}>
                {pipeline
                  .filter(p => filterRecruiterId === 'all' || p.created_by === filterRecruiterId)
                  .map((p, index) => (
                    <div key={index} style={requisitionRow}>
                      <div style={{ flex: 1.5 }}>
                        <div style={{ fontSize: '15px', fontWeight: '700' }}>{p.job}</div>
                        <div style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 'bold', margin: '2px 0' }}>Recruiter: {p.owner}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <span>{p.applied} Applicants</span>
                          <span>•</span>
                          <span>{p.conversion} Conv</span>
                        </div>
                      </div>

                      <div style={{ flex: 3.5, display: 'flex', gap: '8px' }}>
                        <FunnelStep label="Screen" val={p.screening} color="var(--text-secondary)" />
                        <FunnelStep label="S'listed" val={p.shortlisted} color="#bf5af2" />
                        <FunnelStep label="I'view" val={p.interviewed} color="#ff9f0a" />
                        <FunnelStep label="Offer" val={p.offered} color="#30d158" />
                        <FunnelStep label="Join" val={p.joined} color="#0a84ff" />
                      </div>

                      <button
                        className="apple-btn"
                        style={{ padding: '8px 12px', fontSize: '11px', background: 'rgba(255,255,255,0.05)' }}
                        onClick={() => {
                          setSelectedJob(p);
                        }}
                      >
                        Analysis
                      </button>
                    </div>
                  ))}
                {pipeline.filter(p => filterRecruiterId === 'all' || p.created_by === filterRecruiterId).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>No active requisitions found for this selection.</div>
                )}
              </div>
            </GlassCard>

            {/* Global Stats or Detail */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {selectedJob ? (
                <GlassCard title="Job Deep-Dive" subtitle={selectedJob.job}>
                  <div style={{ marginTop: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '10px' }}>Active Talent</div>
                    {selectedJob.applicants.map((c: any, ci: number) => {
                      const log = screeningLogs.find((l: any) => l.candidate_id === (c.candidate_id || c.id));
                      return (
                        <div key={ci} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border-light)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{c.first_name} {c.last_name}</div>
                            <span style={{ fontSize: '10px', color: stageColors[(c.current_stage || '').toLowerCase().trim()] || 'var(--accent-blue)' }}>{c.current_stage || 'Screening'}</span>
                          </div>

                          {log && (
                            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '11px' }}>
                              <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                                <span style={{ color: 'var(--accent-blue)' }}>Skill Match: <strong>{log.skill_match_score || 0}/10</strong></span>
                                <span style={{ color: 'var(--accent-orange)' }}>Comm: <strong>{log.comm_score || 0}/10</strong></span>
                              </div>
                              <div style={{ fontStyle: 'italic', color: 'var(--text-tertiary)' }}>"{log.notes || 'No notes provided'}"</div>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{c.total_experience_years}Y Exp</span>
                          </div>
                        </div>
                      );
                    })}
                    <button className="apple-btn" onClick={() => setSelectedJob(null)} style={{ width: '100%', marginTop: '10px', background: 'transparent', border: '1px solid var(--border-light)', fontSize: '11px' }}>Close Analysis</button>
                  </div>
                </GlassCard>
              ) : (
                <>
                  <GlassCard title="Hiring Efficiency" subtitle="Average conversion rate">
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--accent-blue)' }}>
                        {pipeline.length > 0 ? (pipeline.reduce((acc, p) => acc + parseFloat(p.conversion), 0) / pipeline.length).toFixed(1) : 0}%
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '5px' }}>
                        Across {pipeline.length} active requisitions
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard title="Interview Density" subtitle="Active assessment rounds">
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <div style={{ fontSize: '36px', fontWeight: '700', color: '#ff9f0a' }}>
                        {totalInterviewed}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '5px' }}>
                        Candidates in active evaluation
                      </div>
                    </div>
                  </GlassCard>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Board View */
        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', minHeight: '60vh' }}>
          {stages.map(stage => {
            const stageItems = allCandidates
              .filter((c: any) => {
                const s = (c.current_stage || c.stage || 'Screening').toLowerCase().trim();
                const target = stage.toLowerCase().trim();
                const matchesRecruiter = filterRecruiterId === 'all' || c.created_by === filterRecruiterId;

                // Robust matching
                let matchesStage = (s === target);
                if (target.includes('screen') && s.includes('screen')) matchesStage = true;
                if (target.includes('telephonic') && s.includes('telephonic')) matchesStage = true;

                return matchesStage && matchesRecruiter;
              })
              .sort((a: any, b: any) => (a.created_by || '').localeCompare(b.created_by || ''));

            return (
              <div key={stage} style={{ minWidth: '280px', flex: 1 }}>
                <div style={{
                  padding: '12px 15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '15px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderTop: `3px solid ${stageColors[stage.toLowerCase()]}`
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{stage}</span>
                  <span style={{ background: 'rgba(255,255,255,0.05)', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>{stageItems.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stageItems.map((c: any, i: number) => {
                    const recruiterName = employeeMap[c.created_by] || c.recruiter_name || 'Consultant';
                    return (
                      <GlassCard key={i} style={{ padding: '12px', border: filterRecruiterId === 'all' ? '1px solid rgba(10, 132, 255, 0.1)' : '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: '14px', fontWeight: '800' }}>{c.first_name} {c.last_name}</div>
                          <div style={{ fontSize: '8px', background: 'var(--accent-blue)', color: 'white', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {recruiterName.split(' ')[0]}
                          </div>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{c.job || 'Applied Position'}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', background: 'rgba(10,132,255,0.05)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{c.application_id}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{c.total_experience_years}Y Exp</span>
                        </div>
                      </GlassCard>
                    );
                  })}
                  {stageItems.length === 0 && <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: 'var(--text-tertiary)', border: '1px dashed var(--border-light)', borderRadius: '12px' }}>Empty</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid-3" style={{ marginTop: '30px' }}>
        <GlassCard title="Recruiter Efficiency" subtitle="Click to filter pipeline">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            <div
              onClick={() => setFilterRecruiterId('all')}
              style={{
                padding: '8px 15px',
                background: filterRecruiterId === 'all' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                fontSize: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Show All Team Pipelines
            </div>
            {efficiency.length > 0 ? efficiency.map((r, i) => (
              <RecruiterPerf
                key={i}
                name={r.name}
                id={r.id}
                hires={r.hires}
                conversion={r.conversion}
                isActive={filterRecruiterId === r.id}
                onClick={() => setFilterRecruiterId(r.id)}
              />
            )) : <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '10px' }}>No recruiter data yet</div>}
          </div>
        </GlassCard>

        <GlassCard title="Sourcing Channels" subtitle="Origin of high-quality talent">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {channels.length > 0 ? channels.map((c, i) => (
              <div key={i} style={channelRow}><span>{c.label}</span><span>{c.percent}</span></div>
            )) : <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '10px' }}>No sourcing data yet</div>}
          </div>
        </GlassCard>

        <GlassCard title="Actionable Intelligence" subtitle="Export recruitment data">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="apple-btn" style={{ width: '100%' }} onClick={downloadFeedbackExcel}>
              <FaDownload /> Export Feedback Report (CSV)
            </button>
            <button className="apple-btn" style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }}>
              <FaFilter /> Global Pipeline Report
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
