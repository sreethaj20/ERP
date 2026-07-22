import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import Logo from "../../components/Logo";
import headerLogoImage from "../../assets/mercure-logo.jpeg";
import watermarkImage from "../../assets/mercure-logo.png";
import uditSignatureImage from "../../assets/udit-signature.png";
import {
  getOffboardingRequests, addOffboardingRequest, updateOffboardingRequest,
  createOffboardingRequest, getEmployees, updateEmployee, finalizeOffboarding
} from "../../utils/storage";
import { FaClock, FaMoneyBillWave, FaShieldAlt, FaCommentAlt, FaCheck, FaTimes, FaFilePdf, FaDownload, FaTimesCircle } from "react-icons/fa";

export default function OffboardingGovernance() {
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployeesState] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [newForm, setNewForm] = useState({ employee_id: '', exit_date: '', reason: 'resign', handover_to: '' });

  // Relieving Letter State
  const [showLetter, setShowLetter] = useState(false);
  const [letterData, setLetterData] = useState<any>(null);

  const handlePrintRelievingLetter = () => {
    if (!letterData) return;
    const empName = (letterData.name || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
    const pdfName = `Relieving_Letter_${empName}_${new Date().toISOString().slice(0, 10)}.pdf`;
    const originalTitle = document.title;
    document.title = pdfName;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 300);
  };

  const formatLetterData = (emp: any, reqRecord: any) => {
    const toTitleCase = (str: string) => {
      if (!str) return '';
      const formatted = str.trim();
      if (formatted.toUpperCase() === 'TEAMLEADER') return 'Team Leader';
      return formatted.replace(/\b\w+/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    };

    const parseDateString = (dateInput: any): Date | null => {
      if (!dateInput) return null;
      if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
      
      const str = String(dateInput).trim();
      if (!str) return null;

      const isoMatch = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
      if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1;
        const day = parseInt(isoMatch[3], 10);
        return new Date(year, month, day);
      }

      const textMonthMatch = str.match(/^(\d{1,2})[-/\s]([A-Za-z]+)[-/\s](\d{4})/);
      if (textMonthMatch) {
        const day = parseInt(textMonthMatch[1], 10);
        const monthStr = textMonthMatch[2].toLowerCase();
        const year = parseInt(textMonthMatch[3], 10);
        
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIndex = months.findIndex(m => m.startsWith(monthStr));
        if (monthIndex !== -1) {
          return new Date(year, monthIndex, day);
        }
      }

      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatDate = (dateInput: any) => {
      const parsed = parseDateString(dateInput);
      if (!parsed) return 'TBD';
      const day = String(parsed.getDate()).padStart(2, '0');
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${day}-${months[parsed.getMonth()]}-${parsed.getFullYear()}`;
    };

    const resignationDateVal = parseDateString(reqRecord?.created_at || reqRecord?.request_date) || new Date();
    const noticeDays = reqRecord?.notice_period_days !== undefined ? reqRecord.notice_period_days : 60;
    const dorVal = (() => {
      const d = new Date(resignationDateVal);
      d.setDate(d.getDate() + noticeDays);
      return d;
    })();

    return {
      name: toTitleCase(emp?.name || 'Employee'),
      id: emp?.employee_id || emp?.id || reqRecord?.employee_id,
      designation: toTitleCase(emp?.designation || 'Specialist'),
      doj: formatDate(emp?.joining_date || emp?.doj || '2023-01-01'),
      dor: formatDate(dorVal),
      resignationDate: formatDate(resignationDateVal),
      issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    };
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const offboardingRequests = await getOffboardingRequests();
      const employeeData = await getEmployees();
      setRequests(Array.isArray(offboardingRequests) ? offboardingRequests : []);
      setEmployeesState(Array.isArray(employeeData) ? employeeData : []);
    } catch (error) {
      console.error("Error loading offboarding data:", error);
    }
  };

  const getEmpName = (empId: string) => {
    const emp = (employees || []).find((e: any) => (e.id === empId || e.employee_id === empId));
    return emp?.name || empId;
  };
  const getEmpDetails = (empId: string) => (employees || []).find((e: any) => (e.id === empId || e.employee_id === empId));

  const handleInitiate = async () => {
    if (!newForm.employee_id) return;
    const req = createOffboardingRequest(newForm.employee_id, {
      exit_date: newForm.exit_date,
      reason: newForm.reason,
      notice_period_days: newForm.reason === 'terminate' ? 0 : 30,
      notice_remaining_days: newForm.exit_date ? Math.max(0, Math.ceil((new Date(newForm.exit_date).getTime() - Date.now()) / (1000 * 3600 * 24))) : 30,
      handover_to: newForm.handover_to || null
    });
    try {
      await addOffboardingRequest(req);
      await updateEmployee(newForm.employee_id, { status: 'On Notice' });
      setNewForm({ employee_id: '', exit_date: '', reason: 'resign', handover_to: '' });
      await loadData();
      alert('Separation protocol launched!');
    } catch (error) {
      console.error("Error initiating offboarding:", error);
      alert('Error launching separation protocol');
    }
  };

  const handleApprove = async (offboard_id: number) => {
    try {
      await updateOffboardingRequest(offboard_id, { manager_approved: true });
      await loadData();
      if (selected?.offboard_id === offboard_id) setSelected((prev: any) => ({ ...prev, manager_approved: true }));
    } catch (error) {
       console.error("Error approving offboarding:", error);
    }
  };

  const handleComplete = async (offboard_id: number, employee_id: string) => {
    try {
      // 📡 ATOMIC SHUTDOWN: Calls the single backend transaction that:
      // 1. Sets OffboardingRequest.completed = True
      // 2. Sets Employee.status = 'Terminated'
      // 3. Sets User.is_active = False (Revokes Portal Access)
      await finalizeOffboarding(offboard_id);

      // Prepare Letter Data
      const emp = getEmpDetails(employee_id);
      const req = (requests || []).find(r => r.offboard_id === offboard_id) || selected;

      setLetterData(formatLetterData(emp, req));

      // Simulation: Automated Email Dispatch
      alert(`✅ Final Settlement Authorized.\n📧 Relieving letter has been automatically dispatched to ${emp?.email || 'employee'}.`);

      await loadData();
      // Update local selection so the UI reflects completion immediately
      setSelected({ ...selected, completed: true, manager_approved: true });
      setShowLetter(true); // Automatically show letter on completion
    } catch (error) {
      console.error("Error completing offboarding:", error);
    }
  };

  return (
    <>
      <div className="no-print">
        <Header role="Manager" title="Strategic Separation" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Offboarding Governance</h1>
        <p className="subtitle">Execute executive separation protocols, final settlements, and exit intelligence</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Separation Registry */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <GlassCard title="Initiate Separation" subtitle="Configure executive exit protocol">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <div style={inputGrp}>
                <label style={lblStyle}>Employee ID</label>
                <input className="apple-input" placeholder="e.g. EMP101" value={newForm.employee_id} onChange={e => setNewForm({ ...newForm, employee_id: e.target.value })} style={{ fontSize: '13px', background: 'rgba(255,255,255,0.05)', color: 'white' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={inputGrp}>
                  <label style={lblStyle}>Exit Date</label>
                  <input type="date" className="apple-input" value={newForm.exit_date} onChange={e => setNewForm({ ...newForm, exit_date: e.target.value })} style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: 'white' }} />
                </div>
                <div style={inputGrp}>
                  <label style={lblStyle}>Reason</label>
                  <select className="apple-input" value={newForm.reason} onChange={e => setNewForm({ ...newForm, reason: e.target.value })} style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                    <option value="resign">Resignation</option>
                    <option value="terminate">Termination</option>
                    <option value="layoff">Layoff</option>
                  </select>
                </div>
              </div>
              <div style={inputGrp}>
                <label style={lblStyle}>Handover Resource</label>
                <input className="apple-input" placeholder="Successor ID" value={newForm.handover_to} onChange={e => setNewForm({ ...newForm, handover_to: e.target.value })} style={{ fontSize: '13px', background: 'rgba(255,255,255,0.05)', color: 'white' }} />
              </div>
              <button onClick={handleInitiate} className="apple-btn" style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.2)', fontSize: '12px', height: '40px' }}>
                Launch Separation Protocol
              </button>
            </div>
          </GlassCard>

          <GlassCard title="Separation Registry" subtitle="Pending Departure Queue">
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
              {requests.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>No offboarding requests.</p>}
              {requests.map(r => (
                <div key={r.offboard_id} onClick={() => setSelected(r)} style={{
                  padding: "16px",
                  borderRadius: "16px",
                  background: selected?.offboard_id === r.offboard_id ? "rgba(10, 132, 255, 0.1)" : "rgba(255,255,255,0.02)",
                  border: selected?.offboard_id === r.offboard_id ? "1px solid #0a84ff" : "1px solid var(--border-light)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  opacity: r.completed ? 0.6 : 1
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', color: r.completed ? 'var(--text-secondary)' : 'white' }}>{getEmpName(r.employee_id)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {r.completed && <FaFilePdf color="#0a84ff" size={12} title="Relieving Letter Available" />}
                      <span style={{ fontSize: '10px', color: '#ff453a', fontWeight: 'bold' }}>{r.reason.toUpperCase()}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {r.completed ? 'Separation Complete' : `Target Exit: ${r.exit_date || 'TBD'} • ${r.notice_remaining_days} Days Left`}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Exit Protocol Blueprint */}
        <GlassCard title="Exit Protocol Blueprint" subtitle="Clearance and financial fulfillment">
          {selected ? (
            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '30px' }}>
                {/* Timeline Oversight */}
                <div>
                  <SectionTitle icon={<FaClock />} text="Timeline Oversight" />
                  <div style={infoGrid}>
                    <InfoLabel>Employee</InfoLabel><InfoVal>{getEmpName(selected.employee_id)}</InfoVal>
                    <InfoLabel>Handover To</InfoLabel><InfoVal>{selected.handover_to ? getEmpName(selected.handover_to) : 'N/A'}</InfoVal>
                    <InfoLabel>Notice Period</InfoLabel><InfoVal>{selected.notice_period_days} Days</InfoVal>
                    <InfoLabel>Days Remaining</InfoLabel><InfoVal>{selected.notice_remaining_days}</InfoVal>
                    <InfoLabel>Target Separation</InfoLabel><InfoVal style={{ color: '#ff453a' }}>{selected.exit_date || 'TBD'}</InfoVal>
                  </div>
                </div>

                {/* Financial Settlement */}
                <div>
                  <SectionTitle icon={<FaMoneyBillWave />} text="Financial Settlement" />
                  <div style={{ padding: '15px', background: 'rgba(48,209,88,0.05)', borderRadius: '12px', border: '1px dotted #30d158' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Full & Final Amount</span>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#30d158' }}>₹{(selected.final_dues_amount || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      Governance: {selected.manager_approved ? 'Manager Approved' : 'Approval Pending'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px' }}>
                {/* Clearance Checklist */}
                <div>
                  <SectionTitle icon={<FaShieldAlt />} text="Clearance Checklist" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <ClearanceItem label="IT Asset Return" status={selected.checklist_status?.it_clearance} />
                    <ClearanceItem label="HR Documentation" status={selected.checklist_status?.hr_settlement} />
                    <ClearanceItem label="Overall Protocol" status={selected.completed} />
                  </div>
                </div>

                {/* Exit Intelligence */}
                <div>
                  <SectionTitle icon={<FaCommentAlt />} text="Exit Intelligence" />
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px', color: 'var(--text-primary)' }}>Exit Notes:</div>
                    "{selected.exit_interview_notes || 'No notes recorded.'}"
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
                {!selected.manager_approved && (
                  <button onClick={() => handleApprove(selected.offboard_id)} className="apple-btn" style={{ flex: 1, height: '54px', background: 'var(--accent-blue)' }}>
                    <FaCheck /> Approve Separation
                  </button>
                )}
                {!selected.completed && selected.manager_approved && (
                  <button onClick={() => handleComplete(selected.offboard_id, selected.employee_id)} className="apple-btn" style={{ flex: 1, height: '54px', background: '#ff453a', color: 'white' }}>
                    <FaCheck /> Authorize Final Settlement
                  </button>
                )}
                {selected.completed && (
                  <div style={{ flex: 1, display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 2, height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(48,209,88,0.05)', borderRadius: '14px', color: '#30d158', fontWeight: 'bold', border: '1px solid rgba(48,209,88,0.2)' }}>
                      SEPARATION COMPLETE
                    </div>
                    <button
                      onClick={() => {
                        const emp = getEmpDetails(selected.employee_id);
                        setLetterData(formatLetterData(emp, selected));
                        setShowLetter(true);
                      }}
                      className="apple-btn"
                      style={{ flex: 1, height: '54px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', border: '1px solid rgba(10,132,255,0.2)' }}
                    >
                      <FaFilePdf /> View Letter
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              Select a separation request to review fulfillment data
            </div>
          )}
        </GlassCard>
      </div>
      </div>

      {/* Relieving Letter Modal */}
      {showLetter && letterData && (
        <div className="relieving-letter-modal-wrapper" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(15px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 20px', overflowY: 'auto' }}>
          <style>{`
            @media print {
              @page {
                size: A4;
                margin: 0 !important;
              }
              
              header, footer, nav, .top-header, .bottom-dock-container, .announcement-banner, .no-print, .no-print * {
                display: none !important;
                visibility: hidden !important;
              }
              
              html, body, #root, .layout-root, .dashboard-container {
                display: block !important;
                visibility: visible !important;
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
                background: white !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                max-width: none !important;
              }
              
              .dashboard-container::before,
              .dashboard-container::after {
                display: none !important;
                content: none !important;
              }
              
              .relieving-letter-modal-wrapper {
                position: relative !important;
                display: block !important;
                visibility: visible !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                z-index: auto !important;
                backdrop-filter: none !important;
              }
              
              .relieving-letter-modal-wrapper > div {
                position: relative !important;
                display: block !important;
                visibility: visible !important;
                width: 210mm !important;
                max-width: none !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 auto !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
              }
              
              .relieving-letter {
                display: flex !important;
                flex-direction: column !important;
                position: relative !important;
                width: 210mm !important;
                height: 268mm !important;
                min-height: 268mm !important;
                box-sizing: border-box !important;
                padding: 15mm 20mm !important;
                margin: 0 auto !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
                color: black !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                break-after: avoid !important;
                overflow: hidden !important;
              }
              
              .relieving-letter-footer {
                position: absolute !important;
                bottom: 10mm !important;
                left: 20mm !important;
                right: 20mm !important;
                padding-top: 10px !important;
                border-top: 1.5px solid #2b6cb0 !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: flex-start !important;
              }
              
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>
          <div style={{ position: 'relative', width: '100%', maxWidth: '850px', marginBottom: '60px' }}>
            <button className="no-print" onClick={() => setShowLetter(false)} style={{ position: 'fixed', top: '20px', right: '30px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', zIndex: 1001 }}>
              <FaTimesCircle size={20} /> Close Preview
            </button>

            {/* Paper Representation */}
            <div className="relieving-letter" style={{ 
                background: 'white', 
                color: '#333', 
                padding: '60px 80px', 
                borderRadius: '4px', 
                boxShadow: '0 30px 60px rgba(0,0,0,0.6)', 
                fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", 
                minHeight: '1050px', 
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
            }}>
              {/* Watermark Background Layer */}
              <div className="watermark-layer" style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '550px',
                  opacity: 0.12,
                  zIndex: 0,
                  pointerEvents: 'none',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  userSelect: 'none',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
              }}>
                  <img src={watermarkImage} alt="Watermark" style={{ width: '100%', height: 'auto', objectFit: 'contain', filter: 'grayscale(100%)' }} />
              </div>


                {/* Company Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '8px',
                    marginBottom: '30px',
                    borderBottom: '1.5px solid #2b6cb0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', height: '60px', overflow: 'hidden' }}>
                        <img
                            src={headerLogoImage}
                            alt="Mercure Solutions"
                            style={{ width: '200px', height: '60px', objectFit: 'contain', margin: '0', imageRendering: 'crisp-edges' }}
                        />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0', fontSize: '15px', color: '#000000', fontWeight: 'normal' }}>www.mercuresolution.com</p>
                    </div>
                </div>

                <div style={{ textAlign: 'right', marginBottom: '30px', fontSize: '13px' }}>
                  <b>Date:</b> {letterData.issueDate}
                </div>

                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '20px', textDecoration: 'underline', fontWeight: 'bold', margin: 0 }}>RELIEVING LETTER</h2>
                </div>

                <div style={{ fontSize: '14px', lineHeight: '1.8', textAlign: 'justify', color: '#000' }}>
                  <p>Dear <b>{letterData.name}</b>,</p>
                  <br />
                  <p>
                    With reference to your resignation email dated <b>{letterData.resignationDate}</b>, you are hereby relieved from your duties as of <b>{letterData.dor}</b>.
                    We confirm that you have been working with Mercure Solutions as <b>{letterData.designation}</b> from <b>{letterData.doj}</b> to <b>{letterData.dor}</b>.
                  </p>
                  <p>
                    We would like to thank you for your service with Mercure Solutions and wish you the best in your future endeavors.
                  </p>
                  <p style={{ marginTop: '16px', fontSize: '13px' }}>
                    <b>Note:</b> It is recommended to keep your current salaried bank account active for a minimum of 1 year from your date of relieving to ensure fast and hassle-free transactions by the company.
                  </p>
                </div>

                <div style={{ marginTop: '60px' }}>
                  <p style={{ margin: 0 }}>Yours sincerely,</p>
                  <p style={{ margin: '2px 0 0 0' }}>For and on behalf of <b>Mercure Solutions</b></p>
                  <div style={{ height: '65px', display: 'flex', alignItems: 'center', margin: '3px 0 0 0' }}>
                    <img
                      src={uditSignatureImage}
                      alt="Udit Rao Signature"
                      style={{ height: '60px', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <b>Udit Rao</b>
                    <div style={{ fontSize: '11px', color: '#666' }}>HR Department</div>
                  </div>
                </div>


                {/* Footer Section */}
                <div className="relieving-letter-footer" style={{
                    position: 'absolute',
                    bottom: '60px',
                    left: '80px',
                    right: '80px',
                    paddingTop: '10px',
                    borderTop: '1.5px solid #2b6cb0',
                    fontSize: '9px',
                    color: '#333333',
                    lineHeight: '1.4',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div style={{ paddingRight: '20px', textAlign: 'left' }}>
                        <strong style={{ color: '#2b6cb0' }}>Regd. Office:</strong> Mercure Solutions Private Limited<br />
                        M Floor, Mahaveer Waterpark, Kondapur,<br />
                        Hitec City, Hyderabad, Telangana - 500084
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'left' }}>
                        <strong style={{ color: '#2b6cb0' }}>CIN:</strong> U62013TS2025PTC196108<br />
                        <strong style={{ color: '#2b6cb0' }}>GSTIN:</strong> 36AATCM1458J1ZX<br />
                        <strong style={{ color: '#2b6cb0' }}>E:</strong> <a href="mailto:info@mercuresolution.com" style={{ color: '#2b6cb0', textDecoration: 'underline' }}>info@mercuresolution.com</a>
                    </div>
                </div>
            </div>

            {/* Actions Downloader */}
            <div className="no-print" style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handlePrintRelievingLetter}
                className="apple-btn"
                style={{
                  background: '#30d158',
                  color: 'white',
                  padding: '0 40px',
                  height: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '14px',
                  fontSize: '16px',
                  fontWeight: '700',
                  boxShadow: '0 10px 20px rgba(48, 209, 88, 0.3)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <FaDownload size={20} />
                <span>Download Official Copy / Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const SectionTitle = ({ icon, text }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '15px' }}>
    {icon} {text}
  </div>
);

const InfoLabel = ({ children }: any) => <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{children}</span>;
const InfoVal = ({ children, style }: any) => <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff', ...style }}>{children}</span>;

const ClearanceItem = ({ label, status }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '13px' }}>
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ color: status ? '#30d158' : '#ff9f0a', fontWeight: 'bold' }}>{status ? 'CLEARED' : 'PENDING'}</span>
  </div>
);

const infoGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 10px' };
const inputGrp = { display: 'flex', flexDirection: 'column' as const, gap: '4px' };
const lblStyle = { fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold' };
