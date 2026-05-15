import React, { useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getTeamInterviews, submitInterviewEvaluation } from "../../services/teamleaderService";
import {
    FaCalendarAlt, FaUserTie, FaClock, FaStar, FaRegCommentDots,
    FaVideo, FaMapMarkerAlt, FaFileAlt
} from 'react-icons/fa';

export default function PanelInterviews() {
    const [interviews, setInterviews] = useState<any[]>([]);
    const [selectedInterview, setSelectedInterview] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [evaluationForm, setEvaluationForm] = useState({
        overall_rating: 3,
        feedback: "",
        result: "pass", // pass / fail / hold
        technical_score: 5,
        communication_score: 5,
        problem_solving_score: 5
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getTeamInterviews();
            setInterviews(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadData();
    }, []);

    const handleSaveEvaluation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInterview) return;

        try {
            await submitInterviewEvaluation(
                selectedInterview.id,
                evaluationForm.feedback,
                evaluationForm.overall_rating,
                evaluationForm.result
            );
            alert("Interview Feedback Submitted Successfully");
            setSelectedInterview(null);
            loadData();
        } catch (err) {
            alert("Submission failed.");
        }
    };

    return (
        <div className="dashboard-container">
            <Header role="Team Leader" title="My Interview Panel" />

            <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    View and evaluate candidates assigned to your technical or managerial interview rounds.
                </p>
            </div>

            <div className="grid-2">
                {interviews.filter((int: any) => int.status !== 'completed').map((int: any, i: number) => (
                    <GlassCard key={int.id || i} style={{ borderLeft: `4px solid ${int.status === 'completed' ? 'var(--accent-green)' : 'var(--accent-blue)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'rgba(88, 166, 255, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaCalendarAlt />
                                </div>
                                <div style={{ fontWeight: '800', fontSize: '14px' }}>{int.interview_type?.toUpperCase() || 'TECHNICAL'} ROUND</div>
                            </div>
                            <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' }}>
                                {int.interview_mode === 'virtual' ? <FaVideo /> : <FaMapMarkerAlt />} {int.interview_mode}
                            </span>
                        </div>

                        <h3 style={{ fontSize: '18px', marginBottom: '5px' }}>{int.candidate_name}</h3>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                            {int.job_title} • ID: {int.candidate_id}
                        </div>

                        {int.meeting_link && (
                            <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(10, 132, 255, 0.1)', borderRadius: '8px', border: '1px solid rgba(10, 132, 255, 0.2)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 'bold', marginBottom: '4px' }}>ONLINE MEETING LINK</div>
                                <a href={int.meeting_link} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#fff', textDecoration: 'underline', wordBreak: 'break-all' }}>
                                    {int.meeting_link}
                                </a>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaClock color="var(--accent-blue)" />
                                <span>{int.scheduled_at ? new Date(int.scheduled_at).toLocaleString() : '—'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaFileAlt />
                                <span>Duration: {int.duration_minutes || 60}m</span>
                            </div>
                        </div>

                        <button className="apple-btn" style={{ width: '100%', background: int.status === 'completed' ? 'rgba(255,255,255,0.05)' : 'rgba(57, 211, 83, 0.1)', color: int.status === 'completed' ? 'var(--text-tertiary)' : 'var(--accent-green)', fontSize: '12px' }} onClick={() => setSelectedInterview(int)}>
                            <FaRegCommentDots /> {int.status === 'completed' ? 'View Submitted Feedback' : 'Start Evaluation / Feedback'}
                        </button>
                    </GlassCard>
                ))}

                {interviews.filter((int: any) => int.status !== 'completed').length === 0 && (
                    <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                        <FaUserTie fontSize="40px" style={{ opacity: 0.2, marginBottom: '15px' }} />
                        <p>No interview rounds currently assigned to you.</p>
                    </div>
                )}
            </div>

            {selectedInterview && (
                <div style={modalOverlayStyle}>
                    <GlassCard title={`Technical Review: ${selectedInterview.candidate_name}`} style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', paddingBottom: '30px' }}>
                        <form onSubmit={handleSaveEvaluation}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Technical Proficiency (1-10)</label>
                                    <input type="range" min="1" max="10" className="apple-input" value={evaluationForm.technical_score} onChange={(e) => setEvaluationForm({ ...evaluationForm, technical_score: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Communication (1-10)</label>
                                    <input type="range" min="1" max="10" className="apple-input" value={evaluationForm.communication_score} onChange={(e) => setEvaluationForm({ ...evaluationForm, communication_score: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Problem Solving (1-10)</label>
                                    <input type="range" min="1" max="10" className="apple-input" value={evaluationForm.problem_solving_score} onChange={(e) => setEvaluationForm({ ...evaluationForm, problem_solving_score: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Recommendation Rating</label>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <FaStar key={star} color={star <= evaluationForm.overall_rating ? 'var(--accent-orange)' : 'rgba(255,255,255,0.1)'} style={{ cursor: 'pointer' }} onClick={() => setEvaluationForm({ ...evaluationForm, overall_rating: star })} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Detailed Feedback / Interview Notes</label>
                                <textarea className="apple-input" style={{ minHeight: '120px' }} placeholder="Discuss specific technical questions, cultural fit, and overall impression..." value={evaluationForm.feedback} onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })} />
                            </div>

                            <div>
                                <label style={labelStyle}>Final Hire Decision</label>
                                <select className="apple-input" value={evaluationForm.result} onChange={(e) => setEvaluationForm({ ...evaluationForm, result: e.target.value })}>
                                    <option value="pass">Recommend for Next Round / Hire</option>
                                    <option value="hold">Keep Candidate on Hold</option>
                                    <option value="fail">Do Not Recommend / Reject</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                <button type="submit" className="apple-btn" style={{ flex: 2, background: 'var(--accent-green)' }}>Submit Review to HR</button>
                                <button type="button" className="apple-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} onClick={() => setSelectedInterview(null)}>Cancel</button>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block', padding: '2px 0', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase'
};

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
};
