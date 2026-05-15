// Common Types and Interfaces

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface SelectOption {
    value: string | number;
    label: string;
}

export interface DateRange {
    start_date: string;
    end_date: string;
}

export interface FilterOptions {
    search?: string;
    status?: string;
    department?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
}

export interface SortOptions {
    field: string;
    direction: 'asc' | 'desc';
}

export interface TableColumn {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (value: any, row: any) => React.ReactNode;
}

export interface LoadingState {
    isLoading: boolean;
    error: string | null;
}

export interface FormErrors {
    [key: string]: string;
}

export interface WebSocketMessage {
    type: string;
    data: any;
    timestamp?: string;
}

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    read: boolean;
}

export interface Holiday {
    id: number;
    name: string;
    date: string;
    description?: string;
    is_mandatory: boolean;
    created_at: string;
}

export interface Department {
    id: number;
    name: string;
    description?: string;
    manager_id?: number;
    created_at: string;
}

export interface Designation {
    id: number;
    title: string;
    description?: string;
    department_id?: number;
    created_at: string;
}
