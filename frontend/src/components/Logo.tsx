import React, { useState, useEffect } from "react";
// Import the logo image as fallback (or default)
import defaultLogoImage from "../assets/mercure-logo.png";

interface LogoProps {
    width?: number | string;
    height?: number | string;
    className?: string;
    showTagline?: boolean;
    showName?: boolean;
    printMode?: boolean;
    layout?: 'vertical' | 'horizontal';
}

const Logo: React.FC<LogoProps> = ({
    width = 200,
    height,
    className = "",
    showTagline = false,
    showName = true,
    printMode = false,
    layout = 'vertical'
}) => {
    const [logoSrc, setLogoSrc] = useState(defaultLogoImage);
    const [tagline, setTagline] = useState("Accelerating Innovation, Delivering Solutions");
    const [companyName, setCompanyName] = useState("");

    useEffect(() => {
        const updateLogo = () => {
            const storedProfile = sessionStorage.getItem("companyProfile");
            if (storedProfile) {
                try {
                    const parsed = JSON.parse(storedProfile);
                    if (parsed.company_name && /antigravity/i.test(parsed.company_name)) {
                        parsed.company_name = "Mercure";
                        sessionStorage.setItem("companyProfile", JSON.stringify(parsed));
                    }
                    if (parsed.logo_url && !parsed.logo_url.includes('.jpeg')) setLogoSrc(parsed.logo_url);
                    if (parsed.company_tagline) setTagline(parsed.company_tagline);
                    if (parsed.company_name) {
                        const cleanName = parsed.company_name.replace(/antigravity/gi, "Mercure").replace(/\s+HRMS/gi, "");
                        setCompanyName((cleanName === "Mercure" || cleanName === "Mercure (Offline)") ? "" : cleanName);
                    }
                } catch (e) {
                    console.error("Error parsing company profile", e);
                }
            }
        };

        // Initial load
        updateLogo();

        // Listen for updates
        window.addEventListener("companyProfileUpdated", updateLogo);
        window.addEventListener("storage", updateLogo);

        return () => {
            window.removeEventListener("companyProfileUpdated", updateLogo);
            window.removeEventListener("storage", updateLogo);
        };
    }, []);

    const isHorizontal = layout === 'horizontal';

    return (
        <div
            className={className}
            style={{
                width: width,
                display: 'flex',
                flexDirection: isHorizontal ? 'row' : 'column',
                alignItems: isHorizontal ? 'center' : 'center',
                justifyContent: isHorizontal ? 'flex-start' : 'center',
                gap: isHorizontal ? '12px' : '0',
                padding: '0',
                borderRadius: '0',
                border: 'none',
                background: 'transparent',
                backdropFilter: 'none'
            }}
        >
            <img
                src={logoSrc}
                alt={companyName || "Company Logo"}
                className="logo"
                style={{
                    width: width && width !== 'auto' ? (typeof width === 'number' ? `${width}px` : width) : (isHorizontal ? 'auto' : "100%"),
                    height: height ? (typeof height === 'number' ? `${height}px` : height) : (isHorizontal ? '68px' : "auto"),
                    objectFit: "contain",
                    backgroundColor: "transparent",
                    background: "transparent",
                    filter: "none",
                    mixBlendMode: "normal",
                    borderRadius: '0'
                }}
                onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultLogoImage;
                }}
            />

            {(showName && companyName) && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isHorizontal ? 'flex-start' : 'center',
                    justifyContent: 'center'
                }}>
                    <div
                        style={{
                            color: printMode ? "#000" : "var(--text-primary)",
                            fontSize: isHorizontal ? "16px" : "15px",
                            fontWeight: "800",
                            fontFamily: "'Outfit', sans-serif",
                            textAlign: isHorizontal ? "left" : "center",
                            marginTop: isHorizontal ? "0" : "4px",
                            marginBottom: "0",
                            letterSpacing: isHorizontal ? "0.5px" : "-0.02em",
                            textTransform: "uppercase",
                            lineHeight: "1.2",
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {companyName}
                    </div>

                    {showTagline && (
                        <div
                            style={{
                                color: printMode ? "#666" : "var(--accent-blue)",
                                fontSize: "9px",
                                letterSpacing: "0.8px",
                                marginTop: "4px",
                                textAlign: isHorizontal ? "left" : "center",
                                width: "100%",
                                fontWeight: "600",
                                textTransform: "uppercase",
                                opacity: 0.8
                            }}
                        >
                            {tagline}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Logo;
