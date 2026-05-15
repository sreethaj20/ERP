import React, { useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { refreshOffers, refreshCandidates, refreshJobs, getVisibleOffers, updateOfferStatus, createOffer, getVisibleCandidates, getVisibleJobs, getCandidates, acceptOfferLetter, rejectOfferLetter } from "../../utils/storage";
import {
    FaFileSignature, FaCheck, FaTimes, FaPlus, FaMoneyBillWave,
    FaCalendarCheck, FaGift, FaBuilding, FaCheckCircle, FaSearch,
    FaUserClock, FaEnvelopeOpenText, FaHistory, FaDownload, FaFilePdf
} from 'react-icons/fa';
import OfferLetterTemplate from "../../components/recruiter/OfferLetterTemplate";

export interface Offer {
  id: number;
  offer_id: string;
  candidate_id: string;
  job_id: string;
  offered_ctc: string;
  salary?: number;
  joining_date: string;
  offer_status: string;
  department?: string;
  employment_type?: string;
  reporting_manager_id?: string;
  candidate?: { name: string; email: string };
  job?: { title: string };
}

export default function OfferManagement() {
    const userId = sessionStorage.getItem('userId') || '';
    const userRole = sessionStorage.getItem('userRole') || 'Recruiter';

    const [isAdding, setIsAdding] = useState(false);
    const [isManualMode, setIsManualMode] = useState(false); // NEW: Manual offer without DB candidate
    const [form, setForm] = useState({
        candidate_id: "",
        candidate_name: "", // NEW: Raw name for manual mode
        job_id: "",
        selectedJobTitle: "",
        offered_ctc: "",
        fixed_component: "",
        variable_component: "",
        joining_bonus: "0",
        relocation_bonus: "0",
        joining_date: "",
        offer_expiry_date: "",
        department: "",
        employment_type: "Full-time",
        reporting_manager_id: "",
        offer_letter_url: "",
        email: "",
        phone: ""
    });

    const [candidateSearch, setCandidateSearch] = useState("");
    const [jobSearch, setJobSearch] = useState(""); 

    const [selectedOfferForPrint, setSelectedOfferForPrint] = useState<any>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [candidatesData, setCandidatesData] = useState<any[]>([]);
    const [offersData, setOffersData] = useState<any[]>([]);
    const [jobsData, setJobsData] = useState<any[]>([]);

    const loadData = async () => {
        try {
            // Always refresh from API — do not read stale in-memory cache
            const [cands, offs, jbs] = await Promise.all([
                refreshCandidates(),
                refreshOffers(),
                refreshJobs()
            ]);
            setCandidatesData(Array.isArray(cands) ? cands : []);
            setOffersData(Array.isArray(offs) ? offs : []);
            setJobsData(Array.isArray(jbs) ? jbs : []);
        } catch (error) {
            console.error("Error loading offer data:", error);
        }
    };

    React.useEffect(() => {
        loadData();
    }, []);

    const offers = (offersData || []).filter((o: any) => {
        const cand = (candidatesData || []).find((c: any) => (c.candidate_id === o.candidate_id || c.id === o.candidate_id));
        const name = cand?.name || (cand ? (cand.first_name + " " + (cand.last_name || "")) : "Unknown");
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Candidates eligible for offers: Pipeline "Selected" OR Legacy pre-selected candidates
    const eligibleCandidates = (candidatesData || []).filter((c: any) => {
        const stage = (c.current_stage || "").toLowerCase();
        const isLegacySelected = !c.current_stage && (
            (c.application_status || "").toLowerCase() === "selected" ||
            (c.status || "").toLowerCase() === "selected" ||
            c.name?.toLowerCase().includes("selected") ||
            c.candidate_name?.toLowerCase().includes("selected")
        );
        return ["selected", "final round", "interview"].includes(stage) || isLegacySelected;
    });
    console.log('[OfferManagement] Eligible candidates count:', eligibleCandidates.length, '- Total candidates:', candidatesData.length);
    const jobs = jobsData || [];

    const handleCreateOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[OfferManagement] Raw form values:', {
            candidate_id: form.candidate_id,
            job_id: form.job_id,
            offered_ctc: form.offered_ctc,
            joining_date: form.joining_date
        });
        
        // 🔍 ENHANCED VALIDATION - Manual mode accepts any name
        const ctcNum = parseFloat(form.offered_ctc);
        const candidateInput = isManualMode ? form.candidate_name.trim() : form.candidate_id.trim();
        if (!candidateInput) {
            return alert("❌ Candidate name/ID is required");
        }
        if (!form.job_id.trim()) {
            return alert("❌ Job Role is required"); 
        }
        if (!form.joining_date) {
            return alert("❌ Joining Date is required");
        }
        if (isNaN(ctcNum) || ctcNum <= 0) {
            return alert("❌ CTC must be a valid positive number");
        }
        console.log('[OfferManagement] Raw form values:', {
            candidate_id: form.candidate_id,
            job_id: form.job_id,
            offered_ctc: form.offered_ctc,
            ctc_num: ctcNum,
            joining_date: form.joining_date,
            manual_mode: isManualMode
        });

        if (isManualMode) {
            // MANUAL MODE: Generate ID & PDF (skip backend)
            const manualCandidateId = `MANUAL-${Date.now()}-${form.candidate_name.trim().replace(/\\s+/g, '-').substring(0,20)}`;
            const manualOffer = {
                offer_id: `OFFER-${manualCandidateId}`,
                candidate_id: manualCandidateId,
                candidate_name: form.candidate_name.trim(),
                first_name: form.candidate_name.trim().split(' ')[0] || form.candidate_name.trim(),
                job_title: form.job_id.trim(),
                job_id: form.job_id.trim(),
                offered_ctc: ctcNum.toLocaleString('en-IN'),
                ctc: ctcNum,
                fixed_component: parseFloat(form.fixed_component) || 0,
                joining_date: form.joining_date,
                department: form.department || 'Engineering',
                employment_type: form.employment_type || 'Full-time',
                reporting_manager_id: form.reporting_manager_id || 'MGR-001',
                offer_status: 'sent'
            };
            
            console.log('[Manual Offer] Generated:', manualOffer);
            setSelectedOfferForPrint(manualOffer);
            setTimeout(() => {
                const candidateName = manualOffer.candidate_name.replace(/[^a-zA-Z0-9]/g, '_');
                const offerPdfName = `Offer_Letter_${candidateName}_${new Date().toISOString().slice(0,10)}.pdf`;
                window.print();
            }, 100);
            alert(`✅ MANUAL OFFER GENERATED!\nID: ${manualCandidateId}\nPrint PDF now! (No DB record)`);
            setIsAdding(false);
            return;
        }

        // NORMAL MODE backend
        const offerLetterPreviewUrl = form.offer_letter_url || `/api/recruiter/offer/preview/${form.candidate_id.trim()}-${Date.now()}`;
        
        try {
            const offerPayload = {
                candidate_id: form.candidate_id.trim(),
                job_id: form.job_id.trim(),
                ctc: parseFloat(form.offered_ctc) || 0,
                salary: parseFloat(form.fixed_component) || 0,
                joining_date: form.joining_date,
                offer_status: "sent",
                sent_by: sessionStorage.getItem('userId') || 'REC-001',
                sent_at: new Date().toISOString(),
                fixed_component: parseFloat(form.fixed_component) || 0,
                variable_component: parseFloat(form.variable_component) || 0,
                joining_bonus: parseFloat(form.joining_bonus) || 0,
                relocation_bonus: parseFloat(form.relocation_bonus) || 0,
                offer_expiry_date: form.offer_expiry_date || null,
                department: form.department || '',
                employment_type: form.employment_type || 'Full-time',
                reporting_manager_id: form.reporting_manager_id || '',
                offer_letter_url: offerLetterPreviewUrl
            };

            console.log('[OfferManagement] 🔄 Sending EXACT payload to backend:', JSON.stringify(offerPayload, null, 2));
            
            const result = await createOffer(offerPayload);
            console.log('[OfferManagement] Success:', result);
            
            // Reset form
            setForm({
                candidate_id: "", candidate_name: "", job_id: "", selectedJobTitle: "",
                offered_ctc: "", fixed_component: "",
                variable_component: "", joining_bonus: "0", relocation_bonus: "0",
                joining_date: "", offer_expiry_date: "", department: "",
                employment_type: "Full-time", reporting_manager_id: "MGR-001", offer_letter_url: "",
                email: "", phone: ""
            });
            setIsAdding(false);
            setCandidateSearch('');
            setJobSearch('');
            await loadData();
            alert("✅ OFFER LETTER RELEASED SUCCESSFULLY!\nBackend created record in offers table.");
        } catch (error: any) {
            console.error('[OfferManagement] ERROR:', error);
            alert(`❌ Failed to release offer letter:\n${error.message || 'Backend error'}\nCheck Console F12 for details`);
        }
    };

    const handleAccept = async (offer: any) => {
        try {
            const payload = {
                joining_date: offer.joining_date,
                department: offer.department,
                employment_type: offer.employment_type || "Full-Time", // Fixed from employee_type
                manager_id: offer.reporting_manager_id
            };
            const offerId = offer.offer_id || offer.id || (typeof offer === 'number' ? offer : null);
            if (!offerId) throw new Error("Offer ID missing");
            
            await acceptOfferLetter(offerId, payload);
            await loadData();
            alert("Offer Accepted! Automating Employee creation and Onboarding initiation...");
        } catch (error) {
            console.error("Error accepting offer:", error);
            alert("Failed to accept offer. Check console for details.");
        }
    };

    const handleReject = async (offerId: any) => {
        const reason = prompt("Enter the reason for decline (for analytics):");
        if (reason) {
            await rejectOfferLetter(offerId, reason);
            await loadData();
        }
    };

    const handlePrintOffer = (offer: any) => {
        setSelectedOfferForPrint(offer);
        const candidateName = (offer.candidate_name || offer.candidate?.name || 'Candidate').replace(/[^a-zA-Z0-9]/g, '_');
        const offerPdfName = `Offer_Letter_${candidateName}_${new Date().toISOString().slice(0, 10)}.pdf`;
        
        // Temporarily change document title for PDF print filename
        const originalTitle = document.title;
        document.title = offerPdfName;
        
        setTimeout(() => {
            window.print();
            // Restore title after print dialog closes
            setTimeout(() => {
                document.title = originalTitle;
            }, 1000);
        }, 300);
    };

    return (
        <>
            <div className="dashboard-container">
                <Header role="Recruiter" title="Offer & Contract Management" />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '20px' }}>
                            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                                <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input
                                    className="apple-input"
                                    placeholder="Search offers by candidate name..."
                                    style={{ paddingLeft: '45px' }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <label className="toggle-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <input 
                                    type="checkbox" 
                                    checked={isManualMode}
                                    onChange={(e) => setIsManualMode(e.target.checked)}
                                    style={{ width: '16px', height: '16px' }}
                                />
                                Manual Mode (No DB Required)
                            </label>
                            <button className="apple-btn" onClick={() => setIsAdding(!isAdding)}>
                                <FaPlus /> {isAdding ? 'Cancel' : 'Release New Offer'}
                            </button>
                        </div>

                {isAdding && (
                    <GlassCard title="Official Offer Configuration" style={{ marginBottom: '30px' }}>
                        <form onSubmit={handleCreateOffer} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>{isManualMode ? 'Candidate Full Name' : 'Candidate'} <span style={{fontSize:'10px'}}>({isManualMode ? 'Any name OK' : 'Name/ID → Auto-resolves'}) *</span></label>
                                <input 
                                    className="apple-input" 
                                    placeholder={isManualMode ? "Type full name (e.g. VAMSHI KRISHNA)" : "Type candidate name/ID (e.g. KRISHNA VENKAT)..."} 
                                    value={isManualMode ? form.candidate_name : candidateSearch}
                                    onChange={(e) => {
                                        if (isManualMode) {
                                            setForm({ ...form, candidate_name: e.target.value });
                                        } else {
                                            setCandidateSearch(e.target.value);
                                            setForm({ ...form, candidate_id: e.target.value });
                                        }
                                    }} 
                                />
                                {(isManualMode ? form.candidate_name : form.candidate_id) && (
                                    <div style={{fontSize:'11px', color:'var(--accent-green)', marginTop:'4px'}}>
                                        ✓ {isManualMode ? `Manual: ${form.candidate_name}` : `Using: ${form.candidate_id}`}
                                    </div>
                                )}
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Job Role <span style={{fontSize:'10px'}}>(Title/ID → Auto-resolves)</span> *</label>
                                <input 
                                    className="apple-input" 
                                    placeholder="Type job title/ID (e.g. AR CALLER)..." 
                                    value={jobSearch}
                                    onChange={(e) => {
                                        setJobSearch(e.target.value);
                                        setForm({ ...form, job_id: e.target.value, selectedJobTitle: e.target.value });
                                    }} 
                                />
                                {form.job_id && (
                                    <div style={{fontSize:'11px', color:'var(--accent-green)', marginTop:'4px'}}>
                                        ✓ Using: {form.job_id}
                                    </div>
                                )}
                            </div>

                            {/* Selected Candidate Snapshot */}
                            {(() => {
                                const cand = eligibleCandidates.find((c: any) => (c.candidate_id === form.candidate_id || c.id === form.candidate_id));
                                if (!cand) return null;
                                const fullName = cand.name || `${cand.first_name} ${cand.last_name}`;
                                return (
                                    <div style={{
                                        gridColumn: 'span 4',
                                        background: 'rgba(57, 211, 83, 0.05)',
                                        border: '1px solid rgba(57, 211, 83, 0.1)',
                                        padding: '15px',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '14px',
                                        marginTop: '5px',
                                        animation: 'fadeIn 0.3s ease'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--accent-green)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                                                {fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text-primary)' }}>{fullName}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cand.email} • {cand.phone}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '13px' }}>EXP: {cand.total_experience_years || '0'} YRS</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px' }}>SOURCE: {cand.source || 'Direct'}</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div>
                                <label style={labelStyle}>Total CTC Offered (L.P.A) *</label>
                                <input className="apple-input" type="number" placeholder="12,00,000" value={form.offered_ctc} onChange={(e) => setForm({ ...form, offered_ctc: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Fixed Component (L.P.A)</label>
                                <input className="apple-input" type="number" placeholder="10,00,000" value={form.fixed_component} onChange={(e) => setForm({ ...form, fixed_component: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Variable Component</label>
                                <input className="apple-input" type="number" value={form.variable_component} onChange={(e) => setForm({ ...form, variable_component: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Joining Bonus</label>
                                <input className="apple-input" type="number" value={form.joining_bonus} onChange={(e) => setForm({ ...form, joining_bonus: e.target.value })} />
                            </div>

                            <div>
                                <label style={labelStyle}>Relocation Bonus</label>
                                <input className="apple-input" type="number" value={form.relocation_bonus} onChange={(e) => setForm({ ...form, relocation_bonus: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Official Joining Date *</label>
                                <input type="date" className="apple-input" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Offer Expiry Date</label>
                                <input type="date" className="apple-input" value={form.offer_expiry_date} onChange={(e) => setForm({ ...form, offer_expiry_date: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Reporting Manager ID</label>
                                <input className="apple-input" placeholder="MGR-001" value={form.reporting_manager_id} onChange={(e) => setForm({ ...form, reporting_manager_id: e.target.value })} />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Department</label>
                                <input className="apple-input" placeholder="e.g. Sales / Engineering" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Offer Letter URL / Drive Link <span style={{ fontSize: '9px', opacity: 0.7 }}>(Optional - auto-generates preview)</span></label>
                                <input className="apple-input" placeholder="https://drive.google.com/..." value={form.offer_letter_url} onChange={(e) => setForm({ ...form, offer_letter_url: e.target.value })} />
                            </div> 

                            <div style={{ gridColumn: 'span 4', marginTop: '10px' }}>
                                <button type="submit" className="apple-btn" style={{ width: '100%', background: 'var(--accent-orange)', fontWeight: 'bold' }}>
                                    <FaFileSignature /> Release Formally & Notify Candidate
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                )}

                <div className="grid-2">
                    {offers.map((o: any) => {
                        const cand = candidatesData.find((c: any) => (c.candidate_id === o.candidate_id || c.id === o.candidate_id || c.id === Number(o.candidate_id)));
                        const job = jobs.find((j: any) => String(j.job_id) === String(o.job_id) || String(j.id) === String(o.job_id));

                        return (
                            <GlassCard key={o.id} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                        <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaEnvelopeOpenText fontSize="20px" color="var(--accent-orange)" />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '18px', margin: 0 }}>{cand?.name || (cand ? (cand.first_name + " " + cand.last_name) : "Candidate " + o.candidate_id)}</h3>
                                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{job?.title || 'Job Selection Required'}</span>
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '10px',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        background: o.offer_status === 'accepted' ? 'rgba(48, 209, 88, 0.1)' : o.offer_status === 'declined' ? 'rgba(248, 81, 73, 0.1)' : 'rgba(10, 132, 255, 0.1)',
                                        color: o.offer_status === 'accepted' ? 'var(--accent-green)' : o.offer_status === 'declined' ? 'var(--accent-red)' : 'var(--accent-blue)',
                                        border: `1px solid ${o.offer_status === 'accepted' ? 'rgba(48, 209, 88, 0.2)' : o.offer_status === 'declined' ? 'rgba(248, 81, 73, 0.2)' : 'rgba(10, 132, 255, 0.2)'}`
                                    }}>
                                        {o.offer_status}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <span style={miniLabelStyle}><FaMoneyBillWave /> Offered CTC</span>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>₹{parseInt(o.offered_ctc || '0').toLocaleString('en-IN')} L.P.A</div>
                                    </div>
                                    <div>
                                        <span style={miniLabelStyle}><FaCalendarCheck /> Joining Date</span>
                                        <div style={{ fontSize: '14px' }}>{o.joining_date ? new Date(o.joining_date).toLocaleDateString() : 'TBD'}</div>
                                    </div>
                                    <div>
                                        <span style={miniLabelStyle}><FaBuilding /> Office/Dept</span>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{o.department || 'Not Set'}</div>
                                    </div>
                                    <div>
                                        <span style={miniLabelStyle}><FaUserClock /> Manager ID</span>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{o.reporting_manager_id}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    {o.offer_status === "sent" && (
                                        <>
                                            <button className="apple-btn" style={{ flex: 1, background: 'var(--accent-green)' }} onClick={() => handleAccept(o)}>
                                                <FaCheck /> Accept
                                            </button>
                                            <button className="apple-btn" style={{ flex: 1, background: 'rgba(248, 81, 73, 0.1)', color: 'var(--accent-red)' }} onClick={() => handleReject(o.id)}>
                                                <FaTimes /> Decline
                                            </button>
                                        </>
                                    )}
                                    <button className="apple-btn" style={{ flex: 1.5, background: 'rgba(255,255,255,0.05)' }} onClick={() => handlePrintOffer(o)}>
                                        <FaFilePdf /> Generate Official Letter
                                    </button>
                                </div>

                                {o.offer_status === "declined" && (
                                    <div style={{ width: '100%', padding: '12px', background: 'rgba(248, 81, 73, 0.05)', color: 'var(--accent-red)', borderRadius: '10px', fontSize: '11px' }}>
                                        <strong>Decline Reason:</strong> {o.declined_reason || 'No reason specified'}
                                    </div>
                                )}
                            </GlassCard>
                        );
                    })}
                    {offers.length === 0 && (
                        <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                            No releases available in the offer pipeline.
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Printable Section */}
            {selectedOfferForPrint && (
                <div id="offer-letter-print-zone" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(10px)',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10001,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        padding: '20px 40px',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(5px)'
                    }} className="no-print">
                        <button className="apple-btn" onClick={() => window.print()} style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '10px 24px', fontSize: '14px', borderRadius: '30px', fontWeight: 600 }}>
                            <FaDownload /> Download / Print PDF
                        </button>
                        <button className="apple-btn" onClick={() => setSelectedOfferForPrint(null)} style={{ background: '#333', color: 'white', border: '1px solid #555', padding: '10px 24px', fontSize: '14px', borderRadius: '30px' }}>
                            <FaTimes /> Close Preview
                        </button>
                    </div>

                    <div className="preview-content-wrap" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '40px 0'
                    }}>
                            <OfferLetterTemplate
                            offer={selectedOfferForPrint}
                            candidate={candidatesData.find((c: any) => c.candidate_id === selectedOfferForPrint.candidate_id || c.id === selectedOfferForPrint.candidate_id) || selectedOfferForPrint.candidate}
                            job={jobsData.find((j: any) => String(j.job_id) === String(selectedOfferForPrint.job_id) || String(j.id) === String(selectedOfferForPrint.job_id)) || selectedOfferForPrint.job}
                        /> 
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }

                    /* Hide interactive UI elements */
                    .top-header, 
                    .bottom-dock-container,
                    .announcement-banner,
                    .no-print {
                        display: none !important;
                    }

                    /* Disable layout constraints that break pagination */
                    html, body, #root, .layout-root, .dashboard-container {
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        display: block !important;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        max-width: none !important;
                    }

                    /* Hide UI elements efficiently */
                    header, footer, nav, .no-print, .dashboard-container > div:not(#offer-letter-print-zone) {
                        display: none !important;
                    }

                    /* Reset print zone for multi-page flow */
                    #offer-letter-print-zone {
                        display: block !important;
                        position: relative !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        visibility: visible !important;
                        overflow: visible !important;
                    }

                    .preview-content-wrap {
                        display: block !important;
                        padding: 0 !important;
                    }

                    .offer-letter-container {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .offer-page {
                        page-break-after: always !important;
                        page-break-inside: avoid !important;
                        break-after: page !important;
                        display: flex !important;
                        flex-direction: column !important;
                        height: 296.8mm !important;
                        width: 210mm !important;
                        margin: 0 auto !important;
                        padding: 15mm 20mm !important;
                        background: white !important;
                        border: none !important;
                        box-shadow: none !important;
                        overflow: hidden !important; /* Keep internal page content clipped to A4 */
                        position: relative !important;
                        box-sizing: border-box !important;
                    }
                    
                    /* Force background graphics */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}} />
        </>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block', padding: '2px 0', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase'
};

const miniLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '9px',
    color: 'var(--text-tertiary)',
    marginBottom: '4px',
    fontWeight: '800',
    textTransform: 'uppercase'
};
