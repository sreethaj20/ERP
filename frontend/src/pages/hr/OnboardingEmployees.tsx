import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
  getHROnboardingEnriched,
  updateOnboardingRequest,
  updateEmployee,
  getEmployees,
  refreshEmployees,
  getPreboardingByEmpId,
  updatePreboarding,
  generateId,
  notifyDepartment,
  uploadFile,
  getFileUrl,
  DEFAULT_PASSWORD
} from "../../utils/storage";
import { downloadCSV } from "../../utils/formatters";
import api from "../../api/apiClient";
import { FaTimes, FaCheckCircle, FaFileAlt, FaClock, FaDownload, FaUpload, FaLaptop, FaMouse, FaKeyboard, FaSave } from "react-icons/fa";

export default function OnboardingEmployees() {
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [preboardingData, setPreboardingData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchedId, setLastFetchedId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      console.log("[ONBOARDING] Fetching latest pipeline data...");
      const enriched = await getHROnboardingEnriched();
      setRequests(Array.isArray(enriched) ? enriched : []);
      
      const emps = await refreshEmployees();
      setEmployees(Array.isArray(emps) ? emps : []);

      // Reset lastFetchedId to force the selection useEffect to re-run and grab updated master data
      setLastFetchedId("");

      // If something was selected, re-select the enriched version
      if (selected) {
        const updated = enriched.find((r: any) => r.request_id === selected.request_id);
        if (updated) setSelected(updated);
      }
    } catch (err) {
      console.error("[ONBOARDING] Load failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (selected) {
      if (selected.request_id !== lastFetchedId || !lastFetchedId) {
        const fetchPB = async () => {
          setLastFetchedId(selected.request_id);
          const pb = await getPreboardingByEmpId(selected.employee_id);
          
          // 🔧 ENHANCEMENT: End-to-End Data Pull from Employee Master
          let empRecord = null;
          if (selected.employee_id) {
            try {
              console.log(`[ONBOARDING] Fetching full employee master record for ${selected.employee_id}...`);
              const res = await api.get(`employee/${selected.employee_id}`);
              empRecord = res.data;
            } catch (e) {
              console.warn("[ONBOARDING] Full employee lookup failed, falling back to directory:", e);
              empRecord = employees.find(e => e.id === selected.employee_id || e.employee_id === selected.employee_id);
            }
          }
          
          if (empRecord) {
            console.log("[ONBOARDING] Merging Master Record into View...");
            // Merge master data into the 'selected' view if fields are empty in onboarding record
            const merged = {
              ...selected,
              first_name: selected.first_name || empRecord.first_name,
              last_name: selected.last_name || empRecord.last_name,
              // Prioritize master data for core identity if missing in onboarding
              dob: selected.dob || empRecord.dob,
              gender: selected.gender || empRecord.gender,
              marital_status: selected.marital_status || empRecord.marital_status,
              blood_group: selected.blood_group || empRecord.blood_group,
              nationality: selected.nationality || empRecord.nationality,
              personal_email: selected.personal_email || empRecord.personal_email || empRecord.email,
              personal_mobile: selected.personal_mobile || empRecord.personal_mobile || empRecord.phone,
              alternate_mobile: selected.alternate_mobile || empRecord.alternate_mobile,
              pincode: selected.pincode || empRecord.pincode || empRecord.postal_code,
              
              designation: selected.designation || empRecord.designation,
              department: selected.department || empRecord.department,
              reporting_manager_id: selected.reporting_manager_id || empRecord.manager_id || empRecord.reporting_manager_id,
              reporting_manager: selected.reporting_manager || empRecord.reporting_manager || empRecord.reporting_to,
              team_leader_id: selected.team_leader_id || empRecord.team_leader_id,
              joining_location: selected.joining_location || selected.work_location || empRecord.work_location,
              work_location: selected.work_location || selected.joining_location || empRecord.work_location,
              joining_date: selected.joining_date || empRecord.joining_date,
              probation_period_days: selected.probation_period_days || empRecord.probation_period_days,
              official_email: selected.official_email || empRecord.official_email || selected.email,
              
              pan_number: selected.pan_number || empRecord.pan_number || pb?.pan_number,
              aadhaar_number: selected.aadhaar_number || empRecord.aadhaar_number || pb?.aadhaar_number,
              passport_number: selected.passport_number || empRecord.passport_number || pb?.passport_number,
              uan_number: selected.uan_number || empRecord.uan_number || pb?.uan_number,
              esi_number: selected.esi_number || empRecord.esi_number || pb?.esi_number,
              pf_number: selected.pf_number || empRecord.pf_number || pb?.pf_number,
              
              // Sync files from PB/Employee Master if missing in ONB
              aadhaar_file_url: selected.aadhaar_file_url || empRecord.aadhaar_file_url || pb?.aadhaar_file_url,
              pan_file_url: selected.pan_file_url || empRecord.pan_file_url || pb?.pan_file_url,
              bank_proof_url: selected.bank_proof_url || empRecord.bank_proof_url || pb?.bank_proof_url,
              education_certificate_url: selected.education_certificate_url || empRecord.education_certificate_url || pb?.education_certificate_url,
              resume_url: selected.resume_url || empRecord.resume_url || pb?.resume_url,
              offer_letter_signed_url: selected.offer_letter_signed_url || empRecord.offer_letter_signed_url || pb?.offer_letter_signed_url,
              previous_company_letter_url: selected.previous_company_letter_url || pb?.previous_company_letter_url
            };
            
            // Only update if something changed (avoid infinite loop if selected is dependency, though it's not here)
            if (JSON.stringify(merged) !== JSON.stringify(selected)) {
               setSelected(merged);
            }
          }
          
          // Merge address and bank details from empRecord to pb if missing in pb, or create initial if not existing
          const updatedPb = pb ? {
            ...pb,
            bank_account_number: pb.bank_account_number || empRecord?.bank_account_number || empRecord?.bank_account_no || "",
            bank_name: pb.bank_name || empRecord?.bank_name || "",
            bank_ifsc_code: pb.bank_ifsc_code || empRecord?.bank_ifsc_code || empRecord?.ifsc_code || "",
            current_address: pb.current_address || empRecord?.current_address || empRecord?.address || "",
            permanent_address: pb.permanent_address || empRecord?.permanent_address || "",
            city: pb.city || empRecord?.city || "",
            state: pb.state || empRecord?.state || "",
            pincode: pb.pincode || empRecord?.pincode || empRecord?.postal_code || "",
            country: pb.country || empRecord?.country || ""
          } : (empRecord ? {
            preboard_id: `PRE-HR-${selected.request_id}`,
            employee_id: selected.employee_id,
            onboarding_request_id: selected.request_id,
            bank_account_number: empRecord.bank_account_number || empRecord.bank_account_no || "",
            bank_name: empRecord.bank_name || "",
            bank_ifsc_code: empRecord.bank_ifsc_code || empRecord.ifsc_code || "",
            current_address: empRecord.current_address || empRecord.address || "",
            permanent_address: empRecord.permanent_address || "",
            city: empRecord.city || "",
            state: empRecord.state || "",
            pincode: empRecord.pincode || empRecord.postal_code || "",
            country: empRecord.country || "",
            nda_signed: false,
            code_of_conduct_signed: false,
            policy_acknowledged: false,
            isMock: true
          } : null);
          
          setPreboardingData(updatedPb);
        };
        fetchPB();
      }
    } else {
      setPreboardingData(null);
      setLastFetchedId("");
    }
  }, [selected?.request_id, employees, lastFetchedId]);

  const getEmpName = (req: any) => {
    const emp = employees.find((e: any) => e.id === req.employee_id || e.employee_id === req.employee_id);
    return emp?.name || `${req.first_name || ''} ${req.last_name || ''}`.trim() || req.employee_id;
  };

  const getEmpEmail = (req: any) => {
    const emp = employees.find((e: any) => e.id === req.employee_id || e.employee_id === req.employee_id);
    return emp?.email || req.official_email || req.personal_email || "";
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setIsSaving(true);

    try {
      // 1. Update Onboarding
      await updateOnboardingRequest(selected.request_id, selected);

      // 2. Update Preboarding if linked and not a mock record
      if (preboardingData && !preboardingData.isMock) {
        await updatePreboarding(preboardingData.preboard_id, preboardingData);
      }

      // 3. Sync to Core Employee Record (query directly from backend for full master data)
      let empRecord = null;
      if (selected.employee_id) {
        try {
          console.log(`[ONBOARDING] Fetching latest employee master for sync: ${selected.employee_id}`);
          const res = await api.get(`employee/${selected.employee_id}`);
          empRecord = res.data;
        } catch (e) {
          console.warn("[ONBOARDING] Employee lookup during save failed, using cache:", e);
          empRecord = employees.find(e => e.id === selected.employee_id || e.employee_id === selected.employee_id);
        }
      }

      if (empRecord) {
        const { reporting_manager, reporting_manager_id } = selected;
        const updates = {
          ...empRecord,
          // Onboarding Fields
          first_name: selected.first_name,
          last_name: selected.last_name,
          name: `${selected.first_name} ${selected.last_name}`.trim(),
          official_email: selected.official_email || selected.official_email_id || selected.email || empRecord.official_email,
          personal_email: selected.personal_email || empRecord.personal_email,
          personal_mobile: selected.personal_mobile || empRecord.phone || empRecord.personal_mobile,
          designation: selected.designation,
          department: selected.department,
          reporting_to: reporting_manager,
          reporting_to_id: reporting_manager_id,
          joining_date: selected.joining_date || selected.expected_join_date || empRecord.joining_date,
          work_location: selected.joining_location || selected.work_location || empRecord.work_location,
          marital_status: selected.marital_status || empRecord.marital_status,
          blood_group: selected.blood_group || empRecord.blood_group,
          gender: selected.gender || empRecord.gender,
          dob: selected.dob || empRecord.dob,
          nationality: selected.nationality || empRecord.nationality,
          probation_period_days: selected.probation_period_days || empRecord.probation_period_days,
          aadhaar_number: selected.aadhaar_number || empRecord.aadhaar_number,
          pan_number: selected.pan_number || empRecord.pan_card || empRecord.pan_number,
          pincode: selected.pincode || empRecord.pincode,
          alternate_mobile: selected.alternate_mobile || empRecord.alternate_mobile,
          uan_number: selected.uan_number || empRecord.uan_number,
          esi_number: selected.esi_number || empRecord.esi_number,
          pf_number: selected.pf_number || empRecord.pf_number,
          
          // Document Sync (Permanent Repository)
          aadhaar_file_url: selected.aadhaar_file_url || empRecord.aadhaar_file_url,
          pan_file_url: selected.pan_file_url || empRecord.pan_file_url,
          education_certificate_url: selected.education_certificate_url || empRecord.education_certificate_url,
          resume_url: selected.resume_url || empRecord.resume_url,
          offer_letter_signed_url: selected.offer_letter_signed_url || empRecord.offer_letter_signed_url,
          bank_proof_url: selected.bank_proof_url || empRecord.bank_proof_url,

          // Preboarding Enrichment (Financials & Address)
          ...(preboardingData ? {
            bank_name: preboardingData.bank_name || empRecord.bank_name,
            bank_account_number: preboardingData.bank_account_number || empRecord.account_number || empRecord.bank_account_number,
            bank_ifsc_code: preboardingData.bank_ifsc_code || empRecord.ifsc_code || empRecord.bank_ifsc_code,
            uan_number: preboardingData.uan_number || selected.uan_number || empRecord.uan_number,
            esi_number: preboardingData.esi_number || selected.esi_number || empRecord.esi_number,
            pf_number: preboardingData.pf_number || selected.pf_number || empRecord.pf_number,
            address: preboardingData.current_address || empRecord.address,
            permanent_address: preboardingData.permanent_address || empRecord.permanent_address,
            current_address: preboardingData.current_address || empRecord.current_address,
            city: preboardingData.city || empRecord.city,
            state: preboardingData.state || empRecord.state,
            pincode: preboardingData.pincode || empRecord.pincode,
            country: preboardingData.country || empRecord.country,
            emergency_contact_name: preboardingData.emergency_contact_name || empRecord.emergency_contact_name,
            emergency_contact_phone: preboardingData.emergency_contact_phone || empRecord.emergency_contact_phone
          } : {})
        };
        await updateEmployee(empRecord.employee_id || empRecord.id, updates);
      }

      // 4. Notify IT if hardware is requested and not yet fully assigned
      if (selected.hardware_allocation_required && !selected.laptop_serial_number) {
        await notifyDepartment('IT', `📦 URGENT: Hardware verification needed for ${getEmpName(selected)}`);
      }

      await loadData();
      alert("Verification and updates saved successfully across all records!");
    } catch (error) {
      console.error("Error saving onboarding updates:", error);
      alert("Error saving updates");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (request_id: number) => {
    try {
      await api.post(`hr/onboarding/${request_id}/approve`);
      await loadData();
      if (selected?.request_id === request_id) {
        setSelected((prev: any) => ({ ...prev, status: 'approved' }));
      }
      alert('✅ Onboarding request approved! Employee is now Active.');
    } catch (err: any) {
      alert(`❌ Approval failed: ${err?.response?.data?.detail || err?.message}`);
    }
  };

  const handleStatusChange = async (request_id: number, status: string) => {
    try {
      if (status === 'completed') {
        // Feature: Call dedicated complete endpoint to activate employee & user
        await api.post(`hr/onboarding/${request_id}/complete`);
        alert('✅ Onboarding completed! Employee is now fully Active.');
      } else if (status === 'approved') {
        // Feature: Call dedicated approve endpoint to provision identity (User & Employee)
        await api.post(`hr/onboarding/${request_id}/approve`);
        alert('✅ Onboarding request approved! Identity provisioned.');
      } else {
        if (selected?.request_id === request_id) {
          // If we are currently editing this one, perform a FULL SAVE with the new status
          const updatedSelected = { ...selected, status, updated_at: new Date().toISOString() };
          setSelected(updatedSelected);
          
          // Call the existing comprehensive handleUpdate logic
          await updateOnboardingRequest(request_id, updatedSelected);
          if (preboardingData && !preboardingData.isMock) {
            await updatePreboarding(preboardingData.preboard_id, preboardingData);
          }
          
          // Sync to Employee Master (Logic from handleUpdate)
          let empRecord = null;
          if (selected.employee_id) {
            try {
              const res = await api.get(`employee/${selected.employee_id}`);
              empRecord = res.data;
            } catch (e) {
              console.warn("[ONBOARDING] Employee lookup during status change failed, using cache:", e);
              empRecord = employees.find(e => e.id === selected.employee_id || e.employee_id === selected.employee_id);
            }
          }

          if (empRecord) {
            const { reporting_manager, reporting_manager_id } = selected;
            const updates = {
              ...empRecord,
              first_name: selected.first_name,
              last_name: selected.last_name,
              name: `${selected.first_name} ${selected.last_name}`.trim(),
              official_email: selected.official_email || selected.official_email_id || selected.email || empRecord.official_email,
              personal_email: selected.personal_email || empRecord.personal_email,
              personal_mobile: selected.personal_mobile || empRecord.phone || empRecord.personal_mobile,
              designation: selected.designation,
              department: selected.department,
              reporting_to: reporting_manager,
              reporting_to_id: reporting_manager_id,
              joining_date: selected.joining_date || selected.expected_join_date || empRecord.joining_date,
              work_location: selected.joining_location || selected.work_location || empRecord.work_location,
              marital_status: selected.marital_status || empRecord.marital_status,
              blood_group: selected.blood_group || empRecord.blood_group,
              gender: selected.gender || empRecord.gender,
              dob: selected.dob || empRecord.dob,
              nationality: selected.nationality || empRecord.nationality,
              probation_period_days: selected.probation_period_days || empRecord.probation_period_days,
              aadhaar_number: selected.aadhaar_number || empRecord.aadhaar_number,
              pan_number: selected.pan_number || empRecord.pan_card || empRecord.pan_number,
              status: status === 'approved' ? 'Onboarding' : empRecord.status, // Sync status if approving
              ...(preboardingData ? {
                bank_name: preboardingData.bank_name || empRecord.bank_name,
                bank_account_number: preboardingData.bank_account_number || empRecord.account_number || empRecord.bank_account_number,
                bank_ifsc_code: preboardingData.bank_ifsc_code || empRecord.ifsc_code || empRecord.bank_ifsc_code,
                uan_number: preboardingData.uan_number || selected.uan_number || empRecord.uan_number,
                esi_number: preboardingData.esi_number || selected.esi_number || empRecord.esi_number,
                pf_number: preboardingData.pf_number || selected.pf_number || empRecord.pf_number,
                address: preboardingData.current_address || empRecord.address,
                permanent_address: preboardingData.permanent_address || empRecord.permanent_address,
                current_address: preboardingData.current_address || empRecord.current_address,
                city: preboardingData.city || empRecord.city,
                state: preboardingData.state || empRecord.state,
                pincode: preboardingData.pincode || empRecord.pincode,
                country: preboardingData.country || empRecord.country,
                emergency_contact_name: preboardingData.emergency_contact_name || empRecord.emergency_contact_name,
                emergency_contact_phone: preboardingData.emergency_contact_phone || empRecord.emergency_contact_phone
              } : {})
            };
            await updateEmployee(empRecord.employee_id || empRecord.id, updates);
          }
        } else {
          // Just a quick status update from the sidebar list
          await updateOnboardingRequest(request_id, { status, updated_at: new Date().toISOString() });
        }
      }
      await loadData();
    } catch (err: any) {
      alert(`Error updating status: ${err?.response?.data?.detail || err?.message}`);
    }
  };

  const handleOrientationToggle = async (request_id: number, value: boolean) => {
    await updateOnboardingRequest(request_id, {
      orientation_scheduled: value,
      updated_at: new Date().toISOString(),
    });
    await loadData();

    if (selected?.request_id === request_id) {
      setSelected({ ...selected, orientation_scheduled: value });
    }
  };

  const pendingRequests = requests.filter((r: any) => {
    const isCompleted = r.status === "completed";
    if (isCompleted) return false;
    
    const name = getEmpName(r).toLowerCase();
    const id = (r.employee_id || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || id.includes(query);
  });
  const completedRequests = requests.filter((r: any) => r.status === "completed");

  const handleExport = () => {
    const exportData = requests.map((r: any) => ({
      'Request ID': r.request_id,
      'Employee Name': getEmpName(r),
      'Employee ID': r.employee_id,
      'Email': getEmpEmail(r),
      'Designation': employees.find(e => e.id === r.employee_id)?.designation || 'N/A',
      'Location': r.joining_location || 'N/A',
      'Status': (r.status || 'pending').toUpperCase(),
      'Offer Date': r.offer_date,
      'Join Date': r.expected_join_date,
      'Probation Days': r.probation_period_days,
      'Orientation': r.orientation_scheduled ? 'YES' : 'NO'
    }));
    downloadCSV(exportData, `HR_Onboarding_Pipeline_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="dashboard-container">
      <Header role="HR" title="HR Onboarding Pipeline" />

      <div style={{ marginTop: "35px", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "40px", fontWeight: "700" }}>Employee Onboarding Requests</h1>
        <div className="subtitle">
          Manage offer letters, required documents, probation setup, and orientation scheduling
        </div>
      </div>

      <div
        className="grid-3"
        style={{
          gridTemplateColumns: selected ? "1fr 1.5fr" : "2.2fr 0.8fr",
          gap: "24px",
        }}
      >
        {/* LEFT LIST */}
        <GlassCard title="HR Onboarding Requests" subtitle="hr_onboarding_requests table">
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input 
                placeholder="Search name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  padding: '6px 12px 6px 28px',
                  fontSize: '11px',
                  color: 'white',
                  outline: 'none',
                  width: '160px'
                }}
              />
              <FaClock style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--text-tertiary)' }} />
            </div>
            <button 
              onClick={loadData}
              className={`apple-btn ${isRefreshing ? 'spinning' : ''}`}
              style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-light)', borderRadius: '10px' }}
              title="Force Refresh"
            >
              <FaClock style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button
              onClick={handleExport}
              className="apple-btn"
              style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Download results as CSV"
            >
              <FaDownload size={12} /> Export CSV
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
            {pendingRequests.length === 0 && (
              <p style={{ color: "var(--text-tertiary)" }}>No pending onboarding requests.</p>
            )}

            {pendingRequests.map((req: any) => (
              <div
                key={req.request_id}
                style={{
                  ...rowStyle,
                  border:
                    selected?.request_id === req.request_id
                      ? "1px solid var(--accent-blue)"
                      : "1px solid var(--border-light)",
                  cursor: "pointer",
                }}
                onClick={() => setSelected(req)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                    {getEmpName(req)}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    {getEmpEmail(req)}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)", fontFamily: "monospace", marginTop: '2px' }}>
                    {req.designation || ""} {req.department ? `| ${req.department}` : ""}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                    EMP: {req.employee_id}
                  </div>
                </div>

                <div style={{ flex: 1.5 }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Offer Date: {req.offer_date || "TBD"} | Join: {req.joining_date || req.expected_join_date || "TBD"}
                  </div>

                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                    Probation: {req.probation_period_days || 90} Days | Orientation:{" "}
                    {req.orientation_scheduled ? "YES" : "NO"}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "bold",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background:
                      req.status === "pending"
                        ? "rgba(255,159,10,0.1)"
                        : req.status === "approved"
                          ? "rgba(48,209,88,0.1)"
                          : req.status === "in_progress"
                            ? "rgba(10,132,255,0.1)"
                            : "rgba(48,209,88,0.15)",
                    color:
                      req.status === "pending"
                        ? "#ff9f0a"
                        : req.status === "approved"
                          ? "#30d158"
                          : req.status === "in_progress"
                            ? "#0a84ff"
                            : "#30d158",
                  }}
                >
                  {(req.status || "pending").toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* RIGHT DETAILS */}
        {selected ? (
          <GlassCard title="Full Onboarding & Preboarding Details" subtitle={`Syncing Request ID: ${selected.request_id}`}>
            <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '10px' }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "15px" }}>
                {/* HEADER */}
                <div
                  style={{
                    gridColumn: "span 2",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                      {selected.name || selected.employee_id}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                      <span style={{ fontSize: '9px', color: '#0a84ff', fontWeight: 'bold' }}>SET PORTAL LOGIN EMAIL</span>
                      <input
                        className="apple-input"
                        value={selected.official_email || selected.official_email_id || selected.email || ''}
                        onChange={(e) => setSelected({ ...selected, official_email: e.target.value, official_email_id: e.target.value, email: e.target.value })}
                        placeholder="official@company.com"
                        style={{ background: 'rgba(10,132,255,0.05)', border: '1px solid rgba(10,132,255,0.1)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', outline: 'none' }}
                      />
                      <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        🔑 Default password: <strong>{DEFAULT_PASSWORD}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {selected.status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(selected.request_id)}
                        className="apple-btn"
                        style={{ background: '#30d158', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <FaCheckCircle /> Approve Employee
                      </button>
                    )}
                    <button
                      onClick={handleUpdate}
                      className="apple-btn"
                      disabled={isSaving}
                      style={{ background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <FaSave /> {isSaving ? 'Saving...' : 'Save & Verify'}
                    </button>
                    <button
                      onClick={() => setSelected(null)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-tertiary)",
                        cursor: "pointer",
                        fontSize: "16px",
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}><h3 style={{ fontSize: '13px', color: 'var(--accent-blue)', borderBottom: '1px solid var(--border-light)', paddingBottom: '3px' }}>1. IDENTITY & BIO</h3></div>
                <InputGroup label="First Name" value={selected.first_name} onChange={(v: any) => setSelected({ ...selected, first_name: v })} />
                <InputGroup label="Last Name" value={selected.last_name} onChange={(v: any) => setSelected({ ...selected, last_name: v })} />
                <InputGroup label="DOB" type="date" value={selected.dob} onChange={(v: any) => setSelected({ ...selected, dob: v })} />
                <SelectGroup label="Gender" value={selected.gender} options={['Male', 'Female', 'Other']} onChange={(v: any) => setSelected({ ...selected, gender: v })} />
                <SelectGroup label="Marital Status" value={selected.marital_status} options={['Single', 'Married', 'Divorced', 'Widowed']} onChange={(v: any) => setSelected({ ...selected, marital_status: v })} />
                <SelectGroup label="Blood Group" value={selected.blood_group} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} onChange={(v: any) => setSelected({ ...selected, blood_group: v })} />
                <InputGroup label="Personal Email" value={selected.personal_email} onChange={(v: any) => setSelected({ ...selected, personal_email: v })} />
                <InputGroup label="Personal Mobile" value={selected.personal_mobile} onChange={(v: any) => setSelected({ ...selected, personal_mobile: v })} />
                <InputGroup label="Alternate Mobile" value={selected.alternate_mobile} onChange={(v: any) => setSelected({ ...selected, alternate_mobile: v })} />
                <InputGroup label="Nationality" value={selected.nationality} onChange={(v: any) => setSelected({ ...selected, nationality: v })} />
                <InputGroup label="Pincode" value={selected.pincode} onChange={(v: any) => setSelected({ ...selected, pincode: v })} />

                <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '13px', color: 'var(--accent-blue)', borderBottom: '1px solid var(--border-light)', paddingBottom: '3px' }}>2. EMPLOYMENT DETAILS</h3></div>
                <InputGroup label="Designation" value={selected.designation} onChange={(v: any) => setSelected({ ...selected, designation: v })} />
                <InputGroup label="Department" value={selected.department} onChange={(v: any) => setSelected({ ...selected, department: v })} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>REPORTING MANAGER</label>
                  <select
                    className="apple-input"
                    value={selected.reporting_manager_id || ''}
                    onChange={(e) => {
                      const mgr = employees.find(emp => emp.employee_id === e.target.value || String(emp.id) === e.target.value);
                      setSelected({ ...selected, reporting_manager_id: e.target.value, reporting_manager: mgr?.name || '' });
                    }}
                    style={{ padding: '8px 12px', fontSize: '13px', height: '38px', appearance: 'none' }}
                  >
                    <option value="">-- Select Reporting Manager --</option>
                    {employees.filter(e => ['hr', 'recruiter', 'teamleader', 'admin', 'it'].includes((e.role || '').toLowerCase()) || e.id === 'MGR-001').map(mgr => (
                      <option key={mgr.id} value={mgr.employee_id}>{mgr.name} — {mgr.role} ({mgr.department})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>TEAM LEADER</label>
                  <select
                    className="apple-input"
                    value={selected.team_leader_id || ''}
                    onChange={(e) => {
                      const tl = employees.find(emp => emp.employee_id === e.target.value || String(emp.id) === e.target.value);
                      const updates: any = { team_leader_id: e.target.value };

                      // Fallback logic for Normal Employees reporting directly to TL
                      if (!selected.reporting_manager_id) {
                        updates.reporting_manager = tl?.name || '';
                        updates.reporting_to = tl?.name || '';
                      }

                      setSelected({ ...selected, ...updates });
                    }}
                    style={{ padding: '8px 12px', fontSize: '13px', height: '38px', appearance: 'none' }}
                  >
                    <option value="">-- Select Team Leader --</option>
                    {employees.filter(e => (e.role || '').toLowerCase().includes('teamleader') || (e.role || '').toLowerCase().includes('lead')).map(tl => (
                      <option key={tl.id} value={tl.employee_id}>{tl.name}</option>
                    ))}
                  </select>
                </div>
                <SelectGroup label="Employment Type" value={selected.employment_type} options={['Full Time', 'Contract', 'Intern', 'Consultant']} onChange={(v: any) => setSelected({ ...selected, employment_type: v })} />
                <InputGroup label="Joining Location" value={selected.joining_location || selected.work_location} onChange={(v: any) => setSelected({ ...selected, joining_location: v, work_location: v })} />
                <InputGroup label="Join Date" type="date" value={selected.joining_date || selected.expected_join_date} onChange={(v: any) => setSelected({ ...selected, joining_date: v, expected_join_date: v })} />
                <InputGroup label="Probation (Days)" value={selected.probation_period_days} onChange={(v: any) => setSelected({ ...selected, probation_period_days: v })} />

                <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '13px', color: 'var(--accent-blue)', borderBottom: '1px solid var(--border-light)', paddingBottom: '3px' }}>3. COMPLIANCE & GOVT</h3></div>
                <InputGroup label="Aadhaar No" value={selected.aadhaar_number} onChange={(v: any) => setSelected({ ...selected, aadhaar_number: v })} />
                <InputGroup label="PAN No" value={selected.pan_number} onChange={(v: any) => setSelected({ ...selected, pan_number: v })} />
                <InputGroup label="UAN No" value={selected.uan_number} onChange={(v: any) => setSelected({ ...selected, uan_number: v })} />
                <InputGroup label="ESI No" value={selected.esi_number} onChange={(v: any) => setSelected({ ...selected, esi_number: v })} />
                <InputGroup label="PF No" value={selected.pf_number} onChange={(v: any) => setSelected({ ...selected, pf_number: v })} />
                <SelectGroup label="BGV Status" value={selected.background_verification_status} options={['pending', 'initiated', 'verified', 'failed']} onChange={(v: any) => setSelected({ ...selected, background_verification_status: v })} />
                <SelectGroup label="Medical Status" value={selected.medical_check_status} options={['pending', 'cleared', 'failed']} onChange={(v: any) => setSelected({ ...selected, medical_check_status: v })} />
                <SelectGroup label="Doc Verification" value={selected.document_verification_status} options={['pending', 'verified', 'rejected']} onChange={(v: any) => setSelected({ ...selected, document_verification_status: v })} />

                <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '13px', color: 'var(--accent-blue)', borderBottom: '1px solid var(--border-light)', paddingBottom: '3px' }}>4. DOCUMENT REPOSITORY & VERIFICATION</h3></div>
                <FileUploadGroup label="Aadhaar Card" value={selected.aadhaar_file_url} onUpload={(v: any) => setSelected({ ...selected, aadhaar_file_url: v })} />
                <FileUploadGroup label="PAN Card" value={selected.pan_file_url} onUpload={(v: any) => setSelected({ ...selected, pan_file_url: v })} />
                <FileUploadGroup label="Education Cert" value={selected.education_certificate_url} onUpload={(v: any) => setSelected({ ...selected, education_certificate_url: v })} />
                <FileUploadGroup label="Signed Offer Letter" value={selected.offer_letter_signed_url} onUpload={(v: any) => setSelected({ ...selected, offer_letter_signed_url: v })} />
                <FileUploadGroup label="Bank Proof" value={selected.bank_proof_url} onUpload={(v: any) => setSelected({ ...selected, bank_proof_url: v })} />
                <FileUploadGroup label="Resume" value={selected.resume_url} onUpload={(v: any) => setSelected({ ...selected, resume_url: v })} />

                <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(255,159,10,0.05)', borderRadius: '12px', border: '1px solid rgba(255,159,10,0.2)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ff9f0a' }}>COMPLIANCE STATUS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <DocCheck label="Docs Verified by HR" checked={selected.documents_verified_by_hr} onChange={(v: any) => setSelected({ ...selected, documents_verified_by_hr: v })} />
                    <DocCheck label="All Uploads Done" checked={selected.documents_uploaded} onChange={(v: any) => setSelected({ ...selected, documents_uploaded: v })} />
                    <DocCheck label="ID Card Issued" checked={selected.step_id_card} onChange={(v: any) => setSelected({ ...selected, step_id_card: v })} />
                    <DocCheck label="Bank Account Opened" checked={selected.step_bank_account} onChange={(v: any) => setSelected({ ...selected, step_bank_account: v })} />
                    <DocCheck label="BGV Verification Done" checked={selected.step_background_check} onChange={(v: any) => setSelected({ ...selected, step_background_check: v })} />
                    <DocCheck label="Joining Kit Handover" checked={selected.step_joining_kit} onChange={(v: any) => setSelected({ ...selected, step_joining_kit: v })} />
                  </div>
                  <input
                    type="text"
                    placeholder="Verification Notes (e.g. Aadhaar blurry, need re-upload)"
                    className="apple-input"
                    value={selected.verification_notes || ''}
                    onChange={(e) => setSelected({ ...selected, verification_notes: e.target.value })}
                    style={{ height: '32px', fontSize: '12px', background: 'rgba(0,0,0,0.1)' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '13px', color: 'var(--accent-blue)', borderBottom: '1px solid var(--border-light)', paddingBottom: '3px' }}>5. HARDWARE ALLOCATION REQUIREMENTS</h3></div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                  <HardwareRequirement
                    label="Laptop"
                    count={selected.hardware_requirements?.laptop || 0}
                    icon={FaLaptop}
                    onUpdate={(v: number) => setSelected({
                      ...selected,
                      hardware_requirements: { ...selected.hardware_requirements, laptop: v }
                    })}
                  />
                  <HardwareRequirement
                    label="Mouse"
                    count={selected.hardware_requirements?.mouse || 0}
                    icon={FaMouse}
                    onUpdate={(v: number) => setSelected({
                      ...selected,
                      hardware_requirements: { ...selected.hardware_requirements, mouse: v }
                    })}
                  />
                  <HardwareRequirement
                    label="Keyboard"
                    count={selected.hardware_requirements?.keyboard || 0}
                    icon={FaKeyboard}
                    onUpdate={(v: number) => setSelected({
                      ...selected,
                      hardware_requirements: { ...selected.hardware_requirements, keyboard: v }
                    })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 2' }}>
                  <input type="checkbox" checked={selected.hardware_allocation_required} onChange={(e) => setSelected({ ...selected, hardware_allocation_required: e.target.checked })} />
                  <span style={{ fontSize: '11px' }}>Hardware Allocation Enabled</span>
                </div>

                {preboardingData && (
                  <>
                    <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '13px', color: 'var(--accent-green)', borderBottom: '1px solid var(--border-light)', paddingBottom: '3px' }}>6. PREBOARDING (SELF-FILLED)</h3></div>
                    <InputGroup label="Bank Acc No" value={preboardingData.bank_account_number} onChange={(v: any) => setPreboardingData({ ...preboardingData, bank_account_number: v })} />
                    <InputGroup label="Bank Name" value={preboardingData.bank_name} onChange={(v: any) => setPreboardingData({ ...preboardingData, bank_name: v })} />
                    <InputGroup label="IFSC Code" value={preboardingData.bank_ifsc_code} onChange={(v: any) => setPreboardingData({ ...preboardingData, bank_ifsc_code: v })} />
                    <InputGroup label="Current Address" value={preboardingData.current_address} onChange={(v: any) => setPreboardingData({ ...preboardingData, current_address: v })} />
                    <InputGroup label="Permanent Address" value={preboardingData.permanent_address} onChange={(v: any) => setPreboardingData({ ...preboardingData, permanent_address: v })} />
                    <InputGroup label="City" value={preboardingData.city} onChange={(v: any) => setPreboardingData({ ...preboardingData, city: v })} />
                    <InputGroup label="State" value={preboardingData.state} onChange={(v: any) => setPreboardingData({ ...preboardingData, state: v })} />
                    <InputGroup label="Pincode" value={preboardingData.pincode} onChange={(v: any) => setPreboardingData({ ...preboardingData, pincode: v })} />
                    <InputGroup label="Country" value={preboardingData.country} onChange={(v: any) => setPreboardingData({ ...preboardingData, country: v })} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', gridColumn: 'span 2' }}>
                      <DocCheck label="NDA Signed" checked={preboardingData.nda_signed} onChange={(v: any) => setPreboardingData({ ...preboardingData, nda_signed: v })} />
                      <DocCheck label="COC Signed" checked={preboardingData.code_of_conduct_signed} onChange={(v: any) => setPreboardingData({ ...preboardingData, code_of_conduct_signed: v })} />
                      <DocCheck label="Policy Ack" checked={preboardingData.policy_acknowledged} onChange={(v: any) => setPreboardingData({ ...preboardingData, policy_acknowledged: v })} />
                    </div>
                  </>
                )}

                <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '13px', color: 'var(--accent-blue)', borderBottom: '1px solid var(--border-light)', paddingBottom: '3px' }}>7. PIPELINE STATUS</h3></div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                  <button
                    className="apple-btn"
                    onClick={() => handleStatusChange(selected.request_id, "approved")}
                    style={{ flex: 1, background: selected.status === "approved" ? "var(--accent-blue)" : "rgba(255,255,255,0.02)", color: selected.status === "approved" ? "white" : "var(--text-tertiary)", border: '1px solid var(--border-light)' }}
                  >
                    Approve
                  </button>
                  <button
                    className="apple-btn"
                    onClick={() => handleStatusChange(selected.request_id, "in_progress")}
                    style={{ flex: 1, background: selected.status === "in_progress" ? "#0a84ff" : "rgba(255,255,255,0.02)", color: selected.status === "in_progress" ? "white" : "var(--text-tertiary)", border: '1px solid var(--border-light)' }}
                  >
                    In Progress
                  </button>
                  <button
                    className="apple-btn"
                    onClick={() => handleStatusChange(selected.request_id, "completed")}
                    style={{ flex: 1, background: selected.status === "completed" ? "#30d158" : "rgba(255,255,255,0.02)", color: selected.status === "completed" ? "white" : "var(--text-tertiary)", border: '1px solid var(--border-light)' }}
                  >
                    Complete
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <GlassCard title="Table Schema" subtitle="hr_onboarding_requests">
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                {[
                  "request_id (PK)",
                  "employee_id (FK)",
                  "status",
                  "hr_id (FK)",
                  "manager_approval_id (FK)",
                  "offer_letter_ref",
                  "offer_date",
                  "expected_join_date",
                  "probation_period_days",
                  "required_documents (JSON)",
                  "orientation_scheduled",
                  "created_at",
                  "updated_at",
                ].map((f) => (
                  <div
                    key={f}
                    style={{
                      fontSize: "11px",
                      padding: "6px 10px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: "6px",
                      border: "1px solid var(--border-light)",
                      color: "var(--text-secondary)",
                      fontFamily: "monospace",
                    }}
                  >
                    {f}
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard title="Quick Stats" subtitle="Onboarding Velocity">
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                <VelocityStat label="Pending" val={requests.filter((r: any) => r.status === "pending").length} color="#ff9f0a" />
                <VelocityStat label="Approved" val={requests.filter((r: any) => r.status === "approved").length} color="#0a84ff" />
                <VelocityStat label="In Progress" val={requests.filter((r: any) => r.status === "in_progress").length} color="#0a84ff" />
                <VelocityStat label="Completed" val={requests.filter((r: any) => r.status === "completed").length} color="#30d158" />
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}

/* UI COMPONENTS */
const FieldDisplay = ({ label, value }: any) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <span
      style={{
        fontSize: "10px",
        color: "var(--text-tertiary)",
        fontWeight: "bold",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
    <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
      {value || "—"}
    </span>
  </div>
);

const InputGroup = ({ label, value, onChange, type = "text" }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
    <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</label>
    <input
      type={type}
      className="apple-input"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{ padding: '8px 12px', fontSize: '13px', height: '38px' }}
    />
  </div>
);

const SelectGroup = ({ label, value, options, onChange }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
    <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</label>
    <select
      className="apple-input"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{ padding: '8px 12px', fontSize: '13px', height: '38px', appearance: 'none' }}
    >
      <option value="">Select...</option>
      {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const FileUploadGroup = ({ label, value, onUpload }: any) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        console.log(`[ONBOARDING] Uploading doc: ${label}...`);
        const res = await uploadFile(file);
        if (res.file_path) {
          onUpload(res.file_path); // Save relative path to DB
        } else {
          // Fallback for safety
          const fakeUrl = URL.createObjectURL(file);
          onUpload(fakeUrl);
        }
      } catch (err) {
        console.error("Upload failed:", err);
        alert("Failed to upload " + label);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</label>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-light)',
        borderRadius: '10px',
        padding: '0 12px',
        height: '38px'
      }}>
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '500' }}>
          <FaUpload size={12} />
          <span>{value ? "Change" : "Upload"}</span>
          <input type="file" style={{ display: 'none' }} onChange={handleFileChange} />
        </label>
        {value && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div style={{ fontSize: '9px', color: 'var(--accent-green)', whiteSpace: 'nowrap' }}>✓ Attached</div>
            <a
              href={getFileUrl(value)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '9px', color: 'var(--accent-blue)', textDecoration: 'none', background: 'rgba(10,132,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}
            >
              VIEW
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

const HardwareRequirement = ({ label, icon: Icon, count, onUpdate }: any) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '8px 12px',
    flex: 1
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon color="var(--accent-blue)" size={14} />
      <span style={{ fontSize: '12px', fontWeight: '500' }}>{label}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button
        onClick={() => onUpdate(Math.max(0, count - 1))}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-light)',
          color: 'white',
          borderRadius: '4px',
          width: '20px',
          height: '20px',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >-</button>
      <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '12px', textAlign: 'center' }}>{count}</span>
      <button
        onClick={() => onUpdate(count + 1)}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-light)',
          color: 'white',
          borderRadius: '4px',
          width: '20px',
          height: '20px',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >+</button>
    </div>
  </div>
);

const DocCheck = ({ label, checked, onChange }: any) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</span>
  </label>
);

const DocBadge = ({ label, status }: any) => {
  const isVerified = status === "verified" || status === "uploaded" || status === "completed";

  return (
    <div
      style={{
        padding: "10px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: "10px",
        border: "1px solid var(--border-light)",
        fontSize: "12px",
      }}
    >
      <div style={{ color: "var(--text-tertiary)", fontSize: "10px", marginBottom: "4px" }}>
        <FaFileAlt style={{ marginRight: "6px" }} />
        {label}
      </div>
      <div style={{ color: isVerified ? "#30d158" : "#ff9f0a", fontWeight: "bold", fontSize: "11px" }}>
        {status ? status.toUpperCase() : "PENDING"}
      </div>
    </div>
  );
};

const rowStyle: any = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "15px",
  background: "rgba(255,255,255,0.02)",
  borderRadius: "14px",
  border: "1px solid var(--border-light)",
};

const VelocityStat = ({ label, val, color }: any) => (
  <div style={{ textAlign: "center", flex: 1 }}>
    <div style={{ fontSize: "22px", fontWeight: "700", color }}>{val}</div>
    <div style={{ fontSize: "10px", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
      {label}
    </div>
  </div>
);
