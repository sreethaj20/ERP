import React, { useEffect, useState } from 'react';
import webSocketService from '../services/websocketService';
import { FaCircle } from 'react-icons/fa';
import { getEmployees } from '../utils/storage';

interface UserStatus {
    user_id: string;
    status: 'online' | 'offline';
}

export default function RealTimeStatusHeader() {
    const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
    const currentUserRole = sessionStorage.getItem("userRole")?.toLowerCase();
    const currentUserId = sessionStorage.getItem("userId");
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        setEmployees(getEmployees());

        const handleStatusChange = (data: any) => {
            setStatuses(prev => ({
                ...prev,
                [data.user_id]: {
                    user_id: data.user_id,
                    status: data.status
                }
            }));
        };

        webSocketService.on("user_status_changed", handleStatusChange);

        return () => {
            webSocketService.off("user_status_changed", handleStatusChange);
        };
    }, []);

    // Define which users to watch based on current role
    const getWatchlist = () => {
        // Manager watches departmental heads (HR, Recruiter, TLs, IT)
        if (currentUserRole === 'manager') {
            const heads = employees.filter(e => {
                const r = (e.role || '').toLowerCase().replace(/[\s_]+/g, '');
                return ['hr', 'recruiter', 'teamleader', 'it', 'itdepartment'].includes(r) && e.id !== currentUserId;
            }).map(e => e.id);
            return [...new Set(heads)];
        }

        // Others watch Manager and their own department heads
        if (currentUserRole === 'hr') return ['MGR-001'];
        if (currentUserRole === 'recruiter') return ['HR-001', 'MGR-001'];
        if (currentUserRole === 'teamleader') return ['MGR-001'];
        if (currentUserRole === 'it') return ['MGR-001', 'HR-001'];

        return ['MGR-001']; // Default
    };

    const watchlist = getWatchlist();

    // Labels mapping from real employee data
    const labels: Record<string, string> = {
        'MGR-001': 'Manager'
    };

    employees.forEach(emp => {
        labels[emp.id] = emp.name;
    });

    const visibleStatuses = watchlist
        .map(id => statuses[id] || { user_id: id, status: 'offline' })
        .filter(s => s.user_id !== currentUserId);

    return (
        <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '5px' }}>
            {visibleStatuses.map(s => (
                <div key={s.user_id} title={s.user_id} style={statusItemStyle}>
                    <FaCircle size={8} color={s.status === 'online' ? "#30d158" : "#8e8e93"} style={{ opacity: s.status === 'online' ? 1 : 0.4 }} />
                    <span style={labelStyle}>{labels[s.user_id] || s.user_id}</span>
                </div>
            ))}
        </div>
    );
}

const statusItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.03)',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid var(--border-light)'
};

const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};
