import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import Logo from "../../components/Logo";
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

      setLetterData({
        name: emp?.name || 'Employee',
        id: employee_id,
        designation: emp?.designation || 'Specialist',
        doj: emp?.doj || '2023-01-01',
        dor: req?.exit_date || new Date().toISOString().split('T')[0],
        issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      });

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
                        setLetterData({
                          name: emp?.name || 'Employee',
                          id: selected.employee_id,
                          designation: emp?.designation || 'Specialist',
                          doj: emp?.doj || '2023-01-01',
                          dor: selected.exit_date || new Date().toISOString().split('T')[0],
                          issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                        });
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

      {/* Relieving Letter Modal */}
      {showLetter && letterData && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(15px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 20px', overflowY: 'auto' }}>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .relieving-letter, .relieving-letter * { visibility: visible; }
              .relieving-letter { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
              .no-print { display: none !important; }
            }
          `}</style>
          <div style={{ position: 'relative', width: '100%', maxWidth: '850px', marginBottom: '60px' }}>
            <button className="no-print" onClick={() => setShowLetter(false)} style={{ position: 'fixed', top: '20px', right: '30px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', zIndex: 1001 }}>
              <FaTimesCircle size={20} /> Close Preview
            </button>

            {/* Paper Representation */}
            <div className="relieving-letter" style={{ background: 'white', color: '#333', padding: '80px', borderRadius: '4px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)', fontFamily: '"Times New Roman", Times, serif', minHeight: '1050px', position: 'relative' }}>
              {/* Company Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '40px' }}>
                <Logo width={160} showTagline={true} />
                <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '15px', color: '#000' }}>MERCURE SOLUTIONS PRIVATE LIMITED</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Corporate Headquarters: 5th Floor, Tech Hub, Bangalore - 560001</div>
              </div>

              <div style={{ textAlign: 'right', marginBottom: '40px', fontSize: '14px' }}>
                <b>Date:</b> {letterData.issueDate}
              </div>

              <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                <h2 style={{ fontSize: '22px', textDecoration: 'underline', fontWeight: 'bold' }}>RELIEVING CUM EXPERIENCE LETTER</h2>
              </div>

              <div style={{ fontSize: '16px', lineHeight: '1.8', textAlign: 'justify' }}>
                <p><b>TO WHOMSOEVER IT MAY CONCERN</b></p>
                <br />
                <p>
                  This is to certify that <b>Mr./Ms. {letterData.name}</b> (Employee ID: <b>{letterData.id}</b>) was employed
                  with Mercure Solutions Private Limited as a <b>{letterData.designation}</b> from <b>{letterData.doj}</b> to <b>{letterData.dor}</b>.
                </p>
                <p>
                  During {letterData.name}'s tenure with us, they have displayed high levels of professional competence and dedication.
                  The conduct and performance during the employment period were found to be satisfactory.
                </p>
                <p>
                  We confirm that all dues have been cleared and {letterData.name} has been relieved of all responsibilities
                  and duties from the close of business hours on <b>{letterData.dor}</b>.
                </p>
                <p>
                  We wish <b>{letterData.name}</b> the very best for all future endeavors.
                </p>
              </div>

              <div style={{ marginTop: '100px' }}>
                <p>For <b>Mercure Solutions Private Limited</b>,</p>
                <div style={{ marginTop: '40px' }}>
                  <div style={{ borderTop: '1px solid #333', width: '200px', paddingTop: '8px' }}>
                    <b>Authorized Signatory</b>
                    <div style={{ fontSize: '12px', color: '#666' }}>Human Resources Department</div>
                  </div>
                </div>
              </div>

              {/* Seal Mockup */}
              <div style={{ position: 'absolute', bottom: '80px', right: '80px', width: '100px', height: '100px', border: '5px double #1a3a5f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', transform: 'rotate(-15deg)', opacity: 0.15 }}>
                <div style={{ textAlign: 'center', color: '#1a3a5f', fontSize: '10px', fontWeight: 'bold' }}>MERCURE<br />CORPORATE<br />SEAL</div>
              </div>
            </div>

            {/* Actions Downloader */}
            <div className="no-print" style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => window.print()}
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
