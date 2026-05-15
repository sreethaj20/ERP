import React from 'react';
import Logo from '../Logo';
import watermarkImage from '../../assets/mercure-logo.png';
import headerLogoImage from '../../assets/mercure-logo.jpeg';

interface OfferLetterTemplateProps {
    candidate: any;
    offer: any;
    job: any;
}

const pageStyle: React.CSSProperties = {
    padding: '15mm 20mm',
    width: '210mm',
    height: '296.8mm',
    minHeight: '296.8mm',
    boxSizing: 'border-box',
    position: 'relative',
    background: '#ffffff',
    color: '#000000',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    pageBreakAfter: 'always',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
    fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
};

const contentBodyStyle: React.CSSProperties = {
    fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '13px',
    lineHeight: '1.4',
    flex: 1,
    color: '#000',
    fontWeight: 'normal'
};

const sectionTitleStyle: React.CSSProperties = {
    fontFamily: "'Aptos', 'Inter', sans-serif",
    fontSize: '14.5px',
    fontWeight: '600',
    marginTop: '12px',
    marginBottom: '6px',
    color: '#000'
};

const listStyle: React.CSSProperties = {
    fontFamily: "'Aptos', 'Inter', sans-serif",
    margin: '4px 0',
    paddingLeft: '18px',
    fontSize: '13px',
    color: '#000'
};

