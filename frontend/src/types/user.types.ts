// User and Role Types

export interface User {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: string; // Changed from Role object to string to match backend
    employee_id?: string;
    is_active: boolean;
    is_online?: boolean;
    last_seen?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Role {
    id: number;
    role_name: string;
    description?: string;
    portal_access: boolean;
    created_at: string;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export type UserRole = 'Manager' | 'HR' | 'Team Leader' | 'Recruiter' | 'IT' | 'Employee';

export interface UserStatus {
    user_id: number;
    username: string;
    full_name: string;
    role: string;
    is_online: boolean;
    last_seen?: string;
}
