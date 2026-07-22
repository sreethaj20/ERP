import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
  getHROffboardingRequests,
  updateOffboardingRequest,
  getEmployees,
  updateEmployee,
} from "../../utils/storage";
import { downloadCSV } from "../../utils/formatters";
import {
  FaCheckDouble,
  FaDownload,
  FaEnvelopeOpenText,
  FaTimes,
  FaFileDownload,
  FaTimesCircle,
  FaFilePdf
} from "react-icons/fa";
import webSocketService from "../../services/websocketService";
import headerLogoImage from "../../assets/mercure-logo.jpeg";
import watermarkImage from "../../assets/mercure-logo.png";
import uditSignatureImage from "../../assets/udit-signature.png";

export default function OffboardingManagement() {
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployeesState] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"employee" | "staff">("employee");
  
  // Relieving Letter State
  const [showLetter, setShowLetter] = useState(false);
  const [letterData, setLetterData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const offboardingData = await getHROffboardingRequests();
    setRequests(Array.isArray(offboardingData) ? offboardingData : []);
    const employeesData = await getEmployees();
    setEmployeesState(Array.isArray(employeesData) ? employeesData : []);
  };

  const getEmp = (empId: string) => 
    employees.find((e: any) => String(e.id) === String(empId) || String(e.employee_id) === String(empId));

  const getEmpName = (empId: string) => getEmp(empId)?.name || empId;

  const getEmpEmail = (empId: string) => getEmp(empId)?.email || "";

  const getEmpDesignation = (empId: string) =>
    getEmp(empId)?.designation || "Employee";

  const getEmpJoinDate = (empId: string) =>
    getEmp(empId)?.join_date || "2024-01-01";

  const calculateExperience = (joinDate: string, exitDate: string) => {
    if (!joinDate || !exitDate) return "N/A";

    const start = new Date(joinDate);
    const end = new Date(exitDate);

    const diff = end.getTime() - start.getTime();
    const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(totalDays / 30);
    const years = Math.floor(months / 12);

    if (years > 0) return `${years} Year(s) ${months % 12} Month(s)`;
    return `${months} Month(s)`;
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
      doj: formatDate(emp?.joining_date || emp?.joining_date_v2 || emp?.join_date || emp?.doj || '2023-01-01'),
      dor: formatDate(reqRecord?.exit_date || dorVal),
      resignationDate: formatDate(resignationDateVal),
      issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    };
  };

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

  const toggleChecklist = async (offboard_id: number, field: string, current: any) => {
    const req = requests.find((r: any) => r.offboard_id === offboard_id);
    if (!req) return;

    const updatedChecklist = { ...req.checklist_status, [field]: !current };

    await updateOffboardingRequest(offboard_id, { checklist_status: updatedChecklist });
    await loadData();

    if (selected?.offboard_id === offboard_id) {
      setSelected((prev: any) => ({ ...prev, checklist_status: updatedChecklist }));
    }
  };

  // ================= RELIEVING LETTER SYSTEM =================

  const generateRelievingLetterHTML = (req: any) => {
    const toTitleCase = (str: string) => {
      if (!str) return '';
      const formatted = str.trim();
      if (formatted.toUpperCase() === 'TEAMLEADER') return 'Team Leader';
      return formatted.replace(/\b\w+/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    };

    const emp = getEmp(req.employee_id);

    const empName = toTitleCase(emp?.name || req.employee_id);
    const empEmail = emp?.email || "N/A";
    const designation = toTitleCase(emp?.designation || getEmpDesignation(req.employee_id));

    const joinDate = emp?.join_date || getEmpJoinDate(req.employee_id);
    const exitDate = req.exit_date || "TBD";

    const experience = calculateExperience(joinDate, exitDate);

    const companyName = "Mercure Solutions Private Limited";
    const hrName = "HR Department";
    const managerName = "Manager Department";

    return `
      <html>
      <head>
        <title>Relieving Letter</title>
      </head>
<body style="font-family: Arial; padding: 40px; line-height: 1.8;">
<h2 style="text-align:center;">RELIEVING LETTER</h2>

        <p><b>Date:</b> ${new Date().toLocaleDateString()}</p>

        <p>
          To,<br/>
          <b>${empName}</b><br/>
          ${designation}<br/>
          Email: ${empEmail}
        </p>

        <p>
          This is to certify that <b>${empName}</b> was employed with 
          <b>${companyName}</b> as <b>${designation}</b> from 
          <b>${joinDate}</b> to <b>${exitDate}</b>.
        </p>

        <p>
          The employee has completed their responsibilities successfully and has been
          officially relieved from the company with effect from <b>${exitDate}</b>.
        </p>

        <p>
          Total service experience in the organization: <b>${experience}</b>.
        </p>

        <p>
          We wish them the best in their future endeavors.
        </p>

        <br/>

        <p>
          Regards,<br/>
          <b>${hrName}</b><br/>
          ${companyName}
        </p>

        <br/>
        <p style="font-size: 12px; color: gray;">
          CC: ${managerName} (Manager Copy)
        </p>

      </body>
      </html>
    `;
  };

  const downloadRelievingLetter = (req: any) => {
    const emp = getEmp(req.employee_id);
    setLetterData(formatLetterData(emp, req));
    setShowLetter(true);
  };

  const sendRelievingLetterMail = async (req: any) => {
    const emp = getEmp(req.employee_id);

    const empEmail = emp?.email || "employee@gmail.com";
    const managerEmail = "manager@gmail.com"; // sample manager email

    alert(
      `✅ Relieving Letter Sent Successfully!\n\nTo: ${empEmail}\nCC: ${managerEmail}\n\n(Relieving Letter Attached)`
    );

    await updateOffboardingRequest(req.offboard_id, { relieving_letter_sent: true });
    await loadData();

    if (selected?.offboard_id === req.offboard_id) {
      setSelected((prev: any) => ({ ...prev, relieving_letter_sent: true }));
    }
  };

  // ================= FINALIZE OFFBOARD =================

  const markComplete = async (offboard_id: number, employee_id: string) => {
    const req = requests.find((r: any) => r.offboard_id === offboard_id);

    if (!req?.relieving_letter_sent) {
      alert("❌ Please send relieving letter mail before finalizing offboarding.");
      return;
    }

    const exitDate = req?.exit_date || req?.last_working_day;
    const todayStr = new Date().toISOString().split('T')[0];
    const isFuture = exitDate && exitDate > todayStr;

    await updateOffboardingRequest(offboard_id, { completed: true, manager_approved: true });
    if (isFuture) {
      await updateEmployee(employee_id, { status: "On Notice" });
    } else {
      await updateEmployee(employee_id, { status: "Archived" });
    }

    // Broadcast real-time event
    webSocketService.send("lifecycle_updated", { type: 'offboarding', id: offboard_id, status: 'completed' });

    await loadData();
    setSelected(null);

    alert(isFuture ? "✅ Offboarding clearance completed. Employee remains On Notice until exit date." : "✅ Offboarding completed, employee profile archived.");
  };

  // Filter for staff roles (hr, recruiter, teamleader, it, admin, manager) vs standard workforce
  const staffRoles = ["hr", "recruiter", "requiter", "teamleader", "it", "manager", "admin", "itdepartment", "it_department", "team_leader"];
  
  const pending = requests.filter((r: any) => {
    if (r.completed) return false;
    const emp = getEmp(r.employee_id);
    const roleVal = (emp?.role || "").toLowerCase();
    const designationVal = (emp?.designation || "").toLowerCase();
    const isStaff = emp && (
      staffRoles.includes(roleVal) || 
      staffRoles.includes(designationVal) ||
      staffRoles.some(role => roleVal.includes(role) || designationVal.includes(role))
    );
    const matchesSearch = getEmpName(r.employee_id).toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "staff") {
      return isStaff && matchesSearch;
    } else {
      return !isStaff && matchesSearch;
    }
  });

  const completed = requests.filter((r: any) => {
    if (!r.completed) return false;
    const emp = getEmp(r.employee_id);
    const roleVal = (emp?.role || "").toLowerCase();
    const designationVal = (emp?.designation || "").toLowerCase();
    const isStaff = emp && (
      staffRoles.includes(roleVal) || 
      staffRoles.includes(designationVal) ||
      staffRoles.some(role => roleVal.includes(role) || designationVal.includes(role))
    );
    const matchesSearch = getEmpName(r.employee_id).toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "staff") {
      return isStaff && matchesSearch;
    } else {
      return !isStaff && matchesSearch;
    }
  });

  const handleExport = () => {
    const exportData = requests.map((r: any) => ({
      'Offboard ID': r.offboard_id,
      'Employee Name': getEmpName(r.employee_id),
      'Employee ID': r.employee_id,
      'Designation': getEmpDesignation(r.employee_id),
      'Exit Date': r.exit_date,
      'Reason': r.reason.toUpperCase(),
      'Notice Period': r.notice_period_days,
      'IT Clearance': r.checklist_status?.it_clearance ? 'YES' : 'NO',
      'HR Settlement': r.checklist_status?.hr_settlement ? 'YES' : 'NO',
      'Completed': r.completed ? 'YES' : 'NO',
      'Letter Sent': r.relieving_letter_sent ? 'YES' : 'NO'
    }));
    downloadCSV(exportData, `HR_Offboarding_Records_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="dashboard-container">
      <Header role="HR" title="Exit Management" />

      <div style={{ marginTop: "35px", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "40px", fontWeight: "700" }}>
          Offboarding & Exit Intelligence
        </h1>
        <div className="subtitle">
          Execute separation workflows, settlements, relieving letter, and clearance from offboarding_requests table
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selected ? "1fr 1.5fr" : "2.2fr 0.8fr",
          gap: "24px",
        }}
      >
        {/* LEFT LIST */}
        <GlassCard title="Active Offboarding Cases" subtitle="offboarding_requests table">
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Search employee..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                width: '180px'
              }}
            />
            <button
              onClick={handleExport}
              className="apple-btn"
              style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(255,69,58,0.1)', color: '#ff453a', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Download results as CSV"
            >
              <FaFileDownload size={12} /> Export CSV
            </button>
          </div>
          {/* Segmented Control / Tab Switcher */}
          <div style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "12px",
            padding: "4px",
            marginBottom: "15px",
            marginTop: "15px",
            border: "1px solid var(--border-light)"
          }}>
            <button
              onClick={() => setActiveTab("employee")}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "10px",
                background: activeTab === "employee" ? "var(--accent-blue)" : "transparent",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              Employee Offboarding
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "10px",
                background: activeTab === "staff" ? "var(--accent-blue)" : "transparent",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              Staff Offboarding
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "5px" }}>
            {pending.length === 0 && (
              <p style={{ color: "var(--text-tertiary)" }}>No pending offboarding requests.</p>
            )}

            {pending.map((req: any) => (
              <div
                key={req.offboard_id}
                onClick={() => setSelected(req)}
                style={{
                  ...rowStyle,
                  border:
                    selected?.offboard_id === req.offboard_id
                      ? "1px solid var(--accent-blue)"
                      : "1px solid var(--border-light)",
                  cursor: "pointer",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: "700" }}>
                    {getEmpName(req.employee_id)}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                    OB-ID: {req.offboard_id} | EMP: {req.employee_id}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Exit: {req.exit_date || "TBD"} • {req.notice_remaining_days}d remaining
                  </div>
                  <span style={reasonBadge(req.reason)}>{req.reason?.toUpperCase()}</span>

                  <div style={{ fontSize: "10px", marginTop: "6px", color: req.relieving_letter_sent ? "#30d158" : "#ff9f0a" }}>
                    {req.relieving_letter_sent ? "LETTER SENT" : "LETTER PENDING"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {req.manager_approved ? (
                    <span style={{ fontSize: "10px", fontWeight: "bold", color: "#30d158" }}>
                      APPROVED
                    </span>
                  ) : (
                    <span style={{ fontSize: "10px", fontWeight: "bold", color: "#ff9f0a" }}>
                      PENDING
                    </span>
                  )}
                </div>
              </div>
            ))}

            {completed.length > 0 && (
              <>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: "bold", marginTop: "15px" }}>
                  COMPLETED
                </div>

                {completed.map((req: any) => (
                  <div key={req.offboard_id} style={{ ...rowStyle, opacity: 0.5 }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700" }}>
                        {getEmpName(req.employee_id)}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                        Exit: {req.exit_date} • {req.reason?.toUpperCase()}
                      </div>
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: "bold", color: "#30d158" }}>
                      DONE
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </GlassCard>

        {/* RIGHT DETAILS */}
        {selected ? (
          <GlassCard title="Offboarding Details" subtitle={`Offboard ID: ${selected.offboard_id}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "15px" }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-light)",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "700" }}>
                    {getEmpName(selected.employee_id)}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    {getEmpEmail(selected.employee_id)}
                  </div>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-tertiary)",
                    fontSize: "16px",
                  }}
                >
                  <FaTimes />
                </button>
              </div>

              {/* All fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <FieldDisplay label="Offboard ID (PK)" value={selected.offboard_id} />
                <FieldDisplay label="Employee ID (FK)" value={selected.employee_id} />
                <FieldDisplay label="Designation" value={getEmpDesignation(selected.employee_id)} />
                <FieldDisplay label="Reporting Manager" value={getEmp(selected.employee_id)?.reporting_to || "N/A"} />
                <FieldDisplay label="Exit Date" value={selected.exit_date || "TBD"} />
                <FieldDisplay label="Reason" value={selected.reason?.toUpperCase()} />
                <FieldDisplay label="Notice Period (Days)" value={selected.notice_period_days} />
                <FieldDisplay label="Notice Remaining (Days)" value={selected.notice_remaining_days} />
                <FieldDisplay label="Handover To (FK)" value={selected.handover_to || "None"} />
                <FieldDisplay label="Final Dues (₹)" value={`₹${(selected.final_dues_amount || 0).toLocaleString()}`} />
                <FieldDisplay label="Manager Approved" value={selected.manager_approved ? "YES" : "NO"} />
                <FieldDisplay label="Relieving Letter Sent" value={selected.relieving_letter_sent ? "YES" : "NO"} />
                <FieldDisplay label="Completed" value={selected.completed ? "YES" : "NO"} />
              </div>

              {/* Checklist JSON */}
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: "bold", textTransform: "uppercase" }}>
                Checklist Status (JSON)
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <ClearanceItem
                  label="IT Clearance"
                  status={selected.checklist_status?.it_clearance}
                  onToggle={() =>
                    toggleChecklist(selected.offboard_id, "it_clearance", selected.checklist_status?.it_clearance)
                  }
                />
                <ClearanceItem
                  label="HR Settlement"
                  status={selected.checklist_status?.hr_settlement}
                  onToggle={() =>
                    toggleChecklist(selected.offboard_id, "hr_settlement", selected.checklist_status?.hr_settlement)
                  }
                />
              </div>

              {/* Exit Notes */}
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-tertiary)", fontWeight: "bold", marginBottom: "4px" }}>
                  EXIT INTERVIEW NOTES
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    padding: "12px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "10px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  {selected.exit_interview_notes || "No notes recorded."}
                </div>
              </div>

              {/* Relieving Letter Actions */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => downloadRelievingLetter(selected)}
                  className="apple-btn"
                  style={{
                    flex: 1,
                    background: "rgba(10,132,255,0.15)",
                    color: "#0a84ff",
                    border: "1px solid rgba(10,132,255,0.2)",
                    fontWeight: "bold",
                  }}
                >
                  <FaDownload /> Download Letter
                </button>

                <button
                  onClick={() => sendRelievingLetterMail(selected)}
                  className="apple-btn"
                  style={{
                    flex: 1,
                    background: "#30d158",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  <FaEnvelopeOpenText /> Send Mail
                </button>
              </div>

              {/* Finalize */}
              {!selected.completed && (
                <button
                  onClick={() => markComplete(selected.offboard_id, selected.employee_id)}
                  className="apple-btn"
                  style={{
                    height: "50px",
                    background: "#ff453a",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  <FaCheckDouble /> Finalize & Archive
                </button>
              )}
            </div>
          </GlassCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <GlassCard title="Table Schema" subtitle="offboarding_requests + relieving_letter_sent">
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                {[
                  "offboard_id (PK)",
                  "employee_id (FK)",
                  "exit_date",
                  "reason (ENUM)",
                  "notice_period_days",
                  "notice_remaining_days",
                  "handover_to (FK)",
                  "checklist_status (JSON)",
                  "final_dues_amount",
                  "exit_interview_notes",
                  "relieving_letter_sent (BOOLEAN)",
                  "manager_approved",
                  "completed",
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

            <GlassCard title="Statistics" subtitle="Separation Velocity">
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                <VelocityStat label="Pending" val={pending.length} color="#ff9f0a" />
                <VelocityStat
                  label="Letter Sent"
                  val={requests.filter((r: any) => {
                    const emp = getEmp(r.employee_id);
                    const roleVal = (emp?.role || "").toLowerCase();
                    const designationVal = (emp?.designation || "").toLowerCase();
                    const isStaff = emp && (
                      staffRoles.includes(roleVal) || 
                      staffRoles.includes(designationVal) ||
                      staffRoles.some(role => roleVal.includes(role) || designationVal.includes(role))
                    );
                    const matchesTab = activeTab === "staff" ? isStaff : !isStaff;
                    return matchesTab && r.relieving_letter_sent && !r.completed;
                  }).length}
                  color="#0a84ff"
                />
                <VelocityStat label="Completed" val={completed.length} color="#30d158" />
              </div>
            </GlassCard>
          </div>
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
    </div>
  );
}

/* ==================== SUB-COMPONENTS ==================== */

const FieldDisplay = ({ label, value }: any) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <span style={{ fontSize: "10px", color: "var(--text-tertiary)", fontWeight: "bold", textTransform: "uppercase" }}>
      {label}
    </span>
    <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
      {value || "—"}
    </span>
  </div>
);

const ClearanceItem = ({ label, status, onToggle }: any) => (
  <div
    onClick={onToggle}
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 15px",
      background: status ? "rgba(48,209,88,0.05)" : "rgba(255,255,255,0.02)",
      borderRadius: "10px",
      fontSize: "13px",
      cursor: "pointer",
      border: status ? "1px solid rgba(48,209,88,0.3)" : "1px solid var(--border-light)",
    }}
  >
    <span>{label}</span>
    <span style={{ fontWeight: "bold", color: status ? "#30d158" : "#ff9f0a" }}>
      {status ? "CLEARED" : "PENDING"}
    </span>
  </div>
);

const VelocityStat = ({ label, val, color }: any) => (
  <div style={{ textAlign: "center", flex: 1 }}>
    <div style={{ fontSize: "24px", fontWeight: "700", color }}>{val}</div>
    <div style={{ fontSize: "10px", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
      {label}
    </div>
  </div>
);

const rowStyle: any = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "15px",
  background: "rgba(255,255,255,0.02)",
  borderRadius: "14px",
  border: "1px solid var(--border-light)",
};

const reasonBadge = (reason: string): any => ({
  fontSize: "9px",
  fontWeight: "bold",
  padding: "4px 8px",
  borderRadius: "4px",
  marginTop: "4px",
  display: "inline-block",
  background:
    reason === "resign"
      ? "rgba(10,132,255,0.1)"
      : reason === "terminate"
        ? "rgba(255,69,58,0.1)"
        : "rgba(255,214,10,0.1)",
  color:
    reason === "resign"
      ? "#0a84ff"
      : reason === "terminate"
        ? "#ff453a"
        : "#ffd60a",
  border: `1px solid ${reason === "resign"
    ? "rgba(10,132,255,0.2)"
    : reason === "terminate"
      ? "rgba(255,69,58,0.2)"
      : "rgba(255,214,10,0.2)"
    }`,
});
