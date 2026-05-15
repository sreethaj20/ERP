import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import GlassButton from "../../components/GlassButton";
import { FaBullhorn, FaBuilding, FaSitemap, FaCheckCircle, FaTrash, FaPlus, FaSave, FaGlobe, FaEnvelope, FaPhone } from "react-icons/fa";
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

    const loadData = async () => {
        setLoading(true);
        try {
            const [annRes, compRes, deptRes] = await Promise.all([
                api.get("announcements"),
                api.get("hr/company-profile"),
                api.get("hr/shifts") // Reuse shifts or get real depts
            ]);
            setAnnouncements(annRes.data);
            setCompany(compRes.data);
            
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

    return (
        <div className="dashboard-container">
            <Header role="HR" title="Organization Governance" />

            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', marginTop: '30px' }}>
                <TabButton active={activeTab === 'announcements'} onClick={() => setActiveTab('announcements')} icon={<FaBullhorn />} label="Announcements" />
                <TabButton active={activeTab === 'company'} onClick={() => setActiveTab('company')} icon={<FaBuilding />} label="Company Profile" />
                <TabButton active={activeTab === 'departments'} onClick={() => setActiveTab('departments')} icon={<FaSitemap />} label="Departments" />
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
