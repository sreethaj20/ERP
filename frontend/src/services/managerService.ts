import api from '../api/apiClient';

// Core Dashboard Endpoints
export const getWorkforce = async () => {
  try {
    const response = await api.get('manager/workforce');
    return response.data;
  } catch (error) {
    console.warn('Workforce API failed:', error);
    return [];
  }
};

export const getAnalytics = async () => {
  const response = await api.get('manager/analytics');
  return response.data;
};

export const getPerformanceReviews = async () => {
  const response = await api.get('manager/performance-reviews');
  return response.data;
};

export const getPendingLeaves = async () => {
  const response = await api.get('manager/leaves');
  // filter for pending ones if needed, or let backend do it. 
  // For now, we'll return all as the page expects a full list to filter
  return response.data;
};

export const getAllLeaves = async () => {
  const response = await api.get('manager/leaves');
  return response.data;
};

export const approveLeave = async (leaveId: string, action: 'approve' | 'reject') => {
  const response = await api.post('manager/finalize-leave', {
    leave_id: leaveId,
    action: action
  });
  return response.data;
};

export const getDashboard = async () => {
    const response = await api.get("manager/dashboard");
    return response.data;
};

// Company Profile
export const getCompanyProfile = async () => {
  const response = await api.get('manager/company-profile');
  return response.data;
};

export const updateCompanyProfile = async (payload: any) => {
  const response = await api.put('manager/company-profile', payload);
  return response.data;
};

// Onboarding Requests
export const getOnboardingRequests = async () => {
  const response = await api.get('manager/onboarding');
  return response.data;
};

export const createOnboardingRequest = async (payload: any) => {
  const response = await api.post('manager/onboarding', payload);
  return response.data;
};

export const approveOnboarding = async (request_id: number) => {
  const response = await api.post(`manager/onboarding/${request_id}/approve`);
  return response.data;
};

// Role Assignments
export const getRoleAssignments = async () => {
  const response = await api.get('manager/roles');
  return response.data;
};

export const toggleLoginAccess = async (assignment_id: number, status: boolean) => {
  const response = await api.put(`manager/roles/${assignment_id}`, { login_enabled: status });
  return response.data;
};

// Offboarding Requests
export const getOffboardingRequests = async () => {
  const response = await api.get('manager/offboarding');
  return response.data;
};

export const approveOffboarding = async (offboard_id: number) => {
  const response = await api.post(`manager/offboarding/complete/${offboard_id}`);
  return response.data;
};

// Broadcasts
export const getBroadcasts = async () => {
  const response = await api.get('manager/broadcasts');
  return response.data;
};

export const createBroadcast = async (data: any) => {
  const response = await api.post('manager/broadcasts', data);
  return response.data;
};
// Recruitment & Pipeline
export const getJobs = async () => {
    const response = await api.get('recruiter/jobs');
    return response.data;
};

export const getCandidates = async () => {
    const response = await api.get('recruiter/candidates');
    return response.data;
};

export const getScreeningLogs = async () => {
    const response = await api.get('recruiter/screening_logs');
    return response.data;
};

export const getInterviews = async () => {
    const response = await api.get('recruiter/interviews');
    return response.data;
};

export const updateIdmInterviewFeedback = async (id: number, payload: any) => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const endpoint = role === 'manager' ? `manager/interviews/${id}/feedback` : `recruiter/interviews/${id}/feedback`;
    const response = await api.patch(endpoint, payload);
    return response.data;
};

export const scheduleTeamInterview = async (payload: any) => {
    const response = await api.post('recruiter/interviews', payload);
    return response.data;
};

// IT Infrastructure
export const getITTickets = async () => {
    const response = await api.get('manager/it-tickets');
    return response.data;
};

export const getITAssets = async () => {
  const response = await api.get('manager/it-assets');
  return response.data;
};

export const pingEmployee = async (employeeId: string, message: string) => {
  const response = await api.post(`manager/ping-employee/${employeeId}`, { message });
  return response.data;
};

