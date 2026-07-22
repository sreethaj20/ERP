import React from 'react';
import Logo from '../Logo';
import watermarkImage from '../../assets/mercure-logo.png';
import headerLogoImage from '../../assets/mercure-logo.jpeg';
import uditSignature from '../../assets/udit-signature.png';

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
    marginTop: '10px',
    marginBottom: '4px',
    color: '#000'
};

const listStyle: React.CSSProperties = {
    fontFamily: "'Aptos', 'Inter', sans-serif",
    margin: '2px 0',
    paddingLeft: '18px',
    fontSize: '13px',
    color: '#000'
};

const page3ContentStyle: React.CSSProperties = {
    fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '11.5px',
    lineHeight: '1.3',
    flex: 1,
    color: '#000',
    fontWeight: 'normal'
};

const page3SectionTitleStyle: React.CSSProperties = {
    fontFamily: "'Aptos', 'Inter', sans-serif",
    fontSize: '13px',
    fontWeight: '600',
    marginTop: '6px',
    marginBottom: '3px',
    color: '#000'
};

const page3ListStyle: React.CSSProperties = {
    fontFamily: "'Aptos', 'Inter', sans-serif",
    margin: '2px 0',
    paddingLeft: '18px',
    fontSize: '11.5px',
    color: '#000'
};

const BulletList = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <ul style={{ ...style, listStyleType: 'none', paddingLeft: '8px' }}>
        {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
                return (
                    <li style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '3px' }}>
                        <span style={{ marginRight: '8px', flexShrink: 0 }}>•</span>
                        <span style={{ flex: 1 }}>{child.props.children}</span>
                    </li>
                );
            }
            return child;
        })}
    </ul>
);

const NumberedList = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <ol style={{ ...style, listStyleType: 'none', paddingLeft: '8px' }}>
        {React.Children.map(children, (child, index) => {
            if (React.isValidElement(child)) {
                return (
                    <li style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '3px' }}>
                        <span style={{ marginRight: '8px', flexShrink: 0, minWidth: '15px' }}>{index + 1}.</span>
                        <span style={{ flex: 1 }}>{child.props.children}</span>
                    </li>
                );
            }
            return child;
        })}
    </ol>
);

const OfferLetterTemplate: React.FC<OfferLetterTemplateProps> = ({ candidate, offer, job }) => {
    // Debug logging to help identify the issue
    console.log('OfferLetterTemplate Debug:', { candidate, offer, job });

    const today = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const offerDateVal = offer?.offer_date || offer?.created_at || offer?.sent_at;
    const documentDate = offerDateVal ? new Date(offerDateVal).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : today;

    // Enhanced fallback for manual offers (prioritize candidate_name, offered_ctc)
    const candidateName = (
        offer?.candidate_name ||
        offer?.candidate?.name ||
        `${offer?.candidate?.first_name || ''} ${offer?.candidate?.last_name || ''}`.trim() ||
        candidate?.name ||
        `${candidate?.first_name || ''} ${candidate?.last_name || ''}`.trim() ||
        `${candidate?.candidate_name || ''}`.trim() ||
        offer?.name ||
        'Candidate Name'
    );

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

    const hasVariableComp = (() => {
        if (!offer?.variable_component) return false;
        const val = offer.variable_component;
        const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(val);
        return !isNaN(num) && num > 0;
    })();


    const formatINR = (val: any) => {
        if (val === undefined || val === null || val === '') return "0";
        const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(val);
        if (isNaN(num)) return "0";
        return num.toLocaleString('en-IN');
    };

    const HeaderSection = () => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '8px',
            marginBottom: '8px',
            borderBottom: '1.5px solid #2b6cb0'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', height: '60px', overflow: 'hidden' }}>
                <img
                    src={headerLogoImage}
                    alt="Mercure Solutions"
                    className="header-logo"
                    style={{ width: '200px', height: '60px', objectFit: 'contain', margin: '0', imageRendering: 'crisp-edges' }}
                />
            </div>
            <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0', fontSize: '15px', color: '#000000', fontWeight: 'normal', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>www.mercuresolution.com</p>
            </div>
        </div>
    );

    const PageSignatureBox = () => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                <div className="candidate-sig-box" style={{
                    width: '160pt',
                    height: '30pt',
                    border: '1px solid #90cdf4',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                }} />
                <div style={{ fontSize: '12px', color: '#555555', marginTop: '2px', fontWeight: '500', textAlign: 'center' }}>Signature</div>
                <div style={{ fontSize: '12px', marginTop: '2px', textAlign: 'center' }}>{joiningDate}</div>
            </div>
        </div>
    );

    const FooterSection = () => (
        <div style={{
            marginTop: 'auto',
            paddingTop: '10px',
            borderTop: '1.5px solid #2b6cb0',
            fontSize: '9px',
            color: '#333333',
            fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            lineHeight: '1.4',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
        }}>
            <div style={{ paddingRight: '20px' }}>
                <strong style={{ color: '#2b6cb0' }}>Regd. Office:</strong> Mercure Solutions Private Limited<br />
                M Floor, Mahaveer Waterpark, Kondapur,<br />
                Hitec City, Hyderabad, Telangana - 500084
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'left' }}>
                <strong style={{ color: '#2b6cb0' }}>CIN:</strong> U62013TS2025PTC196108<br />
                <strong style={{ color: '#2b6cb0' }}>GSTIN:</strong> 36AATCM1458J1ZX<br />
                <strong style={{ color: '#2b6cb0' }}>E:</strong> <a href="mailto:info@mercuresolution.com" style={{ color: '#2b6cb0', textDecoration: 'underline' }}>info@mercuresolution.com</a>
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
            opacity: 0.12, // Reduced visibility
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
            <img src={watermarkImage} alt="Watermark" style={{ width: '100%', height: 'auto', objectFit: 'contain', filter: 'grayscale(100%)' }} />
        </div>
    );

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                .offer-page p {
                    margin: 0 0 6px 0;
                }
