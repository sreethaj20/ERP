import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getTickets, resolveTicket, updateTicketStatus } from "../../services/itService";
import api from "../../api/apiClient";

export default function SupportTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTickets();
      setTickets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (id: number) => {
    try {
      await resolveTicket(id, "Handled by IT Department Support Hub");
      alert("Ticket marked as resolved!");
      loadData();
    } catch (err) {
      alert("Action failed.");
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicketId) return alert("Please select a ticket to reply to.");
    if (!replyText.trim()) return alert("Please write a message.");

    try {
      await api.post(`it/tickets/${selectedTicketId}/comments`, { comment: replyText });
      alert("Reply sent successfully!");
      setReplyText("");
      loadData();
    } catch (err) {
      alert("Failed to send reply.");
    }
  };

  return (
    <div className="dashboard-container">
      <Header role="IT Department" title="Support Tickets" />

      <div style={{ marginTop: "35px" }}>
        <h1 style={{ fontSize: "50px" }}>Support Tickets</h1>
        <div className="subtitle">Handle employee IT support tickets</div>
      </div>

      <div className="grid-3">
        <GlassCard title="Ticket List" subtitle="Employee issue requests">
          <div style={{ maxHeight: "450px", overflowY: "auto" }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tickets.filter(t => t.status !== 'Resolved').map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    background: selectedTicketId === t.id ? "rgba(0, 191, 255, 0.15)" : "rgba(255,255,255,0.05)",
                    border: selectedTicketId === t.id ? "1px solid #00BFFF" : "1px solid rgba(255,255,255,0.08)",
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <b>Ticket #{t.id.toString().slice(-6)}</b>
                  </p>

                  <p style={{ margin: 0, color: "rgba(255,255,255,0.6)" }}>
                    Employee: {t.employee_name || t.emp_id}
                  </p>

                  <p style={{ margin: "5px 0", color: "rgba(255,255,255,0.6)" }}>
                    Issue: {t.issue}
                  </p>

                  {(t.attachment_url || t.attachment) && (
                    <div style={{ margin: "10px 0" }}>
                      <a href={t.attachment_url || t.attachment} download={`attachment_${t.id}`} style={{
                        fontSize: '11px',
                        color: '#00BFFF',
                        textDecoration: 'none',
                        background: 'rgba(0,191,255,0.1)',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }} onClick={(e) => e.stopPropagation()}>📎 View Attachment</a>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span style={{ color: t.status === 'Open' ? '#ff9f0a' : t.status === 'In Progress' ? '#0a84ff' : '#30d158', fontSize: '13px' }}>● {t.status}</span>
                    {t.status !== 'Resolved' && (
                      <button
                        style={smallBtnStyle}
                        onClick={(e) => { e.stopPropagation(); handleResolve(t.id); }}
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {tickets.filter(t => t.status !== 'Resolved').length === 0 && (
                <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "20px" }}>No pending support tickets found.</p>
              )}
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Ticket Communication" subtitle="Message reply system">
          {selectedTicketId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ flex: 1, maxHeight: '250px', overflowY: 'auto', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                {tickets.find(t => t.id === selectedTicketId)?.comments?.map((c: any) => (
                  <div key={c.id} style={{ marginBottom: '10px', padding: '10px', borderRadius: '10px', background: c.author_name === 'IT Support' ? 'rgba(0,191,255,0.1)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 'bold', color: '#00BFFF' }}>{c.author_name}</span>
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '12px' }}>{c.comment}</div>
                  </div>
                ))}
                {(tickets.find(t => t.id === selectedTicketId)?.comments?.length === 0) && (
                  <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontSize: '12px', marginTop: '20px' }}>No previous communication logs.</p>
                )}
              </div>

              <textarea
                placeholder="Write message reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{...textAreaStyle, marginBottom: 0, height: '120px'}}
              ></textarea>
              <button style={{...btnStyle, flexShrink: 0}} onClick={handleSendReply}>Send Reply</button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
              Select a ticket to communicate
            </div>
          )}
        </GlassCard>

        <GlassCard title="Tickets Report" subtitle="Download support report">
          <button style={btnStyle}>Download Excel</button>
        </GlassCard>
      </div>
    </div>
  );
}

const smallBtnStyle: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: "8px",
  border: "none",
  background: "#00BFFF",
  color: "white",
  fontSize: '11px',
  fontWeight: "600",
  cursor: "pointer",
};

const textAreaStyle: React.CSSProperties = {
  width: "100%",
  height: "160px",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.4)",
  color: "white",
  marginBottom: '10px'
};

const btnStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "none",
  background: "#00BFFF",
  color: "white",
  fontWeight: "600",
  cursor: "pointer",
};
