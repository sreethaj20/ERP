import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getTeamPerformance, submitTeamPerformance, getTeamMembers } from "../../services/teamleaderService";
import { FaHistory, FaDownload } from "react-icons/fa";
import { downloadCSV } from "../../utils/formatters";

export default function PerformanceFeedback() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  const [selectedEmp, setSelectedEmp] = useState("");
  const [score, setScore] = useState("");
  const [tlFeedback, setTlFeedback] = useState("");
  const [employeeFeedback, setEmployeeFeedback] = useState("");
  const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
        const [mList, rList] = await Promise.all([
            getTeamMembers(),
            getTeamPerformance()
        ]);
        setTeamMembers(mList || []);
        setReviews(rList || []);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !score || !tlFeedback) {
      setMsg("Please provide at least a score and TL feedback");
      return;
    }

    setSubmitting(true);
    const emp = teamMembers.find(m => (m.employee_id || m.id) === selectedEmp);

    try {
        await submitTeamPerformance({
            employee_id: selectedEmp,
            employee_name: emp ? `${emp.first_name} ${emp.last_name || ''}` : "Unknown",
            score: parseFloat(score),
            tl_feedback: tlFeedback,
            employee_self_input: employeeFeedback,
            review_month: month,
            review_year: year.toString()
        });
        
        setSubmitting(false);
        setSelectedEmp("");
        setScore("");
        setTlFeedback("");
        setEmployeeFeedback("");
        setMsg("Feedback submitted successfully!");
        loadData();
        setTimeout(() => setMsg(""), 3000);
    } catch (err) {
        setSubmitting(false);
        setMsg("Submission failed. Check your input.");
    }
  };

  const handleDownload = () => {
    const data = reviews.map(r => ({
      "Month": r.review_month,
      "Year": r.review_year,
      "Employee ID": r.employee_id,
      "Employee Name": r.employee_name,
      "Score": r.score,
      "TL Feedback": r.tl_feedback,
      "Employee Input": r.employee_self_input
    }));
    downloadCSV(data, `Performance_Reviews_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="dashboard-container">
      <Header role="Team Leader" title="Performance Tracking" />

      <div style={{ marginBottom: "32px", marginTop: "10px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "4px" }}>Performance Feedback</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>Submit periodic reviews and growth feedback for your unit members</p>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: "1.2fr 1.8fr", gap: "24px" }}>
        <GlassCard title="Submit Review" subtitle="Evaluate team member performance">
          <form onSubmit={handleSubmit} style={{ marginTop: "15px", display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Month</label>
                <select style={inputStyle} value={month} onChange={(e) => setMonth(e.target.value)}>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Year</label>
                <select style={inputStyle} value={year} onChange={(e) => setYear(e.target.value)}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Employee ID</label>
                <input
                  type="text"
                  placeholder="EX: E001"
                  style={inputStyle}
                  value={selectedEmp}
                  onChange={(e) => setSelectedEmp(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label style={labelStyle}>Employee Name</label>
                <input
                  type="text"
                  readOnly
                  placeholder="Name will appear here..."
                  style={{ ...inputStyle, background: 'rgba(255,255,255,0.02)', color: 'var(--text-tertiary)' }}
                  value={teamMembers.find(m => String(m.employee_id) === String(selectedEmp) || String(m.id) === String(selectedEmp))?.name || ""}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Performance Score (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="Ex: 8.5"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Feedback to Employee</label>
              <textarea
                placeholder="Constructive feedback for the employee's growth..."
                value={tlFeedback}
                onChange={(e) => setTlFeedback(e.target.value)}
                style={{ ...inputStyle, height: "100px", resize: "none" }}
              ></textarea>
            </div>

            <div>
              <label style={labelStyle}>Employee's Input (Optional)</label>
              <textarea
                placeholder="Notes from the employee or self-evaluation points..."
                value={employeeFeedback}
                onChange={(e) => setEmployeeFeedback(e.target.value)}
                style={{ ...inputStyle, height: "100px", resize: "none" }}
              ></textarea>
            </div>

            {msg && (
              <div style={{
                padding: "10px",
                borderRadius: "8px",
                background: msg.includes("successfully") ? "rgba(48,209,88,0.1)" : "rgba(255,69,58,0.1)",
                color: msg.includes("successfully") ? "#30d158" : "#ff453a",
                fontSize: "13px",
                marginBottom: "15px",
                textAlign: "center"
              }}>
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...btnStyle,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
                background: "var(--accent-blue)"
              }}
            >
              {submitting ? "Submitting..." : "Post Review"}
            </button>
          </form>
        </GlassCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard
            title="Periodic History"
            subtitle="Excel-style performance log"
            headerAction={
              reviews.length > 0 && (
                <button
                  onClick={handleDownload}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}
                >
                  <FaDownload size={12} /> Export Excel
                </button>
              )
            }
          >
            <div style={{ marginTop: "15px", overflowX: "auto" }}>
              {reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                  <FaHistory size={40} style={{ opacity: 0.2, marginBottom: "12px" }} />
                  <p>No performance reviews submitted yet.</p>
                </div>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Month/Year</th>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>Employee Name</th>
                      <th style={thStyle}>Score</th>
                      <th style={thStyle}>TL Feedback</th>
                      <th style={thStyle}>Emp Input</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((r: any) => (
                      <tr key={r.id} style={trStyle}>
                        <td style={tdStyle}>{r.review_month} {r.review_year}</td>
                        <td style={tdStyle}><span style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>#{r.employee_id}</span></td>
                        <td style={tdStyle}>{r.employee_name}</td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: r.score >= 8 ? 'rgba(48,209,88,0.1)' : r.score >= 5 ? 'rgba(255,159,10,0.1)' : 'rgba(255,69,58,0.1)',
                            color: r.score >= 8 ? '#30d158' : r.score >= 5 ? '#ff9f0a' : '#ff453a',
                            fontWeight: '700'
                          }}>
                            {r.score}/10
                          </span>
                        </td>
                        <td style={{ ...tdStyle, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.tl_feedback}>
                          {r.tl_feedback}
                        </td>
                        <td style={{ ...tdStyle, maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.employee_self_input}>
                          {r.employee_self_input || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.4)",
  color: "white",
  fontSize: "14px",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "var(--text-tertiary)",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "1px",
  fontWeight: "600"
};

const btnStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  color: "white",
  fontWeight: "700",
  fontSize: "14px",
  transition: "all 0.2s"
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '10px',
  fontSize: '13px'
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  color: 'var(--text-tertiary)',
  borderBottom: '1px solid var(--border-light)',
  textTransform: 'uppercase',
  fontSize: '11px',
  letterSpacing: '1px'
};

const tdStyle: React.CSSProperties = {
  padding: '16px',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-light)'
};

const trStyle: React.CSSProperties = {
  transition: 'all 0.2s ease',
  background: 'rgba(255,255,255,0.01)'
};

