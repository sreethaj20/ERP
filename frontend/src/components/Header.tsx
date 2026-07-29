import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBell, FaUserCircle, FaArrowLeft, FaCoffee, FaPlay } from 'react-icons/fa';
import Logo from './Logo';
import { logoutUser, getNotifications, markNotificationRead, getData, getActiveShiftSession, startShiftSession, getEmployeeShift, takeBreak, endBreak } from '../utils/storage';
import { parseISOToLocalDate, getOrSetDailyLoginTime } from '../utils/formatters';
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
  const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId') || '';
  const { theme, toggleTheme } = useTheme();
  const { canLogout, handleSafeLogout } = useLogoutLogic();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userName, setUserName] = useState(sessionStorage.getItem('userName') || localStorage.getItem('userName') || 'HR Admin');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [workDuration, setWorkDuration] = useState("00:00:00");
  const [session, setSession] = useState<any>(null);
  const [breakLoading, setBreakLoading] = useState(false);

  const formatSeconds = (totalSeconds: number) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [isOvertime, setIsOvertime] = useState(false);

  const syncShiftSession = async () => {
    const res = await getActiveShiftSession();
    const active = res?.active ? res.session : null;
    setSession(active);
    if (active) {
      const rawStart = active.login_time || active.started_at || active.created_at;
      if (rawStart) {
        localStorage.setItem("active_shift_login_iso", String(rawStart));
      }
    }
  };

  const tickShift = () => {
    const now = new Date();
    const sessionStart = session?.login_time || session?.started_at || session?.created_at || localStorage.getItem("active_shift_login_iso");

    if (!sessionStart) {
      setWorkDuration("00:00:00");
      setIsOvertime(false);
      return;
    }

    const loginDate = parseISOToLocalDate(sessionStart);

    if (isNaN(loginDate.getTime())) {
      setWorkDuration("00:00:00");
      setIsOvertime(false);
      return;
    }

    let totalBreakSec = 0;
    if (session) {
      const isOnBreak = Boolean(session.on_break);
      let currentBreakSec = 0;
      if (isOnBreak && session.current_break_start) {
        const breakDate = parseISOToLocalDate(session.current_break_start);
        if (!isNaN(breakDate.getTime())) {
          currentBreakSec = Math.max(0, Math.floor((now.getTime() - breakDate.getTime()) / 1000));
        }
      }
      totalBreakSec = (Number(session.total_break_seconds) || 0) + currentBreakSec;
    }

    const diffMs = now.getTime() - loginDate.getTime();
    const totalShiftSec = Math.max(0, Math.floor(diffMs / 1000));
    const totalWorkSec = Math.max(0, totalShiftSec - totalBreakSec);

    const targetSec = 9 * 3600; // 9 hours fixed target
    if (totalWorkSec >= targetSec) {
      const extraSec = totalWorkSec - targetSec;
      setWorkDuration(`+${formatSeconds(extraSec)}`);
      setIsOvertime(true);
    } else {
      const remainingSec = targetSec - totalWorkSec;
      setWorkDuration(formatSeconds(remainingSec));
      setIsOvertime(false);
    }
  };

  const handleToggleBreak = async () => {
    if (!userId || breakLoading) return;
    try {
      setBreakLoading(true);
      if (!session) {
        const targetId = sessionStorage.getItem("employeeId") || localStorage.getItem("employeeId") || userId;
        const myShift = getEmployeeShift(targetId);
        await startShiftSession(myShift?.id || 0);
      }
      if (session?.on_break) {
        await endBreak(userId);
      } else {
        await takeBreak(userId);
      }
      await syncShiftSession();
    } catch (err) {
      console.error("Break action error:", err);
    } finally {
      setBreakLoading(false);
    }
  };

  useEffect(() => {
    const initShift = async () => {
      try {
        const res = await getActiveShiftSession();
        if (res?.active && res.session) {
          setSession(res.session);
          const rawStart = res.session.login_time || res.session.started_at || res.session.created_at;
          if (rawStart) {
            localStorage.setItem("active_shift_login_iso", String(rawStart));
          }
          return;
        }

        const userLoggedOut = (sessionStorage.getItem("shift_user_logged_out") || localStorage.getItem("shift_user_logged_out")) === "true";

        if (!userLoggedOut) {
          const targetId = sessionStorage.getItem("employeeId") || localStorage.getItem("employeeId") || userId;
          const myShift = getEmployeeShift(targetId);
          await startShiftSession(myShift?.id || 0);
          const updated = await getActiveShiftSession();
          if (updated?.active && updated.session) {
            setSession(updated.session);
            const rawStart = updated.session.login_time || updated.session.started_at || updated.session.created_at;
            if (rawStart) {
              localStorage.setItem("active_shift_login_iso", String(rawStart));
            }
          }
        }
      } catch (e) {
        console.warn("Shift init error:", e);
      }
    };

    initShift();
    const pollInt = setInterval(syncShiftSession, 20000);
    const tickInt = setInterval(tickShift, 1000);

    return () => {
      clearInterval(pollInt);
      clearInterval(tickInt);
    };
  }, [userId]);

  useEffect(() => {
    tickShift();
  }, [session]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const all = await getNotifications();
      if (Array.isArray(all)) {
        const mapped = all.map((n: any) => ({
          ...n,
          read: n.is_read,
          userId: n.user_id,
          timestamp: n.created_at,
          type: n.category || n.type || 'General'
        }));
        setNotifications(mapped);
      }
      setUserName(sessionStorage.getItem('userName') || localStorage.getItem('userName') || 'HR Admin');

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
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                width: '40px',
                height: '40px',
                padding: '0',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(10, 132, 255, 0.35) 0%, rgba(10, 132, 255, 0.15) 100%)';
                e.currentTarget.style.borderColor = 'rgba(10, 132, 255, 0.6)';
                e.currentTarget.style.transform = 'scale(1.06) translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(10, 132, 255, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.3)';
              }}
              title="Go Back"
            >
              <FaArrowLeft size={15} />
            </button>
          )}
          <Logo width="260px" height="68px" layout="horizontal" showTagline={false} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            textAlign: 'right'
          }}
        >
          <div
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              letterSpacing: '0.2px'
            }}
          >
            Welcome back, <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{userName}</span>!
          </div>
          <div
            style={{
              fontSize: '12px',
              color: session?.on_break ? '#ff9f0a' : isOvertime ? '#30d158' : 'var(--accent-blue, #0a84ff)',
              fontWeight: 600,
              fontFamily: 'monospace',
              marginTop: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontFamily: 'inherit' }}>
              {isOvertime ? 'Extra:' : 'Remaining:'}
            </span>
            <span>{workDuration}</span>
            <button
              onClick={handleToggleBreak}
              disabled={breakLoading}
              title={session?.on_break ? "End Break & Resume Work" : "Take Break"}
              style={{
                background: session?.on_break ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 159, 10, 0.15)',
                color: session?.on_break ? '#30d158' : '#ff9f0a',
                border: `1px solid ${session?.on_break ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 159, 10, 0.3)'}`,
                borderRadius: '6px',
                padding: '2px 7px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: breakLoading ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '4px',
                transition: 'all 0.2s ease'
              }}
            >
              {session?.on_break ? (
                <>
                  <FaPlay size={9} /> End Break
                </>
              ) : (
                <>
                  <FaCoffee size={11} /> Break
                </>
              )}
            </button>
          </div>
        </div>


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
        </div>
      </div>
    </div>
  );
};

export default Header;
