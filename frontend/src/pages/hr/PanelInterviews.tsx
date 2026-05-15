import React, { useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getInterviewsData, getCandidates, updateCandidateStage, getEmployees, logActivity, updateInterviewFeedback } from "../../utils/storage";
import {
    FaCalendarAlt, FaUserTie, FaClock, FaCheckCircle, FaStar, FaRegCommentDots,
    FaSearch, FaChevronRight, FaVideo, FaMapMarkerAlt, FaFileAlt, FaCheck
} from 'react-icons/fa';

export default function HRPanelInterviews() {
    const userId = sessionStorage.getItem('userId');
    const [selectedInterview, setSelectedInterview] = useState<any>(null);
    const [evaluationForm, setEvaluationForm] = useState({
        technical_score: 5,
        communication_score: 5,
        problem_solving_score: 5,
        culture_fit_score: 8,
        overall_rating: 4,
        feedback: "",
        result: "pass", // pass / fail / hold
    });

    React.useEffect(() => {
        if (selectedInterview) {
            setEvaluationForm({
                technical_score: selectedInterview.technical_score || 5,
                communication_score: selectedInterview.communication_score || 5,
                problem_solving_score: selectedInterview.problem_solving_score || 5,
                culture_fit_score: selectedInterview.culture_fit_score || 8,
                overall_rating: selectedInterview.overall_rating || 4,
                feedback: selectedInterview.feedback || "",
                result: selectedInterview.result || "pass"
            });
        }
    }, [selectedInterview]);

    const employees = getEmployees();
    const candidates = getCandidates();

    // Filters interviews where this HR person is the panelist and not yet completed
    const myInterviews = getInterviewsData().filter((int: any) => int.interviewer_id === userId && int.status !== 'completed');

    const handleSaveEvaluation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInterview) return;

        logActivity('interview', `HR Panellist ${userId} submitted final feedback for ${selectedInterview.candidate_name}. Result: ${evaluationForm.result}`);

        // Update interview record
        updateInterviewFeedback(selectedInterview.interview_id || selectedInterview.id, evaluationForm);

        if (evaluationForm.result === 'pass') {
            updateCandidateStage(selectedInterview.candidate_id, "Selected");
        } else if (evaluationForm.result === 'fail') {
            updateCandidateStage(selectedInterview.candidate_id, "Rejected");
        }

        alert("Final HR Decision Submitted Successfully");
        setSelectedInterview(null);
    };

    return (
        <div className="dashboard-container">
            <Header role="HR" title="Final HR Selection Panel" />

            <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Conduct final HR rounds, culture fit assessments, and salary negotiations.
                </p>
            </div>

            <div className="grid-2">
                {myInterviews.map((int: any, i: number) => (
                    <GlassCard key={int.interview_id || i} style={{ borderLeft: `4px solid ${int.status === 'completed' ? 'var(--accent-green)' : 'var(--accent-purple)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'rgba(191, 90, 242, 0.1)', color: '#bf5af2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaCheckCircle />
                                </div>
                                <div style={{ fontWeight: '800', fontSize: '14px' }}>HR / FINAL ROUND</div>
                            </div>
                            <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' }}>
                                {int.interview_mode === 'virtual' ? <FaVideo /> : <FaMapMarkerAlt />} {int.interview_mode}
                            </span>
                        </div>

                        <h3 style={{ fontSize: '18px', marginBottom: '5px' }}>{int.candidate_name}</h3>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                            {(() => {
                                const cand = candidates.find((c: any) => (c.candidate_id === int.candidate_id || c.id === int.candidate_id));
                                return cand ? `${cand.department} • ${cand.current_designation || 'Candidate'} • ${cand.experience || 'N/A'} Exp` : `ID: ${int.candidate_id}`;
                            })()}
                        </div>

                        {int.interview_mode === 'virtual' && int.meeting_link && (
                            <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(191, 90, 242, 0.1)', borderRadius: '8px', border: '1px solid rgba(191, 90, 242, 0.2)' }}>
                                <div style={{ fontSize: '10px', color: '#bf5af2', fontWeight: 'bold', marginBottom: '4px' }}>ONLINE MEETING LINK</div>
                                <a href={int.meeting_link} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#fff', textDecoration: 'underline', wordBreak: 'break-all' }}>
                                    {int.meeting_link}
                                </a>
                            </div>
                        )}

                        {int.interview_mode === 'onsite' && (
                            <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(255, 159, 10, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 159, 10, 0.2)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--accent-orange)', fontWeight: 'bold', marginBottom: '4px' }}>ONSITE INTERVIEW</div>
                                <div style={{ fontSize: '11px', color: '#fff' }}>Location: HR Office, Suite 402</div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaClock color="#bf5af2" />
                                <span>{int.interview_date} @ {int.interview_time}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaFileAlt />
                                <span>Prep: Interview Card</span>
                            </div>
                        </div>

                        <button className="apple-btn" style={{ width: '100%', background: int.status === 'completed' ? 'rgba(255,255,255,0.05)' : 'rgba(191, 90, 242, 0.1)', color: int.status === 'completed' ? 'var(--text-tertiary)' : '#bf5af2', fontSize: '12px' }} onClick={() => setSelectedInterview(int)}>
                            <FaRegCommentDots /> {int.status === 'completed' ? 'View Final Feedback' : 'Start Final Evaluation'}
                        </button>
                    </GlassCard>
                ))}

                {myInterviews.length === 0 && (
                    <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                        <FaUserTie fontSize="40px" style={{ opacity: 0.2, marginBottom: '15px' }} />
                        <p>No final selection rounds assigned to you.</p>
                    </div>
                )}
            </div>

            {selectedInterview && (
                <div style={modalOverlayStyle}>
                    <GlassCard title={`Final HR Selection: ${selectedInterview.candidate_name}`} style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', paddingBottom: '30px' }}>
                        <form onSubmit={handleSaveEvaluation}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Culture Fit (1-10)</label>
                                    <input type="range" min="1" max="10" className="apple-input" value={evaluationForm.culture_fit_score} onChange={(e) => setEvaluationForm({ ...evaluationForm, culture_fit_score: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Communication (1-10)</label>
                                    <input type="range" min="1" max="10" className="apple-input" value={evaluationForm.communication_score} onChange={(e) => setEvaluationForm({ ...evaluationForm, communication_score: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Salary Negotiation Status</label>
                                    <select className="apple-input">
                                        <option>Within Range</option>
                                        <option>Needs Approval</option>
                                        <option>Candidate Refused</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Executive Rating</label>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <FaStar key={star} color={star <= evaluationForm.overall_rating ? 'var(--accent-yellow)' : 'rgba(255,255,255,0.1)'} style={{ cursor: 'pointer', fontSize: '18px' }} onClick={() => setEvaluationForm({ ...evaluationForm, overall_rating: star })} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Final Interview Summary</label>
                                <textarea className="apple-input" style={{ minHeight: '120px' }} placeholder="Note down salary expectations, notice period, and culture check results..." value={evaluationForm.feedback} onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })} />
                            </div>

                            <div>
                                <label style={labelStyle}>Final Selection Outcome</label>
                                <select className="apple-input" value={evaluationForm.result} onChange={(e) => setEvaluationForm({ ...evaluationForm, result: e.target.value })}>
                                    <option value="pass">Shortlist for Offer</option>
                                    <option value="hold">Hold</option>
                                    <option value="fail">Reject</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                <button type="submit" className="apple-btn" style={{ flex: 2, background: 'var(--accent-green)' }}>Finalize & Request Offer</button>
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
