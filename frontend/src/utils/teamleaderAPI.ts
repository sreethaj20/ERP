import api from '../api/apiClient';
import { getRole } from './storage';

// Team Leader specific endpoints
export const getTeamTimesheets = async (tl_id: string): Promise<any[]> => {
  try {
    const role = getRole();
    const url = role === 'teamleader' 
      ? `teamleader/timesheets?tl_id=${tl_id}`
      : `employee/timesheets?role=teamleader&userId=${tl_id}`;
    
    const response = await api.get(url);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    console.warn(`[TEAMLEADER API] Timesheets failed (${error.response?.status}):`, error.message);
    return [];
  }
};

export const getTeamAttendance = async (tl_id: string): Promise<any[]> => {
  try {
    const url = `teamleader/attendance?tl_id=${tl_id}`;
    const response = await api.get(url);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    console.warn(`[TEAMLEADER API] Attendance failed (${error.response?.status})`);
    return [];
  }
};

export const approveEarlyLogin = async (requestId: number, status: string = 'approved') => {
  try {
    const response = await api.post(`teamleader/early-login/approve/${requestId}`, { status });
    return response.data;
  } catch (error: any) {
    console.error('[TEAMLEADER API] Approve failed:', error);
    throw error;
  }
};

