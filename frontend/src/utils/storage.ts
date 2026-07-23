import api from '../api/apiClient';
import ws from "../services/websocketService";
export { api };

// ========== CONSTANTS ==========
export const DEFAULT_PASSWORD = "Mercure@123";

// ========== CACHE (SYNCHRONOUS ACCESS) ==========
let _employees: any[] = [];
let _attendance: any[] = [];
let _leaves: any[] = [];
let _shifts: any[] = [];
let _jobs: any[] = [];
let _candidates: any[] = [];
let _interviews: any[] = [];
let _offers: any[] = [];
let _assets: any[] = [];
let _it_allocations: any[] = [];
let _it_maintenance: any[] = [];
let _it_transfers: any[] = [];
let _it_returns: any[] = [];
let _tickets: any[] = [];
let _preboarding: any[] = [];
let _offboarding: any[] = [];
let _roles: any[] = [];
let _holidays: any[] = [];
let _announcements: any[] = [];
let _companyProfile: any = null;
let _notifications: any[] = [];
let _activities: any[] = [];
let _screeningLogs: any[] = [];
let _earlyLogins: any[] = [];
let _breakLogs: any[] = [];
let _performanceReviews: any[] = [];
let _tasks: any[] = [];
let _managerOnboarding: any[] = [];
let _hrOnboarding: any[] = [];
let _presence: any[] = [];
let _attendanceCorrections: any[] = [];
let _payrollHistory: any[] = [];
let _currentUser: any = null;

// ========== AUTH & SESSION ==========

export const logoutUser = async () => {
    // Record check-out BEFORE clearing the session (token still needed for the API call)
    await recordLogoutPresence().catch(e => console.warn('[ATTENDANCE] Checkout on logout failed:', e));
    await api.post('auth/logout').catch(e => console.warn('[AUTH] Backend logout failed:', e));
    sessionStorage.clear();
    _companyProfile = null;
    _currentUser = null;
    window.location.href = "/login";
};

export const initStorage = async () => {
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('token');
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isLoggedIn') === 'true';

    if (!isLoggedIn || !token) {
        console.log('[STORAGE] Skipping initStorage (pre-login)');
        return true;
    }

    try {
        console.log('[STORAGE] Hydrating user session from PostgreSQL...');
        const meRes = await api.get('auth/me');
        _currentUser = meRes.data;

        // Sync sessionStorage with fresher DB data for downstream components
        let role = (_currentUser.role || 'employee').toLowerCase().replace(/[_\s]+/g, '');
        if (['requiter', 'recruiting'].includes(role)) role = 'recruiter';
        if (['itdepartment', 'itadmin', 'itsupport'].includes(role)) role = 'it';
        if (['teamleader', 'tl'].includes(role)) role = 'teamleader';

        sessionStorage.setItem("userRole", role);
        sessionStorage.setItem("userId", String(_currentUser.id));
        sessionStorage.setItem("employeeId", _currentUser.employee_id || '');
        sessionStorage.setItem("userName", _currentUser.name || _currentUser.full_name);

        // Fetch Detailed Profile for Dashboard stats (Dept/Manager)
        await refreshProfile().catch(e => console.warn('[STORAGE] Profile refresh failed:', e));

        // 📡 Listen for Real-Time Changes from PostgreSQL via WS
        ws.connect(String(_currentUser.id));

        ws.on("data_updated", async (payload: any) => {
            console.log(`[REALTIME] PostgreSQL data changed: ${payload?.type}`);
            switch (payload?.type) {
                case 'employees': await refreshEmployees(); break;
                case 'attendance': await refreshAttendance(); break;
                case 'leaves': await refreshLeaves(); break;
                case 'holidays': await refreshHolidays(); break;
                case 'onboarding': await refreshOnboarding(); break;
                case 'preboarding': await refreshPreboarding(); break;
                case 'offboarding': await refreshOffboarding(); break;
                case 'tickets': await refreshTickets(); break;
                case 'activities': await refreshActivities(); break;
                case 'announcements': await refreshAnnouncements(); break;
                case 'performance_updated': await refreshPerformanceReviews(); break;
                case 'notifications': await refreshNotifications(); break;
            }
            // Notify all listening components
            window.dispatchEvent(new Event('storage'));
        });

        console.log(`Initializing data connection for role: ${role}...`);

        // Common tasks for everyone
        const tasks: Promise<any>[] = [
            refreshEmployees(),
            refreshShifts(),
            refreshActivities(),
            refreshTickets(),
            refreshPresence(),
            refreshNotifications(),
            refreshBreakLogs(),
            refreshAnnouncements(),
            refreshHolidays()
        ];

        // Conditional role-based data injection
        if (role === "manager") {
            tasks.push(
                refreshAttendance(), refreshLeaves(), refreshJobs(), refreshCandidates(),
                refreshInterviews(), refreshOffers(), refreshAssets(), refreshPreboarding(),
                refreshOffboarding(), refreshRoles(), refreshCompanyProfile(),
                refreshScreeningLogs(), refreshEarlyLogins(), refreshPerformanceReviews(),
                refreshITAllocations(), refreshITMaintenance(), refreshITTransfers(),
                refreshITReturns(), refreshOnboarding(), refreshAttendanceCorrections(),
                refreshShifts()
            );
        } else if (role === "hr") {
            tasks.push(
                refreshAttendance(), refreshLeaves(), refreshPreboarding(),
                refreshOffboarding(), refreshRoles(),
                refreshAttendanceCorrections(), refreshCompanyProfile(),
                refreshOnboarding(), refreshPayrollHistory(),
                refreshJobs(), refreshCandidates(), refreshInterviews(), refreshOffers(),
                refreshShifts()
            );
        } else if (role === "recruiter") {
            tasks.push(
                refreshAttendance(),
                refreshJobs(), refreshCandidates(), refreshInterviews(),
                refreshOffers(), refreshScreeningLogs(), refreshCompanyProfile()
            );
        } else if (role === "it") {
            tasks.push(
                refreshAttendance(),
                refreshITTransfers(), refreshITReturns(), refreshCompanyProfile(),
                refreshITHardwareTasks()
            );
        } else if (role === "teamleader") {
            tasks.push(
                refreshAttendance(), refreshShifts(), refreshLeaves(),
                refreshEarlyLogins(), refreshInterviews(), refreshCompanyProfile()
            );
        } else {
            tasks.push(
                refreshAttendance(),
                refreshLeaves(), refreshCompanyProfile(), refreshPreboarding(), refreshOnboarding(), refreshOffboarding(), refreshHolidays()
            );
        }

        // Safer parallel execution: one module failing won't crash the entire dashboard
        const wrappedTasks = tasks.map(t => t.catch(err => {
            console.error(`[STORAGE] Module initialization failed:`, err);
            return null; // Resolve with null instead of rejecting
        }));

        await Promise.all(wrappedTasks);
        console.log(`Storage initialized for ${role}.`);
        return true;
    } catch (e) {
        console.error("Critical error during storage initialization:", e);
        return false;
    }
};

export const refreshProfile = async () => {
    try {
        const res = await api.get('employee/profile');
        if (res.data) {
            const emp = res.data;
            sessionStorage.setItem("department", emp.department || "Not Assigned");
            sessionStorage.setItem("joinDate", emp.joining_date || "");

            // Resolve Reporting Name
            let reportingName = emp.reporting_to || emp.reporting_manager;
            if (!reportingName && emp.reporting_to_id) {
                // Try to find in already loaded employees if available
                if (_employees.length > 0) {
                    const mgr = _employees.find((e: any) => e.employee_id === emp.reporting_to_id);
                    if (mgr) reportingName = mgr.name || `${mgr.first_name} ${mgr.last_name || ''}`.trim();
                }
                if (!reportingName) reportingName = emp.reporting_to_id;
            }
            sessionStorage.setItem("reportingTo", reportingName || "");
            return emp;
        }
    } catch (e) {
        console.warn('[STORAGE] Profile lookup failed:', e);
    }
    return null;
};

// --- REFRESHERS (ASYNCHRONOUS) ---
export const normalizeEmployee = (e: any) => ({
    ...e,
    name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim(),
    role: e.role || e.user?.role || 'Employee',
    dob: e.dob || e.date_of_birth,
    joining_date: e.joining_date || e.date_of_joining,
    normalized_manager_id: e.reporting_to_id || String(e.manager_id || '')
});

// --- REFRESHERS (ASYNCHRONOUS) ---
export const refreshEmployees = async (forceRole?: string) => {
    const role = (forceRole || sessionStorage.getItem("userRole") || '').toLowerCase();
    let url = 'hr/employees';
    if (role === 'manager') url = 'manager/workforce';
    else if (role !== 'hr') url = 'employees/reference';

    const res = await fetchData(url);

    // Feature 59: Handle object wrapper for manager workforce response
    const data = (role === 'manager' && res && !Array.isArray(res)) ? (res.employees || []) : (Array.isArray(res) ? res : []);

    _employees = data.map(normalizeEmployee);
    window.dispatchEvent(new Event('storage'));
    return _employees;
};

