// Employee Types

export interface Employee {
    id: number;
    employee_id: string;
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    date_of_joining: string;
    department?: string;
    designation?: string;
    team_leader_id?: number;
    manager_id?: number;
    employment_type?: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
    status: 'Active' | 'Inactive' | 'On Leave' | 'Terminated';
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    bank_account_number?: string;
    bank_name?: string;
    ifsc_code?: string;
    pan_number?: string;
    aadhaar_number?: string;
    uan_number?: string;
    esi_number?: string;
    pf_number?: string;
    exit_date?: string;
    resignation_date?: string;
    notice_period?: number;
    pincode?: string;
    alternate_mobile?: string;
    created_at: string;
    updated_at?: string;
}

export interface EmployeeProfile extends Employee {
    user?: {
        username: string;
        role: string;
        is_active: boolean;
    };
    team_leader?: {
        id: number;
        name: string;
    };
    manager?: {
        id: number;
        name: string;
    };
}

export interface EmployeeFormData {
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    date_of_joining: string;
    department?: string;
    designation?: string;
    team_leader_id?: number;
    manager_id?: number;
    employment_type?: string;
    status: string;
}

export interface EmployeeStats {
    total: number;
    active: number;
    inactive: number;
    on_leave: number;
    new_this_month: number;
}
