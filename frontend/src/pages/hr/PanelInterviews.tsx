import React, { useState, useEffect, useCallback } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
    getAllInterviews,
    getMyPanelInterviews,
    submitHRScorecard,
    InterviewRecord,
    ScorecardPayload
} from "../../services/interviewPanelService";
import {
    FaCalendarAlt, FaUserTie, FaClock, FaCheckCircle, FaStar,
    FaRegCommentDots, FaSearch, FaVideo, FaMapMarkerAlt,
    FaFilter, FaTimes, FaSpinner, FaBriefcase, FaListUl,
    FaClipboardCheck, FaThumbsUp, FaThumbsDown, FaPause
} from 'react-icons/fa';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'mine' | 'all' | 'completed';
type RoundFilter = 'all' | 'Technical' | 'HR' | 'Managerial' | 'culture-fit';

const ROUND_COLORS: Record<string, string> = {
    Technical:    '#0a84ff',
    HR:           '#bf5af2',
    Managerial:   '#ff9f0a',
    'culture-fit':'#30d158',
    default:      '#636366'
};

const RESULT_CONFIG: Record<string, { color: string; icon: JSX.Element; label: string }> = {
    pass:  { color: '#30d158', icon: <FaThumbsUp />,    label: 'Pass / Shortlisted' },
    fail:  { color: '#ff453a', icon: <FaThumbsDown />,  label: 'Reject / Fail' },
    hold:  { color: '#ff9f0a', icon: <FaPause />,        label: 'On Hold' }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
};

const formatTime = (t?: string) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const getRoundColor = (type: string) => ROUND_COLORS[type] || ROUND_COLORS.default;