export const getEmployeesForReference = async () => {
    // 🛡️ Performance: Use cache if available to prevent redundant 1.1s API calls
    if (_employees.length > 0) {
        console.log('[STORAGE] Returning cached employees for reference');
        return _employees;
    }
    const res = await fetchData('employees/reference');
    const list = Array.isArray(res) ? res : [];
    _employees = list.map(normalizeEmployee);
    return _employees;
};
export const refreshAttendance = async () => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    let url = 'hr/attendance'; // HR default: all employees

    if (role === 'manager') {
        url = 'manager/attendance'; // manager sees his team
    } else if (role === 'teamleader') {
        url = 'teamleader/attendance'; // TL sees his team
    } else if (role === 'employee' || role === 'recruiter' || role === 'it') {
        url = 'employee/attendance/history'; // employee sees own only
    }

    const data = await fetchData(url);
    _attendance = Array.isArray(data) ? data : [];
    window.dispatchEvent(new Event('storage')); // Trigger sync across components
    return _attendance;
};
export const refreshLeaves = async () => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const url = 'leaves'; // ✅ Unified endpoint
    _leaves = await fetchData(url);
    window.dispatchEvent(new Event('storage'));
    return _leaves;
};
export const getRole = () => (_currentUser?.role || 'employee').toLowerCase();

export const refreshShifts = async () => {
    const role = getRole();
    let url = 'hr/shifts';
    if (role === 'manager') url = 'manager/shifts';
    else if (role === 'teamleader') url = 'teamleader/shifts';
    else if (role === 'employee') url = 'hr/shifts'; // Employees can view but not edit

    _shifts = await fetchData(url);
    window.dispatchEvent(new Event('storage'));
    return _shifts;
};
export const refreshJobs = async () => {
    const jobs = await fetchData('recruiter/jobs');
    const normalize = (job: any) => {
        const experienceRange = job.experience_range || "0-0";
        const [minExp, maxExp] = String(experienceRange).split('-').map((v: string) => v.trim());
        return {
            ...job,
            job_id: String(job.job_id || job.id || ''),
            job_code: job.job_code || `JOB-${job.id || job.job_id || '000'}`,
            id: job.id,
            employment_type: job.job_type || job.employment_type || 'Full-time',
            experience_min: job.experience_min || minExp || '0',
            experience_max: job.experience_max || maxExp || '0',
            salary_min: job.salary_min != null ? job.salary_min : 0,
            salary_max: job.salary_max != null ? job.salary_max : 0,
            location: job.location || 'Remote',
            positions_open: job.positions_open || job.positions || 1,
            priority: job.priority || 'medium',
            currency: job.currency || 'INR',
            status: String(job.status || 'Open').toLowerCase(),
            skills_required: job.skills_required || job.skills || [],
        };
    };
    _jobs = Array.isArray(jobs) ? jobs.map(normalize) : [normalize(jobs)];
    return _jobs;
};
export const refreshCandidates = async () => {
    console.log('[STORAGE] Refreshing candidates...');
    try {
        const candidates = await fetchData('recruiter/candidates');
        console.log('[STORAGE] Raw candidates data:', candidates);
        _candidates = Array.isArray(candidates) ? candidates.map((c: any) => ({
            ...c,
            current_stage: c.current_stage || c.stage || 'Telephonic',
            application_status: c.application_status || 'active',
            candidate_id: c.candidate_id || c.id,
        })) : [];
        console.log('[STORAGE] Processed candidates:', _candidates);
        return _candidates;
    } catch (error) {
        console.error('[STORAGE] Error refreshing candidates:', error);
        _candidates = [];
        return _candidates;
    }
};
export const refreshInterviews = async () => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const url = role === 'manager' ? 'manager/interviews' : (role === 'hr' ? 'hr/interviews' : 'recruiter/interviews');
    _interviews = await fetchData(url);
    return _interviews;
};

export const refreshOffers = async () => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const url = role === 'manager' ? 'manager/offers' : (role === 'hr' ? 'hr/offers' : 'recruiter/offers');
    const data = await fetchData(url);
    _offers = (Array.isArray(data) ? data : []).map((o: any) => ({
        ...o,
        offer_id: o.offer_id || o.id,
        offered_ctc: o.offered_ctc || o.ctc || 0,
        offer_status: o.offer_status || o.status || 'sent'
    }));
    return _offers;
};
export const refreshAssets = async () => { _assets = await fetchData('it/assets'); return _assets; };
export const refreshTickets = async () => {
    const data = await fetchData('support-tickets');
    _tickets = (Array.isArray(data) ? data : []).map((t: any) => ({
        ...t,
        employee_name: t.employee_name || t.author_name || t.author || t.userName || t.user_name || 'Employee',
        emp_id: t.employee_id || t.emp_id || 'N/A',
        department: t.category || t.department || 'IT', // Sync with backend 'category' field
        replies: (t.comments || []).map((c: any) => ({
            text: c.comment || c.text,
            sender: c.author_name || c.author,
            date: c.created_at || c.date
        }))
    }));
    window.dispatchEvent(new Event('storage'));
    return _tickets;
};
// --- REFRESHERS (ASYNCHRONOUS) ---
export const refreshOnboarding = async (forceRole?: string) => {
    const role = (forceRole || sessionStorage.getItem("userRole") || '').toLowerCase();
    const url = role === 'manager' ? 'manager/onboarding' : (role === 'hr' ? 'hr/onboarding' : 'employee/onboarding');
    const res = await fetchData(url);
    const data = (Array.isArray(res) ? res : (res ? [res] : [])).map((o: any) => ({
        ...o,
        request_id: o.request_id || o.id,
        email: o.login_email || o.email,
        name: o.name || `${o.first_name || ''} ${o.last_name || ''}`.trim(),
        joining_date: o.join_date || o.joining_date
    }));
    if (role === 'manager') _managerOnboarding = data;
    else if (role === 'hr') _hrOnboarding = data;
    return data;
};


export const refreshPreboarding = async (forceRole?: string) => {
    const role = (forceRole || sessionStorage.getItem("userRole") || '').toLowerCase();
    const url = role === 'manager' ? 'manager/preboarding' : (role === 'hr' ? 'hr/preboarding-v2' : 'employee/preboarding');
    const data = await fetchData(url);
    _preboarding = (Array.isArray(data) ? data : (data ? [data] : [])).map((p: any) => ({ ...p, preboard_id: p.preboard_id || p.id }));
    return _preboarding;
};

export const refreshOffboarding = async (forceRole?: string) => {
    const role = (forceRole || sessionStorage.getItem("userRole") || '').toLowerCase();
    const url = role === 'manager' ? 'manager/offboarding' : (role === 'hr' ? 'hr/offboarding' : 'employee/offboarding');
    const data = await fetchData(url);
    _offboarding = (Array.isArray(data) ? data : (data ? [data] : [])).map((o: any) => ({ ...o, offboard_id: o.offboard_id || o.id }));
    return _offboarding;
};

export const refreshRoles = async () => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const url = role === 'manager' ? 'manager/roles' : 'hr/roles';
    const data = await fetchData(url);
    _roles = (Array.isArray(data) ? data : []).map((r: any) => ({ ...r, assignment_id: r.id }));
    return _roles;
};
export const refreshAttendanceCorrections = async () => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const endpoint = 'hr/attendance/corrections';
    _attendanceCorrections = await fetchData(endpoint);
    window.dispatchEvent(new Event('storage'));
    return _attendanceCorrections;
};
export const refreshHolidays = async () => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const url = role === 'hr' ? 'hr/holidays' : 'holidays';
    _holidays = await fetchData(url);
    return _holidays;
};
export const refreshAnnouncements = async () => {
    try {
        // Use shared endpoint that handles role-based filtering on backend
        _announcements = await fetchData('announcements');
        console.log("[STORAGE] Refreshed announcements from shared endpoint");
    } catch (e) {
        console.warn("Failed to refresh announcements:", e);
        _announcements = [{ "id": 0, "title": "Offline Mode", "message": "Announcements temporarily unavailable", "target_role": "All", "created_at": new Date().toISOString() }];
    }
    return _announcements;
};
export const refreshCompanyProfile = async () => {
    try {
        const data = await fetchData('company-profile');
        if (data) {
            _companyProfile = data;
        } else {
            // Safe failure fallback
            _companyProfile = {
                company_name: "Antigravity HRMS",
                company_tagline: "Connecting your business",
            };
        }
    } catch (e) {
        console.warn("Failed to refresh company profile globally:", e);
        _companyProfile = {
            company_name: "Antigravity HRMS (Offline)",
            company_tagline: "System temporarily unavailable"
        };
    }
    return _companyProfile;
};
export const refreshActivities = async () => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const endpoint = role === 'manager' ? 'manager/audit-logs' : 'activities';
    const res = await fetchData(endpoint);
    
    _activities = (Array.isArray(res) ? res : []).map((log: any) => {
        if (log.table_name) {
            return {
                id: log.id,
                message: `${log.action} on ${log.table_name} (Record ID: ${log.record_id})`,
                type: log.table_name,
                timestamp: log.created_at,
                user: log.changed_by || 'System'
            };
        } else {
            return {
                id: log.id,
                message: log.message || log.description || `${log.action} in ${log.module || 'System'}`,
                type: log.type || log.module || 'general',
                timestamp: log.created_at || log.timestamp,
                user: log.username || 'System'
            };
        }
    });
    return _activities;
};
export const refreshScreeningLogs = async () => {
    try {
        const data = await fetchData('recruiter/screening_logs');
        _screeningLogs = Array.isArray(data) ? data : [];
        return _screeningLogs;
    } catch (e) {
        console.warn('[STORAGE] refreshScreeningLogs failed:', e);
        _screeningLogs = [];
        return [];
    }
};
export const refreshEarlyLogins = async () => {
    try {
        const role = getRole();
        const url = role === 'teamleader' ? 'teamleader/early-login/list' : 'employee/early-login/list';
        _earlyLogins = await fetchData(url);
        return _earlyLogins;
    } catch (error) {
        console.warn('[STORAGE] Early logins fetch failed:', error);
        _earlyLogins = [];
        return [];
    }
};
export const refreshBreakLogs = async () => { _breakLogs = await fetchData('employee/shifts/breaks'); return _breakLogs; };
export const refreshPerformanceReviews = async () => { _performanceReviews = await fetchData('manager/performance-reviews'); return _performanceReviews; };
export const refreshTasks = async () => { _tasks = await fetchData('teamleader/tasks'); return _tasks; };
export const refreshITAllocations = async () => { _it_allocations = await fetchData('it/allocations'); return _it_allocations; };
export const refreshITMaintenance = async () => { _it_maintenance = await fetchData('it/maintenance'); return _it_maintenance; };
export const refreshITTransfers = async () => { _it_transfers = await fetchData('it/transfers'); return _it_transfers; };
export const refreshITReturns = async () => { _it_returns = await fetchData('it/returns'); return _it_returns; };

