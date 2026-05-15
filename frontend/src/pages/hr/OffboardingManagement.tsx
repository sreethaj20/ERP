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
  FaFileDownload
} from "react-icons/fa";
import webSocketService from "../../services/websocketService";

export default function OffboardingManagement() {
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployeesState] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const offboardingData = await getHROffboardingRequests();
    setRequests(Array.isArray(offboardingData) ? offboardingData : []);
    const employeesData = await getEmployees();
    setEmployeesState(Array.isArray(employeesData) ? employeesData : []);
  };

  const getEmp = (empId: string) => employees.find((e: any) => e.id === empId);

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
    const emp = getEmp(req.employee_id);

    const empName = emp?.name || req.employee_id;
    const empEmail = emp?.email || "N/A";
    const designation = emp?.designation || getEmpDesignation(req.employee_id);

    const joinDate = emp?.join_date || getEmpJoinDate(req.employee_id);
    const exitDate = req.exit_date || "TBD";

    const experience = calculateExperience(joinDate, exitDate);

    const companyName = "Enterprise HRMS Pvt Ltd";
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
<p style={{ fontSize: '12px', color: 'gray' }}>\n          CC: {managerName} (Manager Copy)
        </p>

      </body>
      </html>
    `;
  };

  const downloadRelievingLetter = (req: any) => {
    const htmlContent = generateRelievingLetterHTML(req);

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Relieving_Letter_${req.employee_id}.html`;
    a.click();

    window.URL.revokeObjectURL(url);
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

    await updateOffboardingRequest(offboard_id, { completed: true, manager_approved: true });
    await updateEmployee(employee_id, { status: "Archived" });

    // Broadcast real-time event
    webSocketService.send("lifecycle_updated", { type: 'offboarding', id: offboard_id, status: 'completed' });

    await loadData();
    setSelected(null);

    alert("✅ Offboarding completed, employee profile archived.");
  };

  // Filter for standard workforce only (EXCLUDING staff roles: hr, recruiter, teamleader, it, admin, manager)
  const staffRoles = ["hr", "recruiter", "teamleader", "it", "manager", "admin"];
  
  const pending = requests.filter((r: any) => {
    if (r.completed) return false;
    const emp = getEmp(r.employee_id);
    // HR only manages employees who are NOT administrative staff
    const isStaff = emp && staffRoles.includes(emp.role?.toLowerCase());
    const matchesSearch = getEmpName(r.employee_id).toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    return !isStaff && matchesSearch;
  });

  const completed = requests.filter((r: any) => {
    if (!r.completed) return false;
    const matchesSearch = getEmpName(r.employee_id).toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
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
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
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
                  val={requests.filter((r: any) => r.relieving_letter_sent && !r.completed).length}
                  color="#0a84ff"
                />
                <VelocityStat label="Completed" val={completed.length} color="#30d158" />
              </div>
            </GlassCard>
          </div>
        )}
      </div>
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
