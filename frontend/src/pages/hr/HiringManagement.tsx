import React, { useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getCandidates, getInterviewsData, updateCandidateStage, getJobs, addOnboardingRequest, addEmployee, logActivity, generateId, getNextEmployeeId } from "../../utils/storage";
import {
    FaUserCheck, FaHistory, FaCheckCircle, FaTimesCircle, FaChevronRight,
    FaFileSignature, FaUserPlus, FaSearch, FaFilter, FaStar
} from 'react-icons/fa';

export default function HiringManagement() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

    const [candidates, setCandidates] = useState<any[]>([]);
    const [interviews, setInterviews] = useState<any[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);

    const loadData = async () => {
        try {
            const [candData, intData, jobData] = await Promise.all([
                getCandidates(),
                getInterviewsData(),
                getJobs()
            ]);
            setCandidates(Array.isArray(candData) ? candData : []);
            setInterviews(Array.isArray(intData) ? intData : []);
            setJobs(Array.isArray(jobData) ? jobData : []);
        } catch (error) {
            console.error("Error loading hiring data:", error);
        }
    };

    React.useEffect(() => {
        loadData();
    }, []);

    const filteredCandidates = candidates.filter((c: any) =>
        (c.name || `${c.first_name} ${c.last_name}`).toLowerCase().includes(searchQuery.toLowerCase()) &&
        ["Selected", "Final Round", "Interview"].includes(c.current_stage)
    );

    const handleFinalHire = async (cand: any) => {
        const confirmHire = window.confirm(`Are you sure you want to finalize the hiring for ${cand.name || cand.first_name}? This will create an employee record and start onboarding.`);
        if (!confirmHire) return;

        try {
            // 1. Mark as Hired
            await updateCandidateStage(cand.candidate_id || cand.id, "Hired");

            // 2. Create Employee Record
            const { employee_id: empId } = await getNextEmployeeId();
            const newEmployee = {
                id: empId,
                employee_id: empId,
                employee_code: `MC-${Math.floor(Math.random() * 9000) + 1000}`,
                first_name: cand.first_name || cand.name?.split(' ')[0],
                last_name: cand.last_name || cand.name?.split(' ')[1] || '',
                email: cand.email,
                phone: cand.phone,
                department: "Engineering",
                designation: cand.current_designation || "Software Engineer",
                role: "employee",
                status: "active",
                created_at: new Date().toISOString()
            };
            await addEmployee(newEmployee);

            // 3. Create Onboarding Request with full metadata to ensure visibility in HR Pipeline
            await addOnboardingRequest({
                request_id: generateId(),
                employee_id: empId,
                name: cand.name || `${cand.first_name} ${cand.last_name}`,
                first_name: cand.first_name || cand.name?.split(' ')[0],
                last_name: cand.last_name || cand.name?.split(' ')[1] || '',
                official_email: cand.email,
                personal_email: cand.email,
                designation: cand.current_designation || "Software Engineer",
                department: cand.department || "Engineering",
                status: 'pending',
                expected_join_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                created_at: new Date().toISOString()
            });

            await logActivity('hiring', `HR finalized hiring for ${cand.name}. Employee ${empId} created.`);
            alert("Candidate successfully moved to Onboarding & Employee Database.");
            await loadData();
            setSelectedCandidate(null);
        } catch (error) {
            console.error("Error finalizing hire:", error);
            alert("Error finalizing hire. Please try again.");
        }
    };

    return (
        <div className="dashboard-container">
            <Header role="HR" title="Hiring & Selection Control" />

            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                        className="apple-input"
                        placeholder="Search selected candidates..."
                        style={{ paddingLeft: '45px' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={statusBadgeStyle('Selected')}>Selected ({candidates.filter((c: any) => c.current_stage === 'Selected').length})</span>
                    <span style={statusBadgeStyle('Final Round')}>Final Round ({candidates.filter((c: any) => c.current_stage === 'Final Round').length})</span>
                </div>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: selectedCandidate ? '1fr 2fr' : '1fr 1fr 1fr' }}>
                {/* CANDIDATE LIST */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {filteredCandidates.map((c: any, i: number) => (
                        <GlassCard key={c.candidate_id || c.id || i} onClick={() => setSelectedCandidate(c)} style={{ cursor: 'pointer', borderLeft: `4px solid ${c.current_stage === 'Selected' ? 'var(--accent-green)' : 'var(--accent-blue)'}`, transition: '0.2s' }}>
                            <div style={{ fontWeight: 'bold' }}>{c.first_name} {c.last_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{c.email}</div>
                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 'bold' }}>{c.current_stage}</span>
                                <FaChevronRight fontSize="10px" color="var(--text-tertiary)" />
                            </div>
                        </GlassCard>
                    ))}
                    {filteredCandidates.length === 0 && <p style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>No candidates matching criteria.</p>}
                </div>

                {/* DETAILS PANEL */}
                {selectedCandidate && (
                    <div style={{ gridColumn: 'span 2' }}>
                        <GlassCard title="Internal Selection Review" subtitle={`Application: ${selectedCandidate.application_id}`}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                                <div>
                                    <label style={labelStyle}>Technical Evaluation</label>
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
                                        {[1, 2, 3, 4, 5].map(s => <FaStar key={s} color={s <= 4 ? 'var(--accent-orange)' : 'rgba(255,255,255,0.1)'} />)}
                                    </div>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '5px' }}>Strong logic, React mastery confirmed.</p>
                                </div>
                                <div>
                                    <label style={labelStyle}>Managerial Review</label>
                                    <span style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '12px' }}>CLEARED</span>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '5px' }}>Excellent culture fit, clear communicator.</p>
                                </div>
                                <div>
                                    <label style={labelStyle}>Salary Expectations</label>
                                    <div style={{ fontWeight: 'bold' }}>{selectedCandidate.expected_ctc}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Notice: {selectedCandidate.notice_period_days} Days</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '30px' }}>
                                <h4 style={subHeaderStyle}><FaHistory /> Interview History</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {interviews.filter((i: any) => i.candidate_id === (selectedCandidate.candidate_id || selectedCandidate.id)).map((int: any, idx: number) => (
                                        <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{int.interview_type} Round</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Interviewer: {int.interviewer_id} • {int.interview_date}</div>
                                            </div>
                                            <span style={{ fontSize: '9px', background: 'rgba(48, 209, 88, 0.1)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: '4px' }}>PASSED</span>
                                        </div>
                                    ))}
                                    {interviews.filter((i: any) => i.candidate_id === (selectedCandidate.candidate_id || selectedCandidate.id)).length === 0 && <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>No interview records found.</p>}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                                {selectedCandidate.current_stage === "Selected" && (
                                    <button className="apple-btn" onClick={() => handleFinalHire(selectedCandidate)} style={{ flex: 1, background: 'var(--accent-green)', color: 'white' }}>
                                        <FaUserPlus /> Finalize Hire & Start Onboarding
                                    </button>
                                )}
                                <button className="apple-btn" style={{ flex: 1, background: 'var(--accent-blue)' }}>
                                    <FaFileSignature /> Release Official Offer Letter
                                </button>
                                <button className="apple-btn" onClick={() => setSelectedCandidate(null)} style={{ background: 'rgba(255,255,255,0.05)' }}>Close Review</button>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block', padding: '2px 0', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase'
};

const subHeaderStyle: React.CSSProperties = {
    fontSize: '11px', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px'
};

const statusBadgeStyle = (stage: string): React.CSSProperties => ({
    fontSize: '10px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 'bold'
});
