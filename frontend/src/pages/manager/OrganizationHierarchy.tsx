import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getEmployees } from "../../utils/storage";
import { FaUserTie, FaUserShield, FaUserEdit, FaUsers, FaAngleRight, FaAngleDown, FaSitemap } from "react-icons/fa";

interface Employee {
    id: string;
    employee_id: string;
    name: string;
    role: string;
    department: string;
    manager_id?: string;
    reporting_to_id?: string;
    status: string;
    photo?: string;
}


export default function OrganizationHierarchy() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ "MGR001": true, "MGR-001": true });


    const loadData = async () => {
        try {
            const data = await getEmployees();
            const employeesArray = Array.isArray(data) ? data : [];
            setEmployees(employeesArray);
            
            // Debug: Log employee data and reporting structure
            console.log('Employees loaded:', employeesArray.length);
            console.log('Employee reporting structure:', employeesArray.map(e => ({
                id: e.id,
                employee_id: e.employee_id,
                name: e.name,
                role: e.role,
                manager_id: e.manager_id,
                reporting_to_id: e.reporting_to_id
            })));
        } catch (error) {
            console.error('Error loading employees:', error);
            setEmployees([]);
        }
    };

    useEffect(() => {
        loadData();
        window.addEventListener('storage', loadData);
        const interval = setInterval(loadData, 10000);
        return () => {
            window.removeEventListener('storage', loadData);
            clearInterval(interval);
        };
    }, []);

    const toggleNode = (id: string) => {
        setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getSubordinates = (parentId: string, parentEmployeeId: string) => {
        return (employees || []).filter(e => {
            const mId = String(e.manager_id || e.reporting_to_id || '');
            return mId === String(parentId) || mId === String(parentEmployeeId);
        });
    };

    const renderNode = (emp: Employee, level: number = 0) => {
        const subordinates = getSubordinates(emp.id, emp.employee_id);
        const isExpanded = expandedNodes[emp.id];
        const hasSubordinates = subordinates.length > 0;

        return (
            <div key={emp.id} style={{ marginLeft: level > 0 ? '30px' : '0', marginTop: '10px' }}>
                <div
                    onClick={() => hasSubordinates && toggleNode(emp.id)}
                    style={{
                        ...nodeStyle,
                        borderLeft: `4px solid ${getRoleColor(emp.role)}`,
                        cursor: hasSubordinates ? 'pointer' : 'default',
                        background: isExpanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        {hasSubordinates ? (
                            isExpanded ? <FaAngleDown size={14} color="var(--text-tertiary)" /> : <FaAngleRight size={14} color="var(--text-tertiary)" />
                        ) : (
                            <div style={{ width: '14px' }} />
                        )}

                        <img
                            src={emp.photo || `https://ui-avatars.com/api/?name=${emp.name}&background=random`}
                            alt={emp.name}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-light)' }}
                        />

                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{emp.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {emp.role || 'Staff'} • {emp.department || 'General'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {hasSubordinates && (
                            <span style={badgeStyle}>
                                <FaUsers size={10} /> {subordinates.length} Reports
                            </span>
                        )}
                        <span style={{
                            fontSize: '9px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px',
                            background: emp.status === 'Active' ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)',
                            color: emp.status === 'Active' ? '#30d158' : '#ff453a'
                        }}>
                            {(emp.status || 'Active').toUpperCase()}
                        </span>
                    </div>
                </div>

                {hasSubordinates && isExpanded && (
                    <div style={{
                        borderLeft: '1px dashed var(--border-light)',
                        marginLeft: '15px',
                        paddingLeft: '5px'
                    }}>
                        {subordinates.map(sub => renderNode(sub, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const getRoleColor = (role: string) => {
        const r = (role || '').toLowerCase().replace(/\s+/g, '');
        if (r === 'manager') return '#ff9f0a';
        if (r === 'hr') return '#0a84ff';
        if (r === 'teamleader') return '#bf5af2';
        if (r === 'recruiter') return '#30d158';
        if (r === 'it') return '#64d2ff';
        return 'var(--text-tertiary)';
    };

    // Start with the top-level manager (Any manager who doesn't report to anyone or reports to themselves)
    const topManagers = (employees || []).filter(e => {
        const role = (e.role || '').toLowerCase();
        const mId = String(e.manager_id || e.reporting_to_id || '');
        const isMGR001 = e.employee_id === 'MGR001' || e.employee_id === 'MGR-001';
        return (role === 'manager' && (!mId || mId === '' || mId === String(e.id) || mId === String(e.employee_id))) || isMGR001;
    });


    // If no clear top manager found, get the first manager as fallback
    if (topManagers.length === 0) {
        const allManagers = (employees || []).filter(e => (e.role || '').toLowerCase() === 'manager');
        if (allManagers.length > 0) {
            topManagers.push(allManagers[0]);
        }
    }

    // Debug: Log top managers found
    console.log('Top managers identified:', topManagers.map(m => ({
        id: m.id,
        name: m.name,
        role: m.role,
        manager_id: m.manager_id
    })));

    return (
        <div className="dashboard-container">
            <Header role="Manager" title="Organizational Architecture" />

            <div style={{ marginBottom: "30px", display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Corporate Hierarchy</h1>
                    <p className="subtitle">Visualizing reporting lines, spans of control, and organizational depth</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setExpandedNodes({})} className="apple-btn" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)' }}>Collapse All</button>
                    <button onClick={() => {
                        const all: any = {};
                        employees.forEach(e => all[e.id] = true);
                        setExpandedNodes(all);
                    }} className="apple-btn" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)' }}>Expand All</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.4fr', gap: '24px' }}>
                <GlassCard title="Org Chart (Tiered View)" subtitle="Click on managers to expand/collapse their teams">
                    <div style={{ padding: '10px 0' }}>
                        {topManagers.length > 0 ? (
                            topManagers.map(mgr => renderNode(mgr))
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                No hierarchy data found. Ensure employees have 'reporting_to_id' configured.
                            </div>
                        )}
                    </div>
                </GlassCard>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <GlassCard title="Hierarchy Insights" subtitle="Structural analytics">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                            <StatRow label="Organization Depth" val="3 Levels" />
                            <StatRow label="Direct Reports (Avg)" val={(employees.length / ((employees || []).filter(e => getSubordinates(e.id, e.employee_id).length > 0).length || 1)).toFixed(1)} />
                            <StatRow label="Unassigned Staff" val={(employees || []).filter(e => !(e.manager_id || e.reporting_to_id) && (e.role || '').toLowerCase() !== 'manager').length} color="#ff453a" />

                        </div>
                    </GlassCard>

                    <GlassCard title="Legend" subtitle="Role-based identification">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                            <LegendItem color="#ff9f0a" label="Director / Manager" />
                            <LegendItem color="#0a84ff" label="Human Resources" />
                            <LegendItem color="#bf5af2" label="Team Leadership" />
                            <LegendItem color="#30d158" label="Talent Acquisition" />
                            <LegendItem color="#64d2ff" label="IT Systems" />
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

const nodeStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border-light)',
    transition: 'all 0.2s ease',
    marginBottom: '8px'
};

const badgeStyle = {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--accent-blue)',
    background: 'rgba(10,132,255,0.1)',
    padding: '3px 8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
};

const StatRow = ({ label, val, color }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: '700', color: color || '#fff' }}>{val}</span>
    </div>
);

const LegendItem = ({ color, label }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color }} />
        {label}
    </div>
);
