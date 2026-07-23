import React, { useState, useEffect, useReducer } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import Logo from "../../components/Logo";
import headerLogoImage from "../../assets/mercure-logo.jpeg";
import watermarkImage from "../../assets/mercure-logo.png";
import uditSignatureImage from "../../assets/udit-signature.png";
import {
  getEmployees, refreshEmployees, addEmployee, updateEmployee, DEFAULT_PASSWORD,
  getOffers, refreshOffers, getCandidates, updateOfferStatus,
  getOnboardingRequests, refreshOnboarding, managerUpdateOnboardingRequest as updateOnboardingRequest, initiateManagementBulkOnboarding as initiateBulkOnboarding,
  managerApproveOnboardingRequest as authorizeOnboarding, managerRejectOnboardingRequest, deleteOnboardingRequest,
  getPreboardingList, refreshPreboarding, updatePreboarding, completePreboarding,
  getRoleAssignments, refreshRoles, updateRoleAssignment,
  createOffboardingRequest, addOffboardingRequest, getOffboardingRequests, refreshOffboarding, updateOffboardingRequest, deleteOffboardingRequest,
  uploadFile, getFileUrl
} from "../../utils/storage";
import { downloadCSV } from "../../utils/formatters";
import {
  FaUserPlus, FaLaptop, FaShieldAlt, FaCheckCircle,
  FaProjectDiagram, FaEnvelope, FaCalendarAlt, FaIdCard,
  FaSignOutAlt, FaStar, FaCloudUploadAlt, FaMobileAlt, FaTabletAlt, FaSync,
  FaUserShield, FaKey, FaToggleOn, FaToggleOff, FaBan, FaFilePdf, FaDownload, FaTimesCircle,
  FaFileSignature, FaThumbsUp, FaThumbsDown, FaCheck, FaTimes
} from "react-icons/fa";

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
    name: toTitleCase(emp?.name || (emp?.first_name ? `${emp.first_name} ${emp.last_name}` : 'Employee')),
    id: emp?.employee_id || emp?.id || reqRecord?.employee_id,
    designation: toTitleCase(emp?.designation || 'Specialist'),
    doj: formatDate(emp?.joining_date || emp?.doj || '2023-01-01'),
    dor: formatDate(dorVal),
    resignationDate: formatDate(resignationDateVal),
    issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  };
};

