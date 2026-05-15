import React, { useState, useEffect, useRef } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
  FaBuilding, FaMapMarkerAlt, FaEnvelope, FaPhone, FaGlobe,
  FaIdCard, FaSave, FaSpinner, FaUserTie, FaClock,
  FaMoneyBillWave, FaCalendarAlt, FaFileUpload,
  FaLinkedin, FaInstagram, FaTwitter, FaYoutube, FaPen
} from "react-icons/fa";
import { getCompanyProfile, updateCompanyProfile } from "../../services/managerService";
import { syncCompanyProfile } from "../../utils/companyUtils";

interface CompanyData {
  company_name: string;
  logo_url: string;
  company_tagline: string;
  company_type: string;
  company_industry: string;
  website: string;
  contact_email: string;
  contact_phone: string;
  alternate_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  gst_number: string;
  pan_number: string;
  cin_number: string;
  tan_number: string;
  registration_number: string;
  registration_date: string;
  license_expiry_date: string;
  tax_id: string;
  ceo_name: string;
  hr_head_name: string;
  hr_email: string;
  hr_contact_number: string;
  finance_head_name: string;
  support_email: string;
  support_contact_number: string;
  office_start_time: string;
  office_end_time: string;
  working_days: string;
  weekly_holidays: string;
  leave_policy_url: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  upi_id: string;
  linkedin_url: string;
  instagram_url: string;
  twitter_url: string;
  youtube_url: string;
}

