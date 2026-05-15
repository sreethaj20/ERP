import React, { useEffect, useState } from 'react';
import GlassCard from './GlassCard';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaGlobe } from 'react-icons/fa';
import { getCompanyProfile } from '../utils/storage';

const CompanyInfoWidget = () => {
    const [company, setCompany] = useState<any>({
        company_name: "Mercure HRMS",
        company_tagline: "Start your journey",
        company_industry: "Technology",
        logo_url: "",
        contact_email: "hr@mercure.com",
        website: "https://mercure.com"
    });

    useEffect(() => {
        const loadCompany = async () => {
            try {
                const data = await getCompanyProfile();
                if (data && Object.keys(data).length > 0) {
                    setCompany((prev: any) => ({ ...prev, ...data }));
                } else {
                    // Fallback to local storage if API is empty or fails
                    const stored = sessionStorage.getItem("companyProfile");
                    if (stored) setCompany((prev: any) => ({ ...prev, ...JSON.parse(stored) }));
                }
            } catch (e) {
                const stored = sessionStorage.getItem("companyProfile");
                if (stored) setCompany((prev: any) => ({ ...prev, ...JSON.parse(stored) }));
            }
        };

        loadCompany();
        window.addEventListener("companyProfileUpdated", loadCompany);
        window.addEventListener("storage", loadCompany);
        return () => {
            window.removeEventListener("companyProfileUpdated", loadCompany);
            window.removeEventListener("storage", loadCompany);
        };
    }, []);

    if (!company) return null;

    return (
        <GlassCard title="Company Information" subtitle={company.company_tagline || "Our Organization"}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                {/* Header with Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--border-light)' }}>
                    {company.logo_url ? (
                        <img
                            src={company.logo_url}
                            alt="Logo"
                            style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', padding: '5px' }}
                        />
                    ) : (
                        <div style={{ width: '50px', height: '50px', background: 'var(--accent-blue)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px' }}>
                            {company.company_name?.charAt(0) || "C"}
                        </div>
                    )}
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text-primary)' }}>{company.company_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{company.company_industry}</div>
                    </div>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    {(company.address_line1 || company.city) && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <FaMapMarkerAlt style={{ color: 'var(--accent-red)', marginTop: '3px', minWidth: '14px' }} />
                            <span style={{ color: 'var(--text-secondary)' }}>
                                {company.address_line1}, {company.city}, {company.state} {company.pincode}
                            </span>
                        </div>
                    )}

                    {company.contact_phone && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <FaPhone style={{ color: 'var(--accent-green)', minWidth: '14px' }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{company.contact_phone}</span>
                        </div>
                    )}

                    {company.contact_email && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <FaEnvelope style={{ color: 'var(--accent-yellow)', minWidth: '14px' }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{company.contact_email}</span>
                        </div>
                    )}

                    {company.website && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <FaGlobe style={{ color: 'var(--accent-blue)', minWidth: '14px' }} />
                            <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
                                {company.website.replace(/^https?:\/\//, '')}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </GlassCard>
    );
};

export default CompanyInfoWidget;
