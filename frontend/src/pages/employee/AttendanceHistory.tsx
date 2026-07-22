import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import { getAttendance, getHolidays, getLeaves, refreshAttendance, refreshLeaves } from "../../utils/storage";
import { downloadCSV } from "../../utils/formatters";
import { requestAttendanceCorrection } from "../../services/employeeService";

export default function AttendanceHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const userId = sessionStorage.getItem("userId") || "";

  // Attendance Correction Modal States
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<any>(null);
  const [requestedCheckInTime, setRequestedCheckInTime] = useState("09:00");
  const [requestedCheckOutTime, setRequestedCheckOutTime] = useState("18:00");
  const [correctionReason, setCorrectionReason] = useState("");
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionSuccessMsg, setCorrectionSuccessMsg] = useState("");
  const [correctionErrorMsg, setCorrectionErrorMsg] = useState("");


  const downloadAttendanceReport = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const monthAtt = history.filter((h: any) => {
      const d = new Date(h.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    const reportData = monthAtt.map((att: any) => ({
      Date: att.date || 'N/A',
      Status: att.status || 'Absent',
      'Login Time': att.login_time || 'N/A',
      'Logout Time': att.logout_time || 'N/A',
      Notes: att.notes || ''
    }));

    const filename = `Attendance_${year}_${month.toString().padStart(2, '0')}.csv`;
    downloadCSV(reportData, filename);
  };

  useEffect(() => {
    const employeeId = sessionStorage.getItem("employeeId") || "";
    const refreshData = () => {
      const allAtt = getAttendance();
      const myAtt = allAtt.filter((a: any) => 
        String(a.employee_id) === String(employeeId) || 
        String(a.employee_id) === String(userId)
      );
      setHistory(myAtt);
      setHolidays(getHolidays());
      setLeaves(getLeaves());
    };

    const fetchFromServer = async () => {
      try {
        await Promise.all([
          refreshAttendance(),
          refreshLeaves()
        ]);
      } catch (err) {
        console.error("Error refreshing attendance from server:", err);
      }
    };

    refreshData();
    fetchFromServer();
    window.addEventListener('storage', refreshData);
    return () => window.removeEventListener('storage', refreshData);
  }, [userId]);

  // Calculate stats for the selected month
  const calculateStats = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let present = 0;
    let leave = 0;
    let lop = 0;
    let halfDay = 0;

    const joinDateStr = sessionStorage.getItem("joinDate") || "";
    let joinDateObj: Date | null = null;
    if (joinDateStr && joinDateStr !== "—" && !isNaN(Date.parse(joinDateStr))) {
      joinDateObj = new Date(joinDateStr);
      joinDateObj.setHours(0, 0, 0, 0);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      if (joinDateObj && dateObj < joinDateObj) continue; // Skip days before joining date

      const dayOfWeek = dateObj.getDay();
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      const dayRecord = history.find(h => h.date === dateStr);

      if (!dayRecord) {
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
        if (holidays.some(h => h.date === dateStr)) continue; // Skip holidays
      }
      
      const hasApprovedLeave = leaves.some(l => {
        const lStart = String(l.start_date || l.startDate || l.from_date || l.fromDate || '').substring(0, 10);
        const lEnd = String(l.end_date || l.endDate || l.to_date || l.toDate || '').substring(0, 10);
        return (
          ((userId && String(l.employee_id) === String(userId)) || 
           (sessionStorage.getItem("employeeId") && String(l.employee_id) === String(sessionStorage.getItem("employeeId")))) &&
          l.status?.toLowerCase() === 'approved' &&
          dateStr >= lStart &&
          dateStr <= lEnd
        );
      });

      const isApprovedLeave = hasApprovedLeave || (dayRecord && (
        (dayRecord.status || '').toLowerCase().includes('leave') || 
        (dayRecord.remark || '').toLowerCase().includes('leave')
      ));

      // Skip future dates UNLESS there is an approved leave recorded for that date
      if (dateObj > today && !isApprovedLeave) continue;

      if (!dayRecord && !isApprovedLeave) {
        lop++;
      } else {
        const status = (dayRecord?.status || '').toLowerCase();
        const remark = (dayRecord?.remark || '').toLowerCase();
        if (isApprovedLeave || status.includes('leave') || remark.includes('leave')) {
          leave++;
        } else if (
          status.includes('present') || 
          status.includes('extension') || 
          status.includes('active') || 
          remark.includes('extension')
        ) {
          present++;
        } else if (status.includes('half')) {
          halfDay++;
          present += 0.5;
          lop += 0.5;
        } else if (status.includes('absent')) {
          lop++;
        }
      }
    }

    return { present, leave, lop, halfDay };
  };

  const stats = calculateStats();

  const submitCorrection = async () => {
    if (!correctionReason.trim()) {
      setCorrectionErrorMsg("Please provide a reason for the correction.");
      return;
    }

    setIsSubmittingCorrection(true);
    setCorrectionErrorMsg("");
    setCorrectionSuccessMsg("");

    try {
      const dateStr = selectedAttendanceRecord.date;
      const requestedCheckIn = requestedCheckInTime ? `${dateStr}T${requestedCheckInTime}:00` : null;
      const requestedCheckOut = requestedCheckOutTime ? `${dateStr}T${requestedCheckOutTime}:00` : null;

      const payload = {
        attendance_id: selectedAttendanceRecord.id,
        date: dateStr,
        requested_check_in: requestedCheckIn,
        requested_check_out: requestedCheckOut,
        original_status: selectedAttendanceRecord.status,
        corrected_status: "Present",
        reason: correctionReason,
        employee_id: sessionStorage.getItem("employeeId") || ""
      };

      await requestAttendanceCorrection(payload);
      setCorrectionSuccessMsg("Correction request submitted to manager!");
      setTimeout(() => {
        setShowCorrectionModal(false);
        setCorrectionSuccessMsg("");
        setCorrectionReason("");
      }, 2000);
    } catch (error: any) {
      setCorrectionErrorMsg(error.response?.data?.detail || "Failed to submit correction request. Please try again.");
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Header role="Employee" title="Attendance Records" />

      <div style={{ marginTop: "35px", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Attendance History</h1>
        <p style={{ color: "var(--text-secondary)" }}>View and track your monthly attendance records</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Attendance Calendar" subtitle="Monthly visual overview">
            <div style={{ marginTop: '10px' }}>
              <AttendanceCalendar
                type="individual"
                viewDate={selectedDate}
                onViewDateChange={(date) => setSelectedDate(date)}
              />
            </div>
          </GlassCard>

          <GlassCard title="Attendance List" subtitle="Recent activity log">
            <div style={{ maxHeight: "450px", overflowY: "auto" }}>
              {history.filter(h => {
                const d = new Date(h.date);
                return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
              }).map((h, index) => (
                <div
                  key={index}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    marginBottom: "12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{h.date}</div>
                    <div style={{ fontSize: '12px', color: "rgba(255,255,255,0.5)" }}>Regular Login</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {(() => {
                      const statusLower = String(h.status || '').toLowerCase();
                      const remarkLower = String(h.remark || '').toLowerCase();
                      const isPresent = statusLower.includes('present') || 
                                        statusLower.includes('active') || 
                                        statusLower.includes('extension') || 
                                        remarkLower.includes('extension');
                      const isLeave = statusLower.includes('leave') || remarkLower.includes('leave');
                      
                      const bg = isPresent ? 'rgba(48, 209, 88, 0.1)' : isLeave ? 'rgba(191, 90, 242, 0.1)' : 'rgba(255, 159, 10, 0.1)';
                      const color = isPresent ? '#30d158' : isLeave ? '#bf5af2' : '#ff9f0a';
                      const border = `0.5px solid ${isPresent ? '#30d15833' : isLeave ? '#bf5af233' : '#ff9f0a33'}`;
                      
                      return (
                        <div style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: bg,
                          color: color,
                          border: border
                        }}>
                          {h.status}
                        </div>
                      );
                    })()}
                    <button 
                      className="apple-btn-secondary" 
                      style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '12px' }}
                      onClick={() => {
                        setSelectedAttendanceRecord(h);
                        setRequestedCheckInTime(h.login_time ? new Date(h.login_time).toTimeString().slice(0, 5) : "09:00");
                        setRequestedCheckOutTime(h.logout_time ? new Date(h.logout_time).toTimeString().slice(0, 5) : "18:00");
                        setShowCorrectionModal(true);
                      }}
                    >
                      Correct
                    </button>
                  </div>
                </div>
              ))}
              {history.filter(h => {
                const d = new Date(h.date);
                return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
              }).length === 0 && (
                  <p style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)' }}>No records for this month</p>
                )}
            </div>
          </GlassCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard title="Monthly Summary" subtitle="Attendance performance">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginTop: '10px' }}>
              <SummaryPill label="Present Days" value={stats.present} color="#30d158" />
              <SummaryPill label="Half Days" value={stats.halfDay} color="#ff9f0a" />
              <SummaryPill label="Leave Days" value={stats.leave} color="#bf5af2" />
              <SummaryPill label="LOP (Loss of Pay)" value={stats.lop} color="#ff453a" />
            </div>
          </GlassCard>

          <GlassCard title="Export Data" subtitle="Professional reports">
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Generate a detailed PDF or Excel report of your attendance records for the selection period.
            </p>
            <button className="apple-btn" style={{ background: 'var(--accent-blue)', color: '#fff', width: '100%', height: '48px' }} onClick={downloadAttendanceReport}>
              Download Report (CSV)
            </button>
          </GlassCard>
        </div>
      </div>

      {showCorrectionModal && selectedAttendanceRecord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div className="glass-card" style={{ width: '480px', padding: '30px' }}>
            <h3 className="card-title">Request Attendance Correction</h3>
            <p className="card-subtitle" style={{ marginBottom: '20px' }}>
              For date: {selectedAttendanceRecord.date} (Current: {selectedAttendanceRecord.status})
            </p>

            {correctionErrorMsg && (
              <div style={{ color: '#ff453a', padding: '10px', borderRadius: '8px', background: 'rgba(255, 69, 58, 0.1)', marginBottom: '15px', fontSize: '13px' }}>
                {correctionErrorMsg}
              </div>
            )}
            {correctionSuccessMsg && (
              <div style={{ color: '#30d158', padding: '10px', borderRadius: '8px', background: 'rgba(48, 209, 88, 0.1)', marginBottom: '15px', fontSize: '13px' }}>
                {correctionSuccessMsg}
              </div>
            )}

            <div className="form-group">
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Requested Check-in Time</label>
              <input 
                type="time" 
                className="glass-input" 
                value={requestedCheckInTime} 
                onChange={(e) => setRequestedCheckInTime(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Requested Check-out Time</label>
              <input 
                type="time" 
                className="glass-input" 
                value={requestedCheckOutTime} 
                onChange={(e) => setRequestedCheckOutTime(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Reason for Correction</label>
              <textarea 
                className="glass-input" 
                rows={3}
                style={{ resize: 'none' }}
                placeholder="Explain the correction request (e.g. biometric failure, outdoor duty)..."
                value={correctionReason} 
                onChange={(e) => setCorrectionReason(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '25px', justifyContent: 'flex-end' }}>
              <button 
                className="apple-btn-secondary" 
                onClick={() => {
                  setShowCorrectionModal(false);
                  setCorrectionErrorMsg("");
                  setCorrectionSuccessMsg("");
                }}
              >
                Cancel
              </button>
              <button 
                className="apple-btn" 
                style={{ background: 'var(--accent-gradient)' }} 
                onClick={submitCorrection}
                disabled={isSubmittingCorrection}
              >
                {isSubmittingCorrection ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SummaryPill = ({ label, value, color }: any) => (
  <div style={{
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    padding: '20px',
    borderRadius: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    <div style={{ fontSize: '28px', fontWeight: '800', color: color }}>{value}</div>
  </div>
);
