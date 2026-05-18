import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { requestEarlyLogin, getMyEarlyLoginRequests, getDashboard } from "../../services/employeeService";
import { FaClock, FaPaperPlane, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaCalendarDay, FaClock as FaClockIcon } from "react-icons/fa";

export default function EarlyLoginRequest() {
  const [reason, setReason] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [myEmployee, setMyEmployee] = useState<any>(null);

  const loadData = async () => {
    try {
      const dash = await getDashboard();
      setMyEmployee(dash.employee_profile);
      
      const reqs = await getMyEarlyLoginRequests();
      setRequests(reqs);
    } catch (e) {
      console.error("Failed to load early login data:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async () => {
    if (!reason.trim() || !requestedDate || !requestedTime || !myEmployee) {
      setStatus({ type: 'error', message: 'Please fill all fields: date, time, reason.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employee_id: myEmployee.employee_id,
        date: requestedDate,
        requested_start_time: requestedTime,
        reason: reason.trim()
      };

      await requestEarlyLogin(payload);
      
      await loadData();
      
      setStatus({ type: 'success', message: 'Early login request submitted to your Team Leader!' });
      setReason('');
      setRequestedDate('');
      setRequestedTime('');
      
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to submit request. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return { bg: 'rgba(48,209,88,0.15)', color: '#30d158' };
      case 'rejected': return { bg: 'rgba(255,69,58,0.15)', color: '#ff453a' };
      default: return { bg: 'rgba(255,159,10,0.15)', color: '#ff9f0a' };
    }
  };

  return (
    <div className="dashboard-container">
      <Header role="Employee" title="Early Shift Login Request" />

      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700" }}>Request Early Login</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Submit a request to your Team Leader for early shift start. Approved requests will enable login at exact approved time.
        </p>
      </div>

      {/* Request Form */}
      <GlassCard title="Submit New Request" subtitle="Select date, time and reason">
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {myEmployee ? (
            <div style={{ padding: '14px', background: 'rgba(10,132,255,0.08)', borderRadius: '12px', border: '1px solid rgba(10,132,255,0.2)' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>To: {myEmployee.reporting_to || 'Team Leader'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                From: {myEmployee.name}
              </div>
            </div>
          ) : (
            <div style={{ padding: '14px', background: 'rgba(255,159,10,0.08)', borderRadius: '12px', border: '1px solid rgba(255,159,10,0.2)', textAlign: 'center' }}>
              <FaExclamationTriangle color="#ff9f0a" size={20} style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '12px', color: '#ff9f0a' }}>Profile not configured. Contact HR.</div>
            </div>
          )}

          {/* Date Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>Requested Date</label>
            <input
              type="date"
              className="glass-input"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              disabled={!myEmployee}
            />
          </div>

          {/* Time Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>Requested Login Time</label>
            <input
              type="time"
              className="glass-input"
              value={requestedTime}
              onChange={(e) => setRequestedTime(e.target.value)}
              disabled={!myEmployee}
            />
          </div>

          {/* Reason */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief explanation (meeting, family, etc.)"
              style={{
                height: '90px', 
                resize: 'vertical',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px', 
                padding: '12px',
                color: 'var(--text-primary)', 
                fontSize: '14px',
                outline: 'none'
              }}
              disabled={!myEmployee}
            />
          </div>

          <button 
            className="apple-btn" 
            onClick={handleSubmit}
            disabled={!myEmployee || loading || !reason.trim() || !requestedDate || !requestedTime}
            style={{ 
              background: myEmployee && reason.trim() && requestedDate && requestedTime ? '#30d158' : 'rgba(48,209,88,0.3)',
              cursor: myEmployee && reason.trim() && requestedDate && requestedTime ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Submitting...
              </span>
            ) : (
              <>
                <FaPaperPlane />
                Submit Request
              </>
            )}
          </button>

          {status && (
            <div style={{
              padding: '12px 16px', 
              borderRadius: '10px',
              background: status.type === 'success' ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)',
              border: `1px solid ${status.type === 'success' ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.3)'}`,
              color: status.type === 'success' ? '#30d158' : '#ff453a',
              fontWeight: '600', 
              fontSize: '13px'
            }}>
              {status.type === 'success' ? <FaCheckCircle style={{ marginRight: '8px' }} /> : <FaTimesCircle style={{ marginRight: '8px' }} />}
              {status.message}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Recent Requests Table */}
      <div style={{ marginTop: '30px' }}>
        <GlassCard title="Recent Requests" subtitle={`${requests.length} requests`}>
          <div style={{ marginTop: '16px' }}>
            {requests.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <FaClock size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <div style={{ fontSize: '15px', marginBottom: '4px' }}>No requests submitted</div>
                <div style={{ fontSize: '12px' }}>History appears here after submission</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                      <th style={{ padding: '12px 0', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px 0', textAlign: 'left' }}>Time</th>
                      <th style={{ padding: '12px 0', textAlign: 'left' }}>Reason</th>
                      <th style={{ padding: '12px 0', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req, idx) => {
                      const style = getStatusColor(req.status);
                      return (
                        <tr key={req.id || idx} style={{ borderBottom: '1px dotted var(--border-light)' }}>
                          <td style={{ padding: '12px 0 12px 0', fontWeight: '600' }}>{req.date || '—'}</td>
                          <td style={{ padding: '12px 8px 12px 0', fontWeight: '500' }}>{req.requested_start_time || '—'}</td>
                          <td style={{ padding: '12px 16px 12px 0', fontSize: '13px' }}>{req.reason?.substring(0, 60)}{req.reason?.length > 60 ? '...' : ''}</td>
                          <td style={{ padding: '12px 0 12px 16px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
                              background: style.bg, color: style.color
                            }}>
                              {req.status?.toUpperCase() || 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}



