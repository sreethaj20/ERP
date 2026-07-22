import React, { useState, useEffect, useCallback } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { submitRecruiterScorecard, ScorecardPayload } from "../../services/interviewPanelService";
import api from "../../api/apiClient";
import {
    FaCalendarAlt, FaUserTie, FaClock, FaStar, FaRegCommentDots,
    FaVideo, FaMapMarkerAlt, FaCheckCircle, FaSpinner,
    FaBriefcase, FaThumbsUp, FaThumbsDown, FaPause, FaTimes, FaSearch
} from 'react-icons/fa';

// ─── Types ────────────────────────────────────────────────────────────────────
const RESULT_CONFIG: Record<string, { color: string; icon: JSX.Element; label: string }> = {
    pass: { color: '#30d158', icon: <FaThumbsUp />,   label: 'Pass / Recommend' },
    fail: { color: '#ff453a', icon: <FaThumbsDown />, label: 'Do Not Recommend' },
    hold: { color: '#ff9f0a', icon: <FaPause />,       label: 'Hold for Review' }
};

const formatDate = (d: string) => {
    if (!d) return '—';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
};

const formatTime = (t?: string) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PanelInterviews() {
    const employeeId = sessionStorage.getItem('employeeId') || '';

    const [interviews, setInterviews]             = useState<any[]>([]);
    const [loading, setLoading]                   = useState(true);
    const [selectedInterview, setSelectedInterview] = useState<any>(null);
    const [submitting, setSubmitting]             = useState(false);
    const [searchQuery, setSearchQuery]           = useState('');
    const [activeTab, setActiveTab]               = useState<'pending' | 'completed'>('pending');

    const [scorecard, setScorecard] = useState<ScorecardPayload>({
        technical_score:       5,
        communication_score:   5,
        problem_solving_score: 5,
        overall_rating:        3,
        feedback:              '',
        result:                'pass',
        status:                'Completed'
    });

    // ── Load Data ─────────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('recruiter/interviews');
            const all = (res.data || []).filter((i: any) => String(i.interviewer_id) === String(employeeId));
            setInterviews(all);
        } catch (err) {
            console.error('[TL Panel] Failed:', err);
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => { loadData(); }, [loadData]);

    // Pre-fill scorecard
    useEffect(() => {
        if (selectedInterview) {
            setScorecard(prev => ({
                ...prev,
                feedback:       selectedInterview.feedback || '',
                overall_rating: selectedInterview.overall_rating || 3,
                result:         selectedInterview.result || 'pass'
            }));
        }
    }, [selectedInterview]);

    // ── Derived Data ──────────────────────────────────────────────────────────
    const pending   = interviews.filter(i => i.status?.toLowerCase() !== 'completed' && !i.result);
    const completed = interviews.filter(i => i.status?.toLowerCase() === 'completed' || i.result);

    const displayed = (activeTab === 'pending' ? pending : completed)
        .filter(i => !searchQuery || (i.candidate_name || '').toLowerCase().includes(searchQuery.toLowerCase()));

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInterview) return;
        setSubmitting(true);
        try {
            await submitRecruiterScorecard(selectedInterview.id, scorecard);
            alert(`✅ Feedback submitted for ${selectedInterview.candidate_name}. Result: ${scorecard.result.toUpperCase()}`);
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
            <Header role="Team Leader" title="My Interview Panel" />

            {/* Description */}
            <div style={{ marginBottom: '24px', padding: '14px 18px', background: 'rgba(10,132,255,0.07)', borderRadius: '10px', borderLeft: '3px solid #0a84ff' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                    🎯 <strong>Panel Role:</strong> You have been assigned as an interviewer for the following candidates. Complete your technical or managerial evaluations and submit scorecards to help the recruitment team make informed hiring decisions.
                </p>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Assigned',   value: interviews.length, color: '#0a84ff' },
                    { label: 'Pending Review',   value: pending.length,    color: '#ff9f0a' },
                    { label: 'Evaluations Done', value: completed.length,  color: '#30d158' }
                ].map(s => (
                    <GlassCard key={s.label} style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{s.label}</div>
                    </GlassCard>
                ))}
            </div>

            {/* Tabs + Search */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
                    {[
                        { key: 'pending',   label: `Pending (${pending.length})` },
                        { key: 'completed', label: `Completed (${completed.length})` }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            style={{
                                padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                fontSize: '12px', fontWeight: '600', transition: 'all 0.2s',
                                background: activeTab === tab.key ? 'rgba(10,132,255,0.15)' : 'transparent',
                                color: activeTab === tab.key ? '#0a84ff' : 'var(--text-secondary)'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
                    <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '12px' }} />
                    <input
                        className="apple-input"
                        placeholder="Search by candidate..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '36px' }}
                    />
                </div>
            </div>

            {/* Cards */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-tertiary)' }}>
                    <FaSpinner style={{ fontSize: '32px', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                    <p>Loading your assigned interviews...</p>
                </div>
            ) : displayed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-tertiary)' }}>
                    <FaUserTie style={{ fontSize: '48px', opacity: 0.15, marginBottom: '16px' }} />
                    <p style={{ fontSize: '15px' }}>
                        {activeTab === 'pending' ? 'No pending interviews assigned to you.' : 'No completed evaluations yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid-2">
                    {displayed.map((int: any) => (
                        <TLInterviewCard
                            key={int.id}
                            interview={int}
                            isCompleted={activeTab === 'completed'}
                            onEvaluate={() => setSelectedInterview(int)}
                        />
                    ))}
                </div>
            )}

            {/* Scorecard Modal */}
            {selectedInterview && (
                <TLScorecardModal
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

// ─── Card Sub-Component ───────────────────────────────────────────────────────
function TLInterviewCard({ interview: int, isCompleted, onEvaluate }: {
    interview: any;
    isCompleted: boolean;
    onEvaluate: () => void;
}) {
    const resultCfg = int.result ? RESULT_CONFIG[int.result] : null;

    return (
        <GlassCard style={{
            borderLeft: `4px solid ${resultCfg ? resultCfg.color : '#0a84ff'}`,
            transition: 'transform 0.2s'
        }}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
        >
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {int.interview_mode === 'virtual' ? <FaVideo /> : <FaMapMarkerAlt />}
                    </div>
                    <div>
                        <div style={{ fontWeight: '800', fontSize: '11px', color: '#0a84ff', textTransform: 'uppercase' }}>
                            Round {int.round_number} • {int.interview_type}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{int.interview_mode}</div>
                    </div>
                </div>
                {resultCfg ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: `${resultCfg.color}22`, color: resultCfg.color, fontSize: '10px', fontWeight: '700' }}>
                        {resultCfg.icon} {resultCfg.label}
                    </div>
                ) : (
                    <div style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(10,132,255,0.12)', color: '#0a84ff', fontSize: '10px', fontWeight: '700' }}>
                        SCHEDULED
                    </div>
                )}
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{int.candidate_name || 'Unknown'}</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaBriefcase style={{ fontSize: '10px' }} /> {int.job_title || 'Position not specified'}
            </div>

            {/* Meeting link */}
            {int.meeting_link && (
                <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'rgba(10,132,255,0.08)', borderRadius: '8px', border: '1px solid rgba(10,132,255,0.2)' }}>
                    <div style={{ fontSize: '9px', color: '#0a84ff', fontWeight: '700', marginBottom: '3px' }}>MEETING LINK</div>
                    <a href={int.meeting_link} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#fff', textDecoration: 'underline', wordBreak: 'break-all' }}>{int.meeting_link}</a>
                </div>
            )}

            {/* Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaCalendarAlt style={{ fontSize: '10px', color: '#0a84ff' }} /> {formatDate(int.interview_date)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaClock style={{ fontSize: '10px' }} /> {formatTime(int.interview_time)} • {int.duration_minutes || 60}m
                </div>
            </div>

            {/* Star rating if completed */}
            {isCompleted && int.overall_rating && (
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                    {[1, 2, 3, 4, 5].map(s => <FaStar key={s} color={s <= int.overall_rating ? '#ff9f0a' : 'rgba(255,255,255,0.1)'} />)}
                </div>
            )}

            <button
                className="apple-btn"
                onClick={onEvaluate}
                style={{
                    width: '100%', fontSize: '12px',
                    background: isCompleted ? 'rgba(255,255,255,0.05)' : 'rgba(10,132,255,0.12)',
                    color: isCompleted ? 'var(--text-tertiary)' : '#0a84ff'
                }}
            >
                <FaRegCommentDots />
                {isCompleted ? 'View Submitted Scorecard' : 'Start Evaluation'}
            </button>
        </GlassCard>
    );
}

