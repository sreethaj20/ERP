import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getOnboardingRequests, updateOnboardingRequest, managerApproveOnboardingRequest as approveOnboardingRequest, getEmployees, addRoleAssignment, createRoleAssignment, updateEmployee, deleteOnboardingRequest, checkUserExists, refreshOnboarding, refreshEmployees, DEFAULT_PASSWORD } from "../../utils/storage";
import { FaUserPlus, FaCheck, FaTimes, FaLaptop, FaFileAlt, FaLock, FaCalendarAlt } from "react-icons/fa";

export default function OnboardingRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployeesState] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    const interval = setInterval(loadData, 10000);
    return () => {
      window.removeEventListener('storage', loadData);
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    try {
      // Import the refreshing variants from storage
      const [requestsData, employeesData] = await Promise.all([
        refreshOnboarding(),
        refreshEmployees()
      ]);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
      setEmployeesState(Array.isArray(employeesData) ? employeesData : []);
    } catch (error) {
      console.error('[GOVERNANCE] Critical data load failed:', error);
      setRequests([]);
      setEmployeesState([]);
    }
  };

  const getEmpName = (r: any) => {
    if (!r) return 'Unknown';
    // 1. Backend now sends a pre-resolved 'name' field
    if (typeof r === 'object' && r.name && r.name !== r.employee_id) return r.name;
    // 2. Compose from first/last name on the request itself
    if (typeof r === 'object' && (r.first_name || r.last_name))
      return `${r.first_name || ''} ${r.last_name || ''}`.trim();
    // 3. Cross-reference employee cache
    const empId = typeof r === 'string' ? r : r.employee_id;
    const emp = (employees || []).find((e: any) => e.employee_id === empId || String(e.id) === String(empId));
    if (emp?.name) return emp.name;
    if (emp) return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || empId;
    return empId || 'Unknown';
  };

  const getEmpEmail = (r: any) => {
    if (!r) return '';
    const empId = typeof r === 'string' ? r : r.employee_id;
    const emp = (employees || []).find((e: any) => e.employee_id === empId || String(e.id) === String(empId));
    return emp?.email || (typeof r === 'object' ? r.login_email || r.personal_email : '') || '';
  };

  const handleApprove = async (request_id: number) => {
    try {
      // Get the request details to check for potential duplicates
      const request = requests.find((req: any) => req.request_id === request_id || req.id === request_id);

      if (request) {
        // Proactively check if user already exists
        const userCheck = await checkUserExists(request.email, request.username);
        if (userCheck.exists) {
          const shouldContinue = confirm(
            `⚠️ Potential Duplicate User Detected\n\n${userCheck.message}\n\nThis onboarding request may be for a user who already exists.\n\nDo you want to continue with approval anyway?`
          );

          if (!shouldContinue) {
            return; // User chose not to continue
          }
        }
      }

      // Use the new atomic approval endpoint
      const result = await approveOnboardingRequest(request_id);

      const userEmail = result.email || request?.email || 'N/A';
      const userRole = result.role || request?.role_name || 'employee';
      alert(`✅ Staff Lifecycle Authorized!\n\n🔐 Login: ${userEmail}\n🔑 Password: ${DEFAULT_PASSWORD}\n📋 Role: ${userRole.toUpperCase()}\n\nNote: This staff member is now directly provisioned in your workforce.`);

      // Always refresh local state
      await loadData();
      if (selectedRequest?.request_id === request_id) {
        setSelectedRequest((prev: any) => ({ ...prev, status: 'approved' }));
      }
    } catch (error: any) {
      console.error('Error approving request:', error);

      // Provide more detailed error message
      let errorMessage = 'Error approving request. Please try again.';

      if (error.response?.status === 500) {
        // Check for specific database integrity errors
        const errorData = error.response.data;
        if (typeof errorData === 'string' && errorData.includes('Duplicate entry')) {
          if (errorData.includes('username')) {
            errorMessage = 'Cannot approve onboarding: Username already exists in the system.\n\nThe user may already have an account or this request was previously processed.\n\nPlease check with the user or IT support.';
          } else if (errorData.includes('email')) {
            errorMessage = 'Cannot approve onboarding: Email already exists in the system.\n\nThe user may already have an account or this request was previously processed.\n\nPlease check with the user or IT support.';
          } else {
            errorMessage = 'Cannot approve onboarding: Duplicate data detected.\n\nThis request may have been previously processed.\n\nPlease check the request status or contact IT support.';
          }
        } else {
          errorMessage = 'Server error occurred while approving. The backend may need to be checked.\n\nPlease contact IT support or try again later.';
        }
      } else if (error.response?.status === 404) {
        errorMessage = 'Onboarding request not found or may have been already processed.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to approve this request.';
      } else if (error.response?.data?.detail) {
        errorMessage = `Backend error: ${error.response.data.detail}`;
      }

      alert(errorMessage);
    }
  };

  const handleReject = async (request_id: number) => {
    if (!window.confirm("Are you sure you want to REJECT and PERMANENTLY DELETE this request? This action cannot be undone.")) return;
    console.log(`[GOVERNANCE] Rejecting onboarding request ID: ${request_id}`);
    try {
      const result = await deleteOnboardingRequest(request_id);
      console.log(`[GOVERNANCE] Delete success result:`, result);

      // Perform full refresh
      await loadData();

      if (selectedRequest?.request_id === request_id || selectedRequest?.id === request_id) {
        setSelectedRequest(null);
      }
      alert('Onboarding request rejected and permanently removed from system.');
    } catch (error: any) {
      console.error('[GOVERNANCE] Error rejecting request:', error);
      alert(`Error rejecting request: ${error.message || 'Server error'}`);
    }
  };

  const getHwVal = (req: any, key: string) => {
    if (!req) return 0;
    const hw = req.hardware_requirements || req.hardware_req;
    if (!hw) return 0;
    // If it's a string, try parsing
    let parsed = hw;
    if (typeof hw === 'string') {
      try { parsed = JSON.parse(hw); } catch (e) { return 0; }
    }
    // Handle double encoding or case-insensitive keys
    if (typeof parsed !== 'object') return 0;
    const lowerKey = key.toLowerCase();
    const entry = Object.entries(parsed).find(([k]) => k.toLowerCase() === lowerKey);
    return entry ? entry[1] : (parsed[key] || 0);
  };

  const allRequests = requests || [];
  const currentUserId = sessionStorage.getItem('userId');

  // Unified list: Show all requests belonging to the manager (already filtered by backend)
  const staffRequests = allRequests;

  const pendingStaff = staffRequests.filter((r: any) => !['approved', 'completed', 'verified'].includes(r.status?.toLowerCase()));
  const processedStaff = staffRequests.filter((r: any) => ['approved', 'completed', 'verified'].includes(r.status?.toLowerCase()));

  return (
    <>
      <Header role="Manager" title="Strategic Onboarding" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Onboarding Governance</h1>
        <p className="subtitle">Execute approvals for new talent acquisition & resource allocation</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Left Column: Request List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <GlassCard title="Authorization Queue" subtitle={`${pendingStaff.length} Pending • ${staffRequests.length} Total Staff`}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
              {staffRequests.length === 0 && (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                  No staff onboarding requests found.
                </p>
              )}
              {staffRequests.map((r: any) => (
                <div
                  key={r.request_id}
                  onClick={() => setSelectedRequest(r)}
                  style={{
                    padding: "15px",
                    borderRadius: "14px",
                    background: selectedRequest?.request_id === r.request_id ? "rgba(10, 132, 255, 0.1)" : "rgba(255,255,255,0.02)",
                    border: selectedRequest?.request_id === r.request_id ? "1px solid #0a84ff" : "1px solid var(--border-light)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{getEmpName(r)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{r.employee_id}</div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: 'bold',
                      padding: '3px 8px',
                      borderRadius: '20px',
                      background: r.status?.toLowerCase() === 'pending' ? 'rgba(255,159,10,0.15)' : r.status?.toLowerCase() === 'approved' ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)',
                      color: r.status?.toLowerCase() === 'pending' ? 'var(--accent-orange)' : r.status?.toLowerCase() === 'approved' ? 'var(--accent-green)' : '#ff453a'
                    }}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Join: {r.join_date || 'TBD'}
                    {r.email && <span style={{ marginLeft: '8px', opacity: 0.7 }}>• {r.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard title="Cycle Stats" subtitle="Staff Onboarding">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
              <div style={statBox}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-orange)' }}>{pendingStaff.length}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Pending</div>
              </div>
              <div style={statBox}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-green)' }}>{processedStaff.length}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Processed</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Detailed View */}
        <GlassCard title="Request Blueprint" subtitle="Comprehensive verification data">
          {selectedRequest ? (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                {/* Section 1: Identity & Role */}
                <div>
                  <SectionTitle icon={<FaUserPlus />} text="Personnel Details" />
                  <div style={detailGrid}>
                    <DetailLabel>Employee Ref</DetailLabel><DetailValue>{selectedRequest.employee_id}</DetailValue>
                    <DetailLabel>Name</DetailLabel><DetailValue>{getEmpName(selectedRequest)}</DetailValue>
                    <DetailLabel>Role Classification</DetailLabel><DetailValue style={{ color: 'var(--accent-blue)' }}>{(selectedRequest.role_name || selectedRequest.role_type || 'Unspecified').toUpperCase()}</DetailValue>
                    <DetailLabel>Access Tier</DetailLabel><DetailValue>{selectedRequest.access_level}</DetailValue>
                    <DetailLabel>Initiating Manager</DetailLabel><DetailValue>{selectedRequest.manager_name || selectedRequest.manager_id}</DetailValue>
                  </div>
                </div>

                {/* Section 2: Timeline */}
                <div>
                  <SectionTitle icon={<FaCalendarAlt />} text="Lifecycle Timeline" />
                  <div style={detailGrid}>
                    <DetailLabel>Offer Released</DetailLabel><DetailValue>{selectedRequest.offer_date}</DetailValue>
                    <DetailLabel>Target Join Date</DetailLabel><DetailValue>{selectedRequest.join_date || 'TBD'}</DetailValue>
                    <DetailLabel>System Entry</DetailLabel><DetailValue>{selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleDateString() : 'TBD'}</DetailValue>
                    <DetailLabel>Last Updated</DetailLabel><DetailValue>{selectedRequest.updated_at ? new Date(selectedRequest.updated_at).toLocaleString() : 'TBD'}</DetailValue>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px' }}>
                {/* Section 3: Hardware Provisioning */}
                <div>
                  <SectionTitle icon={<FaLaptop />} text="Resource Allocation (JSON)" />
                  <div style={hwTable}>
                    <div style={hwRow}><span>Laptop</span> <span>{getHwVal(selectedRequest, 'laptop')}x</span></div>
                    <div style={hwRow}><span>Mouse</span> <span>{getHwVal(selectedRequest, 'mouse')}x</span></div>
                    <div style={hwRow}><span>Keyboard</span> <span>{getHwVal(selectedRequest, 'keyboard')}x</span></div>
                  </div>
                </div>

                {/* Section 4: Document Verification */}
                <div>
                  <SectionTitle icon={<FaFileAlt />} text="Document Vault" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                    {selectedRequest.documents && (() => {
                      // Parse documents if it's a JSON string
                      let documentsObj;
                      try {
                        documentsObj = typeof selectedRequest.documents === 'string'
                          ? JSON.parse(selectedRequest.documents)
                          : selectedRequest.documents;
                      } catch (e) {
                        console.error('Error parsing documents JSON:', e);
                        documentsObj = {};
                      }

                      // More strict filtering - only show documents with actual content
                      const allDocs = Object.entries(documentsObj);

                      // Only show the 3 expected document types with actual content
                      const expectedDocTypes = ['aadhaar', 'pan', 'photo'];
                      const filteredDocs = allDocs
                        .filter(([key, val]: any) => {
                          // First check if it's one of our expected document types
                          if (!expectedDocTypes.includes(key)) {
                            return false;
                          }
                          // Then check for actual content (non-empty data URL)
                          if (!val || val === '' || val === null || val === undefined) {
                            return false;
                          }
                          // Check if it's a valid data URL or an S3 public URL
                          return val.startsWith('data:') || val.startsWith('http') || val.includes('.s3.');
                        });

                      if (filteredDocs.length === 0) {
                        return (
                          <div style={{
                            gridColumn: '1 / -1',
                            padding: '40px',
                            textAlign: 'center',
                            color: 'var(--text-tertiary)',
                            fontSize: '14px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-light)'
                          }}>
                            No documents uploaded yet
                          </div>
                        );
                      }

                      return filteredDocs.map(([key, val]: any) => (
                        <div key={key} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          padding: '12px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '12px',
                          border: '1px solid var(--border-light)'
                        }}>
                          <span style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>{key}</span>
                          {val && val !== '' ? (
                            <button
                              onClick={() => {
                                const win = window.open();
                                if (win) {
                                  win.document.write(`<iframe src="${val}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                }
                              }}
                              className="apple-btn"
                              style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(48,209,88,0.1)', color: '#30d158', height: 'auto' }}
                            >
                              View Docs
                            </button>
                          ) : (
                            <span style={{ color: '#ff9f0a', fontWeight: 'bold', fontSize: '11px' }}>PENDING</span>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {['pending', 'manager_pending'].includes(selectedRequest.status?.toLowerCase()) && (
                <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
                  <button onClick={() => handleApprove(selectedRequest.request_id)} className="apple-btn" style={{ flex: 1, height: '54px', background: 'var(--accent-green)' }}>
                    <FaCheck /> Authorize Onboarding
                  </button>
                  <button onClick={() => handleReject(selectedRequest.request_id)} className="apple-btn" style={{ flex: 1, height: '54px', background: 'rgba(255,69,58,0.1)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.2)' }}>
                    <FaTimes /> Reject Request
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              Select a request from the queue to review governance details
            </div>
          )}
        </GlassCard>
      </div>
    </>
  );
}

const statBox = {
  padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-light)', textAlign: 'center' as const
};

const SectionTitle = ({ icon, text }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '15px' }}>
    {icon} {text}
  </div>
);

const DetailLabel = ({ children }: any) => <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{children}</span>;
const DetailValue = ({ children, style }: any) => <span style={{ fontSize: '14px', fontWeight: '600', ...style }}>{children}</span>;
const detailGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 10px' };
const hwTable = { display: 'flex', flexDirection: 'column' as const, gap: '10px' };
const hwRow = { display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' };
