import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    FaHome, FaUsers, FaUserTie, FaClipboardList, FaBullhorn,
    FaCalendarAlt, FaFileAlt, FaCog, FaSignOutAlt, FaLaptop,
    FaBriefcase, FaMoneyBillWave, FaBuilding, FaUserShield, FaSitemap,
    FaSync, FaUserPlus, FaStar, FaClock, FaProjectDiagram
} from 'react-icons/fa';
import Logo from './Logo';
import { logoutUser, endShiftSession, getActiveSessionHours } from '../utils/storage';

export default function Sidebar() {
    const location = useLocation();

    // Extract role from URL path (e.g., /manager/dashboard -> manager)
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const currentRole = pathSegments[0] || 'employee';

    const handleLogout = async () => {
        if (!window.confirm('Are you sure you want to logout?')) return;

        const isManager = currentRole.toLowerCase() === 'manager';
        if (!isManager) {
            const userId = sessionStorage.getItem('userId') || '';
            const result = await endShiftSession(userId).catch(() => null);
            if (result && !result?.success) {
                if (!window.confirm(`⚠️ ${result?.message}\n\nForce logout anyway? Attendance will be marked Absent.`)) return;
            }
        }

        // logoutUser is async: records checkout → clears session → redirects to /login
        await logoutUser();
    };

    // Define menu items based on role
    const getMenuItems = (role: string) => {
        switch (role) {
            case 'manager':
                return [
                    { name: 'Home', path: '/manager/dashboard', icon: <FaHome /> },
                    { name: 'Lifecycle', path: '/manager/lifecycle', icon: <FaSync /> },
                    { name: 'Onboarding', path: '/manager/onboarding', icon: <FaUserPlus /> },
                    { name: 'Workflow', path: '/manager/workflow', icon: <FaProjectDiagram /> },
                    { name: 'Hierarchy', path: '/manager/hierarchy', icon: <FaSitemap /> },
                    { name: 'Security', path: '/manager/access-control', icon: <FaUserShield /> },
                    { name: 'TL Dashboard', path: '/manager/team-status', icon: <FaUserShield /> },
                    { name: 'Interviews', path: '/manager/interviews', icon: <FaCalendarAlt /> },
                    { name: 'Recruiter', path: '/manager/pipeline', icon: <FaBriefcase /> },
                    { name: 'IT Department', path: '/manager/it-tickets', icon: <FaLaptop /> },
                    { name: 'Offboarding', path: '/manager/offboarding', icon: <FaSignOutAlt /> },
                    { name: 'Timesheets', path: '/manager/staff-timesheet', icon: <FaCalendarAlt /> },
                    { name: 'Performance', path: '/manager/performance', icon: <FaStar /> },
                    { name: 'My Profile', path: '/manager/profile', icon: <FaUserTie /> },
                ];
            case 'hr':
                return [
                    { name: 'Dashboard', path: '/hr/dashboard', icon: <FaHome /> },
                    { name: 'Employees', path: '/hr/employees', icon: <FaUsers /> },
                    { name: 'Hiring', path: '/hr/hiring', icon: <FaUserPlus /> },
                    { name: 'Interviews', path: '/hr/interviews', icon: <FaCalendarAlt /> },
                    { name: 'Payroll', path: '/hr/payroll', icon: <FaMoneyBillWave /> },
                    { name: 'Attendance', path: '/hr/attendance', icon: <FaCalendarAlt /> },
                    { name: 'Shift Mgmt', path: '/hr/shifts', icon: <FaCog /> },
                    { name: 'Leaves', path: '/hr/leaves', icon: <FaClipboardList /> },
                    { name: 'My Assets', path: '/hr/my-assets', icon: <FaLaptop /> },
                    { name: 'Timesheets', path: '/hr/shift-timesheet', icon: <FaFileAlt /> },
                    { name: 'My Leave', path: '/hr/my-leave', icon: <FaClipboardList /> },
                    { name: 'My Profile', path: '/hr/profile', icon: <FaUserTie /> },
                ];
            case 'recruiter':
                return [
                    { name: 'Dashboard', path: '/recruiter/dashboard', icon: <FaHome /> },
                    { name: 'Jobs', path: '/recruiter/jobs', icon: <FaBriefcase /> },
                    { name: 'Pipeline', path: '/recruiter/pipeline', icon: <FaUsers /> },
                    { name: 'Interviews', path: '/recruiter/interviews', icon: <FaCalendarAlt /> },
                    { name: 'My Assets', path: '/recruiter/my-assets', icon: <FaLaptop /> },
                    { name: 'Leaves', path: '/recruiter/leaves', icon: <FaClipboardList /> },
                    { name: 'My Leave', path: '/recruiter/my-leave', icon: <FaCalendarAlt /> },
                    { name: 'My Profile', path: '/recruiter/profile', icon: <FaUserTie /> },
                ];
            case 'teamleader':
                return [
                    { name: 'Dashboard', path: '/teamleader/dashboard', icon: <FaHome /> },
                    { name: 'My Team', path: '/teamleader/members', icon: <FaUsers /> },
                    { name: 'Attendance', path: '/teamleader/attendance', icon: <FaCalendarAlt /> },
                    { name: 'Tasks', path: '/teamleader/tasks', icon: <FaClipboardList /> },
                    { name: 'Interviews', path: '/teamleader/interviews', icon: <FaCalendarAlt /> },
                    { name: 'My Assets', path: '/teamleader/my-assets', icon: <FaLaptop /> },
                    { name: 'Leaves', path: '/teamleader/leaves', icon: <FaFileAlt /> },
                    { name: 'Timesheets', path: '/teamleader/shift-timesheet', icon: <FaCalendarAlt /> },
                    { name: 'Performance', path: '/teamleader/performance', icon: <FaStar /> },
                    { name: 'My Leave', path: '/teamleader/my-leave', icon: <FaCalendarAlt /> },
                    { name: 'My Profile', path: '/teamleader/profile', icon: <FaUserTie /> },
                ];
            case 'it':
                return [
                    { name: 'Dashboard', path: '/it/dashboard', icon: <FaHome /> },
                    { name: 'Assets', path: '/it/assets', icon: <FaLaptop /> },
                    { name: 'Tickets', path: '/it/tickets', icon: <FaBullhorn /> },
                    { name: 'Access', path: '/it/access', icon: <FaCog /> },
                    { name: 'My Leave', path: '/it/my-leave', icon: <FaCalendarAlt /> },
                    { name: 'My Profile', path: '/it/profile', icon: <FaUserTie /> },
                ];
            case 'employee':
            default:
                return [
                    { name: 'Dashboard', path: '/employee/dashboard', icon: <FaHome /> },
                    { name: 'My Profile', path: '/employee/profile', icon: <FaUserTie /> },
                    { name: 'My Assets', path: '/employee/assets', icon: <FaLaptop /> },
                    { name: 'History', path: '/employee/attendance/history', icon: <FaCalendarAlt /> },
                    { name: 'Timesheet', path: '/employee/shift-timesheet', icon: <FaFileAlt /> },
                    { name: 'Early Login', path: '/employee/early-login', icon: <FaClock /> },
                    { name: 'Leave', path: '/employee/leave', icon: <FaClipboardList /> },
                    { name: 'Payslips', path: '/employee/payslips', icon: <FaMoneyBillWave /> },
                ];
        }
    };

    const menuItems = getMenuItems(currentRole);

    return (
        <aside className="sidebar glass-panel">
            <div className="sidebar-header">
                <Logo width="100%" layout="horizontal" showTagline={false} />
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-text">{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button onClick={handleLogout} className="logout-btn">
                    <FaSignOutAlt />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
