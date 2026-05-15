import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getAssets, createMaintenanceLog, createTransfer, processReturn, updateITAsset } from "../../services/itService";
import { getEmployees } from "../../services/hrService";
import { FaWrench, FaExchangeAlt, FaUndo, FaTrash } from "react-icons/fa";

export default function AssetLifecycle() {
    const [assets, setAssets] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    const loadData = async () => {
        try {
            const [assetData, empData] = await Promise.all([
                getAssets(),
                getEmployees()
            ]);
            setAssets(assetData || []);
            setEmployees(empData || []);
        } catch (error) {
            console.error("Error loading asset lifecycle data:", error);
        }
    };

    // Maintenance State
    const [maintAsset, setMaintAsset] = useState("");
    const [issue, setIssue] = useState("");
    const [vendor, setVendor] = useState("");
    const [cost, setCost] = useState("");

    // Transfer State
    const [transAsset, setTransAsset] = useState("");
    const [toEmp, setToEmp] = useState("");

    // Return State
    const [retAsset, setRetAsset] = useState("");
    const [condition, setCondition] = useState("Good");
    const [damageCost, setDamageCost] = useState("0");

    useEffect(() => {
        loadData();
    }, []);

    const handleMaintenance = async () => {
        if (!maintAsset || !issue) return;
        await createMaintenanceLog({
            asset_id: maintAsset,
            issue_description: issue,
            service_vendor: vendor,
            maintenance_cost: cost
        });
        setMaintAsset(""); setIssue(""); setVendor(""); setCost("");
        await loadData();
        alert("Asset sent for maintenance!");
    };

    const handleTransfer = async () => {
        if (!transAsset || !toEmp) return;
        await createTransfer({
            asset_id: transAsset,
            to_employee: toEmp
        });
        setTransAsset(""); setToEmp("");
        await loadData();
        alert("Asset transfer recorded!");
    };

    const handleReturn = async () => {
        if (!retAsset) return;
        await processReturn(retAsset, condition, parseFloat(damageCost) || 0);
        setRetAsset("");
        await loadData();
        alert("Asset return processed!");
    };

    const handleDisposal = async (id: string, type: string) => {
        if (!window.confirm(`Are you sure you want to mark this asset as ${type}?`)) return;
        await updateITAsset(id, { status: type });
        await loadData();
        alert(`Asset marked as ${type}`);
    };

    return (
        <div className="dashboard-container">
            <Header role="IT Admin" title="Asset Lifecycle" />

            <div style={{ marginTop: "35px", marginBottom: '30px' }}>
                <h1 style={{ fontSize: "50px" }}>Lifecycle Management</h1>
                <div className="subtitle">Maintenance, Transfers, Returns & Disposal</div>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                {/* 1. Maintenance */}
                <GlassCard title="Maintenance" subtitle="Send device for repair">
                    <div style={formGroup}>
                        <label style={labelStyle}>Select Asset</label>
                        <select value={maintAsset} onChange={(e) => setMaintAsset(e.target.value)} style={inputStyle}>
                            <option value="">Select Asset...</option>
                            {assets.filter((a: any) => a.status !== 'Maintenance').map((a: any) => <option key={a.id} value={a.asset_id || a.id}>{a.name} ({a.asset_id || a.id})</option>)}
                        </select>
                        <label style={labelStyle}>Issue Description</label>
                        <input placeholder="Describe hardware issue..." value={issue} onChange={(e) => setIssue(e.target.value)} style={inputStyle} />
                        <label style={labelStyle}>Vendor / Technician</label>
                        <input placeholder="Service Center name..." value={vendor} onChange={(e) => setVendor(e.target.value)} style={inputStyle} />
                        <label style={labelStyle}>Estimated Cost</label>
                        <input type="number" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} style={inputStyle} />
                        <button className="apple-btn" onClick={handleMaintenance} style={{ backgroundColor: '#ff9f0a', color: 'white' }}>
                            <FaWrench style={{ marginRight: '8px' }} /> Record Maintenance
                        </button>
                    </div>
                </GlassCard>

                {/* 2. Transfer */}
                <GlassCard title="Transfer" subtitle="Reassign between employees">
                    <div style={formGroup}>
                        <label style={labelStyle}>Asset to Transfer</label>
                        <select value={transAsset} onChange={(e) => setTransAsset(e.target.value)} style={inputStyle}>
                            <option value="">Select Asset...</option>
                            {assets.filter((a: any) => a.status === 'Allocated').map((a: any) => <option key={a.id} value={a.asset_id || a.id}>{a.name} ({a.asset_id || a.id})</option>)}
                        </select>
                        <label style={labelStyle}>New Employee</label>
                        <select value={toEmp} onChange={(e) => setToEmp(e.target.value)} style={inputStyle}>
                            <option value="">Select Employee...</option>
                            {employees.map((e: any) => <option key={e.employee_id || e.id} value={e.employee_id || e.id}>{e.name} ({e.employee_id || e.id})</option>)}
                        </select>
                        <button className="apple-btn" onClick={handleTransfer} style={{ backgroundColor: '#5e5ce6' }}>
                            <FaExchangeAlt style={{ marginRight: '8px' }} /> Transfer Asset
                        </button>
                    </div>
                </GlassCard>

                {/* 3. Return */}
                <GlassCard title="Return" subtitle="Process device intake">
                    <div style={formGroup}>
                        <label style={labelStyle}>Asset Returning</label>
                        <select value={retAsset} onChange={(e) => setRetAsset(e.target.value)} style={inputStyle}>
                            <option value="">Select Asset...</option>
                            {assets.filter((a: any) => a.status === 'Allocated' || a.status === 'Maintenance').map((a: any) => <option key={a.id} value={a.asset_id || a.id}>{a.name} ({a.asset_id || a.id})</option>)}
                        </select>
                        <label style={labelStyle}>Received Condition</label>
                        <select value={condition} onChange={(e) => setCondition(e.target.value)} style={inputStyle}>
                            <option value="Good">Good</option>
                            <option value="Damaged">Damaged</option>
                            <option value="Minor Scratches">Minor Scratches</option>
                        </select>
                        <input placeholder="Damage Cost (if any)" type="number" value={damageCost} onChange={(e) => setDamageCost(e.target.value)} style={inputStyle} />
                        <button className="apple-btn" onClick={handleReturn} style={{ backgroundColor: '#30d158' }}>
                            <FaUndo style={{ marginRight: '8px' }} /> Confirm Return
                        </button>
                    </div>
                </GlassCard>
            </div>

            <div style={{ marginTop: '40px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>Disposal & Retirement</h2>
                <div className="grid-3">
                    {assets.filter((a: any) => a.status !== 'Retired' && a.status !== 'Disposed').slice(0, 6).map((a: any) => (
                        <GlassCard key={a.id} title={a.name} subtitle={`Status: ${a.status}`}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                                ID: {a.id} | Serial: {a.serial_number}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className="apple-btn"
                                    style={{ flex: 1, backgroundColor: 'rgba(255, 69, 58, 0.1)', color: '#ff453a', fontSize: '11px' }}
                                    onClick={() => handleDisposal(a.id, "Retired")}
                                >
                                    <FaTrash /> Retire
                                </button>
                                <button
                                    className="apple-btn"
                                    style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', fontSize: '11px' }}
                                    onClick={() => handleDisposal(a.id, "Sold/Scrap")}
                                >
                                    Disposal
                                </button>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </div>
    );
}

const formGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' };
const labelStyle = { fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' };
const inputStyle = {
    width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(0,0,0,0.4)", color: "white"
};
const btnStyle: React.CSSProperties = {
    width: "100%", padding: "12px", borderRadius: "12px", border: "none",
    background: "#00BFFF", color: "white", fontWeight: "600", cursor: "pointer",
};
