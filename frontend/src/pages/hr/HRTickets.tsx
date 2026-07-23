import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getHRTickets, refreshTickets, updateTicketStatus, getFileUrl } from "../../utils/storage";
import api from "../../api/apiClient";

export default function HRTickets() {
    const [tickets, setTickets] = useState<any[]>(getHRTickets());
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
        const syncTickets = () => setTickets(getHRTickets());
        window.addEventListener('storage', syncTickets);
        return () => window.removeEventListener('storage', syncTickets);
    }, []);

    const loadData = async () => {
        setLoading(true);
        await refreshTickets();
        setTickets(getHRTickets());
        setLoading(false);
    };

    const handleResolve = async (id: number) => {
        try {
            await updateTicketStatus(id, { status: "Resolved" });
            await loadData();
            alert("Ticket marked as resolved!");
        } catch (error) {
            alert("Failed to resolve ticket.");
        }
    };

    const handleSendReply = async () => {
        if (!selectedTicketId) return alert("Please select a query to reply to.");
        if (!replyText.trim()) return alert("Please write a message.");

        try {
            const userName = sessionStorage.getItem('userName') || 'HR Department';
            await api.post(`support-tickets/${selectedTicketId}/comments?comment_text=${encodeURIComponent(replyText)}`);
            await loadData();
            setReplyText("");
            alert("Reply sent successfully!");
        } catch (error) {
            alert("Failed to send reply.");
        }
    };

    return (
        <div className="dashboard-container">
            <Header role="HR Department" title="Employee Queries" />

            <div style={{ marginTop: "35px" }}>
                <h1 style={{ fontSize: "50px" }}>Employee Queries</h1>
                <div className="subtitle">Handle non-IT support requests and queries</div>
            </div>

            <div className="grid-3">
                <GlassCard title="Received Queries" subtitle="Pending questions from staff" style={{ gridColumn: "span 2" }}>
                    <div style={{ maxHeight: "550px", overflowY: "auto" }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {tickets.filter(t => t.status !== 'Resolved').map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => setSelectedTicketId(t.id)}
                                    style={{
                                        padding: "20px",
                                        borderRadius: "16px",
                                        background: selectedTicketId === t.id ? "rgba(0,122,255,0.1)" : "rgba(255,255,255,0.03)",
                                        border: selectedTicketId === t.id ? "1px solid var(--accent-blue)" : "1px solid rgba(255,255,255,0.08)",
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span style={{ fontWeight: '700', color: 'var(--accent-blue)' }}>TICKET #{t.id.toString().slice(-4)}</span>
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            background: t.status === 'Open' ? 'rgba(255,159,10,0.1)' : t.status === 'In Progress' ? 'rgba(10,132,255,0.1)' : 'rgba(48,209,88,0.1)',
                                            color: t.status === 'Open' ? '#ff9f0a' : t.status === 'In Progress' ? '#0a84ff' : '#30d158'
                                        }}>
                                            {t.status}
                                        </span>
                                    </div>

                                    <p style={{ fontSize: '15px', color: 'white', marginBottom: '8px' }}>{t.issue}</p>

                                    {t.attachment && (
                                        <div style={{ marginBottom: '10px' }}>
                                            <a href={getFileUrl(t.attachment)} download={`attachment_${t.id}`} style={{
                                                fontSize: '12px',
                                                color: 'var(--accent-blue)',
                                                background: 'rgba(0,122,255,0.1)',
                                                padding: '5px 10px',
                                                borderRadius: '8px',
                                                textDecoration: 'none',
                                                display: 'inline-block'
                                            }} onClick={(e) => e.stopPropagation()}>
                                                📎 Download Attachment
                                            </a>
                                        </div>
                                    )}

                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', gap: '15px' }}>
                                        <span>👤 {t.employee_name || t.author_name || t.author || 'Employee'} ({t.emp_id || t.employee_id || 'Staff'})</span>
                                        <span>📅 {new Date(t.created_at).toLocaleDateString()}</span>
                                    </div>

                                    {t.status !== 'Resolved' && (
                                        <button
                                            style={resolveBtnStyle}
                                            onClick={(e) => { e.stopPropagation(); handleResolve(t.id); }}
                                        >
                                            ✔ Mark as Resolved
                                        </button>
                                    )}
                                </div>
                            ))}
                            {tickets.filter(t => t.status !== 'Resolved').length === 0 && (
                                <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "40px" }}>No pending queries received yet.</p>
                            )}
                        </div>
                    </div>
                </GlassCard>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <GlassCard title="Reply Query" subtitle="Communicate with sender">
                        {selectedTicketId ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                                    Replying to #{tickets.find(t => t.id === selectedTicketId)?.id.toString().slice(-4)}
                                </p>
                                <textarea
                                    placeholder="Write your response here..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    style={replyInputStyle}
                                ></textarea>
                                <button style={sendBtnStyle} onClick={handleSendReply}>Send Response</button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                                Select a query from the list to reply
                            </div>
                        )}
                    </GlassCard>

                    <GlassCard title="Quick Stats" subtitle="Query analytics">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={statBoxStyle}>
                                <div style={statLabelStyle}>Total Queries</div>
                                <div style={statValueStyle}>{tickets.length}</div>
                            </div>
                            <div style={statBoxStyle}>
                                <div style={statLabelStyle}>Awaiting Response</div>
                                <div style={{ ...statValueStyle, color: '#ff9f0a' }}>{tickets.filter(t => t.status === 'Open').length}</div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

const resolveBtnStyle: React.CSSProperties = {
    marginTop: "15px",
    padding: "8px 16px",
    borderRadius: "10px",
    border: "none",
    background: "rgba(48,209,88,0.2)",
    color: "#30d158",
    fontWeight: "600",
    fontSize: '13px',
    cursor: "pointer",
};

const replyInputStyle: React.CSSProperties = {
    width: "100%",
    height: "120px",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(0,0,0,0.4)",
    color: "white",
    fontSize: "14px",
    resize: "none"
};

const sendBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "none",
    background: "var(--accent-blue)",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
};

const statBoxStyle: React.CSSProperties = {
    padding: '15px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)'
};

const statLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '1px'
};

const statValueStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    marginTop: '5px'
};
