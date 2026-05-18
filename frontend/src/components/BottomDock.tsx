import { NavLink, useLocation } from 'react-router-dom';
import {
    FaThLarge, FaClock, FaUsers, FaBriefcase, FaCalendarAlt,
    FaWallet, FaQuestionCircle, FaCog, FaSignOutAlt, FaBuilding,
    FaUserCircle, FaUserPlus, FaChartBar, FaUserTie, FaUserClock
} from 'react-icons/fa';
import { logoutUser } from '../utils/storage';
import { useLogoutLogic } from '../hooks/useLogoutLogic';

export default function BottomDock() {
    const location = useLocation();
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const currentRole = pathSegments[0] || 'employee';
    const { canLogout, handleSafeLogout } = useLogoutLogic();

    const executeLogout = async () => {
        if (!window.confirm('Are you sure you want to sign out?')) return;
        await logoutUser(); // records checkout + clears session + redirects
    };

    const handleLogout = async () => {
        await handleSafeLogout(executeLogout);
    };

    // ... (rest of getDockItems remains same)
    const getDockItems = (role: string) => {
        const r = role.toLowerCase();
        switch (r) {
            case 'manager':
                return [
                    { name: 'Home', path: '/manager/dashboard', icon: <FaThLarge /> },
                    { name: 'Company', path: '/manager/company-profile', icon: <FaBuilding /> },
                    { name: 'Onboarding', path: '/manager/onboarding', icon: <FaUserPlus /> },
                    { name: 'Attendance', path: '/manager/attendance', icon: <FaClock /> },
                    { name: 'Leaves', path: '/manager/leaves', icon: <FaCalendarAlt /> },
                    { name: 'Reports', path: '/manager/reports', icon: <FaChartBar /> },
                    { name: 'Profile', path: '/manager/profile', icon: <FaUserCircle /> },
                ];


            case 'hr':
                return [
                    { name: 'Home', path: '/hr/dashboard', icon: <FaThLarge /> },
                    { name: 'Employees', path: '/hr/employees', icon: <FaUsers /> },
                    { name: 'Attendance', path: '/hr/attendance', icon: <FaClock /> },
                    { name: 'Emp Leaves', path: '/hr/leaves', icon: <FaCalendarAlt /> },
                    { name: 'My Leave', path: '/hr/my-leave', icon: <FaUserClock /> },
                    { name: 'Payroll', path: '/hr/payroll', icon: <FaWallet /> },
                    { name: 'Profile', path: '/hr/profile', icon: <FaUserCircle /> },
                ];
            case 'teamleader':
                return [
                    { name: 'Home', path: '/teamleader/dashboard', icon: <FaThLarge /> },
                    { name: 'Members', path: '/teamleader/members', icon: <FaUsers /> },
                    { name: 'Attendance', path: '/teamleader/attendance', icon: <FaClock /> },
                    { name: 'Team Leaves', path: '/teamleader/leaves', icon: <FaCalendarAlt /> },
                    { name: 'My Leave', path: '/teamleader/my-leave', icon: <FaUserClock /> },
                    { name: 'Reports', path: '/teamleader/reports', icon: <FaBriefcase /> },
                    { name: 'Profile', path: '/teamleader/profile', icon: <FaUserCircle /> },
                ];
            case 'recruiter':
                return [
                    { name: 'Home', path: '/recruiter/dashboard', icon: <FaThLarge /> },
                    { name: 'Jobs', path: '/recruiter/jobs', icon: <FaBriefcase /> },
                    { name: 'Pipeline', path: '/recruiter/pipeline', icon: <FaUsers /> },
                    { name: 'Interviews', path: '/recruiter/interviews', icon: <FaCalendarAlt /> },
                    { name: 'Offers', path: '/recruiter/offers', icon: <FaWallet /> },
                    { name: 'My Leave', path: '/recruiter/my-leave', icon: <FaUserClock /> },
                    { name: 'Profile', path: '/recruiter/profile', icon: <FaUserCircle /> },
                ];
            case 'it':
                return [
                    { name: 'Home', path: '/it/dashboard', icon: <FaThLarge /> },
                    { name: 'Assets', path: '/it/assets', icon: <FaBriefcase /> },
                    { name: 'Tickets', path: '/it/tickets', icon: <FaQuestionCircle /> },
                    { name: 'Access', path: '/it/access', icon: <FaCog /> },
                    { name: 'Reports', path: '/it/reports', icon: <FaChartBar /> },
                    { name: 'My Leave', path: '/it/my-leave', icon: <FaCalendarAlt /> },
                    { name: 'Profile', path: '/it/profile', icon: <FaUserCircle /> },
                ];
            case 'employee':
                return [
                    { name: 'Home', path: '/employee/dashboard', icon: <FaThLarge /> },
                    { name: 'Attendance', path: '/employee/attendance/history', icon: <FaClock /> },
                    { name: 'Leave', path: '/employee/leave', icon: <FaCalendarAlt /> },
                    { name: 'Payroll', path: '/employee/payroll', icon: <FaWallet /> },
                    { name: 'Support', path: '/employee/support', icon: <FaQuestionCircle /> },
                    { name: 'Profile', path: '/employee/profile', icon: <FaUserCircle /> },
                ];
            default:
                return [
                    { name: 'Home', path: `/${r}/dashboard`, icon: <FaThLarge /> },
                    { name: 'Profile', path: `/${r}/profile`, icon: <FaUserCircle /> },
                ];
        }
    };

    const dockItems = getDockItems(currentRole);

    return (
        <div className="bottom-dock-container">
            <div className="bottom-dock">
                {dockItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `dock-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <span className="dock-icon">{item.icon}</span>
                        {location.pathname === item.path && <span className="dock-label">{item.name}</span>}
                    </NavLink>
                ))}

                {canLogout && (
                    <>
                        <div className="dock-divider"></div>

                        <button
                            className="dock-item"
                            onClick={handleLogout}
                            title="Sign Out"
                            style={{ color: '#ff453a' }} // Apple Red
                        >
                            <span className="dock-icon"><FaSignOutAlt /></span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
