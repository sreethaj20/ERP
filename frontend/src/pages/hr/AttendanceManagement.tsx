import React, { useState, useEffect, useMemo } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { 
  getEmployees, 
  getAttendance, 
  getAttendanceCorrections, 
  updateAttendanceCorrection, 
  getEmployeeShift, 
  refreshEmployees, 
  refreshAttendance, 
  refreshAttendanceCorrections,
  getOffboardingRequests,
  refreshOffboarding
} from "../../utils/storage";
import { 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaFileExcel, 
  FaSignInAlt, 
  FaSignOutAlt, 
  FaAngleRight, 
  FaAngleDown, 
  FaUsers, 
  FaClock, 
  FaUserClock,
  FaArrowRight
} from "react-icons/fa";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import { downloadCSV } from "../../utils/formatters";

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function AttendanceManagement() {
  const [employees, setEmployees] = useState(getEmployees());
  const [attendance, setAttendance] = useState(getAttendance());
  const [requests, setRequests] = useState<any[]>([]);
  const [offboardings, setOffboardings] = useState<any[]>(getOffboardingRequests());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Custom toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Custom inline reject comments gating
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Collapsible hierarchy state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Month and Year states for summary CSV export
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Load data from server ONCE on mount to prevent infinite storage event triggers
  useEffect(() => {
    const fetchFromServer = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          refreshEmployees(),
          refreshAttendance(),
          refreshAttendanceCorrections(),
          refreshOffboarding()
        ]);
      } catch (err) {
        console.error("Error fetching attendance data from server:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFromServer();
  }, []);

  // Sync state with global storage on mount and when storage updates
  useEffect(() => {
    const syncWithStorage = () => {
      setEmployees(getEmployees());
      setAttendance(getAttendance());
      setOffboardings(getOffboardingRequests());
      const allRequests = getAttendanceCorrections();
      setRequests(Array.isArray(allRequests) ? allRequests.filter((r: any) => (r.status || '').toLowerCase() === 'pending') : []);
    };
    
    syncWithStorage();
    window.addEventListener('storage', syncWithStorage);
    return () => window.removeEventListener('storage', syncWithStorage);
  }, []);

  // Robust timezone-aware local date calculations (Sweden locale formats as YYYY-MM-DD)
  const today = new Date().toLocaleDateString('sv-SE');

  // Normalize date from attendance records: handles both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:MM:SS' formats
  const normalizeDate = (rawDate: any): string => {
    if (!rawDate) return '';
    const s = String(rawDate);
    // If it's an ISO datetime string like '2026-06-04T00:00:00', take just the date part
    return s.includes('T') ? s.split('T')[0] : s.substring(0, 10);
  };

  // Filter active workforce: only track employees currently in their probation period
  const activeWorkforce = useMemo(() => {
    return employees.filter((e: any) => {
      const status = (e.status || '').toLowerCase();
      
      // Exclude Inactive, Archived, Onboarding, Resigned
      if (['inactive', 'archived', 'onboarding', 'resigned'].includes(status)) {
        return false;
      }

      // Hide if offboarding is fully completed
      const offboardingReq = offboardings.find(o => String(o.employee_id) === String(e.employee_id) || String(o.employee_id) === String(e.id));
      if (offboardingReq && offboardingReq.status?.toLowerCase() === 'completed') {
        return false;
      }

      // Hide if probation/provision period is over
      if (e.joining_date) {
        const joinDate = new Date(e.joining_date);
        const probationDays = e.probation_period_days != null ? e.probation_period_days : 90;
        const probationEndDate = new Date(joinDate.getTime() + probationDays * 24 * 60 * 60 * 1000);
        const isProbationOver = new Date() > probationEndDate;
        if (isProbationOver) {
          return false;
        }
      }

      return true;
    });
  }, [employees, offboardings]);

  // Filter today's attendance only for the active workforce
  const todayAttendance = useMemo(() => {
    return attendance.filter((a: any) => 
      normalizeDate(a.date) === today && 
      activeWorkforce.some(emp => String(emp.employee_id) === String(a.employee_id) || String(emp.id) === String(a.employee_id))
    );
  }, [attendance, today, activeWorkforce]);

  // Stats from today's actual presence
  const presentCount = todayAttendance.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
  const leaveCount = todayAttendance.filter((a: any) => a.status === 'Leave').length;
  const activeStaff = activeWorkforce.length;
  const absentCount = Math.max(0, activeStaff - presentCount - leaveCount);
  const presenceRate = activeStaff > 0 ? Math.round((presentCount / activeStaff) * 100) : 0;

  // Extract all departments dynamically for filtration
  const departments = useMemo(() => {
    const depts = new Set(activeWorkforce.map(e => e.department).filter(Boolean));
    return ["All Departments", ...Array.from(depts)];
  }, [activeWorkforce]);

  // Simple flat list of filtered employees
  const filteredEmployees = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    return activeWorkforce.filter(e => {
      const matchesSearch = (
        (e.name || '').toLowerCase().includes(searchLower) ||
        (e.employee_id || '').toLowerCase().includes(searchLower) ||
        (e.department || '').toLowerCase().includes(searchLower) ||
        (e.role || '').toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;

      if (deptFilter !== 'all' && e.department !== deptFilter) return false;

      const att = todayAttendance.find((a: any) =>
        a.employee_id === e.employee_id ||
        a.employee_id === e.id ||
        String(a.employee_id) === String(e.id)
      );
      const status = att ? att.status : 'Absent';

      if (statusFilter === 'all') return true;
      if (statusFilter === 'present') return status === 'Present' || status === 'Late';
      if (statusFilter === 'absent') return status === 'Absent';
      if (statusFilter === 'leave') return status === 'Leave';
      return true;
    });
  }, [activeWorkforce, todayAttendance, searchTerm, statusFilter, deptFilter]);

  // Group filtered employees by their Team Leader
  const groupedEmployees = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredEmployees.forEach(emp => {
      let tlName = emp.reporting_to || emp.manager_id || emp.team_leader_id;
      if (!tlName && emp.reporting_to_id) {
        // Look up manager's name from employee pool
        const mgr = employees.find((e: any) => String(e.employee_id) === String(emp.reporting_to_id) || String(e.id) === String(emp.reporting_to_id));
        if (mgr) tlName = mgr.name || `${mgr.first_name || ''} ${mgr.last_name || ''}`.trim();
      }
      if (!tlName) tlName = "Direct Reports / Unassigned";
      
      if (!groups[tlName]) groups[tlName] = [];
      groups[tlName].push(emp);
    });
    return groups;
  }, [filteredEmployees, employees]);

  const toggleGroup = (tlName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [tlName]: !prev[tlName]
    }));
  };

  const handleExportLog = () => {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const exportData = attendance.map((a: any) => ({
      Date: a.date,
      Employee: a.employee_name,
      ID: a.employee_id,
      Role: a.role,
      Login: a.login_time ? new Date(a.login_time).toLocaleTimeString() : 'N/A',
      Logout: a.logout_time ? new Date(a.logout_time).toLocaleTimeString() : 'N/A',
      Hours: a.hours_worked || 0,
      Status: a.status
    }));
    downloadCSV(exportData, `Attendance_Log_${currentMonth.replace(/\s/g, '_')}.csv`);
    showToast("CSV Log exported successfully!");
  };

  const handleExportDaily = () => {
    const exportData = activeWorkforce.map((m: any) => {
      const a = todayAttendance.find((att: any) =>
        att.employee_id === m.employee_id ||
        att.employee_id === m.id ||
        String(att.employee_id) === String(m.id) ||
        String(att.employee_id) === String(m.employee_id)
      );
      return {
        Date: today,
        "Employee ID": m.employee_id || m.id,
        "Employee Name": m.name,
        Department: m.department || 'N/A',
        Role: m.role || 'N/A',
        Login: a?.login_time ? new Date(a.login_time).toLocaleTimeString() : 'N/A',
        Logout: a?.logout_time ? new Date(a.logout_time).toLocaleTimeString() : 'N/A',
        Hours: a?.hours_worked || 0,
        Status: a ? a.status : 'Absent'
      };
    });
    downloadCSV(exportData, `Attendance_Daily_${today}.csv`);
    showToast("Daily CSV exported successfully!");
  };

  const handleExportMonthlySummary = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const exportData = activeWorkforce.map((m: any) => {
      const stats = attendance.filter((a: any) => {
        if (!a.date || !(
          a.employee_id === m.employee_id ||
          a.employee_id === m.id ||
          String(a.employee_id) === String(m.id) ||
          String(a.employee_id) === String(m.employee_id)
        )) return false;
        
        const dateStr = normalizeDate(a.date);
        const parts = dateStr.split('-');
        if (parts.length < 3) return false;
        const aYear = parseInt(parts[0], 10);
        const aMonth = parseInt(parts[1], 10) - 1;
        return aMonth === exportMonth && aYear === exportYear;
      });

      const present = stats.filter((s: any) => s.status === 'Present' || String(s.status || '').toLowerCase().includes('present')).length;
      const leaves = stats.filter((s: any) => s.status === 'Leave' || String(s.status || '').toLowerCase().includes('leave')).length;
      const lop = stats.filter((s: any) => s.status === 'Absent' || String(s.status || '').toLowerCase().includes('absent')).length;
      const halfDay = stats.filter((s: any) => s.status === 'Half Day' || String(s.status || '').toLowerCase().includes('half')).length;
      const totalDays = stats.length;

      return {
        "Employee ID": m.employee_id || m.id,
        "Employee Name": m.name,
        Department: m.department || 'N/A',
        Role: m.role || 'N/A',
        Month: monthNames[exportMonth],
        Year: exportYear,
        Present: present,
        Leaves: leaves,
        "LOP (Absent)": lop,
        "Half Day": halfDay,
        "Total Days Tracked": totalDays
      };
    });
    
    downloadCSV(exportData, `Attendance_Monthly_${monthNames[exportMonth]}_${exportYear}.csv`);
    showToast("Monthly CSV exported successfully!");
  };

  const handleCorrectionStatus = async (id: any, status: 'approved' | 'rejected', comment?: string) => {
    try {
      setActionLoading(`${id}-${status}`);
      await updateAttendanceCorrection(id, { 
        status, 
        rejection_reason: comment || undefined 
      });
      
      const allRequests = getAttendanceCorrections();
      setRequests(Array.isArray(allRequests) ? allRequests.filter((r: any) => (r.status || '').toLowerCase() === 'pending') : []);
      showToast(`Correction request ${status} successfully.`);
      
      // Reset comments drawer
      if (status === 'rejected') {
        setRejectingRequestId(null);
        setRejectionReasons(prev => {
          const clone = { ...prev };
          delete clone[id];
          return clone;
        });
      }
    } catch (error) {
      console.error("Error updating correction status:", error);
      showToast("Failed to process request.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAll = async () => {
    if (requests.length === 0) return;
    if (!window.confirm(`Are you sure you want to approve all ${requests.length} pending corrections?`)) return;

    try {
      setActionLoading('approve-all');
      await Promise.all(requests.map(req => updateAttendanceCorrection(req.id, { status: 'approved' })));
      
      const allRequests = getAttendanceCorrections();
      setRequests(Array.isArray(allRequests) ? allRequests.filter((r: any) => (r.status || '').toLowerCase() === 'pending') : []);
      showToast(`Batch approved all ${requests.length} requests!`);
    } catch (e) {
      console.error(e);
      showToast("Failed to approve all requests.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const getAvatarGradient = (name: string) => {
    const colors = [
      ['#ff5e62', '#ff9966'], // Sunset
      ['#1A2980', '#26D0CE'], // Sea Blue
      ['#11998e', '#38ef7d'], // Fresh Green
      ['#a8c0ff', '#3f2b96'], // Lavender Dream
      ['#F3904F', '#3B4371'], // Dawn
      ['#ee9ca7', '#ffdde1'], // Sweet Pink
      ['#8E2DE2', '#4A00E0'], // Deep Purple
      ['#00c6ff', '#0072ff'], // Bright Blue
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    const gradient = colors[sum % colors.length];
    return `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`;
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const renderStatusBadge = (status: string) => {
    let bg = 'rgba(255,255,255,0.05)';
    let color = 'var(--text-secondary)';
    let border = '1px solid rgba(255,255,255,0.05)';
    let shadow = 'none';

    if (status === 'Present' || status === 'Late') {
      bg = 'rgba(48,209,88,0.08)';
      color = '#30d158';
      border = '1px solid rgba(48,209,88,0.18)';
      shadow = '0 0 10px rgba(48,209,88,0.12)';
    } else if (status === 'Leave') {
      bg = 'rgba(255,159,10,0.08)';
      color = '#ff9f0a';
      border = '1px solid rgba(255,159,10,0.18)';
      shadow = '0 0 10px rgba(255,159,10,0.12)';
    } else if (status === 'Absent') {
      bg = 'rgba(255,55,95,0.08)';
      color = '#ff375f';
      border = '1px solid rgba(255,55,95,0.18)';
      shadow = '0 0 10px rgba(255,55,95,0.12)';
    }

    return (
      <span style={{
        padding: '5px 12px',
        borderRadius: '8px',
        fontSize: '10px',
        fontWeight: '700',
        background: bg,
        color: color,
        border: border,
        boxShadow: shadow,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'inline-block'
      }}>
        {status}
      </span>
    );
  };

  const renderEmployeeRow = (m: any) => {
    const att = todayAttendance.find((a: any) =>
      a.employee_id === m.employee_id ||
      a.employee_id === m.id ||
      String(a.employee_id) === String(m.id) ||
      String(a.employee_id) === String(m.employee_id)
    );
    const shift = getEmployeeShift(m.id);
    const status = att ? att.status : 'Absent';

    return (
      <tr key={m.id} className="modern-table-row">
        <td style={{ padding: "14px 16px", position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: getAvatarGradient(m.name || ''),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              color: '#fff',
              boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              zIndex: 1
            }}>
              {getInitials(m.name || '')}
            </div>
            <div>
              <div style={{ fontWeight: "600", fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {m.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{m.employee_id || m.id} • {m.role}</div>
            </div>
          </div>
        </td>
        <td style={{ padding: "14px 12px", fontSize: '13px', color: 'var(--text-secondary)' }}>{m.department}</td>
        <td style={{ padding: "14px 12px" }}>
          {shift ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: 'var(--accent-blue)' }}>
                <FaClock size={10} /> {shift.shift_name}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', paddingLeft: '15px', marginTop: '2px' }}>{shift.start_time} - {shift.end_time}</div>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Standard / Universal</span>
          )}
        </td>
        <td style={{ padding: "14px 12px" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: att?.login_time ? '#30d158' : 'var(--text-tertiary)' }}>
            <FaSignInAlt size={12} style={{ opacity: att?.login_time ? 1 : 0.4 }} />
            <span style={{ fontSize: '13px', fontWeight: '500' }}>
              {att?.login_time ? new Date(att.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
        </td>
        <td style={{ padding: "14px 12px" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: att?.logout_time ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
            <FaSignOutAlt size={12} style={{ opacity: att?.logout_time ? 1 : 0.4 }} />
            <span style={{ fontSize: '13px', fontWeight: '500' }}>
              {att?.logout_time ? new Date(att.logout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
        </td>
        <td style={{ padding: "14px 12px", fontSize: '13px', fontWeight: '600', color: '#fff' }}>
          {att?.hours_worked || '0'}h
        </td>
        <td style={{ padding: "14px 12px", fontSize: '13px', color: 'var(--text-secondary)' }}>
          {Math.round(att?.break_time || 0)}m
        </td>
        <td style={{ padding: "14px 12px" }}>
          {renderStatusBadge(status)}
        </td>
      </tr>
    );
  };

  return (
    <div className="dashboard-container">
      <Header role="HR" title="Attendance Control" />

      {/* Modern custom visual components, hover micro-animations and custom transitions */}
      <style>{`
        .modern-table-row {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
        }
        .modern-table-row:hover {
          background: rgba(255, 255, 255, 0.02) !important;
          box-shadow: inset 4px 0 0 var(--accent-blue);
        }
        .stat-card-glow {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stat-card-glow:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255,255,255,0.02);
        }
        .action-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .action-card:hover {
          transform: translateX(4px);
          background: rgba(255,255,255,0.03) !important;
        }
        .premium-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .premium-btn:hover {
          transform: scale(1.02);
        }
        .premium-btn:active {
          transform: scale(0.98);
        }
        .approve-btn:hover {
          background: #30d158 !important;
          color: #000 !important;
          box-shadow: 0 0 15px rgba(48,209,88,0.4) !important;
        }
        .reject-btn:hover {
          background: #ff453a !important;
          color: #fff !important;
          box-shadow: 0 0 15px rgba(255,69,58,0.4) !important;
        }
        .attendance-grid {
          display: grid;
          grid-template-columns: 1.95fr 1.05fr;
          gap: 24px;
        }
        @keyframes slideIn {
          0% { transform: translateY(20px) scale(0.9); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @media (max-width: 1360px) {
          .attendance-grid {
            grid-template-columns: 1fr;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Floating Animated Custom Toast Notifications */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1000 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '12px 20px',
            borderRadius: '10px',
            background: t.type === 'success' ? 'rgba(48,209,88,0.95)' : 'rgba(255,69,58,0.95)',
            color: '#fff',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            fontSize: '13px',
            fontWeight: '600',
            backdropFilter: 'blur(10px)',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '15px' }}>{t.type === 'success' ? '✓' : '⚡'}</span>
            {t.message}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "30px", display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: '#fff', letterSpacing: '-0.5px' }}>Attendance Management</h1>
          <p className="subtitle" style={{ marginTop: '4px' }}>Real-time workforce attendance logs, hierarchy audits, and correction gating</p>
        </div>
      </div>

      {/* Diagnostic banner: shown only when attendance loaded but no today's records */}
      {!isLoading && attendance.length > 0 && todayAttendance.length === 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 18px',
          borderRadius: '10px',
          background: 'rgba(255,159,10,0.07)',
          border: '1px solid rgba(255,159,10,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: '#ff9f0a'
        }}>
          <span style={{ fontSize: '18px' }}>ℹ️</span>
          <div>
            <strong>No check-ins recorded today ({today}).</strong>
            <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
              {attendance.length} total records exist in the system. Staff may not have logged in yet, or attendance is being tracked for a different date.
            </span>
          </div>
        </div>
      )}

      {/* Hero Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        {[
          { label: "Staff on Probation", value: activeStaff, icon: <FaUsers size={20} color="#0a84ff" />, color: "#0a84ff", bgGlow: "rgba(10,132,255,0.1)" },
          { label: "Active On-Duty", value: presentCount, icon: <FaCheckCircle size={20} color="#30d158" />, color: "#30d158", bgGlow: "rgba(48,209,88,0.1)" },
          { label: "Absent / Unaccounted", value: absentCount, icon: <FaExclamationCircle size={20} color="#ff375f" />, color: "#ff375f", bgGlow: "rgba(255,55,95,0.1)" },
          { label: "On Approved Leave", value: leaveCount, icon: <FaUserClock size={20} color="#ff9f0a" />, color: "#ff9f0a", bgGlow: "rgba(255,159,10,0.1)" }
        ].map((stat, index) => (
          <GlassCard key={index} className="stat-card-glow" style={{ borderLeft: `4px solid ${stat.color}`, position: 'relative', overflow: 'hidden', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>{stat.label}</div>
                <div style={{ fontSize: '38px', fontWeight: '800', color: '#fff', marginTop: '12px', textShadow: `0 0 15px ${stat.bgGlow}` }}>{stat.value}</div>
              </div>
              <div style={{ 
                width: '46px', 
                height: '46px', 
                borderRadius: '12px', 
                background: stat.bgGlow, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: `1px solid ${stat.bgGlow}`
              }}>
                {stat.icon}
              </div>
            </div>
          </GlassCard>
        ))}

        {/* Dynamic SVG Presence Gauge Card */}
        <GlassCard className="stat-card-glow" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px 24px', borderLeft: '4px solid #30d158' }}>
          <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
            <svg width="70" height="70" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#30d158" strokeWidth="3.5"
                strokeDasharray={`${presenceRate} ${100 - presenceRate}`}
                style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
                strokeLinecap="round"
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '13px',
              fontWeight: '800',
              color: '#fff'
            }}>
              {presenceRate}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Presence Yield</div>
            <div style={{ fontSize: '13px', color: '#fff', fontWeight: '600', marginTop: '6px' }}>
              {presentCount} of {activeStaff} On-Duty
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="attendance-grid">
        {/* Left Column - Today's Presence Audit Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Workforce Attendance Logs" subtitle="Today's real-time login activity and shift coverage">
            {/* Scrollable Dynamic Department Pill Filters */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', margin: '10px 0 15px 0' }} className="dept-scroll-container">
              <style>{`
                .dept-scroll-container::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {departments.map(dept => {
                const isSelected = (deptFilter === 'all' && dept === 'All Departments') || deptFilter === dept;
                return (
                  <button
                    key={dept}
                    onClick={() => setDeptFilter(dept === "All Departments" ? "all" : dept)}
                    className="apple-btn"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: isSelected ? 'rgba(10, 132, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? '#0a84ff' : 'var(--text-secondary)',
                      border: isSelected ? '1px solid rgba(10,132,255,0.3)' : '1px solid rgba(255,255,255,0.05)',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {dept}
                  </button>
                );
              })}
            </div>

            {/* Search & Filters */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              gap: '15px', 
              margin: '0 0 20px 0',
              flexWrap: 'wrap'
            }}>
              {/* Status Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All', count: activeStaff },
                  { id: 'present', label: 'On-Duty', count: presentCount, color: 'var(--accent-green)' },
                  { id: 'absent', label: 'Absent', count: absentCount, color: 'var(--accent-red)' },
                  { id: 'leave', label: 'Leave', count: leaveCount, color: 'var(--accent-orange)' }
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setStatusFilter(pill.id)}
                    className="apple-btn"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: statusFilter === pill.id ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                      background: statusFilter === pill.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: statusFilter === pill.id ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  >
                    {pill.color && (
                      <span style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: pill.color,
                        boxShadow: `0 0 5px ${pill.color}`
                      }} />
                    )}
                    {pill.label}
                    <span style={{ 
                      background: statusFilter === pill.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)', 
                      padding: '1px 5px', 
                      borderRadius: '5px', 
                      fontSize: '10px',
                      color: statusFilter === pill.id ? '#fff' : 'var(--text-tertiary)'
                    }}>{pill.count}</span>
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div style={{ position: 'relative', flex: '1', maxWidth: '280px', minWidth: '200px' }}>
                <input 
                  type="text" 
                  placeholder="Search staff, dept, role..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                />
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-tertiary)', fontSize: '11px' }}>🔍</span>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={thStyle}>
                    <th style={{ padding: "12px 16px" }}>EMPLOYEE</th>
                    <th style={{ padding: "12px" }}>DEPARTMENT</th>
                    <th style={{ padding: "12px" }}>SHIFT</th>
                    <th style={{ padding: "12px" }}>LOGIN</th>
                    <th style={{ padding: "12px" }}>LOGOUT</th>
                    <th style={{ padding: "12px" }}>WORK HRS</th>
                    <th style={{ padding: "12px" }}>BREAK MIN</th>
                    <th style={{ padding: "12px" }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    if (isLoading) {
                      return (
                        <tr>
                          <td colSpan={8} style={{ padding: '60px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                              <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                border: '3px solid rgba(10,132,255,0.15)',
                                borderTopColor: '#0a84ff',
                                animation: 'spin 0.8s linear infinite'
                              }} />
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading attendance data...</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    if (filteredEmployees.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                            No employees match current search or filters.
                          </td>
                        </tr>
                      );
                    }

                    return Object.entries(groupedEmployees).map(([tlName, members]: [string, any]) => (
                      <React.Fragment key={tlName}>
                        <tr 
                          onClick={() => toggleGroup(tlName)} 
                          style={{ 
                            cursor: 'pointer', 
                            background: 'rgba(255,255,255,0.02)',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        >
                          <td colSpan={8} style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', color: 'var(--accent-blue)', fontSize: '14px' }}>
                              <FaAngleRight style={{ 
                                transform: expandedGroups[tlName] ? 'rotate(90deg)' : 'none', 
                                transition: 'transform 0.2s ease',
                                color: 'var(--text-secondary)'
                              }} />
                              <FaUsers style={{ color: 'rgba(10, 132, 255, 0.7)' }} />
                              {tlName}
                              <span style={{ 
                                background: 'rgba(10, 132, 255, 0.1)', 
                                color: '#0a84ff', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontSize: '11px',
                                marginLeft: '8px'
                              }}>
                                {members.length} member{members.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {expandedGroups[tlName] && members.map((m: any) => renderEmployeeRow(m))}
                      </React.Fragment>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Right Column - Widgets and Utilities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Correction Gating Card */}
          {requests.length > 0 && (
            <GlassCard 
              title="Correction Gating" 
              subtitle={`${requests.length} pending correction requests`}
              headerAction={
                <button
                  disabled={actionLoading !== null}
                  onClick={handleApproveAll}
                  className="apple-btn premium-btn"
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: 'rgba(48,209,88,0.12)',
                    color: '#30d158',
                    border: '1px solid rgba(48,209,88,0.2)',
                    cursor: 'pointer'
                  }}
                >
                  Approve All
                </button>
              }
            >
              <div style={{ marginTop: "15px" }}>
                {requests.map((req: any, idx) => {
                  const isCorrectedPresent = req.corrected_status === 'Present';
                  const accentColor = isCorrectedPresent ? '#30d158' : '#ff9f0a';
                  const isLoadingApprove = actionLoading === `${req.id}-approved`;
                  const isLoadingReject = actionLoading === `${req.id}-rejected`;
                  const isRejectingThis = rejectingRequestId === String(req.id);

                  return (
                    <div key={idx} className="action-card" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      padding: '14px',
                      background: 'rgba(255,255,255,0.01)',
                      borderRadius: '12px',
                      marginBottom: '12px',
                      border: '1px solid rgba(255,255,255,0.03)',
                      borderLeft: `3px solid ${accentColor}`,
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: getAvatarGradient(req.employee_name || ''),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#fff'
                        }}>
                          {getInitials(req.employee_name || '')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: '#fff' }}>{req.employee_name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>ID: {req.employee_id}</div>
                        </div>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '5px',
                          fontSize: '9px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          background: isCorrectedPresent ? 'rgba(48,209,88,0.1)' : 'rgba(255,159,10,0.1)',
                          color: accentColor,
                          border: `1px solid ${isCorrectedPresent ? 'rgba(48,209,88,0.15)' : 'rgba(255,159,10,0.15)'}`
                        }}>
                          {req.corrected_status}
                        </span>
                      </div>

                      <div style={{ 
                        fontSize: '11px', 
                        background: 'rgba(0,0,0,0.15)', 
                        padding: '8px 10px', 
                        borderRadius: '6px', 
                        color: 'var(--text-secondary)',
                        lineHeight: '1.4'
                      }}>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', color: '#fff', fontWeight: '500', marginBottom: '3px' }}>
                          <span>Correction Date:</span>
                          <span>{req.date}</span>
                        </div>
                        {req.reason && <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: '2px' }}>"{req.reason}"</div>}
                      </div>

                      {/* Expandable Rejection Comment Drawer */}
                      {isRejectingThis && (
                        <div style={{
                          marginTop: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          animation: 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                          <textarea
                            placeholder="Provide audit comments for rejection..."
                            value={rejectionReasons[req.id] || ""}
                            onChange={(e) => setRejectionReasons(prev => ({ ...prev, [req.id]: e.target.value }))}
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              background: 'rgba(0,0,0,0.25)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '12px',
                              outline: 'none',
                              resize: 'none',
                              fontFamily: 'inherit'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setRejectingRequestId(null)}
                              className="apple-btn premium-btn"
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-secondary)',
                                borderRadius: '5px',
                                border: 'none'
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => handleCorrectionStatus(req.id, 'rejected', rejectionReasons[req.id])}
                              className="apple-btn premium-btn"
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                background: 'rgba(255,69,58,0.15)',
                                color: '#ff453a',
                                borderRadius: '5px',
                                border: 'none',
                                fontWeight: '700'
                              }}
                            >
                              {isLoadingReject ? '...' : 'Confirm'}
                            </button>
                          </div>
                        </div>
                      )}

                      {!isRejectingThis && (
                        <div style={{ display: "flex", gap: "8px", justifyContent: 'flex-end', marginTop: '4px' }}>
                          <button 
                            disabled={actionLoading !== null}
                            onClick={() => setRejectingRequestId(String(req.id))} 
                            className="apple-btn reject-btn premium-btn" 
                            style={{ 
                              padding: "5px 12px", 
                              fontSize: "11px", 
                              background: "rgba(255,69,58,0.08)", 
                              color: "#ff453a",
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Reject
                          </button>
                          <button 
                            disabled={actionLoading !== null}
                            onClick={() => handleCorrectionStatus(req.id, 'approved')} 
                            className="apple-btn approve-btn premium-btn" 
                            style={{ 
                              padding: "5px 12px", 
                              fontSize: "11px", 
                              background: "rgba(48,209,88,0.12)", 
                              color: "#30d158",
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {isLoadingApprove ? '...' : 'Approve'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* Attendance Calendar Card */}
          <GlassCard title="Attendance Overview" subtitle="Visual presence timeline map">
            <div style={{ marginTop: '10px' }}>
              <AttendanceCalendar type="team" />
            </div>
          </GlassCard>

          {/* Export / Reporting Card */}
          <GlassCard title="Audit Export" subtitle="Download verified payroll and presence logs">
            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Daily Log Button */}
              <button 
                onClick={handleExportDaily} 
                className="apple-btn premium-btn" 
                style={{ 
                  width: "100%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: "10px", 
                  background: 'rgba(255,255,255,0.04)', 
                  border: '1px solid rgba(255,255,255,0.06)',
                  height: '42px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <FaFileExcel size={14} color="#30d158" /> Export Daily Log (.CSV)
              </button>

              <div style={{ borderTop: '1px dotted rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Monthly Summary Export (Every Employee)
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <select
                    className="apple-input"
                    value={exportMonth}
                    onChange={(e) => setExportMonth(parseInt(e.target.value))}
                    style={{ padding: '6px 10px', fontSize: '12px', flex: 1, background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px' }}
                  >
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                      <option key={i} value={i} style={{ background: '#1c1c1e' }}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="apple-input"
                    value={exportYear}
                    onChange={(e) => setExportYear(parseInt(e.target.value))}
                    style={{ padding: '6px 10px', fontSize: '12px', flex: 1, background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px' }}
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y} style={{ background: '#1c1c1e' }}>{y}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={handleExportMonthlySummary} 
                  className="apple-btn premium-btn" 
                  style={{ 
                    width: "100%", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: "10px", 
                    background: 'var(--accent-blue)', 
                    border: 'none',
                    height: '42px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <FaFileExcel size={14} color="#fff" /> Export Monthly Summary (.CSV)
                </button>
              </div>

              <div style={{ borderTop: '1px dotted rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                <button 
                  onClick={handleExportLog} 
                  className="apple-btn premium-btn" 
                  style={{ 
                    width: "100%", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: "10px", 
                    background: 'transparent', 
                    border: 'none',
                    height: '32px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer'
                  }}
                >
                  <FaFileExcel size={10} color="var(--text-tertiary)" /> Export Full Raw Logs (.CSV)
                </button>
              </div>

            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "var(--text-tertiary)",
  fontSize: "10px",
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  padding: '12px'
};


