// Attendance Types

export interface AttendanceRecord {
    id: number;
    employee_id: number;
    date: string;
    check_in_time?: string;
    check_out_time?: string;
    status: 'Present' | 'Absent' | 'Half Day' | 'Late' | 'On Leave' | 'Holiday' | 'Weekend';
    work_hours?: number;
    overtime_hours?: number;
    notes?: string;
    created_at: string;
    updated_at?: string;
}

export interface AttendanceWithEmployee extends AttendanceRecord {
    employee: {
        id: number;
        employee_id: string;
        first_name: string;
        last_name: string;
        department?: string;
        designation?: string;
    };
}

export interface AttendanceFormData {
    employee_id: number;
    date: string;
    check_in_time?: string;
    check_out_time?: string;
    status: string;
    notes?: string;
}

export interface AttendanceStats {
    total_employees: number;
    present: number;
    absent: number;
    on_leave: number;
    late: number;
    attendance_percentage: number;
}

export interface MonthlyAttendance {
    employee_id: number;
    month: string;
    year: number;
    total_days: number;
    present_days: number;
    absent_days: number;
    leave_days: number;
    half_days: number;
    late_days: number;
    total_work_hours: number;
    overtime_hours: number;
}

export interface AttendanceCalendarDay {
    date: string;
    status: AttendanceRecord['status'];
    check_in_time?: string;
    check_out_time?: string;
    work_hours?: number;
}
