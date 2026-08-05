import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import GlassCard from '../../components/GlassCard';
import webSocketService from '../../services/websocketService';
import { getEmployeesAsync, refreshAttendance, refreshLeaves } from '../../utils/storage';
import { FaChartLine, FaUsers, FaCalendarAlt, FaFileAlt, FaClock } from 'react-icons/fa';
import { AttendanceCorrection } from '../../types/correction.types';
import api from '../../api/apiClient';

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
    try {
      const [employees, attendance, leaves] = await Promise.all([
        getEmployeesAsync().catch(() => []), 
        refreshAttendance().catch(() => []), 
        refreshLeaves().catch(() => [])
      ]);

      const empList = Array.isArray(employees) ? employees : [];
      const attList = Array.isArray(attendance) ? attendance : [];
      const leaveList = Array.isArray(leaves) ? leaves : [];

      const today = new Date().toISOString().split('T')[0];
      const presentToday = attList.filter((a: any) => a.date === today && (a.status === 'Present' || a.status === 'In-office' || a.status === 'Work From Home')).length;
      const pendingLeaves = leaveList.filter((l: any) => String(l.status).toLowerCase() === 'pending').length;

      const validHours = attList
        .map((a: any) => {
          const val = parseFloat(a.work_hours ?? a.total_hours ?? a.hours ?? 0);
          return isNaN(val) ? 0 : val;
        })
        .filter((h: number) => h > 0);

      const totalHours = validHours.reduce((sum: number, h: number) => sum + h, 0);
      const avgHours = validHours.length > 0 ? totalHours / validHours.length : 0;

      setStats({
        totalEmployees: empList.length,
        presentToday,
        pendingLeaves,
        avgWorkHours: isNaN(avgHours) ? 0 : Number(avgHours.toFixed(1))
      });
    } catch (error) {
      console.error("Error loading HR reports stats:", error);
    }
  };

  const loadCorrections = async () => {
    setLoading(true);
    try {
      const response = await api.get('hr/attendance/corrections');
      setCorrections(response.data);
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

