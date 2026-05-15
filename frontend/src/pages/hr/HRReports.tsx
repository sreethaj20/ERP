import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import GlassCard from '../../components/GlassCard';
import webSocketService from '../../services/websocketService';
import { getAttendance, getLeaves, getEmployees } from '../../utils/storage';
import { FaChartLine, FaUsers, FaCalendarAlt, FaFileAlt, FaClock } from 'react-icons/fa';
import { AttendanceCorrection } from '../../types/correction.types';

const HRReports = () => {
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, pendingLeaves: 0, avgWorkHours: 0 });
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
    loadCorrections();
    
    // WebSocket realtime
    const onNew = (data: any) => {
      console.log('[WS] New correction:', data);
      loadCorrections();
    };
    
    const onUpdate = (data: any) => {
      console.log('[WS] Correction updated:', data);
      loadCorrections();
    };

    webSocketService.on('attendance_correction_new', onNew);
    webSocketService.on('attendance_correction_updated', onUpdate);
    
    return () => {
      webSocketService.off('attendance_correction_new', onNew);
      webSocketService.off('attendance_correction_updated', onUpdate);
    };
  }, []);

  const loadStats = async () => {
    const [employees, attendance, leaves] = await Promise.all([
      getEmployees(), 
      getAttendance(), 
      getLeaves()
    ]);

    const today = new Date().toISOString().split('T')[0];
    const presentToday = attendance.filter(a => a.date === today && a.status === 'Present').length;
    const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
    const avgHours = attendance.reduce((sum, a) => sum + (a.work_hours || 0), 0) / Math.max(attendance.length, 1);

    setStats({
      totalEmployees: employees.length,
      presentToday,
      pendingLeaves,
      avgWorkHours: Number(avgHours.toFixed(1))
    });
  };

  const loadCorrections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/hr/attendance/corrections', {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCorrections(data);
      }
    } catch (error) {
      console.error('Failed to load corrections:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Header role="HR" title="HR Analytics Dashboard" />
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <GlassCard>
          <FaUsers size={32} style={{ color: 'var(--accent-blue)' }} />
          <h3>{stats.totalEmployees}</h3>
          <p>Total Employees</p>
        </GlassCard>
        <GlassCard>
          <FaCalendarAlt size={32} style={{ color: 'var(--accent-green)' }} />
          <h3>{stats.presentToday}</h3>
          <p>Present Today</p>
        </GlassCard>
        <GlassCard>
          <FaFileAlt size={32} style={{ color: 'var(--accent-orange)' }} />
          <h3>{stats.pendingLeaves}</h3>
          <p>Pending Leaves</p>
        </GlassCard>
        <GlassCard>
          <FaChartLine size={32} style={{ color: 'var(--accent-purple)' }} />
          <h3>{stats.avgWorkHours}h</h3>
          <p>Avg Daily Hours</p>
        </GlassCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <GlassCard title="Attendance Trends">
          <div style={{ height: '300px', background: 'var(--glass-bg)', borderRadius: '12px', padding: '20px' }}>
            {/* Chart placeholder */}
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '100px' }}>📊 Attendance Chart (80% this week)</p>
          </div>
        </GlassCard>
        <GlassCard title="Leave Balance Overview">
          <div style={{ height: '300px', background: 'var(--glass-bg)', borderRadius: '12px', padding: '20px' }}>
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '100px' }}>📈 Leave Utilization (Avg 12 days used)</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default HRReports;