export const refreshPresence = async () => {
    const role = getRole();
    if (role === 'hr' || role === 'manager') {
        _presence = await fetchData('hr/attendance/presence');
    } else {
        _presence = [];
        console.log(`[STORAGE] Skipping hr/attendance/presence for role: ${role}`);
    }
    return _presence;
};
export const refreshNotifications = async () => { _notifications = await fetchData('notifications'); return _notifications; };

export const recordLoginPresence = async (id: string, name: string, role: string, dept: string) => {
    try {
        // Resolve business employee_id (EMP-XXX) from cache or fallback to raw id
        const myEmployee = getMyEmployee();
        const businessEmployeeId = myEmployee?.employee_id || id;
        console.log('[ATTENDANCE] Using employee_id:', businessEmployeeId, 'for user', id, 'EMP exists:', !!myEmployee);

        const payload = {
            employee_id: businessEmployeeId,
            employee_name: name,
            role,
            department: dept
        };
        console.log('[ATTENDANCE] Checkin payload:', payload);

        const isHROrManager = ['hr', 'manager'].includes(role?.toLowerCase());
        const endpoint = isHROrManager ? 'hr/attendance/checkin' : 'employee/attendance/checkin';
        const response = await api.post(endpoint, payload);
        console.log('[ATTENDANCE] Checkin success:', response.status);
        await refreshAttendance();

        // 🚀 LINK: Automatically start shift session on login (all staff except admin)
        const autoRoles = ['employee', 'teamleader', 'tl', 'hr', 'recruiter', 'it'];
        if (autoRoles.includes(role?.toLowerCase())) {
            await startShiftSession(0).catch(e => console.warn('[SHIFT] Auto-start failed:', e));
        }
    } catch (e: any) {
        console.error("Presence auto-log failed:", e);
        if (e.response) {
            console.error("Error Response Details:", e.response.data);
        }
    }
};

export const recordLogoutPresence = async () => {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) return; // No session to record

        // Resolve employee_id from cache
        const myEmployee = getMyEmployee();
        const empId = myEmployee?.employee_id || sessionStorage.getItem('employeeId');
        if (!empId) {
            console.warn('[ATTENDANCE] No employee_id for checkout, skipping');
            return;
        }

        const userRole = (sessionStorage.getItem("userRole") || '').toLowerCase();
        const isHROrManager = ['hr', 'manager'].includes(userRole);
        const endpoint = isHROrManager ? 'hr/attendance/checkout' : 'employee/attendance/checkout';
        const response = await api.post(endpoint, { employee_id: empId });
        console.log('[ATTENDANCE] Checkout success on logout:', response.status);

        // 🚀 LINK: Automatically end shift session on logout (Skip for managers who don't track shifts)
        const role = sessionStorage.getItem("userRole");
        if (role !== "manager") {
            await endShiftSession().catch(e => console.warn('[SHIFT] Auto-end failed:', e));
        }
    } catch (e: any) {
        // Non-blocking — logout must not be held up by this
        console.warn('[ATTENDANCE] Checkout on logout failed (non-blocking):', e?.message);
    }
};


// --- GENERIC HELPERS ---
export const fetchData = async (endpoint: string) => {
    // 🔐 AUTH GUARD: Skip API calls pre-login
    const token = sessionStorage.getItem('token');
    const role = sessionStorage.getItem('userRole');
    if (!token || !role) {
        console.log(`[STORAGE] Skipping ${endpoint} (pre-login: no token/role)`);
        return [];
    }

    // 🐛 DEBUG: Log exact endpoint before request
    console.log(`[STORAGE] fetchData called → GET /api/v1/${endpoint}`);

    try {
        const response = await api.get(endpoint);
        console.log(`[API] GET /api/v1/${endpoint} ✓`, response.data?.length || 1);
        return response.data || [];
    } catch (error: any) {
        const status = error.response?.status;
        const fullUrl = error.config?.url || `/api/v1/${endpoint}`;
        console.error(`[API ERROR] ${status} → ${fullUrl}`, error.response?.data || error.message);

        if (status === 401) {
            console.warn(`[API] 401 Unauthorized: ${fullUrl} (token expired?)`);
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('isLoggedIn');
            if (window.location.pathname !== '/login') window.location.href = '/login';
            return [];
        }
        if (status === 403) {
            const detail = error.response?.data?.detail || '';
            if (detail.toLowerCase().includes('credentials') || detail.toLowerCase().includes('token')) {
                console.warn(`[API] 403 Auth failure: ${fullUrl}. Redirecting to login.`);
                sessionStorage.removeItem('token');
                if (window.location.pathname !== '/login') window.location.href = '/login';
            } else {
                console.warn(`[API] 403 Forbidden: ${fullUrl} (role: ${role}) - ${detail}`);
            }
            return [];
        }
        if (status === 404) {
            console.warn(`[API] 404 → ${fullUrl} - Expected for unimplemented endpoints`);
            // Phantom /employeeAction handled - ignore gracefully
            return [];
        }
        if (status === 422) {
            console.error(`[API 422] Validation failed:`, error.response?.data);
            return [];
        }
        return [];
    }
};



export const sendData = async (endpoint: string, data: any, method: 'post' | 'put' | 'delete' | 'patch' = 'post') => {
    try {
        console.debug(`[API] ${method.toUpperCase()} ${endpoint} payload:`, data);
        const response = await api({ method, url: endpoint, data });
        console.debug(`[API] ${method.toUpperCase()} ${endpoint} success:`, response.data);
        return response.data;
    } catch (error: any) {
        console.error(`[API] Error on ${method} ${endpoint}:`, error);
        // Enhanced error logging for debugging
        if (error.response) {
            console.error(`[API] Response Status: ${error.response.status}`);
            console.error(`[API] Response Data:`, error.response.data);
            console.error(`[API] Response Headers:`, error.response.headers);
        } else if (error.request) {
            console.error(`[API] No response received. Request:`, error.request);
        } else {
            console.error(`[API] Request setup error:`, error.message);
        }

        throw error;
    }
};

// ========== DATA ACCESSORS (READ) ==========
export const getEmployees = () => _employees;
export const getEmployeesAsync = async (forceRole?: string) => {
    const data = await refreshEmployees(forceRole);
    return Array.isArray(data) ? data : [];
};

export const getAllEmployeesForReference = () => _employees;
export const getAttendance = () => _attendance;
export const getAllAttendance = getAttendance;
export const getLeaves = () => _leaves;

export const getMyEmployee = () => {
    return _currentUser;
};

export const getVisibleLeavesAsync = async (role: string, userId: string) => {
    await refreshLeaves();
    const r = role?.toLowerCase() || '';
    if (r === 'hr') return _leaves;

    const myEmp = getMyEmployee();
    const myBasisId = myEmp?.user_id || myEmp?.id || String(userId);

    if (r === 'manager') {
        const staffIdentities = _employees
            .filter(e => String(e.manager_id) === String(myBasisId) || String(e.reporting_to_id) === String(myBasisId))
            .map(e => ({ id: String(e.id), code: String(e.employee_id) }));

        const ids = staffIdentities.map(i => i.id);
        const codes = staffIdentities.map(i => i.code);

        return _leaves.filter(l =>
            ids.includes(String(l.employee_id)) ||
            codes.includes(String(l.employee_id)) ||
            ids.includes(String(l.id))
        );
    }

    if (r === 'teamleader') {
        const teamIdentities = _employees
            .filter(e => String(e.team_leader_id) === String(myBasisId) || String(e.reporting_to_id) === String(myBasisId))
            .map(e => ({ id: String(e.id), code: String(e.employee_id) }));

        const ids = teamIdentities.map(i => i.id);
        const codes = teamIdentities.map(i => i.code);

        return _leaves.filter(l =>
            ids.includes(String(l.employee_id)) ||
            codes.includes(String(l.employee_id)) ||
            ids.includes(String(l.id))
        );
    }

    const myEmpCode = myEmp?.employee_id || '';
    return _leaves.filter(l =>
        String(l.employee_id) === String(myBasisId) ||
        String(l.employee_id) === String(myEmpCode) ||
        String(l.id) === String(myBasisId)
    );
};
export const getJobs = () => _jobs;
export const getCandidates = () => _candidates;
export const getInterviews = () => _interviews;
export const getInterviewsData = getInterviews;
export const getOffers = () => _offers;
export const getAssets = () => _assets;
export const getITAssets = getAssets;
export const getTickets = () => _tickets;
export const getPreboardingRequests = () => _preboarding;
export const getPreboardingList = getPreboardingRequests;
export const getEmployeePreboardingList = async () => {
    await refreshPreboarding();
    return _preboarding;
};
export const getOffboardingRequests = () => _offboarding;

