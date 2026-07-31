import { getFileUrl } from './storage';

/**
 * Synchronizes the company profile in session storage and triggers a global event
 * to update branding elements (Logo, Name, Tagline) across all active portals.
 */
export const syncCompanyProfile = (companyData: any) => {
    if (!companyData) return;
    
    const rawLogo = companyData.logo_url || companyData.company_logo || "";
    const profile = {
        company_name: companyData.company_name || "Mercure Solutions",
        logo_url: rawLogo ? getFileUrl(rawLogo) : "",
        company_tagline: companyData.company_tagline || "",
        company_industry: companyData.company_industry || "",
        website: companyData.website || "",
        contact_email: companyData.contact_email || "",
        contact_phone: companyData.contact_phone || "",
        address_line1: companyData.address_line1 || "",
        address_line2: companyData.address_line2 || "",
        city: companyData.city || "",
        state: companyData.state || "",
        pincode: companyData.pincode || ""
    };
    
    sessionStorage.setItem("companyProfile", JSON.stringify(profile));
    window.dispatchEvent(new Event("companyProfileUpdated"));
    window.dispatchEvent(new CustomEvent("companyProfileUpdated", { detail: profile }));
};
