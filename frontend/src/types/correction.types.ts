export interface AttendanceCorrection {
  id: number;
  employee_id: string;
  original_status: string;
  corrected_status: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
  company_emp_id?: string;
}

export interface AttendanceCorrectionRequest {
  original_status: string;
  corrected_status: string;
  reason: string;
  date: string; // YYYY-MM-DD
}