// ─── Component ────────────────────────────────────────────────────────────────
export default function HRPanelInterviews() {
    const [activeTab, setActiveTab]           = useState<Tab>('mine');
    const [allInterviews, setAllInterviews]   = useState<InterviewRecord[]>([]);
    const [myInterviews, setMyInterviews]     = useState<InterviewRecord[]>([]);
    const [loading, setLoading]               = useState(true);
    const [selectedInterview, setSelectedInterview] = useState<InterviewRecord | null>(null);
    const [submitting, setSubmitting]         = useState(false);
    const [searchQuery, setSearchQuery]       = useState('');
    const [roundFilter, setRoundFilter]       = useState<RoundFilter>('all');

    const [scorecard, setScorecard] = useState<ScorecardPayload>({
        technical_score:      5,
        communication_score:  5,
        problem_solving_score:5,
        culture_fit_score:    5,
        overall_rating:       3,
        feedback:             '',
        result:               'pass',
        status:               'Completed'
    });

    // ── Data Loading ──────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [mine, all] = await Promise.all([
                getMyPanelInterviews(),
                getAllInterviews()
            ]);
            setMyInterviews(mine || []);
            setAllInterviews(all || []);
        } catch (err) {
            console.error('[HR Panel] Load failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Pre-fill scorecard when selecting interview
    useEffect(() => {
        if (selectedInterview) {
            setScorecard(prev => ({
                ...prev,
                feedback:             selectedInterview.feedback || '',
                overall_rating:       selectedInterview.overall_rating || 3,
                result:               selectedInterview.result || 'pass',
            }));
        }
    }, [selectedInterview]);

    // ── Derived Data ──────────────────────────────────────────────────────────
    const completed = allInterviews.filter(i => i.status?.toLowerCase() === 'completed' || i.result != null);
    const pending   = allInterviews.filter(i => i.status?.toLowerCase() !== 'completed' && i.result == null);

    const passCount = completed.filter(i => i.result === 'pass').length;
    const failCount = completed.filter(i => i.result === 'fail').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = allInterviews.filter(i => i.interview_date === todayStr).length;

    const tabInterviews: Record<Tab, InterviewRecord[]> = {
        mine:      myInterviews.filter(i => i.status?.toLowerCase() !== 'completed' && i.result == null),
        all:       pending,
        completed: completed
    };

    const displayed = tabInterviews[activeTab]
        .filter(i => roundFilter === 'all' || i.interview_type === roundFilter)
        .filter(i =>
            !searchQuery ||
            (i.candidate_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (i.job_title || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

    // ── Submit Scorecard ──────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInterview) return;
        setSubmitting(true);
        try {
            await submitHRScorecard(selectedInterview.id, scorecard);
            alert(`✅ Scorecard submitted for ${selectedInterview.candidate_name}. Decision: ${scorecard.result.toUpperCase()}`);
            setSelectedInterview(null);
            await loadData();
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="dashboard-container">
            <Header role="HR" title="Interview Panel" />

            {/* ── Stats Bar ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                {[
                    { label: "Today's Interviews",  value: todayCount,        color: '#0a84ff', icon: <FaCalendarAlt /> },
                    { label: 'Pending Evaluations', value: myInterviews.filter(i => !i.result).length, color: '#ff9f0a', icon: <FaClipboardCheck /> },
                    { label: 'Passed / Selected',   value: passCount,         color: '#30d158', icon: <FaThumbsUp /> },
                    { label: 'Rejected',             value: failCount,         color: '#ff453a', icon: <FaThumbsDown /> }
                ].map(stat => (
                    <GlassCard key={stat.label} style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${stat.color}22`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '22px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{stat.label}</div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
                {([
                    { key: 'mine',      label: 'Assigned to Me',     icon: <FaUserTie />,       count: tabInterviews.mine.length },
                    { key: 'all',       label: 'All Pending',        icon: <FaListUl />,        count: tabInterviews.all.length },
                    { key: 'completed', label: 'Completed',          icon: <FaCheckCircle />,   count: tabInterviews.completed.length }
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 18px', borderRadius: '10px', border: 'none',
                            cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                            transition: 'all 0.2s',
                            background: activeTab === tab.key ? 'rgba(191,90,242,0.15)' : 'transparent',
                            color: activeTab === tab.key ? '#bf5af2' : 'var(--text-secondary)'
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                        <span style={{ background: activeTab === tab.key ? 'rgba(191,90,242,0.3)' : 'rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1px 8px', fontSize: '11px' }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Filters Row ── */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '360px' }}>
                    <FaSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '13px' }} />
                    <input
                        className="apple-input"
                        placeholder="Search by candidate or role..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <FaFilter style={{ color: 'var(--text-tertiary)', fontSize: '12px' }} />
                    {(['all', 'Technical', 'HR', 'Managerial', 'culture-fit'] as RoundFilter[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setRoundFilter(f)}
                            style={{
                                padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                fontSize: '11px', fontWeight: '600', transition: 'all 0.2s',
                                background: roundFilter === f ? getRoundColor(f) + '33' : 'rgba(255,255,255,0.06)',
                                color: roundFilter === f ? getRoundColor(f) : 'var(--text-secondary)'
                            }}
                        >
                            {f === 'all' ? 'All Types' : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Interview Cards Grid ── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-tertiary)' }}>
                    <FaSpinner style={{ fontSize: '32px', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                    <p>Loading interview panel data...</p>
                </div>
            ) : displayed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-tertiary)' }}>
                    <FaUserTie style={{ fontSize: '48px', opacity: 0.15, marginBottom: '16px' }} />
                    <p style={{ fontSize: '16px', marginBottom: '6px' }}>No interviews in this view</p>
                    <p style={{ fontSize: '13px' }}>
                        {activeTab === 'mine'
                            ? 'No interviews are currently assigned to you as a panelist.'
                            : 'No pending interviews matching your filters.'}
                    </p>
                </div>
            ) : (
                <div className="grid-2">
                    {displayed.map(int => (
                        <InterviewCard
                            key={int.id}
                            interview={int}
                            isCompleted={activeTab === 'completed'}
                            onEvaluate={() => setSelectedInterview(int)}
                        />
                    ))}
                </div>
            )}

            {/* ── Scorecard Modal ── */}
            {selectedInterview && (
                <ScorecardModal
                    interview={selectedInterview}
                    scorecard={scorecard}
                    setScorecard={setScorecard}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                    onClose={() => setSelectedInterview(null)}
                />
            )}
        </div>
    );
}

// ─── Interview Card Sub-Component ─────────────────────────────────────────────
function InterviewCard({ interview: int, isCompleted, onEvaluate }: {
    interview: InterviewRecord;
    isCompleted: boolean;
    onEvaluate: () => void;
}) {
    const color = getRoundColor(int.interview_type);
    const resultCfg = int.result ? RESULT_CONFIG[int.result] : null;

    return (
        <GlassCard style={{
            borderLeft: `4px solid ${color}`,
            transition: 'transform 0.2s, box-shadow 0.2s',
        }}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${color}22`; }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: `${color}22`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                        {int.interview_mode === 'virtual' ? <FaVideo /> : <FaMapMarkerAlt />}
                    </div>
                    <div>
                        <div style={{ fontWeight: '800', fontSize: '11px', color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Round {int.round_number} • {int.interview_type}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                            {int.interview_mode === 'virtual' ? 'Virtual' : 'Onsite'}
                        </div>
                    </div>
                </div>
                {resultCfg ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: `${resultCfg.color}22`, color: resultCfg.color, fontSize: '11px', fontWeight: '700' }}>
                        {resultCfg.icon} {resultCfg.label}
                    </div>
                ) : (
                    <div style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', fontSize: '11px', fontWeight: '700' }}>
                        PENDING
                    </div>
                )}
            </div>

            {/* Candidate */}
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{int.candidate_name || 'Unknown Candidate'}</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaBriefcase style={{ fontSize: '10px' }} />
                {int.job_title || 'Position not specified'}
            </div>

            {/* Virtual meeting link */}
            {int.interview_mode === 'virtual' && int.meeting_link && (
                <div style={{ marginBottom: '14px', padding: '10px 12px', background: `${getRoundColor(int.interview_type)}11`, borderRadius: '8px', border: `1px solid ${getRoundColor(int.interview_type)}33` }}>
                    <div style={{ fontSize: '10px', color, fontWeight: '700', marginBottom: '4px' }}>MEETING LINK</div>
                    <a href={int.meeting_link} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#fff', textDecoration: 'underline', wordBreak: 'break-all' }}>
                        {int.meeting_link}
                    </a>
                </div>
            )}

            {/* Meta grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaCalendarAlt style={{ color, fontSize: '11px' }} />
                    {formatDate(int.interview_date)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaClock style={{ fontSize: '11px' }} />
                    {formatTime(int.interview_time)} • {int.duration_minutes || 60}m
                </div>
                {int.interviewer_names && (
                    <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaUserTie style={{ fontSize: '11px', color }} />
                        <span>Panelist: {int.interviewer_names}</span>
                    </div>
                )}
            </div>

            {/* Star rating display for completed */}
            {isCompleted && int.overall_rating && (
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <FaStar key={s} color={s <= int.overall_rating! ? '#ff9f0a' : 'rgba(255,255,255,0.1)'} />
                    ))}
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '6px' }}>Overall</span>
                </div>
            )}

            {/* CTA Button */}
            <button
                className="apple-btn"
                onClick={onEvaluate}
                style={{
                    width: '100%', fontSize: '12px',
                    background: isCompleted ? 'rgba(255,255,255,0.05)' : `${color}22`,
                    color: isCompleted ? 'var(--text-secondary)' : color,
                    border: `1px solid ${isCompleted ? 'rgba(255,255,255,0.08)' : color + '44'}`
                }}
            >
                <FaRegCommentDots />
                {isCompleted ? 'View Scorecard' : 'Open Evaluation Panel'}
            </button>
        </GlassCard>
    );
}

// ─── Scorecard Modal Sub-Component ────────────────────────────────────────────
function ScorecardModal({ interview: int, scorecard, setScorecard, submitting, onSubmit, onClose }: {
    interview: InterviewRecord;
    scorecard: ScorecardPayload;
    setScorecard: React.Dispatch<React.SetStateAction<ScorecardPayload>>;
    submitting: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}) {
    const color = getRoundColor(int.interview_type);

    const ScoreSlider = ({ field, label }: { field: keyof ScorecardPayload; label: string }) => {
        const val = Number(scorecard[field] ?? 5);
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={labelStyle}>{label}</label>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: val >= 7 ? '#30d158' : val >= 4 ? '#ff9f0a' : '#ff453a' }}>{val}<span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>/10</span></span>
                </div>
                <input
                    type="range" min="1" max="10"
                    value={val}
                    onChange={e => setScorecard(prev => ({ ...prev, [field]: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: color }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    <span>Weak</span><span>Excellent</span>
                </div>
            </div>
        );
    };

    return (
        <div style={overlayStyle}>
            <GlassCard style={{ width: '640px', maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', paddingBottom: '30px' }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                        <div style={{ fontSize: '11px', color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                            {int.interview_type} Round {int.round_number} Scorecard
                        </div>
                        <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>{int.candidate_name}</h2>
                        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{int.job_title}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', fontSize: '18px' }}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={onSubmit}>
                    {/* ── Score Sliders ── */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '18px', letterSpacing: '1px' }}>
                            Competency Assessment
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <ScoreSlider field="technical_score"       label="Technical Proficiency" />
                            <ScoreSlider field="communication_score"   label="Communication Skills" />
                            <ScoreSlider field="problem_solving_score" label="Problem Solving" />
                            <ScoreSlider field="culture_fit_score"     label="Culture Fit" />
                        </div>
                    </div>

                    {/* ── Overall Rating ── */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
                            Overall Rating
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <FaStar
                                    key={s}
                                    color={s <= scorecard.overall_rating ? '#ff9f0a' : 'rgba(255,255,255,0.1)'}
                                    style={{ cursor: 'pointer', fontSize: '32px', transition: 'transform 0.15s' }}
                                    onClick={() => setScorecard(prev => ({ ...prev, overall_rating: s }))}
                                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                                    onMouseLeave={e => (e.currentTarget.style.transform = '')}
                                />
                            ))}
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][scorecard.overall_rating]}
                        </div>
                    </div>

                    {/* ── Qualitative Feedback ── */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Detailed Feedback & Interview Notes</label>
                        <textarea
                            className="apple-input"
                            style={{ minHeight: '120px', marginTop: '6px', resize: 'vertical' }}
                            placeholder="Document key observations: strengths, concerns, specific answers, cultural alignment, compensation expectations..."
                            value={scorecard.feedback}
                            onChange={e => setScorecard(prev => ({ ...prev, feedback: e.target.value }))}
                        />
                    </div>

                    {/* ── Outcome Decision ── */}
                    <div style={{ marginBottom: '28px' }}>
                        <label style={labelStyle}>Final Selection Outcome</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                            {(['pass', 'hold', 'fail'] as const).map(r => {
                                const cfg = RESULT_CONFIG[r];
                                const isActive = scorecard.result === r;
                                return (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setScorecard(prev => ({ ...prev, result: r }))}
                                        style={{
                                            padding: '14px', borderRadius: '10px', border: `2px solid ${isActive ? cfg.color : 'rgba(255,255,255,0.08)'}`,
                                            background: isActive ? `${cfg.color}22` : 'rgba(255,255,255,0.03)',
                                            color: isActive ? cfg.color : 'var(--text-secondary)',
                                            cursor: 'pointer', fontWeight: '700', fontSize: '13px',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span style={{ fontSize: '20px' }}>{cfg.icon}</span>
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Actions ── */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="submit"
                            className="apple-btn"
                            disabled={submitting}
                            style={{ flex: 2, background: 'linear-gradient(135deg, #bf5af2, #0a84ff)', color: '#fff', fontWeight: '700', fontSize: '14px', opacity: submitting ? 0.6 : 1 }}
                        >
                            {submitting ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><FaCheckCircle /> Finalize & Submit Scorecard</>}
                        </button>
                        <button type="button" className="apple-btn" onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                            Cancel
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '10px', color: 'var(--text-tertiary)',
    fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px'
};

const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: '20px'
};