export default function LifecycleControl() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'onboarding' | 'preboarding' | 'role_assignments' | 'offboarding' | 'workforce' | 'offers'>('workforce');
  const [employees, setEmployeesState] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tabData, setTabData] = useState<any>({
    onboarding: [],
    preboarding: [],
    roleAssignments: [],
    offboarding: [],
    offers: []
  });

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

  const refresh = async () => {
    setLoading(true);
    try {
      // Fetch all data for all tabs
      const [employeeData, onboardingData, preboardingData, roleAssignmentsData, offboardingData, offersData] = await Promise.all([
        refreshEmployees(),
        refreshOnboarding(),
        refreshPreboarding(),
        refreshRoles(),
        refreshOffboarding(),
        refreshOffers()
      ]);

      setEmployeesState(Array.isArray(employeeData) ? employeeData : []);

      // Store data for tabs to use
      setTabData({
        onboarding: Array.isArray(onboardingData) ? onboardingData : [],
        preboarding: Array.isArray(preboardingData) ? preboardingData : [],
        roleAssignments: Array.isArray(roleAssignmentsData) ? roleAssignmentsData : [],
        offboarding: Array.isArray(offboardingData) ? offboardingData : [],
        offers: Array.isArray(offersData) ? offersData : []
      });

      // Increment refresh key to trigger re-renders
      setRefreshKey(prev => prev + 1);

      console.log('All data refreshed:', {
        employees: employeeData?.length || 0,
        onboarding: onboardingData?.length || 0,
        preboarding: preboardingData?.length || 0,
        roleAssignments: roleAssignmentsData?.length || 0,
        offboarding: offboardingData?.length || 0,
        offers: offersData?.length || 0
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      setEmployeesState([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'onboarding' || tab === 'preboarding' || tab === 'role_assignments' || tab === 'offboarding') {
      setActiveTab(tab as any);
    }
  }, [location]);

  // OffersPipelineTab component (extracted to fix syntax error)
  const OffersPipelineTab = ({ refresh, employees, offers }: {
    refresh: () => void;
    employees: any[];
    offers: any[];
  }) => {
    const currentManagerId = sessionStorage.getItem('employeeId') || sessionStorage.getItem('userId') || '';
    const normalizeId = (id: any) => String(id || '').replace(/[\s_-]+/g, '').toLowerCase();
    const currentManagerIdNormalized = normalizeId(currentManagerId);
    
    const managerOffers = offers.filter((offer: any) =>
      normalizeId(offer.reporting_manager_id) === currentManagerIdNormalized
    );

    const approveOffer = async (offerId: number) => {
      try {
        await updateOfferStatus(offerId, 'manager_approved');
        refresh();
        alert('Offer approved!');
      } catch (error) {
        console.error('Approval failed:', error);
        alert('Approval failed. Please try again.');
      }
    };

    const rejectOffer = async (offerId: number) => {
      try {
        await updateOfferStatus(offerId, 'manager_rejected');
        refresh();
        alert('Offer rejected');
      } catch (error) {
        console.error('Rejection failed:', error);
        alert('Rejection failed. Please try again.');
      }
    };

    const pendingCount = managerOffers.filter((o: any) => o.offer_status === 'sent').length;
    const totalCount = managerOffers.length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <GlassCard title="Offers Pipeline" subtitle={`Recruiter offers pending approval: ${pendingCount} | Total realized offers: ${totalCount}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {managerOffers.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                No offers pending your approval
              </div>
            ) : (
              managerOffers.map((offer: any) => {
                const candidate = getCandidates().find((c: any) => c.id === offer.candidate_id || c.candidate_id === offer.candidate_id);
                const recruiter = getEmployees().find((e: any) => e.id === offer.recruiter_id || e.employee_id === offer.recruiter_id);
                const reportingEmp = employees.find((e: any) => e.id === offer.reporting_manager_id || e.employee_id === offer.reporting_manager_id);

                return (
                  <GlassCard key={offer.offer_id || offer.id} title={`${candidate?.name || 'Candidate'} - ${offer.job_title || 'Position'}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                      <div><strong>CTC:</strong> ₹{offer.offered_ctc?.toLocaleString() || offer.ctc?.toLocaleString() || 'TBD'}</div>
                      <div><strong>Status:</strong>
                        <span style={{
                          marginLeft: '8px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          background: offer.offer_status === 'sent' ? 'rgba(255,159,10,0.1)' :
                            offer.offer_status === 'manager_approved' ? 'rgba(48,209,88,0.1)' :
                              offer.offer_status === 'manager_rejected' ? 'rgba(255,69,58,0.1)' :
                                'rgba(255,69,58,0.1)',
                          color: offer.offer_status === 'sent' ? '#ff9f0a' :
                            offer.offer_status === 'manager_approved' ? '#30d158' : '#ff453a'
                        }}>
                          {offer.offer_status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                      <div><strong>Recruiter:</strong> {recruiter?.name || recruiter?.first_name || 'N/A'}</div>
                      <div><strong>Reporting To:</strong> {reportingEmp?.name || reportingEmp?.first_name || 'TBD'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {offer.created_at ? new Date(offer.created_at).toLocaleDateString() : 'Recent'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      {offer.offer_status === 'sent' && (
                        <>
                          <button
                            onClick={() => approveOffer(offer.offer_id || offer.id)}
                            className="apple-btn"
                            style={{ flex: 1, background: '#30d158', color: 'white' }}
                          >
                            <FaThumbsUp /> Approve
                          </button>
                          <button
                            onClick={() => rejectOffer(offer.offer_id || offer.id)}
                            className="apple-btn"
                            style={{ flex: 1, background: '#ff453a', color: 'white' }}
                          >
                            <FaThumbsDown /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        </GlassCard>
      </div>
    );
  };


  return (
    <div className="dashboard-container">
      <div className="no-print">
        <Header role="Manager" title="Global Executive Lifecycle" />


      <div style={{ marginBottom: "30px", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Lifecycle Governance</h1>
          <p className="subtitle">Strategic control over onboarding, preboarding, role assignments, and separation protocols</p>
        </div>
        <button onClick={refresh} className="apple-btn" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaSync className={loading ? 'spin' : ''} /> Refresh Data
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <TabButton active={activeTab === 'workforce'} onClick={() => setActiveTab('workforce')} icon={<FaProjectDiagram />} label="Workforce" />
        <TabButton active={activeTab === 'onboarding'} onClick={() => setActiveTab('onboarding')} icon={<FaUserPlus />} label="Onboarding" />
        <TabButton active={activeTab === 'preboarding'} onClick={() => setActiveTab('preboarding')} icon={<FaShieldAlt />} label="Preboarding" />
        <TabButton active={activeTab === 'role_assignments'} onClick={() => setActiveTab('role_assignments')} icon={<FaUserShield />} label="Role Assignments" />
        <TabButton active={activeTab === 'offers'} onClick={() => setActiveTab('offers')} icon={<FaFileSignature />} label="Offers Pipeline" />
        <TabButton active={activeTab === 'offboarding'} onClick={() => setActiveTab('offboarding')} icon={<FaSignOutAlt />} label="Offboarding" />
      </div>

      {activeTab === 'workforce' && <WorkforceTab employees={employees} />}
      {activeTab === 'onboarding' && <OnboardingTab refresh={refresh} employees={employees} onboardingRequests={tabData.onboarding} key={refreshKey} />}
      {activeTab === 'preboarding' && <PreboardingTab refresh={refresh} employees={employees} preboardingData={tabData.preboarding} key={refreshKey} />}
      {activeTab === 'role_assignments' && <RoleAssignmentsTab refresh={refresh} employees={employees} roleAssignmentsData={tabData.roleAssignments} key={refreshKey} />}
      {activeTab === 'offers' && <OffersPipelineTab refresh={refresh} employees={employees} offers={tabData.offers || []} key={refreshKey} />}

      {activeTab === 'offboarding' && (
        <OffboardingTab
          refresh={refresh}
          employees={employees}
          offboardingData={tabData.offboarding}
          key={refreshKey}
          onViewLetter={(data: any) => {
            setLetterData(data);
            setShowLetter(true);
          }}
        />
      )}
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
                <span>Download Copy / Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== ONBOARDING TAB =====================
function OnboardingTab({ refresh, employees, onboardingRequests }: any) {
  const [newHire, setNewHire] = useState({
    employee_id: '',
    first_name: '', last_name: '', email: '', department: 'HR Ops', designation: '',
    joining_date: '', role_name: 'hr', access_level: 'limited',
    offer_date: new Date().toISOString().split('T')[0],
    laptop: 1, mouse: 1, keyboard: 0,
    personal_mobile: '', gender: 'Male', dob: '', marital_status: 'Single', nationality: 'Indian',
    joining_location: 'Bangalore', personal_email: '', blood_group: 'B+',
    manager_id: sessionStorage.getItem("employeeId") || '',
    team_leader_id: ''
  });

  useEffect(() => {
    // Ensuring global state is consistent with sessionStorage for the manager_id
    const currentMgrId = sessionStorage.getItem("employeeId");
    if (currentMgrId && !newHire.manager_id) {
      setNewHire(prev => ({ ...prev, manager_id: currentMgrId }));
    }
  }, [employees]);
  const [docFiles, setDocFiles] = useState({ aadhaar: null as File | null, pan: null as File | null, photo: null as File | null });
  const [uploadedFiles, setUploadedFiles] = useState({ aadhaar: '', pan: '', photo: '' });
  const [selectedOnboarding, setSelectedOnboarding] = useState<any>(null);

  const handleExport = () => {
    const exportData = (onboardingRequests || []).map((r: any) => {
      const emp = (employees || []).find((e: any) => e.employee_id === r.employee_id);
      return {
        'Request ID': r.request_id,
        'Employee ID': r.employee_id,
        'Name': emp?.name || 'N/A',
        'Email': emp?.email || 'N/A',
        'Role': (r.role_name || 'N/A').toUpperCase(),
        'Status': r.status?.toUpperCase() || 'N/A',
        'Join Date': r.join_date,
        'Access Level': r.access_level,
        'Offer Date': r.offer_date
      };
    });
    downloadCSV(exportData, `Onboarding_List_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof docFiles) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFiles(prev => ({ ...prev, [field]: file }));

      // Upload file immediately with candidate name context for organized S3 storage
      try {
        const candidateName = `${newHire.first_name} ${newHire.last_name}`.trim();
        const result = await uploadFile(file, 'onboarding', undefined, candidateName);
        setUploadedFiles(prev => ({ ...prev, [field]: result.file_path }));
      } catch (error) {
        console.error(`Error uploading ${field}:`, error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Debug: Log the form data
    console.log('=== Onboarding Form Debug ===');
    console.log('Form data:', newHire);
    console.log('Login email:', newHire.email);
    console.log('Personal email:', newHire.personal_email);

    if (!newHire.first_name || !newHire.last_name || !newHire.email || !newHire.joining_date || !newHire.role_name) {
      alert('⚠️ Please fill all required fields: First Name, Last Name, Email, Join Date, and Role Name');
      return;
    }

    // Validate that required fields are not empty strings
    if (newHire.first_name.trim() === '' || newHire.last_name.trim() === '' || newHire.email.trim() === '' || (newHire.role_name || '').trim() === '') {
      alert('⚠️ Required fields cannot be empty. Please fill in all required information.');
      return;
    }

    if (!newHire.employee_id || !newHire.employee_id.trim()) {
      alert('⚠️ Employee ID Required: Please enter the Employee ID manually.');
      return;
    }

    const empId = newHire.employee_id.trim();

    if (!empId.match(/^[a-zA-Z0-9_-]+$/)) {
      alert('❌ Invalid Employee ID: Must be alphanumeric (letters, numbers, hyphens, and underscores only)');
      return;
    }

    // Generate Request ID
    const reqId = `ONB-${empId}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Validation: Enforce company domain for login email
    if (!newHire.email.toLowerCase().endsWith('@mercuresolution.com')) {
      alert('❌ Error: Only @mercuresolution.com emails are allowed for portal login.');
      return;
    }

    // Convert date strings to proper format
    const employeeData = {
      request_id: reqId,
      first_name: newHire.first_name.trim(),
      last_name: newHire.last_name.trim(),
      login_email: newHire.email.trim(),
      personal_email: newHire.personal_email?.trim() || undefined,
      employee_id: empId,
      role_name: newHire.role_name?.trim(),
      designation: newHire.designation?.trim() || undefined,
      department: newHire.department?.trim() || undefined,
      join_date: newHire.joining_date || undefined,
      offer_date: newHire.offer_date || undefined,
      joining_location: newHire.joining_location || undefined,
      manager_id: newHire.manager_id || undefined,
      team_leader_id: newHire.team_leader_id || undefined,
      access_level: newHire.access_level || undefined,
      gender: newHire.gender,
      dob: newHire.dob || undefined,
      blood_group: newHire.blood_group,
      personal_mobile: newHire.personal_mobile,
      marital_status: newHire.marital_status,
      nationality: newHire.nationality,
      hardware_req: {
        laptop: newHire.laptop,
        mouse: newHire.mouse,
        keyboard: newHire.keyboard
      },
      documents: uploadedFiles || undefined
    };


    // Final validation of required fields
    const requiredFields = ['first_name', 'last_name', 'login_email', 'employee_id', 'role_name'];
    const missingFields = requiredFields.filter(field => !(field in employeeData));

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      alert(`❌ Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    const payload = {
      employees: [employeeData]
    };

    console.log('Final payload:', JSON.stringify(payload, null, 2));

    const fullName = `${newHire.first_name} ${newHire.last_name}`.trim();

    try {
      await initiateBulkOnboarding(payload);
      const role = (newHire.role_name || 'employee').toLowerCase();
      const isStaff = ['hr', 'recruiter', 'teamleader', 'it', 'manager'].some(r => role.includes(r));

      if (isStaff) {
        alert(`✅ Staff Lifecycle Authorized for ${fullName}\n\n🔐 Username: ${newHire.email.split('@')[0]}\n🔑 Password: ${DEFAULT_PASSWORD}\n📋 Role: ${role.toUpperCase()}\n\nNote: This staff member is directly provisioned in your workforce.`);
      } else {
        alert(`📩 Request Forwarded to HR\n\nOnboarding for ${fullName} has been sent to the HR Portal for centralized provisioning.\n\nYou can track their status in the Workforce dashboard once completed.`);
      }
      refresh();
    } catch (error: any) {
      console.error('API Error Details:', error.response?.data);

      const errorData = error.response?.data;
      let errorMsg = 'Unknown error occurred or network failure';

      if (errorData) {
        if (typeof errorData.detail === 'string') {
          errorMsg = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // Format Pydantic validation errors to show missing fields clearly
          const missingFields = errorData.detail.filter((err: any) => err.type === 'missing');
          const otherErrors = errorData.detail.filter((err: any) => err.type !== 'missing');

          let messages = [];
          if (missingFields.length > 0) {
            messages.push('Missing required fields: ' + missingFields.map((err: any) => err.loc[err.loc.length - 1]).join(', '));
          }
          if (otherErrors.length > 0) {
            messages.push('Field errors: ' + otherErrors.map((err: any) => `${err.loc.slice(-1)}: ${err.msg}`).join(', '));
          }

          errorMsg = messages.length > 0 ? messages.join('\n') : errorData.detail.toString();
        } else if (typeof errorData.detail === 'object') {
          errorMsg = JSON.stringify(errorData.detail, null, 2);
        } else if (errorData.message) {
          errorMsg = errorData.message;
        }
      } else if (error.message) {
        errorMsg = error.message; // Capture frontend/network errors like ReferenceError or Timeout
      }

      console.log('Payload that failed:', payload);
      alert(`❌ Error Initiating Lifecycle:\n${errorMsg}`);
      return;
    }

    setNewHire({
      employee_id: '',
      first_name: '', last_name: '', email: '', department: 'HR Ops', designation: '',
      joining_date: '', role_name: 'hr', access_level: 'limited',
      offer_date: new Date().toISOString().split('T')[0],
      laptop: 1, mouse: 1, keyboard: 0,
      personal_mobile: '', gender: 'Male', dob: '', marital_status: 'Single', nationality: 'Indian',
      joining_location: 'Bangalore', personal_email: '', blood_group: 'B+',
      manager_id: '',
      team_leader_id: ''
    });
    setUploadedFiles({ aadhaar: '', pan: '', photo: '' });
    setDocFiles({ aadhaar: null, pan: null, photo: null });
    refresh();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
      <GlassCard title="New Employee Onboarding" subtitle="Register employee & create portal access">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '15px' }}>
          <div style={sectionDivider}>Employee Identity</div>
          <div className="grid-3">
            <FormGroup label="Employee ID (Enter Manually) *"><input placeholder="e.g. E001, A123, EMP100" className="apple-input" value={newHire.employee_id} onChange={e => setNewHire({ ...newHire, employee_id: e.target.value })} required /></FormGroup>
            <FormGroup label="First Name"><input className="apple-input" value={newHire.first_name} onChange={e => setNewHire({ ...newHire, first_name: e.target.value })} required /></FormGroup>
            <FormGroup label="Last Name"><input className="apple-input" value={newHire.last_name} onChange={e => setNewHire({ ...newHire, last_name: e.target.value })} required /></FormGroup>
          </div>

          <div className="grid-3">
            <FormGroup label="Gender">
              <select className="apple-input" value={newHire.gender} onChange={e => setNewHire({ ...newHire, gender: e.target.value })}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </FormGroup>
            <FormGroup label="DOB"><input type="date" className="apple-input" value={newHire.dob} onChange={e => setNewHire({ ...newHire, dob: e.target.value })} /></FormGroup>
            <FormGroup label="Blood Group">
              <select className="apple-input" value={newHire.blood_group} onChange={e => setNewHire({ ...newHire, blood_group: e.target.value })}>
                <option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
              </select>
            </FormGroup>
          </div>

          <div className="grid-3">
            <FormGroup label="Personal Mobile"><input className="apple-input" value={newHire.personal_mobile} onChange={e => setNewHire({ ...newHire, personal_mobile: e.target.value })} /></FormGroup>
            <FormGroup label="Marital Status">
              <select className="apple-input" value={newHire.marital_status} onChange={e => setNewHire({ ...newHire, marital_status: e.target.value })}>
                <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
              </select>
            </FormGroup>
            <FormGroup label="Nationality"><input className="apple-input" value={newHire.nationality} onChange={e => setNewHire({ ...newHire, nationality: e.target.value })} /></FormGroup>
          </div>

          <div className="grid-2">
            <FormGroup label="Official Email (Login User)"><input type="email" className="apple-input" value={newHire.email} onChange={e => setNewHire({ ...newHire, email: e.target.value })} required placeholder="name@mercure.com" /></FormGroup>
            <FormGroup label="Personal Email"><input type="email" className="apple-input" value={newHire.personal_email} onChange={e => setNewHire({ ...newHire, personal_email: e.target.value })} placeholder="gmail/outlook..." /></FormGroup>
          </div>

          <div style={{ padding: '12px', background: 'rgba(48,209,88,0.05)', borderRadius: '12px', border: '1px solid rgba(48,209,88,0.2)', fontSize: '12px', color: '#30d158' }}>
            <FaKey style={{ marginRight: '8px' }} /> Default Password: <b>{DEFAULT_PASSWORD}</b> — Employee can change after first login
          </div>

          <div style={sectionDivider}>Department & Role</div>
          <div className="grid-3">
            <FormGroup label="Department">
              <input placeholder="e.g. HR Ops" className="apple-input" value={newHire.department} onChange={e => setNewHire({ ...newHire, department: e.target.value })} required />
            </FormGroup>
            <FormGroup label="Designation"><input className="apple-input" value={newHire.designation} onChange={e => setNewHire({ ...newHire, designation: e.target.value })} /></FormGroup>
            <FormGroup label="Reports To">
              <select className="apple-input" value={newHire.manager_id} onChange={e => setNewHire({ ...newHire, manager_id: e.target.value })}>
                <option value="">Select Manager/Team Leader</option>
                {(employees || []).filter((e: any) => {
                  const r = (e.role || '').toLowerCase();
                  return r.includes('manager') || r.includes('admin') || r.includes('hr') || r.includes('leader');
                }).map((manager: any) => (
                  <option key={manager.id} value={manager.employee_id || manager.id}>
                    {manager.name || manager.email} ({(manager.role || 'User').toUpperCase()})
                  </option>
                ))}
                {/* Fallback to Current User if not in list */}
                {!(employees || []).some((e: any) => e.employee_id === sessionStorage.getItem("employeeId")) && (
                  <option value={sessionStorage.getItem("employeeId") || ""}>
                    {sessionStorage.getItem("userName") || 'Current Manager'} (Current)
                  </option>
                )}
              </select>
            </FormGroup>
            <FormGroup label="Team Leader (Optional)">
              <select className="apple-input" value={newHire.team_leader_id} onChange={e => setNewHire({ ...newHire, team_leader_id: e.target.value })}>
                <option value="">Select Team Leader</option>
                {(employees || []).filter((e: any) => (e.role || '').toLowerCase() === 'teamleader').map((tl: any) => (
                  <option key={tl.id} value={tl.employee_id || tl.id}>
                    {tl.name || tl.email}
                  </option>
                ))}
              </select>
            </FormGroup>
          </div>

          <div className="grid-3">
            <FormGroup label="Portal Role">
              <select className="apple-input" value={newHire.role_name} onChange={e => setNewHire({ ...newHire, role_name: e.target.value })}>
                {/* Manager only onboards staff roles, HR handles normal employees */}
                <option value="hr">HR Professional</option>
                <option value="recruiter">Recruiter</option>
                <option value="teamleader">Team Leader</option>
                <option value="it">IT Professional</option>
                <option value="manager">Manager</option>
              </select>
            </FormGroup>
            <FormGroup label="Offer Date"><input type="date" className="apple-input" value={newHire.offer_date} onChange={e => setNewHire({ ...newHire, offer_date: e.target.value })} /></FormGroup>
            <FormGroup label="Join Date"><input type="date" className="apple-input" value={newHire.joining_date} onChange={e => setNewHire({ ...newHire, joining_date: e.target.value })} /></FormGroup>
          </div>
          <div className="grid-1">
            <FormGroup label="Joining Location"><input className="apple-input" value={newHire.joining_location} onChange={e => setNewHire({ ...newHire, joining_location: e.target.value })} /></FormGroup>
          </div>

          <div style={sectionDivider}>Digital Documentation (Upload)</div>
          <div className="grid-3" style={{ gap: '15px' }}>
            <FileUploadGroup
              label="Aadhaar Card"
              fileName={docFiles.aadhaar ? docFiles.aadhaar.name : (uploadedFiles.aadhaar ? "Aadhaar_Uploaded.pdf" : "")}
              onChange={(e: any) => handleFileChange(e, 'aadhaar')}
              icon={<FaIdCard />}
            />
            <FileUploadGroup
              label="PAN Card"
              fileName={docFiles.pan ? docFiles.pan.name : (uploadedFiles.pan ? "PAN_Uploaded.pdf" : "")}
              onChange={(e: any) => handleFileChange(e, 'pan')}
              icon={<FaShieldAlt />}
            />
            <FileUploadGroup
              label="Candidate Photo"
              fileName={docFiles.photo ? docFiles.photo.name : (uploadedFiles.photo ? "Photo_Uploaded.jpg" : "")}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.pptx,.zip"
              onChange={(e: any) => handleFileChange(e, 'photo')}
              icon={<FaUserPlus />}
              isImage
              preview={docFiles.photo ? URL.createObjectURL(docFiles.photo) : (uploadedFiles.photo ? getFileUrl(uploadedFiles.photo) : null)}
            />
          </div>

          <div style={sectionDivider}>Hardware Requirements (JSON)</div>
          <div className="grid-3">
            <QtyItem icon={<FaLaptop />} label="Laptop" val={newHire.laptop} onAdd={() => setNewHire({ ...newHire, laptop: newHire.laptop + 1 })} onSub={() => setNewHire({ ...newHire, laptop: Math.max(0, newHire.laptop - 1) })} />
            <QtyItem icon={<FaMobileAlt />} label="Mouse" val={newHire.mouse} onAdd={() => setNewHire({ ...newHire, mouse: newHire.mouse + 1 })} onSub={() => setNewHire({ ...newHire, mouse: Math.max(0, newHire.mouse - 1) })} />
            <QtyItem icon={<FaTabletAlt />} label="Keyboard" val={newHire.keyboard} onAdd={() => setNewHire({ ...newHire, keyboard: newHire.keyboard + 1 })} onSub={() => setNewHire({ ...newHire, keyboard: Math.max(0, newHire.keyboard - 1) })} />
          </div>

          <div style={sectionDivider}>Access Level</div>
          <FormGroup label="Access Level">
            <select className="apple-input" value={newHire.access_level} onChange={e => setNewHire({ ...newHire, access_level: e.target.value })}>
              <option value="full">Full Access</option>
              <option value="limited">Limited Access</option>
            </select>
          </FormGroup>

          <button type="submit" className="apple-btn" style={{ height: '54px', background: 'var(--accent-blue)', color: 'white', fontWeight: 'bold' }}>
            <FaUserPlus /> Authorize Lifecycle Initiation
          </button>
        </form>
      </GlassCard>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Operational Pipeline</h3>
        <a href="/manager/onboarding" style={{ color: 'var(--accent-blue)', fontSize: '12px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
          Open Full Approval Center <FaUserPlus size={10} />
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <GlassCard title="Active Staff Onboarding Requests" subtitle="Autonomous Lifecycle Governance (No-HR Connection)">
          <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
            <button
              onClick={handleExport}
              className="apple-btn"
              style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Download results as CSV"
            >
              <FaDownload size={12} /> Export CSV
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px', maxHeight: '500px', overflowY: 'auto' }}>
            {(onboardingRequests || []).length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>No onboarding requests yet.</p>}
            {(onboardingRequests || []).map((r: any) => {
              const emp = (employees || []).find((e: any) => e.employee_id === r.employee_id);
              // Debug: Log the data structure
              console.log('=== Onboarding Request Debug ===');
              console.log('Request data:', r);
              console.log('Employee data:', emp);
              console.log('All employees:', employees);

              // Construct name from available fields
              const displayName = emp ?
                (emp.first_name && emp.last_name ? `${emp.first_name} ${emp.last_name}` :
                  emp.first_name || emp.last_name || emp.name || emp.full_name || r.employee_id) :
                r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` :
                  r.employee_id || 'Unknown';

              // Get manager name if available
              const managerName = emp?.manager_id || r.manager_id || 'N/A';

              return (
                <div key={r.request_id} style={empListItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={avatarStyle}>{String(displayName).charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{displayName}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                        {(r.role_name || 'N/A').toUpperCase()} • {r.access_level || 'General'} • {r.join_date || 'TBD'}
                        <br />
                        Manager: {r.manager_name || r.manager_id || 'System'} • Docs: {r.documents ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', background: r.status === 'pending' ? 'rgba(255,159,10,0.1)' : r.status === 'approved' ? 'rgba(48,209,88,0.1)' : 'rgba(10,132,255,0.1)', color: r.status === 'pending' ? '#ff9f0a' : r.status === 'approved' ? '#30d158' : '#0a84ff' }}>
                      {(r.status || 'pending').toUpperCase()}
                    </span>
                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await authorizeOnboarding(r.request_id);
                              alert(`✅ Request ${r.request_id} authorized. Identity provisioned in Workforce.`);
                              refresh();
                            } catch (error) {
                              console.error('Approval failed:', error);
                              alert('❌ Failed to authorize request.');
                            }
                          }}
                          className="apple-btn"
                          style={{ padding: '4px 8px', fontSize: '9px', background: 'var(--accent-blue)', color: 'white', borderRadius: '6px' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm("Are you sure you want to REJECT this onboarding request?")) return;
                            try {
                              await managerRejectOnboardingRequest(r.request_id);
                              alert(`❌ Request ${r.request_id} has been rejected.`);
                              refresh();
                            } catch (error) {
                              console.error('Rejection failed:', error);
                              alert('❌ Failed to reject request.');
                            }
                          }}
                          className="apple-btn"
                          style={{ padding: '4px 8px', fontSize: '9px', background: 'rgba(255,59,48,0.1)', color: '#ff3b30', borderRadius: '6px' }}
                        >
                          Reject
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm("Are you sure you want to DELETE this request? This action is permanent.")) return;
                            try {
                              await deleteOnboardingRequest(r.request_id);
                              alert(`⚠️ Request ${r.request_id} has been deleted.`);
                              refresh();
                            } catch (error) {
                              console.error('Deletion failed:', error);
                              alert('❌ Failed to delete request.');
                            }
                          }}
                          className="apple-btn"
                          style={{ padding: '4px 8px', fontSize: '9px', background: 'rgba(255,204,0,0.1)', color: '#ffcc00', borderRadius: '6px' }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setSelectedOnboarding(r)}
                          className="apple-btn"
                          style={{ padding: '4px 8px', fontSize: '9px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', borderRadius: '6px' }}
                        >
                          View Details
                        </button>
                      </>
                    )}
                    {r.status !== 'pending' && (
                      <button
                        onClick={async () => {
                          if (!window.confirm("Delete this completed/rejected request?")) return;
                          try {
                            await deleteOnboardingRequest(r.request_id);
                            refresh();
                          } catch (error) {
                            alert('Failed to delete');
                          }
                        }}
                        className="apple-btn"
                        style={{ padding: '4px 8px', fontSize: '9px', background: 'rgba(255,59,48,0.1)', color: '#ff3b30', borderRadius: '6px' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard title="IT Fulfillment Status" subtitle="Hardware allocation pipeline">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', background: 'rgba(255,159,10,0.05)', borderRadius: '12px', border: '1px solid rgba(255,159,10,0.2)' }}>
            <FaSync className="spin" color="#ff9f0a" />
            <div style={{ fontSize: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#ff9f0a' }}>AWAITING ALLOCATION</div>
              <div style={{ color: 'var(--text-tertiary)', marginTop: '2px' }}>Request goes to IT Support after authorization.</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Onboarding Details Modal */}
      {selectedOnboarding && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setSelectedOnboarding(null)}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Candidate Details</h3>
              <button onClick={() => setSelectedOnboarding(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px' }}>×</button>
            </div>

            {(() => {
              // Debug: Log the selected onboarding data
              console.log('Selected Onboarding Data:', selectedOnboarding);

              // Get employee data for additional details
              const empData = (employees || []).find((e: any) => e.employee_id === selectedOnboarding.employee_id);
              console.log('Employee Data for Details:', empData);

              // Construct proper name display
              const fullName = empData ?
                (empData.first_name && empData.last_name ? `${empData.first_name} ${empData.last_name}` :
                  empData.first_name || empData.last_name || empData.name || empData.full_name || selectedOnboarding.employee_id) :
                selectedOnboarding.first_name && selectedOnboarding.last_name ? `${selectedOnboarding.first_name} ${selectedOnboarding.last_name}` :
                  selectedOnboarding.employee_id || 'Unknown';

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <strong>Name:</strong> {fullName}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedOnboarding.email || empData?.email || 'N/A'}
                  </div>
                  <div>
                    <strong>Employee ID:</strong> {selectedOnboarding.employee_id}
                  </div>
                  <div>
                    <strong>Role:</strong> {(selectedOnboarding.role_name || 'N/A').toUpperCase()}
                  </div>
                  <div>
                    <strong>Department:</strong> {selectedOnboarding.department || empData?.department || 'N/A'}
                  </div>
                  <div>
                    <strong>Join Date:</strong> {selectedOnboarding.joining_date || selectedOnboarding.join_date || 'N/A'}
                  </div>
                  <div>
                    <strong>Manager:</strong> {selectedOnboarding.manager_name || selectedOnboarding.manager_id || 'System'}
                  </div>

                  {selectedOnboarding.documents && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '10px' }}>Uploaded Documents</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {(() => {
                          const docs = typeof selectedOnboarding.documents === 'string'
                            ? JSON.parse(selectedOnboarding.documents || '{}')
                            : selectedOnboarding.documents || {};

                          const validDocs = Object.entries(docs).filter(([_, path]) => !!path);

                          if (validDocs.length === 0) {
                            return <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                              No documents have been uploaded yet
                            </div>;
                          }

                          return validDocs.map(([key, path]) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,69,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaFilePdf color="#ff453a" size={16} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{key.toUpperCase()}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>PDF Document</div>
                              </div>
                              <a href={getFileUrl(path as string)} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', background: 'var(--accent-blue)', color: '#fff', borderRadius: '6px', fontSize: '11px', fontWeight: '600', textDecoration: 'none' }}>
                                View
                              </a>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== PREBOARDING TAB =====================
function PreboardingTab({ refresh, employees, preboardingData }: any) {
  const [list, setList] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
    bank_name: '', bank_account_number: '', bank_ifsc_code: '',
    policy_acknowledged: false, training_completed: false,
    thirty_day_goals: '', manager_notes: '', documents_verified_by_hr: false,
    permanent_address: '', current_address: '', city: '', state: '', pincode: '', country: ''
  });

  useEffect(() => {
    // Use data from parent if available, otherwise fetch fresh data
    if (preboardingData && preboardingData.length >= 0) {
      setList(Array.isArray(preboardingData) ? preboardingData : []);
    } else {
      const fetchList = async () => {
        try {
          const data = await getPreboardingList();
          setList(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error fetching preboarding list:', error);
          setList([]);
        }
      };
      fetchList();
    }
  }, [preboardingData]);

  useEffect(() => {
    if (selected) {
      setForm({
        emergency_contact_name: selected.emergency_contact_name || '',
        emergency_contact_phone: selected.emergency_contact_phone || '',
        emergency_contact_relation: selected.emergency_contact_relation || '',
        bank_name: selected.bank_name || '',
        bank_account_number: selected.bank_account_number || '',
        bank_ifsc_code: selected.bank_ifsc_code || '',
        policy_acknowledged: selected.policy_acknowledged || false,
        training_completed: selected.training_completed || false,
        thirty_day_goals: selected.thirty_day_goals || '',
        manager_notes: selected.manager_notes || '',
        documents_verified_by_hr: selected.documents_verified_by_hr || false,
        permanent_address: selected.permanent_address || '',
        current_address: selected.current_address || '',
        city: selected.city || '',
        state: selected.state || '',
        pincode: selected.pincode || '',
        country: selected.country || ''
      });
    }
  }, [selected]);

  const handleSave = async () => {
    if (!selected) return;
    const id = selected.preboard_id || selected.id;
    if (!id) {
      console.error('Save failed: Preboarding ID is missing from state', selected);
      alert('❌ Internal Error: ID missing. Please refresh the page.');
      return;
    }

    try {
      await updatePreboarding(id, {
        manager_review_status: 'updated',
        manager_notes: form.manager_notes,
        thirty_day_goals: form.thirty_day_goals,
        bank_name: form.bank_name,
        bank_account_number: form.bank_account_number,
        bank_ifsc_code: form.bank_ifsc_code,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        emergency_contact_relation: form.emergency_contact_relation,
        policy_acknowledged: form.policy_acknowledged,
        training_completed: form.training_completed,
        documents_verified_by_hr: form.documents_verified_by_hr,
        permanent_address: form.permanent_address,
        current_address: form.current_address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: form.country
      });
      alert('Preboarding data updated!');
      refresh();

    } catch (error) {
      console.error('Error saving preboarding:', error);
      alert('Error saving preboarding data');
    }
  };

  const markComplete = async () => {
    if (!selected) return;
    const id = selected.preboard_id || selected.id;
    if (!id) return;

    try {
      await completePreboarding(id);
      setSelected(null);

      alert('Preboarding marked as completed!');
      refresh();
    } catch (error: any) {
      console.error('Error completing preboarding:', error);
      alert('Error marking preboarding as completed: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
      <GlassCard title="Preboarding Queue" subtitle="Pending pre-joining clearance">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          {(list || [])
            .filter((pb: any) => {
              const emp = (employees || []).find((e: any) => e.employee_id === pb.employee_id);
              if (!emp) return false;
              const role = (emp.role || '').toLowerCase().replace(/[\s_]+/g, '');
              const staffRoles = ['hr', 'it', 'recruiter', 'requiter', 'teamleader', 'tl', 'manager', 'admin', 'itdepartment'];
              return staffRoles.includes(role) || staffRoles.some(r => role.includes(r));
            })
            .map((pb: any) => {
              const emp = (employees || []).find((e: any) => e.employee_id === pb.employee_id);
            return (
              <div key={pb.preboard_id} onClick={() => setSelected(pb)} style={{ ...empListItem, border: selected?.preboard_id === pb.preboard_id ? '1px solid var(--accent-blue)' : '1px solid var(--border-light)', background: selected?.preboard_id === pb.preboard_id ? 'rgba(10,132,255,0.1)' : 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={avatarStyle}>{String(emp?.first_name || emp?.name || pb.employee_id || '?').charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{emp?.name || pb.employee_name || pb.employee_id || 'Unknown'}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{pb.employee_id}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', background: pb.self_onboarding_status === 'completed' ? 'rgba(48,209,88,0.1)' : 'rgba(255,159,10,0.1)', color: pb.self_onboarding_status === 'completed' ? '#30d158' : '#ff9f0a' }}>
                    {pb.self_onboarding_status?.toUpperCase()}
                  </span>
                  {['hr', 'it', 'recruiter', 'teamleader'].includes((emp?.role || '').toLowerCase()) && (
                    <span style={{ fontSize: '8px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', background: 'rgba(10,132,255,0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(10,132,255,0.2)' }}>
                      STAFF ROLE
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard title="Preboarding Details" subtitle={selected ? `Employee: ${selected.employee_name || selected.employee_id}` : 'Select an employee'}>
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '15px' }}>
            <div className="grid-3">
              <FormGroup label="Employee ID">
                <input
                  className="apple-input"
                  value={selected.employee_id || 'Auto-generated'}
                  readOnly
                  style={{ background: 'rgba(128,128,128,0.1)', cursor: 'not-allowed' }}
                />
                <small style={{ color: 'var(--text-tertiary)', fontSize: '10px', marginTop: '2px', display: 'block' }}>
                  Employee ID is system-generated and cannot be changed
                </small>
              </FormGroup>
              <FormGroup label="Emergency Contact Name"><input className="apple-input" value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} /></FormGroup>
              <FormGroup label="Phone"><input className="apple-input" value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} /></FormGroup>
              <FormGroup label="Relation"><input className="apple-input" value={form.emergency_contact_relation} onChange={e => setForm({ ...form, emergency_contact_relation: e.target.value })} /></FormGroup>
            </div>
            <div className="grid-3">
              <FormGroup label="Bank Name"><input className="apple-input" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></FormGroup>
              <FormGroup label="Account Number"><input className="apple-input" value={form.bank_account_number} onChange={e => setForm({ ...form, bank_account_number: e.target.value })} /></FormGroup>
              <FormGroup label="IFSC Code"><input className="apple-input" value={form.bank_ifsc_code} onChange={e => setForm({ ...form, bank_ifsc_code: e.target.value })} /></FormGroup>
            </div>

            <div style={sectionDivider}>Address & Location</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <FormGroup label="Permanent Address">
                <input 
                  className="apple-input" 
                  value={form.permanent_address} 
                  onChange={e => setForm({ ...form, permanent_address: e.target.value })} 
                />
              </FormGroup>
              <FormGroup label="Current Address">
                <input 
                  className="apple-input" 
                  value={form.current_address} 
                  onChange={e => setForm({ ...form, current_address: e.target.value })} 
                />
              </FormGroup>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <FormGroup label="City">
                <input 
                  className="apple-input" 
                  value={form.city} 
                  onChange={e => setForm({ ...form, city: e.target.value })} 
                />
              </FormGroup>
              <FormGroup label="State">
                <input 
                  className="apple-input" 
                  value={form.state} 
                  onChange={e => setForm({ ...form, state: e.target.value })} 
                />
              </FormGroup>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <FormGroup label="Postal Code">
                <input 
                  className="apple-input" 
                  value={form.pincode} 
                  onChange={e => setForm({ ...form, pincode: e.target.value })} 
                />
              </FormGroup>
              <FormGroup label="Country">
                <input 
                  className="apple-input" 
                  value={form.country} 
                  onChange={e => setForm({ ...form, country: e.target.value })} 
                />
              </FormGroup>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <ToggleCheck label="Policy Acknowledged" checked={form.policy_acknowledged} onChange={(v: boolean) => setForm({ ...form, policy_acknowledged: v })} />
              <ToggleCheck label="Training Completed" checked={form.training_completed} onChange={(v: boolean) => setForm({ ...form, training_completed: v })} />
              <ToggleCheck label="Documents Verified" checked={form.documents_verified_by_hr} onChange={(v: boolean) => setForm({ ...form, documents_verified_by_hr: v })} />
            </div>

            <FormGroup label="30-Day Goals"><textarea className="apple-input" style={{ height: '80px', resize: 'none' }} value={form.thirty_day_goals} onChange={e => setForm({ ...form, thirty_day_goals: e.target.value })} /></FormGroup>
            <FormGroup label="Manager Notes"><textarea className="apple-input" style={{ height: '80px', resize: 'none' }} value={form.manager_notes} onChange={e => setForm({ ...form, manager_notes: e.target.value })} /></FormGroup>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="apple-btn" onClick={handleSave} style={{ flex: 1, height: '50px', background: 'var(--accent-blue)' }}>Save Changes</button>
              <button className="apple-btn" onClick={markComplete} style={{ flex: 1, height: '50px', background: '#30d158' }}>Mark Completed</button>
            </div>
          </div>
        ) : (
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <p>Select a candidate from the queue</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ===================== ROLE ASSIGNMENTS TAB =====================
function RoleAssignmentsTab({ refresh, employees, roleAssignmentsData }: any) {
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    // Use data from parent if available, otherwise fetch fresh data
    if (roleAssignmentsData && roleAssignmentsData.length >= 0) {
      setAssignments(Array.isArray(roleAssignmentsData) ? roleAssignmentsData : []);
    } else {
      const fetchAssignments = async () => {
        try {
          const data = await getRoleAssignments();
          setAssignments(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error fetching role assignments:', error);
          setAssignments([]);
        }
      };
      fetchAssignments();
    }
  }, [roleAssignmentsData]);

  const handleExport = () => {
    const exportData = (assignments || []).map((a: any) => {
      const emp = (employees || []).find((e: any) => e.employee_id === a.employee_id);
      return {
        'Assignment ID': a.assignment_id,
        'Employee ID': a.employee_id,
        'Name': emp?.name || 'N/A',
        'Email': emp?.work_email || emp?.official_email || emp?.email || emp?.personal_email || 'N/A',
        'Role': (a.role_name || 'N/A').toUpperCase(),
        'Status': a.is_active ? 'ACTIVE' : 'REVOKED',
        'Login Access': a.login_enabled ? 'ENABLED' : 'DISABLED',
        'Granted By': a.granted_by,
        'Granted Date': a.assigned_at || a.assigned_date,
        'Last Login': a.last_login || 'Never'
      };
    });
    downloadCSV(exportData, `Role_Assignments_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const toggleLogin = async (assignment_id: number, current: boolean) => {
    try {
      await updateRoleAssignment(assignment_id, { login_enabled: !current });
      refresh();
    } catch (error) {
      console.error('Error toggling login:', error);
    }
  };

  const revokeAccess = async (assignment_id: number) => {
    try {
      await updateRoleAssignment(assignment_id, { is_active: false, login_enabled: false, revoked_date: new Date().toISOString() });
      refresh();
    } catch (error) {
      console.error('Error revoking access:', error);
    }
  };

  const reinstateAccess = async (assignment_id: number) => {
    try {
      await updateRoleAssignment(assignment_id, { is_active: true, revoked_date: null });
      refresh();
    } catch (error) {
      console.error('Error reinstating access:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard title="Role Assignment Registry" subtitle="Manage portal access for HR, TL, Recruiter, IT">
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <button
            onClick={handleExport}
            className="apple-btn"
            style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaDownload size={12} /> Export CSV
          </button>
        </div>
        <div style={{ overflowX: 'auto', marginTop: '15px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontSize: '11px' }}>
                <th style={thStyle}>USER / ROLE</th>
                <th style={thStyle}>LOGIN EMAIL</th>
                <th style={thStyle}>STATUS</th>
                <th style={thStyle}>LOGIN ACCESS</th>
                <th style={thStyle}>GRANTED BY</th>
                <th style={thStyle}>GRANTED DATE</th>
                <th style={thStyle}>LAST LOGIN</th>
                <th style={thStyle}>PERFORMANCE</th>
                <th style={thStyle}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {(assignments || []).map((a: any) => {
                const emp = (employees || []).find((e: any) => e.employee_id === a.employee_id);
                // Use API-provided data, fallback to local lookup
                const displayName = a.employee_name || (emp?.first_name ? `${emp.first_name} ${emp.last_name}` : (emp?.name || a.employee_id || 'Unknown'));
                const displayEmail = a.employee_email || (emp?.work_email || emp?.official_email || emp?.email || emp?.personal_email || 'N/A');
                const displayScore = a.performance_score !== null && a.performance_score !== undefined ? a.performance_score : (emp?.performance_score || '—');

                // Check if probation period is over
                let isProbationOver = false;
                if (emp && emp.joining_date) {
                  const joinDate = new Date(emp.joining_date);
                  const probationDays = emp.probation_period_days || 90;
                  const probationEndDate = new Date(joinDate.getTime() + probationDays * 24 * 60 * 60 * 1000);
                  isProbationOver = new Date() > probationEndDate;
                }

                const isInactive = isProbationOver || !a.is_active;
                const displayLoginEnabled = isInactive ? false : a.login_enabled;

                let statusLabel = 'ACTIVE';
                let statusBg = 'rgba(48,209,88,0.1)';
                let statusColor = '#30d158';

                if (isProbationOver) {
                  statusLabel = 'INACTIVE (PROBATION OVER)';
                  statusBg = 'rgba(255,69,58,0.1)';
                  statusColor = '#ff453a';
                } else if (!a.is_active) {
                  statusLabel = 'REVOKED';
                  statusBg = 'rgba(255,69,58,0.1)';
                  statusColor = '#ff453a';
                }

                return (
                  <tr key={a.assignment_id || a.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '13px', opacity: isInactive ? 0.6 : 1 }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '700' }}>{displayName}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>{(a.role_name || 'STAFF').toUpperCase()}</div>
                    </td>
                    <td style={tdStyle}><span style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>{displayEmail}</span></td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', background: statusBg, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: displayLoginEnabled ? '#30d158' : '#ff453a' }} />
                        <span style={{ color: displayLoginEnabled ? '#30d158' : '#ff453a', fontWeight: 'bold', fontSize: '11px' }}>
                          {displayLoginEnabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}><span style={{ fontSize: '11px' }}>{a.granted_by || a.assigned_by || 'System'}</span></td>
                    <td style={tdStyle}><span style={{ fontSize: '11px' }}>{(a.assigned_at || a.assigned_date) ? new Date(a.assigned_at || a.assigned_date).toLocaleDateString() : 'TBD'}</span></td>
                    <td style={tdStyle}><span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{a.last_login ? new Date(a.last_login).toLocaleString() : 'Never'}</span></td>
                    <td style={tdStyle}><span style={{ fontWeight: '700' }}>{displayScore !== '—' ? `${displayScore}/5.0` : '—'}</span></td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => !isInactive && toggleLogin(a.assignment_id, displayLoginEnabled)} 
                          className="apple-btn" 
                          disabled={isInactive}
                          style={{ 
                            padding: '6px 10px', 
                            fontSize: '10px', 
                            background: displayLoginEnabled ? 'rgba(255,69,58,0.1)' : 'rgba(48,209,88,0.1)', 
                            color: displayLoginEnabled ? '#ff453a' : '#30d158',
                            opacity: isInactive ? 0.5 : 1,
                            cursor: isInactive ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {displayLoginEnabled ? <><FaToggleOff /> Lock</> : <><FaToggleOn /> Grant</>}
                        </button>
                        {a.is_active && !isProbationOver ? (
                          <button onClick={() => revokeAccess(a.assignment_id)} className="apple-btn" style={{ padding: '6px 10px', fontSize: '10px', background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}>
                            <FaBan /> Revoke
                          </button>
                        ) : (
                          <button 
                            onClick={() => !isProbationOver && reinstateAccess(a.assignment_id)} 
                            className="apple-btn" 
                            disabled={isProbationOver}
                            style={{ 
                              padding: '6px 10px', 
                              fontSize: '10px', 
                              background: 'rgba(48,209,88,0.1)', 
                              color: '#30d158',
                              opacity: isProbationOver ? 0.5 : 1,
                              cursor: isProbationOver ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <FaCheckCircle /> Reinstate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

// ===================== OFFBOARDING TAB =====================
function OffboardingTab({ refresh, employees, offboardingData, onViewLetter }: any) {
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const initialForm = {
    last_working_day: '', notice_period: '', reason_for_leaving: '',
    handover_date: '', final_settlement_date: '', remarks: '',
    exit_date: '', reason: 'resign', notice_period_days: 30, handover_to: '',
    final_dues_amount: 0, exit_interview_notes: '',
    it_clearance: false, hr_settlement: false
  };
  const [form, setForm] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState("");

  const handleExport = () => {
    const exportData = (offboardingData || []).map((r: any) => {
      const emp = (employees || []).find((e: any) => e.id === r.employee_id);
      return {
        'Offboard ID': r.offboard_id,
        'Employee ID': r.employee_id,
        'Name': emp?.name || 'N/A',
        'Exit Date': r.exit_date,
        'Reason': (r.reason || 'N/A').toUpperCase(),
        'Notice Period': r.notice_period_days,
        'IT Clearance': r.checklist_status?.it_clearance ? 'YES' : 'NO',
        'HR Settlement': r.checklist_status?.hr_settlement ? 'YES' : 'NO',
        'Final Dues': r.final_dues_amount,
        'Approved': r.manager_approved ? 'YES' : 'NO',
        'Completed': r.completed ? 'YES' : 'NO'
      };
    });
    downloadCSV(exportData, `Offboarding_List_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const allowedRoles = ['hr', 'recruiter', 'teamleader', 'it', 'employee', 'staff'];
  const filteredEmployees = (employees || []).filter((e: any) => {
    const role = (e.role || '').toLowerCase();
    const status = (e.status || '').toLowerCase();
    const name = (e.name || '').toLowerCase();
    const firstName = (e.first_name || '').toLowerCase();
    const lastName = (e.last_name || '').toLowerCase();
    const empId = (e.employee_id || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const isStaff = allowedRoles.includes(role);
    const isActive = status === 'active';
    const matchesSearch = name.includes(search) || firstName.includes(search) || lastName.includes(search) || empId.includes(search);

    return isStaff && isActive && matchesSearch;
  });

  const handleSubmit = async () => {
    if (!selectedEmp) return;
    const noticeRemaining = form.exit_date ? Math.max(0, Math.ceil((new Date(form.exit_date).getTime() - Date.now()) / (1000 * 3600 * 24))) : form.notice_period_days;
    const req = createOffboardingRequest(selectedEmp.employee_id || selectedEmp.id, {
      exit_date: form.exit_date,
      reason: form.reason,
      notice_period_days: form.notice_period_days,
      notice_remaining_days: noticeRemaining,
      handover_to: form.handover_to || null,
      checklist_status: { it_clearance: form.it_clearance, hr_settlement: form.hr_settlement },
      final_dues_amount: form.final_dues_amount,
      exit_interview_notes: form.exit_interview_notes
    });
    await addOffboardingRequest(req);
    await updateEmployee(selectedEmp.employee_id || selectedEmp.id, { status: 'On Notice' });
    setSelectedEmp(null);
    setForm(initialForm); // Reset form
    alert(`Offboarding initiated for ${selectedEmp.name}`);
    refresh();
  };

  const approveOffboard = async (offboard_id: number) => {
    await updateOffboardingRequest(offboard_id, { manager_approved: true });
    refresh();
  };

  const completeOffboard = async (offboard_id: number, employee_id: string) => {
    const req = (offboardingData || []).find((r: any) => r.offboard_id === offboard_id);
    const exitDate = req?.exit_date || req?.last_working_day;
    const todayStr = new Date().toISOString().split('T')[0];
    const isFuture = exitDate && exitDate > todayStr;

    await updateOffboardingRequest(offboard_id, { completed: true, manager_approved: true });
    if (isFuture) {
      await updateEmployee(employee_id, { status: 'On Notice' });
    } else {
      await updateEmployee(employee_id, { status: 'Inactive' });
    }

    // Simulations: Email notification
    const emp = (employees || []).find((e: any) => e.employee_id === employee_id);

    // Prepare Letter Data for auto-preview
    const letterData = formatLetterData(emp, req);

    alert(`✅ Settlement Authorized.\n📧 Relieving letter has been dispatched to ${emp?.email || 'employee'}.`);

    refresh();
    onViewLetter(letterData);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <GlassCard title="Select Employee" subtitle="Initiate separation process">
          <div style={{ marginBottom: '15px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="apple-input"
                placeholder="Search staff by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '35px', fontSize: '12px' }}
              />
              <FaProjectDiagram style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '14px' }} />
            </div>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredEmployees.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                No matching staff members found
              </div>
            )}
            {filteredEmployees.map((emp: any) => (
              <div key={emp.id} onClick={() => setSelectedEmp(emp)} style={{ ...empListItem, border: selectedEmp?.id === emp.id ? '1px solid var(--accent-blue)' : '1px solid var(--border-light)', background: selectedEmp?.id === emp.id ? 'rgba(10,132,255,0.1)' : 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={avatarStyle}>{String(emp?.first_name || emp?.name || emp?.employee_id || emp?.id || '?').charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{emp?.first_name ? `${emp.first_name} ${emp.last_name}` : (emp?.name || emp?.employee_id || 'Unknown')}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{emp.department} • {emp.id}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="Active Offboarding" subtitle="Pending separation cases">
          <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
            <button
              onClick={handleExport}
              className="apple-btn"
              style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(255,69,58,0.1)', color: '#ff453a', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Download results as CSV"
            >
              <FaDownload size={12} /> Export CSV
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {(offboardingData || []).map((r: any) => {
              const emp = (employees || []).find((e: any) => e.employee_id === r.employee_id);
              return (
                <div key={r.offboard_id} style={empListItem}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: r.completed ? 'var(--text-secondary)' : 'white' }}>{emp?.name || r.employee_id}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{emp?.department || 'N/A'} • Exit: {r.exit_date} • {(r.reason || 'N/A').toUpperCase()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!r.manager_approved && (
                      <button onClick={() => approveOffboard(r.offboard_id)} className="apple-btn" style={{ padding: '6px 10px', fontSize: '10px', background: 'rgba(48,209,88,0.1)', color: '#30d158' }}>Approve</button>
                    )}
                    {!r.completed && r.manager_approved && (
                      <button onClick={() => completeOffboard(r.offboard_id, r.employee_id)} className="apple-btn" style={{ padding: '6px 10px', fontSize: '10px', background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}>Complete</button>
                    )}
                    {r.completed && (
                      <button
                        onClick={() => {
                          onViewLetter(formatLetterData(emp, r));
                        }}
                        className="apple-btn"
                        style={{ padding: '6px 10px', fontSize: '10px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', border: '1px solid rgba(10,132,255,0.2)' }}
                      >
                        <FaFilePdf size={10} style={{ marginRight: '4px' }} /> Letter
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!window.confirm("Remove this offboarding record?")) return;
                        try {
                          await deleteOffboardingRequest(r.offboard_id);
                          refresh();
                        } catch (e) {
                          alert('Failed to delete');
                        }
                      }}
                      className="apple-btn"
                      style={{ padding: '6px 10px', fontSize: '10px', background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Separation Protocol" subtitle={selectedEmp ? `For: ${selectedEmp.name}` : 'Select an employee first'}>
        {selectedEmp ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '15px' }}>
            <div className="grid-2">
              <FormGroup label="Exit Date"><input type="date" className="apple-input" value={form.exit_date} onChange={e => setForm({ ...form, exit_date: e.target.value })} /></FormGroup>
              <FormGroup label="Reason">
                <select className="apple-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
                  <option value="resign">Resignation</option>
                  <option value="terminate">Termination</option>
                  <option value="layoff">Layoff</option>
                </select>
              </FormGroup>
            </div>
            <div className="grid-2">
              <FormGroup label="Notice Period (Days)"><input type="number" className="apple-input" value={form.notice_period_days} onChange={e => setForm({ ...form, notice_period_days: parseInt(e.target.value) || 0 })} /></FormGroup>
              <FormGroup label="Handover To (Employee ID)"><input className="apple-input" placeholder="E001" value={form.handover_to} onChange={e => setForm({ ...form, handover_to: e.target.value })} /></FormGroup>
            </div>

            <div style={sectionDivider}>Clearance Checklist (JSON)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <ToggleCheck label="IT Clearance" checked={form.it_clearance} onChange={(v: boolean) => setForm({ ...form, it_clearance: v })} />
              <ToggleCheck label="HR Settlement" checked={form.hr_settlement} onChange={(v: boolean) => setForm({ ...form, hr_settlement: v })} />
            </div>

            <FormGroup label="Final Dues Amount (₹)"><input type="number" className="apple-input" value={form.final_dues_amount} onChange={e => setForm({ ...form, final_dues_amount: parseFloat(e.target.value) || 0 })} /></FormGroup>
            <FormGroup label="Exit Interview Notes"><textarea className="apple-input" style={{ height: '80px', resize: 'none' }} value={form.exit_interview_notes} onChange={e => setForm({ ...form, exit_interview_notes: e.target.value })} /></FormGroup>

            <button onClick={handleSubmit} className="apple-btn" style={{ height: '54px', background: '#ff453a', border: 'none', color: 'white', fontWeight: 'bold' }}>
              Confirm Separation Protocol
            </button>
          </div>
        ) : (
          <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <FaSignOutAlt size={40} style={{ opacity: 0.2, marginBottom: '20px' }} />
            <p>Select an active employee to initiate separation</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ===================== SUB-COMPONENTS =====================
const TabButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} style={{
    flex: 1, height: '48px', borderRadius: '14px', border: active ? '1px solid var(--accent-blue)' : '1px solid var(--border-light)',
    background: active ? 'rgba(10, 132, 255, 0.1)' : 'rgba(255,255,255,0.02)',
    color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
  }}>
    {icon} {label}
  </button>
);

const FormGroup = ({ label, children }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
    {children}
  </div>
);

const QtyItem = ({ icon, label, val, onAdd, onSub }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
      <span style={{ color: 'var(--accent-blue)' }}>{icon}</span> {label}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button onClick={onSub} type="button" style={qtyBtn}>-</button>
      <span style={{ fontSize: '14px', fontWeight: '800', minWidth: '20px', textAlign: 'center' }}>{val}</span>
      <button onClick={onAdd} type="button" style={qtyBtn}>+</button>
    </div>
  </div>
);

const ToggleCheck = ({ label, checked, onChange }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-light)', fontSize: '12px', cursor: 'pointer' }} onClick={() => onChange(!checked)}>
    <input type="checkbox" checked={checked} onChange={() => onChange(!checked)} style={{ cursor: 'pointer' }} />
    <span>{label}</span>
  </div>
);

const FileUploadGroup = ({ label, fileName, onChange, icon, isImage, preview }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
    <div
      style={{
        position: 'relative',
        height: '100px',
        borderRadius: '16px',
        border: '1px dashed var(--border-light)',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e: any) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        e.currentTarget.style.borderColor = 'var(--accent-blue)';
      }}
      onMouseLeave={(e: any) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
        e.currentTarget.style.borderColor = 'var(--border-light)';
      }}
      onClick={() => (document.getElementById(`file-${label}`) as HTMLInputElement)?.click()}
    >
      {isImage && preview ? (
        <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
      ) : (
        <>
          <div style={{ fontSize: '24px', color: fileName ? '#30d158' : 'var(--text-tertiary)' }}>
            {fileName ? <FaCheckCircle /> : icon}
          </div>
          <div style={{ fontSize: '11px', color: fileName ? '#30d158' : 'var(--text-secondary)', textAlign: 'center', padding: '0 10px' }}>
            {fileName ? fileName : 'Click to Upload'}
          </div>
        </>
      )}
      <input
        id={`file-${label}`}
        type="file"
        style={{ display: 'none' }}
        onChange={onChange}
        accept={isImage ? "image/*" : ".pdf,.doc,.docx,image/*"}
      />
      {fileName && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: '#30d158',
          color: 'white',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px'
        }}>
          <FaCheckCircle size={12} />
        </div>
      )}
    </div>
  </div>
);

// ===================== WORKFORCE TAB =====================
function WorkforceTab({ employees }: any) {
  // 🛡️ SECURITY: The backend already filters the workforce specifically for the manager.
  // We remove redundant frontend filtering to prevent ID mismatch issues (e.g. EMP-001 vs USR-1).
  const myTeam = Array.isArray(employees) ? employees : [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
      {myTeam.length === 0 && (
        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--border-light)' }}>
          <FaUserPlus size={48} color="var(--text-tertiary)" style={{ marginBottom: '20px', opacity: 0.3 }} />
          <p style={{ color: 'var(--text-tertiary)', fontSize: '15px' }}>No active team members found.</p>
        </div>
      )}
      {myTeam.map((emp: any) => (
        <GlassCard key={emp.id} title={emp.first_name ? `${emp.first_name} ${emp.last_name}` : (emp.name || 'Anonymous')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
            <div style={{ ...avatarStyle, width: '48px', height: '48px', fontSize: '20px' }}>
              {String(emp.first_name || emp.name || emp.employee_id || '?').charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-blue)', marginBottom: '4px' }}>{emp.employee_id}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{emp.designation || 'Specialist'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{emp.department} • {emp.role?.toUpperCase()}</div>
            </div>
          </div>
          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Email:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{emp.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Status:</span>
              <span style={{
                color: (emp.status || '').toLowerCase() === 'active' ? '#30d158' : 
                       (emp.status || '').toLowerCase() === 'inactive' ? '#ff453a' :
                       (emp.status || '').toLowerCase() === 'on notice' ? '#ff9f0a' :
                       '#ff9f0a',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>{emp.status || 'Unknown'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Hired:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{emp.joining_date || 'N/A'}</span>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ===================== STYLES =====================
const qtyBtn: any = { width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.05)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const sectionDivider: any = { fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', marginTop: '10px' };
const empListItem: any = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid var(--border-light)', cursor: 'pointer' };
const avatarStyle: any = { width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #0a84ff, #007aff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' };
const thStyle: any = { padding: '15px', fontWeight: '600' };
const tdStyle: any = { padding: '15px' };