@media screen {
                    .offer-page { margin-bottom: 30px; box-shadow: 0 0 20px rgba(0,0,0,0.3); }
                    .watermark-layer img {
                        filter: grayscale(100%);
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
                    .offer-page:last-child,
                    .offer-page:last-of-type {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                    .header-logo {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .watermark-layer {
                        opacity: 0.12 !important;
                    }
                    .watermark-layer img {
                        filter: grayscale(100%) !important;
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
                            <p style={{ textAlign: 'right', fontWeight: '600', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>Date: {joiningDate}</p>
                            <h2 style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '18px', fontWeight: '600', margin: '12px 0 16px 0', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>Subject: Offer of Employment</h2>

                            <p>Dear {candidateName || 'Candidate Name'},</p>
                            <p>We are pleased to offer you the position of {jobTitle} at Mercure Solutions Pvt. Ltd. We believe your experience and expertise will add great value to our organization. The terms of your employment are outlined below.</p>

                            <h3 style={sectionTitleStyle}>1. Position & Reporting</h3>
                            <p>You are being appointed as {jobTitle} and will report to {reportingManager}. This is a {employmentType} position.</p>

                            <h3 style={sectionTitleStyle}>2. Start Date</h3>
                            <p>Your expected date of joining is {joiningDate}.</p>

                            <h3 style={sectionTitleStyle}>3. Probation Period</h3>
                            <p>You will be on probation for 6 Months from your date of joining. During the probation period:</p>
                            <BulletList style={listStyle}>
                                <li>Your performance and conduct will be reviewed.</li>
                                <li>Your employment may be confirmed, extended, or terminated based on performance.</li>
                                <li>You will not be eligible for certain benefits until confirmation (if applicable).</li>
                            </BulletList>

                            <h3 style={sectionTitleStyle}>4. Compensation & Benefits</h3>
                            {hasVariableComp ? (
                                <>
                                    <p>Your total compensation will be ₹{salaryAmount} L.P.A. The annual breakup of your compensation structure is detailed below:</p>
                                    <div style={{ margin: '10px 0 14px 0', fontSize: '13px', lineHeight: '1.5', color: '#000' }}>
                                        <p style={{ margin: '3px 0' }}>• Fixed Component (Basic, HRA, Allowances, etc.): ₹{formatINR(fixedComp)}</p>
                                        <p style={{ margin: '3px 0' }}>• Variable Component (Performance Linked Incentive / Bonus): ₹{formatINR(variableComp)}</p>
                                        {joiningBonus > 0 && (
                                            <p style={{ margin: '3px 0' }}>• One-time Joining Bonus: ₹{formatINR(joiningBonus)}</p>
                                        )}
                                        {relocationBonus > 0 && (
                                            <p style={{ margin: '3px 0' }}>• One-time Relocation Allowance / Bonus: ₹{formatINR(relocationBonus)}</p>
                                        )}
                                        <p style={{ margin: '3px 0', fontSize: '13px' }}>• Total Cost to Company (CTC): ₹{salaryAmount} / Annum</p>
                                    </div>
                                    <p style={{ marginTop: '8px' }}>A detailed monthly salary structure will be available in the Payroll Portal. General benefits include:</p>
                                </>
                            ) : (
                                <>
                                    <p>Your total compensation will be ₹{salaryAmount} L.P.A</p>
                                    <p style={{ marginTop: '8px' }}>A detailed salary structure will be available in Payroll Portal. Benefits (If Applicable):</p>
                                </>
                            )}
                            <BulletList style={listStyle}>
                                <li>Performance-based incentives</li>
                                <li>Health insurance / Mediclaim</li>
                                <li>Travel / Meal / Other allowances</li>
                                <li>Provident Fund / Statutory benefits</li>
                                <li>Any additional benefits as per company policy</li>
                            </BulletList>
                            <p>All compensation and benefits are subject to applicable deductions and tax regulations.</p>
                        </div>
                        <PageSignatureBox />
                        <FooterSection />
                    </div>
                </div>

                {/* PAGE 2 */}
                <div className="offer-page" style={pageStyle}>
                    <Watermark />
                    <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <HeaderSection />
                        <div style={page3ContentStyle}>
                            <h3 style={page3SectionTitleStyle}>5. Leave Policies</h3>
                            <p>You will be entitled to leave as per company policy, including:</p>
                            <BulletList style={page3ListStyle}>
                                <li>Casual Leave (CL): 12</li>
                                <li>Sick Leave (SL): 12</li>
                                <li>Public Holidays: As per the company's approved holiday list</li>
                            </BulletList>
                            <p>Leave cannot be availed without prior approval, except in cases of emergency.</p>

                            <h3 style={page3SectionTitleStyle}>6. Employment Conditions</h3>
                            <p>During your employment, you are expected to:</p>
                            <BulletList style={page3ListStyle}>
                                <li>Maintain a high standard of professionalism and conduct.</li>
                                <li>Follow all company policies, procedures, and guidelines.</li>
                                <li>Keep all company information confidential.</li>
                                <li>Use company property responsibly.</li>
                                <li>Not engage in misconduct, fraud, or behaviour that harms the company's interests.</li>
                            </BulletList>
                            <p>The company reserves the right to modify employment conditions and policies.</p>

                            <h3 style={page3SectionTitleStyle}>7. Termination of Employment</h3>
                            <p>The company may terminate your employment:</p>
                            <BulletList style={page3ListStyle}>
                                <li>By providing 30 days notice or salary in lieu of notice.</li>
                                <li>Immediately, without notice, in cases of misconduct, breach of policy, or confidentiality violation.</li>
                                <li>If performance or behaviour is unsatisfactory, including during probation.</li>
                                <li>If you are not allocated to any project, or due to any other business-related reasons, the employment may be terminated at the sole discretion of the management.</li>
                            </BulletList>
                            <p>You must return all company property upon termination.</p>

                            <h3 style={page3SectionTitleStyle}>8. Resignation by Employee</h3>
                            <p>You may resign from your position by:</p>
                            <BulletList style={page3ListStyle}>
                                <li>Providing 60 days of written notice.</li>
                                <li>Serving the notice period unless waived by management.</li>
                                <li>Completing proper handover procedures and returning all company assets.</li>
                            </BulletList>
                            <p>Full & Final Settlement is processed only after all clearances.</p>

                            <h3 style={page3SectionTitleStyle}>9. Restrictions During & After Employment</h3>
                            <p>You agree to the following:</p>
                            <BulletList style={page3ListStyle}>
                                <li><strong>Non-Disclosure:</strong> You must not share confidential information with any third party.</li>
                                <li><strong>Non-Solicitation:</strong> You may not solicit company clients, partners, or employees for 24 months post-employment.</li>
                            </BulletList>
                            <p>These restrictions are essential to protect company interests.</p>
                        </div>
                        <PageSignatureBox />
                        <FooterSection />
                    </div>
                </div>

                {/* PAGE 3 */}
                <div className="offer-page" style={pageStyle}>
                    <Watermark />
                    <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <HeaderSection />
                        <div style={page3ContentStyle}>
                            <h3 style={page3SectionTitleStyle}>10. Indemnity</h3>
                            <p style={{ margin: '2px 0' }}>You agree to indemnify and hold Mercure Solutions Pvt. Ltd. harmless against:</p>
                            <BulletList style={page3ListStyle}>
                                <li>Any losses or damages resulting from misconduct, negligence, or breach of contract.</li>
                                <li>Any unauthorized actions taken by you during your employment.</li>
                            </BulletList>

                            <h3 style={page3SectionTitleStyle}>11. Governing Laws & Arbitration</h3>
                            <BulletList style={page3ListStyle}>
                                <li>This employment agreement will be governed by the laws of India.</li>
                                <li>Any disputes arising from employment shall be resolved through arbitration in Hyderabad, Telangana, in accordance with the Arbitration and Conciliation Act, 1996.</li>
                                <li>The decision of the appointed arbitrator will be final and binding.</li>
                            </BulletList>

                            <h3 style={page3SectionTitleStyle}>12. Document of Understanding</h3>
                            <p style={{ margin: '2px 0' }}>This offer letter, along with the annexures and policies referred to herein, constitutes the complete understanding between you and Mercure Solutions Pvt. Ltd.</p>
                            <p style={{ margin: '2px 0' }}>No verbal agreements or informal communications shall override the terms of this document.</p>

                            <h3 style={page3SectionTitleStyle}>13. Document Checklist for Joining</h3>
                            <p style={{ margin: '2px 0' }}>Please bring the following documents on your first day:</p>
                            <NumberedList style={page3ListStyle}>
                                <li>Government ID proof (Aadhaar/PAN/Passport)</li>
                                <li>Passport-size photographs (2–4)</li>
                                <li>Educational certificates and mark sheets</li>
                                <li>Previous employment letters / relieving letter</li>
                                <li>Last 3 months' salary slips (if applicable)</li>
                                <li>Bank account details / cancelled cheque</li>
                                <li>Proof of address</li>
                                <li>Any other document requested by HR</li>
                            </NumberedList>

                            <h3 style={page3SectionTitleStyle}>14. Transport</h3>
                            <p style={{ margin: '2px 0' }}>I will be eligible for a common point pick-up/ home drop facility based on my shift hours and within transport radius.</p>
                            <BulletList style={page3ListStyle}>
                                <li>Day Shift - No Transport facility.</li>
                                <li>Night Shift - Transport Facility available.</li>
                            </BulletList>

                            <div style={{ marginTop: '12px', border: '1pt solid #000', padding: '10px 15px', borderRadius: '5px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                                <h4 style={{ margin: '0 0 6px 0', textAlign: 'center', textDecoration: 'underline', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>Acceptance of Offer</h4>
                                <p style={{ textAlign: 'center', marginBottom: '8px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>Please sign and return a copy of this letter to confirm your acceptance.</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div style={{ fontSize: '11px', fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontWeight: '600', color: '#000000', marginBottom: '2px' }}>Employee Name: {candidateName}</div>
                                        <div className="candidate-sig-box" style={{
                                            width: '160pt',
                                            height: '30pt',
                                            border: '1px solid #90cdf4',
                                            borderRadius: '4px',
                                            backgroundColor: '#ffffff',
                                            boxSizing: 'border-box'
                                        }} />
                                        <div style={{ fontSize: '12px', color: '#555555', marginTop: '2px', fontWeight: '500' }}>Signature</div>
                                        <div style={{ fontSize: '12px', marginTop: '2px' }}>{joiningDate}</div>
                                    </div>
                                    <div style={{
                                        textAlign: 'right',
                                        fontSize: '11px',
                                        fontFamily: "'Aptos', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                        justifyContent: 'flex-end'
                                    }}>
                                        <strong>Warm regards,</strong>
                                        <img
                                            src={uditSignature}
                                            alt="Udit Rao Signature"
                                            style={{
                                                height: '80px',
                                                marginTop: '0px',
                                                marginBottom: '-20px',
                                                marginRight: '-35px',
                                                alignSelf: 'flex-end'
                                            }}
                                        />
                                        <strong style={{ display: 'block', fontSize: '11px', color: '#000000', margin: '2px 0 1px 0' }}>Udit Rao</strong>
                                        <span>HR Department</span>
                                        <span>Mercure Solutions Pvt Ltd.</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                        <FooterSection />
                    </div>
                </div>
            </div>
        </>
    );
};

export default OfferLetterTemplate;
