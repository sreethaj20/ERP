import React, { useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { 
    FaCalendarAlt, FaUserTie, FaClock, FaCheckCircle, FaStar, FaRegCommentDots,
    FaSearch, FaChevronRight, FaVideo, FaMapMarkerAlt, FaFileAlt, FaCalendarPlus 
} from 'react-icons/fa';
import { getInterviews, getCandidates, updateIdmInterviewFeedback, getWorkforce, scheduleTeamInterview } from "../../services/managerService";

export default function PanelInterviews() {
    const userId = sessionStorage.getItem('userId');
    const employeeId = sessionStorage.getItem('employeeId'); 
    const [isScheduling, setIsScheduling] = useState(false);
    const [selectedInterview, setSelectedInterview] = useState<any>(null);
    const [interviews, setInterviews] = useState<any[]>([]);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [evaluationForm, setEvaluationForm] = useState({
        feedback: "",
        overall_rating: 3,
        result: "pass",
    });

    const loadData = async () => {
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
            console.error("Interview Hub Load Failed:", e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadData();
    }, []);

    const [scheduleForm, setScheduleForm] = useState({
        candidate_id: "",
        round_number: "2",
        interview_type: "Managerial",
        interviewer_id: employeeId || "",
        interview_mode: "virtual",
        interview_date: "",
        interview_time: "11:00",
        duration_minutes: "45",
        meeting_link: ""
    });

    const myInterviews = interviews.filter((int: any) => String(int.interviewer_id) === String(employeeId) && int.status !== 'completed');
    const companyInterviews = interviews.filter((int: any) => String(int.interviewer_id) !== String(employeeId));

    const handleSaveEvaluation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInterview) return;

        try {
            await updateIdmInterviewFeedback(selectedInterview.id, evaluationForm);
            alert("Managerial Decision Recorded Successfully");
            setSelectedInterview(null);
            loadData();
        } catch (err: any) {
            alert(err?.response?.data?.detail || "Evaluation failed");
        }
    };

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await scheduleTeamInterview(scheduleForm);
            setIsScheduling(false);
            alert("Interview Round Confirmed & Scheduled");
            loadData();
        } catch (err: any) {
            alert("Scheduling failed");
        }
    };

    return (
        <div className="dashboard-container">
            <Header role="Manager" title="Recruitment Governance" />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Interview Rounds & Evaluations</h2>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Monitor cross-departmental hiring and participate in final selection rounds.</p>
                </div>
                <button className="apple-btn" onClick={() => setIsScheduling(!isScheduling)}>
                    <FaCalendarPlus /> {isScheduling ? 'Cancel' : 'Schedule High-Level Round'}
                </button>
            </div>

            {isScheduling && (
                <GlassCard title="Fast-Track Selection Round" style={{ marginBottom: '30px' }}>
                    <form onSubmit={handleSchedule} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Candidate Selection</label>
                            <select className="apple-input" value={scheduleForm.candidate_id} onChange={(e) => setScheduleForm({ ...scheduleForm, candidate_id: e.target.value })}>
                                <option value="">Select candidate from pipeline...</option>
                                {candidates.filter((c: any) => ["Interview", "Final Round"].includes(c.current_stage)).map((c: any) => (
                                    <option key={c.candidate_id || c.id} value={c.candidate_id || c.id}>{c.name} ({c.current_stage})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Panelist (Default: Me)</label>
                            <select className="apple-input" value={scheduleForm.interviewer_id} onChange={(e) => setScheduleForm({ ...scheduleForm, interviewer_id: e.target.value })}>
                                {employees.map((e: any) => <option key={e.employee_id || e.id} value={e.employee_id || e.id}>{e.name || `${e.first_name} ${e.last_name}`} ({e.role})</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Round #</label>
                            <input className="apple-input" type="number" value={scheduleForm.round_number} onChange={(e) => setScheduleForm({ ...scheduleForm, round_number: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Mode</label>
                            <select className="apple-input" value={scheduleForm.interview_mode} onChange={(e) => setScheduleForm({ ...scheduleForm, interview_mode: e.target.value })}>
                                <option value="virtual">Virtual</option>
                                <option value="onsite">Onsite</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Date</label>
                            <input type="date" className="apple-input" value={scheduleForm.interview_date} onChange={(e) => setScheduleForm({ ...scheduleForm, interview_date: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Time</label>
                            <input type="time" className="apple-input" value={scheduleForm.interview_time} onChange={(e) => setScheduleForm({ ...scheduleForm, interview_time: e.target.value })} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Meeting Link (Virtual Only)</label>
                            <input className="apple-input" placeholder="https://zoom.us/j/..." value={scheduleForm.meeting_link} onChange={(e) => setScheduleForm({ ...scheduleForm, meeting_link: e.target.value })} />
                        </div>

                        <div style={{ gridColumn: 'span 4', marginTop: '10px' }}>
                            <button type="submit" className="apple-btn" style={{ width: '100%', background: 'var(--accent-blue)' }}>Set Appointment</button>
                        </div>
                    </form>
                </GlassCard>
            )}

            <div style={{ marginBottom: '40px' }}>
                <h4 style={subHeaderStyle}><FaUserTie /> Records Assigned to Me</h4>
                <div className="grid-2">
                    {myInterviews.map((int: any, i: number) => (
                        <GlassCard key={i} style={{ borderLeft: '4px solid var(--accent-orange)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <span style={{ fontWeight: '800', fontSize: '13px', color: 'var(--accent-blue)' }}>ROUND {int.round_number}</span>
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{int.interview_date}</span>
                            </div>
                            <h3 style={{ fontSize: '18px', marginBottom: '5px' }}>{int.candidate_name}</h3>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                                {(() => {
                                    const cand = candidates.find((c: any) => (c.candidate_id === int.candidate_id || c.id === int.candidate_id));
                                    return cand ? `${cand.department} • ${cand.current_designation || 'Candidate'} • Exp: ${cand.experience || 'N/A'}` : `ID: ${int.candidate_id}`;
                                })()}
                            </div>

                            {int.interview_mode === 'virtual' && int.meeting_link && (
                                <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(10, 132, 255, 0.1)', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '9px', color: 'var(--accent-blue)', fontWeight: 'bold' }}>MEETING LINK</div>
                                    <a href={int.meeting_link} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: '#fff', wordBreak: 'break-all' }}>{int.meeting_link}</a>
                                </div>
                            )}

                            {int.interview_mode === 'onsite' && (
                                <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255, 159, 10, 0.1)', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '9px', color: 'var(--accent-orange)', fontWeight: 'bold' }}>ONSITE INTERVIEW</div>
                                    <div style={{ fontSize: '10px', color: '#fff' }}>Location: Executive Boardroom, Floor 10</div>
                                </div>
                            )}

                            <button className="apple-btn" style={{ width: '100%', fontSize: '12px', background: int.status === 'completed' ? 'rgba(255,255,255,0.05)' : 'var(--accent-blue)' }} onClick={() => setSelectedInterview(int)}>
                                {int.status === 'completed' ? 'View Final Decision' : 'Review & Decision'}
                            </button>
                        </GlassCard>
                    ))}
                    {myInterviews.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No pending interviews for you.</p>}
                </div>
            </div>

            <div>
                <h4 style={subHeaderStyle}><FaCalendarAlt /> Global Pipeline Tracking</h4>
                <div className="grid-3">
                    {companyInterviews.map((int: any, i: number) => (
                        <GlassCard key={i} style={{ padding: '15px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Panelist ID: {int.interviewer_id}</div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{int.candidate_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--accent-blue)' }}>{int.interview_type} • {int.interview_date}</div>
                        </GlassCard>
                    ))}
                </div>
            </div>

            {selectedInterview && (
                <div style={modalOverlayStyle}>
                    <GlassCard title={`Managerial Selection: ${selectedInterview.candidate_name}`} style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', paddingBottom: '30px' }}>
                        <form onSubmit={handleSaveEvaluation}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Qualitative Feedback / Cultural Match</label>
                                <textarea className="apple-input" style={{ minHeight: '150px' }} value={evaluationForm.feedback} onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Decision</label>
                                    <select className="apple-input" value={evaluationForm.result} onChange={(e) => setEvaluationForm({ ...evaluationForm, result: e.target.value })}>
                                        <option value="pass">Select for Offer</option>
                                        <option value="hold">Hold</option>
                                        <option value="fail">Reject</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Leadership Rating</label>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <FaStar
                                                key={s}
                                                color={s <= evaluationForm.overall_rating ? 'var(--accent-yellow)' : 'rgba(255,255,255,0.1)'}
                                                style={{ cursor: 'pointer', fontSize: '18px' }}
                                                onClick={() => setEvaluationForm({ ...evaluationForm, overall_rating: s })}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" className="apple-btn" style={{ flex: 1, background: 'var(--accent-green)' }}>Finalize Selection</button>
                                <button type="button" className="apple-btn" onClick={() => setSelectedInterview(null)}>Close</button>
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

const subHeaderStyle: React.CSSProperties = {
    fontSize: '13px', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px'
};

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
};
