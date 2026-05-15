import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
  getEmployeePreboardingList,
  updatePreboarding,
  getEmployees,
} from "../../utils/storage";
import {
  FaFileSignature,
  FaClipboardCheck,
  FaUserShield,
  FaTasks,
  FaUniversity,
} from "react-icons/fa";
import webSocketService from "../../services/websocketService";

export default function PreboardingStatus() {
  const [list, setList] = useState<any[]>([]);
  const [employees, setEmployeesState] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const pbList = await getEmployeePreboardingList();
    setList(Array.isArray(pbList) ? pbList : []);
    const emps = await getEmployees();
    setEmployeesState(Array.isArray(emps) ? emps : []);
  };

  const getEmpName = (empId: string) =>
    employees.find((e: any) => e.id === empId)?.name || empId;

  const getEmp = (empId: string) =>
    employees.find((e: any) => e.id === empId);

  const getEmpEmail = (empId: string) =>
    employees.find((e: any) => e.id === empId)?.email || "";

  const handleToggle = async (preboard_id: number, field: string, currentVal: boolean) => {
    await updatePreboarding(preboard_id, { [field]: !currentVal });
    await loadData();

    if (selected?.preboard_id === preboard_id) {
      setSelected((prev: any) => ({ ...prev, [field]: !currentVal }));
    }
  };

  const handleStatusUpdate = async (preboard_id: number, status: string) => {
    await updatePreboarding(preboard_id, { self_onboarding_status: status });

    // Broadcast real-time event
    webSocketService.send("lifecycle_updated", { type: 'preboarding', id: preboard_id, status });

    await loadData();

    if (selected?.preboard_id === preboard_id) {
      setSelected((prev: any) => ({ ...prev, self_onboarding_status: status }));
    }
  };

  const handleTrainingToggle = async (preboard_id: number, moduleKey: string) => {
    const pb = list.find((x: any) => x.preboard_id === preboard_id);
    if (!pb) return;

    const updatedModules = {
      ...pb.training_modules_completed,
      [moduleKey]: !pb.training_modules_completed?.[moduleKey],
    };

    await updatePreboarding(preboard_id, { training_modules_completed: updatedModules });
    await loadData();

    if (selected?.preboard_id === preboard_id) {
      setSelected((prev: any) => ({
        ...prev,
        training_modules_completed: updatedModules,
      }));
    }
  };

  const getCompletionScore = (pb: any) => {
    let score = 0;
    if (pb.policy_agreement_signed) score++;
    if (pb.nda_signed) score++;
    if (pb.training_modules_completed?.hr_policy) score++;
    if (pb.training_modules_completed?.safety) score++;
    return score;
  };

  return (
    <div className="dashboard-container">
      <Header role="HR" title="Employee Preboarding" />

      <div style={{ marginTop: "35px", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "40px", fontWeight: "700" }}>Employee Preboarding Status</h1>
        <div className="subtitle">
          Track compliance, training modules, NDA signing and banking details
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* LEFT LIST */}
        <GlassCard title="Preboarding Queue" subtitle="employee_preboarding table entries">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
            {list.length === 0 && (
              <p style={{ color: "var(--text-tertiary)", fontSize: "13px" }}>
                No preboarding entries.
              </p>
            )}

            {list.map((pb: any) => (
              <div
                key={pb.preboard_id}
                onClick={() => setSelected(pb)}
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  background:
                    selected?.preboard_id === pb.preboard_id
                      ? "rgba(10, 132, 255, 0.1)"
                      : "rgba(255,255,255,0.02)",
                  border:
                    selected?.preboard_id === pb.preboard_id
                      ? "1px solid #0a84ff"
                      : "1px solid var(--border-light)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontWeight: "700" }}>{getEmpName(pb.employee_id)}</span>

                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "bold",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background:
                        pb.self_onboarding_status === "complete"
                          ? "rgba(48,209,88,0.1)"
                          : pb.self_onboarding_status === "partial"
                            ? "rgba(10,132,255,0.1)"
                            : "rgba(255,159,10,0.1)",
                      color:
                        pb.self_onboarding_status === "complete"
                          ? "#30d158"
                          : pb.self_onboarding_status === "partial"
                            ? "#0a84ff"
                            : "#ff9f0a",
                    }}
                  >
                    {(pb.self_onboarding_status || "pending").toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  Completion Score: <b>{getCompletionScore(pb)}/4</b>
                </div>

                <div style={{ display: "flex", gap: "5px", marginTop: "8px" }}>
                  <ProgressBar done={pb.policy_agreement_signed} />
                  <ProgressBar done={pb.nda_signed} />
                  <ProgressBar done={pb.training_modules_completed?.hr_policy} />
                  <ProgressBar done={pb.training_modules_completed?.safety} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* RIGHT DETAILS */}
        <GlassCard
          title="Preboarding Details"
          subtitle={selected ? `Preboard ID: ${selected.preboard_id}` : "Select a candidate"}
        >
          {selected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "15px" }}>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-light)",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: "700" }}>
                  {getEmpName(selected.employee_id)}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                  {getEmpEmail(selected.employee_id)}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <FieldDisplay label="Preboard ID (PK)" value={selected.preboard_id} />
                <FieldDisplay label="Employee ID (FK)" value={selected.employee_id} />
                <FieldDisplay label="Designation" value={getEmp(selected.employee_id)?.designation || "N/A"} />
                <FieldDisplay label="Reporting Manager" value={getEmp(selected.employee_id)?.reporting_to || "N/A"} />
                <FieldDisplay label="Employment Type" value={getEmp(selected.employee_id)?.employment_type || "N/A"} />
                <FieldDisplay label="Emergency Contact" value={selected.emergency_contact_name || "N/A"} />
                <FieldDisplay label="PAN Number" value={selected.pan_number || "N/A"} />
                <FieldDisplay
                  label="Self Onboarding Status"
                  value={(selected.self_onboarding_status || "pending").toUpperCase()}
                />
              </div>

              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: "bold", textTransform: "uppercase" }}>
                Compliance Checks
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <ComplianceTile
                  icon={<FaFileSignature />}
                  label="Policy Agreement"
                  active={selected.policy_agreement_signed}
                  onToggle={() =>
                    handleToggle(selected.preboard_id, "policy_agreement_signed", selected.policy_agreement_signed)
                  }
                />
                <ComplianceTile
                  icon={<FaUserShield />}
                  label="NDA Signed"
                  active={selected.nda_signed}
                  onToggle={() =>
                    handleToggle(selected.preboard_id, "nda_signed", selected.nda_signed)
                  }
                />
              </div>

              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: "bold", textTransform: "uppercase" }}>
                Training Modules
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <ComplianceTile
                  icon={<FaTasks />}
                  label="HR Policy"
                  active={selected.training_modules_completed?.hr_policy}
                  onToggle={() => handleTrainingToggle(selected.preboard_id, "hr_policy")}
                />
                <ComplianceTile
                  icon={<FaUniversity />}
                  label="Safety Training"
                  active={selected.training_modules_completed?.safety}
                  onToggle={() => handleTrainingToggle(selected.preboard_id, "safety")}
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => handleStatusUpdate(selected.preboard_id, "pending")} className="apple-btn" style={{ flex: 1, background: "rgba(255,159,10,0.15)", color: "#ff9f0a" }}>Pending</button>
                <button onClick={() => handleStatusUpdate(selected.preboard_id, "partial")} className="apple-btn" style={{ flex: 1, background: "rgba(10,132,255,0.15)", color: "#0a84ff" }}>Partial</button>
                <button onClick={() => handleStatusUpdate(selected.preboard_id, "complete")} className="apple-btn" style={{ flex: 1, background: "#30d158", color: "white" }}><FaClipboardCheck /> Complete</button>
              </div>
            </div>
          ) : (
            <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: "14px" }}>
              Select a candidate from the queue
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

const FieldDisplay = ({ label, value }: any) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <span style={{ fontSize: "10px", color: "var(--text-tertiary)", fontWeight: "bold", textTransform: "uppercase" }}>{label}</span>
    <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{value || "—"}</span>
  </div>
);

const ProgressBar = ({ done }: any) => (
  <div style={{ height: "4px", flex: 1, background: done ? "#30d158" : "rgba(255,255,255,0.1)", borderRadius: "2px" }} />
);

const ComplianceTile = ({ label, active, icon, onToggle }: any) => (
  <div
    onClick={onToggle}
    style={{
      padding: "14px", borderRadius: "14px", cursor: "pointer",
      background: active ? "rgba(48,209,88,0.05)" : "rgba(255,255,255,0.02)",
      border: active ? "1px solid rgba(48,209,88,0.4)" : "1px solid var(--border-light)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
    }}
  >
    <div style={{ color: active ? "#30d158" : "var(--text-tertiary)", fontSize: "18px" }}>{icon}</div>
    <div style={{ fontSize: "10px", fontWeight: "bold", color: "var(--text-tertiary)", textTransform: "uppercase" }}>{label}</div>
  </div>
);
