import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import BottomDock from './BottomDock';
import webSocketService from '../services/websocketService';
import { getMyEmployee, getRole } from '../utils/storage';
import { FaBullhorn, FaTimes } from 'react-icons/fa';
import LiveTimesheetBanner from './LiveTimesheetBanner';

export default function Layout() {
    const [alert, setAlert] = useState<{ title: string, message: string } | null>(null);

    useEffect(() => {
        const me = getMyEmployee();
        const userId = me?.id || me?.user_id;
        const userRole = getRole();

        // Handle incoming announcements
        const handleNewAnnouncement = (data: any) => {
            console.log("[WS] New announcement received in Layout:", data);
            setAlert({ title: data.title, message: data.message });
            setTimeout(() => setAlert(null), 15000);
        };

        const handleNewLeave = (data: any) => {
            if (userRole === 'manager' || userRole === 'hr') {
                setAlert({ title: "New Leave Request", message: `${data.employee_name} applied for ${data.leave_type} (${data.days} days)` });
                setTimeout(() => setAlert(null), 10000);
            }
        };

        // Register listeners
        webSocketService.on("new_announcement", handleNewAnnouncement);
        webSocketService.on("new_leave_request", handleNewLeave);

        if (userId) {
            // Connect with numeric userId (matches backend /ws/{user_id})
            webSocketService.connect(userId);

            const timer = setTimeout(() => {
                if (userRole) {
                    webSocketService.send("set_role", userRole);
                }
            }, 2000);

            return () => {
                clearTimeout(timer);
                webSocketService.off("new_announcement", handleNewAnnouncement);
                webSocketService.off("new_leave_request", handleNewLeave);
                webSocketService.disconnect();
            };
        }

        return () => {
            webSocketService.off("new_announcement", handleNewAnnouncement);
            webSocketService.off("new_leave_request", handleNewLeave);
        };
    }, []);

    return (
        <div className="layout-root">
            <style>{`
                @keyframes slideInDown {
                    from { transform: translate(-50%, -100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>

            {alert && (
                <div className="announcement-banner" style={bannerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                        <div style={iconBadgeStyle}><FaBullhorn /></div>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{alert.title}</div>
                            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>{alert.message}</div>
                        </div>
                    </div>
                    <button onClick={() => setAlert(null)} style={closeBtnStyle}><FaTimes /></button>
                </div>
            )}

            <div className="dashboard-container">
                <Outlet />
            </div>
            <BottomDock />
        </div>
    );
}

const bannerStyle: React.CSSProperties = {
    position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
    width: '94%', maxWidth: '500px', background: 'rgba(10, 132, 255, 0.95)',
    backdropFilter: 'blur(12px)', color: 'white', padding: '14px 18px',
    borderRadius: '18px', zIndex: 9999, display: 'flex', alignItems: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)',
    animation: 'slideInDown 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
};

const iconBadgeStyle: React.CSSProperties = {
    width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
    flexShrink: 0
};

const closeBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer',
    fontSize: '14px', width: '28px', height: '28px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '10px'
};
