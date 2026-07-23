import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
  getEmployees, getEmployeesAsync, addEmployee, updateEmployee, deleteEmployee, generateId,
  getOnboardingByEmpId, getPreboardingByEmpId, getOffboardingByEmpId,
  updateOnboardingRequest, updatePreboarding, updateOffboardingRequest,
  addOnboardingRequest, addPreboarding, addOffboardingRequest,
  getNextEmployeeId,
  DEFAULT_PASSWORD, isAdminRole, notifyDepartment,
  uploadFile, getFileUrl, getEmployeesForReference, getEmployeeDocumentsForHR,
  getDepartments
} from "../../utils/storage";
import { downloadCSV } from "../../utils/formatters";
import { FaUserPlus, FaSearch, FaListUl, FaUserTag, FaTimes, FaSave, FaRocket, FaUserClock, FaSignOutAlt, FaFileDownload, FaUpload, FaLaptop, FaMouse, FaKeyboard, FaTrash } from "react-icons/fa";

export default function EmployeeMaster() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState("Engineering");
  const [designation, setDesignation] = useState("Software Engineer");
  const [reportingTo, setReportingTo] = useState("");
  const [teamLeaderId, setTeamLeaderId] = useState("");
  const [joiningLocation, setJoiningLocation] = useState("Bangalore");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("employee");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [customEmpId, setCustomEmpId] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");

  // Departments, Filters and Pagination states
  const [departments, setDepartments] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Lifecycle data states
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [preboardingData, setPreboardingData] = useState<any>(null);
  const [offboardingData, setOffboardingData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getEmployeesAsync();
      setEmployees(Array.isArray(data) ? data : []);
      const refs = await getEmployeesForReference();
      setAllEmployees(Array.isArray(refs) ? refs : []);
      
      try {
        const deptsData = await getDepartments();
        const defaultDepts = ["Engineering", "Human Resources", "IT Operations", "Recruitment", "Marketing", "Sales", "Finance"];
        if (Array.isArray(deptsData) && deptsData.length > 0) {
          const names = deptsData.map((d: any) => typeof d === 'string' ? d : (d.name || d.code));
          setDepartments(names);
        } else {
          setDepartments(defaultDepts);
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
        setDepartments(["Engineering", "Human Resources", "IT Operations", "Recruitment", "Marketing", "Sales", "Finance"]);
      }
    };
    fetchData();

    const handleStorage = () => {
      fetchData();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (selectedEmp) {
      const fetchLifecycle = async () => {
        const oData = await getOnboardingByEmpId(selectedEmp.employee_id);
        const pData = await getPreboardingByEmpId(selectedEmp.employee_id);
        const obData = await getOffboardingByEmpId(selectedEmp.employee_id);
        setOnboardingData(oData);
        setPreboardingData(pData);
        setOffboardingData(obData);
      };
      fetchLifecycle();
    }
  }, [selectedEmp]);

  // Get all Admin/Leadership roles for the Reporting Manager dropdown
  const reportingManagers = allEmployees.filter((e: any) => {
    const roleStr = (e.role || '').toLowerCase().replace(/[\s_]+/g, '');
    const privilegedRoles = ['hr', 'recruiter', 'requiter', 'teamleader', 'tl', 'it', 'itdepartment', 'manager', 'admin'];
    return privilegedRoles.includes(roleStr) || String(e.id) === '1' || String(e.user_id) === '1' || String(e.id).includes('MGR');
  });

  const teamLeaders = allEmployees.filter((e: any) => {
    const roleStr = (e.role || '').toLowerCase().replace(/[\s_]+/g, '');
    const tlRoles = ['teamleader', 'tl', 'requiter', 'recruiter', 'manager', 'admin', 'hr'];
    return tlRoles.includes(roleStr);
  });

  const handleSave = async () => {
    if (!customEmpId.trim()) {
      alert("⚠️ Employee ID Required: Please enter the Employee ID manually.");
      return;
    }

    if (!name || !email) {
      alert("Please fill in name and email.");
      return;
    }

    if (role === 'employee' && !teamLeaderId) {
      alert("⚠️ Selection Required: Normal employees must be assigned to a Team Leader. Please select a Team Leader.");
      return;
    }

    const employeeCode = customEmpId.trim();

    const managerEmp = reportingManagers.find((e: any) =>
      String(e.user_id) === String(reportingTo) ||
      String(e.id) === String(reportingTo) ||
      String(e.employee_id) === String(reportingTo)
    );

    const tlEmp = teamLeaders.find((e: any) =>
      String(e.employee_id) === String(teamLeaderId) ||
      String(e.user_id) === String(teamLeaderId) ||
      String(e.id) === String(teamLeaderId)
    );

    // Create new employee payload
    const newEmp = {
      employee_id: employeeCode,
      name,
      first_name: name.split(' ')[0],
      last_name: name.split(' ').slice(1).join(' '),
      email, // Primary Login Email for User model
      personal_email: email, // Default personal email
      department: dept,
      designation,
      manager_id: managerEmp ? managerEmp.employee_id : (reportingTo || (tlEmp ? tlEmp.employee_id : (teamLeaderId || null))),
      reporting_to_id: managerEmp ? managerEmp.employee_id : (reportingTo || (tlEmp ? tlEmp.employee_id : (teamLeaderId || null))),
      reporting_manager_id: managerEmp ? managerEmp.employee_id : (reportingTo || (tlEmp ? tlEmp.employee_id : (teamLeaderId || null))),
      reporting_to: managerEmp?.name || tlEmp?.name || null,
      reporting_manager: managerEmp?.name || tlEmp?.name || null,
      team_leader_id: tlEmp ? tlEmp.employee_id : (teamLeaderId || null),
      joining_location: joiningLocation,
      employment_type: employmentType,
      status: "Active",
      city,
      state,
      address,
      permanent_address: address,
      role: role,
      username: email.split('@')[0], // Use email prefix as username for default
      password: DEFAULT_PASSWORD,
      join_date: new Date().toISOString().split('T')[0],
      // New Fields
      pan_number: panNumber,
      aadhaar_number: aadhaarNumber,
      bank_name: bankName,
      bank_account_number: bankAccount,
      bank_ifsc_code: bankIfsc,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone
    };

    await addEmployee(newEmp);
    const freshEmployees = await getEmployees();
    setEmployees(freshEmployees);

    setName("");
    setEmail("");
    setCustomEmpId("");
    setReportingTo("");
    setTeamLeaderId("");
    setCity("");
    setState("");
    setAddress("");
    setPanNumber("");
    setAadhaarNumber("");
    setBankName("");
    setBankAccount("");
    setBankIfsc("");
    setEmergencyName("");
    setEmergencyPhone("");
    alert(`✅ Employee Onboarded Successfully!\n\n👤 Name: ${name}\n📧 Username: ${email.split('@')[0]}\n📋 Reports To: ${managerEmp?.name || tlEmp?.name || 'Not Assigned'}\n\nCredentials and portal access details have been securely dispatched to their registered email address.`);
  };

  const handleUpdate = async () => {
    if (!selectedEmp) return;

    // 🔧 FIXED EMPLOYEE UPDATE - Always use employee_id (EMP-XXXX string) + validation
    const targetId = selectedEmp.employee_id || String(selectedEmp.id);
    console.log('[EMPLOYEE MASTER] UPDATE employee:', targetId, 'Full object:', selectedEmp);

    if (!targetId.startsWith('EMP-') && !targetId.match(/^\d+$/)) {
      alert(`❌ Invalid Employee ID: ${targetId}\nMust be EMP-XXXX format or numeric`);
      return;
    }

    if (selectedEmp.role === 'employee' && !selectedEmp.team_leader_id) {
      alert("⚠️ Selection Required: Normal employees must be assigned to a Team Leader. Please select a Team Leader.");
      return;
    }

    // Sync identity across records
    // Resolve reporting authority: Explicit Manager preferred, fallback to Team Leader
    const tlObj = allEmployees.find(e => String(e.user_id || e.id || e.employee_id) === String(selectedEmp.team_leader_id));
    const finalReportingId = selectedEmp.reporting_manager_id || selectedEmp.reporting_to_id || selectedEmp.manager_id || selectedEmp.team_leader_id;
    const finalReportingName = selectedEmp.reporting_to || selectedEmp.reporting_manager || tlObj?.name || '';

    const identitySync = {
      first_name: selectedEmp.first_name,
      last_name: selectedEmp.last_name,
      name: selectedEmp.name || `${selectedEmp.first_name} ${selectedEmp.last_name}`.trim(),
      email: selectedEmp.official_email || selectedEmp.email,
      personal_email: selectedEmp.personal_email,
      personal_mobile: selectedEmp.personal_mobile,
      designation: selectedEmp.designation,
      department: selectedEmp.department,
      reporting_to: finalReportingName,
      reporting_to_id: finalReportingId,
      reporting_manager_id: finalReportingId,
      team_leader_id: selectedEmp.team_leader_id,
      marital_status: selectedEmp.marital_status,
      dob: selectedEmp.dob,
      gender: selectedEmp.gender,
      blood_group: selectedEmp.blood_group,
      nationality: selectedEmp.nationality,
      permanent_address: selectedEmp.permanent_address || selectedEmp.address,
      current_address: selectedEmp.current_address,
      city: selectedEmp.city,
      state: selectedEmp.state,
      pincode: selectedEmp.postal_code || selectedEmp.pincode,
      country: selectedEmp.country
    };

    // 🛡️ MASTER SYNCHRONIZER: Aggregate data from all tabs into a single atomic payload
    const updatedEmp = {
      ...selectedEmp,
      ...identitySync,
      // Map shared fields from Onboarding to Master (if existing)
      ...(onboardingData ? {
        pan_number: onboardingData.pan_number || selectedEmp.pan_number,
        aadhaar_number: onboardingData.aadhaar_number || selectedEmp.aadhaar_number,
        passport_number: onboardingData.passport_number || selectedEmp.passport_number,
        uan_number: onboardingData.uan_number || selectedEmp.uan_number,
        esi_number: onboardingData.esi_number || selectedEmp.esi_number,
        aadhaar_file_url: onboardingData.aadhaar_file_url || selectedEmp.aadhaar_file_url,
        pan_file_url: onboardingData.pan_file_url || selectedEmp.pan_file_url,
        resume_url: onboardingData.resume_url || selectedEmp.resume_url,
        bank_proof_url: onboardingData.bank_proof_url || selectedEmp.bank_proof_url,
        offer_letter_signed_url: onboardingData.offer_letter_signed_url || selectedEmp.offer_letter_signed_url
      } : {}),
      // Map shared fields from Preboarding to Master (if existing)
      ...(preboardingData ? {
        emergency_contact_name: preboardingData.emergency_contact_name || selectedEmp.emergency_contact_name,
        emergency_contact_phone: preboardingData.emergency_contact_phone || selectedEmp.emergency_contact_phone,
        emergency_contact_relation: preboardingData.emergency_contact_relation || selectedEmp.emergency_contact_relation,
        dob: preboardingData.dob || selectedEmp.dob,
        gender: preboardingData.gender || selectedEmp.gender,
        marital_status: preboardingData.marital_status || selectedEmp.marital_status,
        blood_group: preboardingData.blood_group || selectedEmp.blood_group,
        nationality: preboardingData.nationality || selectedEmp.nationality,
        bank_name: preboardingData.bank_name || selectedEmp.bank_name,
        bank_account_number: preboardingData.bank_account_number || selectedEmp.bank_account_number,
        bank_ifsc_code: preboardingData.bank_ifsc_code || selectedEmp.bank_ifsc_code,
        current_address: preboardingData.current_address || selectedEmp.current_address,
        permanent_address: preboardingData.permanent_address || selectedEmp.permanent_address,
        city: preboardingData.city || selectedEmp.city,
        state: preboardingData.state || selectedEmp.state,
        pincode: preboardingData.pincode || selectedEmp.pincode,
        country: preboardingData.country || selectedEmp.country
      } : {}),
      reporting_manager: finalReportingName,
      manager_id: finalReportingId
    };

    try {
      console.log(`[HR] Calling updateEmployee(${targetId}, updatedEmp)`);

      // 1. Update Core Bio (verified employee_id format)
      await updateEmployee(targetId, updatedEmp);

      // 2. Update Onboarding if exists
      if (onboardingData) {
        const rid = onboardingData.request_id || onboardingData.id;
        if (rid) {
          const onboardingSync = {
            ...onboardingData,
            reporting_manager: finalReportingName,
            reporting_manager_id: finalReportingId,
            first_name: updatedEmp.first_name,
            last_name: updatedEmp.last_name,
            name: updatedEmp.name,
            email: updatedEmp.email,
            official_email: updatedEmp.official_email,
            personal_email: updatedEmp.personal_email,
            personal_mobile: updatedEmp.personal_mobile,
            designation: updatedEmp.designation,
            department: updatedEmp.department,
            dob: updatedEmp.dob,
            gender: updatedEmp.gender,
            marital_status: updatedEmp.marital_status,
            blood_group: updatedEmp.blood_group,
            nationality: updatedEmp.nationality,
            pan_number: updatedEmp.pan_number,
            aadhaar_number: updatedEmp.aadhaar_number,
            passport_number: updatedEmp.passport_number,
            uan_number: updatedEmp.uan_number,
            esi_number: updatedEmp.esi_number,
            pincode: updatedEmp.pincode,
            alternate_mobile: updatedEmp.alternate_mobile,
            pf_number: updatedEmp.pf_number,
          };
          await updateOnboardingRequest(rid, onboardingSync);
        }
      }

      // 3. Update Preboarding if exists
      if (preboardingData) {
        const pid = preboardingData.preboard_id || preboardingData.id;
        if (pid) {
          const preboardSync = {
            ...preboardingData,
            permanent_address: updatedEmp.permanent_address,
            current_address: updatedEmp.current_address,
            city: updatedEmp.city,
            state: updatedEmp.state,
            pincode: updatedEmp.pincode,
            country: updatedEmp.country,
            emergency_contact_name: updatedEmp.emergency_contact_name,
            emergency_contact_phone: updatedEmp.emergency_contact_phone,
            emergency_contact_relation: updatedEmp.emergency_contact_relation,
            dob: updatedEmp.dob,
            gender: updatedEmp.gender,
            marital_status: updatedEmp.marital_status,
            blood_group: updatedEmp.blood_group,
            nationality: updatedEmp.nationality,
            bank_name: updatedEmp.bank_name,
            bank_account_number: updatedEmp.bank_account_number,
            bank_ifsc_code: updatedEmp.bank_ifsc_code
          };
          await updatePreboarding(pid, preboardSync);
        }
      }

      // 4. Update Offboarding if exists
      if (offboardingData) {
        const obid = offboardingData.offboard_id || offboardingData.id;
        if (obid) {
          await updateOffboardingRequest(obid, {
            ...offboardingData,
            employeeName: identitySync.name,
            department: identitySync.department
          });
        }
      }

      // 5. Notify IT Department if hardware is requested
      if (onboardingData && onboardingData.hardware_allocation_required) {
        const hReq = onboardingData.hardware_requirements || { laptop: 1, mouse: 1, keyboard: 0 };
        if (hReq.laptop > 0 || hReq.mouse > 0 || hReq.keyboard > 0) {
          await notifyDepartment('IT', 'Asset Allocation Task', `📦 NEW TASK: Equipment needed for ${selectedEmp.name} (${targetId}) - Laptop: ${hReq.laptop}, Mouse: ${hReq.mouse}, Keyboard: ${hReq.keyboard}`);
        }
      }

      const data = await getEmployeesAsync();
      setEmployees(Array.isArray(data) ? data : []);
      const refs = await getEmployeesForReference();
      setAllEmployees(Array.isArray(refs) ? refs : []);

      alert(`✅ Employee "${targetId}" updated successfully!`);
    } catch (err: any) {
      console.error("[EMPLOYEE MASTER] Save failed:", err);
      const errorMsg = err?.response?.data?.detail || err?.message || 'Unknown error';
      alert(`❌ Save failed for ${targetId}:\n${errorMsg}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmp) return;
    if (!window.confirm(`⚠️ CRITICAL ACTION: Are you sure you want to PERMANENTLY delete ${selectedEmp.name} and their portal access? This cannot be undone.`)) return;

    try {
      await deleteEmployee(selectedEmp.employee_id);
      setSelectedEmp(null);
      const data = await getEmployeesAsync();
      setEmployees(Array.isArray(data) ? data : []);
      alert("Employee record purged successfully.");
    } catch (err: any) {
      alert(`Delete failed: ${err?.response?.data?.detail || err?.message}`);
    }
  };

  const initiateOnboarding = async () => {
    if (!selectedEmp) return;
    const reqId = `REQ-ONB-${selectedEmp.employee_id}-${Math.floor(Math.random() * 1000)}`;
    const newReq = {
      request_id: reqId,
      employee_id: selectedEmp.employee_id,
      name: selectedEmp.name,
      first_name: selectedEmp.first_name,
      last_name: selectedEmp.last_name,
      official_email: selectedEmp.official_email || selectedEmp.email,
      personal_email: selectedEmp.personal_email,
      designation: selectedEmp.designation,
      department: selectedEmp.department,
      status: 'pending',
      onboarding_status: 'pending',
      expected_join_date: selectedEmp.joining_date || selectedEmp.join_date || new Date().toISOString().split('T')[0],
      probation_period_days: 90,
      hardware_req: { laptop: 1, mouse: 1, keyboard: 0 },
      hardware_requirements: { laptop: 1, mouse: 1, keyboard: 0 },
      access_level: 'Employee',
      role_name: selectedEmp.designation || 'Employee',
      reporting_manager_id: selectedEmp.reporting_to_id || selectedEmp.manager_id || selectedEmp.reporting_manager_id,
      team_leader_id: selectedEmp.team_leader_id,

      // Full Identity Pull
      gender: selectedEmp.gender,
      dob: selectedEmp.dob || selectedEmp.date_of_birth,
      personal_mobile: selectedEmp.phone || selectedEmp.personal_mobile,
      blood_group: selectedEmp.blood_group,
      marital_status: selectedEmp.marital_status,
      nationality: selectedEmp.nationality,
      joining_location: selectedEmp.work_location || selectedEmp.joining_location,
      city: selectedEmp.city,
      state: selectedEmp.state,
      country: selectedEmp.country,
      aadhaar_number: selectedEmp.aadhaar_number,
      pan_number: selectedEmp.pan_number,
      aadhaar_file_url: selectedEmp.aadhaar_file_url,
      pan_file_url: selectedEmp.pan_file_url,
      resume_url: selectedEmp.resume_url,
      bank_proof_url: selectedEmp.bank_proof_url
    };
    try {
      const res = await addOnboardingRequest(newReq);
      setOnboardingData(res || newReq);
      alert("Onboarding initiated for " + selectedEmp.name);
    } catch (err: any) {
      alert("Failed to initiate onboarding: " + (err.response?.data?.detail || err.message));
    }
  };

  const initiatePreboarding = async () => {
    if (!selectedEmp) return;
    const pbId = `PRE-${selectedEmp.employee_id}-${Math.floor(Math.random() * 1000)}`;
    const newPb = {
      preboard_id: pbId,
      employee_id: selectedEmp.employee_id,
      employee_name: selectedEmp.name,
      personal_email: selectedEmp.personal_email,
      official_email: selectedEmp.official_email || selectedEmp.email,
      phone: selectedEmp.phone || selectedEmp.personal_mobile,

      // Full Identity Sync
      gender: selectedEmp.gender,
      dob: selectedEmp.dob || selectedEmp.date_of_birth,
      designation: selectedEmp.designation,
      department: selectedEmp.department,
      blood_group: selectedEmp.blood_group,
      marital_status: selectedEmp.marital_status,
      nationality: selectedEmp.nationality,
      city: selectedEmp.city,
      state: selectedEmp.state,
      country: selectedEmp.country,

      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relation: '',
      pan_number: selectedEmp.pan_number || '',
      bank_account_number: selectedEmp.bank_account_number || '',
      bank_name: selectedEmp.bank_name || '',
      bank_ifsc_code: selectedEmp.bank_ifsc_code || '',
      policy_acknowledged: false,
      nda_signed: false,
      documents_verified_by_hr: false,
      documents_uploaded: !!selectedEmp.aadhaar_file_url,
      self_onboarding_status: 'pending'
    };
    try {
      const res = await addPreboarding(newPb);
      setPreboardingData(res || newPb);
      alert("Full Preboarding compliance initiated for " + selectedEmp.name);
    } catch (err: any) {
      alert("Failed to initiate preboarding: " + (err.response?.data?.detail || err.message));
    }
  };

  const initiateOffboarding = async () => {
    if (!selectedEmp) return;
    const obId = `OFF-${selectedEmp.employee_id}-${Math.floor(Math.random() * 1000)}`;
    const newOb = {
      offboard_id: obId,
      employee_id: selectedEmp.employee_id,
      employeeName: selectedEmp.name,
      department: selectedEmp.department,
      exit_date: null,
      reason: 'resignation',
      notice_period_days: 30,
      notice_remaining_days: 30,
      completed: false,
      status: 'Pending'
    };
    try {
      const res = await addOffboardingRequest(newOb);
      setOffboardingData(res || newOb);

      // Auto-update status to "Offboarding"
      await updateEmployee(selectedEmp.employee_id, { ...selectedEmp, status: 'Offboarding' });
      const fresh = await getEmployees();
      setEmployees(fresh);

      alert("Offboarding initiated and status updated to 'Offboarding' for " + selectedEmp.name);
    } catch (err: any) {
      alert("Failed to initiate offboarding: " + (err.response?.data?.detail || err.message));
    }
  };

  const filteredDirectory = employees.filter(emp => {
    // 1. Search text filter
    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = !searchLow || (
      (emp.name || '').toLowerCase().includes(searchLow) ||
      String(emp.employee_id || emp.id || '').toLowerCase().includes(searchLow) ||
      (emp.email || '').toLowerCase().includes(searchLow) ||
      (emp.official_email || '').toLowerCase().includes(searchLow) ||
      (emp.designation || '').toLowerCase().includes(searchLow) ||
      (emp.department || '').toLowerCase().includes(searchLow) ||
      (emp.role || '').toLowerCase().includes(searchLow)
    );

    // 2. Status filter
    const matchesStatus = !statusFilter || 
      emp.status === statusFilter || 
      (statusFilter === "Resigned" && emp.status === "Inactive") ||
      (statusFilter === "Offboarding" && emp.status === "On Notice");

    // 3. Department filter
    const matchesDept = !deptFilter || emp.department === deptFilter;

    // 4. Join date range filter
    const empJoinDate = emp.joining_date || emp.join_date;
    let matchesDate = true;
    if (startDateFilter && empJoinDate) {
      matchesDate = matchesDate && (empJoinDate >= startDateFilter);
    }
    if (endDateFilter && empJoinDate) {
      matchesDate = matchesDate && (empJoinDate <= endDateFilter);
    }

    return matchesSearch && matchesStatus && matchesDept && matchesDate;
  });

  // Pagination slicing
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredDirectory.length / itemsPerPage);
  const paginatedDirectory = filteredDirectory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportDirectory = () => {
    const exportData = filteredDirectory.map((emp: any) => ({
      'Employee ID': emp.id,
      'Name': emp.name,
      'Email': emp.email,
      'Department': emp.department,
      'Designation': emp.designation,
      'Location': emp.joining_location,
      'Employment Type': emp.employment_type,
      'Status': emp.status,
      'Reporting To': emp.reporting_to || 'N/A',
      'Join Date': emp.join_date || emp.joining_date || 'N/A'
    }));
    downloadCSV(exportData, `Employee_Directory_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="dashboard-container">
      <Header role="HR" title="Employee Directory" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Employee Master</h1>
        <p className="subtitle">Lifecycle management and database records</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedEmp ? "1fr 1fr" : "1fr 2fr", gap: "24px" }}>
        {/* Registration Form / Details */}
        {!selectedEmp ? (
          <GlassCard title="Register Talent" subtitle="Add new hire to the system">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 'bold' }}>EMPLOYEE ID (ENTER MANUALLY) *</label>
                <input placeholder="e.g. EMP-001 or 1001" className="apple-input" value={customEmpId} onChange={(e) => setCustomEmpId(e.target.value)} />
              </div>
              <div style={{ position: "relative" }}>
                <FaUserPlus style={{ position: "absolute", right: "15px", top: "15px", color: "var(--text-tertiary)" }} />
                <input placeholder="Full Name" className="apple-input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>PORTAL LOGIN / COMPANY EMAIL</label>
                <input placeholder="e.g. employee@company.com" className="apple-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '-5px', marginLeft: '5px' }}>
                  📧 Credentials will be generated and delivered secure-only via email.
                </div>
              </div>
              <input placeholder="Designation" className="apple-input" value={designation} onChange={(e) => setDesignation(e.target.value)} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>LOCATION</label>
                  <input placeholder="Location" className="apple-input" value={joiningLocation} onChange={(e) => setJoiningLocation(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>EMPLOYMENT TYPE</label>
                  <select className="apple-input" value={employmentType || ''} onChange={(e) => setEmploymentType(e.target.value)} style={{ appearance: "none" }}>
                    <option value="Full-time">Full-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>DEPARTMENT</label>
                <select className="apple-input" value={dept || ''} onChange={(e) => setDept(e.target.value)} style={{ appearance: "none" }}>
                  {departments.map((d: string) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>REPORTING MANAGER (OPTIONAL)</label>
                <select className="apple-input" value={reportingTo || ''} onChange={(e) => setReportingTo(e.target.value)} style={{ appearance: "none" }}>
                  <option value="">-- Select Reporting Manager --</option>
                  {reportingManagers.length > 0 ? (
                    reportingManagers.map(mgr => (
                      <option key={mgr.id} value={mgr.user_id || mgr.id}>{mgr.name} — {mgr.role} ({mgr.department})</option>
                    ))
                  ) : (
                    <option disabled>No managers available</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>PORTAL ACCESS ROLE</label>
                <select className="apple-input" value={role} onChange={(e) => setRole(e.target.value)} style={{ appearance: "none" }}>
                  <option value="employee">Normal Employee</option>
                  <option value="teamleader">Team Leader</option>
                  <option value="manager">Manager</option>
                  <option value="hr">HR Personnel</option>
                  <option value="requiter">Recruiter</option>
                  <option value="itdepartment">IT Department</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>TEAM LEADER (DIRECT ROSTER)</label>
                <select className="apple-input" value={teamLeaderId || ''} onChange={(e) => setTeamLeaderId(e.target.value)} style={{ appearance: "none" }}>
                  <option value="">-- Select Team Leader --</option>
                  {teamLeaders.map(tl => (
                    <option key={tl.id} value={tl.employee_id}>{tl.name} ({tl.department})</option>
                  ))}
                </select>
              </div>

              <button className="apple-btn" onClick={handleSave} style={{ marginTop: "10px" }}>Save Record</button>
            </div>
          </GlassCard>
        ) : (
          <GlassCard title="Employee Intelligence" subtitle={`Managing ${selectedEmp.name}`}>
            <button
              onClick={() => setSelectedEmp(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
            >
              <FaTimes />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)', marginTop: '10px' }}>
              {/* Profile Photo Display */}
              <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', background: 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--accent-blue)', flexShrink: 0 }}>
                {(selectedEmp.profile_photo_url || selectedEmp.photo) ? (
                  <img
                    src={getFileUrl(selectedEmp.profile_photo_url || selectedEmp.photo)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    color: 'white',
                    background: `hsl(${(selectedEmp.name || '').charCodeAt(0) * 15 % 360}, 65%, 45%)`
                  }}>
                    {(selectedEmp.name || 'E').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              {/* Photo Uploader */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedEmp.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{selectedEmp.employee_id || selectedEmp.id} • {selectedEmp.designation}</div>
                
                <label style={{
                  padding: '3px 10px',
                  background: 'rgba(10,132,255,0.1)',
                  color: 'var(--accent-blue)',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: '1px solid rgba(10,132,255,0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  width: 'fit-content',
                  marginTop: '4px'
                }}>
                  <FaUpload size={9} /> Change Profile Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const fileData = await uploadFile(file, 'profile_photo', selectedEmp.employee_id || selectedEmp.id);
                          setSelectedEmp({
                            ...selectedEmp,
                            profile_photo_url: fileData.file_path,
                            photo: fileData.file_path
                          });
                          alert("Profile photo uploaded successfully!");
                        } catch (err) {
                          alert("Failed to upload photo.");
                        }
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <div style={tabContainer}>
              {['general', 'compliance', 'onboarding', 'preboarding', 'offboarding'].map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  style={{ ...tabStyle, borderBottom: activeTab === t ? '2px solid var(--accent-blue)' : 'none', color: activeTab === t ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>

              {activeTab === 'general' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ gridColumn: 'span 2' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Basic Identity (Login Account)</h3></div>
                  <div style={{ gridColumn: 'span 2', padding: '12px', background: 'rgba(10,132,255,0.05)', borderRadius: '12px', border: '1px solid rgba(10,132,255,0.2)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 'bold' }}>PORTAL ACCESS (SET LOGIN EMAIL)</div>
                    <input
                      className="apple-input"
                      value={selectedEmp.official_email || selectedEmp.email || ''}
                      onChange={(e) => setSelectedEmp({ ...selectedEmp, official_email: e.target.value, email: e.target.value })}
                      placeholder="Enter company email for login..."
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--accent-blue)', borderRadius: '0', padding: '5px 0', fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
                    />
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '6px' }}>🔑 Credentials managed securely via email delivery.</div>
                  </div>

                  <InputGroup label="First Name" value={selectedEmp.first_name} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, first_name: v })} />
                  <InputGroup label="Last Name" value={selectedEmp.last_name} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, last_name: v })} />

                  <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Contact Info</h3></div>
                  <InputGroup label="Personal Email" value={selectedEmp.personal_email} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, personal_email: v })} />
                  <InputGroup label="Personal Mobile" value={selectedEmp.personal_mobile} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, personal_mobile: v })} />

                  <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Employment Details</h3></div>
                  <InputGroup label="Designation" value={selectedEmp.designation} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, designation: v })} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>DEPARTMENT</label>
                    <select className="apple-input" value={selectedEmp.department || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, department: e.target.value })} style={{ appearance: "none" }}>
                      {departments.map((d: string) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <InputGroup label="Cost Center" value={selectedEmp.cost_center} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, cost_center: v })} />
                  <InputGroup label="Business Unit" value={selectedEmp.business_unit} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, business_unit: v })} />
                  <InputGroup label="Grade Level" value={selectedEmp.grade_level} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, grade_level: v })} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>EMPLOYMENT TYPE</label>
                    <select className="apple-input" value={selectedEmp.employment_type || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, employment_type: e.target.value })} style={{ appearance: "none" }}>
                      <option value="Full-time">Full-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                      <option value="Consultant">Consultant</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>REPORTING MANAGER (OPTIONAL)</label>
                    <select
                      className="apple-input"
                      value={selectedEmp.reporting_manager_id || selectedEmp.reporting_to_id || ''}
                      onChange={(e) => {
                        const mgr = allEmployees.find(emp => String(emp.user_id || emp.id || emp.employee_id) === String(e.target.value));
                        setSelectedEmp({
                          ...selectedEmp,
                          reporting_to: mgr?.name || '',
                          reporting_manager: mgr?.name || '',
                          reporting_manager_id: e.target.value,
                          reporting_to_id: e.target.value,
                          manager_id: e.target.value
                        });
                      }}
                      style={{ appearance: "none" }}
                    >
                      <option value="">-- Select Manager --</option>
                      {reportingManagers.filter(mgr => mgr.id !== selectedEmp.id).map(mgr => (
                        <option key={mgr.id} value={mgr.employee_id}>{mgr.name} — {mgr.role} ({mgr.department})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>TEAM LEADER</label>
                    <select
                      className="apple-input"
                      value={selectedEmp.team_leader_id || ''}
                      onChange={(e) => {
                        const tl = allEmployees.find(emp => String(emp.user_id || emp.id || emp.employee_id) === String(e.target.value));
                        const updates: any = { team_leader_id: e.target.value };

                        // Fallback: If no manager is assigned, the TL becomes the primary 'Reporting To'
                        if (!selectedEmp.reporting_manager_id && !selectedEmp.reporting_to_id) {
                          updates.reporting_to = tl?.name || '';
                          updates.reporting_manager = tl?.name || '';
                          updates.reporting_manager_id = e.target.value;
                        }

                        setSelectedEmp({ ...selectedEmp, ...updates });
                      }}
                      style={{ appearance: "none" }}
                    >
                      <option value="">-- Select TL --</option>
                      {teamLeaders.map(tl => (
                        <option key={tl.id} value={tl.user_id || tl.id}>{tl.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Address & Location</h3></div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <InputGroup label="Permanent Address" value={selectedEmp.permanent_address || selectedEmp.address} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, permanent_address: v, address: v })} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <InputGroup label="Current Address" value={selectedEmp.current_address} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, current_address: v })} />
                  </div>
                  <InputGroup label="City" value={selectedEmp.city} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, city: v })} />
                  <InputGroup label="State" value={selectedEmp.state} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, state: v })} />
                  <InputGroup label="Postal Code" value={selectedEmp.postal_code || selectedEmp.pincode} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, postal_code: v, pincode: v })} />
                  <InputGroup label="Country" value={selectedEmp.country} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, country: v })} />

                  <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Work Logistics</h3></div>
                  <InputGroup label="Joining Date" type="date" value={selectedEmp.joining_date || selectedEmp.join_date} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, joining_date: v })} />
                  <InputGroup label="Work Location" value={selectedEmp.work_location} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, work_location: v })} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>WORK MODE</label>
                    <select className="apple-input" value={selectedEmp.work_mode || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, work_mode: e.target.value })} style={{ appearance: "none" }}>
                      <option value="onsite">Onsite</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="remote">Remote</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>SHIFT TYPE</label>
                    <select className="apple-input" value={selectedEmp.shift_type || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, shift_type: e.target.value })} style={{ appearance: "none" }}>
                      <option value="general">General</option>
                      <option value="night">Night</option>
                      <option value="rotational">Rotational</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'compliance' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ gridColumn: 'span 2' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Government IDs & Tax Registrations</h3></div>
                  <InputGroup label="PAN Number" value={selectedEmp.pan_number || ''} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, pan_number: v })} />
                  <InputGroup label="Aadhaar Number" value={selectedEmp.aadhaar_number || ''} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, aadhaar_number: v })} />
                  <InputGroup label="Passport Number" value={selectedEmp.passport_number || ''} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, passport_number: v })} />
                  <InputGroup label="UAN Number" value={selectedEmp.uan_number || ''} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, uan_number: v })} />
                  <InputGroup label="ESI Number" value={selectedEmp.esi_number || ''} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, esi_number: v })} />
                  <InputGroup label="PF Number" value={selectedEmp.pf_number || ''} onChange={(v: any) => setSelectedEmp({ ...selectedEmp, pf_number: v })} />

                  <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Compliance Status Flags</h3></div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" checked={!!selectedEmp.pf_registered} onChange={(e) => setSelectedEmp({ ...selectedEmp, pf_registered: e.target.checked })} />
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>PF Registered</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" checked={!!selectedEmp.esi_registered} onChange={(e) => setSelectedEmp({ ...selectedEmp, esi_registered: e.target.checked })} />
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>ESI Registered</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" checked={!!selectedEmp.insurance_enrolled} onChange={(e) => setSelectedEmp({ ...selectedEmp, insurance_enrolled: e.target.checked })} />
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>Group Insurance Enrolled</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" checked={!!selectedEmp.payroll_id_created} onChange={(e) => setSelectedEmp({ ...selectedEmp, payroll_id_created: e.target.checked })} />
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>Payroll Account Provisioned</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', gridColumn: 'span 2' }}>
                    <input type="checkbox" checked={!!selectedEmp.identity_verified} onChange={(e) => setSelectedEmp({ ...selectedEmp, identity_verified: e.target.checked })} />
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>Identity Verification Completed</span>
                  </div>
                </div>
              )}

              {activeTab === 'onboarding' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {!onboardingData ? (
                    <div style={{ gridColumn: 'span 2', padding: '20px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>No onboarding record found for this employee.</p>
                      <button className="apple-btn" onClick={initiateOnboarding} style={{ background: 'var(--accent-green)' }}>
                        <FaRocket /> Initiate Full Lifecycle Onboarding
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ gridColumn: 'span 2' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Compliance & Identity</h3></div>
                      <InputGroup label="PAN Number" value={onboardingData.pan_number} onChange={(v: any) => setOnboardingData({ ...onboardingData, pan_number: v })} />
                      <InputGroup label="Aadhaar (Enc)" value={onboardingData.aadhaar_number} onChange={(v: any) => setOnboardingData({ ...onboardingData, aadhaar_number: v })} />
                      <InputGroup label="Passport No" value={onboardingData.passport_number} onChange={(v: any) => setOnboardingData({ ...onboardingData, passport_number: v })} />
                      <InputGroup label="UAN Number" value={onboardingData.uan_number} onChange={(v: any) => setOnboardingData({ ...onboardingData, uan_number: v })} />
                      <InputGroup label="ESI Number" value={onboardingData.esi_number} onChange={(v: any) => setOnboardingData({ ...onboardingData, esi_number: v })} />

                      <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Verification Status</h3></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>BGC STATUS</label>
                        <select className="apple-input" value={onboardingData.background_verification_status || ''} onChange={(e) => setOnboardingData({ ...onboardingData, background_verification_status: e.target.value })} style={{ appearance: "none" }}>
                          <option value="pending">Pending</option>
                          <option value="initiated">Initiated</option>
                          <option value="verified">Verified</option>
                          <option value="failed">Failed</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>MEDICAL CHECK</label>
                        <select className="apple-input" value={onboardingData.medical_check_status || ''} onChange={(e) => setOnboardingData({ ...onboardingData, medical_check_status: e.target.value })} style={{ appearance: "none" }}>
                          <option value="pending">Pending</option>
                          <option value="cleared">Cleared</option>
                          <option value="failed">Failed</option>
                        </select>
                      </div>

                      <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Document Repositories (Uploads)</h3></div>
                      <FileUploadGroup label="Aadhaar Card" value={onboardingData.aadhaar_file_url} module="onboarding" referenceId={onboardingData.request_id} onUpload={(url: any) => setOnboardingData({ ...onboardingData, aadhaar_file_url: url })} />
                      <FileUploadGroup label="PAN Card" value={onboardingData.pan_file_url} module="onboarding" referenceId={onboardingData.request_id} onUpload={(url: any) => setOnboardingData({ ...onboardingData, pan_file_url: url })} />
                      <FileUploadGroup label="Education Certificate" value={onboardingData.education_certificate_url} module="onboarding" referenceId={onboardingData.request_id} onUpload={(url: any) => setOnboardingData({ ...onboardingData, education_certificate_url: url })} />
                      <FileUploadGroup label="Relieving Letter" value={onboardingData.previous_company_letter_url} module="onboarding" referenceId={onboardingData.request_id} onUpload={(url: any) => setOnboardingData({ ...onboardingData, previous_company_letter_url: url })} />
                      <FileUploadGroup label="Passport Photo" value={onboardingData.passport_photo_url} module="onboarding" referenceId={onboardingData.request_id} onUpload={(url: any) => setOnboardingData({ ...onboardingData, passport_photo_url: url })} />
                      <FileUploadGroup label="Latest Resume" value={onboardingData.resume_url} module="onboarding" referenceId={onboardingData.request_id} onUpload={(url: any) => setOnboardingData({ ...onboardingData, resume_url: url })} />
                      <FileUploadGroup label="Signed Offer Letter" value={onboardingData.offer_letter_signed_url} module="onboarding" referenceId={onboardingData.request_id} onUpload={(url: any) => setOnboardingData({ ...onboardingData, offer_letter_signed_url: url })} />
                      <FileUploadGroup label="Bank Proof (Passbook/Cheque)" value={onboardingData.bank_proof_url} module="onboarding" referenceId={onboardingData.request_id} onUpload={(url: any) => setOnboardingData({ ...onboardingData, bank_proof_url: url })} />

                      <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                        <h3 style={{ fontSize: '14px', color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>HARDWARE REQUIREMENTS (JSON)</h3>
                      </div>
                      <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px' }}>
                        <HardwareRequirement
                          label="Laptop"
                          icon={FaLaptop}
                          count={onboardingData.hardware_requirements?.laptop || 0}
                          onUpdate={(v: number) => setOnboardingData({
                            ...onboardingData,
                            hardware_requirements: { ...onboardingData.hardware_requirements, laptop: v }
                          })}
                        />
                        <HardwareRequirement
                          label="Mouse"
                          icon={FaMouse}
                          count={onboardingData.hardware_requirements?.mouse || 0}
                          onUpdate={(v: number) => setOnboardingData({
                            ...onboardingData,
                            hardware_requirements: { ...onboardingData.hardware_requirements, mouse: v }
                          })}
                        />
                        <HardwareRequirement
                          label="Keyboard"
                          icon={FaKeyboard}
                          count={onboardingData.hardware_requirements?.keyboard || 0}
                          onUpdate={(v: number) => setOnboardingData({
                            ...onboardingData,
                            hardware_requirements: { ...onboardingData.hardware_requirements, keyboard: v }
                          })}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                        <input type="checkbox" checked={onboardingData.hardware_allocation_required} onChange={(e) => setOnboardingData({ ...onboardingData, hardware_allocation_required: e.target.checked })} />
                        <span style={{ fontSize: '12px' }}>Enable Allocation Workflow</span>
                      </div>


                      <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Onboarding Roadmap</h3></div>
                      <InputGroup label="Orientation Date" type="date" value={onboardingData.orientation_date} onChange={(v: any) => setOnboardingData({ ...onboardingData, orientation_date: v })} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" checked={onboardingData.orientation_completed} onChange={(e) => setOnboardingData({ ...onboardingData, orientation_completed: e.target.checked })} />
                        <span style={{ fontSize: '12px' }}>Orientation Done</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" checked={onboardingData.mandatory_training_completed} onChange={(e) => setOnboardingData({ ...onboardingData, mandatory_training_completed: e.target.checked })} />
                        <span style={{ fontSize: '12px' }}>Mandatory Training</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>FINAL ONBOARDING STATUS</label>
                        <select className="apple-input" value={onboardingData.onboarding_status || ''} onChange={(e) => setOnboardingData({ ...onboardingData, onboarding_status: e.target.value })} style={{ appearance: "none" }}>
                          <option value="pending">Pending</option>
                          <option value="documents_pending">Documents Pending</option>
                          <option value="verification_pending">Verification Pending</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>IT STATUS</label>
                        <div style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          borderRadius: '8px',
                          background: 'rgba(10,132,255,0.05)',
                          color: onboardingData.it_status === 'completed' ? '#30d158' : '#ff9f0a',
                          fontWeight: 'bold'
                        }}>
                          {onboardingData.it_status?.toUpperCase() || 'PENDING'}
                        </div>
                      </div>
                      <InputGroup
                        label="Laptop Serial Number (IT)"
                        value={onboardingData.laptop_serial_number}
                        onChange={(v: any) => setOnboardingData({ ...onboardingData, laptop_serial_number: v })}
                      />
                    </>
                  )}
                </div>
              )}

              {activeTab === 'preboarding' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {!preboardingData ? (
                    <div style={{ gridColumn: 'span 2', padding: '20px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>No preboarding record found for this employee.</p>
                      <button className="apple-btn" onClick={initiatePreboarding} style={{ background: 'var(--accent-blue)' }}>
                        <FaUserClock /> Start Preboarding Compliance
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ gridColumn: 'span 2' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Emergency Contacts</h3></div>
                      <InputGroup label="Contact Name" value={preboardingData.emergency_contact_name} onChange={(v: any) => setPreboardingData({ ...preboardingData, emergency_contact_name: v })} />
                      <InputGroup label="Phone" value={preboardingData.emergency_contact_phone} onChange={(v: any) => setPreboardingData({ ...preboardingData, emergency_contact_phone: v })} />
                      <InputGroup label="Relation" value={preboardingData.emergency_contact_relation} onChange={(v: any) => setPreboardingData({ ...preboardingData, emergency_contact_relation: v })} />

                      <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Bio & Demographics</h3></div>
                      <InputGroup label="DOB (Ref)" type="date" value={preboardingData.dob} onChange={(v: any) => setPreboardingData({ ...preboardingData, dob: v })} />
                      <SelectGroup label="Gender" value={preboardingData.gender} options={['Male', 'Female', 'Other']} onChange={(v: any) => setPreboardingData({ ...preboardingData, gender: v })} />
                      <SelectGroup label="Marital Status" value={preboardingData.marital_status} options={['Single', 'Married', 'Divorced', 'Widowed']} onChange={(v: any) => setPreboardingData({ ...preboardingData, marital_status: v })} />
                      <InputGroup label="Blood Group" value={preboardingData.blood_group} onChange={(v: any) => setPreboardingData({ ...preboardingData, blood_group: v })} />
                      <InputGroup label="Nationality" value={preboardingData.nationality} onChange={(v: any) => setPreboardingData({ ...preboardingData, nationality: v })} />

                      <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Address Details</h3></div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <InputGroup label="Current Address" value={preboardingData.current_address} onChange={(v: any) => setPreboardingData({ ...preboardingData, current_address: v })} />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <InputGroup label="Permanent Address" value={preboardingData.permanent_address} onChange={(v: any) => setPreboardingData({ ...preboardingData, permanent_address: v })} />
                      </div>
                      <InputGroup label="City" value={preboardingData.city} onChange={(v: any) => setPreboardingData({ ...preboardingData, city: v })} />
                      <InputGroup label="State" value={preboardingData.state} onChange={(v: any) => setPreboardingData({ ...preboardingData, state: v })} />
                      <InputGroup label="Pincode" value={preboardingData.pincode} onChange={(v: any) => setPreboardingData({ ...preboardingData, pincode: v })} />
                      <InputGroup label="Country" value={preboardingData.country} onChange={(v: any) => setPreboardingData({ ...preboardingData, country: v })} />

                      <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Bank Information</h3></div>
                      <InputGroup label="Bank Name" value={preboardingData.bank_name} onChange={(v: any) => setPreboardingData({ ...preboardingData, bank_name: v })} />
                      <InputGroup label="Account (Enc)" value={preboardingData.bank_account_number} onChange={(v: any) => setPreboardingData({ ...preboardingData, bank_account_number: v })} />
                      <InputGroup label="IFSC Code" value={preboardingData.bank_ifsc_code} onChange={(v: any) => setPreboardingData({ ...preboardingData, bank_ifsc_code: v })} />

                      <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Compliance Acknowledgments</h3></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" checked={preboardingData.policy_acknowledged} onChange={(e) => setPreboardingData({ ...preboardingData, policy_acknowledged: e.target.checked })} />
                        <span style={{ fontSize: '12px' }}>Policy Acknowledged</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" checked={preboardingData.nda_signed} onChange={(e) => setPreboardingData({ ...preboardingData, nda_signed: e.target.checked })} />
                        <span style={{ fontSize: '12px' }}>NDA Signed</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" checked={preboardingData.code_of_conduct_signed} onChange={(e) => setPreboardingData({ ...preboardingData, code_of_conduct_signed: e.target.checked })} />
                        <span style={{ fontSize: '12px' }}>Code of Conduct</span>
                      </div>
                      <div style={{ gridColumn: 'span 2', marginTop: '10px' }}><h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>Compliance Documents (Verified at Onboarding)</h3></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', gridColumn: 'span 2' }}>
                        {preboardingData.aadhaar_file_url && (
                          <button onClick={() => window.open(getFileUrl(preboardingData.aadhaar_file_url), '_blank')} style={{ background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.2)', color: 'var(--accent-blue)', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>VIEW AADHAAR</button>
                        )}
                        {preboardingData.pan_file_url && (
                          <button onClick={() => window.open(getFileUrl(preboardingData.pan_file_url), '_blank')} style={{ background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.2)', color: 'var(--accent-blue)', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>VIEW PAN CARD</button>
                        )}
                        {preboardingData.bank_proof_url && (
                          <button onClick={() => window.open(getFileUrl(preboardingData.bank_proof_url), '_blank')} style={{ background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.2)', color: 'var(--accent-blue)', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>VIEW BANK DOC</button>
                        )}
                      </div>

                      <select className="apple-input" value={preboardingData.preboard_status || ''} onChange={(e) => setPreboardingData({ ...preboardingData, preboard_status: e.target.value })} style={{ appearance: "none", gridColumn: 'span 2' }}>
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="completed">Completed</option>
                      </select>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'offboarding' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {!offboardingData ? (
                    <div style={{ gridColumn: 'span 2', padding: '20px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>Target is currently an active employee.</p>
                      <button className="apple-btn" onClick={initiateOffboarding} style={{ background: 'var(--accent-red)' }}>
                        <FaSignOutAlt /> Initiate Separation Workflow
                      </button>
                    </div>
                  ) : (
                    <>
                      <InputGroup label="Exit Date" type="date" value={offboardingData.exit_date} onChange={(v: any) => setOffboardingData({ ...offboardingData, exit_date: v })} />
                      <select
                        className="apple-input"
                        value={offboardingData.reason}
                        onChange={(e) => setOffboardingData({ ...offboardingData, reason: e.target.value })}
                      >
                        <option value="resign">Resignation</option>
                        <option value="terminate">Termination</option>
                      </select>
                      <InputGroup label="Notice Remaining" type="number" value={offboardingData.notice_remaining_days} onChange={(v: any) => setOffboardingData({ ...offboardingData, notice_remaining_days: parseInt(v) })} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" checked={offboardingData.relieving_letter_sent} onChange={(e) => setOffboardingData({ ...offboardingData, relieving_letter_sent: e.target.checked })} />
                        <span style={{ fontSize: '12px' }}>Letter Sent</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" checked={offboardingData.completed} onChange={(e) => setOffboardingData({ ...offboardingData, completed: e.target.checked })} />
                        <span style={{ fontSize: '12px' }}>Offboarding Complete</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="apple-btn" style={{ flex: 1, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={handleUpdate}>
                  <FaSave /> Save Changes
                </button>
                <button
                  className="apple-btn"
                  style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.2)', width: 'auto', padding: '10px 15px' }}
                  onClick={handleDelete}
                  title="Purge record"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Directory View */}
        <GlassCard title="Employee Directory" subtitle={`${employees.length} total staff members in record`}>
          {/* Filter Toolbar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-light)', marginTop: '15px' }}>
            <div>
              <label style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>SEARCH TEXT</label>
              <div style={{ position: 'relative' }}>
                <FaSearch style={{ position: 'absolute', left: '10px', top: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }} />
                <input
                  placeholder="Search name or ID..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '5px 8px 5px 26px', fontSize: '11px', color: 'white', outline: 'none' }}
                />
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>STATUS</label>
              <select
                className="apple-input"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', fontSize: '11px', height: '27px', appearance: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', width: '100%' }}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Offboarding">Offboarding</option>
                <option value="On Notice">On Notice</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
                <option value="Resigned">Resigned</option>
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>DEPARTMENT</label>
              <select
                className="apple-input"
                value={deptFilter}
                onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', fontSize: '11px', height: '27px', appearance: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', width: '100%' }}
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>JOIN FROM</label>
              <input
                type="date"
                className="apple-input"
                value={startDateFilter}
                onChange={(e) => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', fontSize: '11px', height: '27px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', width: '100%', color: 'white' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>JOIN TO</label>
              <input
                type="date"
                className="apple-input"
                value={endDateFilter}
                onChange={(e) => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', fontSize: '11px', height: '27px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', width: '100%', color: 'white' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={handleExportDirectory}
                className="apple-btn"
                style={{ width: '100%', padding: '6px 12px', fontSize: '11px', height: '27px', background: 'rgba(58,214,125,0.1)', color: '#30d158', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid rgba(58,214,125,0.2)' }}
              >
                <FaFileDownload size={11} /> Export CSV
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto", marginTop: "10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-light)", color: "var(--text-secondary)", fontSize: "11px" }}>
                  <th style={{ padding: "12px" }}>EMPLOYEE</th>
                  <th style={{ padding: "12px" }}>DEPARTMENT</th>
                  <th style={{ padding: "12px" }}>REPORTS TO</th>
                  <th style={{ padding: "12px" }}>TEAM LEADER</th>
                  <th style={{ padding: "12px" }}>STATUS</th>
                  <th style={{ padding: "12px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDirectory.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-tertiary)" }}>
                      <FaSearch size={30} style={{ marginBottom: "15px", opacity: 0.2 }} />
                      <div style={{ fontSize: "14px", fontWeight: "500" }}>No employees matching search criteria</div>
                      <div style={{ fontSize: "11px", marginTop: "5px" }}>Try searching by name, ID, or department</div>
                    </td>
                  </tr>
                ) : (
                  paginatedDirectory.map(emp => (
                    <tr key={emp.id} style={{ borderBottom: "1px dotted var(--border-light)", color: "var(--text-primary)", fontSize: "13px" }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Circular Avatar */}
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: 'var(--border-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontWeight: 'bold',
                            fontSize: '12px',
                            color: 'white',
                            border: '1px solid var(--border-light)'
                          }}>
                            {(emp.profile_photo_url || emp.photo) ? (
                              <img
                                src={getFileUrl(emp.profile_photo_url || emp.photo)}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e: any) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: `hsl(${(emp.name || '').charCodeAt(0) * 15 % 360}, 65%, 45%)`
                              }}>
                                {(emp.name || 'E').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: "600" }}>{emp.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{emp.employee_id || emp.id} • {emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div>{emp.department}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{emp.designation}</div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        {emp.reporting_to || emp.reporting_to_id || emp.manager_id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaUserTag size={10} color="var(--accent-blue)" />
                            <span style={{ fontSize: '12px' }}>{emp.reporting_to || `ID: ${emp.reporting_to_id || emp.manager_id}`}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Not Assigned</span>
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {(() => {
                          const tl = allEmployees.find(e =>
                            String(e.user_id) === String(emp.team_leader_id) ||
                            String(e.id) === String(emp.team_leader_id) ||
                            String(e.employee_id) === String(emp.team_leader_id)
                          );
                          return tl || emp.team_leader_id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FaUserClock size={10} color="#30d158" />
                                <span style={{ fontSize: '12px', fontWeight: '500' }}>{tl?.name || 'Unknown TL'}</span>
                              </div>
                              <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginLeft: '16px' }}>ID: {emp.team_leader_id}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Not Assigned</span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background: emp.status === "Active" ? "rgba(48, 209, 88, 0.1)" : 
                                      emp.status === "Inactive" ? "rgba(255, 69, 58, 0.1)" :
                                      emp.status === "On Notice" ? "rgba(255, 159, 10, 0.1)" :
                                      "rgba(255, 159, 10, 0.1)",
                          color: emp.status === "Active" ? "#30d158" : 
                                 emp.status === "Inactive" ? "#ff453a" :
                                 emp.status === "On Notice" ? "#ff9f0a" :
                                 "#ff9f0a",
                          fontSize: "11px",
                          fontWeight: 'bold'
                        }}>
                          {emp.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <button
                          onClick={() => setSelectedEmp(emp)}
                          style={{ background: "rgba(10, 132, 255, 0.1)", border: "none", color: "var(--accent-blue)", cursor: "pointer", fontSize: "11px", padding: '5px 10px', borderRadius: '5px' }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px 4px 0 4px', borderTop: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredDirectory.length)} of {filteredDirectory.length} employees
              </span>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="apple-btn"
                  style={{ padding: '4px 10px', fontSize: '11px', width: 'auto', background: currentPage === 1 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', color: currentPage === 1 ? 'var(--text-tertiary)' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', border: '1px solid var(--border-light)' }}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className="apple-btn"
                    style={{ padding: '4px 8px', fontSize: '11px', width: 'auto', background: currentPage === i + 1 ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)', color: 'white', border: currentPage === i + 1 ? 'none' : '1px solid var(--border-light)' }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="apple-btn"
                  style={{ padding: '4px 10px', fontSize: '11px', width: 'auto', background: currentPage === totalPages ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', color: currentPage === totalPages ? 'var(--text-tertiary)' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', border: '1px solid var(--border-light)' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

const SelectGroup = ({ label, value, options, onChange }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</label>
    <select
      className="apple-input"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{ appearance: 'none' }}
    >
      <option value="">Select...</option>
      {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const InputGroup = ({ label, value, onChange, type = "text" }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>{label.toUpperCase()}</label>
    <input type={type} className="apple-input" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  </div>
);

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

const FileUploadGroup = ({ label, value, onUpload, module = "general", referenceId }: any) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        console.log(`[MASTER] Uploading doc: ${label} for ${referenceId}...`);
        const res = await uploadFile(file, module, referenceId);
        if (res.file_path) {
          onUpload(res.file_path); // Save relative path to DB
        } else {
          // Fallback for safety
          const fakeUrl = URL.createObjectURL(file);
          onUpload(fakeUrl);
        }
      } catch (err) {
        console.error("Upload failed in master:", err);
        alert("Failed to upload " + label);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>{label.toUpperCase()}</label>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-light)',
        borderRadius: '12px',
        padding: '5px 12px',
        height: '42px'
      }}>
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontSize: '12px', fontWeight: '500' }}>
          <FaUpload size={14} />
          <span>{value ? "Change File" : "Upload File"}</span>
          <input type="file" style={{ display: 'none' }} onChange={handleFileChange} />
        </label>
        {value && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: '10px', color: 'var(--accent-green)', whiteSpace: 'nowrap' }}>✓ Attached</div>
            <a
              href={getFileUrl(value)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '10px', color: 'var(--accent-blue)', textDecoration: 'none', background: 'rgba(10,132,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}
            >
              VIEW
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

const tabContainer = {
  display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-light)', marginTop: '15px'
};

const tabStyle = {
  background: 'none', border: 'none', padding: '8px 4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', outline: 'none'
};

const fieldLabel = {
  fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)'
};
