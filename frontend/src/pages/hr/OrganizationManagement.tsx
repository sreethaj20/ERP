import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import GlassButton from "../../components/GlassButton";
import { FaBullhorn, FaBuilding, FaSitemap, FaCheckCircle, FaTrash, FaPlus, FaSave, FaGlobe, FaEnvelope, FaPhone, FaShieldAlt } from "react-icons/fa";
import api from "../../api/apiClient";

export default function OrganizationManagement() {
    const [activeTab, setActiveTab] = useState("announcements");
    const [departments, setDepartments] = useState<any[]>([]);
    
    // Missing States Added
    const [loading, setLoading] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [company, setCompany] = useState<any>(null);
    const [annTitle, setAnnTitle] = useState("");
    const [annMessage, setAnnMessage] = useState("");
    const [annAudience, setAnnAudience] = useState("All");

    // Dept Form
    const [deptName, setDeptName] = useState("");
    const [deptCode, setDeptCode] = useState("");

    // Role Management States
    const [rolesList, setRolesList] = useState<any[]>([]);
    const [employeesReference, setEmployeesReference] = useState<any[]>([]);
    const [selectedEmpForRole, setSelectedEmpForRole] = useState("");
    const [selectedRoleName, setSelectedRoleName] = useState("employee");
    const [roleLoginEnabled, setRoleLoginEnabled] = useState(true);
    const [roleNotes, setRoleNotes] = useState("");
    const [isSavingRole, setIsSavingRole] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [annRes, compRes, deptRes, rolesRes, empsRes] = await Promise.all([
                api.get("announcements"),
                api.get("hr/company-profile"),
                api.get("hr/shifts"), // Reuse shifts or get real depts
                api.get("hr/roles").catch(() => ({ data: [] })),
                api.get("employees/reference").catch(() => ({ data: [] }))
            ]);
            setAnnouncements(annRes.data);
            setCompany(compRes.data);
            setRolesList(rolesRes.data || []);
            setEmployeesReference(empsRes.data || []);
            
            // Getting real departments
            const dRes = await api.get("hr/departments").catch(() => ({ data: [] }));
            setDepartments(dRes.data || []);
        } catch (err) {
            console.error("Failed to load org data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateDept = async () => {
        if (!deptName) return alert("Name is required");
        try {
            await api.post("hr/departments", { name: deptName, code: deptCode });
            alert("Department created!");
            setDeptName(""); setDeptCode("");
            loadData();
        } catch (err) {
            alert("Failed to create department");
        }
    };

    const handlePostAnnouncement = async () => {
        if (!annTitle || !annMessage) return alert("Title and Message required");
        try {
            await api.post("hr/announcements", {
                title: annTitle,
                message: annMessage,
                target_audience: annAudience
            });
            alert("Announcement posted successfully!");
            setAnnTitle("");
            setAnnMessage("");
            loadData();
            // Trigger local refresh for widgets
            window.dispatchEvent(new CustomEvent("announcement_posted"));
        } catch (err) {
            alert("Failed to post announcement");
        }
    };

    const handleDeleteAnnouncement = async (id: number) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await api.delete(`hr/announcements/${id}`);
            alert("Announcement deleted");
            loadData();
        } catch (err) {
            alert("Failed to delete announcement");
        }
    };

    const handleUpdateCompany = async () => {
        try {
            await api.put("hr/company-profile", company);
            alert("Company profile updated!");
            loadData();
        } catch (err) {
            alert("Failed to update profile");
        }
    };

    const handleAssignRole = async () => {
        if (!selectedEmpForRole) return alert("Select an employee");
        setIsSavingRole(true);
        try {
            const targetEmp = employeesReference.find(e => e.employee_id === selectedEmpForRole);
            await api.post("hr/roles", {
                employee_id: selectedEmpForRole,
                role_name: selectedRoleName,
                login_enabled: roleLoginEnabled,
                assigned_by: sessionStorage.getItem("userName") || "HR Admin",
                notes: roleNotes,
                is_active: true
            });
            alert("Role assigned successfully!");
            setSelectedEmpForRole("");
            setRoleNotes("");
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to assign role");
        } finally {
            setIsSavingRole(false);
        }
    };

    const handleUpdateRole = async (assignmentId: number | string, payload: any) => {
        try {
            await api.put(`hr/roles/${assignmentId}`, payload);
            alert("Role assignment updated!");
            loadData();
        } catch (err) {
            alert("Failed to update role assignment");
        }
    };

    return (
        <div className="dashboard-container">
            <Header role="HR" title="Organization Governance" />

            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', marginTop: '30px' }}>
                <TabButton active={activeTab === 'announcements'} onClick={() => setActiveTab('announcements')} icon={<FaBullhorn />} label="Announcements" />
                <TabButton active={activeTab === 'company'} onClick={() => setActiveTab('company')} icon={<FaBuilding />} label="Company Profile" />
                <TabButton active={activeTab === 'departments'} onClick={() => setActiveTab('departments')} icon={<FaSitemap />} label="Departments" />
                <TabButton active={activeTab === 'roles'} onClick={() => setActiveTab('roles')} icon={<FaShieldAlt />} label="Role Gating" />
            </div>

            {activeTab === 'announcements' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
                    <GlassCard title="Broadcast Update" subtitle="Post new announcement to staff">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                            <input className="apple-input" placeholder="Title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} />
                            <textarea
                                className="apple-input"
                                placeholder="Write your message here..."
                                value={annMessage}
                                onChange={(e) => setAnnMessage(e.target.value)}
                                style={{ minHeight: '120px', resize: 'vertical' }}
                            />
                            <select className="apple-input" value={annAudience} onChange={(e) => setAnnAudience(e.target.value)}>
                                <option value="All">All Staff</option>
                                <option value="Manager">Managers Only</option>
                                <option value="IT">IT Department</option>
                                <option value="Finance">Finance Department</option>
                            </select>
                            <GlassButton onClick={handlePostAnnouncement}>
                                <FaPlus /> Post Announcement
                            </GlassButton>
                        </div>
                    </GlassCard>

                    <GlassCard title="Announcement History" subtitle="Recent broadcasts and staff updates">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                            {announcements.map((ann) => (
                                <div key={ann.id} style={annItemStyle}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '15px' }}>{ann.title}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{new Date(ann.created_at).toLocaleString()} · To: {ann.target_audience}</div>
                                        </div>
                                        <button onClick={() => handleDeleteAnnouncement(ann.id)} style={deleteBtnStyle}><FaTrash /></button>
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>{ann.message || ann.content}</div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            )}

            {activeTab === 'departments' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                    <GlassCard title="New Division" subtitle="Register a company department">
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                            <input className="apple-input" placeholder="Department Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
                            <input className="apple-input" placeholder="Dept Code (e.g. ENG-01)" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
                            <GlassButton onClick={handleCreateDept}><FaPlus /> Add Department</GlassButton>
                         </div>
                    </GlassCard>

                    <GlassCard title="Organization Hierarchy" subtitle="Active departments and centers">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '15px' }}>
                            {departments.map((d: any) => (
                                <div key={d.id} style={deptCardStyle}>
                                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>🏢</div>
                                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{d.name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>{d.code ||'—'}</div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            )}

            {activeTab === 'company' && company && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '24px' }}>
                    <GlassCard title="Branding" subtitle="Organization Identity">
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                           <div style={{ width: '100px', height: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '25%', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                                {company.logo_url ? <img src={company.logo_url} style={{ width: '80%', height: '80%', objectFit: 'contain' }} /> : <FaBuilding color="var(--accent-blue)" />}
                           </div>
                           <h2 style={{ fontSize: '20px', fontWeight: '800' }}>{company.company_name}</h2>
                           <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{company.company_tagline || "Workplace management system"}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={infoRow}><FaGlobe /> {company.website || "No website set"}</div>
                            <div style={infoRow}><FaEnvelope /> {company.contact_email || "No email set"}</div>
                            <div style={infoRow}><FaPhone /> {company.contact_phone || "No phone set"}</div>
                        </div>
                    </GlassCard>

                    <GlassCard title="Profile Editor" subtitle="Update organizational and regulatory details">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                            <FormGroup label="Company Name" value={company.company_name} onChange={(v: string) => setCompany({ ...company, company_name: v })} />
                            <FormGroup label="Tagline" value={company.company_tagline} onChange={(v: string) => setCompany({ ...company, company_tagline: v })} />
                            <FormGroup label="Contact Email" value={company.contact_email} onChange={(v: string) => setCompany({ ...company, contact_email: v })} />
                            <FormGroup label="Contact Phone" value={company.contact_phone} onChange={(v: string) => setCompany({ ...company, contact_phone: v })} />
                            <FormGroup label="Website URL" value={company.website} onChange={(v: string) => setCompany({ ...company, website: v })} />
                            <FormGroup label="Industry" value={company.company_industry} onChange={(v: string) => setCompany({ ...company, company_industry: v })} />
                            
                            <div style={{ gridColumn: 'span 2' }}>
                                <FormGroup label="Address Line 1" value={company.address_line1} onChange={(v: string) => setCompany({ ...company, address_line1: v })} />
                            </div>
                            
                            <FormGroup label="City" value={company.city} onChange={(v: string) => setCompany({ ...company, city: v })} />
                            <FormGroup label="Pincode" value={company.pincode} onChange={(v: string) => setCompany({ ...company, pincode: v })} />
                            
                            <div style={{ borderTop: '1px solid var(--border-light)', gridColumn: 'span 2', margin: '10px 0', paddingTop: '10px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Regulatory Info</span>
                            </div>

                            <FormGroup label="GSTIN" value={company.gst_number} onChange={(v: string) => setCompany({ ...company, gst_number: v })} />
                            <FormGroup label="PAN" value={company.pan_number} onChange={(v: string) => setCompany({ ...company, pan_number: v })} />
                        </div>
                        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
                            <GlassButton onClick={handleUpdateCompany} style={{ width: '100%' }}>
                                <FaSave /> Save Changes
                            </GlassButton>
                        </div>
                    </GlassCard>
                </div>
            )}

            {activeTab === 'roles' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                    <GlassCard title="Assign Permission" subtitle="Gate access for employee roles">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Select Employee</label>
                                <select 
                                    className="apple-input" 
                                    value={selectedEmpForRole} 
                                    onChange={(e) => setSelectedEmpForRole(e.target.value)}
                                >
                                    <option value="">-- Choose Employee --</option>
                                    {employeesReference.map((e: any) => (
                                        <option key={e.id} value={e.employee_id}>
                                            {e.name} ({e.employee_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Assign Role</label>
                                <select 
                                    className="apple-input" 
                                    value={selectedRoleName} 
                                    onChange={(e) => setSelectedRoleName(e.target.value)}
                                >
                                    <option value="employee">Standard Employee</option>
                                    <option value="teamleader">Team Leader</option>
                                    <option value="recruiter">Recruiter</option>
                                    <option value="it">IT Department</option>
                                    <option value="hr">HR Manager</option>
                                    <option value="manager">General Manager</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                                <input 
                                    type="checkbox" 
                                    id="role-login-chk"
                                    checked={roleLoginEnabled} 
                                    onChange={(e) => setRoleLoginEnabled(e.target.checked)} 
                                />
                                <label htmlFor="role-login-chk" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Login Enabled</label>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Assignment Notes</label>
                                <input 
                                    className="apple-input" 
                                    placeholder="e.g. Promoted to Team Leader" 
                                    value={roleNotes} 
                                    onChange={(e) => setRoleNotes(e.target.value)} 
                                />
                            </div>

                            <GlassButton onClick={handleAssignRole} disabled={isSavingRole}>
                                <FaPlus /> {isSavingRole ? "Assigning..." : "Assign Permission"}
                            </GlassButton>
                        </div>
                    </GlassCard>

                    <GlassCard title="Active Role Assignments" subtitle="Authorized company roles & access levels">
                        <div style={{ marginTop: '15px', maxHeight: '550px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left', color: 'var(--text-tertiary)' }}>
                                        <th style={{ padding: '10px' }}>Employee</th>
                                        <th style={{ padding: '10px' }}>Role</th>
                                        <th style={{ padding: '10px' }}>Login</th>
                                        <th style={{ padding: '10px' }}>Status</th>
                                        <th style={{ padding: '10px' }}>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rolesList.map((r: any) => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '10px' }}>
                                                <div style={{ fontWeight: '600' }}>{r.employee_name || "N/A"}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{r.employee_id}</div>
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <select 
                                                    value={r.role_name} 
                                                    onChange={(e) => handleUpdateRole(r.assignment_id || r.id, { role_name: e.target.value })}
                                                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', padding: '4px' }}
                                                >
                                                    <option value="employee">employee</option>
                                                    <option value="teamleader">teamleader</option>
                                                    <option value="recruiter">recruiter</option>
                                                    <option value="it">it</option>
                                                    <option value="hr">hr</option>
                                                    <option value="manager">manager</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <button 
                                                    onClick={() => handleUpdateRole(r.assignment_id || r.id, { login_enabled: !r.login_enabled })}
                                                    style={{ 
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: r.login_enabled ? '#30d158' : '#ff453a', fontWeight: 'bold' 
                                                    }}
                                                >
                                                    {r.login_enabled ? "Enabled" : "Disabled"}
                                                </button>
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <button 
                                                    onClick={() => handleUpdateRole(r.assignment_id || r.id, { is_active: !r.is_active })}
                                                    style={{ 
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: r.is_active ? '#30d158' : '#ff9f0a', fontWeight: 'bold' 
                                                    }}
                                                >
                                                    {r.is_active ? "Active" : "Suspended"}
                                                </button>
                                            </td>
                                            <td style={{ padding: '10px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                                                {r.notes || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                    {rolesList.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)' }}>No active role assignments found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}


const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        style={{
            padding: '12px 24px', borderRadius: '14px', border: '1px solid var(--border-light)',
            background: active ? 'rgba(10, 132, 255, 0.15)' : 'rgba(255,255,255,0.03)',
            color: active ? '#0a84ff' : 'var(--text-secondary)',
            fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
            transition: 'all 0.2s ease'
        }}
    >
        {icon} {label}
    </button>
);

const FormGroup = ({ label, value, onChange }: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</label>
        <input className="apple-input" value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
);

const annItemStyle: React.CSSProperties = {
    padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)'
};

const deleteBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', fontSize: '14px', padding: '5px'
};

const infoRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px'
};

const deptCardStyle: React.CSSProperties = {
    padding: '20px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', textAlign: 'center'
};
