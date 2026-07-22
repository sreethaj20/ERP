import React, { useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
  getCandidates,
  updateCandidateStage,
  addCandidate,
  getJobs,
  addScreeningLog,
  getScreeningLogs,
  getOffers,
  updateOfferStatus,
  getInterviews,
  scheduleInterview,
  acceptOffer,
  rejectOffer,
  deleteCandidate,
  createApplication
} from "../../services/recruiterService";
import { getEmployeesForReference } from "../../services/employeeService";

import {
  FaUser, FaCheck, FaTimes, FaPlus, FaLinkedin, FaBriefcase,
  FaMoneyBillWave, FaClock, FaSearch, FaFilter, FaExternalLinkAlt,
  FaEnvelope, FaPhone, FaBuilding, FaUserTie, FaFileAlt, FaGlobe, FaUserCheck, FaFileDownload, FaFileSignature, FaAward, FaCalendarCheck
} from 'react-icons/fa';

const labelStyle: React.CSSProperties = {
  display: 'block', padding: '2px 0', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase',
  fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000,
  padding: '20px'
};

const modalContainerStyle: React.CSSProperties = {
  width: '900px',
  maxWidth: '95%',
  maxHeight: '90vh',
  overflowY: 'auto',
  paddingBottom: '30px'
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: '11px', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px',
  fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
};

const detailBoxStyle: React.CSSProperties = {
  padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)'
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '5px',
  fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
};

const stages = ["Telephonic", "Screening (Zoom Meeting)", "Assignment", "Interview", "Final Round", "Selected", "Hired", "Rejected"];

