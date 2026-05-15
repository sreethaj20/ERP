import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getEmployees } from "../../services/hrService";
import { getAccessProvisions, createAccessProvision, revokeAccess } from "../../services/itService";

export default function AccessProvisioning() {
  const [empId, setEmpId] = useState("");
  const [emailAccess, setEmailAccess] = useState(false);
  const [vpnAccess, setVpnAccess] = useState(false);
  const [softwareAccess, setSoftwareAccess] = useState("");
  const [wifiIP, setWifiIP] = useState("");
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [provisions, setProvisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eData, pData] = await Promise.all([
        getEmployees(),
        getAccessProvisions()
      ]);
      setEmployees(eData || []);
      setProvisions(pData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGrant = async () => {
    if (!empId) return;

    try {
      await createAccessProvision({
        employee_id: empId,
        email_access: emailAccess,
        vpn_access: vpnAccess,
        software_access: softwareAccess,
        allowed_ip: wifiIP
      });
      
      alert("Access granted and identity synced!");
      setEmpId("");
      setEmailAccess(false);
      setVpnAccess(false);
      setSoftwareAccess("");
      setWifiIP("");
      loadData();
    } catch (err) {
      alert("Failed to provision access.");
    }
  };

  const handleRevoke = async (employee_id: string) => {
    if (!window.confirm("Immediately revoke all provisioned access for this employee?")) return;
    try {
        await revokeAccess(employee_id);
        alert("All access rights revoked.");
        loadData();
    } catch (err) {
        alert("Revocation failed.");
    }
  };


  return (
    <div className="dashboard-container">
      <Header role="IT Department" title="Access Control" />

      <div style={{ marginTop: "35px" }}>
        <h1 style={{ fontSize: "50px" }}>Access Provisioning</h1>
        <div className="subtitle">Provide system access to employees</div>
      </div>

      <div className="grid-3">
        <GlassCard title="Grant Access" subtitle="Enable email/VPN/software">
          <input
            placeholder="Employee ID (e.g. EMP-101)"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            style={inputStyle}
          />

          <div style={{ marginBottom: "12px" }}>
            <label style={{ marginRight: "10px", display: "flex", alignItems: "center", gap: "10px", color: "white" }}>
              <input
                type="checkbox"
                checked={emailAccess}
                onChange={() => setEmailAccess(!emailAccess)}
              />{" "}
              Email Access
            </label>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ marginRight: "10px", display: "flex", alignItems: "center", gap: "10px", color: "white" }}>
              <input
                type="checkbox"
                checked={vpnAccess}
                onChange={() => setVpnAccess(!vpnAccess)}
              />{" "}
              VPN Access
            </label>
          </div>

          <input
            placeholder="Software Access (Eg: Jira, GitHub, SAP)"
            value={softwareAccess}
            onChange={(e) => setSoftwareAccess(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Restricted WiFi IP (e.g. 192.168.1.50)"
            value={wifiIP}
            onChange={(e) => setWifiIP(e.target.value)}
            style={inputStyle}
          />

          <button style={btnStyle} onClick={handleGrant}>Grant Access</button>
        </GlassCard>

        <GlassCard title="Provisioned Access List" subtitle="Employee access details" style={{ gridColumn: "span 2" }}>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {provisions.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center" }}>No special access provisioned yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", color: "white" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ padding: "10px" }}>Employee</th>
                    <th style={{ padding: "10px" }}>Security Vectors</th>
                    <th style={{ padding: "10px" }}>Software/Client</th>
                    <th style={{ padding: "10px" }}>IP/Address</th>
                    <th style={{ padding: "10px" }}>Status</th>
                    <th style={{ padding: "10px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {provisions.map((p: any) => (
                    <tr key={p.id || p.provision_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px" }}>
                        <div style={{ fontWeight: 'bold' }}>{p.employee_id}</div>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            {p.email_access && <span style={{ background: 'rgba(48,209,88,0.1)', color: '#30d158', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>EMAIL</span>}
                            {p.vpn_access && <span style={{ background: 'rgba(10,132,255,0.1)', color: '#0a84ff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>VPN</span>}
                        </div>
                      </td>
                      <td style={{ padding: "10px", fontSize: '12px' }}>{p.software_access || "Standard"}</td>
                      <td style={{ padding: "10px", fontSize: '12px', color: 'var(--text-secondary)' }}>{p.allowed_ip || "DHCP"}</td>
                      <td style={{ padding: "10px" }}>
                         <span style={{ 
                            padding: '3px 8px', 
                            borderRadius: '4px',
                            background: p.status === 'Active' ? 'rgba(48,209,88,0.1)' : 'rgba(255,55,95,0.1)',
                            color: p.status === 'Active' ? '#30d158' : '#ff375f',
                            fontSize: '11px'
                         }}>
                            {p.status}
                         </span>
                      </td>
                      <td style={{ padding: "10px" }}>
                         <button 
                            onClick={() => handleRevoke(p.employee_id)}
                            style={{ background: 'rgba(255,55,95,0.1)', border: 'none', color: '#ff375f', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                         >
                            Revoke
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
