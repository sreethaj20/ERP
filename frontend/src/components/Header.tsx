import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBell, FaUserCircle, FaSignOutAlt, FaArrowLeft, FaSun, FaMoon } from 'react-icons/fa';
import Logo from './Logo';
import { logoutUser, endShiftSession, getNotifications, markNotificationRead, getData } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import { useLogoutLogic } from '../hooks/useLogoutLogic';

interface HeaderProps {
  role: string;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ role, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname.endsWith('/dashboard');
  const userId = sessionStorage.getItem('userId') || '';
  const { theme, toggleTheme } = useTheme();
  const { canLogout, handleSafeLogout } = useLogoutLogic();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userName, setUserName] = useState(sessionStorage.getItem('userName') || 'HR Admin');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      const all = await getNotifications();
      // Backend already filters by current user, just map fields if needed or use as is
      // If backend returns {id, user_id, title, message, type, is_read, created_at}
      if (Array.isArray(all)) {
        const mapped = all.map((n: any) => ({
          ...n,
          read: n.is_read,
          userId: n.user_id,
          timestamp: n.created_at
        }));
        setNotifications(mapped);
      }
      setUserName(sessionStorage.getItem('userName') || 'HR Admin');

      const employees = await getData('employee');
      if (Array.isArray(employees)) {
        const user = employees.find((e: any) => e.id === userId);
        if (user) setUserPhoto(user.profile_photo_url || user.photo || null);
      }
    };

    fetchNotifications();
    window.addEventListener('storage', fetchNotifications);
    return () => window.removeEventListener('storage', fetchNotifications);
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Format role for display
  const roleMap: Record<string, string> = {
    'hr': 'HR',
    'it': 'IT',
    'recruiter': 'Recruiter',
    'teamleader': 'Team Leader',
    'manager': 'Manager',
    'employee': 'Employee'
  };
  const roleKey = role.toLowerCase().replace(/[\s_]+/g, '');
  const displayRole = roleMap[roleKey] || (role.charAt(0).toUpperCase() + role.slice(1).replace(/([A-Z])/g, ' $1').trim());
  const displayTitle = title || `${displayRole} Portal`;

  const executeLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;

    // logoutUser is async: records checkout → clears session → redirects to /login
    await logoutUser();
  };

  const handleLogout = async () => {
    await handleSafeLogout(executeLogout);
  };


  return (
    <div className="top-header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '40px',
      paddingBottom: '20px',
      borderBottom: '1px solid var(--border-light)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {!isDashboard && (
            <button
              onClick={() => navigate(-1)}
              className="apple-btn"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                width: '38px', height: '38px',
                padding: '0',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              title="Go Back"
            >
              <FaArrowLeft size={14} />
            </button>
          )}
          <Logo width="auto" layout="horizontal" showTagline={false} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <a
          href="https://mercuresolution.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "13px",
            color: "var(--text-tertiary)",
            textDecoration: "none",
            fontWeight: 500
          }}
        >
          www.mercuresolution.com
        </a>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            border: `1px solid var(--border-light)`,
            borderRadius: '20px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            color: theme === 'dark' ? '#ffd60a' : '#5856d6',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
        >
          {theme === 'dark' ? <FaSun size={14} /> : <FaMoon size={14} />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-light)' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ position: 'relative', cursor: 'pointer', color: showNotifications ? 'var(--accent-blue)' : 'var(--text-secondary)', transition: 'all 0.2s' }}
            >
              <FaBell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-5px', right: '-5px',
                  background: 'var(--accent-red)', color: 'white',
                  fontSize: '10px', padding: '2px 5px', borderRadius: '10px',
                  fontWeight: 'bold', border: '2px solid #1c1c1e'
                }}>{unreadCount}</span>
              )}
            </div>

            {showNotifications && (
              <div style={{
                position: 'absolute', top: '40px', right: '0', width: '320px',
                background: '#1c1c1e', border: '1px solid var(--border-light)',
                borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                zIndex: 1000, overflow: 'hidden'
              }}>
                <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => notifications.forEach(n => !n.read && markNotificationRead(n.id))}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationRead(n.id);
                          setShowNotifications(false);
                        }}
                        style={{
                          padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                          cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(0,122,255,0.05)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: n.read ? 'var(--text-tertiary)' : 'var(--accent-blue)', textTransform: 'uppercase' }}>{n.type}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p style={{ fontSize: '13px', margin: 0, color: n.read ? 'var(--text-secondary)' : '#fff', lineHeight: '1.4' }}>{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div style={{ padding: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '12px', cursor: 'pointer' }}>View All Activity</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            onClick={() => navigate(`/${role.toLowerCase().replace(/\s/g, '')}/profile`)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '5px', cursor: 'pointer' }}
          >
            <div style={{ textAlign: 'right', display: 'none', md: 'block' } as any}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{userName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{displayRole}</div>
            </div>
            {userPhoto ? (
              <img src={userPhoto} alt={userName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <FaUserCircle size={32} color="var(--text-secondary)" />
            )}
          </div>

          {canLogout && (
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255, 69, 58, 0.1)',
                border: 'none',
                color: '#ff453a',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title="Logout"
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)'}
            >
              <FaSignOutAlt size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
