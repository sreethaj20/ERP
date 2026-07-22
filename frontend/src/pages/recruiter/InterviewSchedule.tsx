import React, { useState, useEffect, useCallback } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { scheduleInterview, getVisibleInterviews, getVisibleCandidates, getEmployees, getEmployeesForReference, updateCandidateStage, updateInterviewFeedback } from "../../utils/storage";
import {
    FaCalendarPlus, FaUserTie, FaClock, FaCheckCircle, FaStar, FaVideo,
    FaMapMarkerAlt, FaSearch, FaRegCommentDots, FaAward,
    FaLayerGroup, FaChartLine, FaThumbsUp, FaThumbsDown, FaPause,
    FaArrowRight, FaSpinner, FaTimes
} from 'react-icons/fa';

// ─── Config & Helpers ─────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
    display: 'block', padding: '2px 0', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase'
};
const ROUND_COLORS: Record<string, string> = {
    Technical:    '#0a84ff',
    Managerial:   '#ff9f0a',
    HR:           '#bf5af2',
    'culture-fit':'#30d158',
    default:      '#636366'
};
const getRoundColor = (type: string) => ROUND_COLORS[type] || ROUND_COLORS.default;

const formatDate = (d: string) => {
    if (!d) return '—';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }
    catch { return d; }
};

type ViewTab = 'schedule' | 'panel' | 'timeline';