export const getRoles = () => _roles;
export const getHolidays = () => _holidays;
export const getAnnouncements = async (force: boolean = false) => {
    if (_announcements.length === 0 || force) await refreshAnnouncements();
    return _announcements;
};

export const getCompanyProfile = async (force: boolean = false) => {
    if (!_companyProfile || force) await refreshCompanyProfile();
    return _companyProfile;
};

export const updateCompanyProfile = async (data: any) => {
    const res = await api.put('manager/company-profile', data);
    _companyProfile = res.data;
    // Also update local dispatch for widget sync
    window.dispatchEvent(new Event("companyProfileUpdated"));
    return res.data;
};
export const getNotifications = () => _notifications;
export const getActivities = () => _activities;
export const getPerformanceReviews = () => _performanceReviews;
export const getTasks = () => _tasks;
export const getRoleAssignments = () => _roles;
export const getUserPresence = () => _presence;
export const getVisibleJobs = (role: string, userId: string) => _jobs;
export const getVisibleCandidates = (role?: string, userId?: string) => {
    const effectiveUserId = userId || sessionStorage.getItem('userId') || '';
    const userRole = (role || sessionStorage.getItem('userRole') || '').toLowerCase();
    const empId = sessionStorage.getItem('employeeId') || '';
    return _candidates
        .filter((c: any) => {
            if (userRole === 'hr' || userRole === 'manager') return true;
            return !c.created_by || String(c.created_by) === String(empId) || String(c.created_by) === String(effectiveUserId);
        })
        .map((c: any) => ({
            ...c,
            current_stage: c.current_stage || c.stage || 'Telephonic',
            application_status: c.application_status || 'active',
            candidate_id: c.candidate_id || c.id,
        }));
};
export const getVisibleInterviews = (role: string, userId: string) => _interviews;
export const getVisibleOffers = (role: string, userId: string) => {
    const userRole = (role || sessionStorage.getItem('userRole') || '').toLowerCase();
    if (userRole === 'hr' || userRole === 'manager') return _offers;
    const empId = sessionStorage.getItem('employeeId') || '';
    const effectiveUserId = userId || sessionStorage.getItem('userId') || '';
    const myCandidates = _candidates
        .filter((c: any) => !c.created_by || String(c.created_by) === String(empId) || String(c.created_by) === String(effectiveUserId))
        .map((c: any) => String(c.candidate_id || c.id));
    return _offers.filter((o: any) => myCandidates.includes(String(o.candidate_id)));
};
export const getTeamTimesheets = async (tl_id: string, date?: string): Promise<any[]> => {
    const params = new URLSearchParams({ tl_id });
    if (date) params.append('date', date);

    try {
        const response = await api.get(`teamleader/timesheets?${params.toString()}`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
        console.warn('[STORAGE] Team timesheets failed:', error.message);
        return [];
    }
};

export const getVisibleAttendance = (role: string, userId: string) => {
    if (role === 'teamleader') {
        const myEmp = getMyEmployee();
        const myEmpId = myEmp?.employee_id || '';
        const myUserId = String(userId);

        if (!myEmpId && !myUserId) return [];

        const teamIds = _employees
            .filter(e => {
                const tlId = String(e.team_leader_id || '');
                const repId = String(e.reporting_to_id || '');
                const mgrId = String(e.manager_id || '');
                const repMgrId = String(e.reporting_manager_id || '');

                return (myEmpId && tlId === myEmpId) || (myUserId && tlId === myUserId) ||
                    (myEmpId && repId === myEmpId) || (myUserId && repId === myUserId) ||
                    (myEmpId && mgrId === myEmpId) || (myUserId && mgrId === myUserId) ||
                    (myEmpId && repMgrId === myEmpId) || (myUserId && repMgrId === myUserId);
            })
            .map(e => String(e.employee_id || e.id));

        return _attendance.filter(a => teamIds.includes(String(a.employee_id)));
    }
    return _attendance;
};


export const getVisibleLeaves = (role: string, userId: string): any[] => {
    const r = role?.toLowerCase() || '';
    if (r === 'manager' || r === 'hr') return _leaves;
    const myEmp = getMyEmployee();
    const myEmpCode = myEmp?.employee_id || '';
    const myUserId = String(userId);
    if (r === 'teamleader') {
        const myId = myEmpCode || myUserId;
        if (!myId) return [];
        const teamIds = _employees
            .filter(e =>
                (myId && String(e.reporting_to_id) === String(myId)) ||
                (myId && String(e.team_leader_id) === String(myId)) ||
                (myId && String(e.manager_id) === String(myId)) ||
                (myId && String(e.reporting_manager_id) === String(myId))
            )
            .map(e => String(e.employee_id || e.id));
        return _leaves.filter(l => teamIds.includes(String(l.employee_id)));
    }
    return _leaves.filter(l => 
        (myUserId && String(l.employee_id) === myUserId) || 
        (myEmpCode && String(l.employee_id) === myEmpCode) ||
        (myUserId && String(l.id) === myUserId)
    );
};
export const getVisibleShifts = (role: string, userId: string) => _shifts;



// Generates a unique ID string (used by HiringManagement and others)
export const generateId = (prefix?: string) => {
    const id = `${prefix || 'ID'}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return id;
};

export const getAttendanceCorrections = () => _attendanceCorrections;
export const updateAttendanceCorrection = async (id: any, updates: any) => {
    const res = await api.patch(`hr/attendance/corrections/${id}`, updates);
    await refreshAttendanceCorrections();
    return res.data;
};
export const approveAttendanceCorrection = async (id: any, status: string) => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    let res;
    if (role === 'hr') {
        res = await api.patch(`hr/attendance/corrections/${id}`, { status });
    } else if (role === 'manager') {
        res = await api.post(`manager/attendance/corrections/${id}/approve?status=${status}`);
    } else if (role === 'teamleader') {
        res = await api.post(`teamleader/attendance/corrections/${id}/approve?status=${status}`);
    } else {
        throw new Error("Unauthorized to approve corrections");
    }
    await refreshAttendanceCorrections();
    return res.data;
};



// Fetch employee shift sessions (for manager view)
export const getAllShiftSessions = async (): Promise<any[]> => {
    try {
        const res = await api.get('employee/shifts/sessions/all');
        return Array.isArray(res.data) ? res.data : [];
    } catch {
        return [];
    }
};



export const getData = (key: string) => {
    const cacheMap: { [key: string]: any[] } = {
        'employees': _employees,
        'attendance': _attendance,
        'leaves': _leaves,
        'shifts': _shifts,
        'jobs': _jobs,
        'hrms_jobs': _jobs,
        'candidates': _candidates,
        'interviews': _interviews,
        'offers': _offers,
        'assets': _assets,
        'hrms_assets': _assets,
        'tickets': _tickets,
        'hrms_tickets': _tickets,
        'preboarding': _preboarding,
        'offboarding': _offboarding,
        'roles': _roles,
        'tasks': _tasks,
        'holidays': _holidays,
        'announcements': _announcements,
        'activities': _activities,
        'notifications': _notifications
    };
    return cacheMap[key] || [];
};

// 🆕 FIX_PYDANTIC: Resolve entity name → ID using cache (prevents int_parsing errors)
export const resolveEntityId = async (searchValue: string, entityType: 'candidate' | 'job'): Promise<number | null> => {
    if (!searchValue || typeof searchValue !== 'string') return null;

    const normalizedSearch = searchValue.trim().toLowerCase();

    if (entityType === 'candidate') {
        const candidate = getCandidates().find(c =>
            String(c.id).toLowerCase() === normalizedSearch ||
            String(c.candidate_id).toLowerCase() === normalizedSearch ||
            (c.name || '').toLowerCase().includes(normalizedSearch) ||
            (c.first_name + ' ' + (c.last_name || '')).toLowerCase().includes(normalizedSearch)
        );
        return candidate ? (candidate.id || candidate.candidate_id || null) as number : null;
    }

    if (entityType === 'job') {
        const job = getJobs().find(j =>
            String(j.id).toLowerCase() === normalizedSearch ||
            String(j.job_id).toLowerCase() === normalizedSearch ||
            (j.title || '').toLowerCase().includes(normalizedSearch)
        );
        return job ? (job.id || job.job_id || null) as number : null;
    }

    return null;
};

// ========== DATA MODIFIERS ==========
export const addEmployee = async (emp: any) => {
    const res = await sendData('hr/employees', emp);
    await refreshEmployees();
    return res;
};

export const deleteEmployee = async (id: any) => {
    const res = await api.delete(`employee/${id}`);
    await refreshEmployees();
    return res.data;
};

export const updateEmployee = async (id: string | number, updates: any) => {
    // 🔧 FIXED EMPLOYEE UPDATE - Always use employee_id (EMP-XXXX string format)
    const targetId = String(id);
    if (!targetId.startsWith('EMP-') && !targetId.match(/^\d+$/)) {
        console.warn('[STORAGE] Invalid employee ID format:', targetId, '- expected EMP-XXXX or numeric');
    }

    console.log('[EMPLOYEE UPDATE] Using ID:', targetId, 'Payload keys:', Object.keys(updates));

    // Backend expects 'email', frontend often uses 'personal_email' or 'official_email'
    const payload = { ...updates };
    if (!payload.email && (updates.personal_email || updates.official_email)) {
        payload.email = updates.official_email || updates.personal_email;
        console.log('[EMPLOYEE UPDATE] Mapped email:', payload.email);
    }

    const res = await sendData(`employee/${targetId}`, payload, 'put');
    await refreshEmployees();
    console.log('[EMPLOYEE UPDATE] Success:', res);
    return res;
};

export const updateEmployeeLeaveBalance = async (id: any, newBalances: any) => {
    const emp = _employees.find(e => String(e.id) === String(id) || String(e.employee_id) === String(id));
    if (!emp) return;

    const currentBalances = emp.leave_balances || { casual: 12, sick: 12, earned: 15, maternity: 0 };
    const merged = { ...currentBalances, ...newBalances };

    return updateEmployee(emp.employee_id || emp.id, { leave_balances: merged });
};

export const getITAllocations = () => _it_allocations;
export const addITAllocation = async (data: any) => {
    const res = await sendData('it/allocations', data);
    await refreshITAllocations();
    await refreshAssets();
    return res;
};

export const getITMaintenance = () => _it_maintenance;
export const addITMaintenance = async (data: any) => {
    const res = await sendData('it/maintenance', data);
    await refreshITMaintenance();
    return res;
};

export const getITTransfers = () => _it_transfers;
export const addITTransfer = async (data: any) => {
    const res = await sendData('it/transfers', data);
    await refreshITTransfers();
    await refreshAssets();
    return res;
};

export const getITReturns = () => _it_returns;
export const addITReturn = async (data: any) => {
    const res = await sendData('it/returns', data);
    await refreshITReturns();
    await refreshAssets();
    return res;
};

export const addPerformanceReview = async (review: any) => {
    const res = await sendData('manager/performance-reviews', review);
    await refreshPerformanceReviews();
    return res;
};

export const addTask = async (data: any) => { await sendData('teamleader/tasks', data); await refreshTasks(); };
export const updateTask = async (id: any, data: any) => { await sendData(`teamleader/tasks/${id}`, data, 'put'); await refreshTasks(); };
export const deleteTask = async (id: any) => { await api.delete(`teamleader/tasks/${id}`); await refreshTasks(); };

export const recommendLeave = async (leaveId: any, action: string) => { await sendData(`teamleader/leaves/${leaveId}/recommend?action=${action}`, {}); await refreshLeaves(); };


export const addShift = async (data: any) => {
    const res = await sendData('hr/shifts', data);
    await refreshShifts();
    return res;
};

export const updateShift = async (id: any, data: any) => {
    const res = await sendData(`hr/shifts/${id}`, data, 'put');
    await refreshShifts();
    return res;
};

export const deleteShift = async (id: any) => {
    const res = await api.delete(`hr/shifts/${id}`);
    await refreshShifts();
    return res.data;
};

export const getShifts = () => _shifts;

export const assignShift = async (id: number, employeeId: string) => {
    const res = await api.post(`hr/shifts/${id}/assign?employee_id=${employeeId}`);
    return res.data;
};

export const removeAssignment = async (id: number, empId: string) => {
    const res = await api.delete(`hr/shifts/${id}/assign/${empId}`);
    return res.data;
};

export const getEmployeeShift = (empId: string) => {
    if (!empId) return null;

    // 0. Resolve the true business identity (EMP-XXX) to handle ID mismatches
    const emp = _employees.find((e: any) =>
        String(e.employee_id) === String(empId) ||
        String(e.id) === String(empId) ||
        String(e.user_id) === String(empId)
    );
    const businessId = emp?.employee_id || empId;
    const numericId = emp?.id || empId;

    // 1. Direct Assignment (Try business ID first, then numeric as fallback)
    let shift = _shifts.find((s: any) =>
        (s.assignments || []).some((a: any) =>
            String(a.employee_id) === String(businessId) ||
            String(a.employee_id) === String(numericId)
        )
    );

    // 2. Inheritance (Governance): If no direct shift, check Team Leader then Manager
    if (!shift && emp) {
        // A. Team Leader Check
        const rawTlId = emp.team_leader_id;
        if (rawTlId) {
            const tl = _employees.find((e: any) =>
                String(e.id) === String(rawTlId) ||
                String(e.employee_id) === String(rawTlId)
            );
            const tlBusinessId = tl?.employee_id || rawTlId;
            const tlNumericId = tl?.id || rawTlId;

            shift = _shifts.find((s: any) =>
                (s.assignments || []).some((a: any) =>
                    String(a.employee_id) === String(tlBusinessId) ||
                    String(a.employee_id) === String(tlNumericId)
                )
            );
        }

        // B. Manager Fallback
        if (!shift) {
            const rawManagerId = emp.reporting_to_id || emp.manager_id;
            if (rawManagerId) {
                // Resolve manager's business ID to handle ID mismatches
                const manager = _employees.find((e: any) =>
                    String(e.id) === String(rawManagerId) ||
                    String(e.employee_id) === String(rawManagerId)
                );
                const managerBusinessId = manager?.employee_id || rawManagerId;
                const managerNumericId = manager?.id || rawManagerId;

                shift = _shifts.find((s: any) =>
                    (s.assignments || []).some((a: any) =>
                        String(a.employee_id) === String(managerBusinessId) ||
                        String(a.employee_id) === String(managerNumericId)
                    )
                );
            }
        }
    }

    if (shift) {
        // Calculate work hours required: (End - Start) - Break
        let workHours = 0;
        try {
            if (shift.start_time && shift.end_time) {
                const today = new Date().toISOString().split('T')[0];
                const start = new Date(`${today}T${shift.start_time}`);
                let end = new Date(`${today}T${shift.end_time}`);
                if (end <= start) end.setDate(end.getDate() + 1);

                const diffMs = end.getTime() - start.getTime();
                const totalMin = diffMs / (1000 * 60);
                const workMin = totalMin - (shift.break_duration_minutes || 60);
                workHours = Math.max(0, parseFloat((workMin / 60).toFixed(1)));
            }
        } catch (e) {
            console.warn('[STORAGE] Failed to calculate work hours:', e);
        }

        return {
            id: shift.id,
            name: shift.shift_name,
            shift_name: shift.shift_name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            shift_start: shift.start_time,
            shift_end: shift.end_time,
            color: shift.color || '#0a84ff',
            week_off_days: shift.week_off_days || ['Sunday'],
            work_hours_required: workHours || 8.0
        };
    }
    return null;
};



export const startShiftSession = async (shift_id: number = 0) => {
    try {
        // Fetch IP and basic location info for audit (Using a public API or fallback)
        let ip = 'Unknown';
        try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            ip = ipData.ip;
        } catch (e) { console.warn('[SHIFT] IP fetch failed:', e); }

        const payload = {
            shift_id,
            employee_id: sessionStorage.getItem('employeeId') || '',
            ip_address: ip,
            location_metadata: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                timestamp: new Date().toISOString()
            }
        };

        const res = await api.post('employee/shifts/start', payload);
        return { success: true, data: res.data };
    } catch (error: any) {
        const detail = error.response?.data?.detail || '';
        if (detail.toLowerCase().includes('early login')) {
            return { success: false, early_login_required: true, message: detail };
        }
        throw error;
    }
};

export const endShiftSession = async (userId?: string) => {
    const res = await api.post('employee/shifts/end');
    return res.data;
};

export const getActiveShiftSession = async () => {
    const session = await fetchData('employee/shifts/active');
    // If it's an object (not null/empty array), it's active
    if (session && !Array.isArray(session) && session.id) {
        return { active: true, session };
    }
    return { active: false };
};

export const getVisibleShiftSessions = async (role: string, userId?: string) => {
    const r = role.toLowerCase().replace(/[\s_]+/g, '');
    let endpoint = 'employee/attendance/history';
    if (r === 'manager') endpoint = 'manager/staff-timesheet';
    if (r === 'teamleader') endpoint = 'teamleader/attendance';
    if (r === 'hr') endpoint = 'hr/attendance/all'; // If HR needs all, we might need a new endpoint or reuse one

    return fetchData(endpoint);
};

export const takeBreak = async (userId: string) => sendData(`employee/shifts/break/start/${userId}`, {});
export const endBreak = async (userId: string) => sendData(`employee/shifts/break/end/${userId}`, {});
export const getBreakLogs = () => _breakLogs;
export const getActiveSessionHours = (startTime: string) => {
    if (!startTime) return "0.0";
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diff = (now - start) / (1000 * 60 * 60);
    return diff.toFixed(1);
};



export const getPendingLeavesCount = (role?: string, userId?: string) => {
    const r = (role || '').toLowerCase();

    if (r === 'teamleader') {
        const myEmp = getMyEmployee();
        const myId = myEmp?.employee_id || String(userId);
        const teamIds = _employees
            .filter(e =>
                String(e.reporting_to_id) === String(myId) ||
                String(e.team_leader_id) === String(myId) ||
                String(e.manager_id) === String(myId) ||
                String(e.reporting_manager_id) === String(myId)
            )
            .map(e => String(e.employee_id || e.id));
        return _leaves.filter(l => (l.status === 'pending_tl' || l.status === 'Pending') && teamIds.includes(String(l.employee_id))).length;
    }

    if (r === 'manager') {
        const teamIds = _employees
            .filter(e => String(e.manager_id) === String(userId))
            .map(e => String(e.employee_id || e.id));
        return _leaves.filter(l => l.status === 'pending_manager' && teamIds.includes(String(l.employee_id))).length;
    }

    if (r === 'hr') {
        return _leaves.filter(l => l.status?.startsWith('pending')).length;
    }

    return _leaves.filter(l => l.status?.startsWith('pending')).length;
};

export const getEmployeeWeekoffs = (empId: string) => {
    const emp = _employees.find(e => String(e.id) === empId || String(e.employee_id) === empId);
    if (!emp) return ['Sunday'];

    // Find employee's shift assignment
    const assignment = _roles.find(r => String(r.employee_id) === empId);
    const shiftId = assignment?.shift_id;
    if (!shiftId) return ['Sunday'];

    const shift = _shifts.find(s => String(s.id) === String(shiftId));
    return shift?.week_off_days || ['Sunday'];
};

export const calculateLeaveDaysWithWeekoffs = (empId: string, from: string, to: string): number => {
    const weekoffs = getEmployeeWeekoffs(empId);
    let count = 0;
    let cur = new Date(from);
    const last = new Date(to);
    while (cur <= last) {
        const dayName = cur.toLocaleDateString('en-US', { weekday: 'long' });
        if (!weekoffs.includes(dayName)) count++;
        cur.setDate(cur.setDate(cur.getDate() + 1));
    }
    return count;
};

export const addLeaveRequest = async (leave: any) => {
    // Client-side validation to prevent 422 Pydantic errors
    if (!leave.reason || leave.reason.trim().length < 3) {
        throw new Error('Leave reason must be at least 3 characters long');
    }
    if (!leave.leave_type || !leave.start_date || !leave.end_date) {
        throw new Error('Leave type, start_date, and end_date are required');
    }

    const userId = sessionStorage.getItem('userId') || '';
    const myEmp = getMyEmployee();
    const employeeId = myEmp?.employee_id || userId; // ✅ Use EMP-XXX format

    const totalDays = calculateLeaveDaysWithWeekoffs(employeeId, leave.start_date, leave.end_date);

    const payload = {
        employee_id: employeeId, // ✅ Fixed: Use business employee_id
        leave_type: leave.leave_type,
        from_date: leave.start_date, // Match backend field name
        to_date: leave.end_date,
        total_days: leave.total_days || totalDays,
        reason: leave.reason.trim()
    };

    console.log('[STORAGE] Leave payload → employee_id:', employeeId, payload);
    const res = await sendData('employee/leaves', payload);
    await refreshLeaves();
    return res;
};


export const updateLeaveStatus = async (leave_id: any, action: 'approve' | 'reject', approvedBy: string) => {
    const res = await sendData(`hr/leaves/${leave_id}/status`, { action, approvedBy }, 'patch');
    await refreshLeaves();
    return res;
};

export const cancelLeave = async (leave_id: any) => {
    const res = await api.delete(`employee/leaves/${leave_id}`);
    await refreshLeaves();
    return res.data;
};

export const addJob = async (job: any) => {
    // Map frontend form → backend Job model fields ONLY (fixes 422 validation error)
    const backendPayload = {
        title: job.title,
        department: job.department,
        location: job.location || 'Remote',
        job_type: job.employment_type || job.job_type || 'Full-time',
        experience_range: job.experience_range ||
            (job.experience_min != null && job.experience_max != null && job.experience_min !== '' && job.experience_max !== ''
                ? `${job.experience_min}-${job.experience_max}`
                : '0-5'),
        status: job.status || 'Open',
        description: job.job_description || job.description || '',
        // IGNORED (no backend fields): work_mode, salary_min/max, currency, skills_required, education_required, 
        // positions_open, reporting_manager_id, priority
    };

    console.log('[storage.ts] Mapped job payload:', backendPayload);

    const res = await sendData('recruiter/jobs', backendPayload);
    await refreshJobs();
    return res;
};


export const addCandidate = async (candidate: any) => {
    console.log('[STORAGE] Adding candidate:', candidate);
    try {
        const res = await sendData('recruiter/candidates', candidate);
        console.log('[STORAGE] Candidate added successfully:', res);
        await refreshCandidates();
        return res;
    } catch (error) {
        console.error('[STORAGE] Error adding candidate:', error);
        throw error;
    }
};

export const updateCandidateStage = async (id: any, stage: string) => {
    console.log('[STORAGE] Updating candidate stage:', { id, stage });
    try {
        const res = await api.patch(`recruiter/candidates/${id}/stage?stage=${stage}`);
        console.log('[STORAGE] Candidate stage updated successfully:', res.data);
        await refreshCandidates();
        return res.data;
    } catch (error) {
        console.error('[STORAGE] Error updating candidate stage:', error);
        throw error;
    }
};

export const addScreeningLog = async (data: any) => {
    const res = await sendData('recruiter/screening_logs', data);
    await refreshScreeningLogs();
    return res;
};

export const getScreeningLogs = () => _screeningLogs;
export const getEarlyLoginRequests = async (tl_id?: string): Promise<any[]> => {
    // 🎯 EMP5825 → TL001 fix + shared fallback
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const effectiveTlId = tl_id ? tl_id : sessionStorage.getItem('userId');

    let url: string;
    if (role === 'teamleader' && effectiveTlId) {
        url = `teamleader/early-login/list?tl_id=${effectiveTlId}`;
    } else {
        url = effectiveTlId ? `shared/early-login?tl_id=${effectiveTlId}` : 'shared/early-login';
    }

    try {
        const response = await api.get(url);
        _earlyLogins = Array.isArray(response.data) ? response.data : [];
        return _earlyLogins;
    } catch (error: any) {
        console.warn(`[STORAGE] Early login (${url}) failed ${error.response?.status}:`, error.message);
        _earlyLogins = [];
        return [];
    }
};

export const requestEarlyLogin = async (payload: any) => {
    // Corrected: Removed leading slash
    const res = await sendData('employee/early-login/request', payload);
    await refreshEarlyLogins();
    return res;
};

export const approveEarlyLogin = async (id: number, status: string = 'approved') => {
    // Backend expects status in the JSON body
    const res = await sendData(`teamleader/early-login/${id}/approve`, { status });
    await refreshEarlyLogins();
    return res;
};

// 🆕 LEAVE APPROVAL FUNCTIONS
export const getPendingLeavesForTL = async (tlId: string) => {
    const role = getRole();
    if (role !== 'teamleader') return [];
    try {
        const response = await api.get(`teamleader/leaves/pending?tl_id=${tlId}`);
        return response.data || [];
    } catch (error) {
        console.warn('[STORAGE] TL pending leaves failed:', error);
        return [];
    }
};

export const approveLeave = async (leaveId: number, action: 'approve' | 'reject', approverRole: 'teamleader' | 'manager') => {
    if (approverRole === 'teamleader') {
        const res = await sendData(`teamleader/leaves/${leaveId}/recommend?action=${action}`, {});
        await refreshLeaves();
        return res;
    } else {
        const res = await sendData(`manager/leaves/${leaveId}/approve?action=${action}`, {});
        await refreshLeaves();
        return res;
    }
};

export const scheduleInterview = async (data: any) => {
    console.log('[storage.ts] Scheduling interview with data:', data);
    const res = await sendData('recruiter/interviews', data);
    await refreshInterviews();
    await refreshCandidates();
    return res;
};

export const managerApproveLeave = async (leave_id: any, action: 'approve' | 'reject') => {
    const res = await sendData(`manager/leaves/${leave_id}/approve?action=${action}`, {}, 'post');
    await refreshLeaves();
    return res;
};

export const updateInterviewFeedback = async (id: any, data: any) => {
    const res = await sendData(`recruiter/interviews/${id}/feedback`, data, 'patch');
    await refreshInterviews();
    return res;
};

export const createOffer = async (data: any) => {
    // PASS RAW STRINGS - Backend handles name→ID lookup perfectly
    console.log('[storage.ts] 🔄 createOffer RAW payload:', data);
    console.log('[storage.ts] 📤 FINAL payload to POST /recruiter/offers:', data);
    const res = await sendData('recruiter/offers', data);
    await refreshOffers();
    return res;
};

export const updateOfferStatus = async (id: any, status: string) => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const endpoint = role === 'manager' ? `manager/offers/${id}/status?status=${status}` : `recruiter/offers/${id}/status?status=${status}`;
    const res = await sendData(endpoint, {}, 'patch');
    await refreshOffers();
    return res;
};

export const acceptOfferLetter = async (offerId: any, joiningData: any) => {
    /**
     * Accept offer letter and create employee in HR master
     * Automatically generates employee_id and creates Employee record
     * 
     * @param offerId - ID of the offer to accept
     * @param joiningData - Object containing:
     *   - joining_date: Date of joining (optional, uses offer date if not provided)
     *   - first_name, last_name: Employee name details (optional)
     *   - department, designation: Job details (optional)
     *   - employment_type: "Full-Time", "Part-Time", etc.
     *   - address, city, state, country, postal_code: Address details
     *   - date_of_birth: DOB for employee record
     *   - manager_id: ID of reporting manager
     */
    const res = await sendData(`recruiter/offers/${offerId}/accept`, joiningData, 'post');
    await refreshOffers();
    await refreshEmployees();
    await refreshCandidates();
    return res;
};

export const rejectOfferLetter = async (offerId: any, rejectionReason: string = "") => {
    /**
     * Reject an offer letter
     * Candidate remains in pipeline for potential reconsideration
     * 
     * @param offerId - ID of the offer to reject
     * @param rejectionReason - Optional reason for rejection
     */
    const res = await sendData(`recruiter/offers/${offerId}/reject`, { rejection_reason: rejectionReason }, 'post');
    await refreshOffers();
    await refreshCandidates();
    return res;
};

export const addITAsset = async (asset: any) => {
    const id = `IT${Date.now()}`;
    const payload = { ...asset, id };
    const res = await sendData('it/assets', payload);
    await refreshAssets();
    return res;
};

export const addTicket = async (data: any) => {
    const res = await sendData('support-tickets', data);
    await refreshTickets();
    return res;
};

export const addITTicket = (data: any) => addTicket({ ...data, department: 'IT' });
export const addHRTicket = (data: any) => addTicket({ ...data, department: 'HR' });

export const deleteTicket = async (id: number) => {
    try {
        await api.delete(`support-tickets/${id}`); // Backend handles soft delete (deleted_at)
        await refreshTickets();
        return true;
    } catch (error) {
        console.error('Failed to delete ticket:', error);
        return false;
    }
};

// --- Document Governance (Feature 23/24) ---
export const downloadDocumentGoverned = async (docId: number, fileName: string) => {
    try {
        const response = await api.get(`shared/documents/${docId}/download`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
    } catch (error) {
        console.error('[GOVERNANCE] Document download failed:', error);
        return false;
    }
};

export const resolveTicket = async (id: number, author: string, reply: string = "Issue resolved.") => {
    try {
        await sendData(`support-tickets/${id}`, { status: "Resolved", resolution_details: `${reply} (by ${author})` }, 'patch');
        await refreshTickets();
        return true;
    } catch (error) {
        console.error('Failed to resolve ticket:', error);
        return false;
    }
};

export const getITTickets = () => _tickets.filter((t: any) => t.department === 'IT');
export const getHRTickets = () => _tickets.filter((t: any) => t.department === 'HR');

export const setITTickets = async (updatedList: any[]) => {
    // Determine which ticket was changed by comparing with local cache
    for (const ticket of updatedList) {
        const old = _tickets.find(t => t.id === ticket.id);
        if (old && JSON.stringify(old) !== JSON.stringify(ticket)) {
            // Found changed ticket, sync to backend
            await sendData(`support-tickets/${ticket.id}`, { status: ticket.status }, 'patch');

            const lastReply = ticket.replies?.[ticket.replies.length - 1];
            if (lastReply && (!old.replies || old.replies.length < ticket.replies.length)) {
                await sendData(`support-tickets/${ticket.id}/comments?comment_text=${encodeURIComponent(lastReply.text)}`, {}, 'post');
            }
        }
    }
    await refreshTickets();
};

export const updateTicketStatus = async (id: number, payload: any) => {
    const res = await sendData(`support-tickets/${id}`, payload, 'patch');
    await refreshTickets();
    return res;
};

export const setHRTickets = setITTickets; // Same logic for both departments

export const getNextEmployeeId = async () => {
    return fetchData('hr/next-employee-id');
};

export const updateITAsset = async (id: any, data: any) => {
    const res = await sendData(`it/assets/${id}`, data, 'put');
    await refreshAssets();
    return res;
};

export const deleteITAsset = async (id: any) => {
    const res = await sendData(`it/assets/${id}`, {}, 'delete');
    await refreshAssets();
    return res;
};

export const addAnnouncement = async (ann: any) => {
    const res = await sendData('manager/broadcasts', ann);
    await refreshAnnouncements();
    return res;
};

export const updateAnnouncement = async (id: any, ann: any) => {
    const res = await sendData(`manager/broadcasts/${id}`, ann, 'patch');
    await refreshAnnouncements();
    return res;
};

export const initiateOffboarding = async (data: any) => {
    const res = await sendData('employee/offboarding', data);
    await refreshOffboarding();
    return res;
};

export const getMyPreboarding = async () => {
    return fetchData('employee/preboarding');
};

export const updateMyPreboarding = async (updates: any) => {
    const res = await api.patch('employee/preboarding', updates);
    await refreshPreboarding();
    return res.data;
};

export const getMyOnboarding = async () => {
    return fetchData('employee/onboarding');
};

export const getMyOffboarding = async () => {
    return fetchData('employee/offboarding');
};

export const deleteAnnouncement = async (id: any) => {
    const res = await sendData(`manager/broadcasts/${id}`, {}, 'delete');
    await refreshAnnouncements();
    return res;
};

export const markNotificationRead = async (id: any) => {
    const res = await sendData(`notifications/${id}/read`, {}, 'patch');
    await refreshNotifications();
    return res;
};

export const initiateBulkOnboarding = async (data: any) => {
    const res = await sendData('hr/onboarding/bulk', data);
    await refreshEmployees();
    return res;
};

export const initiateManagementBulkOnboarding = async (data: any) => {
    const res = await sendData('manager/onboarding/bulk', data);
    await refreshEmployees();
    await refreshOnboarding();
    return res;
};

export const addOnboardingRequest = async (data: any) => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const endpoint = role === 'manager' ? 'manager/onboarding' : 'hr/onboarding';
    const res = await sendData(endpoint, data);
    await refreshOnboarding();
    return res;
};

export const updateOnboardingRequest = async (id: any, updates: any) => {
    // Strip read-only/metadata fields before sending
    const { id: _id, request_id, employee_id, created_at, updated_at, ...clean } = updates;
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const endpoint = role === 'manager' ? `manager/onboarding/${id}` : `hr/onboarding/${id}`;
    const res = await sendData(endpoint, clean, 'put');
    await refreshOnboarding();
    return res;
};

export const managerUpdateOnboardingRequest = async (id: any, updates: any) => {
    const res = await sendData(`manager/onboarding/${id}`, updates, 'put');
    await refreshOnboarding();
    return res;
};

export const approveOnboardingRequest = async (id: any) => {
    const res = await sendData(`hr/onboarding/${id}/approve`, {}, 'post');
    await refreshOnboarding();
    await refreshEmployees();
    return res;
};

export const checkUserExists = async (email: string, username?: string) => {
    try {
        // Check if user already exists by email or username
        const employees = await getEmployees();
        const existingUser = employees.find((emp: any) =>
            emp.email === email || (username && emp.username === username)
        );

        if (existingUser) {
            return {
                exists: true,
                message: `User already exists: ${existingUser.name || existingUser.email} (${existingUser.role})`,
                user: existingUser
            };
        }

        return { exists: false };
    } catch (error) {
        console.error('Error checking if user exists:', error);
        return { exists: false, error: 'Failed to check user existence' };
    }
};

export const managerApproveOnboardingRequest = async (id: any) => {
    console.log(`[STORAGE] Approving onboarding request ${id}`);
    const res = await sendData(`manager/onboarding/${id}/approve`, {}, 'post');
    console.log(`[STORAGE] Approval response:`, res);
    await refreshOnboarding();
    await refreshEmployees();
    return res;
};

export const managerRejectOnboardingRequest = async (id: any) => {
    const res = await sendData(`manager/onboarding/${id}/reject`, {}, 'post');
    await refreshOnboarding();
    await refreshEmployees();
    return res;
};

export const deleteOnboardingRequest = async (id: any) => {
    const res = await api.delete(`manager/onboarding/${id}`);
    await refreshOnboarding();
    return res.data;
};

export const managerGetRoleAssignments = async () => {
    return fetchData('manager/roles');
};

export const managerUpdateRoleAssignment = async (id: any, updates: any) => {
    const res = await sendData(`manager/roles/${id}`, updates, 'put');
    await refreshRoles();
    return res;
};

export const addPreboarding = async (data: any) => {
    const res = await sendData('hr/preboarding-v2', data);
    await refreshPreboarding();
    return res;
};

export const updatePreboarding = async (id: any, updates: any) => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    // Use correct endpoint based on role
    const endpoint = role === 'manager' ? `manager/preboarding/${id}` : `hr/preboarding-v2/${id}`;

    // Strip read-only/metadata fields before sending
    const { id: _id, preboard_id, employee_id, created_at, updated_at, ...clean } = updates;

    // Filter payload keys to only allowed fields to prevent validation errors (422)
    let payload = clean;
    if (role === 'hr') {
        const allowedKeys = [
            'documents_verified_by_hr', 'background_verification_status', 'form_status',
            'hr_review_status', 'remarks', 'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relation', 'bank_name', 'bank_account_number', 'bank_ifsc_code',
            'permanent_address', 'current_address', 'city', 'state', 'pincode', 'country',
            'nda_signed', 'code_of_conduct_signed', 'policy_acknowledged', 'uan_number',
            'esi_number', 'pf_number'
        ];
        payload = {};
        allowedKeys.forEach(k => {
            if (clean[k] !== undefined) {
                payload[k] = clean[k];
            }
        });
    }

    const res = await sendData(endpoint, payload, 'put');
    await refreshPreboarding();
    return res;
};
export const completePreboarding = async (id: any) => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const endpoint = role === 'manager' ? `manager/preboarding/${id}/complete` : `hr/preboarding-v2/${id}/verify`;
    const res = await sendData(endpoint, {}, 'post');
    await refreshPreboarding();
    return res;
};

export const createOffboardingRequest = (empId: any, data: any) => ({
    offboard_id: data.offboard_id || `OFF-${empId}-${Math.floor(1000 + Math.random() * 9000)}`,
    employee_id: empId,
    employeeName: data.employeeName || null,
    department: data.department || null,
    exit_date: data.exit_date,
    reason: data.reason,
    notice_period_days: data.notice_period_days || 0,
    notice_remaining_days: data.notice_remaining_days || 0,
    handover_to: data.handover_to || null,
    final_dues_amount: data.final_dues_amount || 0.0,
    exit_interview_notes: data.exit_interview_notes || null,
    manager_approved: data.manager_approved || false,
    completed: data.completed || false
});

export const addOffboardingRequest = async (data: any) => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const endpoint = role === 'manager' ? 'manager/offboarding' : 'hr/offboarding';
    // Call with direct params to bypass Pydantic dict validation
    // Pass full payload to ensure notice_period, etc. are saved
    const res = await api.post(endpoint, data);
    await refreshOffboarding();
    return res.data;
};

export const updateOffboardingRequest = async (id: any, updates: any) => {
    // Strip read-only/metadata fields before sending
    const { id: _id, offboard_id, employee_id, created_at, updated_at, employeeName, department, ...clean } = updates;
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const endpoint = role === 'manager' ? `manager/offboarding/${id}` : `hr/offboarding/${id}`;
    const res = await sendData(endpoint, clean, 'put');
    await refreshOffboarding();
    return res;
};

export const finalizeOffboarding = async (id: any) => {
    console.log(`[STORAGE] FINALIZING OFFBOARDING (Kill-Switch) for ${id}`);
    const res = await sendData(`manager/offboarding/complete/${id}`, {}, 'post');
    await refreshOffboarding();
    await refreshEmployees();
    return res;
};

export const addRoleAssignment = async (data: any) => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const endpoint = role === 'manager' ? 'manager/roles' : 'hr/roles';
    const res = await sendData(endpoint, data);
    await refreshRoles();
    return res;
};

export const createRoleAssignment = (empId: any, assignedBy: string, data: any) => ({
    employee_id: empId,
    role_name: data.role_name || data.role_type,
    login_enabled: data.login_enabled ?? false,
    assigned_by: assignedBy,
    is_active: true,
    assigned_at: new Date().toISOString()
});

export const updateRoleAssignment = async (id: any, updates: any) => {
    const role = (sessionStorage.getItem("userRole") || '').toLowerCase();
    const endpoint = role === 'manager' ? `manager/roles/${id}` : `hr/roles/${id}`;
    const res = await sendData(endpoint, updates, 'put');
    await refreshRoles();
    return res;
};

export const logActivity = async (type: string, message: string) => {
    const res = await sendData('activities', { type, message });
    await refreshActivities();
    return res;
};

export const isOnLeave = (id: any) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return _leaves.some(l =>
        String(l.employee_id) === String(id) &&
        (l.status === 'Approved' || l.status === 'approved') &&
        todayStr >= (l.start_date || l.from_date) &&
        todayStr <= (l.end_date || l.to_date)
    );
};

export const isAdminRole = (role: string) => {
    if (!role) return false;
    const r = role.toLowerCase().replace(/[\s_]+/g, '');
    return ['manager', 'hr', 'recruiter', 'teamleader', 'it', 'admin'].includes(r);
};

export const getWorkingDaysInMonth = (year: number, month: number, weekOffDays: string[] = ['Sunday'], holidays: any[] = []) => {
    let count = 0;
    const date = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();

    // Fallback to Sunday if weekOffDays is empty
    const finalWeekOffs = (weekOffDays && weekOffDays.length > 0) ? weekOffDays : ['Sunday'];

    // Format holidays for easy comparison
    const holidayDates = holidays.map(h => {
        const d = h.date instanceof Date ? h.date : new Date(h.date);
        return d.toISOString().split('T')[0];
    });

    for (let i = 1; i <= lastDay; i++) {
        date.setDate(i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = date.toISOString().split('T')[0];

        if (!finalWeekOffs.includes(dayName) && !holidayDates.includes(dateStr)) {
            count++;
        }
    }
    return count;
};

// --- Portal-Specific Data Logic ---
export const getAllOnboarding = async () => refreshOnboarding();
export const getAllPreboarding = async () => refreshPreboarding();
export const getAllOffboarding = async () => refreshOffboarding();

export const getManagerOnboarding = async () => _managerOnboarding.length > 0 ? _managerOnboarding : refreshOnboarding('manager');
export const getHROnboarding = async () => _hrOnboarding.length > 0 ? _hrOnboarding : refreshOnboarding('hr');

export const getManagerPreboarding = async () => refreshPreboarding('manager');
export const getHRPreboarding = async () => refreshPreboarding('hr');

export const getManagerOffboarding = async () => refreshOffboarding('manager');
export const getHROffboarding = async () => refreshOffboarding('hr');



export const getOnboardingRequests = async () => getAllOnboarding();
export const getHROnboardingRequests = async () => getHROnboarding();

export const getHROnboardingEnriched = async () => {
    // Fetch directly from /hr/onboarding which returns records
    const data = await fetchData('hr/onboarding');
    const list = Array.isArray(data) ? data : [];

    return list.map((req: any) => {
        // Calculate a dummy progress for legacy monitoring views if not present
        let progress = 0;
        if (req.status === 'approved') progress = 100;
        else if (req.status === 'in_progress') progress = 60;
        else if (req.status === 'pending') progress = 25;

        return {
            ...req,
            request_id: req.request_id || req.id,
            employee_id: req.employee_id,
            employeeName: req.name || `${req.first_name || ''} ${req.last_name || ''}`.trim() || req.employee_id,
            status: req.status || 'pending',
            progress: req.progress || progress,
            email: req.official_email || req.personal_email || '',
        };
    });
};

export const getOnboardingByEmpId = async (id: any) => {
    const data = await refreshOnboarding();
    return data.find((o: any) => o.employee_id === id || o.employee_id === String(id) || String(o.id) === String(id)) || null;
};
export const getPreboardingByEmpId = async (id: any) => {
    const data = await refreshPreboarding();
    return data.find((p: any) =>
        p.employee_id === id ||
        p.employee_id === String(id) ||
        String(p.id) === String(id)
    ) || null;
};
export const getHROffboardingRequests = async () => {
    const data = await fetchData('hr/offboarding');
    const list = Array.isArray(data) ? data : [];
    return list.map((off: any) => ({
        ...off,
        offboard_id: off.offboard_id || off.id,
        status: off.status || 'requested',
    }));
};

export const getOffboardingByEmpId = async (id: any) => {
    const data = await refreshOffboarding();
    return data.find((o: any) => o.employee_id === id || o.employee_id === String(id) || String(o.id) === String(id)) || null;
};

export const deleteOffboardingRequest = async (id: any) => {
    const res = await api.delete(`manager/offboarding/${id}`);
    await refreshOffboarding();
    return res;
};

export const getAttendanceByEmployee = (id: any) => {
    const emp = _employees.find(e => String(e.id) === String(id) || String(e.employee_id) === String(id));
    const empId = emp?.employee_id || id;
    const dbId = emp?.id || id;
    return _attendance.filter(a => 
        String(a.employee_id) === String(empId) || 
        String(a.employee_id) === String(dbId) ||
        String(a.id) === String(dbId)
    );
};
export const addHoliday = async (name: string, date: string) => {
    const res = await sendData('hr/holidays', { name, date, type: "Mandatory" });
    await refreshHolidays();
    return res;
};
export const deleteHoliday = async (id: any) => {
    const res = await sendData(`hr/holidays/${id}`, {}, 'delete');
    await refreshHolidays();
    return res;
};
export const notifyDepartment = (dept: string, title: string, msg?: string) => {
    const payload = msg ? { dept, title, msg } : { dept, msg: title };
    return sendData('manager/notifications/department', payload);
};

export const uploadFile = async (file: File, module: string = 'general', reference_id?: string, candidate_name?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (module) formData.append('module', module);
    if (reference_id) formData.append('reference_id', reference_id);
    if (candidate_name) formData.append('candidate_name', candidate_name);

    const response = await api.post('hr/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const getFileUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith('http') || path.startsWith('data:')) return path;

    // In production, the API and Frontend often share the same host
    const serverUrl = api.defaults.baseURL?.includes('http')
        ? api.defaults.baseURL.replace('/api/v1', '')
        : window.location.origin;

    const cleanPath = path.startsWith('uploads/') ? path : `uploads/${path}`;
    return `${serverUrl}/${cleanPath}`;
};

export const refreshITHardwareTasks = async () => {
    try {
        const res = await api.get('it/onboarding-requests');
        _hrOnboarding = res.data;
        return _hrOnboarding;
    } catch (error) {
        console.error('[STORAGE] Error refreshing IT hardware tasks:', error);
        return [];
    }
};

export const getITHardwareTasks = () => _hrOnboarding;
export const refreshPayrollHistory = async () => {
    try {
        const res = await api.get('hr/payroll/history');
        _payrollHistory = Array.isArray(res.data) ? res.data : [];
        return _payrollHistory;
    } catch (error) {
        console.error('[STORAGE] Error refreshing payroll history:', error);
        return [];
    }
};

export const getPayrollHistory = () => _payrollHistory;


export const getManagerAnalytics = async () => {
    try {
        const response = await api.get('manager/analytics');
        return response.data;
    } catch (e) {
        console.error('Error fetching manager analytics:', e);
        return { headcount: 0, pending_approvals: 0, active_transitions: 0, department_health: 0 };
    }
};

export const getEmployeeDocuments = async () => {
    const res = await fetchData('employee/documents');
    return Array.isArray(res) ? res : [];
};

export const getEmployeeDocumentsForHR = async (empId: string) => {
    const res = await fetchData('hr/employees/' + empId + '/documents');
    return Array.isArray(res) ? res : [];
};

export const getLeavePolicies = async () => {
    return fetchData('hr/leave-policies');
};

export const updateLeavePolicy = async (data: { leave_type: string, total_days: number, description?: string }) => {
    return sendData('hr/leave-policies', data, 'put');
};

export const getDepartments = async () => {
    try {
        const res = await api.get('hr/departments');
        return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
        console.error('[STORAGE] Error fetching departments:', error);
        return [];
    }
};
