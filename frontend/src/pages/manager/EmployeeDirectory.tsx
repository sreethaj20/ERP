import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
    getEmployees,
    getOnboardingByEmpId,
    getPreboardingByEmpId,
    getOffboardingByEmpId,
    getITTickets,
    getInterviewsData,
    getAttendanceByEmployee
} from "../../utils/storage";
import {
    FaUser,
    FaSearch,
    FaFilter,
    FaClipboardList,
    FaTicketAlt,
    FaUserTie,
    FaCalendarCheck,
    FaCheckCircle,
    FaClock,
    FaExclamationTriangle,
    FaInfoCircle
} from "react-icons/fa";

export default function EmployeeDirectory() {
    const [employees, setEmployees] = useState(getEmployees());
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState("All");
    const [selectedEmp, setSelectedEmp] = useState<any>(null);

    // Sync data
    const refresh = () => {
        setEmployees(getEmployees());
    };

    useEffect(() => {
        refresh();
        window.addEventListener('storage', refresh);
        const interval = setInterval(refresh, 10000);
        return () => {
            window.removeEventListener('storage', refresh);
            clearInterval(interval);
        };
    }, []);

    const filteredEmployees = employees.filter((emp: any) => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = selectedRole === "All" || emp.role === selectedRole;
        return matchesSearch && matchesRole && emp.role !== 'Manager';
    });

    return (
        <div className="dashboard-container">
            <Header role="Manager" title="Global Staff Intelligence" />

            <div style={{ marginBottom: "30px" }}>
                <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Employee Directory</h1>
                <p className="subtitle">Comprehensive visibility into staff status, onboarding lifecycle, and service requests</p>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: "1fr 2.5fr", gap: "24px" }}>
                {/* Left Column: List & Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <GlassCard title="Staff Registry" subtitle="Filter and select an employee">
                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={searchBox}>
                                <FaSearch color="var(--text-tertiary)" />
                                <input
                                    type="text"
                                    placeholder="Search name or ID..."
                                    style={searchInput}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div style={filterRow}>
                                <FaFilter size={12} color="var(--text-tertiary)" />
                                <select
                                    style={roleSelect}
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                >
                                    <option>All</option>
                                    <option>hr</option>
                                    <option>recruiter</option>
                                    <option>teamleader</option>
                                    <option>it</option>
                                    <option>employee</option>
                                </select>
                            </div>

                            <div style={empListWrapper as any}>
                                {filteredEmployees.map((emp: any) => (
                                    <div
                                        key={emp.id}
                                        style={{
                                            ...empListItem,
                                            background: selectedEmp?.id === emp.id ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.03)',
                                            borderColor: selectedEmp?.id === emp.id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)'
                                        }}
                                        onClick={() => setSelectedEmp(emp)}
                                    >
                                        <div style={avatarCircle}>
                                            {emp.photo ? <img src={emp.photo} alt="" style={avatarImg} /> : emp.name.charAt(0)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={empName}>{emp.name}</div>
                                            <div style={empId}>{emp.id} • {emp.role?.toUpperCase()}</div>
                                        </div>
                                         <div style={{ 
                                             ...statusBadge, 
                                             background: emp.status === 'Active' ? 'rgba(48,209,88,0.1)' : 
                                                         emp.status === 'Inactive' ? 'rgba(255,69,58,0.1)' : 
                                                         'rgba(255,159,10,0.1)', 
                                             color: emp.status === 'Active' ? '#30d158' : 
                                                    emp.status === 'Inactive' ? '#ff453a' : 
                                                    '#ff9f0a' 
                                         }}>
                                             {emp.status}
                                         </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Right Column: Detailed Insights */}
                <div>
                    {selectedEmp ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Profile Header */}
                            <GlassCard>
                                <div style={profileHeader}>
                                    <div style={largeAvatar}>
                                        {selectedEmp.photo ? <img src={selectedEmp.photo} alt="" style={avatarImg} /> : selectedEmp.name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <h2 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>{selectedEmp.name}</h2>
                                            <span style={{ ...statusBadge, padding: '6px 15px', fontSize: '13px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff' }}>
                                                {selectedEmp.role?.toUpperCase()}
                                            </span>
                                        </div>
                                        <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '15px' }}>
                                            {selectedEmp.designation} • {selectedEmp.department} • Reports to: {selectedEmp.reporting_to || 'N/A'}
                                        </p>
                                        <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                                            <div style={infoStat}>
                                                <span style={infoLabel}>Email</span>
                                                <span style={infoVal}>{selectedEmp.email || 'N/A'}</span>
                                            </div>
                                            <div style={infoStat}>
                                                <span style={infoLabel}>Joining Date</span>
                                                <span style={infoVal}>{selectedEmp.joining_date || 'TBD'}</span>
                                            </div>
                                            <div style={infoStat}>
                                                <span style={infoLabel}>Personal Mobile</span>
                                                <span style={infoVal}>{selectedEmp.personal_mobile || 'N/A'}</span>
                                            </div>
                                            <div style={infoStat}>
                                                <span style={infoLabel}>Location</span>
                                                <span style={infoVal}>{selectedEmp.work_location || 'Bangalore'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>

                            <div className="grid-2" style={{ gap: '24px' }}>
                                {/* Onboarding Monitoring */}
                                <OnboardingWidget empId={selectedEmp.id} />

                                {/* IT Tickets & Access */}
                                <ITTicketsWidget empId={selectedEmp.id} />
                            </div>

                            <BiographicIntel emp={selectedEmp} />

                            <div className="grid-2" style={{ gap: '24px' }}>
                                {/* Recruitment/Panel Status */}
                                <RecruitmentWidget empId={selectedEmp.id} role={selectedEmp.role} />

                                {/* Attendance & Leave Quick Pulse */}
                                <AttendanceWidget empId={selectedEmp.id} />
                            </div>

                            {/* Offboarding Status (Only if on notice or inactive) */}
                            {(selectedEmp.status === 'On Notice' || selectedEmp.status === 'Inactive') && (
                                <OffboardingWidget empId={selectedEmp.id} />
                            )}
                        </div>
                    ) : (
                        <div style={emptyState}>
                            <FaUser size={60} color="rgba(255,255,255,0.05)" />
                            <h3>Select an employee to view intelligence</h3>
                            <p>Monitor real-time status, lifecycle progress, and operational requests</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-components
const OnboardingWidget = ({ empId }: { empId: string }) => {
    const [onboarding, setOnboarding] = useState<any>(null);
    const [preboarding, setPreboarding] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [o, p] = await Promise.all([
                getOnboardingByEmpId(empId),
                getPreboardingByEmpId(empId)
            ]);
            setOnboarding(o);
            setPreboarding(p);
            setLoading(false);
        };
        load();
    }, [empId]);

    if (loading) return <GlassCard title="Onboarding Lifecycle">Loading...</GlassCard>;

    if (!onboarding) return (
        <GlassCard title="Onboarding Lifecycle">
            <div style={noDataMsg}>No onboarding records found for this employee.</div>
        </GlassCard>
    );

    const progress = onboarding.status === 'completed' ? 100 : onboarding.status === 'in_progress' ? 60 : 30;

    return (
        <GlassCard title="Onboarding Lifecycle" subtitle="Core HR integration status">
            <div style={{ marginTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Overall Progress</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0a84ff' }}>{progress}%</span>
                </div>
                <div style={progressBarBg}>
                    <div style={{ ...progressBarFill, width: `${progress}%` }} />
                </div>

                <div style={stepList}>
                    <StepItem label="Identity Verification" status={onboarding.document_verification_status} />
                    <StepItem label="Hardware Allocation" status={onboarding.hardware_allocation_required ? 'completed' : 'pending'} />
                    <StepItem label="Digital NDA & Policies" status={preboarding?.policy_acknowledged ? 'completed' : 'pending'} />
                    <StepItem label="Background Check" status={onboarding.background_verification_status} />
                </div>
            </div>
        </GlassCard>
    );
};

const BiographicIntel = ({ emp }: { emp: any }) => {
    const [preboarding, setPreboarding] = useState<any>(null);

    useEffect(() => {
        getPreboardingByEmpId(emp.id).then(setPreboarding);
    }, [emp.id]);

    return (
        <GlassCard title="Biographic & Identity" subtitle="Core persona intelligence">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '15px' }}>
                <div style={infoStat}>
                    <span style={infoLabel}>Gender</span>
                    <span style={infoVal}>{emp.gender || 'N/A'}</span>
                </div>
                <div style={infoStat}>
                    <span style={infoLabel}>Date of Birth</span>
                    <span style={infoVal}>{emp.dob || 'N/A'}</span>
                </div>
                <div style={infoStat}>
                    <span style={infoLabel}>Blood Group</span>
                    <span style={infoVal}>{emp.blood_group || 'N/A'}</span>
                </div>
                <div style={infoStat}>
                    <span style={infoLabel}>Marital Status</span>
                    <span style={infoVal}>{emp.marital_status || 'N/A'}</span>
                </div>
                <div style={infoStat}>
                    <span style={infoLabel}>Nationality</span>
                    <span style={infoVal}>{emp.nationality || 'Indian'}</span>
                </div>
                <div style={infoStat}>
                    <span style={infoLabel}>Personal Email</span>
                    <span style={infoVal}>{emp.personal_email || 'N/A'}</span>
                </div>
                <div style={infoStat}>
                    <span style={infoLabel}>Emergency Contact</span>
                    <span style={infoVal}>{preboarding?.emergency_contact_name || 'N/A'}</span>
                </div>
                <div style={infoStat}>
                    <span style={infoLabel}>Emergency Phone</span>
                    <span style={infoVal}>{preboarding?.emergency_contact_phone || 'N/A'}</span>
                </div>
            </div>
        </GlassCard>
    );
};

