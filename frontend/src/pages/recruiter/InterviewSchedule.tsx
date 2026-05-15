import React, { useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { scheduleInterview, getVisibleInterviews, getVisibleCandidates, getEmployees, getEmployeesForReference, updateCandidateStage, updateInterviewFeedback } from "../../utils/storage";
import {
    FaCalendarPlus, FaUserTie, FaClock, FaCheckCircle, FaStar, FaVideo,
    FaMapMarkerAlt, FaSearch, FaChevronRight, FaRegCommentDots, FaAward
} from 'react-icons/fa';

export default function InterviewSchedule() {
    const userId = sessionStorage.getItem('userId') || '';
    const userRole = sessionStorage.getItem('userRole') || 'Recruiter';

    const [isScheduling, setIsScheduling] = useState(false);
    const [selectedInterview, setSelectedInterview] = useState<any>(null);
    const [form, setForm] = useState({
        candidate_id: "",
        job_id: "",
        round_number: "1",
        interview_type: "Technical",
        interviewer_id: "",
        interview_mode: "virtual",
        interview_date: "",
        interview_time: "10:00",
        duration_minutes: "60",
        meeting_link: ""
    });

    const [evaluationForm, setEvaluationForm] = useState({
        technical_score: 5,
        communication_score: 5,
        problem_solving_score: 5,
        culture_fit_score: 5,
        overall_rating: 3,
        feedback: "",
        result: "pass", // pass / fail / hold
        recording_url: ""
    });

    React.useEffect(() => {
        if (selectedInterview) {
            setEvaluationForm({
                technical_score: selectedInterview.technical_score || 5,
                communication_score: selectedInterview.communication_score || 5,
                problem_solving_score: selectedInterview.problem_solving_score || 5,
                culture_fit_score: selectedInterview.culture_fit_score || 5,
                overall_rating: selectedInterview.overall_rating || 3,
                feedback: selectedInterview.feedback || "",
                result: selectedInterview.result || "pass",
                recording_url: selectedInterview.recording_url || ""
            });
        }
    }, [selectedInterview]);

    const candidates = getVisibleCandidates(userRole, userId).filter((c: any) => ["Screening", "Interview", "Final Round"].includes(c.current_stage));

    const [employees, setEmployees] = useState<any[]>([]);

    React.useEffect(() => {
        const loadPanelists = async () => {
            const data = getEmployees();
            const refData = await getEmployeesForReference();
            const all = Array.from(new Map([...data, ...refData].map(item => [item.id || item.employee_id, item])).values());
            
            setEmployees(all.filter((e: any) => {
                const r = (e.role || '').toLowerCase().replace(/[_\s]+/g, '');
                return ['hr', 'teamleader', 'manager'].some(allowed => r.includes(allowed));
            }));
        };
        loadPanelists();
    }, []);

    const [searchQuery, setSearchQuery] = useState("");
    const allInterviews = getVisibleInterviews(userRole, userId);
    const interviews = allInterviews.filter((int: any) =>
        !int.recruiter_reviewed &&
        int.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const completedInterviews = allInterviews.filter((int: any) =>
        int.recruiter_reviewed &&
        int.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.candidate_id || !form.interview_date) return alert("Please fill required fields (Candidate & Date)");

        const selectedCand = candidates.find((c: any) => (c.candidate_id === form.candidate_id || c.id === form.candidate_id));

        scheduleInterview({
            ...form,
            candidate_id: String(form.candidate_id),
            interviewer_id: String(form.interviewer_id),
            job_id: String(selectedCand?.job_id || ""),
            candidate_name: selectedCand?.name || "Unknown Candidate",
            status: "scheduled"
        });

        setIsScheduling(false);
        alert("Interview Round Scheduled");
    };

    const handleSaveEvaluation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInterview) return;

        const interviewId = selectedInterview.interview_id || selectedInterview.id;

        // Update interview in storage with feedback and mark as reviewed by recruiter
        updateInterviewFeedback(interviewId, { ...evaluationForm, recruiter_reviewed: true });

        alert(`Evaluation saved for ${selectedInterview.candidate_name}. Result: ${evaluationForm.result.toUpperCase()}`);

        if (evaluationForm.result === 'fail') {
            updateCandidateStage(selectedInterview.candidate_id, "Rejected");
        }

        setSelectedInterview(null);
    };

    return (
        <div className="dashboard-container">
            <Header role="Recruiter" title="Structured Interview Management" />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '20px' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                        className="apple-input"
                        placeholder="Search interviews by candidate..."
                        style={{ paddingLeft: '45px' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="apple-btn" onClick={() => setIsScheduling(!isScheduling)}>
                    <FaCalendarPlus /> {isScheduling ? 'Discard' : 'Schedule Round'}
                </button>
            </div>

            {isScheduling && (
                <GlassCard title="Configuration: New Interview Round" style={{ marginBottom: '30px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '15px', padding: '10px', background: 'rgba(10, 132, 255, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent-blue)' }}>
                        💡 <strong>Guidance:</strong> Technical/Managerial rounds (1 & 2) should be assigned to <strong>Team Leaders</strong> or <strong>Managers</strong>. Final selection rounds should be handled by <strong>HR</strong>.
                    </p>
                    <form onSubmit={handleSchedule} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Select Candidate *</label>
                            <select className="apple-input" value={form.candidate_id} onChange={(e) => setForm({ ...form, candidate_id: e.target.value })}>
                                <option value="">Choose Candidate...</option>
                                {candidates.map((c: any, i: number) => <option key={c.candidate_id || String(c.id) || i} value={c.candidate_id || String(c.id)}>{c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.candidate_id || c.id}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Round #</label>
                            <input type="number" className="apple-input" value={form.round_number} onChange={(e) => setForm({ ...form, round_number: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Type</label>
                            <select className="apple-input" value={form.interview_type} onChange={(e) => setForm({ ...form, interview_type: e.target.value })}>
                                <option value="technical">Technical</option>
                                <option value="managerial">Managerial</option>
                                <option value="HR">HR Round</option>
                                <option value="culture-fit">Culture Fit</option>
                            </select>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Interviewer (Emp ID)</label>
                            <select className="apple-input" value={form.interviewer_id} onChange={(e) => setForm({ ...form, interviewer_id: e.target.value })}>
                                <option value="">Select Panelist...</option>
                                {employees.map((e: any, i: number) => <option key={e.employee_id || String(e.id) || i} value={e.employee_id || String(e.id)}>{e.name} ({e.employee_id || e.id}) - {e.designation}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Date *</label>
                            <input type="date" className="apple-input" value={form.interview_date} onChange={(e) => setForm({ ...form, interview_date: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Time</label>
                            <input type="time" className="apple-input" value={form.interview_time} onChange={(e) => setForm({ ...form, interview_time: e.target.value })} />
                        </div>

                        <div>
                            <label style={labelStyle}>Duration (Min)</label>
                            <input type="number" className="apple-input" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Mode</label>
                            <select className="apple-input" value={form.interview_mode} onChange={(e) => setForm({ ...form, interview_mode: e.target.value })}>
                                <option value="virtual">Virtual (Video Link)</option>
                                <option value="onsite">Onsite (Office)</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Meeting Link (Virtual Only)</label>
                            <input className="apple-input" placeholder="Join URL (Zoom, Teams, etc.)" value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} />
                        </div>

                        <div style={{ gridColumn: 'span 4', marginTop: '10px' }}>
                            <button type="submit" className="apple-btn" style={{ width: '100%', background: 'var(--accent-blue)' }}>Send Calendar Invite</button>
                        </div>
                    </form>
                </GlassCard>
            )}

            <div className="grid-2">
                {interviews.map((int: any, i: number) => (
                    <GlassCard key={int.interview_id || int.id || i} style={{ borderLeft: `4px solid ${int.status === 'completed' ? 'var(--accent-green)' : 'var(--accent-orange)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'rgba(88, 166, 255, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaClock />
                                </div>
                                <div style={{ fontWeight: '800', fontSize: '14px' }}>Round {int.round_number}: {int.interview_type}</div>
                            </div>
                            <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                                {int.interview_mode}
                            </span>
                        </div>

                        <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{int.candidate_name}</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaUserTie fontSize="12px" color="var(--accent-blue)" />
                                <span>Panel: {employees.find((e: any) => String(e.id) === String(int.interviewer_id) || String(e.employee_id) === String(int.interviewer_id))?.name || int.interviewer_id || 'Not Assigned'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaCalendarPlus fontSize="12px" />
                                <span>{int.interview_date} @ {int.interview_time}</span>
                            </div>
                        </div>

                        <button className="apple-btn" style={{ width: '100%', background: int.status === 'completed' ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255,255,255,0.03)', color: int.status === 'completed' ? 'var(--accent-green)' : 'inherit', fontSize: '11px' }} onClick={() => setSelectedInterview(int)}>
                            <FaRegCommentDots /> {int.status === 'completed' ? 'Review Result & Update Pipeline' : 'Score Card & Feedback'}
                        </button>
                    </GlassCard>
                ))}
            </div>

            {completedInterviews.length > 0 && (
                <div style={{ marginTop: '40px' }}>
                    <h3 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--text-secondary)' }}>Finalized Interviews</h3>
                    <div className="grid-2">
                        {completedInterviews.map((int: any, i: number) => (
                            <GlassCard key={'comp-' + (int.interview_id || i)} style={{ opacity: 0.7, borderLeft: '4px solid var(--text-tertiary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div style={{ fontWeight: 'bold' }}>Round {int.round_number}: {int.interview_type}</div>
                                    <span style={{ color: int.result === 'pass' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 'bold', fontSize: '10px' }}>{int.result?.toUpperCase()}</span>
                                </div>
                                <div style={{ fontSize: '15px', marginBottom: '5px' }}>{int.candidate_name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Reviewed on: {new Date(int.updated_at).toLocaleDateString()}</div>
                                <button className="apple-btn" style={{ width: '100%', marginTop: '15px', background: 'rgba(255,255,255,0.05)', fontSize: '10px' }} onClick={() => setSelectedInterview(int)}>
                                    View Archived Feedback
                                </button>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            )}

            {interviews.length === 0 && completedInterviews.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                    No interview rounds scheduled for today.
                </div>
            )}

            {selectedInterview && (
                <div style={modalOverlayStyle}>
                    <GlassCard title={`Evaluation: ${selectedInterview.candidate_name}`} style={modalContainerStyle}>
                        <form onSubmit={handleSaveEvaluation}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Technical Score (1-10)</label>
                                    <input type="range" min="1" max="10" className="apple-input" value={evaluationForm.technical_score} onChange={(e) => setEvaluationForm({ ...evaluationForm, technical_score: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Comm. Score (1-10)</label>
                                    <input type="range" min="1" max="10" className="apple-input" value={evaluationForm.communication_score} onChange={(e) => setEvaluationForm({ ...evaluationForm, communication_score: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Culture Fit (1-10)</label>
                                    <input type="range" min="1" max="10" className="apple-input" value={evaluationForm.culture_fit_score} onChange={(e) => setEvaluationForm({ ...evaluationForm, culture_fit_score: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Overall Rating (1-5)</label>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <FaStar key={star} color={star <= evaluationForm.overall_rating ? 'var(--accent-orange)' : 'rgba(255,255,255,0.1)'} style={{ cursor: 'pointer' }} onClick={() => setEvaluationForm({ ...evaluationForm, overall_rating: star })} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Detailed Qualitative Feedback</label>
                                <textarea className="apple-input" style={{ minHeight: '100px' }} placeholder="Discuss strengths, weaknesses, and specific answers..." value={evaluationForm.feedback} onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 1.5fr minmax(150px, 1fr)', gap: '15px', marginBottom: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Panellist Recommendation</label>
                                    <select className="apple-input" value={evaluationForm.result} onChange={(e) => setEvaluationForm({ ...evaluationForm, result: e.target.value })}>
                                        <option value="pass">Shortlist / Pass</option>
                                        <option value="hold">Keep on Hold</option>
                                        <option value="fail">Reject / Fail</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Update Pipeline Stage</label>
                                    <select
                                        className="apple-input"
                                        style={{ border: '1px solid var(--accent-blue)', background: 'rgba(10, 132, 255, 0.05)' }}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                updateCandidateStage(selectedInterview.candidate_id, e.target.value);
                                                alert(`Candidate moved to ${e.target.value}`);
                                            }
                                        }}
                                    >
                                        <option value="">-- Change Pipeline Stage --</option>
                                        <option value="Screening">Back to Screening</option>
                                        <option value="Interview">Keep in Interview Round</option>
                                        <option value="Final Round">Promote to Final Round</option>
                                        <option value="Selected">Set as Selected (HR Clear)</option>
                                        <option value="Hired">Confirm Hire</option>
                                        <option value="Rejected">Reject Candidate</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Recording URL</label>
                                    <input className="apple-input" placeholder="https://..." value={evaluationForm.recording_url} onChange={(e) => setEvaluationForm({ ...evaluationForm, recording_url: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                                <button type="submit" className="apple-btn" style={{ flex: 2, background: 'var(--accent-green)' }}>Save Evaluation Card</button>
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
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, // Higher than bottom dock (1000)
    padding: '20px'
};

const modalContainerStyle: React.CSSProperties = {
    width: '600px',
    maxWidth: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    paddingBottom: '20px' // Extra space for buttons
};
