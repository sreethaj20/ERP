import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaHeadset, FaUserShield, FaCloudUploadAlt, FaPaperPlane } from "react-icons/fa";
import { getSupportTickets, raiseTicket } from "../../services/employeeService";

export default function SupportTicket() {
  const [issue, setIssue] = useState("");
  const [recipient, setRecipient] = useState("IT"); // Default to IT
  const [attachment, setAttachment] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = sessionStorage.getItem("userId") || "";
  const employeeId = sessionStorage.getItem("employeeId") || "";
  const userName = sessionStorage.getItem("userName") || "Unknown";
  const userRole = sessionStorage.getItem("userRole") || "Employee";

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await getSupportTickets();
      setMyTickets(data || []);
    } catch (e) {
      console.error("Failed to fetch tickets:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) { // 2MB limit
        alert("File too large. Max 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setAttachment(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim()) return alert("Please describe your issue.");

    try {
      const ticketData = {
        employee_id: employeeId || userId,
        author_name: userName,
        issue: issue,
        description: issue, // Aligning with both legacy and new backend
        department: recipient,
        category: recipient,
        attachments: attachment ? [attachment] : [],
        status: "Open",
        priority: "medium"
      };

      await raiseTicket(ticketData);
      setIssue("");
      setAttachment(null);
      alert(`Ticket raised successfully to ${recipient} Department!`);
      fetchTickets();
    } catch (err) {
      console.error(err);
      alert("Failed to raise ticket via API.");
    }
  };

  return (
    <div className="dashboard-container">
      <Header role={userRole.charAt(0).toUpperCase() + userRole.slice(1)} title="Support & Queries" />

      <div style={{ marginBottom: "32px", marginTop: "10px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "4px" }}>Support Ticket</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>Raise IT or HR query for assistance</p>
      </div>

      <div className="grid-3" style={{ alignItems: 'stretch' }}>
        {/* Create Ticket Card */}
        <GlassCard title="Create Ticket" subtitle="Submit your query" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', marginTop: '10px' }}>
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Department</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <div
                  onClick={() => setRecipient("IT")}
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: '16px',
                    background: recipient === "IT" ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${recipient === "IT" ? 'var(--accent-blue)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    boxShadow: recipient === "IT" ? '0 0 20px rgba(14, 165, 233, 0.1)' : 'none'
                  }}
                >
                  <FaHeadset size={20} color={recipient === "IT" ? 'var(--accent-blue)' : 'var(--text-tertiary)'} style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '11px', fontWeight: '800', color: recipient === "IT" ? '#fff' : 'var(--text-secondary)', letterSpacing: '1px' }}>IT DEPT</div>
                </div>
                <div
                  onClick={() => setRecipient("HR")}
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: '16px',
                    background: recipient === "HR" ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${recipient === "HR" ? 'var(--accent-purple)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    boxShadow: recipient === "HR" ? '0 0 20px rgba(168, 85, 247, 0.1)' : 'none'
                  }}
                >
                  <FaUserShield size={20} color={recipient === "HR" ? 'var(--accent-purple)' : 'var(--text-tertiary)'} style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '11px', fontWeight: '800', color: recipient === "HR" ? '#fff' : 'var(--text-secondary)', letterSpacing: '1px' }}>HR DEPT</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Issue Description</label>
              <textarea
                placeholder="Describe your issue or query..."
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="glass-input"
                style={{ height: "120px", resize: 'none', background: 'rgba(0,0,0,0.2)' }}
              ></textarea>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Attachment (Optional)</label>
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                borderRadius: '16px',
                border: '2px dashed rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.01)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginTop: '4px'
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                <FaCloudUploadAlt size={28} color={attachment ? '#30d158' : "var(--text-tertiary)"} style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '13px', color: attachment ? '#30d158' : 'var(--text-secondary)', fontWeight: '500' }}>
                  {attachment ? "File attached successfully" : "Click to browse or drop file"}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Max 2MB. Support Image/PDF</span>
                <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
              <button
                type="submit"
                className="apple-btn"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                <span>Raise Ticket</span>
                <FaPaperPlane size={14} style={{ opacity: 0.8 }} />
              </button>
            </div>
          </form>
        </GlassCard>

        {/* Active Tickets Card */}
        <GlassCard title="My Active Tickets" subtitle="Track progress" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '15px' }}>
            {myTickets.filter(t => t.status === 'Open').length === 0 ? (
              <div style={emptyStateStyle}>
                <p style={{ color: "var(--text-tertiary)", fontSize: '14px' }}>No active tickets.</p>
              </div>
            ) : (
              <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                {myTickets.filter(t => t.status === 'Open').map(t => (
                  <div key={t.id} style={ticketItemStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-blue)' }}>#{t.id.toString().slice(-4)}</span>
                      <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{t.category || t.type}</span>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', lineHeight: '1.4', color: 'var(--text-primary)' }}>{t.issue || t.description}</p>
                    {t.attachment && (
                      <a href={t.attachment} download={`attachment_${t.id}`} style={{ fontSize: '11px', color: 'var(--accent-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>📎 Attachment</a>
                    )}
                    {t.comments && t.comments.length > 0 && (
                      <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: `3px solid ${(t.category || t.type) === 'IT' ? '#0ea5e9' : '#6366f1'}` }}>
                        <p style={{ fontSize: '10px', color: (t.category || t.type) === 'IT' ? '#0ea5e9' : '#6366f1', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase' }}>Latest Reply:</p>
                        <p style={{ fontSize: '12px', color: '#fff', margin: 0 }}>{t.comments[t.comments.length - 1].comment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Ticket History Card */}
        <GlassCard title="Ticket History" subtitle="Resolved queries" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '15px' }}>
            {myTickets.filter(t => t.status === 'Resolved').length === 0 ? (
              <div style={emptyStateStyle}>
                <p style={{ color: "var(--text-tertiary)", fontSize: '14px' }}>No resolved tickets.</p>
              </div>
            ) : (
              <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                {myTickets.filter(t => t.status === 'Resolved').map(t => (
                  <div key={t.id} style={{ ...ticketItemStyle, borderColor: 'rgba(48,209,88,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)' }}>#{t.id.toString().slice(-4)}</span>
                      <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(48,209,88,0.12)', color: '#30d158', padding: '2px 8px', borderRadius: '4px' }}>RESOLVED</span>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>{t.issue || t.description}</p>
                    {t.comments && t.comments.length > 0 && (
                      <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(48,209,88,0.04)', borderRadius: '10px', borderLeft: '3px solid #30d158' }}>
                        <p style={{ fontSize: '10px', color: '#30d158', marginBottom: '4px', fontWeight: '700' }}>{(t.category || t.type)} REPLY:</p>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>{t.comments[t.comments.length - 1].comment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-secondary)',
  marginBottom: '8px',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const selectStyle: React.CSSProperties = {
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: '16px'
};

const ticketItemStyle: React.CSSProperties = {
  padding: '16px',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '16px',
  marginBottom: '12px',
  border: '1px solid var(--border-light)',
  transition: 'all 0.3s ease'
};

const emptyStateStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
  opacity: 0.8
};
