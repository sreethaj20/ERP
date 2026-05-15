import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getOnboardingByEmpId } from "../../utils/storage";
import {
  FaFilePdf, FaFileAlt, FaFileContract,
  FaDownload, FaShieldAlt, FaInfoCircle,
  FaCheckCircle, FaExclamationTriangle,
  FaEye, FaFileInvoice, FaMoneyCheckAlt,
  FaIdCard, FaLaptop
} from "react-icons/fa";
import { getFileUrl, getEmployeeDocuments } from "../../utils/storage";

export default function EmployeeDocuments() {
  const userId = sessionStorage.getItem("userId") || "";
  const [onboarding, setOnboarding] = useState<any>(null);
  const [dynamicDocs, setDynamicDocs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("personal");
  useEffect(() => {
    const loadData = async () => {
      const obData = await getOnboardingByEmpId(userId);
      if (obData) setOnboarding(obData);
      
      const dynData = await getEmployeeDocuments();
      setDynamicDocs(dynData);
    };
    loadData();
  }, [userId]);

  const handleDownload = (url: string, filename: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = getFileUrl(url);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDocStatus = () => {
    const s = onboarding?.document_verification_status || 'pending';
    if (s === 'verified') return { label: 'VERIFIED', color: '#30d158', bg: 'rgba(48,209,88,0.1)', icon: <FaCheckCircle size={8} /> };
    if (s === 'rejected') return { label: 'REJECTED', color: '#ff453a', bg: 'rgba(255,69,58,0.1)', icon: <FaExclamationTriangle size={8} /> };
    return { label: 'PENDING', color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', icon: <FaInfoCircle size={8} /> };
  };

  const personalDocs = [
    { id: 'offer', title: "Signed Offer Letter", subtitle: "Your executed employment offer", url: onboarding?.offer_letter_signed_url, icon: <FaFileContract color="#0a84ff" />, size: '1.2 MB', status: getDocStatus() },
    { id: 'aadhaar', title: "Aadhaar Card", subtitle: "Government identity proof", url: onboarding?.aadhaar_file_url, icon: <FaFileAlt color="#30d158" />, size: '0.8 MB', status: getDocStatus() },
    { id: 'pan', title: "PAN Card", subtitle: "Tax identity document", url: onboarding?.pan_file_url, icon: <FaFileAlt color="#ff9f0a" />, size: '0.5 MB', status: getDocStatus() },
    { id: 'education', title: "Education Certificate", subtitle: "Academic degree/certificates", url: onboarding?.education_certificate_url, icon: <FaFilePdf color="#bf5af2" />, size: '2.1 MB', status: getDocStatus() },
    { id: 'resume', title: "Latest Resume", subtitle: "Profile shared during hiring", url: onboarding?.resume_url, icon: <FaFileAlt color="#64d2ff" />, size: '0.4 MB', status: getDocStatus() },
    { id: 'bank', title: "Bank Proof", subtitle: "Passbook or cancelled cheque", url: onboarding?.bank_proof_url, icon: <FaFileContract color="#ff375f" />, size: '0.9 MB', status: getDocStatus() },
    { id: 'form16', title: "Form 16", subtitle: "Annual Tax Certificate", url: "#", icon: <FaFileInvoice color="#ff9f0a" />, size: '1.5 MB', status: { label: 'AVAILABLE', color: '#0a84ff', bg: 'rgba(10,132,255,0.1)', icon: <FaCheckCircle size={8} /> } },
  ].filter(doc => doc.url || doc.id === 'form16'); // Only show if they exist

  const companyDocs = [
    { title: "Employee Handbook", subtitle: "V3.2 • 2024 Edition", icon: <FaFileContract color="#0a84ff" />, size: '4.5 MB', status: { label: 'VIEW ONLY', color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', icon: <FaEye size={8} /> }, hideDownload: true },
    { title: "IT Security Policy", subtitle: "Data protection guidelines", icon: <FaShieldAlt color="#ff375f" />, size: '1.1 MB', status: { label: 'VIEW ONLY', color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', icon: <FaEye size={8} /> }, hideDownload: true },
    { title: "Leave & Attendance Policy", subtitle: "Rules for leave & shifts", icon: <FaFileAlt color="#30d158" />, size: '0.7 MB', status: { label: 'VIEW ONLY', color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', icon: <FaEye size={8} /> }, hideDownload: true },
    { title: "Code of Conduct", subtitle: "Professional ethics guide", icon: <FaInfoCircle color="#ff9f0a" />, size: '0.5 MB', status: { label: 'VIEW ONLY', color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', icon: <FaEye size={8} /> }, hideDownload: true },
    { title: "Travel Reimbursement", subtitle: "Corp travel expense rules", icon: <FaFileAlt color="#bf5af2" />, size: '0.9 MB', status: { label: 'VIEW ONLY', color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', icon: <FaEye size={8} /> }, hideDownload: true },
  ];

  const defaultForms = [
    { title: "Leave Application Form", subtitle: "Physical leave request form", icon: <FaFileAlt color="#0a84ff" />, size: '0.2 MB', status: { label: 'DEFAULT', color: '#64d2ff', bg: 'rgba(100,210,255,0.1)', icon: <FaFileAlt size={8} /> } },
    { title: "Expense Claim Form", subtitle: "Reimbursement template", icon: <FaMoneyCheckAlt color="#30d158" />, size: '0.3 MB', status: { label: 'DEFAULT', color: '#64d2ff', bg: 'rgba(100,210,255,0.1)', icon: <FaFileAlt size={8} /> } },
    { title: "ID Card Request", subtitle: "Lost or new ID request", icon: <FaIdCard color="#bf5af2" />, size: '0.1 MB', status: { label: 'DEFAULT', color: '#64d2ff', bg: 'rgba(100,210,255,0.1)', icon: <FaFileAlt size={8} /> } },
    { title: "Asset Return Form", subtitle: "Hardware handover sheet", icon: <FaLaptop color="#ff375f" />, size: '0.4 MB', status: { label: 'DEFAULT', color: '#64d2ff', bg: 'rgba(100,210,255,0.1)', icon: <FaFileAlt size={8} /> } },
  ];

  return (
    <div className="dashboard-container" style={{ position: 'relative', overflowX: 'hidden' }}>
      <Header role="Employee" title="Document Center" />

      {/* Background Glow */}
      <div style={{ position: 'absolute', top: '10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(10,132,255,0.08) 0%, transparent 70%)', filter: 'blur(50px)', zIndex: -1 }}></div>

      <div style={{ marginTop: "40px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: "800", background: 'linear-gradient(135deg, #fff 0%, #a2a2a2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
          Document Repository
        </h1>
        <p className="subtitle" style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Access your personal records and organization policies</p>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginTop: '30px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} label="My Personal Documents" />
        <TabButton active={activeTab === 'forms'} onClick={() => setActiveTab('forms')} label="Default Forms" />
        <TabButton active={activeTab === 'company'} onClick={() => setActiveTab('company')} label="Company Governance" />
      </div>

      {activeTab === 'personal' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }} className="fade-in">
          {personalDocs.map((doc, idx) => (
            <DocumentCard key={`static-${idx}`} {...doc} onDownload={() => handleDownload(doc.url, `${doc.title.replace(/\s+/g, '_')}.pdf`)} />
          ))}
          {dynamicDocs.map((doc, idx) => (
            <DocumentCard 
              key={`dynamic-${idx}`} 
              title={doc.name} 
              subtitle={doc.category} 
              icon={<FaFileAlt color="#0a84ff" />} 
              size="Dynamic" 
              status={{ label: 'UPLOADED', color: '#30d158', bg: 'rgba(48,209,88,0.1)', icon: <FaCheckCircle size={8} /> }}
              onDownload={() => handleDownload(doc.file_path, doc.name)}
            />
          ))}
          {personalDocs.length === 0 && dynamicDocs.length === 0 && (
            <div style={{ gridColumn: 'span 3', padding: '60px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <FaExclamationTriangle size={40} color="rgba(255,255,255,0.1)" style={{ marginBottom: '15px' }} />
              <h3 style={{ color: 'var(--text-secondary)' }}>No documents found</h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Your onboarding verification may be in progress. Contact HR if this is unexpected.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'forms' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }} className="fade-in">
          {defaultForms.map((doc, idx) => (
            <DocumentCard key={idx} {...doc} onDownload={() => alert("Downloading " + doc.title)} />
          ))}
        </div>
      )}

      {activeTab === 'company' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }} className="fade-in">
          {companyDocs.map((doc, idx) => (
            <DocumentCard key={idx} {...doc} onDownload={() => alert("Viewing " + doc.title)} />
          ))}
        </div>
      )}
    </div>
  );
}

const DocumentCard = ({ title, subtitle, icon, onDownload, size, status, hideDownload }: any) => (
  <GlassCard style={{ padding: '20px', transition: 'transform 0.3s ease' }} className="hover-scale">
    <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</h4>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>{subtitle}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', background: status.bg, color: status.color, padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {status.icon} {status.label}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '500' }}>{size}</span>
        </div>
      </div>
    </div>
    {!hideDownload ? (
      <button
        onClick={onDownload}
        className="apple-btn"
        style={{ width: '100%', marginTop: '20px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', border: '1px solid rgba(10,132,255,0.2)', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
      >
        <FaDownload size={14} /> Download File
      </button>
    ) : (
      <button
        onClick={onDownload}
        className="apple-btn"
        style={{ width: '100%', marginTop: '20px', background: 'rgba(255,159,10,0.1)', color: '#ff9f0a', border: '1px solid rgba(255,159,10,0.2)', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
      >
        <FaEye size={14} /> View in Browser
      </button>
    )}
  </GlassCard>
);

const TabButton = ({ active, onClick, label }: any) => (
  <button
    onClick={onClick}
    style={{ ...tabStyle, background: active ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.03)', color: active ? '#0a84ff' : 'var(--text-secondary)', border: active ? '1px solid #0a84ff' : '1px solid rgba(255,255,255,0.08)' }}
  >
    {label}
  </button>
);

const tabStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
};
