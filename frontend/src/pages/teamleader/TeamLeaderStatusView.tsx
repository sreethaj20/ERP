import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/GlassCard';
import { getWorkforce, getAnalytics, getPerformanceReviews, getPendingLeaves } from '../../services/managerService';
import { HiUsers, HiChartPie, HiDocumentChartBar, HiClipboardDocumentCheck } from 'react-icons/hi2';

interface WorkforceData { total_team: number; active_today: number; team_status: string; }
interface AnalyticsData { headcount_trend: number[]; leave_utilization: number; performance_avg: number; }
interface PerformanceData { }
interface LeavesData { }

const TeamLeaderStatusView: React.FC = () => {
  const [workforce, setWorkforce] = useState<WorkforceData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceData[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeavesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadManagerData = async () => {
      try {
        setLoading(true);
        const [wfData, anData, perfData, leavesData] = await Promise.all([
          getWorkforce(),
          getAnalytics(),
          getPerformanceReviews(),
          getPendingLeaves()
        ]);
        setWorkforce(wfData);
        setAnalytics(anData);
        setPerformanceReviews(perfData);
        setPendingLeaves(leavesData);
      } catch (err: any) {
        console.error('Manager dashboard load failed:', err);
        setError('Failed to load team status data');
      } finally {
        setLoading(false);
      }
    };

    loadManagerData();
  }, []);

  if (loading) return <div className="flex items-center justify-center p-8">Loading team status...</div>;
  if (error) return <div className="text-red-400 p-4">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
      <GlassCard title="Team Workforce" icon={<HiUsers />}>
        <div className="text-3xl font-bold text-blue-400 mb-2">{workforce?.total_team || 0}</div>
        <div className="text-sm text-gray-400 mb-1">Total Team Members</div>
        <div className="text-lg font-semibold text-green-400">{workforce?.active_today || 0} Active Today</div>
      </GlassCard>

      <GlassCard title="Performance" icon={<HiChartPie />}>
        <div className="text-3xl font-bold text-purple-400 mb-2">{analytics?.performance_avg !== undefined && analytics?.performance_avg !== null ? Number(analytics.performance_avg).toFixed(1) : 'N/A'}</div>
        <div className="text-sm text-gray-400">Average Score</div>
        <div className="text-sm">Leave Utilization: {Number(analytics?.leave_utilization || 0).toFixed(1)}%</div>
      </GlassCard>

      <GlassCard title="Performance Reviews" icon={<HiDocumentChartBar />}>
        <div className="text-2xl font-bold">{performanceReviews.length}</div>
        <div className="text-sm text-gray-400">Pending Reviews</div>
      </GlassCard>

      <GlassCard title="Pending Leaves" icon={<HiClipboardDocumentCheck />}>
        <div className="text-2xl font-bold">{pendingLeaves.length}</div>
        <div className="text-sm text-gray-400">Team Leave Requests</div>
      </GlassCard>
    </div>
  );
};

export default TeamLeaderStatusView;

