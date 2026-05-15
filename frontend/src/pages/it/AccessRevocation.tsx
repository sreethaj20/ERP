import React, { useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";

export default function AccessRevocation() {
  const [empId, setEmpId] = useState("");

  return (
    <div className="dashboard-container">
      <Header role="IT Department" />

      <div style={{ marginTop: "35px" }}>
        <h1 style={{ fontSize: "50px" }}>Access Revocation</h1>
        <div className="subtitle">Disable access during employee offboarding</div>
      </div>

      <div className="grid-3">
        <GlassCard title="Revoke Employee Access" subtitle="Remove VPN/email/software access">
          <input
            placeholder="Employee ID"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            style={inputStyle}
          />

          <button style={dangerBtnStyle}>Revoke Access</button>
        </GlassCard>

        <GlassCard title="Offboarding Clearance" subtitle="IT clearance status">
          <p style={{ color: "rgba(255,255,255,0.6)" }}>
            Pending offboarding clearance employees will show here.
          </p>
        </GlassCard>

        <GlassCard title="Revocation Report" subtitle="Download offboarding IT report">
          <button style={btnStyle}>Download Excel</button>
        </GlassCard>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.4)",
  color: "white",
  marginBottom: "12px",
};

const btnStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "none",
  background: "#00BFFF",
  color: "white",
  fontWeight: "600",
  cursor: "pointer",
};

const dangerBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "none",
  background: "#FF4D4D",
  color: "white",
  fontWeight: "600",
  cursor: "pointer",
};
