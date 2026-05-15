// Leave Management Types

export interface LeaveRequest {
    id: number;
    employee_id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
    approved_by?: number;
    approved_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at?: string;
}

export interface LeaveRequestWithEmployee extends LeaveRequest {
    employee: {
        id: number;
        employee_id: string;
        first_name: string;
        last_name: string;
        department?: string;
        designation?: string;
    };
    approver?: {
        id: number;
        full_name: string;
    };
}

export interface LeaveFormData {
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
}

export interface LeaveBalance {
    id: number;
    employee_id: number;
    leave_type: string;
    total_leaves: number;
    used_leaves: number;
    remaining_leaves: number;
    year: number;
    created_at: string;
    updated_at?: string;
}

export interface LeaveBalanceWithEmployee extends LeaveBalance {
    employee: {
        id: number;
        employee_id: string;
        first_name: string;
        last_name: string;
    };
}

export interface LeaveType {
    id: number;
    name: string;
    description?: string;
    max_days_per_year: number;
    requires_approval: boolean;
    is_paid: boolean;
    created_at: string;
}

export interface LeaveStats {
    total_requests: number;
    pending: number;
    approved: number;
    rejected: number;
    employees_on_leave_today: number;
}

export interface LeaveApprovalAction {
    leave_request_id: number;
    action: 'approve' | 'reject';
    rejection_reason?: string;
}
