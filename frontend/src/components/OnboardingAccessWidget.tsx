import React, { useState, useEffect } from "react";
import GlassCard from "./GlassCard";
import {
    getHROnboardingRequests,
    getOnboardingRequests,
    getRoleAssignments,
    getEmployees
} from "../utils/storage";
import { FaUserShield, FaUserCheck, FaKey, FaShieldAlt, FaIdBadge, FaCheckCircle, FaHourglassHalf } from "react-icons/fa";

export default function OnboardingAccessWidget() {
    const [stats, setStats] = useState({
        totalOnboarded: 0,
        pendingApprovals: 0,
        accessGranted: 0,
        activePortalUsers: 0
    });
    const [recentMembers, setRecentMembers] = useState<any[]>([]);

    useEffect(() => {
        const refreshStats = async () => {
            const hrOnboarding = await getHROnboardingRequests();
            const roleOnboarding = await getOnboardingRequests();
            const roleAssignments = getRoleAssignments();
            const employees = getEmployees();

            // 1. Total Completed Onboardings
            const completedHR = (hrOnboarding || []).filter((r: any) => r.status === 'completed');
            const completedRole = (roleOnboarding || []).filter((r: any) => r.status === 'approved' || r.status === 'completed');

            // 2. Pending Approvals
            const pendingHR = (hrOnboarding || []).filter((r: any) => r.status === 'pending').length;
            const pendingRole = (roleOnboarding || []).filter((r: any) => r.status === 'pending').length;

            // 3. Access Granted
            const granted = roleAssignments.filter((r: any) => r.is_active && r.login_enabled).length;

            // 4. Map names for recent onboarded members
            const recent = [...completedHR, ...completedRole]
                .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
                .slice(0, 5)
                .map(r => {
                    const emp = employees.find((e: any) => e.id === r.employee_id);
                    return {
                        name: emp?.name || 'Unknown',
                        dept: emp?.department || 'N/A',
                        status: 'Onboarded',
                        hasAccess: roleAssignments.some((ra: any) => ra.user_id === r.employee_id && ra.login_enabled) || (emp?.role === 'employee' && emp?.email)
                    };
                });

            setRecentMembers(recent);
            setStats({
                totalOnboarded: completedHR.length + completedRole.length,
                pendingApprovals: pendingHR + pendingRole,
                accessGranted: granted + employees.filter((e: any) => e.role === 'employee').length,
                activePortalUsers: roleAssignments.length + employees.length
            });
        };

        refreshStats();
        const interval = setInterval(refreshStats, 5000);
        return () => clearInterval(interval);
    }, []);

    const statItems = [
        { label: "Onboarded Talent", value: stats.totalOnboarded, icon: <FaUserCheck color="#30d158" />, bg: "rgba(48,209,88,0.1)" },
        { label: "Active Access", value: stats.accessGranted, icon: <FaKey color="#0a84ff" />, bg: "rgba(10,132,255,0.1)" },
        { label: "Pending Workflow", value: stats.pendingApprovals, icon: <FaShieldAlt color="#ff9f0a" />, bg: "rgba(255,159,10,0.1)" },
        { label: "Total Assets", value: stats.activePortalUsers, icon: <FaUserShield color="#bf5af2" />, bg: "rgba(191,90,242,0.1)" }
    ];

    return (
        <GlassCard title="Onboarding & Access Pulse" subtitle="Real-time oversight of talent entry and system permissions">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '15px' }}>
                {statItems.map((item, idx) => (
                    <div key={idx} style={statCardStyle}>
                        <div style={{ ...iconCircle, background: item.bg }}>
                            {React.cloneElement(item.icon as React.ReactElement, { size: 16 })}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '800' }}>{item.value}</div>
                        <div style={statLabelStyle}>{item.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '25px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaIdBadge /> Access Activation Status (Recent Members)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recentMembers.length === 0 ? (
                        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '10px' }}>No recently onboarded members.</div>
                    ) : recentMembers.map((member, i) => (
                        <div key={i} style={memberRowStyle}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: '600' }}>{member.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{member.dept}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {member.hasAccess ? (
                                    <span style={{ fontSize: '10px', color: '#30d158', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <FaCheckCircle size={10} /> ACCESS READY
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '10px', color: '#ff9f0a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <FaHourglassHalf size={10} /> PROVISIONING
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </GlassCard>
    );
}

const statCardStyle: React.CSSProperties = {
    padding: '12px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
};

const iconCircle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px'
};

const statLabelStyle: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: 'bold',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginTop: '2px'
};

const memberRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 15px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid var(--border-light)'
};
