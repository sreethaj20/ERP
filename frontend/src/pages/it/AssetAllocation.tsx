import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getAssets, getAllocations, createAllocation } from "../../services/itService";
import { getEmployees } from "../../services/hrService";
import api from "../../api/apiClient";

export default function AssetAllocation() {
  const [empId, setEmpId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [allocationType, setAllocationType] = useState("Permanent");
  const [condition, setCondition] = useState("New");
  const [allocationDate, setAllocationDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState("");
  const [location, setLocation] = useState("Office");
  const [verifiedDate, setVerifiedDate] = useState(new Date().toISOString().split('T')[0]);

  const [employees, setEmployees] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const [searchEmpId, setSearchEmpId] = useState("");
  const [selectedAllocation, setSelectedAllocation] = useState<any>(null);

  const loadData = async () => {
    try {
      const [eData, aData, alData] = await Promise.all([
        getEmployees(),
        getAssets(),
        getAllocations()
      ]);
      setEmployees(eData || []);
      setAssets(aData || []);
      setAllocations(alData || []);
      setDebugInfo({
        empCount: eData?.length,
        assetCount: aData?.length,
        allocCount: alData?.length,
        availableCount: aData?.filter((a: any) => a.status === 'Available').length
      });
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load data. Check console for details.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableAssets = assets.filter((a: any) => (a.status || "").toLowerCase() === 'available');
  const selectedEmp = employees.find((e: any) =>
    String(e.employee_id || "").toLowerCase() === String(empId || "").toLowerCase() ||
    String(e.id || "") === String(empId || "")
  );

  const filteredAllocations = allocations.filter((a: any) =>
    !searchEmpId ||
    (a.employee_id || "").toLowerCase().includes(searchEmpId.toLowerCase()) ||
    (a.employee_name || "").toLowerCase().includes(searchEmpId.toLowerCase())
  );

  const handleAllocate = async () => {
    if (!empId || !assetId) return;

    try {
      await createAllocation({
        asset_id: assetId,
        employee_id: empId,
        allocation_date: allocationDate,
        allocation_type: allocationType,
        expected_return_date: returnDate || null,
        asset_condition: condition,
        location: location,
        last_verified_date: verifiedDate
      });

      setEmpId("");
      setAssetId("");
      setReturnDate("");
      alert("Asset allocated successfully!");
      loadData();
    } catch (err) {
      alert("Failed to allocate asset.");
    }
  };

  const handleTransferAction = async (asset_id: string) => {
    const to_employee = prompt("Enter the New Employee ID for transfer:");
    if (!to_employee) return;
    
    try {
      await api.post(`it/transfers`, { asset_id, to_employee });
      alert("Asset transferred successfully!");
      loadData();
    } catch (err) {
      alert("Transfer failed. Please check the Employee ID.");
    }
  };

  const handleReturnAction = async (asset_id: string) => {
    if (!window.confirm("Mark this asset as returned to inventory?")) return;
    try {
      await api.post(`it/returns`, { asset_id, condition: "Good", damage_cost: 0 });
      alert("Asset returned successfully!");
      loadData();
    } catch (err) {
      alert("Action failed.");
    }
  };

  return (
    <div className="dashboard-container">
      <Header role="IT Department" title="Asset Management" />

      <div style={{ marginTop: "35px" }}>
        <h1 style={{ fontSize: "50px" }}>Asset Allocation</h1>
        <div className="subtitle">Assign assets to employees</div>
        {error && (
          <div style={{ color: '#ff453a', background: 'rgba(255,69,58,0.1)', padding: '10px', borderRadius: '8px', marginTop: '10px', border: '1px solid rgba(255,69,58,0.3)' }}>
            ⚠️ Error: {error}
          </div>
        )}
        {debugInfo && (
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>
            Debug: Emps: {debugInfo.empCount} | Assets: {debugInfo.assetCount} | Avail: {debugInfo.availableCount} | Allocs: {debugInfo.allocCount}
          </div>
        )}
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <GlassCard title="Allocate Asset" subtitle="Assign IT asset to employee">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={labelStyle}>Employee ID</label>
              <input
                placeholder="E001"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                style={inputStyle}
              />
              {selectedEmp && (
                <div style={{ fontSize: '11px', color: '#30d158', marginTop: '-10px', marginBottom: '10px' }}>
                  Target: {selectedEmp.name} ({selectedEmp.department})
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Select Available Asset</label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Choose Asset...</option>
                {availableAssets.map((a: any) => (
                  <option key={a.id || a.asset_id} value={a.asset_id || a.id}>{a.name} ({a.serial_number || a.id})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Allocation Type</label>
                <select value={allocationType} onChange={(e) => setAllocationType(e.target.value)} style={inputStyle}>
                  <option value="Permanent">Permanent</option>
                  <option value="Temporary">Temporary</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Condition</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)} style={inputStyle}>
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Location</label>
                <select value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle}>
                  <option value="Office">Office</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Verified Date</label>
                <input type="date" value={verifiedDate} onChange={(e) => setVerifiedDate(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Alloc. Date</label>
                <input type="date" value={allocationDate} onChange={(e) => setAllocationDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Exp. Return</label>
                <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <button style={btnStyle} onClick={handleAllocate}>Allocate Asset</button>
          </div>
        </GlassCard>

        <GlassCard title="Allocated Assets" subtitle="Current possession log">
          <div style={{ marginBottom: '20px' }}>
            <input
              placeholder="Search by Employee ID or Name..."
              value={searchEmpId}
              onChange={(e) => setSearchEmpId(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, width: '300px' }}
            />
          </div>
          <div style={{ overflowX: "auto", marginTop: "10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-light)", color: "var(--text-secondary)", fontSize: "13px" }}>
                  <th style={{ padding: "12px" }}>REF</th>
                  <th style={{ padding: "12px" }}>EMPLOYEE</th>
                  <th style={{ padding: "12px" }}>ASSET</th>
                  <th style={{ padding: "12px" }}>TYPE</th>
                  <th style={{ padding: "12px" }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No matching allocations.</td></tr>
                ) : (
                  filteredAllocations.map((a: any) => (
                    <tr key={a.allocation_id || a.id} style={{ borderBottom: "1px dotted var(--border-light)", color: "var(--text-primary)", fontSize: "13px" }}>
                      <td style={{ padding: "12px", color: '#0a84ff' }}>{a.allocation_id}</td>
                      <td style={{ padding: "12px" }}>
                        <div>{a.employee_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{a.employee_id}</div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div>{a.asset_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>ID: {a.asset_id}</div>
                      </td>
                      <td style={{ padding: "12px" }}>{a.allocation_type}</td>
                      <td style={{ padding: "12px" }}>{a.allocation_date}</td>
                      <td style={{ padding: "12px", display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedAllocation(a)}
                          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >
                          Overview
                        </button>
                        <button
                          onClick={() => handleTransferAction(a.asset_id)}
                          style={{ background: 'rgba(10, 132, 255, 0.1)', border: 'none', color: '#0a84ff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >
                          Transfer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Allocation Overview Modal */}
      {selectedAllocation && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}>
          <GlassCard style={{ width: '500px', padding: '30px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button 
              onClick={() => setSelectedAllocation(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px' }}
            >✕</button>
            
            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#0a84ff' }}>Allocation Overview</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Employee</label>
                <div style={{ fontSize: '14px' }}>{selectedAllocation.employee_name}</div>
                <div style={{ fontSize: '11px', color: '#555' }}>ID: {selectedAllocation.employee_id}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Asset</label>
                <div style={{ fontSize: '14px' }}>{selectedAllocation.asset_name}</div>
                <div style={{ fontSize: '11px', color: '#555' }}>Serial: {selectedAllocation.serial_number || 'N/A'}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Allocation Type</label>
                <div style={{ fontSize: '14px' }}>{selectedAllocation.allocation_type}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Date Allocated</label>
                <div style={{ fontSize: '14px' }}>{selectedAllocation.allocation_date}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Location</label>
                <div style={{ fontSize: '14px' }}>{selectedAllocation.location}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Current Condition</label>
                <div style={{ fontSize: '14px' }}>{selectedAllocation.asset_condition}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Exp. Return</label>
                <div style={{ fontSize: '14px' }}>{selectedAllocation.expected_return_date || 'N/A'}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Last Verified</label>
                <div style={{ fontSize: '14px' }}>{selectedAllocation.last_verified_date || 'Never'}</div>
              </div>
            </div>
            
            <button 
              className="apple-btn" 
              style={{ width: '100%', marginTop: '30px' }}
              onClick={() => setSelectedAllocation(null)}
            >
              Close Details
            </button>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-secondary)',
  marginBottom: '5px',
  display: 'block',
  textTransform: 'uppercase'
};

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