export default function CompanyProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("identity");
  const [formData, setFormData] = useState<CompanyData>({
    company_name: "", logo_url: "", company_tagline: "", company_type: "", company_industry: "",
    website: "", contact_email: "", contact_phone: "", alternate_phone: "",
    address_line1: "", address_line2: "", city: "", district: "", state: "", country: "", pincode: "",
    gst_number: "", pan_number: "", cin_number: "", tan_number: "", registration_number: "",
    registration_date: "", license_expiry_date: "", tax_id: "",
    ceo_name: "", hr_head_name: "", hr_email: "", hr_contact_number: "",
    finance_head_name: "", support_email: "", support_contact_number: "",
    office_start_time: "", office_end_time: "", working_days: "", weekly_holidays: "", leave_policy_url: "",
    bank_name: "", account_holder_name: "", account_number: "", ifsc_code: "", branch_name: "", upi_id: "",
    linkedin_url: "", instagram_url: "", twitter_url: "", youtube_url: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getCompanyProfile();
      if (data) setFormData(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error("Failed to fetch company profile", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePolicyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, leave_policy_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateCompanyProfile(formData);
      syncCompanyProfile({
        company_name: formData.company_name,
        company_logo: formData.logo_url,
        company_tagline: formData.company_tagline
      });
      alert("Company profile updated and synchronized successfully!");
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Failed to synchronize profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'identity', label: 'Identity', icon: <FaBuilding /> },
    { id: 'legal', label: 'Legal & Tax', icon: <FaIdCard /> },
    { id: 'management', label: 'Leadership', icon: <FaUserTie /> },
    { id: 'policy', label: 'Operations', icon: <FaClock /> },
    { id: 'banking', label: 'Banking', icon: <FaMoneyBillWave /> },
    { id: 'social', label: 'Social', icon: <FaGlobe /> },
  ];

  if (loading) return <div className="flex-center-full"><FaSpinner className="spin" size={30} /></div>;

  return (
    <div className="dashboard-container" style={{ position: 'relative', overflowX: 'hidden' }}>
      <Header role="Manager" title="Organization Control" />

      {/* Decorative Background Elements */}
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(10,132,255,0.15) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: -1 }}></div>
      <div style={{ position: 'absolute', bottom: '100px', left: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(100,210,255,0.1) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: -1 }}></div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', background: 'linear-gradient(135deg, #fff 0%, #a2a2a2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
            Company Profile
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Configure your organization's digital identity and compliance details.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '30px', alignItems: 'start' }}>

          {/* Navigation Sidebar */}
          <div style={{ position: 'sticky', top: '100px' }}>
            <GlassCard style={{ padding: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 18px', borderRadius: '12px', border: 'none',
                      background: activeTab === tab.id ? 'rgba(10,132,255,0.15)' : 'transparent',
                      color: activeTab === tab.id ? '#0a84ff' : 'var(--text-secondary)',
                      cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      textAlign: 'left', fontWeight: activeTab === tab.id ? '700' : '500',
                      fontSize: '14px', width: '100%',
                    }}
                  >
                    <span style={{ fontSize: '18px', color: activeTab === tab.id ? '#0a84ff' : 'var(--text-tertiary)' }}>{tab.icon}</span>
                    {tab.label}
                    {activeTab === tab.id && <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#0a84ff', boxShadow: '0 0 10px #0a84ff' }}></div>}
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Main Content Area */}
          <form onSubmit={handleSubmit}>
            <GlassCard style={{ minHeight: '600px', padding: '40px' }}>
              {activeTab === 'identity' && (
                <div className="fade-in">
                  <SectionTitle title="Branding & Identity" subtitle="Primary company identifiers and logos" />
                  <div style={{ display: 'flex', gap: '40px', marginBottom: '40px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '160px', height: '160px', borderRadius: '24px',
                        background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                      }}>
                        {formData.logo_url ? <img src={formData.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <FaBuilding size={40} color="rgba(255,255,255,0.1)" />}
                      </div>
                      <button type="button" onClick={() => fileInputRef.current?.click()} style={{ position: 'absolute', bottom: '-10px', right: '-10px', width: '36px', height: '36px', borderRadius: '10px', background: '#0a84ff', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(10,132,255,0.4)' }}>
                        <FaPen size={12} />
                      </button>
                      <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleLogoUpload} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Company Formal Name</label>
                      <input type="text" name="company_name" value={formData.company_name || ""} onChange={handleChange} className="glass-input" style={{ fontSize: '20px', fontWeight: '700', padding: '15px' }} />
                      <div style={{ marginTop: '15px' }}>
                        <label style={labelStyle}>Corporate Tagline</label>
                        <input type="text" name="company_tagline" value={formData.company_tagline || ""} onChange={handleChange} className="glass-input" placeholder="Innovating for the next generation" />
                      </div>
                    </div>
                  </div>

                  <div className="grid-2" style={{ gap: '24px' }}>
                    <InputGroup label="Industry Vertical" name="company_industry" value={formData.company_industry} onChange={handleChange} icon={<FaBuilding />} />
                    <InputGroup label="Organization Type" name="company_type" value={formData.company_type} onChange={handleChange} icon={<FaBuilding />} />
                    <InputGroup label="Official Website" name="website" value={formData.website} onChange={handleChange} icon={<FaGlobe />} />
                    <InputGroup label="Primary Email" name="contact_email" value={formData.contact_email} onChange={handleChange} icon={<FaEnvelope />} />
                    <InputGroup label="Main Office Phone" name="contact_phone" value={formData.contact_phone} onChange={handleChange} icon={<FaPhone />} />
                    <InputGroup label="Secondary Phone" name="alternate_phone" value={formData.alternate_phone} onChange={handleChange} icon={<FaPhone />} />
                  </div>

                  <div style={{ marginTop: '40px' }}>
                    <SectionTitle title="Mailing Address" subtitle="Physical headquarters location" />
                    <div className="form-group">
                      <label style={labelStyle}>Street Address</label>
                      <input type="text" name="address_line1" value={formData.address_line1 || ""} onChange={handleChange} className="glass-input" placeholder="Line 1" style={{ marginBottom: '12px' }} />
                      <input type="text" name="address_line2" value={formData.address_line2 || ""} onChange={handleChange} className="glass-input" placeholder="Line 2 (Suite, Floor, etc.)" />
                    </div>
                    <div className="grid-4" style={{ gap: '15px', marginTop: '15px' }}>
                      <InputGroup label="City" name="city" value={formData.city} onChange={handleChange} />
                      <InputGroup label="State" name="state" value={formData.state} onChange={handleChange} />
                      <InputGroup label="ZIP / Pincode" name="pincode" value={formData.pincode} onChange={handleChange} />
                      <InputGroup label="Country" name="country" value={formData.country} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'legal' && (
                <div className="fade-in">
                  <SectionTitle title="Compliance & Tax" subtitle="Registered legal and regulatory identifiers" />
                  <div className="grid-2" style={{ gap: '30px' }}>
                    <InputGroup label="GSTIN Number" name="gst_number" value={formData.gst_number} onChange={handleChange} icon={<FaIdCard />} />
                    <InputGroup label="Permanent Account (PAN)" name="pan_number" value={formData.pan_number} onChange={handleChange} icon={<FaIdCard />} />
                    <InputGroup label="Corporate Info (CIN)" name="cin_number" value={formData.cin_number} onChange={handleChange} icon={<FaIdCard />} />
                    <InputGroup label="Tax Deduction (TAN)" name="tan_number" value={formData.tan_number} onChange={handleChange} icon={<FaIdCard />} />
                    <InputGroup label="Trade / Reg Number" name="registration_number" value={formData.registration_number} onChange={handleChange} icon={<FaIdCard />} />
                    <InputGroup label="Registration Date" type="date" name="registration_date" value={formData.registration_date} onChange={handleChange} icon={<FaCalendarAlt />} />
                  </div>
                </div>
              )}

              {activeTab === 'management' && (
                <div className="fade-in">
                  <SectionTitle title="Executive Leadership" subtitle="Key organization stakeholders and points of contact" />
                  <div className="grid-1" style={{ gap: '24px' }}>
                    <div style={{ background: 'rgba(10,132,255,0.05)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(10,132,255,0.1)' }}>
                      <InputGroup label="Chief Executive Officer (CEO)" name="ceo_name" value={formData.ceo_name} onChange={handleChange} icon={<FaUserTie />} />
                    </div>
                    <div className="grid-2" style={{ gap: '24px', marginTop: '10px' }}>
                      <InputGroup label="Head of Human Resources" name="hr_head_name" value={formData.hr_head_name} onChange={handleChange} icon={<FaUserTie />} />
                      <InputGroup label="HR Direct Contact" name="hr_contact_number" value={formData.hr_contact_number} onChange={handleChange} icon={<FaPhone />} />
                      <div style={{ gridColumn: 'span 2' }}>
                        <InputGroup label="HR Official Email" name="hr_email" value={formData.hr_email} onChange={handleChange} icon={<FaEnvelope />} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'policy' && (
                <div className="fade-in">
                  <SectionTitle title="Operational Policies" subtitle="Default office timings and shift configurations" />
                  <div className="grid-2" style={{ gap: '30px' }}>
                    <InputGroup label="Office Start Time" type="time" name="office_start_time" value={formData.office_start_time} onChange={handleChange} icon={<FaClock />} />
                    <InputGroup label="Office Closing Time" type="time" name="office_end_time" value={formData.office_end_time} onChange={handleChange} icon={<FaClock />} />
                    <InputGroup label="Total Working Days" name="working_days" value={formData.working_days} onChange={handleChange} icon={<FaCalendarAlt />} />
                    <InputGroup label="Standard Weekly Offs" name="weekly_holidays" value={formData.weekly_holidays} onChange={handleChange} icon={<FaCalendarAlt />} />
                  </div>
                </div>
              )}

              {activeTab === 'banking' && (
                <div className="fade-in">
                  <SectionTitle title="Financial & Treasury" subtitle="Organizational bank accounts for payroll" />
                  <div className="grid-2" style={{ gap: '24px' }}>
                    <InputGroup label="Principal Bank" name="bank_name" value={formData.bank_name} onChange={handleChange} icon={<FaMoneyBillWave />} />
                    <InputGroup label="Account Identification" name="account_number" value={formData.account_number} onChange={handleChange} />
                    <InputGroup label="Bank Routing / IFSC Code" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} />
                    <InputGroup label="Registered Branch" name="branch_name" value={formData.branch_name} onChange={handleChange} />
                  </div>
                </div>
              )}

              {activeTab === 'social' && (
                <div className="fade-in">
                  <SectionTitle title="Social Footprint" subtitle="External links to organization's channels" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <InputGroup label="LinkedIn Corporate" icon={<FaLinkedin />} name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} />
                    <InputGroup label="X / Twitter Handle" icon={<FaTwitter />} name="twitter_url" value={formData.twitter_url} onChange={handleChange} />
                    <InputGroup label="Instagram Profile" icon={<FaInstagram />} name="instagram_url" value={formData.instagram_url} onChange={handleChange} />
                    <InputGroup label="Youtube Channel" icon={<FaYoutube />} name="youtube_url" value={formData.youtube_url} onChange={handleChange} />
                  </div>
                </div>
              )}

              <div style={{ marginTop: 'auto', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="apple-btn"
                  style={{
                    background: '#0a84ff', color: '#fff',
                    padding: '14px 40px', fontSize: '15px', fontWeight: '700',
                    borderRadius: '14px', border: 'none', cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(10,132,255,0.3)',
                    display: 'flex', alignItems: 'center', gap: '10px'
                  }}
                >
                  {saving ? <FaSpinner className="spin" /> : <FaSave />}
                  {saving ? "Saving..." : "Synchronize Profile"}
                </button>
              </div>
            </GlassCard>
          </form>
        </div>
      </div>
    </div>
  );
}

const SectionTitle = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <div style={{ marginBottom: '30px' }}>
    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>{title}</h3>
    {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{subtitle}</p>}
  </div>
);

const InputGroup = ({ label, icon, name, value, onChange, placeholder, type = "text" }: any) => (
  <div className="form-group">
    <label style={labelStyle}>
      {icon && <span style={iconStyle}>{icon}</span>} {label}
    </label>
    <input type={type} name={name} value={value || ""} onChange={onChange} className="glass-input" placeholder={placeholder} />
  </div>
);

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginBottom: "8px",
  fontWeight: "500",
  fontSize: "12px",
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px"
};

const iconStyle: React.CSSProperties = {
  marginRight: "8px",
  color: "var(--accent-blue)",
  fontSize: "13px"
};
