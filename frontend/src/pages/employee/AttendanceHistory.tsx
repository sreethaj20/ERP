import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import AttendanceCalendar from "../../components/AttendanceCalendar";
import { getAttendance, getHolidays } from "../../utils/storage";
import { downloadCSV } from "../../utils/formatters";

export default function AttendanceHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const userId = sessionStorage.getItem("userId") || "";

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
    const refreshData = () => {
      const allAtt = getAttendance();
      const myAtt = allAtt.filter((a: any) => a.employee_id === userId);
      setHistory(myAtt);
      setHolidays(getHolidays());
    };

    refreshData();
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

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      if (dateObj > today) continue;

      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      // Check if it's a holiday
      if (holidays.some(h => h.date === dateStr)) continue;

      const dayRecord = history.find(h => h.date === dateStr);

      if (!dayRecord) {
        lop++;
      } else {
        const status = (dayRecord.status || '').toLowerCase();
        if (status.includes('present') || status.includes('extension')) {
          present++;
        } else if (status.includes('leave')) {
          leave++;
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
                  <div style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: h.status === 'Present' ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 159, 10, 0.1)',
                    color: h.status === 'Present' ? '#30d158' : '#ff9f0a',
                    border: `0.5px solid ${h.status === 'Present' ? '#30d15833' : '#ff9f0a33'}`
                  }}>
                    {h.status}
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
