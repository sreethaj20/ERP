import api from "../api/apiClient";

export const getHolidays = async () => {
    const response = await api.get("hr/holidays");
    return response.data;
};

export const addHoliday = async (name: string, date: string) => {
    const response = await api.post("hr/holidays", { name, date });
    return response.data;
};

export const deleteHoliday = async (id: number) => {
    const response = await api.delete(`hr/holidays/${id}`);
    return response.data;
};

export const getLeaveBalances = async () => {
    const response = await api.get("hr/leave-balance");
    return response.data;
};

export const updateLeaveBalance = async (id: number, payload: any) => {
    const response = await api.put(`hr/leave-balance/${id}`, payload);
    return response.data;
};

export const getAttendanceCorrections = async () => {
    const response = await api.get("hr/attendance/corrections");
    return response.data;
};

export const handleAttendanceCorrection = async (id: number, status: string, rejection_reason: string = "") => {
    const response = await api.patch(`hr/attendance/corrections/${id}`, { status, rejection_reason });
    return response.data;
};

export const getDashboard = async () => {
    const response = await api.get("hr/dashboard");
    return response.data;
};

export const getEmployees = async () => {
    const response = await api.get("hr/employees");
    return response.data;
};

export const getRoles = async () => {
  const response = await api.get("hr/roles");
  return response.data;
};

export const createRoleAssignment = async (payload: any) => {
  const response = await api.post("hr/roles", payload);
  return response.data;
};

export const updateRoleAssignment = async (id: number | string, payload: any) => {
  const response = await api.put(`hr/roles/${id}`, payload);
  return response.data;
};

