import React, { useState, useEffect } from "react";
import GlassCard from "./GlassCard";
import { FaSync, FaCircle } from "react-icons/fa";
import { getEmployees, getUserPresence } from "../utils/storage";
import { formatLocalTime } from "../utils/formatters";

interface PresenceRecord {
    employee_id: string;
    employee_name: string;
    role: string;
    department: string;
    date: string;
    login_time: string | null;
    logout_time: string | null;
    is_online: boolean;
}

export default function OrganizationAttendanceWidget() {
    const [presence, setPresence] = useState<PresenceRecord[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState(new Date());

    const fetchData = () => {
        setLoading(true);
        try {
            const presenceData = getUserPresence();
            const empData = getEmployees();
            setPresence(presenceData);
            setEmployees(empData);
        } catch (err) {
            console.error("Pulse widget local error:", err);
        } finally {
            setLoading(false);
            setLastSync(new Date());
        }
    };

    useEffect(() => {
        fetchData();
        window.addEventListener('storage', fetchData);
        const interval = setInterval(fetchData, 30000);
        return () => {
            window.removeEventListener('storage', fetchData);
            clearInterval(interval);
        };
    }, []);

    const targetDepts = [
        { key: "HR Team", labels: ["hr", "human resources"] },
        { key: "Recruiter Team", labels: ["recruiter", "talent"] },
        { key: "Team Leaders", labels: ["teamleader", "team leader", "tl"] },
        { key: "IT Department", labels: ["it department", "it", "support"] }
    ];

    const stats = targetDepts.map(dept => {
        const checkMatch = (item: any) => {
            const d = (item.department || '').toLowerCase();
            const r = (item.role || '').toLowerCase().replace(/\s+/g, '');

            return dept.labels.some(l => {
                const searchLabel = l.toLowerCase();
                // For very short labels like "it", "hr", "tl", we need exact match or word boundary
                if (searchLabel.length <= 3) {
                    const regex = new RegExp(`\\b${searchLabel}\\b`, 'i');
                    return regex.test(d) || r === searchLabel.replace(/\s+/g, '');
                }
                // For longer labels, substring is usually safe (e.g. "human resources")
                return d.includes(searchLabel) || r.includes(searchLabel.replace(/\s+/g, ''));
            });
        };

        const deptEmployees = employees.filter(e => checkMatch(e));
        const deptPresence = presence.filter(p => checkMatch(p));

        const activeNow = deptPresence.filter(p => p.is_online).length;
        const totalDeptCount = deptEmployees.length;

        // Get latest login from this department today
        const sortedPresence = [...deptPresence].sort((a, b) =>
            (b.login_time || "").localeCompare(a.login_time || "")
        );

        const latestIn = sortedPresence.length > 0 && sortedPresence[0].login_time
            ? formatLocalTime(sortedPresence[0].login_time)
            : "—";

        return {
            name: dept.key,
            count: totalDeptCount,
            active: activeNow,
            latestIn: latestIn,
            status: activeNow > 0 ? "Operational" : "Idle",
            color: activeNow > 0 ? "#30d158" : "var(--text-tertiary)"
        };
    });

    return (
        <GlassCard title="Organization Pulse" subtitle="Live departmental connectivity check">
            <div style={{ marginTop: "15px" }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ padding: '8px 0' }}>DEPARTMENT</th>
                            <th>CONNECTIVITY</th>
                            <th>STATUS</th>
                            <th>LATEST ACTIVITY</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '13px' }}>
                        {stats.map((dept, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '12px 0', fontWeight: '600', color: '#fff' }}>{dept.name}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>
                                    <span style={{ color: dept.active > 0 ? '#30d158' : 'inherit' }}>{dept.active}</span>
                                    <span style={{ margin: '0 4px', opacity: 0.3 }}>/</span>
                                    {dept.count} Members
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: dept.color }}>
                                        <FaCircle size={6} style={{ filter: dept.active > 0 ? 'drop-shadow(0 0 4px #30d158)' : 'none' }} />
                                        <span style={{ fontSize: '11px', fontWeight: '700' }}>{dept.status.toUpperCase()}</span>
                                    </div>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{dept.latestIn}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ marginTop: '20px', padding: '10px 15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaSync size={10} className={loading ? "spin-animation" : ""} />
                        UPDATED: {lastSync.toLocaleTimeString()}
                    </div>
                    <button
                        onClick={fetchData}
                        style={{ background: 'none', border: 'none', color: '#0a84ff', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        FORCE SYNC
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spin-animation { animation: spin 1s linear infinite; }
            `}</style>
        </GlassCard>
    );
}
