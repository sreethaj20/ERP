import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getDashboard, getCandidates, getInterviews } from "../../services/recruiterService";
import webSocketService from "../../services/websocketService";
import api from "../../api/apiClient";
import {
    FaBriefcase,
    FaUsers,
    FaCalendarCheck,
    FaFileContract,
    FaArrowRight,
    FaBullhorn,
    FaClock,
    FaHistory
} from 'react-icons/fa';
import { NavLink } from 'react-router-dom';
import ShiftActivityWidget from '../../components/ShiftActivityWidget';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import AnnouncementWidget from '../../components/AnnouncementWidget';
import CompanyInfoWidget from '../../components/CompanyInfoWidget';
import WelcomeBanner from '../../components/WelcomeBanner';
import { syncCompanyProfile } from '../../utils/companyUtils';

const RecruiterDashboard = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = React.useState<any>(null);
    const [candidates, setCandidates] = React.useState<any[]>([]);
    const [interviews, setInterviews] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);

    const loadData = async () => {
        setLoading(true);

        // Load dashboard stats
        try {
            const dData = await getDashboard();
            setDashboardData(dData);
            syncCompanyProfile(dData?.company);
            if (dData?.employee_profile) {
                sessionStorage.setItem("department", dData.employee_profile.department || "");
                sessionStorage.setItem("joinDate", dData.employee_profile.joining_date || "");
                sessionStorage.setItem("reportingTo", dData.employee_profile.reporting_to || "");
            }
        } catch (e) {
            console.error("[Dashboard] Failed to load dashboard stats:", e);
        }

        // Load candidates independently
        try {
            const cands = await getCandidates();
            setCandidates(Array.isArray(cands) ? cands : []);
        } catch (e) {
            console.error("[Dashboard] Failed to load candidates:", e);
        }

        // Load interviews independently
        try {
            const ints = await getInterviews();
            setInterviews(Array.isArray(ints) ? ints : []);
        } catch (e) {
            console.error("[Dashboard] Failed to load interviews:", e);
        }

        setLoading(false);
    };

    React.useEffect(() => {
        loadData();
        const handleUpdate = (msg: any) => {
            if (msg.event === "data_updated" || msg.event === "recruitment_updated") {
                loadData();
            }
        };
        webSocketService.on("data_updated", handleUpdate);
        return () => {
          webSocketService.off("data_updated", handleUpdate);
        };
    }, []);

    const stats = [
        { label: 'Active Jobs', value: dashboardData?.active_jobs || 0, icon: <FaBriefcase />, color: '#58a6ff', path: '/recruiter/jobs' },
        { label: 'Total Candidates', value: dashboardData?.total_candidates || 0, icon: <FaUsers />, color: '#39d353', path: '/recruiter/pipeline' },
        { label: 'Interviews Today', value: dashboardData?.interviews_today || 0, icon: <FaCalendarCheck />, color: '#bc8cff', path: '/recruiter/interviews' },
        { label: 'Pending Offers', value: dashboardData?.pending_offers || 0, icon: <FaFileContract />, color: '#d29922', path: '/recruiter/offers' },
    ];

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    };

    return (
        <div className="dashboard-container">
            <Header role="Recruiter" title="Recruitment Overview" />

            <WelcomeBanner role="Talent Acquisition" />

            {/* 1. Shift Activity System */}
            <ShiftActivityWidget />

            {/* 2. Calendar & Announcements at Top */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <GlassCard title="Interview & Attendance" subtitle="Monthly presence overview">
                        <div style={{ marginTop: '10px' }}>
                            <AttendanceCalendar type="individual" />
                        </div>
                    </GlassCard>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <AnnouncementWidget />
                    <CompanyInfoWidget />
                </div>
            </div>

            {/* 3. Stats Section */}
            <div className="grid-4" style={{ marginBottom: '40px' }}>
                {stats.map((stat, i) => (
                    <GlassCard key={i} className="stat-card" style={{ borderLeft: `3px solid ${stat.color}` }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {stat.label}
                                </div>
                                <div className="stat-value-glow" style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stat.value}</div>
                            </div>
                            <div style={{
                                background: `${stat.color}20`,
                                color: stat.color,
                                padding: '12px',
                                borderRadius: '14px',
                                fontSize: '24px'
                            }}>
                                {stat.icon}
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate(stat.path)}
                            className="apple-btn"
                            style={{ marginTop: '20px', width: '100%', fontSize: '11px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            Analyze Pipeline <FaArrowRight fontSize="10px" />
                        </button>
                    </GlassCard>
                ))}
            </div>

            {/* 4. Recruitment Pipelines */}
            <div className="grid-2" style={{ marginBottom: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <GlassCard title="Recent Applications" subtitle="Candidates entering the funnel">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {candidates.slice(0, 5).map((cand: any) => (
                            <div key={cand.id || cand.candidate_id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '14px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border-light)',
                                borderRadius: '14px',
                                transition: 'transform 0.2s ease'
                            }}>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{cand.name || `${cand.first_name} ${cand.last_name}`}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cand.current_designation || cand.job || 'Applying for Role'}</div>
                                </div>
                                <div style={{
                                    fontSize: '10px',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    background: 'rgba(14, 165, 233, 0.1)',
                                    color: 'var(--accent-blue)',
                                    textTransform: 'uppercase',
                                    fontWeight: '800'
                                }}>
                                    {cand.current_stage || 'Review'}
                                </div>
                            </div>
                        ))}
                        {candidates.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>No recent applications</div>}
                    </div>
                </GlassCard>

                <GlassCard title="Active Interviews" subtitle="Upcoming evaluations">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {interviews.slice(0, 5).map((int: any) => {
                            const dateObj = formatDate(int.interview_date);
                            return (
                                <div key={int.id || int.interview_id} style={{
                                    display: 'flex',
                                    gap: '15px',
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '14px'
                                }}>
                                    <div style={{
                                        width: '45px',
                                        height: '45px',
                                        background: 'rgba(191, 90, 242, 0.1)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#bf5af2',
                                        border: '1px solid rgba(191, 90, 242, 0.2)'
                                    }}>
                                        <div style={{ fontSize: '12px', fontWeight: '800' }}>{dateObj ? dateObj.getDate() : '??'}</div>
                                        <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' }}>
                                            {dateObj ? dateObj.toLocaleString('default', { month: 'short' }) : '---'}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{int.candidate_name || 'Candidate'}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Round {int.round_number} • {int.interviewer_name || int.interviewer_id || 'Interviewer'}</div>
                                    </div>
                                </div>
                            );
                        })}
                        {interviews.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>No interviews scheduled</div>}
                    </div>
                </GlassCard>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Talent Operations</h2>
            </div>

            <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <div onClick={() => navigate('/recruiter/support')} className="glass-module-card">
                    <div style={{ position: "absolute", top: "20px", right: "20px", opacity: 0.2 }}>
                        <FaBullhorn size={40} color="#64d2ff" />
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>Support Ticket</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Raise IT or HR query. Equipment, policy, or portal help.</div>
                    <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', fontWeight: '600', color: '#64d2ff',
                        padding: '6px 14px', borderRadius: '10px', background: 'rgba(100, 210, 255, 0.1)'
                    }}>
                        Raise Ticket →
                    </div>
                </div>

                <div onClick={() => navigate('/recruiter/shift-timesheet')} className="glass-module-card">
                    <div style={{ position: "absolute", top: "20px", right: "20px", opacity: 0.2 }}>
                        <FaClock size={40} color="#30d158" />
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>Shift Attendance</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Track your daily work hours. View punch-in/out history.</div>
                    <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', fontWeight: '600', color: '#30d158',
                        padding: '6px 14px', borderRadius: '10px', background: 'rgba(48, 209, 88, 0.1)'
                    }}>
                        View Logs →
                    </div>
                </div>

                <div onClick={() => navigate('/recruiter/my-assets')} className="glass-module-card">
                    <div style={{ position: "absolute", top: "20px", right: "20px", opacity: 0.2 }}>
                        <FaHistory size={40} color="#bf5af2" />
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>My Assets</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>View hardware and devices assigned to you.</div>
                    <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', fontWeight: '600', color: '#bf5af2',
                        padding: '6px 14px', borderRadius: '10px', background: 'rgba(191, 90, 242, 0.1)'
                    }}>
                        View Assets →
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecruiterDashboard;