export default function CandidatePipeline() {
  const userId = sessionStorage.getItem('userId') || '';
  const userRole = sessionStorage.getItem('userRole') || 'Recruiter';

  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  const [screeningForm, setScreeningForm] = useState({
    screening_score: 5,
    skill_match_score: 5,
    experience_match_score: 5,
    communication_score: 5,
    notes: "",
    decision: "shortlisted"
  });

  const [assignmentForm, setAssignmentForm] = useState({
    code_quality: 5,
    problem_solving: 5,
    timeliness: 5,
    notes: "",
    decision: "pass"
  });

  const [interviewForm, setInterviewForm] = useState({
    round_number: 1,
    interview_type: 'Technical',
    interviewer_id: '',
    interview_date: '',
    meeting_link: ''
  });

  const [form, setForm] = useState({
    job_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    linkedin_url: "",
    portfolio_url: "",
    current_company: "",
    current_designation: "",
    total_experience_years: "",
    relevant_experience_years: "",
    current_ctc: "",
    expected_ctc: "",
    notice_period_days: "",
    resume_url: "",
    source: "LinkedIn",
    referred_by: "",
  });

  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [screenings, setScreenings] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [employees, setEmployeesState] = useState<any[]>([]);

  const loadData = async () => {
    console.log('[CANDIDATE PIPELINE] Loading data...');
    try {
      const [candData, jobData, screeningData, offerData, intData, refData] = await Promise.all([
        getCandidates(),
        getJobs(),
        getScreeningLogs(),
        getOffers(),
        getInterviews(),
        getEmployeesForReference()
      ]);
      
      setAllCandidates(Array.isArray(candData) ? candData : []);
      setJobs(Array.isArray(jobData) ? jobData.filter((j: any) => j.status !== 'closed') : []);
      setScreenings(Array.isArray(screeningData) ? screeningData : []);
      setOffers(Array.isArray(offerData) ? offerData : []);
      setInterviews(Array.isArray(intData) ? intData : []);
      setEmployeesState(Array.isArray(refData) ? refData : []);
      
    } catch (error) {
      console.error("[CANDIDATE PIPELINE] Error loading pipeline data:", error);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    if (selectedCandidate && screenings.length > 0) {
      const candIdStr = String(selectedCandidate.candidate_id || selectedCandidate.id);
      const dbIdStr = String(selectedCandidate.id || '');
      const existingScreening = screenings.find((s: any) =>
        String(s.candidate_id) === candIdStr || (dbIdStr && String(s.candidate_id) === dbIdStr)
      );
      if (existingScreening) {
        setScreeningForm({
          screening_score: existingScreening.screening_score != null ? Number(existingScreening.screening_score) : 5,
          skill_match_score: existingScreening.skill_match_score != null ? Number(existingScreening.skill_match_score) : 5,
          experience_match_score: existingScreening.experience_match_score != null ? Number(existingScreening.experience_match_score) : 5,
          communication_score: existingScreening.communication_score != null ? Number(existingScreening.communication_score) : 5,
          notes: existingScreening.notes || existingScreening.screening_notes || "",
          decision: existingScreening.decision || "shortlisted"
        });
      }
    }
  }, [selectedCandidate, screenings]);

  const getJobTitle = (c: any, jobsList: any[]) => {
    if (!c) return 'Unknown Role';
    const match = jobsList.find((j: any) =>
      String(j.job_id) === String(c.job_id) ||
      String(j.id) === String(c.job_id) ||
      String(j.job_id) === String(c.job) ||
      String(j.id) === String(c.job)
    );
    return match?.title || c.job_title || c.job || (c.job_id ? `Requisition (${c.job_id})` : 'General Requisition');
  };

  const filteredCandidates = allCandidates.filter((c: any) => {
    // Skip invalid candidates
    if (!c || (!c.first_name && !c.name && !c.candidate_name)) {
      return false;
    }
    
    const selectedJobObj = jobs.find((j: any) =>
      String(j.job_id) === String(selectedJobId) || String(j.id) === String(selectedJobId)
    );

    const matchesJob = selectedJobId === "all" || (
      String(c.job_id) === String(selectedJobId) ||
      String(c.id) === String(selectedJobId) ||
      (selectedJobObj && (
        String(c.job_id) === String(selectedJobObj.job_id) ||
        String(c.job_id) === String(selectedJobObj.id) ||
        String(c.job) === String(selectedJobObj.title)
      ))
    );

    const matchesSearch = (c.first_name + " " + (c.last_name || "")).toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesJob && matchesSearch;
  });

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.email || !form.job_id) return alert("Missing required fields");

    // Data Sanitization (Feature 62): Convert empty strings for Decimal/Int fields
    const payload = {
      ...form,
      job_id: String(form.job_id),  // Backend expects string — guard against numeric IDs
      total_experience_years: form.total_experience_years === "" ? "0.0" : form.total_experience_years,
      relevant_experience_years: form.relevant_experience_years === "" ? "0.0" : form.relevant_experience_years,
      notice_period_days: form.notice_period_days === "" ? 0 : parseInt(form.notice_period_days),
      current_ctc: form.current_ctc === "" ? null : form.current_ctc,
      expected_ctc: form.expected_ctc === "" ? null : form.expected_ctc,
      name: `${form.first_name} ${form.last_name}`,
      current_stage: "Telephonic",
      application_status: "active"
    };


    const newCand = await addCandidate(payload);
    if (newCand && (newCand.candidate_id || newCand.id)) {
      try {
        await createApplication({
          candidate_id: String(newCand.candidate_id || newCand.id),
          job_id: String(payload.job_id),
          current_stage: "Telephonic",
          status: "active"
        });
      } catch (appErr) {
        console.error("Failed to auto-create application log:", appErr);
      }
    }

    setForm({
      job_id: "", first_name: "", last_name: "", email: "", phone: "",
      linkedin_url: "", portfolio_url: "", current_company: "", current_designation: "",
      total_experience_years: "", relevant_experience_years: "", current_ctc: "", expected_ctc: "",
      notice_period_days: "", resume_url: "", source: "LinkedIn", referred_by: ""
    });
    setIsAdding(false);
    await loadData();
    alert("Candidate Registered Successfully");
  };

  const handleMove = async (id: string, currentStage: string) => {
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 2) {
      const nextStage = stages[currentIndex + 1];
      try {
        await updateCandidateStage(id, nextStage);
        try {
          await createApplication({
            candidate_id: String(id),
            job_id: String(selectedCandidate?.job_id),
            current_stage: nextStage,
            status: "active"
          });
        } catch (appErr) {
          console.error("Failed to log application move event:", appErr);
        }
        await loadData();
        if (selectedCandidate) {
          setSelectedCandidate((prev: any) => ({ ...prev, current_stage: nextStage }));
        }
      } catch (err: any) {
        alert(err?.response?.data?.detail || "Failed to move candidate stage.");
      }
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateCandidateStage(id, "Rejected");
      try {
        await createApplication({
          candidate_id: String(id),
          job_id: String(selectedCandidate?.job_id),
          current_stage: "Rejected",
          status: "rejected"
        });
      } catch (appErr) {
        console.error("Failed to log application reject event:", appErr);
      }
      await loadData();
      setSelectedCandidate(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to reject candidate.");
    }
  };

  const handleSaveScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    const currentStage = selectedCandidate.current_stage;

    await addScreeningLog({
      candidate_id: selectedCandidate.candidate_id || selectedCandidate.id,
      screened_by: userId,
      type: currentStage,
      ...screeningForm
    });

    if (screeningForm.decision === 'shortlisted') {
      await handleMove(selectedCandidate.candidate_id || selectedCandidate.id, currentStage);
    } else {
      await handleReject(selectedCandidate.candidate_id || selectedCandidate.id);
    }
    
    await loadData();
    alert(`${currentStage} feedback saved`);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    await addScreeningLog({
      candidate_id: selectedCandidate.candidate_id || selectedCandidate.id,
      screened_by: userId,
      type: 'Assignment',
      ...assignmentForm
    });

    if (assignmentForm.decision === 'pass') {
      await handleMove(selectedCandidate.candidate_id || selectedCandidate.id, "Assignment");
    } else {
      await handleReject(selectedCandidate.candidate_id || selectedCandidate.id);
    }

    await loadData();
    alert("Assignment feedback saved");
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    if (!interviewForm.interviewer_id || !interviewForm.interview_date) return alert("Interviewer and Date are required");

    try {
      await scheduleInterview({
        candidate_id: String(selectedCandidate.candidate_id || selectedCandidate.id),
        job_id: String(selectedCandidate.job_id),
        ...interviewForm,
        interviewer_id: String(interviewForm.interviewer_id)
      });

      await loadData();
      alert("Interview Scheduled Successfully");
      setInterviewForm({ round_number: 1, interview_type: 'Technical', interviewer_id: '', interview_date: '', meeting_link: '' });
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to schedule interview round.");
    }
  };

  const downloadCSV = () => {
    if (filteredCandidates.length === 0) return alert("No data to export");

    const headers = [
      "Application ID", "First Name", "Last Name", "Email", "Phone",
      "Job Role", "Target Stage", "Current Company", "Designation",
      "Total Exp", "Current CTC", "Expected CTC", "Notice Period", "Source"
    ];

    let csvRows = [headers.join(",")];

    stages.forEach(stage => {
      const stageCandidates = filteredCandidates.filter((c: any) => c.current_stage === stage);

      if (stageCandidates.length > 0) {
        csvRows.push("");
        csvRows.push(`--- STAGE: ${stage.toUpperCase()} (${stageCandidates.length} Candidates) ---`);

        const stageRows = stageCandidates.map((c: any) => {
          const jobTitle = getJobTitle(c, jobs);
          return [
            c.application_id || 'N/A',
            c.first_name,
            c.last_name || "",
            c.email,
            c.phone || "N/A",
            `"${jobTitle}"`,
            c.current_stage,
            `"${c.current_company || 'N/A'}"`,
            `"${c.current_designation || 'N/A'}"`,
            c.total_experience_years,
            c.current_ctc || "N/A",
            c.expected_ctc || "N/A",
            c.notice_period_days || "N/A",
            c.source || "N/A"
          ].join(",");
        });

        csvRows = [...csvRows, ...stageRows];
      }
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Recruitment_Pipeline_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-container">
      <Header role="Recruiter" title="Talent Acquisition Pipeline" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              className="apple-input"
              placeholder="Search by name or email..."
              style={{ paddingLeft: '45px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="apple-input"
            style={{ maxWidth: '250px' }}
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
          >
            <option value="all">All Requisitions</option>
            {jobs.map((j: any, i: number) => <option key={j.job_id || j.id || i} value={j.job_id || j.id}>{j.title}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="apple-btn" onClick={() => window.location.href = '/recruiter/offers'} style={{ background: 'rgba(88, 166, 255, 0.1)', color: 'var(--accent-blue)' }}>
            <FaFileSignature /> Release Offers
          </button>
          <button className="apple-btn" onClick={downloadCSV} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
            <FaFileDownload /> Export CSV
          </button>
          <button className="apple-btn" onClick={() => setIsAdding(!isAdding)}>
            <FaPlus /> {isAdding ? 'Close Form' : 'Add Applicant'}
          </button>
        </div>
      </div>

      {isAdding && (
        <GlassCard title="Comprehensive Candidate Entry" style={{ marginBottom: '30px' }}>
          <form onSubmit={handleAddCandidate} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Requisition Target *</label>
              <select className="apple-input" value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })}>
                <option value="">Select Job requisition...</option>
                {jobs.map((j: any, i: number) => <option key={j.job_id || j.id || i} value={j.job_id || j.id}>{j.title} ({j.job_code || 'N/A'})</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>First Name *</label><input className="apple-input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div><label style={labelStyle}>Last Name</label><input className="apple-input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>

            <div><label style={labelStyle}>Email *</label><input className="apple-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label style={labelStyle}>Phone</label><input className="apple-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label style={labelStyle}>Source</label>
              <select className="apple-input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Referral">Referral</option>
                <option value="Portal">Internal Portal</option>
                <option value="Walk-in">Walk-in</option>
              </select>
            </div>
            <div><label style={labelStyle}>Referred By</label><input className="apple-input" placeholder="Name (if any)" value={form.referred_by} onChange={(e) => setForm({ ...form, referred_by: e.target.value })} /></div>

            <div><label style={labelStyle}>Current Designation</label><input className="apple-input" value={form.current_designation} onChange={(e) => setForm({ ...form, current_designation: e.target.value })} /></div>
            <div><label style={labelStyle}>Current Company</label><input className="apple-input" value={form.current_company} onChange={(e) => setForm({ ...form, current_company: e.target.value })} /></div>
            <div><label style={labelStyle}>Total Exp (Yrs)</label><input className="apple-input" type="number" step="0.01" value={form.total_experience_years} onChange={(e) => setForm({ ...form, total_experience_years: e.target.value })} /></div>
            <div><label style={labelStyle}>Relevant Exp (Yrs)</label><input className="apple-input" type="number" step="0.01" value={form.relevant_experience_years} onChange={(e) => setForm({ ...form, relevant_experience_years: e.target.value })} /></div>

            <div><label style={labelStyle}>Current CTC</label><input className="apple-input" placeholder="e.g. 15,00,000" value={form.current_ctc} onChange={(e) => setForm({ ...form, current_ctc: e.target.value })} /></div>
            <div><label style={labelStyle}>Expected CTC</label><input className="apple-input" placeholder="e.g. 20,00,000" value={form.expected_ctc} onChange={(e) => setForm({ ...form, expected_ctc: e.target.value })} /></div>
            <div><label style={labelStyle}>Notice Period (Days)</label><input className="apple-input" type="number" value={form.notice_period_days} onChange={(e) => setForm({ ...form, notice_period_days: e.target.value })} /></div>
            <div><label style={labelStyle}>LinkedIn URL</label><input className="apple-input" placeholder="https://..." value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} /></div>

            <div style={{ gridColumn: 'span 4' }}>
              <button type="submit" className="apple-btn" style={{ width: '100%', background: 'var(--accent-blue)' }}>Register Application & Start Pipeline</button>
            </div>
          </form>
        </GlassCard>
      )}
      {/* Job Requisition Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '5px' }}>
        <button
          onClick={() => setSelectedJobId("all")}
          className="apple-btn"
          style={{
            padding: '5px 14px',
            fontSize: '11px',
            borderRadius: '20px',
            background: selectedJobId === "all" ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
            color: selectedJobId === "all" ? '#fff' : 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            fontWeight: selectedJobId === "all" ? 'bold' : 'normal'
          }}
        >
          All Requisitions ({allCandidates.length})
        </button>
        {jobs.map((j: any, i: number) => {
          const jobIdStr = j.job_id || String(j.id);
          const candCount = allCandidates.filter((c: any) =>
            String(c.job_id) === String(j.job_id) ||
            String(c.job_id) === String(j.id) ||
            String(c.job) === String(j.title)
          ).length;
          const isSelected = selectedJobId === jobIdStr || selectedJobId === String(j.id);
          return (
            <button
              key={j.job_id || j.id || i}
              onClick={() => setSelectedJobId(jobIdStr)}
              className="apple-btn"
              style={{
                padding: '5px 14px',
                fontSize: '11px',
                borderRadius: '20px',
                background: isSelected ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                fontWeight: isSelected ? 'bold' : 'normal'
              }}
            >
              {j.title} ({candCount})
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', minHeight: '70vh' }}>
        {stages.map((stage: string) => {
          const stageItems = filteredCandidates.filter((c: any) => c.current_stage === stage);
          return (
            <div key={stage} style={{ minWidth: '300px', flex: 1 }}>
              <div style={{
                padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', marginBottom: '15px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderTop: `3px solid ${stage === 'Selected' ? 'var(--accent-green)' : (stage === 'Rejected' ? 'var(--accent-red)' : 'var(--accent-blue)')}`
              }}>
                <span style={{ fontWeight: 'bold', fontSize: '13px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>{stage}</span>
                <span style={{ background: 'rgba(255,255,255,0.05)', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                  {stageItems.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stageItems.map((c: any, i: number) => {
                  const candidateOffers = offers.filter((o: any) => o.candidate_id === (c.candidate_id || c.id));
                  const latestOffer = candidateOffers.length > 0 ? candidateOffers[candidateOffers.length - 1] : null;

                  // Validate candidate data and provide fallbacks
                  const candidateName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || 'Unknown Candidate';
                  const currentCompany = c.current_company || 'Fresher';
                  const experience = c.total_experience_years || '0';
                  const jobTitle = getJobTitle(c, jobs);

                  // Skip invalid candidates
                  if (!c || (!c.first_name && !c.name && !c.candidate_name)) {
                    console.warn('[CANDIDATE PIPELINE] Skipping invalid candidate:', c);
                    return null;
                  }

                  return (
                    <div key={c.candidate_id || c.id || i} onClick={() => setSelectedCandidate(c)} style={{ cursor: 'pointer' }}>
                      <GlassCard style={{ padding: '15px', transition: 'transform 0.2s', borderLeft: latestOffer ? `3px solid ${latestOffer.offer_status === 'accepted' ? 'var(--accent-green)' : (latestOffer.offer_status === 'sent' ? 'var(--accent-blue)' : 'var(--accent-red)')}` : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>{candidateName}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            {latestOffer && (
                                <span style={{ fontSize: '8px', padding: '2px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: latestOffer.offer_status === 'accepted' ? 'var(--accent-green)' : 'var(--accent-blue)', fontWeight: 'bold' }}>
                                OFFER {latestOffer.offer_status.toUpperCase()}
                                </span>
                            )}
                            {(() => {
                                const scheduledInts = interviews.filter(i => String(i.candidate_id) === String(c.candidate_id || c.id) && i.status === 'Scheduled');
                                const completedInts = interviews.filter(i => String(i.candidate_id) === String(c.candidate_id || c.id) && i.status?.toLowerCase() === 'completed');
                                
                                if (scheduledInts.length > 0) {
                                    const next = scheduledInts[0];
                                    const isToday = new Date(next.interview_date).toDateString() === new Date().toDateString();
                                    return (
                                        <span style={{ 
                                            fontSize: '8px', padding: '2px 6px', borderRadius: '10px', 
                                            background: isToday ? 'rgba(255,159,10,0.1)' : 'rgba(10,132,255,0.1)', 
                                            color: isToday ? 'var(--accent-orange)' : 'var(--accent-blue)', 
                                            fontWeight: 'bold', border: `1px solid ${isToday ? 'rgba(255,159,10,0.2)' : 'rgba(10,132,255,0.2)'}`
                                        }}>
                                            {isToday ? 'INTERVIEW TODAY' : 'UPCOMING INT'}
                                        </span>
                                    );
                                } else if (completedInts.length > 0) {
                                    const last = completedInts[completedInts.length - 1];
                                    const isPass = last.result === 'pass';
                                    const isFail = last.result === 'fail';
                                    return (
                                        <span style={{ 
                                            fontSize: '8px', padding: '2px 6px', borderRadius: '10px', 
                                            background: isPass ? 'rgba(48, 209, 88, 0.1)' : (isFail ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255,255,255,0.05)'), 
                                            color: isPass ? 'var(--accent-green)' : (isFail ? 'var(--accent-red)' : 'var(--text-tertiary)'), 
                                            fontWeight: 'bold', border: `1px solid ${isPass ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 69, 58, 0.2)'}`
                                        }}>
                                            {last.result ? `EVAL: ${last.result.toUpperCase()}` : 'EVAL COMPLETED'}
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                          </div>
                        </div>

                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                          <FaBuilding fontSize="10px" /> {c.current_company || 'Fresher'}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 'bold', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                            {jobTitle}
                          </div>
                          <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>{c.total_experience_years}Y</span>
                        </div>

                        {stage === "Selected" && (!latestOffer || latestOffer.offer_status === "declined") && (
                          <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = "/recruiter/offers";
                              }}
                              className="apple-btn"
                              style={{ width: '100%', padding: '6px', fontSize: '10px', background: 'var(--accent-blue)' }}
                            >
                              <FaAward /> Release Offer Letter
                            </button>
                          </div>
                        )}

                        {stage === "Selected" && latestOffer && latestOffer.offer_status === "sent" && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm("Confirm candidate acceptance? This will auto-create employee record.")) {
                                  const payload = {
                                    status: "accepted",
                                    joining_date: latestOffer.joining_date,
                                    department: latestOffer.department,
                                    employment_type: latestOffer.employment_type || "Full-Time",
                                    reporting_manager_id: latestOffer.reporting_manager_id
                                  };
                                  await acceptOffer(latestOffer.id || latestOffer.offer_id, payload);
                                  await loadData();
                                }
                              }}
                              className="apple-btn"
                              style={{ flex: 1, padding: '6px', fontSize: '10px', background: 'var(--accent-green)' }}
                            >
                              <FaCheck /> Accept
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const reason = prompt("Reason for decline:");
                                if (reason) {
                                  await rejectOffer(latestOffer.id || latestOffer.offer_id, reason);
                                  await loadData();
                                }
                              }}
                              className="apple-btn"
                              style={{ flex: 1, padding: '6px', fontSize: '10px', background: 'rgba(248, 81, 73, 0.1)', color: 'var(--accent-red)' }}
                            >
                              <FaTimes /> Decline
                            </button>
                          </div>
                        )}
                      </GlassCard>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedCandidate && (
        <div style={modalOverlayStyle}>
          <GlassCard title="Talent Profile Deep-Dive" style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '20px', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', color: 'white' }}>
                  <FaUserTie />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '24px' }}>{selectedCandidate.first_name} {selectedCandidate.last_name}</h2>
                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '10px', color: 'var(--text-tertiary)' }}>{selectedCandidate.application_id}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '5px' }}>
                    <span><FaEnvelope /> {selectedCandidate.email}</span>
                    <span><FaPhone /> {selectedCandidate.phone}</span>
                    <span style={{ color: 'var(--accent-blue)' }}><FaGlobe /> Source: {selectedCandidate.source}</span>
                  </div>
                </div>
              </div>
              <button className="apple-btn" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setSelectedCandidate(null)}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div>
                  <h4 style={sectionHeaderStyle}>Professional Background</h4>
                  <div style={detailBoxStyle}>
                    <div style={infoRowStyle}><span>Current Company:</span> <strong>{selectedCandidate.current_company || 'N/A'}</strong></div>
                    <div style={infoRowStyle}><span>Designation:</span> <strong>{selectedCandidate.current_designation || 'N/A'}</strong></div>
                    <div style={infoRowStyle}><span>Total Experience:</span> <strong>{selectedCandidate.total_experience_years} Years</strong></div>
                    <div style={infoRowStyle}><span>Relevant Experience:</span> <strong>{selectedCandidate.relevant_experience_years || 'N/A'} Years</strong></div>
                    <div style={infoRowStyle}><span>Notice Period:</span> <strong>{selectedCandidate.notice_period_days} Days</strong></div>
                  </div>
                </div>

                {["Telephonic", "Screening (Zoom Meeting)"].includes(selectedCandidate.current_stage) && (
                  <div>
                    <h4 style={sectionHeaderStyle}><FaUserCheck /> {selectedCandidate.current_stage === "Telephonic" ? "Telephonic" : "Zoom Meeting"} Feedback</h4>
                    <GlassCard style={{ padding: '20px', background: 'rgba(57, 211, 83, 0.03)', border: '1px solid rgba(57, 211, 83, 0.1)' }}>
                      <form onSubmit={handleSaveScreening} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={labelStyle}>Skill Match (0-10)</label>
                          <input type="range" min="0" max="10" className="apple-input" value={screeningForm.skill_match_score} onChange={(e) => setScreeningForm({ ...screeningForm, skill_match_score: parseInt(e.target.value) })} />
                        </div>
                        <div>
                          <label style={labelStyle}>{selectedCandidate.current_stage === "Telephonic" ? "Comm. Score" : "Confidence"} (0-10)</label>
                          <input type="range" min="0" max="10" className="apple-input" value={screeningForm.communication_score} onChange={(e) => setScreeningForm({ ...screeningForm, communication_score: parseInt(e.target.value) })} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={labelStyle}>Technical Depth Notes</label>
                          <textarea className="apple-input" style={{ minHeight: '60px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }} value={screeningForm.notes} onChange={(e) => setScreeningForm({ ...screeningForm, notes: e.target.value })} placeholder="Key observations from the discussion..." />
                        </div>
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                          <button type="submit" onClick={() => setScreeningForm({ ...screeningForm, decision: 'shortlisted' })} className="apple-btn" style={{ flex: 1, background: 'var(--accent-green)' }}>Approve for Next Stage</button>
                          <button type="submit" onClick={() => setScreeningForm({ ...screeningForm, decision: 'rejected' })} className="apple-btn" style={{ flex: 1, background: 'rgba(248, 81, 73, 0.1)', color: 'var(--accent-red)' }}>Reject Candidate</button>
                        </div>
                      </form>
                    </GlassCard>
                  </div>
                )}

                {selectedCandidate.current_stage === "Assignment" && (
                  <div>
                    <h4 style={sectionHeaderStyle}><FaFileAlt /> Assignment Evaluation</h4>
                    <GlassCard style={{ padding: '20px', background: 'rgba(88, 166, 255, 0.03)', border: '1px solid rgba(88, 166, 255, 0.1)' }}>
                      <form onSubmit={handleSaveAssignment} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                        <div>
                          <label style={labelStyle}>Quality (0-10)</label>
                          <input type="range" min="0" max="10" className="apple-input" value={assignmentForm.code_quality} onChange={(e) => setAssignmentForm({ ...assignmentForm, code_quality: parseInt(e.target.value) })} />
                        </div>
                        <div>
                          <label style={labelStyle}>Logic (0-10)</label>
                          <input type="range" min="0" max="10" className="apple-input" value={assignmentForm.problem_solving} onChange={(e) => setAssignmentForm({ ...assignmentForm, problem_solving: parseInt(e.target.value) })} />
                        </div>
                        <div>
                          <label style={labelStyle}>Speed (0-10)</label>
                          <input type="range" min="0" max="10" className="apple-input" value={assignmentForm.timeliness} onChange={(e) => setAssignmentForm({ ...assignmentForm, timeliness: parseInt(e.target.value) })} />
                        </div>
                        <div style={{ gridColumn: 'span 3' }}>
                          <label style={labelStyle}>Technical Review Comments</label>
                          <textarea className="apple-input" style={{ minHeight: '60px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }} value={assignmentForm.notes} onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })} placeholder="Provide feedback on the submitted assignment..." />
                        </div>
                        <div style={{ gridColumn: 'span 3', display: 'flex', gap: '10px' }}>
                          <button type="submit" onClick={() => setAssignmentForm({ ...assignmentForm, decision: 'pass' })} className="apple-btn" style={{ flex: 1, background: 'var(--accent-blue)' }}>Mark Passed</button>
                          <button type="submit" onClick={() => setAssignmentForm({ ...assignmentForm, decision: 'fail' })} className="apple-btn" style={{ flex: 1, background: 'rgba(248, 81, 73, 0.1)', color: 'var(--accent-red)' }}>Mark Failed</button>
                        </div>
                      </form>
                    </GlassCard>
                  </div>
                )}

                {selectedCandidate.current_stage === "Interview" && (
                  <div>
                    <h4 style={sectionHeaderStyle}><FaCalendarCheck /> Schedule Interview Round</h4>
                    <GlassCard style={{ padding: '20px', background: 'rgba(191, 90, 242, 0.03)', border: '1px solid rgba(191, 90, 242, 0.1)' }}>
                      <form onSubmit={handleScheduleInterview} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={labelStyle}>Round Number</label>
                          <input type="number" className="apple-input" value={interviewForm.round_number} onChange={(e) => setInterviewForm({ ...interviewForm, round_number: parseInt(e.target.value) || 1 })} />
                        </div>
                        <div>
                          <label style={labelStyle}>Interview Type</label>
                          <select className="apple-input" value={interviewForm.interview_type} onChange={(e) => setInterviewForm({ ...interviewForm, interview_type: e.target.value })}>
                            <option value="Technical">Technical</option>
                            <option value="Managerial">Managerial</option>
                            <option value="HR Round">HR Round</option>
                            <option value="Values Alignment">Values Alignment</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={labelStyle}>Assign Interviewer (HR / TL / Manager)</label>
                          <select className="apple-input" value={interviewForm.interviewer_id} onChange={(e) => setInterviewForm({ ...interviewForm, interviewer_id: e.target.value })}>
                            <option value="">Select Interviewer...</option>
                            {employees
                                .filter(e => {
                                  const r = (e.role || '').toLowerCase().replace(/[_\s]+/g, '');
                                  return ['hr', 'teamleader', 'manager'].some(allowed => r.includes(allowed));
                                })
                                .map((emp: any) => (
                                  <option key={emp.employee_id || String(emp.id)} value={emp.employee_id || String(emp.id)}>
                                    {emp.name || (emp.first_name + ' ' + (emp.last_name || ''))} ({emp.employee_id || emp.id}) - {emp.designation || emp.role}
                                  </option>
                                ))
                            }
                          </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={labelStyle}>Interview Date & Time</label>
                          <input type="datetime-local" className="apple-input" value={interviewForm.interview_date} onChange={(e) => setInterviewForm({ ...interviewForm, interview_date: e.target.value })} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <button type="submit" className="apple-btn" style={{ width: '100%', background: 'var(--accent-purple)', color: 'white' }}>Schedule & Notify Interviewer</button>
                        </div>
                      </form>
                    </GlassCard>
                  </div>
                )}

                {screenings.filter((s: any) => String(s.candidate_id) === String(selectedCandidate.candidate_id || selectedCandidate.id) || String(s.candidate_id) === String(selectedCandidate.id)).length > 0 && (
                  <div>
                    <h4 style={sectionHeaderStyle}><FaUserCheck /> Screening Logs</h4>
                    {screenings.filter((s: any) => String(s.candidate_id) === String(selectedCandidate.candidate_id || selectedCandidate.id) || String(s.candidate_id) === String(selectedCandidate.id)).map((s: any, i: number) => (
                      <div key={s.screening_id || i} style={{ ...detailBoxStyle, marginBottom: '10px', fontSize: '11px', padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>SCREENING: {s.type ? s.type.toUpperCase() : "FEEDBACK"}</span>
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Today'}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>{s.screening_notes || s.notes}</div>
                        {s.decision && <div style={{ fontSize: '10px', marginTop: '5px', color: s.decision === 'rejected' || s.decision === 'fail' ? 'var(--accent-red)' : 'var(--accent-green)' }}>Result: {s.decision.toUpperCase()}</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <h4 style={sectionHeaderStyle}><FaAward /> Interview Scorecards</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {interviews.filter((int: any) => 
                      String(int.candidate_id).toLowerCase().trim() === String(selectedCandidate.candidate_id || '').toLowerCase().trim() ||
                      String(int.candidate_id).toLowerCase().trim() === String(selectedCandidate.id || '').toLowerCase().trim()
                    ).map((int: any, i: number) => {
                      const interviewer = employees.find((e: any) => 
                        String(e.id) === String(int.interviewer_id) || 
                        String(e.employee_id) === String(int.interviewer_id)
                      );
                      const isCompleted = int.status?.toLowerCase() === 'completed';
                      return (
                        <div key={int.interview_id || i} style={{ ...detailBoxStyle, padding: '15px', background: isCompleted ? 'rgba(88, 166, 255, 0.05)' : 'rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                              Round {int.round_number}: {int.interview_type}
                            </div>
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: int.result === 'pass' ? 'rgba(57, 211, 83, 0.1)' : (int.result === 'fail' ? 'rgba(248, 81, 73, 0.1)' : 'rgba(255,255,255,0.05)'),
                              color: int.result === 'pass' ? 'var(--accent-green)' : (int.result === 'fail' ? 'var(--accent-red)' : 'var(--text-tertiary)'),
                              fontWeight: 'bold'
                            }}>
                              {isCompleted ? (int.result ? int.result.toUpperCase() : 'COMPLETED') : 'PENDING'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Interviewer: <strong>{interviewer?.name || int.interviewer_id}</strong>
                          </div>
                          {isCompleted && (
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                              <div style={{ fontSize: '11px' }}>"{int.feedback || "No feedback provided."}"</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <h4 style={sectionHeaderStyle}>Compensation & Referral</h4>
                <div style={detailBoxStyle}>
                  <div style={infoRowStyle}><span>Current CTC:</span> <strong>{selectedCandidate.current_ctc || 'Not shared'}</strong></div>
                  <div style={infoRowStyle}><span>Expected CTC:</span> <strong>{selectedCandidate.expected_ctc}</strong></div>
                  <div style={infoRowStyle}><span>Sourcing Partner:</span> <strong>{selectedCandidate.source}</strong></div>
                  {selectedCandidate.referred_by && <div style={infoRowStyle}><span>Referred By:</span> <strong>{selectedCandidate.referred_by}</strong></div>}
                </div>
                <div style={{ marginTop: '20px' }}>
                  <h4 style={sectionHeaderStyle}>Internal Documents</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="apple-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', fontSize: '12px' }}>
                      <FaFileAlt /> View Resume
                    </button>
                    {selectedCandidate.linkedin_url && (
                      <a href={selectedCandidate.linkedin_url} target="_blank" className="apple-btn" rel="noreferrer" style={{ flex: 1, background: '#0077b5', color: 'white', textDecoration: 'none', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaLinkedin /> LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
              {selectedCandidate.current_stage !== 'Rejected' && selectedCandidate.current_stage !== 'Hired' && !["Telephonic", "Screening (Zoom Meeting)", "Assignment"].includes(selectedCandidate.current_stage) && (
                <>
                  {selectedCandidate.current_stage === 'Selected' ? (
                    <button className="apple-btn" style={{ flex: 1, background: 'var(--accent-orange)' }} onClick={() => window.location.href = '/recruiter/offers'}>
                      <FaFileSignature /> Release Official Offer Letter
                    </button>
                  ) : (
                    <button className="apple-btn" style={{ flex: 1, background: 'var(--accent-blue)' }} onClick={() => handleMove(selectedCandidate.candidate_id || selectedCandidate.id, selectedCandidate.current_stage)}>
                      <FaCheck /> Move to {stages[stages.indexOf(selectedCandidate.current_stage) + 1]}
                    </button>
                  )}
                  <button className="apple-btn" style={{ flex: 1, background: 'rgba(248, 81, 73, 0.15)', color: 'var(--accent-red)' }} onClick={() => handleReject(selectedCandidate.candidate_id || selectedCandidate.id)}>
                    <FaTimes /> Mark as Ineligible / Reject
                  </button>
                </>
              )}
              {["Telephonic", "Screening (Zoom Meeting)", "Assignment"].includes(selectedCandidate.current_stage) && (
                <button className="apple-btn" style={{ flex: 1, background: 'rgba(248, 81, 73, 0.15)', color: 'var(--accent-red)' }} onClick={() => handleReject(selectedCandidate.candidate_id || selectedCandidate.id)}>
                  <FaTimes /> Mark as Ineligible / Reject
                </button>
              )}
              <button 
                className="apple-btn" 
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }} 
                onClick={async () => {
                  if (window.confirm("Are you sure you want to archive this candidate?")) {
                    await deleteCandidate(selectedCandidate.candidate_id || selectedCandidate.id);
                    setSelectedCandidate(null);
                    loadData();
                  }
                }}
              >
                Archive
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