// ─── Scorecard Modal Sub-Component ────────────────────────────────────────────
function TLScorecardModal({ interview: int, scorecard, setScorecard, submitting, onSubmit, onClose }: {
    interview: any;
    scorecard: ScorecardPayload;
    setScorecard: React.Dispatch<React.SetStateAction<ScorecardPayload>>;
    submitting: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}) {
    const ScoreSlider = ({ field, label }: { field: keyof ScorecardPayload; label: string }) => {
        const val = Number(scorecard[field] ?? 5);
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={labelStyle}>{label}</label>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: val >= 7 ? '#30d158' : val >= 4 ? '#ff9f0a' : '#ff453a' }}>{val}/10</span>
                </div>
                <input type="range" min="1" max="10" value={val}
                    onChange={e => setScorecard(prev => ({ ...prev, [field]: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: '#0a84ff' }} />
            </div>
        );
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
            <GlassCard style={{ width: '600px', maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', paddingBottom: '30px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                        <div style={{ fontSize: '10px', color: '#0a84ff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                            Technical Evaluation — Round {int.round_number}
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{int.candidate_name}</h2>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{int.job_title}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}><FaTimes /></button>
                </div>

                <form onSubmit={onSubmit}>
                    {/* Scores */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '16px' }}>Competency Scores</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <ScoreSlider field="technical_score"       label="Technical Proficiency" />
                            <ScoreSlider field="communication_score"   label="Communication" />
                            <ScoreSlider field="problem_solving_score" label="Problem Solving" />
                        </div>
                    </div>

                    {/* Overall Stars */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '18px', marginBottom: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px' }}>Overall Recommendation</div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <FaStar key={s} color={s <= scorecard.overall_rating ? '#ff9f0a' : 'rgba(255,255,255,0.1)'}
                                    style={{ cursor: 'pointer', fontSize: '30px', transition: 'transform 0.15s' }}
                                    onClick={() => setScorecard(prev => ({ ...prev, overall_rating: s }))}
                                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                                    onMouseLeave={e => (e.currentTarget.style.transform = '')} />
                            ))}
                        </div>
                    </div>

                    {/* Feedback */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Interview Notes & Observations</label>
                        <textarea
                            className="apple-input"
                            style={{ minHeight: '110px', marginTop: '6px', resize: 'vertical' }}
                            placeholder="Discuss technical depth, problem approach, communication clarity, red flags or standout skills..."
                            value={scorecard.feedback}
                            onChange={e => setScorecard(prev => ({ ...prev, feedback: e.target.value }))}
                        />
                    </div>

                    {/* Outcome */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={labelStyle}>Hiring Recommendation</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                            {(['pass', 'hold', 'fail'] as const).map(r => {
                                const cfg = RESULT_CONFIG[r];
                                const active = scorecard.result === r;
                                return (
                                    <button key={r} type="button"
                                        onClick={() => setScorecard(prev => ({ ...prev, result: r }))}
                                        style={{
                                            padding: '12px', borderRadius: '10px',
                                            border: `2px solid ${active ? cfg.color : 'rgba(255,255,255,0.08)'}`,
                                            background: active ? `${cfg.color}22` : 'rgba(255,255,255,0.03)',
                                            color: active ? cfg.color : 'var(--text-secondary)',
                                            cursor: 'pointer', fontWeight: '700', fontSize: '12px',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                                            transition: 'all 0.2s'
                                        }}>
                                        <span style={{ fontSize: '18px' }}>{cfg.icon}</span>
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="submit" className="apple-btn" disabled={submitting}
                            style={{ flex: 2, background: 'linear-gradient(135deg, #0a84ff, #30d158)', color: '#fff', fontWeight: '700', opacity: submitting ? 0.6 : 1 }}>
                            {submitting ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><FaCheckCircle /> Submit to HR</>}
                        </button>
                        <button type="button" className="apple-btn" onClick={onClose}
                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>Cancel</button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px'
};
