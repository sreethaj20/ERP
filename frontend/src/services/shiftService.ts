import api from '../api/apiClient';

export interface ShiftDefinition {
    id: number;
    shift_name: string;
    shift_code?: string;
    start_time: string;
    end_time: string;
    grace_time: number;
    break_duration_minutes: number;
    is_night_shift: boolean;
    color?: string;
    week_off_days?: string[];
    department_applicability?: string[];
    assignments?: any[];
}

export interface ShiftSession {
    id: number;
    employee_id: string;
    employee_name?: string;
    shift_id: number;
    date: string;
    month?: number;
    year?: number;
    login_time: string;
    logout_time?: string;
    total_hours?: string;
    total_duration_minutes: number;
    total_work_seconds?: number;
    total_break_seconds?: number;
    total_shift_seconds?: number;
    status: string;
    role?: string;
    department?: string;
    on_break?: boolean;
    current_break_start?: string;
    is_early_login?: boolean;
    remark?: string;
    break_logs?: BreakLog[];
}

export interface BreakLog {
    id: number;
    session_id: number;
    employee_id: string;
    start_time: string;
    end_time?: string;
    duration_seconds: number;
    type: string;
}

const shiftService = {
    // HR Actions
    getShifts: async () => {
        const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
        let endpoint = '/hr/shifts';
        if (role === 'teamleader') endpoint = '/teamleader/shifts';
        else if (role === 'manager') endpoint = '/manager/shifts';
        
        const response = await api.get(endpoint);
        return response.data;
    },
    createShift: async (data: any) => {
        const response = await api.post('/hr/shifts', data);
        return response.data;
    },
    assignShift: async (shiftId: number, employeeId: string) => {
        const response = await api.post(`/hr/shifts/${shiftId}/assign?employee_id=${employeeId}`);
        return response.data;
    },
    deleteShift: async (id: number) => {
        const response = await api.delete(`/hr/shifts/${id}`);
        return response.data;
    },
    unassignEmployee: async (shiftId: number, employeeId: string) => {
        const response = await api.delete(`/hr/shifts/${shiftId}/assign/${employeeId}`);
        return response.data;
    },

    // Employee Actions
    startShift: async (shiftId: number) => {
        const response = await api.post(`/employee/shifts/start?shift_id=${shiftId}`);
        return response.data;
    },
    endShift: async () => {
        const response = await api.post('/employee/shifts/end');
        return response.data;
    },
    startBreak: async (userId: string, type: string = "break") => {
        const response = await api.post(`/employee/shifts/break/start/${userId}?type=${type}`);
        return response.data;
    },
    endBreak: async (userId: string) => {
        const response = await api.post(`/employee/shifts/break/end/${userId}`);
        return response.data;
    },
    getBreaks: async () => {
        const response = await api.get('/employee/shifts/breaks');
        return response.data;
    },
    getAttendanceHistory: async () => {
        const response = await api.get('/employee/attendance/history');
        return response.data;
    },

    // Manager/TL Actions
    getStaffTimesheets: async () => {
        const rawRole = (sessionStorage.getItem("userRole") || '').toLowerCase().replace(/[\s_]+/g, '');
        const isHR = rawRole === 'hr' || rawRole === 'humanresources' || rawRole === 'admin';
        const endpoint = isHR ? '/hr/staff-timesheet' : '/manager/staff-timesheet';
        const response = await api.get(endpoint);
        return response.data;
    },
    getTeamAttendance: async () => {
        const response = await api.get('/teamleader/attendance');
        return response.data;
    }
};

export default shiftService;