// ─── Component ────────────────────────────────────────────────────────────────
export default function InterviewSchedule() {
    const userId   = sessionStorage.getItem('userId') || '';
    const userRole = sessionStorage.getItem('userRole') || 'Recruiter';

    const [activeTab, setActiveTab]               = useState<ViewTab>('schedule');
    const [isScheduling, setIsScheduling]         = useState(false);
    const [selectedInterview, setSelectedInterview] = useState<any>(null);
    const [searchQuery, setSearchQuery]           = useState('');
    const [employees, setEmployees]               = useState<any[]>([]);
    const [refreshKey, setRefreshKey]             = useState(0);

    const [form, setForm] = useState({
        candidate_id:    '',
        job_id:          '',
        round_number:    '1',
        interview_type:  'Technical',
        interviewer_id:  '',
        interview_mode:  'virtual',
        interview_date:  '',
        interview_time:  '10:00',
        duration_minutes:'60',
        meeting_link:    ''
    });

    const [evaluationForm, setEvaluationForm] = useState({
        technical_score:       5,
        communication_score:   5,
        problem_solving_score: 5,
        culture_fit_score:     5,
        overall_rating:        3,
        feedback:              '',
        result:                'pass',
        recording_url:         ''
    });

    // Load panelists
    useEffect(() => {
        const loadPanelists = async () => {
            const data = getEmployees();
            const refData = await getEmployeesForReference();
            const all = Array.from(new Map([...data, ...refData].map(item => [item.id || item.employee_id, item])).values());
            setEmployees(all.filter((e: any) => {
                const r = (e.role || '').toLowerCase().replace(/[_\s]+/g, '');
                return ['hr', 'teamleader', 'manager'].some(a => r.includes(a));
            }));
        };
        loadPanelists();
    }, []);

    // Pre-fill evaluation form
    useEffect(() => {
        if (selectedInterview) {
            setEvaluationForm({
                technical_score:       selectedInterview.technical_score || 5,
                communication_score:   selectedInterview.communication_score || 5,
                problem_solving_score: selectedInterview.problem_solving_score || 5,
                culture_fit_score:     selectedInterview.culture_fit_score || 5,
                overall_rating:        selectedInterview.overall_rating || 3,
                feedback:              selectedInterview.feedback || '',
                result:                selectedInterview.result || 'pass',
                recording_url:         selectedInterview.recording_url || ''
            });
        }
    }, [selectedInterview]);

    const candidates = getVisibleCandidates(userRole, userId).filter(
        (c: any) => ['Screening', 'Interview', 'Final Round'].includes(c.current_stage)
    );

    const allInterviews = getVisibleInterviews(userRole, userId);

    const isCompleted = (int: any) =>
        int.recruiter_reviewed ||
        (int.status && int.status.toLowerCase() === 'completed') ||
        int.result != null;

    const pendingInterviews = allInterviews.filter((int: any) =>
        !isCompleted(int) &&
        (int.candidate_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Grouped timeline (by candidate) ──────────────────────────────────────
    const candidateTimeline = React.useMemo(() => {
        const map: Record<string, { candidate: any; rounds: any[] }> = {};
        allInterviews.forEach((int: any) => {
            const key = String(int.candidate_id);
            if (!map[key]) {
                const cand = candidates.find((c: any) => String(c.candidate_id) === key || String(c.id) === key);
                map[key] = { candidate: cand || { name: int.candidate_name, candidate_id: key }, rounds: [] };
            }
            map[key].rounds.push(int);
        });
        return Object.values(map).map(item => ({
            ...item,
            rounds: item.rounds.sort((a, b) => (a.round_number || 1) - (b.round_number || 1))
        }));
    }, [allInterviews, candidates, refreshKey]);

    // ── Panel status (by panelist) ────────────────────────────────────────────
    const panelistSummary = React.useMemo(() => {
        const map: Record<string, { emp: any; pending: number; completed: number; interviews: any[] }> = {};
        allInterviews.forEach((int: any) => {
            if (!int.interviewer_id) return;
            const key = String(int.interviewer_id);
            if (!map[key]) {
                const emp = employees.find((e: any) => String(e.employee_id) === key || String(e.id) === key);
                map[key] = { emp: emp || { name: int.interviewer_names || key }, pending: 0, completed: 0, interviews: [] };
            }
            if (isCompleted(int)) map[key].completed++;
            else map[key].pending++;
            map[key].interviews.push(int);
        });
        return Object.values(map);
    }, [allInterviews, employees, refreshKey]);

    // ── Schedule Handler ──────────────────────────────────────────────────────
    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.candidate_id || !form.interview_date) return alert('Please fill required fields (Candidate & Date)');
        const selectedCand = candidates.find((c: any) => c.candidate_id === form.candidate_id || c.id === form.candidate_id);
        try {
            await scheduleInterview({
                ...form,
                candidate_id:  String(form.candidate_id),
                interviewer_id: String(form.interviewer_id),
                job_id:         String(selectedCand?.job_id || ''),
                candidate_name: selectedCand?.name || 'Unknown Candidate',
                status:         'scheduled'
            });
            setIsScheduling(false);
            setRefreshKey(k => k + 1);
            alert('✅ Interview Round Scheduled');
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Failed to schedule interview round.');
        }
    };

    // ── Evaluation Handler ────────────────────────────────────────────────────
    const handleSaveEvaluation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInterview) return;
        const interviewId = selectedInterview.interview_id || selectedInterview.id;
        await updateInterviewFeedback(interviewId, { ...evaluationForm, status: 'completed', recruiter_reviewed: true });
        alert(`✅ Evaluation saved for ${selectedInterview.candidate_name}. Result: ${evaluationForm.result.toUpperCase()}`);
        if (evaluationForm.result === 'fail') await updateCandidateStage(selectedInterview.candidate_id, 'Rejected');
        setSelectedInterview(null);
        setRefreshKey(k => k + 1);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="dashboard-container">
            <Header role="Recruiter" title="Interview Management Hub" />

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
                {([
                    { key: 'schedule', label: 'Schedule Rounds',   icon: <FaCalendarPlus /> },
                    { key: 'panel',    label: 'Panel Tracker',     icon: <FaUserTie /> },
                    { key: 'timeline', label: 'Candidate Timeline', icon: <FaChartLine /> }
                ] as const).map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '8px 16px', borderRadius: '10px', border: 'none',
                            cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s',
                            background: activeTab === tab.key ? 'rgba(10,132,255,0.15)' : 'transparent',
                            color: activeTab === tab.key ? '#0a84ff' : 'var(--text-secondary)'
                        }}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ══════════ TAB: SCHEDULE ROUNDS ══════════ */}
            {activeTab === 'schedule' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
                            <FaSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input className="apple-input" placeholder="Search interviews by candidate..."
                                style={{ paddingLeft: '44px' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <button className="apple-btn" onClick={() => setIsScheduling(!isScheduling)}
                            style={{ background: isScheduling ? 'rgba(255,255,255,0.05)' : 'rgba(10,132,255,0.15)', color: isScheduling ? 'var(--text-secondary)' : '#0a84ff' }}>
                            <FaCalendarPlus /> {isScheduling ? 'Cancel' : 'Schedule Round'}
                        </button>
                    </div>

                    {isScheduling && (
                        <GlassCard title="Configure New Interview Round" style={{ marginBottom: '28px', borderLeft: '4px solid #0a84ff' }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', padding: '10px', background: 'rgba(10,132,255,0.05)', borderRadius: '8px', borderLeft: '3px solid #0a84ff' }}>
                                💡 <strong>Guidance:</strong> Technical rounds (1-2) → assign to Team Leaders or Managers. Final HR round → assign to HR panelists.
                            </p>
                            <form onSubmit={handleSchedule} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Select Candidate *</label>
                                    <select className="apple-input" value={form.candidate_id} onChange={e => setForm(f => ({ ...f, candidate_id: e.target.value }))}>
                                        <option value="">Choose candidate...</option>
                                        {candidates.map((c: any, i: number) => (
                                            <option key={c.candidate_id || String(c.id) || i} value={c.candidate_id || String(c.id)}>
                                                {c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim()} ({c.current_stage})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Round #</label>
                                    <input type="number" className="apple-input" value={form.round_number} onChange={e => setForm(f => ({ ...f, round_number: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Type</label>
                                    <select className="apple-input" value={form.interview_type} onChange={e => setForm(f => ({ ...f, interview_type: e.target.value }))}>
                                        <option value="Technical">Technical</option>
                                        <option value="Managerial">Managerial</option>
                                        <option value="HR">HR Round</option>
                                        <option value="culture-fit">Culture Fit</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Interviewer (Panelist)</label>
                                    <select className="apple-input" value={form.interviewer_id} onChange={e => setForm(f => ({ ...f, interviewer_id: e.target.value }))}>
                                        <option value="">Select panelist...</option>
                                        {employees.map((e: any, i: number) => (
                                            <option key={e.employee_id || String(e.id) || i} value={e.employee_id || String(e.id)}>
                                                {e.name} ({e.employee_id || e.id}) — {e.designation || e.role}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Date *</label>
                                    <input type="date" className="apple-input" value={form.interview_date} onChange={e => setForm(f => ({ ...f, interview_date: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Time</label>
                                    <input type="time" className="apple-input" value={form.interview_time} onChange={e => setForm(f => ({ ...f, interview_time: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Duration (min)</label>
                                    <input type="number" className="apple-input" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Mode</label>
                                    <select className="apple-input" value={form.interview_mode} onChange={e => setForm(f => ({ ...f, interview_mode: e.target.value }))}>
                                        <option value="virtual">Virtual (Video)</option>
                                        <option value="onsite">Onsite (Office)</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Meeting Link (Virtual)</label>
                                    <input className="apple-input" placeholder="https://zoom.us/j/..." value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} />
                                </div>
                                <div style={{ gridColumn: 'span 4' }}>
                                    <button type="submit" className="apple-btn" style={{ width: '100%', background: 'linear-gradient(135deg, #0a84ff, #30d158)', color: '#fff', fontWeight: '700' }}>
                                        <FaCalendarPlus /> Send Calendar Invite & Schedule
                                    </button>
                                </div>
                            </form>
                        </GlassCard>
                    )}

                    {/* Interview Cards */}
                    <div className="grid-2">
                        {pendingInterviews.map((int: any, i: number) => {
                            const color = getRoundColor(int.interview_type);
                            return (
                                <GlassCard key={int.interview_id || int.id || i}
                                    style={{ borderLeft: `4px solid ${color}`, transition: 'transform 0.2s' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: 34, height: 34, borderRadius: '10px', background: `${color}22`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FaClock />
                                            </div>
                                            <div style={{ fontWeight: '800', fontSize: '12px', color, textTransform: 'uppercase' }}>
                                                Round {int.round_number} • {int.interview_type}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                                            {int.interview_mode === 'virtual' ? <><FaVideo /> virtual</> : <><FaMapMarkerAlt /> onsite</>}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>{int.candidate_name}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <FaUserTie style={{ color, fontSize: '10px' }} />
                                            <span>{employees.find((e: any) => String(e.id) === String(int.interviewer_id) || String(e.employee_id) === String(int.interviewer_id))?.name || int.interviewer_id || 'Not Assigned'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <FaCalendarPlus style={{ fontSize: '10px' }} />
                                            <span>{int.interview_date} @ {int.interview_time}</span>
                                        </div>
                                    </div>
                                    <button className="apple-btn"
                                        style={{ width: '100%', background: `${color}18`, color, fontSize: '11px', border: `1px solid ${color}33` }}
                                        onClick={() => setSelectedInterview(int)}>
                                        <FaRegCommentDots /> Score Card & Feedback
                                    </button>
                                </GlassCard>
                            );
                        })}
                    </div>

                    {pendingInterviews.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                            <FaCalendarPlus style={{ fontSize: '40px', opacity: 0.15, marginBottom: '14px' }} />
                            <p>No pending interview rounds. Schedule one above.</p>
                        </div>
                    )}
                </>
            )}

            {/* ══════════ TAB: PANEL TRACKER ══════════ */}
            {activeTab === 'panel' && (
                <>
                    <div style={{ marginBottom: '20px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Track the status of each panelist's scorecard submissions across all active rounds.
                        </p>
                    </div>

                    {panelistSummary.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                            <FaUserTie style={{ fontSize: '40px', opacity: 0.15, marginBottom: '14px' }} />
                            <p>No panelists assigned yet. Schedule rounds from the Schedule tab.</p>
                        </div>
                    ) : (
                        <div className="grid-2">
                            {panelistSummary.map((panel, i) => {
                                const completionRate = panel.interviews.length > 0 ? Math.round((panel.completed / panel.interviews.length) * 100) : 0;
                                return (
                                    <GlassCard key={i} style={{ borderLeft: `4px solid ${completionRate === 100 ? '#30d158' : completionRate > 50 ? '#ff9f0a' : '#0a84ff'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <div>
                                                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                                                    {panel.emp.name || panel.emp.employee_id}
                                                </h3>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    {panel.emp.designation || panel.emp.role || 'Panelist'}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '24px', fontWeight: '800', color: completionRate === 100 ? '#30d158' : '#ff9f0a' }}>{completionRate}%</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Completion</div>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '6px', marginBottom: '14px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${completionRate}%`, background: completionRate === 100 ? '#30d158' : '#0a84ff', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                                        </div>

                                        {/* Stats */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                                            <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(10,132,255,0.08)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0a84ff' }}>{panel.interviews.length}</div>
                                                <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>Total</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,159,10,0.08)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#ff9f0a' }}>{panel.pending}</div>
                                                <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>Pending</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(48,209,88,0.08)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#30d158' }}>{panel.completed}</div>
                                                <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>Done</div>
                                            </div>
                                        </div>

                                        {/* Individual round badges */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {panel.interviews.map((int: any, j: number) => {
                                                const done = isCompleted(int);
                                                const color = getRoundColor(int.interview_type);
                                                return (
                                                    <div key={j} style={{
                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '600',
                                                        background: done ? `${color}22` : 'rgba(255,255,255,0.05)',
                                                        color: done ? color : 'var(--text-tertiary)',
                                                        border: `1px solid ${done ? color + '44' : 'rgba(255,255,255,0.06)'}`
                                                    }}>
                                                        {done ? <FaCheckCircle style={{ marginRight: '4px' }} /> : null}
                                                        Rd.{int.round_number} {int.candidate_name?.split(' ')[0]}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </GlassCard>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ══════════ TAB: CANDIDATE TIMELINE ══════════ */}
            {activeTab === 'timeline' && (
                <>
                    <div style={{ marginBottom: '20px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Visual interview progression for each candidate across all rounds.
                        </p>
                    </div>

                    {candidateTimeline.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                            <FaChartLine style={{ fontSize: '40px', opacity: 0.15, marginBottom: '14px' }} />
                            <p>No interview timelines to display.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {candidateTimeline.map((item, i) => {
                                const passedAll = item.rounds.every((r: any) => r.result === 'pass');
                                const hasRejection = item.rounds.some((r: any) => r.result === 'fail');

                                return (
                                    <GlassCard key={i} style={{ borderLeft: `4px solid ${hasRejection ? '#ff453a' : passedAll ? '#30d158' : '#0a84ff'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <div>
                                                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '2px' }}>
                                                    {item.candidate?.name || `${item.candidate?.first_name || ''} ${item.candidate?.last_name || ''}`.trim() || 'Unknown'}
                                                </h3>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    {item.rounds.length} round{item.rounds.length !== 1 ? 's' : ''} scheduled
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                                background: hasRejection ? 'rgba(255,69,58,0.15)' : passedAll && item.rounds.length > 0 ? 'rgba(48,209,88,0.15)' : 'rgba(10,132,255,0.12)',
                                                color: hasRejection ? '#ff453a' : passedAll && item.rounds.length > 0 ? '#30d158' : '#0a84ff'
                                            }}>
                                                {hasRejection ? '❌ Rejected' : passedAll && item.rounds.length > 0 ? '✅ Passed All Rounds' : '🔄 In Progress'}
                                            </div>
                                        </div>

                                        {/* Round Timeline */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0', overflowX: 'auto', paddingBottom: '4px' }}>
                                            {item.rounds.map((round: any, j: number) => {
                                                const color = getRoundColor(round.interview_type);
                                                const done  = isCompleted(round);
                                                const resultColor = round.result === 'pass' ? '#30d158' : round.result === 'fail' ? '#ff453a' : round.result === 'hold' ? '#ff9f0a' : color;

                                                return (
                                                    <React.Fragment key={j}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
                                                            {/* Round bubble */}
                                                            <div style={{
                                                                width: 44, height: 44, borderRadius: '50%',
                                                                background: done ? `${resultColor}22` : 'rgba(255,255,255,0.06)',
                                                                border: `2px solid ${done ? resultColor : 'rgba(255,255,255,0.12)'}`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                color: done ? resultColor : 'var(--text-tertiary)',
                                                                fontSize: '16px', fontWeight: '800', marginBottom: '8px',
                                                                transition: 'all 0.3s'
                                                            }}>
                                                                {done ? (round.result === 'pass' ? <FaThumbsUp /> : round.result === 'fail' ? <FaThumbsDown /> : <FaPause />) : String(j + 1)}
                                                            </div>
                                                            <div style={{ fontSize: '10px', fontWeight: '700', color: done ? resultColor : 'var(--text-tertiary)', textAlign: 'center', maxWidth: '90px' }}>
                                                                {round.interview_type}
                                                            </div>
                                                            <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                                                                {formatDate(round.interview_date)}
                                                            </div>
                                                        </div>

                                                        {/* Connector arrow */}
                                                        {j < item.rounds.length - 1 && (
                                                            <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.08)', margin: '0 4px', marginTop: '-16px', minWidth: '20px', position: 'relative' }}>
                                                                <FaArrowRight style={{ position: 'absolute', right: '-6px', top: '-6px', color: 'rgba(255,255,255,0.2)', fontSize: '12px' }} />
                                                            </div>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    </GlassCard>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── Evaluation Modal ── */}
            {selectedInterview && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
                    <GlassCard style={{ width: '600px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', paddingBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <div style={{ fontSize: '10px', color: '#0a84ff', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    Evaluation — Round {selectedInterview.round_number}
                                </div>
                                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{selectedInterview.candidate_name}</h2>
                            </div>
                            <button onClick={() => setSelectedInterview(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}><FaTimes /></button>
                        </div>

                        <form onSubmit={handleSaveEvaluation}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                                {[
                                    { key: 'technical_score',       label: 'Technical Score' },
                                    { key: 'communication_score',   label: 'Communication' },
                                    { key: 'culture_fit_score',     label: 'Culture Fit' }
                                ].map(({ key, label }) => {
                                    const val = (evaluationForm as any)[key];
                                    return (
                                        <div key={key}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <label style={labelStyle}>{label}</label>
                                                <span style={{ fontWeight: '800', color: val >= 7 ? '#30d158' : val >= 4 ? '#ff9f0a' : '#ff453a', fontSize: '13px' }}>{val}/10</span>
                                            </div>
                                            <input type="range" min="1" max="10" value={val}
                                                onChange={e => setEvaluationForm(f => ({ ...f, [key]: parseInt(e.target.value) }))}
                                                style={{ width: '100%', accentColor: '#0a84ff' }} />
                                        </div>
                                    );
                                })}

                                <div>
                                    <label style={labelStyle}>Overall Rating</label>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <FaStar key={s} color={s <= evaluationForm.overall_rating ? '#ff9f0a' : 'rgba(255,255,255,0.1)'}
                                                style={{ cursor: 'pointer', fontSize: '22px' }}
                                                onClick={() => setEvaluationForm(f => ({ ...f, overall_rating: s }))} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Detailed Feedback</label>
                                <textarea className="apple-input" style={{ minHeight: '100px', marginTop: '6px' }}
                                    placeholder="Document strengths, concerns, specific answers, and recommendations..."
                                    value={evaluationForm.feedback}
                                    onChange={e => setEvaluationForm(f => ({ ...f, feedback: e.target.value }))} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Recommendation</label>
                                    <select className="apple-input" style={{ marginTop: '6px' }} value={evaluationForm.result}
                                        onChange={e => setEvaluationForm(f => ({ ...f, result: e.target.value }))}>
                                        <option value="pass">Shortlist / Pass</option>
                                        <option value="hold">Keep on Hold</option>
                                        <option value="fail">Reject / Fail</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Recording URL</label>
                                    <input className="apple-input" style={{ marginTop: '6px' }} placeholder="https://..." value={evaluationForm.recording_url}
                                        onChange={e => setEvaluationForm(f => ({ ...f, recording_url: e.target.value }))} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" className="apple-btn"
                                    style={{ flex: 2, background: 'linear-gradient(135deg, #0a84ff, #30d158)', color: '#fff', fontWeight: '700' }}>
                                    <FaCheckCircle /> Save Evaluation Card
                                </button>
                                <button type="button" className="apple-btn" onClick={() => setSelectedInterview(null)}
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>Cancel</button>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
