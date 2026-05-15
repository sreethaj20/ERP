import React from 'react';
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
    getVisibleJobs,
    getVisibleCandidates,
    getVisibleInterviews,
    getVisibleOffers
} from "../../utils/storage";
import {
    FaChartPie,
    FaDownload,
    FaHistory
} from 'react-icons/fa';

export default function RecruiterReports() {
    const userId = sessionStorage.getItem('userId') || '';
    const userRole = sessionStorage.getItem('userRole') || 'Recruiter';

    const jobs = getVisibleJobs(userRole, userId);
    const candidates = getVisibleCandidates(userRole, userId);
    const interventions = getVisibleInterviews(userRole, userId);
    const offers = getVisibleOffers(userRole, userId);

    const metrics = [
        { label: 'Time to Hire', value: '18 Days', trend: '-2 days vs last month' },
        { label: 'Offer Acceptance Rate', value: '82%', trend: '+5% vs last month' },
        { label: 'Sourcing Quality', value: '4.2/5', trend: 'Stable' },
        { label: 'Total Placements', value: candidates.filter((c: any) => c.stage === 'Hired' || c.stage === 'Onboarding').length, trend: 'Overall' }
    ];

    return (
        <div className="dashboard-container">
            <Header role="Recruiter" title="Recruitment Analytics" />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <button className="apple-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                    <FaDownload /> Export Report
                </button>
            </div>

            <div className="grid-4" style={{ marginBottom: '30px' }}>
                {metrics.map((m, i) => (
                    <GlassCard key={i} style={{ padding: '20px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '10px' }}>{m.label}</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>{m.value}</div>
                        <div style={{ fontSize: '10px', color: m.trend.includes('+') ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>{m.trend}</div>
                    </GlassCard>
                ))}
            </div>

            <div className="grid-2">
                <GlassCard title="Hiring Pipeline Distribution">
                    <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '15px', padding: '20px 0' }}>
                        {['Applied', 'Screening', 'Interview', 'Selected'].map((stage, i) => {
                            const count = candidates.filter((c: any) => c.stage?.toLowerCase() === stage.toLowerCase()).length;
                            const height = Math.max(10, (count / (candidates.length || 1)) * 100);
                            return (
                                <div key={stage} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '100%',
                                        height: `${height}%`,
                                        background: `var(--accent-blue)`,
                                        borderRadius: '6px',
                                        opacity: 0.5 + (i * 0.15),
                                        minHeight: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        fontWeight: 'bold'
                                    }}>
                                        {count}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center' }}>{stage}</div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>

                <GlassCard title="Recent Activity Log">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { action: 'Offer Accepted', person: 'Sarah Smith', time: '2 hours ago' },
                            { action: 'Interview Scheduled', person: 'John Doe', time: '5 hours ago' },
                            { action: 'Job Posted', person: 'UI Designer', time: 'Yesterday' },
                            { action: 'Candidate Rejected', person: 'Mike Ross', time: 'Yesterday' }
                        ].map((log, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <FaHistory color="var(--text-tertiary)" />
                                    <div>
                                        <span style={{ fontWeight: '600' }}>{log.action}</span>
                                        <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{log.person}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{log.time}</div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
