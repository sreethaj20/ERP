import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaFileExcel, FaChartBar, FaUserGraduate, FaTruckLoading, FaShieldAlt, FaBriefcase, FaTicketAlt, FaHandshakeSlash } from "react-icons/fa";
import { downloadCSV } from "../../utils/formatters";
import {
  getEmployees,
  getAttendance,
  getOnboardingRequests, // Real backend-integrated getter
  getHROffboardingRequests,
  getLeaves,
  getData
} from "../../utils/storage";

export default function ManagerReports() {
  const [loading, setLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({
    employees: 0,
    onboarding: 0,
    offboarding: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [employeesData, onboardingData, offboardingData] = await Promise.all([
          getEmployees(),
          getOnboardingRequests(),
          getHROffboardingRequests()
        ]);
        setStats({
          employees: Array.isArray(employeesData) ? employeesData.length : 0,
          onboarding: Array.isArray(onboardingData) ? onboardingData.length : 0,
          offboarding: Array.isArray(offboardingData) ? offboardingData.length : 0
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    loadStats();
  }, []);

  const reports = [
    { title: "Master Roster", sub: "Global Employee DB", icon: <FaUserGraduate color="#0a84ff" />, type: "EMPLOYEE" },
    { title: "Time & Attendance", sub: "Shift Fulfillment", icon: <FaChartBar color="#30d158" />, type: "ATTENDANCE" },
    { title: "Lifecycle Pipeline", sub: "Onboarding Velocity", icon: <FaTruckLoading color="#bf5af2" />, type: "ONBOARDING" },
    { title: "Exit Intelligence", sub: "Attrition & Clearance", icon: <FaHandshakeSlash color="#ff453a" />, type: "OFFBOARDING" },
    { title: "IT Asset Ledger", sub: "Inventory Allocation", icon: <FaShieldAlt color="#64d2ff" />, type: "IT_ASSET" },
    { title: "Support Density", sub: "IT Ticket Velocity", icon: <FaTicketAlt color="#ff375f" />, type: "IT_TICKET" },
    { title: "Talent Acquisition", sub: "Recruiting Funnel", icon: <FaBriefcase color="#ffd60a" />, type: "RECRUITMENT" },
  ];

  const handleExport = async (type: string) => {
    setLoading(type);
    const date = new Date().toISOString().split('T')[0];
    let exportData: any[] = [];
    let filename = `Report_${type}_${date}.csv`;

    try {
      switch (type) {
        case 'EMPLOYEE':
          const employees = await getEmployees();
          exportData = (Array.isArray(employees) ? employees : []).map((e: any) => ({
            'ID': e.id,
            'Name': e.name,
            'Email': e.email,
            'Role': e.role,
            'Department': e.department,
            'Status': e.status,
            'Reporting To': e.reporting_to_id || 'N/A'
          }));
          filename = `Master_Roster_${date}.csv`;
          break;

        case 'ATTENDANCE':
          const attendance = await getAttendance();
          exportData = (Array.isArray(attendance) ? attendance : []).map((a: any) => ({
            'Date': a.date,
            'Emp ID': a.employee_id,
            'Name': a.employee_name,
            'Login': a.login_time || '—',
            'Logout': a.logout_time || '—',
            'Status': a.status,
            'Work Hours': a.work_hours || 0
          }));
          filename = `Attendance_Report_${date}.csv`;
          break;

        case 'ONBOARDING':
          const onboarding = await getOnboardingRequests();
          exportData = (Array.isArray(onboarding) ? onboarding : []).map((o: any) => ({
            'Req ID': o.request_id || o.id,
            'Employee': o.name || `${o.first_name || ''} ${o.last_name || ''}`.trim() || 'N/A',
            'Role': o.role_name || o.designation || 'N/A',
            'Dept': o.department || 'N/A',
            'Status': o.status,
            'Join Date': o.join_date || 'N/A'
          }));
          filename = `Onboarding_Pipeline_${date}.csv`;
          break;

        case 'OFFBOARDING':
          const offboarding = await getHROffboardingRequests();
          exportData = (Array.isArray(offboarding) ? offboarding : []).map((off: any) => ({
            'Offboard ID': off.offboard_id || off.id,
            'Emp ID': off.employee_id,
            'Exit Date': off.exit_date,
            'Reason': off.reason,
            'Notice Period': off.notice_period_days,
            'IT Clear': off.checklist_status?.it_clearance ? 'YES' : 'NO',
            'HR Clear': off.checklist_status?.hr_settlement ? 'YES' : 'NO',
            'Status': off.completed ? 'COMPLETED' : 'IN PROGRESS'
          }));
          filename = `Exit_Intelligence_${date}.csv`;
          break;

        case 'IT_ASSET':
          exportData = (getData('hrms_assets') || []).map((as: any) => ({
            'Asset Tag': as.tag,
            'Type': as.type,
            'Serial': as.serial,
            'Assigned To': as.assigned_to_id || 'IN STOCK',
            'Assigned Date': as.assigned_date || 'N/A',
            'Condition': as.condition
          }));
          filename = `IT_Asset_Ledger_${date}.csv`;
          break;

        case 'IT_TICKET':
          exportData = (getData('hrms_tickets') || []).map((t: any) => ({
            'TID': t.id,
            'Emp ID': t.emp_id,
            'Issue': t.issue,
            'Priority': t.priority || 'Low',
            'Status': t.status,
            'Created': t.created_at
          }));
          filename = `Support_Density_${date}.csv`;
          break;

        case 'RECRUITMENT':
          exportData = (getData('hrms_jobs') || []).map((j: any) => ({
            'Job ID': j.id,
            'Title': j.title,
            'Dept': j.dept,
            'Applicants': j.applicants || 0,
            'Status': 'ACTIVE'
          }));
          filename = `Talent_Acquisition_${date}.csv`;
          break;

        default:
          alert("Exporter for this category is under maintenance.");
          return;
      }

      if (exportData.length === 0) {
        alert("No records found for this report category.");
      } else {
        downloadCSV(exportData, filename);
      }
    } catch (err) {
      console.error("Export Error:", err);
      alert("Failed to generate report. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="dashboard-container">
      <Header role="Manager" title="Strategic Insights" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Strategic Report Center</h1>
        <p className="subtitle">Execute cross-departmental data extraction and compliance reporting</p>
      </div>

      <div className="grid-3" style={{ marginBottom: '30px' }}>
        <GlassCard className="glass-morphism">
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Active Workforce</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent-blue)' }}>{stats.employees}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>Total employees onboarded</div>
        </GlassCard>
        <GlassCard className="glass-morphism">
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Pipeline Health</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#30d158' }}>{stats.onboarding}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>Active onboarding tracks</div>
        </GlassCard>
        <GlassCard className="glass-morphism">
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Exit Activity</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ff9f0a' }}>{stats.offboarding}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>Cases in offboarding lifecycle</div>
        </GlassCard>
      </div>

      <div className="grid-4">
        {reports.map((report, i) => (
          <GlassCard key={i} style={{ padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'transform 0.2s', position: 'relative' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
              {React.cloneElement(report.icon as React.ReactElement, { size: 24 })}
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{report.title}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>{report.sub}</div>
            <button
              onClick={() => handleExport(report.type)}
              className="apple-btn"
              disabled={loading === report.type}
              style={{ width: '100%', gap: '10px', fontSize: '12px', opacity: loading === report.type ? 0.6 : 1 }}
            >
              <FaFileExcel /> {loading === report.type ? "Extracting..." : "Export XLSX"}
            </button>
          </GlassCard>
        ))}

        <GlassCard style={{ background: 'rgba(10, 132, 255, 0.05)', border: '1px dashed #0a84ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a84ff', cursor: 'pointer' }}>+ Request Custom Report</div>
        </GlassCard>
      </div>
    </div>
  );
}

