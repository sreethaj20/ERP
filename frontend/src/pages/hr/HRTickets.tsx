import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getHRTickets, refreshTickets, updateTicketStatus, getFileUrl } from "../../utils/storage";
import api from "../../api/apiClient";
import { FaHistory, FaTicketAlt, FaFilter, FaCheckCircle, FaClock, FaSearch, FaRedo } from "react-icons/fa";

const MONTHS = [
    { value: "all", label: "All Months" },
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" },
];

export default function HRTickets() {
    const [tickets, setTickets] = useState<any[]>(getHRTickets());
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Filters & Navigation state
    const [activeTab, setActiveTab] = useState<"active" | "history" | "all">("active");
    const [selectedMonth, setSelectedMonth] = useState<string>("all");
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

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
            await api.post(`support-tickets/${selectedTicketId}/comments?comment_text=${encodeURIComponent(replyText)}`);
            await loadData();
            setReplyText("");
            alert("Reply sent successfully!");
        } catch (error) {
            alert("Failed to send reply.");
        }
    };

    const parseTicketDate = (dateStr: any) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    };

    // Calculate unique years from tickets
    const availableYears = Array.from(
        new Set([
            new Date().getFullYear(),
            ...tickets.map(t => {
                const d = parseTicketDate(t.created_at || t.date || t.created_date);
                return d ? d.getFullYear() : null;
            }).filter((y): y is number => y !== null)
        ])
    ).sort((a, b) => b - a);

    // Filter tickets according to active tab, month, year, and search query
    const filteredTickets = tickets.filter(t => {
        // Tab Filter
        if (activeTab === "active" && t.status === "Resolved") return false;
        if (activeTab === "history" && t.status !== "Resolved") return false;

        // Date Filters
        const ticketDate = parseTicketDate(t.created_at || t.date || t.created_date);
        if (ticketDate) {
            if (selectedMonth !== "all" && ticketDate.getMonth() !== parseInt(selectedMonth)) {
                return false;
            }
            if (selectedYear !== "all" && ticketDate.getFullYear() !== parseInt(selectedYear)) {
                return false;
            }
        } else if (selectedMonth !== "all" || selectedYear !== "all") {
            return false;
        }

        // Search Query Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const ticketId = (t.id || '').toString().toLowerCase();
            const empName = (t.employee_name || t.author_name || t.author || '').toLowerCase();
            const empId = (t.emp_id || t.employee_id || '').toLowerCase();
            const issue = (t.issue || t.subject || t.description || '').toLowerCase();

            if (!ticketId.includes(query) && !empName.includes(query) && !empId.includes(query) && !issue.includes(query)) {
                return false;
            }
        }

        return true;
    });

    const activeCount = tickets.filter(t => t.status !== "Resolved").length;
    const historyCount = tickets.filter(t => t.status === "Resolved").length;

    const resetFilters = () => {
        setSelectedMonth("all");
        setSelectedYear("all");
        setSearchQuery("");
    };

    const isFiltered = selectedMonth !== "all" || selectedYear !== "all" || searchQuery !== "";

    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    return (
        <div className="dashboard-container">
            <Header role="HR Department" title="Employee Queries" />

            <div style={{ marginTop: "35px" }}>
                <h1 style={{ fontSize: "50px" }}>Employee Queries</h1>
                <div className="subtitle">Handle non-IT support requests, view query history, and reply to staff</div>
            </div>

            {/* Quick Stats Banner */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginTop: "25px", marginBottom: "25px" }}>
                <div style={statBoxStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={statLabelStyle}>Total Queries</span>
                        <FaTicketAlt style={{ color: 'var(--accent-blue)', opacity: 0.8 }} />
                    </div>
                    <div style={statValueStyle}>{tickets.length}</div>
                </div>
                <div style={statBoxStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={statLabelStyle}>Pending / Active</span>
                        <FaClock style={{ color: '#ff9f0a', opacity: 0.8 }} />
                    </div>
                    <div style={{ ...statValueStyle, color: '#ff9f0a' }}>{activeCount}</div>
                </div>
                <div style={statBoxStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={statLabelStyle}>Resolved (History)</span>
                        <FaCheckCircle style={{ color: '#30d158', opacity: 0.8 }} />
                    </div>
                    <div style={{ ...statValueStyle, color: '#30d158' }}>{historyCount}</div>
                </div>
            </div>

            <div className="grid-3">
                <GlassCard 
                    title={activeTab === "history" ? "Query History" : activeTab === "active" ? "Received Queries" : "All Employee Queries"} 
                    subtitle={activeTab === "history" ? "Archived and resolved support tickets" : "Manage and respond to employee tickets"} 
                    style={{ gridColumn: "span 2" }}
                >
                    {/* View Tabs & Filters Bar */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px", marginBottom: "20px" }}>
                        {/* Tabs */}
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
                            <button
                                onClick={() => setActiveTab("active")}
                                style={{
                                    ...tabButtonStyle,
                                    background: activeTab === "active" ? "var(--accent-blue)" : "rgba(255,255,255,0.05)",
                                    color: activeTab === "active" ? "#fff" : "rgba(255,255,255,0.7)",
                                }}
                            >
                                <FaClock style={{ marginRight: "6px" }} /> Active Queries ({activeCount})
                            </button>
                            <button
                                onClick={() => setActiveTab("history")}
                                style={{
                                    ...tabButtonStyle,
                                    background: activeTab === "history" ? "var(--accent-blue)" : "rgba(255,255,255,0.05)",
                                    color: activeTab === "history" ? "#fff" : "rgba(255,255,255,0.7)",
                                }}
                            >
                                <FaHistory style={{ marginRight: "6px" }} /> Query History ({historyCount})
                            </button>
                            <button
                                onClick={() => setActiveTab("all")}
                                style={{
                                    ...tabButtonStyle,
                                    background: activeTab === "all" ? "var(--accent-blue)" : "rgba(255,255,255,0.05)",
                                    color: activeTab === "all" ? "#fff" : "rgba(255,255,255,0.7)",
                                }}
                            >
                                <FaTicketAlt style={{ marginRight: "6px" }} /> All ({tickets.length})
                            </button>
                        </div>

                        {/* Month, Year & Search Filter controls */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <FaFilter style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }} />
                                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>Month:</span>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        style={selectStyle}
                                    >
                                        {MONTHS.map(m => (
                                            <option key={m.value} value={m.value} style={{ background: "#1c1c1e", color: "#fff" }}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>Year:</span>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        style={selectStyle}
                                    >
                                        <option value="all" style={{ background: "#1c1c1e", color: "#fff" }}>All Years</option>
                                        {availableYears.map(year => (
                                            <option key={year} value={year.toString()} style={{ background: "#1c1c1e", color: "#fff" }}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1", minWidth: "180px", maxWidth: "280px" }}>
                                <div style={{ position: "relative", width: "100%" }}>
                                    <FaSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "rgba(255,255,255,0.4)" }} />
                                    <input
                                        type="text"
                                        placeholder="Search query or staff..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={searchInputStyle}
                                    />
                                </div>

                                {isFiltered && (
                                    <button onClick={resetFilters} style={resetBtnStyle} title="Reset filters">
                                        <FaRedo style={{ fontSize: "11px" }} /> Reset
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Query List */}
                    <div style={{ maxHeight: "550px", overflowY: "auto" }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {filteredTickets.map((t) => {
                                const isSelected = selectedTicketId === t.id;
                                const isResolved = t.status === 'Resolved';
                                const createdDate = parseTicketDate(t.created_at || t.date || t.created_date);

                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => setSelectedTicketId(t.id)}
                                        style={{
                                            padding: "20px",
                                            borderRadius: "16px",
                                            background: isSelected ? "rgba(0,122,255,0.12)" : "rgba(255,255,255,0.03)",
                                            border: isSelected ? "1px solid var(--accent-blue)" : "1px solid rgba(255,255,255,0.08)",
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <FaTicketAlt style={{ fontSize: '13px' }} /> TICKET #{t.id.toString().slice(-4)}
                                            </span>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                background: isResolved ? 'rgba(48,209,88,0.15)' : t.status === 'In Progress' ? 'rgba(10,132,255,0.15)' : 'rgba(255,159,10,0.15)',
                                                color: isResolved ? '#30d158' : t.status === 'In Progress' ? '#0a84ff' : '#ff9f0a',
                                                border: `1px solid ${isResolved ? 'rgba(48,209,88,0.3)' : t.status === 'In Progress' ? 'rgba(10,132,255,0.3)' : 'rgba(255,159,10,0.3)'}`
                                            }}>
                                                {isResolved ? '✔ Resolved (History)' : t.status}
                                            </span>
                                        </div>

                                        <p style={{ fontSize: '15px', color: 'white', marginBottom: '8px', lineHeight: '1.4' }}>{t.issue || t.subject || t.description}</p>

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

                                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                            <span>👤 {t.employee_name || t.author_name || t.author || 'Employee'} ({t.emp_id || t.employee_id || 'Staff'})</span>
                                            <span>📅 {createdDate ? createdDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                                        </div>

                                        {!isResolved && (
                                            <button
                                                style={resolveBtnStyle}
                                                onClick={(e) => { e.stopPropagation(); handleResolve(t.id); }}
                                            >
                                                ✔ Mark as Resolved
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {filteredTickets.length === 0 && (
                                <div style={{ textAlign: "center", padding: "50px 20px", color: "rgba(255,255,255,0.4)" }}>
                                    <FaTicketAlt style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.3 }} />
                                    <p style={{ fontSize: "15px" }}>
                                        {isFiltered
                                            ? "No queries found matching the selected month/year/search filters."
                                            : activeTab === "history"
                                            ? "No query history found yet."
                                            : "No active queries received."}
                                    </p>
                                    {isFiltered && (
                                        <button onClick={resetFilters} style={{ ...resetBtnStyle, marginTop: "12px", display: "inline-flex" }}>
                                            <FaRedo style={{ marginRight: "6px" }} /> Clear Filters
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </GlassCard>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <GlassCard title={selectedTicket?.status === "Resolved" ? "Query Details & History" : "Reply Query"} subtitle={selectedTicket?.status === "Resolved" ? "View resolved query record" : "Communicate with sender"}>
                        {selectedTicketId && selectedTicket ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Query Info</div>
                                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", marginTop: "4px" }}>Ticket #{selectedTicket.id.toString().slice(-4)}</div>
                                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", marginTop: "2px" }}>
                                        From: {selectedTicket.employee_name || selectedTicket.author_name || selectedTicket.author || 'Employee'}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                                        Status: <span style={{ color: selectedTicket.status === 'Resolved' ? '#30d158' : '#ff9f0a', fontWeight: 'bold' }}>{selectedTicket.status}</span>
                                    </div>
                                </div>

                                {selectedTicket.status !== "Resolved" ? (
                                    <>
                                        <textarea
                                            placeholder="Write your response here..."
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            style={replyInputStyle}
                                        ></textarea>
                                        <button style={sendBtnStyle} onClick={handleSendReply}>Send Response</button>
                                    </>
                                ) : (
                                    <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)", color: "#30d158", fontSize: "13px" }}>
                                        <div style={{ fontWeight: "600", marginBottom: "4px" }}>✔ Query Resolved</div>
                                        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px" }}>
                                            This query is closed and saved in the Query History.
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                                Select a query from the list to view or reply
                            </div>
                        )}
                    </GlassCard>

                    <GlassCard title="Filter Summary" subtitle="Currently visible queries">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                                <span>Selected View:</span>
                                <span style={{ fontWeight: 'bold', color: '#fff', textTransform: 'capitalize' }}>{activeTab}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                                <span>Month Filter:</span>
                                <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                                    {MONTHS.find(m => m.value === selectedMonth)?.label}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                                <span>Year Filter:</span>
                                <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                                    {selectedYear === "all" ? "All Years" : selectedYear}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                                <span>Filtered Queries:</span>
                                <span style={{ fontWeight: 'bold', color: '#30d158' }}>{filteredTickets.length}</span>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

const tabButtonStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: "10px",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    transition: "all 0.2s ease",
};

const selectStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "6px 10px",
    fontSize: "12px",
    cursor: "pointer",
    outline: "none",
};

const searchInputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "6px 10px 6px 30px",
    fontSize: "12px",
    outline: "none",
};

const resetBtnStyle: React.CSSProperties = {
    background: "rgba(255,69,58,0.15)",
    color: "#ff453a",
    border: "1px solid rgba(255,69,58,0.3)",
    borderRadius: "8px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    alignItems: "center",
    whiteSpace: "nowrap",
};

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

