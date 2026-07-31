import React, { useEffect, useState } from 'react';
import GlassCard from './GlassCard';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaGlobe } from 'react-icons/fa';
import { getCompanyProfile, getFileUrl } from '../utils/storage';

const CompanyInfoWidget = () => {
    const [company, setCompany] = useState<any>({
        company_name: "Mercure Solutions",
        company_tagline: "Accelerating Innovation, Delivering Solutions",
        company_industry: "ITES",
        logo_url: "",
        contact_email: "info@mercuresolution.com",
        contact_phone: "+91 9550620209",
        website: "www.mercuresolution.com",
        address_line1: "M Floor, Mahaveer the water Park, Hitec City",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500084"
    });
    const [logoError, setLogoError] = useState(false);

    const loadCompanyData = async () => {
        try {
            // First check local session profile for immediate updates
            const stored = sessionStorage.getItem("companyProfile");
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed && typeof parsed === 'object') {
                        const formattedLogo = parsed.logo_url ? getFileUrl(parsed.logo_url) : "";
                        setCompany((prev: any) => ({ ...prev, ...parsed, logo_url: formattedLogo }));
                        setLogoError(false);
                    }
                } catch (err) {}
            }

            // Fetch from storage/API
            const data = await getCompanyProfile(true);
            if (data && Object.keys(data).length > 0) {
                const formattedLogo = data.logo_url ? getFileUrl(data.logo_url) : "";
                setCompany((prev: any) => ({ ...prev, ...data, logo_url: formattedLogo }));
                setLogoError(false);
            }
        } catch (e) {
            console.warn("Error loading company info:", e);
        }
    };

    useEffect(() => {
        loadCompanyData();

        const handleCustomUpdate = (evt: any) => {
            if (evt?.detail) {
                const detail = { ...evt.detail };
                if (detail.logo_url) detail.logo_url = getFileUrl(detail.logo_url);
                setCompany((prev: any) => ({ ...prev, ...detail }));
                setLogoError(false);
            } else {
                loadCompanyData();
            }
        };

        window.addEventListener("companyProfileUpdated", handleCustomUpdate);
        window.addEventListener("storage", loadCompanyData);
        return () => {
            window.removeEventListener("companyProfileUpdated", handleCustomUpdate);
            window.removeEventListener("storage", loadCompanyData);
        };
    }, []);

    const formatWebsiteUrl = (rawUrl?: string) => {
        if (!rawUrl) return "#";
        const trimmed = rawUrl.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        return `https://${trimmed}`;
    };

    if (!company) return null;

    const fullAddress = [company.address_line1, company.address_line2, company.city, company.state, company.pincode]
        .filter(Boolean)
        .join(", ");

    const displayLogoUrl = company.logo_url ? getFileUrl(company.logo_url) : "";

    return (
        <GlassCard title="Company Information" subtitle={company.company_tagline || "Our Organization"}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                {/* Header with Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--border-light)' }}>
                    {displayLogoUrl && !logoError ? (
                        <img
                            src={displayLogoUrl}
                            alt=""
                            onError={() => setLogoError(true)}
                            style={{ width: '50px', height: '50px', objectFit: 'contain', background: 'transparent', padding: '0', borderRadius: '8px' }}
                        />
                    ) : (
                        <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, var(--accent-blue), #005bb5)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '22px', color: '#fff', boxShadow: '0 4px 12px rgba(10,132,255,0.3)', flexShrink: 0 }}>
                            {company.company_name?.charAt(0) || "M"}
                        </div>
                    )}
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text-primary)' }}>{company.company_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{company.company_industry}</div>
                    </div>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    {fullAddress && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <FaMapMarkerAlt style={{ color: 'var(--accent-red)', marginTop: '3px', minWidth: '14px' }} />
                            <span style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                {fullAddress}
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
                            <a
                                href={formatWebsiteUrl(company.website)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--accent-blue)', textDecoration: 'none', wordBreak: 'break-all' }}
                            >
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
