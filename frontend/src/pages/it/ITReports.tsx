import React from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";

export default function ITReports() {
  const downloadExcel = (type: string) => {
    alert(`Downloading ${type} report in Excel... API will connect soon`);
  };

  return (
    <div className="dashboard-container">
      <Header role="IT Department" />

      <div style={{ marginTop: "35px" }}>
        <h1 style={{ fontSize: "50px" }}>IT Reports</h1>
        <div className="subtitle">Download IT reports in Excel format</div>
      </div>

      <div className="grid-3" style={{ marginTop: "30px" }}>
        <GlassCard title="Asset Inventory Report" subtitle="Download assets report">
          <button style={btnStyle} onClick={() => downloadExcel("Assets Inventory")}>
            Download Excel
          </button>
        </GlassCard>

        <GlassCard title="Asset Allocation Report" subtitle="Download allocation history">
          <button style={btnStyle} onClick={() => downloadExcel("Asset Allocation")}>
            Download Excel
          </button>
        </GlassCard>

        <GlassCard title="Support Tickets Report" subtitle="Download tickets status">
          <button style={btnStyle} onClick={() => downloadExcel("Support Tickets")}>
            Download Excel
          </button>
        </GlassCard>

        <GlassCard title="Access Provisioning Report" subtitle="Download access records">
          <button style={btnStyle} onClick={() => downloadExcel("Access Provisioning")}>
            Download Excel
          </button>
        </GlassCard>

        <GlassCard title="Access Revocation Report" subtitle="Download revoked access list">
          <button style={btnStyle} onClick={() => downloadExcel("Access Revocation")}>
            Download Excel
          </button>
        </GlassCard>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "15px",
  padding: "12px",
  borderRadius: "12px",
  border: "none",
  background: "#00BFFF",
  color: "white",
  fontWeight: "600",
  cursor: "pointer",
};
