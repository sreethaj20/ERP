// API Configuration and Constants

// API Base URL (OFFLINE MODE)
export const API_BASE_URL = 'OFFLINE';
export const WS_BASE_URL = 'OFFLINE';

// API Endpoints
export const API_ENDPOINTS = {
    // Authentication
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        ME: '/auth/me',
    },

    // Users
    USERS: {
        LIST: '/users',
        CREATE: '/users',
        GET: (id: number) => `/users/${id}`,
        UPDATE: (id: number) => `/users/${id}`,
        DELETE: (id: number) => `/users/${id}`,
        STATUS: '/users/status',
    },

    // Employees
    EMPLOYEES: {
        LIST: '/employees',
        CREATE: '/employees',
        GET: (id: number) => `/employees/${id}`,
        UPDATE: (id: number) => `/employees/${id}`,
        DELETE: (id: number) => `/employees/${id}`,
        STATS: '/employees/stats',
    },

    // Attendance
    ATTENDANCE: {
        LIST: '/attendance',
        CREATE: '/attendance',
        GET: (id: number) => `/attendance/${id}`,
        UPDATE: (id: number) => `/attendance/${id}`,
        DELETE: (id: number) => `/attendance/${id}`,
        MARK: '/attendance/mark',
        STATS: '/attendance/stats',
        MONTHLY: (employeeId: number, year: number, month: number) =>
            `/attendance/monthly/${employeeId}/${year}/${month}`,
    },

    // Leave Management
    LEAVES: {
        LIST: '/leaves',
        CREATE: '/leaves',
        GET: (id: number) => `/leaves/${id}`,
        UPDATE: (id: number) => `/leaves/${id}`,
        DELETE: (id: number) => `/leaves/${id}`,
        APPROVE: (id: number) => `/leaves/${id}/approve`,
        REJECT: (id: number) => `/leaves/${id}/reject`,
        STATS: '/leaves/stats',
        BALANCE: (employeeId: number) => `/leaves/balance/${employeeId}`,
    },

    // Holidays
    HOLIDAYS: {
        LIST: '/holidays',
        CREATE: '/holidays',
        GET: (id: number) => `/holidays/${id}`,
        UPDATE: (id: number) => `/holidays/${id}`,
        DELETE: (id: number) => `/holidays/${id}`,
    },

    // Departments
    DEPARTMENTS: {
        LIST: '/departments',
        CREATE: '/departments',
        GET: (id: number) => `/departments/${id}`,
        UPDATE: (id: number) => `/departments/${id}`,
        DELETE: (id: number) => `/departments/${id}`,
    },

    // Designations
    DESIGNATIONS: {
        LIST: '/designations',
        CREATE: '/designations',
        GET: (id: number) => `/designations/${id}`,
        UPDATE: (id: number) => `/designations/${id}`,
        DELETE: (id: number) => `/designations/${id}`,
    },

    // Roles
    ROLES: {
        LIST: '/roles',
        CREATE: '/roles',
        GET: (id: number) => `/roles/${id}`,
        UPDATE: (id: number) => `/roles/${id}`,
        DELETE: (id: number) => `/roles/${id}`,
    },

    // WebSocket
    WS: {
        CONNECT: '/ws',
    },
};

// Application Constants
export const APP_NAME = 'Mercure HRMS';
export const APP_VERSION = '1.0.0';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Date Formats
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DISPLAY_DATE_FORMAT = 'DD MMM YYYY';
export const DISPLAY_DATETIME_FORMAT = 'DD MMM YYYY, hh:mm A';

// Status Options
export const EMPLOYEE_STATUS_OPTIONS = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'On Leave', label: 'On Leave' },
    { value: 'Terminated', label: 'Terminated' },
];

export const ATTENDANCE_STATUS_OPTIONS = [
    { value: 'Present', label: 'Present' },
    { value: 'Absent', label: 'Absent' },
    { value: 'Half Day', label: 'Half Day' },
    { value: 'Late', label: 'Late' },
    { value: 'On Leave', label: 'On Leave' },
    { value: 'Holiday', label: 'Holiday' },
    { value: 'Weekend', label: 'Weekend' },
];

export const LEAVE_STATUS_OPTIONS = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Cancelled', label: 'Cancelled' },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Intern', label: 'Intern' },
];

// Leave Types
export const LEAVE_TYPES = [
    { value: 'Casual Leave', label: 'Casual Leave' },
    { value: 'Sick Leave', label: 'Sick Leave' },
    { value: 'Earned Leave', label: 'Earned Leave' },
    { value: 'Maternity Leave', label: 'Maternity Leave' },
    { value: 'Paternity Leave', label: 'Paternity Leave' },
    { value: 'Unpaid Leave', label: 'Unpaid Leave' },
];

// Role Names
export const ROLES = {
    MANAGER: 'Manager',
    HR: 'HR',
    TEAM_LEADER: 'Team Leader',
    RECRUITER: 'Recruiter',
    IT: 'IT',
    EMPLOYEE: 'Employee',
};

// Local Storage Keys
export const STORAGE_KEYS = {
    TOKEN: 'auth_token',
    USER: 'user_data',
    THEME: 'app_theme',
};

// WebSocket Event Types
export const WS_EVENTS = {
    USER_STATUS_CHANGED: 'user_status_changed',
    ATTENDANCE_MARKED: 'attendance_marked',
    LEAVE_REQUEST_CREATED: 'leave_request_created',
    LEAVE_REQUEST_UPDATED: 'leave_request_updated',
    NOTIFICATION: 'notification',
};

// Toast/Notification Duration
export const TOAST_DURATION = 3000; // 3 seconds

// File Upload
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
