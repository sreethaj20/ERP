import api from "../api/apiClient";

export const getMyLeaves = async () => {
  const response = await api.get("employee/leaves");
  return response.data;
};

export const applyLeave = async (payload: any) => {
  const response = await api.post("employee/leaves", payload);
  return response.data;
};

export const getMyLeaveBalance = async () => {
    const response = await api.get("employee/leave-balance");
    return response.data;
};

export const cancelLeave = async (leaveId: string) => {
    const response = await api.post(`employee/leaves/${leaveId}/cancel`);
    return response.data;
};

export const getMyAttendanceHistory = async () => {
    const response = await api.get("employee/attendance/history");
    return response.data;
};

export const requestEarlyLogin = async (payload: any) => {
    const response = await api.post("employee/early-login/request", payload);
    return response.data;
};

export const getMyEarlyLoginRequests = async () => {
    const response = await api.get("employee/early-login/list");
    return response.data;
};

export const startShift = async (shiftId: number = 0) => {
    const response = await api.post(`employee/shifts/start?shift_id=${shiftId}`);
    return response.data;
};

export const endShift = async () => {
    const response = await api.post("employee/shifts/end");
    return response.data;
};

export const getDashboard = async () => {
    const response = await api.get("employee/dashboard");
    return response.data;
};

export const getMyTasks = async () => {
    const response = await api.get("employee/tasks");
    return response.data;
};

export const updateTaskStatus = async (taskId: string | number, status: string) => {
    const response = await api.patch(`employee/tasks/${taskId}/status?status=${encodeURIComponent(status)}`);
    return response.data;
};

export const getMyProfile = async () => {
    const response = await api.get("employee/profile");
    return response.data;
};

export const getMyPayslips = async () => {
  const response = await api.get("employee/payslips");
  return response.data;
};

export const getSupportTickets = async () => {
  const response = await api.get("employee/tickets");
  return response.data;
};

export const raiseTicket = async (payload: any) => {
    const response = await api.post("support-tickets", payload);
    return response.data;
};

export const getMyPreboarding = async () => {
    const response = await api.get("employee/preboarding");
    return response.data;
};

export const getMyOnboarding = async () => {
    const response = await api.get("employee/onboarding");
    return response.data;
};

export const getMyOffboarding = async () => {
    const response = await api.get("employee/offboarding");
    return response.data;
};

export const updateMyProfile = async (payload: any) => {
    const response = await api.put("employee/profile", payload);
    return response.data;
};

export const getMyAssets = async () => {
    const response = await api.get("employee/assets");
    return response.data;
};

export const getEmployeesForReference = async () => {
    const response = await api.get("employees/reference");
    return response.data;
};
