import React from "react";
import GlassCard from "./GlassCard";
import { FaIdCard, FaBuilding, FaUser, FaClock } from "react-icons/fa";
import { calculateExperience } from "../utils/dateHelpers";

interface WelcomeBannerProps {
    role: string;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ role }) => {
    const userName = sessionStorage.getItem("userName") || "User";
    const userId = sessionStorage.getItem("userId") || "—";
    const dept = sessionStorage.getItem("department") || "Not Assigned";
    const joinDate = sessionStorage.getItem("joinDate") || "";
    const reportingTo = sessionStorage.getItem("reportingTo") || "";

    return (
        <div style={{ marginBottom: '25px' }}>
            <GlassCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0a84ff, #bf5af2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', fontWeight: '700', color: '#fff',
                        boxShadow: '0 8px 16px rgba(10, 132, 255, 0.3)'
                    }}>
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                Welcome back, {userName}!
                            </h2>
                            <span style={{ 
                                background: 'rgba(10, 132, 255, 0.15)', 
                                color: '#0a84ff', 
                                padding: '4px 12px', 
                                borderRadius: '100px', 
                                fontSize: '10px', 
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {role}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <FaIdCard size={11} color="#0a84ff" /> {userId}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <FaBuilding size={11} color="#bf5af2" /> {dept}
                            </span>
                            {reportingTo && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <FaUser size={11} color="#30d158" /> Reports to: {reportingTo}
                                </span>
                            )}
                            {joinDate && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <FaClock size={11} color="#0a84ff" /> Tenure: {calculateExperience(joinDate)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default WelcomeBanner;