const ITTicketsWidget = ({ empId }: { empId: string }) => {
    const allTickets = getITTickets();
    const empTickets = allTickets.filter((t: any) => t.requested_by_id === empId || t.employee_id === empId);

    return (
        <GlassCard title="IT Ticket Status" subtitle="System & Hardware Requests">
            <div style={{ marginTop: '15px' }}>
                {empTickets.length === 0 ? (
                    <div style={noDataMsg}>No IT tickets raised by this employee.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {empTickets.slice(0, 3).map((t: any) => (
                            <div key={t.id} style={ticketRow}>
                                <div style={{ flex: 1 }}>
                                    <div style={ticketIssue}>{t.issue || t.category}</div>
                                    <div style={ticketDate}>{new Date(t.created_at).toLocaleDateString()} • {t.priority}</div>
                                </div>
                                <div style={{ ...statusBadge, fontSize: '10px', background: t.status === 'Closed' ? 'rgba(48,209,88,0.1)' : 'rgba(10,132,255,0.1)', color: t.status === 'Closed' ? '#30d158' : '#0a84ff' }}>
                                    {t.status}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </GlassCard>
    );
};

const RecruitmentWidget = ({ empId, role }: { empId: string, role: string }) => {
    const interviews = getInterviewsData();
    const panelInterviews = interviews.filter((i: any) =>
        i.panel_member_id === empId ||
        (Array.isArray(i.panel_members) && i.panel_members.includes(empId))
    );

    return (
        <GlassCard title="Interview Panel Status" subtitle="Interviews assigned as panelist">
            <div style={{ marginTop: '15px' }}>
                {panelInterviews.length === 0 ? (
                    <div style={noDataMsg}>Not assigned to any interview panels.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {panelInterviews.slice(0, 3).map((i: any) => (
                            <div key={i.id} style={interviewRow}>
                                <div style={interviewIcon}><FaCalendarCheck /></div>
                                <div>
                                    <div style={interviewTitle}>{i.interview_type} • {i.candidate_name || 'Candidate'}</div>
                                    <div style={interviewTime}>{i.date} @ {i.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </GlassCard>
    );
};

const AttendanceWidget = ({ empId }: { empId: string }) => {
    const attendance = getAttendanceByEmployee(empId);
    const presentCount = attendance.filter((a: any) => a.status === 'Present').length;
    const leaveCount = attendance.filter((a: any) => a.status === 'Leave').length;

    return (
        <GlassCard title="Attendance Pulse" subtitle="Last 30 days summary">
            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div style={attStat}>
                    <div style={{ ...attCircle, borderColor: '#30d158' }}>{presentCount}</div>
                    <span style={attLabel}>Present</span>
                </div>
                <div style={attStat}>
                    <div style={{ ...attCircle, borderColor: '#ff453a' }}>{attendance.filter((a: any) => a.status === 'Absent').length}</div>
                    <span style={attLabel}>Absent</span>
                </div>
                <div style={attStat}>
                    <div style={{ ...attCircle, borderColor: '#0a84ff' }}>{leaveCount}</div>
                    <span style={attLabel}>Leaves</span>
                </div>
            </div>
        </GlassCard>
    );
};

const OffboardingWidget = ({ empId }: { empId: string }) => {
    const [offboarding, setOffboarding] = useState<any>(null);

    useEffect(() => {
        getOffboardingByEmpId(empId).then(setOffboarding);
    }, [empId]);

    if (!offboarding) return null;

    return (
        <GlassCard title="Offboarding Governance">
            <div style={offboardingAlert}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: '#ff453a', fontSize: '15px' }}>Exit Process Initiated</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                        Reason: {offboarding.reason?.toUpperCase()} • Last Working Day: {offboarding.exit_date}
                    </div>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                        <div style={checkRow}>
                            <FaCheckCircle color={offboarding.checklist_status?.it_clearance ? "#30d158" : "rgba(255,255,255,0.2)"} />
                            <span>IT Clearance</span>
                        </div>
                        <div style={checkRow}>
                            <FaCheckCircle color={offboarding.checklist_status?.hr_settlement ? "#30d158" : "rgba(255,255,255,0.2)"} />
                            <span>HR Settlement</span>
                        </div>
                    </div>
                </div>
                <div style={statusBadgeLarge}>
                    {offboarding.completed ? 'COMPLETED' : 'IN PROGRESS'}
                </div>
            </div>
        </GlassCard>
    );
};

const StepItem = ({ label, status }: { label: string, status: string }) => (
    <div style={stepRow}>
        <FaCheckCircle color={status === 'completed' || status === 'verified' || status === 'approved' ? "#30d158" : "rgba(255,255,255,0.1)"} />
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
    </div>
);

// Styles
const searchBox = {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '10px 15px', border: '1px solid rgba(255,255,255,0.1)'
};

const searchInput = {
    background: 'none', border: 'none', color: 'white',
    fontSize: '14px', width: '100%', outline: 'none'
};

const filterRow = {
    display: 'flex', alignItems: 'center', gap: '10px'
};

const roleSelect = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '5px 10px', color: 'white', fontSize: '12px', flex: 1
};

const empListWrapper = {
    marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px',
    maxHeight: '600px', overflowY: 'auto' as const
};

const empListItem = {
    display: 'flex', alignItems: 'center', gap: '15px',
    padding: '12px 15px', borderRadius: '14px', border: '1px solid transparent',
    transition: 'all 0.2s ease', cursor: 'pointer'
};

const avatarCircle = {
    width: '40px', height: '40px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #0a84ff, #007aff)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontWeight: '800', fontSize: '16px', overflow: 'hidden'
};

const avatarImg = { width: '100%', height: '100%', objectFit: 'cover' as const };

const empName = { fontSize: '14px', fontWeight: '700' };
const empId = { fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' };

const statusBadge = {
    fontSize: '9px', fontWeight: '800', padding: '4px 8px', borderRadius: '6px'
};

const profileHeader = {
    display: 'flex', gap: '25px', alignItems: 'center'
};

const largeAvatar = {
    width: '100px', height: '100px', borderRadius: '24px',
    background: 'linear-gradient(135deg, #0a84ff, #007aff)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: '40px', fontWeight: '800', overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
};

const infoStat = { display: 'flex', flexDirection: 'column' as const, gap: '2px' };
const infoLabel = { fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, fontWeight: '700' };
const infoVal = { fontSize: '14px', fontWeight: '600', color: '#0a84ff' };

const emptyState = {
    height: '500px', display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', justifyContent: 'center', gap: '15px',
    textAlign: 'center' as const, opacity: 0.6
};

const noDataMsg = {
    padding: '20px', textAlign: 'center' as const, color: 'var(--text-tertiary)',
    fontSize: '13px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
    border: '1px dashed rgba(255,255,255,0.1)'
};

const progressBarBg = {
    height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px',
    overflow: 'hidden'
};

const progressBarFill = {
    height: '100%', background: 'linear-gradient(90deg, #0a84ff, #64d2ff)',
    borderRadius: '3px', transition: 'width 1s ease-in-out'
};

const stepList = { marginTop: '20px', display: 'flex', flexDirection: 'column' as any, gap: '12px' };
const stepRow = { display: 'flex', alignItems: 'center', gap: '12px' };

const ticketRow = {
    display: 'flex', alignItems: 'center', padding: '10px 15px',
    background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)'
};

const ticketIssue = { fontSize: '13px', fontWeight: '700' };
const ticketDate = { fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' };

const interviewRow = {
    display: 'flex', alignItems: 'center', gap: '15px',
    padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px'
};

const interviewIcon = {
    width: '32px', height: '32px', borderRadius: '10px',
    background: 'rgba(48,209,88,0.1)', color: '#30d158',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const interviewTitle = { fontSize: '13px', fontWeight: '700' };
const interviewTime = { fontSize: '11px', color: 'var(--text-tertiary)' };

const attStat = { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px' };
const attCircle = {
    width: '45px', height: '45px', borderRadius: '50%',
    border: '2px solid', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '16px', fontWeight: '800'
};
const attLabel = { fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '700' };

const offboardingAlert = {
    display: 'flex', alignItems: 'center', gap: '20px', padding: '15px',
    background: 'rgba(255,69,58,0.05)', borderRadius: '16px',
    border: '1px solid rgba(255,69,58,0.2)'
};

const checkRow = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' };
const statusBadgeLarge = {
    padding: '10px 20px', borderRadius: '12px', background: '#ff453a',
    color: 'white', fontWeight: '800', fontSize: '12px'
};