const OfferLetterTemplate: React.FC<OfferLetterTemplateProps> = ({ candidate, offer, job }) => {
    // Debug logging to help identify the issue
    console.log('OfferLetterTemplate Debug:', { candidate, offer, job });
    
    const today = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Enhanced fallback for manual offers (prioritize candidate_name, offered_ctc)
    const candidateName = (offer?.candidate_name || candidate?.name || 
        `${candidate?.first_name || ''} ${candidate?.last_name || ''}`.trim() || 
        `${candidate?.candidate_name || ''}`.trim() || 'Candidate Name');

    console.log('OfferLetterTemplate props:', { offer, candidate });
    console.log('Template using candidateName:', candidateName);

    const jobTitle = job?.title || offer?.job_title || offer?.designation || candidate?.job_title || 'Software Developer';

    const joiningDate = offer?.joining_date ? new Date(offer.joining_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : (candidate?.joining_date ? new Date(candidate.joining_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : 'TBD');

    // CTC fix - handle number/string + full amount display
    let salaryAmount = '0';
    const ctcValue = offer?.offered_ctc || offer?.ctc || offer?.fixed_component || 0;
    if (ctcValue) {
        const num = typeof ctcValue === 'string' ? parseInt(ctcValue.replace(/,/g, '')) : parseInt(ctcValue);
        salaryAmount = num.toLocaleString('en-IN');
    }

    console.log('CTC Debug:', { ctcValue, salaryAmount, rawOfferCtc: offer?.offered_ctc, rawOfferCtcType: typeof offer?.offered_ctc });
    console.log('Template values:', { candidateName, jobTitle, joiningDate, salaryAmount });

    const reportingManager = (offer?.reporting_manager_name || offer?.reporting_manager_name_full || offer?.reporting_manager || offer?.reporting_manager_id || '') || 'TBD';
    const employmentType = offer?.employment_type || 'Full-time';
    const fixedComp = offer?.fixed_component || 0;
    const variableComp = offer?.variable_component || 0;
    const joiningBonus = offer?.joining_bonus || 0;
    const relocationBonus = offer?.relocation_bonus || 0;
    const expiryDate = (offer && offer.offer_expiry_date) ? new Date(offer.offer_expiry_date).toLocaleDateString('en-IN') : '7 days from issuance'; 

    const HeaderSection = () => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '8px',
            marginBottom: '15px',
            borderBottom: '2pt solid #000'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', height: '60px', overflow: 'hidden' }}>
                <img 
                    src={headerLogoImage} 
                    alt="Mercure Solutions" 
                    className="header-logo"
                    style={{ width: '200px', height: '60px', objectFit: 'contain', backgroundColor: '#ffffff', margin: '0', filter: 'brightness(1.3) saturate(1.4)', imageRendering: 'crisp-edges' }} 
                />
            </div>
            <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0', fontSize: '15px', color: '#000000', fontWeight: 'normal', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>www.mercuresolution.com</p>
            </div>
        </div>
    );

    const FooterSection = () => (
        <div style={{
            marginTop: 'auto',
            paddingTop: '6px',
            borderTop: '1px solid #ccc',
            fontSize: '7px',
            color: '#666',
            fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            lineHeight: '1.1'
        }}>
            <div style={{ marginBottom: '3px' }}>
                <strong>Regd. Office:</strong> 7th Floor, South Wing, Krishe Sapphire Hitec City Main Road, Madhapur, Hyderabad, Telangana-500081.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    CIN: U62013TS2025PTC196108 | GST: 36AATCM1458J1ZX | Email: hr@mercuresolutions.com
                </div>
                <div style={{ textAlign: 'right' }}>
                    <strong>E:</strong> info@mercuresolution.com | <strong>W:</strong> www.mercuresolution.com
                </div>
            </div>
        </div>
    );

    const Watermark = () => (
        <div className="watermark-layer" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)', // Straight (no rotation) and centered
            width: '550px',
            opacity: 0.12, // Increased visibility
            zIndex: 0,
            pointerEvents: 'none',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            userSelect: 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#d0d0d0' 
        }}>
            <img src={watermarkImage} alt="Watermark" style={{ width: '100%', height: 'auto', objectFit: 'contain', filter: 'brightness(1.3)' }} />
        </div>
    );

    return (
        <div className="offer-letter-container" style={{
            width: '210mm',
            margin: '0 auto',
            background: '#ffffff',
            color: '#000000',
            position: 'relative'
        }}>
            {/* PAGE 1 */}
            <div className="offer-page" style={pageStyle}>
                <Watermark />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <HeaderSection />
                    <div style={contentBodyStyle}>
                        <p style={{ textAlign: 'right', fontWeight: '600', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>Date: {today}</p>
                        <h2 style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '18px', fontWeight: '600', margin: '30px 0', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>Subject: Offer of Employment</h2>

<p>Dear {candidateName || 'Candidate Name'},</p>
<p>We are pleased to offer you the position of {jobTitle} at Mercure Solutions Pvt. Ltd. We believe your experience and expertise will add great value to our organization. The terms of your employment are outlined below.</p>

                        <h3 style={sectionTitleStyle}>1. Position & Reporting</h3>
<p>You are being appointed as {jobTitle} and will report to {reportingManager}. This is a {employmentType} position.</p>

                        <h3 style={sectionTitleStyle}>2. Start Date</h3>
                        <p>Your expected date of joining is {joiningDate}.</p>

                        <h3 style={sectionTitleStyle}>3. Probation Period</h3>
<p>You will be on probation for 6 Months from your date of joining. During the probation period:</p>
                        <ul style={listStyle}>
                            <li>Your performance and conduct will be reviewed.</li>
                            <li>Your employment may be confirmed, extended, or terminated based on performance.</li>
                            <li>You will not be eligible for certain benefits until confirmation (if applicable).</li>
                        </ul>

                        <h3 style={sectionTitleStyle}>4. Compensation & Benefits</h3>
                        <p>Your total compensation will be ₹{salaryAmount || '8,60,000'} L.P.A</p>
                        <p>A detailed salary structure will be available in Payroll Portal. Benefits (If Applicable):</p>
                        <ul style={listStyle}>
                            <li>Performance-based incentives</li>
                            <li>Health insurance / Mediclaim</li>
                            <li>Travel / Meal / Other allowances</li>
                            <li>Provident Fund / Statutory benefits</li>
                            <li>Any additional benefits as per company policy</li>
                        </ul>
                        <p>All compensation and benefits are subject to applicable deductions and tax regulations.</p>

                        <h3 style={sectionTitleStyle}>5. Leave Policies</h3>
                        <p>You will be entitled to leave as per company policy, including:</p>
                        <ul style={listStyle}>
                            <li>Casual Leave (CL): 12</li>
                            <li>Sick Leave (SL): 12</li>
                            <li>Public Holidays: As per the company's approved holiday list</li>
                        </ul>
                        <p>Leave cannot be availed without prior approval, except in cases of emergency.</p>
                    </div>
                    <FooterSection />
                </div>
            </div>

            {/* PAGE 2 */}
            <div className="offer-page" style={pageStyle}>
                <Watermark />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <HeaderSection />
                    <div style={contentBodyStyle}>
                        <h3 style={sectionTitleStyle}>6. Employment Conditions</h3>
                        <p>During your employment, you are expected to:</p>
                        <ul style={listStyle}>
                            <li>Maintain a high standard of professionalism and conduct.</li>
                            <li>Follow all company policies, procedures, and guidelines.</li>
                            <li>Keep all company information confidential.</li>
                            <li>Use company property responsibly.</li>
                            <li>Not engage in misconduct, fraud, or behaviour that harms the company's interests.</li>
                        </ul>
                        <p>The company reserves the right to modify employment conditions and policies.</p>

                        <h3 style={sectionTitleStyle}>7. Termination of Employment</h3>
                        <p>The company may terminate your employment:</p>
                        <ul style={listStyle}>
                            <li>By providing 30 days notice or salary in lieu of notice.</li>
                            <li>Immediately, without notice, in cases of misconduct, breach of policy, or confidentiality violation.</li>
                            <li>If performance or behaviour is unsatisfactory, including during probation.</li>
                        </ul>
                        <p>You must return all company property upon termination.</p>

                        <h3 style={sectionTitleStyle}>8. Resignation by Employee</h3>
                        <p>You may resign from your position by:</p>
                        <ul style={listStyle}>
                            <li>Providing 60 days of written notice.</li>
                            <li>Serving the notice period unless waived by management.</li>
                            <li>Completing proper handover procedures and returning all company assets.</li>
                        </ul>
                        <p>Full & Final Settlement is processed only after all clearances.</p>

                        <h3 style={sectionTitleStyle}>9. Restrictions During & After Employment</h3>
                        <p>You agree to the following:</p>
                        <ul style={listStyle}>
                            <li><strong>Non-Disclosure:</strong> You must not share confidential information with any third party.</li>
                            <li><strong>Non-Solicitation:</strong> You may not solicit company clients, partners, or employees for 24 months post-employment.</li>
                        </ul>
                        <p>These restrictions are essential to protect company interests.</p>

                        <h3 style={sectionTitleStyle}>10. Indemnity</h3>
                        <p>You agree to indemnify and hold Mercure Solutions Pvt. Ltd. harmless against:</p>
                        <ul style={listStyle}>
                            <li>Any losses or damages resulting from misconduct, negligence, or breach of contract.</li>
                            <li>Any unauthorized actions taken by you during your employment.</li>
                        </ul>
                    </div>
                    <FooterSection />
                </div>
            </div>

            {/* PAGE 3 */}
            <div className="offer-page" style={pageStyle}>
                <Watermark />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <HeaderSection />
                    <div style={contentBodyStyle}>
                        <h3 style={sectionTitleStyle}>11. Governing Laws & Arbitration</h3>
                        <ul style={listStyle}>
                            <li>This employment agreement will be governed by the laws of India.</li>
                            <li>Any disputes arising from employment shall be resolved through arbitration in Hyderabad, Telangana, in accordance with the Arbitration and Conciliation Act, 1996.</li>
                            <li>The decision of the appointed arbitrator will be final and binding.</li>
                        </ul>

                        <h3 style={sectionTitleStyle}>12. Document of Understanding</h3>
                        <p>This offer letter, along with the annexures and policies referred to herein, constitutes the complete understanding between you and Mercure Solutions Pvt. Ltd.</p>
                        <p>No verbal agreements or informal communications shall override the terms of this document.</p>

                        <h3 style={sectionTitleStyle}>13. Document Checklist for Joining</h3>
                        <p>Please bring the following documents on your first day:</p>
                        <ol style={{ ...listStyle, listStyleType: 'decimal' }}>
                            <li>Government ID proof (Aadhaar/PAN/Passport)</li>
                            <li>Passport-size photographs (2–4)</li>
                            <li>Educational certificates and mark sheets</li>
                            <li>Previous employment letters / relieving letter</li>
                            <li>Last 3 months' salary slips (if applicable)</li>
                            <li>Bank account details / cancelled cheque</li>
                            <li>Proof of address</li>
                            <li>Any other document requested by HR</li>
                        </ol>

                        <h3 style={sectionTitleStyle}>14. Transport</h3>
                        <p>I will be eligible for a common point pick-up/ home drop facility based on my shift hours and within transport radius.</p>
                        <ul style={listStyle}>
                            <li>Day Shift - No Transport facility.</li>
                            <li>Night Shift - Transport Facility available.</li>
                        </ul>

                        <div style={{ marginTop: '20px', border: '1pt solid #000', padding: '15px', borderRadius: '5px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                            <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', textDecoration: 'underline', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>Acceptance of Offer</h4>
                            <p style={{ textAlign: 'center', marginBottom: '15px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>Please sign and return a copy of this letter to confirm your acceptance.</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: '11px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                                    Candidate Name: ___________________________<br /><br />
                                    Signature: _________________________________<br /><br />
                                    Date: _____________________________________
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '11px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                                    <strong>Warm regards,</strong><br /><br />
                                    HR Department<br />
                                    Mercure Solutions Pvt Ltd.
                                </div>
                            </div>
                        </div>
                    </div>
                    <FooterSection />
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
@media screen {
                    .offer-page { margin-bottom: 30px; box-shadow: 0 0 20px rgba(0,0,0,0.3); }
                    .header-logo {
                        backgroundColor: #ffffff;
                        filter: brightness(1.3) saturate(1.4);
                    }
                    .watermark-layer img {
                        filter: brightness(1.3);
                    }
                }
                @media print {
                    * {
                        font-family: 'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                    }
                    .offer-page {
                        margin-bottom: 0;
                        box-shadow: none;
                        page-break-after: always;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .header-logo {
                        backgroundColor: #ffffff !important;
                        filter: brightness(1.3) saturate(1.4) !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .watermark-layer {
                        opacity: 0.12 !important;
                    }
                    .watermark-layer img {
                        filter: brightness(1.3) !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body {
                        font-family: 'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                    }
                    p, h1, h2, h3, h4, h5, h6, li, span, div, strong, em {
                        font-family: 'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                    }
                }
            ` }} />
        </div>
    );
};

export default OfferLetterTemplate;
