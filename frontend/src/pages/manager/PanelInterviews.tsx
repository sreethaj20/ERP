import React, { useState, useEffect, useCallback } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getInterviews, getCandidates, updateIdmInterviewFeedback, getWorkforce, scheduleTeamInterview } from "../../services/managerService";
import {
    FaCalendarAlt, FaUserTie, FaClock, FaCheckCircle, FaStar,
    FaRegCommentDots, FaSearch, FaVideo, FaMapMarkerAlt, FaCalendarPlus,
    FaBriefcase, FaThumbsUp, FaThumbsDown, FaPause, FaTimes, FaSpinner,
    FaFilter, FaLayerGroup, FaEye
} from 'react-icons/fa';

// ─── Helpers & Config ─────────────────────────────────────────────────────────
const ROUND_COLORS: Record<string, string> = {
    Technical:    '#0a84ff',
    Managerial:   '#ff9f0a',
    HR:           '#bf5af2',
    'culture-fit':'#30d158',
    default:      '#636366'
};

const RESULT_CONFIG: Record<string, { color: string; icon: JSX.Element; label: string }> = {
    pass:  { color: '#30d158', icon: <FaThumbsUp />,   label: 'Pass' },
    fail:  { color: '#ff453a', icon: <FaThumbsDown />, label: 'Rejected' },
    hold:  { color: '#ff9f0a', icon: <FaPause />,       label: 'On Hold' }
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

const getRoundColor = (type: string) => ROUND_COLORS[type] || ROUND_COLORS.default;

// ─── Component ────────────────────────────────────────────────────────────────
export default function PanelInterviews() {
    const employeeId = sessionStorage.getItem('employeeId') || '';

    const [isScheduling, setIsScheduling]         = useState(false);
    const [selectedInterview, setSelectedInterview] = useState<any>(null);
    const [viewMode, setViewMode]                 = useState<'mine' | 'all'>('mine');
    const [interviews, setInterviews]             = useState<any[]>([]);
    const [candidates, setCandidates]             = useState<any[]>([]);
    const [employees, setEmployees]               = useState<any[]>([]);
    const [loading, setLoading]                   = useState(true);
    const [submitting, setSubmitting]             = useState(false);
    const [searchQuery, setSearchQuery]           = useState('');
    const [statusFilter, setStatusFilter]         = useState<'all' | 'pending' | 'completed'>('all');
    const [typeFilter, setTypeFilter]             = useState('all');

    const [evaluationForm, setEvaluationForm] = useState({
        technical_score:      6,
        communication_score:  6,
        problem_solving_score:6,
        feedback:             '',
        overall_rating:       3,
        result:               'pass',
    });

    const [scheduleForm, setScheduleForm] = useState({
        candidate_id:    '',
        round_number:    '2',
        interview_type:  'Managerial',
        interviewer_id:  employeeId || '',
        interview_mode:  'virtual',
        interview_date:  '',
        interview_time:  '11:00',
        duration_minutes:'45',
        meeting_link:    ''
    });

    // ── Load Data ─────────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [intRes, candRes, empRes] = await Promise.all([
                getInterviews(),
                getCandidates(),
                getWorkforce()
            ]);
            setInterviews(intRes || []);
            setCandidates(candRes || []);
            setEmployees(Array.isArray(empRes) ? empRes : (empRes?.employees || []));
        } catch (e) {
            console.error('[Manager Panel] Load failed:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Pre-fill evaluation form
    useEffect(() => {
        if (selectedInterview) {
            setEvaluationForm(prev => ({
                ...prev,
                feedback:       selectedInterview.feedback || '',
                overall_rating: selectedInterview.overall_rating || 3,
                result:         selectedInterview.result || 'pass'
            }));
        }
    }, [selectedInterview]);

    // ── Derived data ──────────────────────────────────────────────────────────
    const myInterviews      = interviews.filter(i => String(i.interviewer_id) === String(employeeId));
    const companyInterviews = interviews.filter(i => String(i.interviewer_id) !== String(employeeId));

    const baseList = viewMode === 'mine' ? myInterviews : interviews;

    const pendingCount   = myInterviews.filter(i => !i.result && i.status?.toLowerCase() !== 'completed').length;
    const completedCount = interviews.filter(i => i.result || i.status?.toLowerCase() === 'completed').length;
    const passCount      = interviews.filter(i => i.result === 'pass').length;
    const todayStr       = new Date().toISOString().split('T')[0];
    const todayCount     = interviews.filter(i => i.interview_date === todayStr).length;

    const displayed = baseList
        .filter(i => {
            if (statusFilter === 'pending')   return !i.result && i.status?.toLowerCase() !== 'completed';
            if (statusFilter === 'completed') return i.result || i.status?.toLowerCase() === 'completed';
            return true;
        })
        .filter(i => typeFilter === 'all' || i.interview_type === typeFilter)
        .filter(i => !searchQuery || (i.candidate_name || '').toLowerCase().includes(searchQuery.toLowerCase()));

    // ── Submit Evaluation ─────────────────────────────────────────────────────
    const handleSaveEvaluation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInterview) return;
        setSubmitting(true);
        try {
            await updateIdmInterviewFeedback(selectedInterview.id, evaluationForm);
            alert(`✅ Managerial Decision Recorded for ${selectedInterview.candidate_name}`);
            setSelectedInterview(null);
            loadData();
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Submission failed.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Schedule Interview ────────────────────────────────────────────────────
    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await scheduleTeamInterview(scheduleForm);
            setIsScheduling(false);
            alert('✅ Interview Round Scheduled');
            loadData();
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Scheduling failed.');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="dashboard-container">
            <Header role="Manager" title="Recruitment Governance" />

            {/* ── Stats Bar ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
                {[
                    { label: "Today's Rounds",   value: todayCount,     color: '#0a84ff', icon: <FaCalendarAlt /> },
                    { label: 'My Pending',        value: pendingCount,   color: '#ff9f0a', icon: <FaClock /> },
                    { label: 'Total Evaluated',   value: completedCount, color: '#30d158', icon: <FaCheckCircle /> },
                    { label: 'Passed Pipeline',   value: passCount,      color: '#bf5af2', icon: <FaThumbsUp /> }
                ].map(s => (
                    <GlassCard key={s.label} style={{ padding: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '10px', background: `${s.color}22`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                            {s.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{s.label}</div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* ── Top Controls ── */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* View toggle */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
                    {[
                        { key: 'mine', label: 'My Panel', icon: <FaUserTie /> },
                        { key: 'all',  label: 'All Company', icon: <FaLayerGroup /> }
                    ].map(v => (
                        <button key={v.key} onClick={() => setViewMode(v.key as any)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                fontSize: '12px', fontWeight: '600', transition: 'all 0.2s',
                                background: viewMode === v.key ? 'rgba(255,159,10,0.15)' : 'transparent',
                                color: viewMode === v.key ? '#ff9f0a' : 'var(--text-secondary)'
                            }}>
                            {v.icon} {v.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
                    <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '12px' }} />
                    <input className="apple-input" placeholder="Search candidate..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: '36px' }} />
                </div>

                {/* Status filter */}
                <select className="apple-input" style={{ width: 'auto', minWidth: '140px' }} value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                </select>

                {/* Type filter */}
                <select className="apple-input" style={{ width: 'auto', minWidth: '150px' }} value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}>
                    <option value="all">All Round Types</option>
                    <option value="Technical">Technical</option>
                    <option value="Managerial">Managerial</option>
                    <option value="HR">HR Round</option>
                    <option value="culture-fit">Culture Fit</option>
                </select>

                <button className="apple-btn" onClick={() => setIsScheduling(!isScheduling)}
                    style={{ background: isScheduling ? 'rgba(255,255,255,0.05)' : 'rgba(255,159,10,0.15)', color: isScheduling ? 'var(--text-secondary)' : '#ff9f0a', marginLeft: 'auto' }}>
                    <FaCalendarPlus /> {isScheduling ? 'Cancel' : 'Schedule Round'}
                </button>
            </div>

            {/* ── Schedule Form ── */}
            {isScheduling && (
                <GlassCard title="Fast-Track Scheduling" style={{ marginBottom: '28px', borderLeft: '4px solid #ff9f0a' }}>
                    <form onSubmit={handleSchedule} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Candidate</label>
                            <select className="apple-input" value={scheduleForm.candidate_id}
                                onChange={e => setScheduleForm(f => ({ ...f, candidate_id: e.target.value }))}>
                                <option value="">Select candidate...</option>
                                {candidates.filter((c: any) => ['Interview', 'Final Round'].includes(c.current_stage)).map((c: any) => (
                                    <option key={c.candidate_id || c.id} value={c.candidate_id || c.id}>
                                        {c.name || `${c.first_name} ${c.last_name}`} ({c.current_stage})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Panelist</label>
                            <select className="apple-input" value={scheduleForm.interviewer_id}
                                onChange={e => setScheduleForm(f => ({ ...f, interviewer_id: e.target.value }))}>
                                {employees.map((e: any) => (
                                    <option key={e.employee_id || e.id} value={e.employee_id || e.id}>
                                        {e.name || `${e.first_name} ${e.last_name}`} ({e.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Round #</label>
                            <input className="apple-input" type="number" value={scheduleForm.round_number}
                                onChange={e => setScheduleForm(f => ({ ...f, round_number: e.target.value }))} />
                        </div>
                        <div>
                            <label style={labelStyle}>Date *</label>
                            <input type="date" className="apple-input" value={scheduleForm.interview_date}
                                onChange={e => setScheduleForm(f => ({ ...f, interview_date: e.target.value }))} />
                        </div>
                        <div>
                            <label style={labelStyle}>Time</label>
                            <input type="time" className="apple-input" value={scheduleForm.interview_time}
                                onChange={e => setScheduleForm(f => ({ ...f, interview_time: e.target.value }))} />
                        </div>
                        <div>
                            <label style={labelStyle}>Mode</label>
                            <select className="apple-input" value={scheduleForm.interview_mode}
                                onChange={e => setScheduleForm(f => ({ ...f, interview_mode: e.target.value }))}>
                                <option value="virtual">Virtual</option>
                                <option value="onsite">Onsite</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Meeting Link</label>
                            <input className="apple-input" placeholder="https://zoom.us/j/..." value={scheduleForm.meeting_link}
                                onChange={e => setScheduleForm(f => ({ ...f, meeting_link: e.target.value }))} />
                        </div>
                        <div style={{ gridColumn: 'span 4' }}>
                            <button type="submit" className="apple-btn"
                                style={{ width: '100%', background: 'linear-gradient(135deg, #ff9f0a, #ff6b0a)', color: '#fff', fontWeight: '700' }}>
                                <FaCalendarPlus /> Confirm Appointment
                            </button>
                        </div>
                    </form>
                </GlassCard>
            )}

            {/* ── Global Pipeline Overview (read-only) ── */}
            {viewMode === 'all' && companyInterviews.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <FaLayerGroup style={{ color: '#636366' }} />
                        <h4 style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', margin: 0 }}>
                            Company-Wide Active Rounds ({companyInterviews.length})
                        </h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        {companyInterviews.slice(0, 6).map((int: any, i: number) => {
                            const color = getRoundColor(int.interview_type);
                            const resultCfg = int.result ? RESULT_CONFIG[int.result] : null;
                            return (
                                <div key={i} style={{ padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', borderLeft: `3px solid ${color}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '10px', color, fontWeight: '700', textTransform: 'uppercase' }}>
                                            Rd.{int.round_number} • {int.interview_type}
                                        </span>
                                        {resultCfg ? (
                                            <span style={{ fontSize: '9px', color: resultCfg.color, fontWeight: '700' }}>{resultCfg.label}</span>
                                        ) : (
                                            <span style={{ fontSize: '9px', color: '#ff9f0a', fontWeight: '700' }}>PENDING</span>
                                        )}
                                    </div>
                                    <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '2px' }}>{int.candidate_name}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                        {int.interview_type} • {formatDate(int.interview_date)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── My Panel / All Panel Cards ── */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaUserTie style={{ color: '#ff9f0a' }} />
                <h4 style={{ fontSize: '12px', color: '#ff9f0a', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', margin: 0 }}>
                    {viewMode === 'mine' ? 'Interviews Assigned to Me' : 'All Interviews'} ({displayed.length})
                </h4>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                    <FaSpinner style={{ fontSize: '28px', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                    <p>Loading interview panel...</p>
                </div>
            ) : displayed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                    <FaCalendarAlt style={{ fontSize: '40px', opacity: 0.15, marginBottom: '14px' }} />
                    <p>No interviews match your current filters.</p>
                </div>
            ) : (
                <div className="grid-2">
                    {displayed.map((int: any, i: number) => {
                        const color = getRoundColor(int.interview_type);
                        const resultCfg = int.result ? RESULT_CONFIG[int.result] : null;
                        const isMine = String(int.interviewer_id) === String(employeeId);

                        return (
                            <GlassCard key={int.id || i} style={{
                                borderLeft: `4px solid ${color}`,
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${color}22`; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
                            >
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: 34, height: 34, borderRadius: '10px', background: `${color}22`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>
                                            {int.interview_mode === 'virtual' ? <FaVideo /> : <FaMapMarkerAlt />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '800', fontSize: '10px', color, textTransform: 'uppercase' }}>Round {int.round_number} • {int.interview_type}</div>
                                            {isMine && <div style={{ fontSize: '9px', color: '#ff9f0a', fontWeight: '700' }}>★ ASSIGNED TO YOU</div>}
                                        </div>
                                    </div>
                                    {resultCfg ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '20px', background: `${resultCfg.color}22`, color: resultCfg.color, fontSize: '10px', fontWeight: '700' }}>
                                            {resultCfg.icon} {resultCfg.label}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '3px 9px', borderRadius: '20px', background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', fontSize: '10px', fontWeight: '700' }}>
                                            PENDING
                                        </div>
                                    )}
                                </div>

                                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{int.candidate_name}</h3>
                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FaBriefcase style={{ fontSize: '10px' }} /> {int.job_title || '—'}
                                </div>

                                {/* Meeting link */}
                                {int.interview_mode === 'virtual' && int.meeting_link && (
                                    <div style={{ marginBottom: '12px', padding: '8px 10px', background: `${color}11`, borderRadius: '6px', border: `1px solid ${color}33` }}>
                                        <div style={{ fontSize: '9px', color, fontWeight: '700', marginBottom: '2px' }}>MEETING LINK</div>
                                        <a href={int.meeting_link} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: '#fff', wordBreak: 'break-all' }}>{int.meeting_link}</a>
                                    </div>
                                )}

                                {/* Meta */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <FaCalendarAlt style={{ color, fontSize: '10px' }} /> {formatDate(int.interview_date)}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <FaClock style={{ fontSize: '10px' }} /> {formatTime(int.interview_time)}
                                    </div>
                                </div>

                                {/* Star rating for completed */}
                                {int.overall_rating && (
                                    <div style={{ display: 'flex', gap: '3px', marginBottom: '12px' }}>
                                        {[1, 2, 3, 4, 5].map(s => <FaStar key={s} color={s <= int.overall_rating ? '#ff9f0a' : 'rgba(255,255,255,0.1)'} style={{ fontSize: '12px' }} />)}
                                    </div>
                                )}

                                {/* CTA */}
                                <button className="apple-btn"
                                    onClick={() => isMine ? setSelectedInterview(int) : undefined}
                                    disabled={!isMine}
                                    style={{
                                        width: '100%', fontSize: '11px',
                                        background: isMine && !int.result ? `${color}22` : 'rgba(255,255,255,0.04)',
                                        color: isMine && !int.result ? color : 'var(--text-tertiary)',
                                        cursor: isMine ? 'pointer' : 'default',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}>
                                    {isMine ? (
                                        <>{int.result ? <><FaEye /> View Decision</> : <><FaRegCommentDots /> Conduct Review</>}</>
                                    ) : (
                                        <><FaEye /> Oversee Only (Read-Only)</>
                                    )}
                                </button>
                            </GlassCard>
                        );
                    })}
                </div>
            )}

            {/* ── Evaluation Modal ── */}
            {selectedInterview && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
                    <GlassCard style={{ width: '620px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', paddingBottom: '30px' }}>
                        {/* Modal header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontSize: '10px', color: '#ff9f0a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                                    Managerial Review — Round {selectedInterview.round_number}
                                </div>
                                <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>{selectedInterview.candidate_name}</h2>
                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{selectedInterview.job_title}</div>
                            </div>
                            <button onClick={() => setSelectedInterview(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}>
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEvaluation}>
                            {/* Score sliders */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '16px' }}>Competency Assessment</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {[
                                        { key: 'technical_score',       label: 'Technical Depth' },
                                        { key: 'communication_score',   label: 'Leadership Communication' },
                                        { key: 'problem_solving_score', label: 'Strategic Thinking' }
                                    ].map(({ key, label }) => {
                                        const val = Number((evaluationForm as any)[key] ?? 5);
                                        return (
                                            <div key={key}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <label style={labelStyle}>{label}</label>
                                                    <span style={{ fontSize: '14px', fontWeight: '800', color: val >= 7 ? '#30d158' : val >= 4 ? '#ff9f0a' : '#ff453a' }}>{val}/10</span>
                                                </div>
                                                <input type="range" min="1" max="10" value={val}
                                                    onChange={e => setEvaluationForm(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                                                    style={{ width: '100%', accentColor: '#ff9f0a' }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Qualitative feedback */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Managerial Assessment & Cultural Fit Notes</label>
                                <textarea className="apple-input"
                                    style={{ minHeight: '130px', marginTop: '6px', resize: 'vertical' }}
                                    placeholder="Leadership potential, strategic alignment, cultural fit, compensation expectations, notice period..."
                                    value={evaluationForm.feedback}
                                    onChange={e => setEvaluationForm(prev => ({ ...prev, feedback: e.target.value }))}
                                />
                            </div>

                            {/* Overall rating + Decision */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <div>
                                    <label style={labelStyle}>Leadership Rating</label>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <FaStar key={s} color={s <= evaluationForm.overall_rating ? '#ff9f0a' : 'rgba(255,255,255,0.1)'}
                                                style={{ cursor: 'pointer', fontSize: '22px', transition: 'transform 0.15s' }}
                                                onClick={() => setEvaluationForm(prev => ({ ...prev, overall_rating: s }))}
                                                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                                                onMouseLeave={e => (e.currentTarget.style.transform = '')} />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Executive Decision</label>
                                    <select className="apple-input" style={{ marginTop: '6px' }} value={evaluationForm.result}
                                        onChange={e => setEvaluationForm(prev => ({ ...prev, result: e.target.value }))}>
                                        <option value="pass">✅ Select for Offer</option>
                                        <option value="hold">⏸ Keep on Hold</option>
                                        <option value="fail">❌ Reject</option>
                                    </select>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" className="apple-btn" disabled={submitting}
                                    style={{ flex: 2, background: 'linear-gradient(135deg, #ff9f0a, #bf5af2)', color: '#fff', fontWeight: '700', fontSize: '14px', opacity: submitting ? 0.6 : 1 }}>
                                    {submitting ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><FaCheckCircle /> Finalize Decision</>}
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

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '10px', color: 'var(--text-tertiary)',
    fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px'
};
