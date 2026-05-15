import api from "../api/apiClient";

export const getDashboard = async () => {
    const response = await api.get("it/dashboard");
    return response.data;
};

export const getAssets = async () => {
    const response = await api.get("it/assets");
    return response.data;
};

export const getAssetHistory = async (assetId: string | number) => {
    const response = await api.get(`it/assets/${assetId}/history`);
    return response.data;
};

export const createAsset = async (payload: any) => {
    const response = await api.post("it/assets", payload);
    return response.data;
};

export const deleteAsset = async (id: string | number) => {
    const response = await api.delete(`it/assets/${id}`);
    return response.data;
};

export const updateITAsset = async (id: string | number, payload: any) => {
    const response = await api.put(`it/assets/${id}`, payload);
    return response.data;
};

export const getTickets = async () => {
    const response = await api.get("it/tickets");
    return response.data;
};

export const resolveTicket = async (id: number, resolution: string) => {
    const response = await api.patch(`it/tickets/${id}`, {
        resolution_details: resolution,
        status: "Resolved",
    });
    return response.data;
};

export const updateTicketStatus = async (id: string | number, status: string) => {
    const response = await api.patch(`it/tickets/${id}`, { status });
    return response.data;
};

export const getAllocations = async () => {
    const response = await api.get("it/allocations");
    return response.data;
};

export const createAllocation = async (payload: any) => {
    const response = await api.post("it/allocations", payload);
    return response.data;
};

export const getAccessProvisions = async () => {
    const response = await api.get("it/access");
    return response.data;
};

export const createAccessProvision = async (payload: any) => {
    const response = await api.post("it/access", payload);
    return response.data;
};

export const getOnboardingTasks = async () => {
    const response = await api.get("it/onboarding-requests");
    return response.data;
};

export const createMaintenanceLog = async (payload: any) => {
    const response = await api.post("it/maintenance", payload);
    return response.data;
};

export const createTransfer = async (payload: any) => {
    const response = await api.post("it/transfers", payload);
    return response.data;
};

export const processReturn = async (assetId: string, condition: string, damage_cost: number = 0) => {
    const response = await api.post(`it/returns`, { asset_id: assetId, condition, damage_cost });
    return response.data;
};

export const revokeAccess = async (employeeId: string) => {
    const response = await api.post(`it/revocation?employee_id=${encodeURIComponent(employeeId)}`);
    return response.data;
};
