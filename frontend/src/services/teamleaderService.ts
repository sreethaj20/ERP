import api from "../api/apiClient";

export const getDashboard = async () => {
  const response = await api.get("teamleader/dashboard");
  return response.data;
};

export const getTeamMembers = async () => {
    const response = await api.get("teamleader/team");
    return response.data;
};

export const getPendingRecommendations = async () => {
    const response = await api.get("teamleader/leaves/pending");
    return response.data;
};

export const recommendLeave = async (leaveId: string, action: 'approve' | 'reject') => {
    const response = await api.post(`teamleader/leaves/${leaveId}/recommend?action=${action}`);
    return response.data;
};

export const getTeamAttendance = async () => {
    const response = await api.get("teamleader/attendance");
    return response.data;
};

export const getTeamAttendanceRecords = async () => {
    const response = await api.get("teamleader/attendance/records");
    return response.data;
};

export const handleEarlyLogin = async (request_id: number, status: string) => {
    // Backend expects a dict payload with "status"
    const response = await api.post(`teamleader/early-login/${request_id}/approve`, { status });
    return response.data;
};

// --- Task Management ---
export const getTeamTasks = async () => {
    const response = await api.get("teamleader/tasks");
    return response.data;
};

export const createTeamTask = async (taskData: any) => {
    const response = await api.post("teamleader/tasks", taskData);
    return response.data;
};

export const updateTeamTask = async (taskId: string, taskData: any) => {
    const response = await api.put(`teamleader/tasks/${taskId}`, taskData);
    return response.data;
};

export const deleteTeamTask = async (taskId: string) => {
    const response = await api.delete(`teamleader/tasks/${taskId}`);
    return response.data;
};

// --- Performance Reviews ---
export const getTeamPerformance = async () => {
    const response = await api.get("teamleader/performance");
    return response.data;
};

export const submitTeamPerformance = async (reviewData: any) => {
    const response = await api.post("teamleader/performance", reviewData);
    return response.data;
};

// --- Interviews ---
export const getTeamInterviews = async () => {
    const response = await api.get("teamleader/interviews");
    return response.data;
};

export const submitInterviewEvaluation = async (id: number, feedback: string, rating: number, result: string) => {
    const response = await api.patch(`teamleader/interviews/${id}/feedback`, null, {
        params: { feedback, rating, result }
    });
    return response.data;
};
