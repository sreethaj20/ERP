/**
 * Synchronizes the company profile in session storage and triggers a global event
 * to update branding elements (Logo, Name, Tagline) across all active portals.
 */
export const syncCompanyProfile = (companyData: any) => {
    if (!companyData) return;
    
    const profile = {
        company_name: companyData.company_name,
        logo_url: companyData.company_logo,
        company_tagline: companyData.company_tagline
    };
    
    const current = sessionStorage.getItem("companyProfile");
    const next = JSON.stringify(profile);
    
    if (current !== next) {
        sessionStorage.setItem("companyProfile", next);
        window.dispatchEvent(new CustomEvent("companyProfileUpdated"));
    }
};
