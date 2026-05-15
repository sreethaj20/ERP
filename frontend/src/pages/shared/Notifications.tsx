import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import GlassCard from '../../components/GlassCard';
import { FaBell, FaCheckCircle, FaExclamationTriangle, FaUserPlus, FaTicketAlt } from 'react-icons/fa';
import { getNotifications, markNotificationRead } from '../../utils/storage';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications(nots => nots.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'success': return <FaCheckCircle color="#30d158" />;
      case 'warning': return <FaExclamationTriangle color="#ff9f0a" />;
      case 'onboarding': return <FaUserPlus color="#0a84ff" />;
      case 'ticket': return <FaTicketAlt color="#bf5af2" />;
      default: return <FaBell color="#8e8e93" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return then.toLocaleString();
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Header role="Notifications" title="Updates" />
        <GlassCard title="Loading..." >
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
            Loading notifications...
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header role="Notifications" title="Activity Feed" />
      
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700' }}>Notifications</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Stay updated with system events and team activities</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button 
          className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({notifications.length})
        </button>
        <button 
          className={`tab-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({notifications.filter(n => !n.is_read).length})
        </button>
      </div>

      {/* Notifications List */}
      <GlassCard title="Recent Activity" subtitle={`${filteredNotifications.length} events`} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-tertiary)' }}>
            <FaBell size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>No notifications</h3>
            <p style={{ margin: 0 }}>Everything is running smoothly</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div 
              key={notif.id} 
              style={{
                padding: '20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                cursor: 'pointer',
                background: !notif.is_read ? 'rgba(10,132,255,0.08)' : 'transparent',
                borderRadius: '12px',
                marginBottom: '8px'
              }}
              onClick={() => !notif.is_read && toggleRead(notif.id)}
            >
              <div style={{ fontSize: '20px', flexShrink: 0 }}>
                {getIcon(notif.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontWeight: '600', fontSize: '15px', lineHeight: '1.3' }}>
                    {notif.title}
                  </div>
                  {!notif.is_read && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#30d158', flexShrink: 0 }} />
                  )}
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                  {notif.message}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                  {getTimeAgo(notif.created_at)} • {notif.type}
                </div>
              </div>
            </div>
          ))
        )}
      </GlassCard>

      <style dangerouslySetInnerHTML={{ __html: `
        .tab-btn {
          padding: 12px 20px;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          color: var(--text-secondary);
        }
        .tab-btn.active, .tab-btn:hover {
          background: var(--accent-blue);
          color: white;
        }
      `}} />
    </div>
  );
}

