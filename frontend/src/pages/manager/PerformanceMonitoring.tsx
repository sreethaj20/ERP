import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getPerformanceReviews, refreshPerformanceReviews } from "../../utils/storage";
import { FaStar, FaDownload, FaFilter, FaSearch } from "react-icons/fa";
import { downloadCSV } from "../../utils/formatters";

export default function PerformanceMonitoring() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMonth, setFilterMonth] = useState("All");

    const loadData = async () => {
        const data = await refreshPerformanceReviews();
        setReviews(data);
    };

    useEffect(() => {
        loadData();
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, []);

    const months = ["All", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const filteredReviews = reviews.filter(r => {
        const matchesSearch = r.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.submitted_by_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMonth = filterMonth === "All" || r.review_month === filterMonth;
        return matchesSearch && matchesMonth;
    });

    const handleExport = () => {
        const data = filteredReviews.map(r => ({
            "Month": r.review_month,
            "Year": r.review_year,
            "Employee ID": r.employee_id,
            "Employee Name": r.employee_name,
            "Score": r.score,
            "TL Feedback": r.tl_feedback,
            "Employee Input": r.employee_self_input,
            "Submitted By": r.submitted_by_name,
            "Date Submitted": r.date
        }));
        downloadCSV(data, `Performance_Monitoring_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="dashboard-container">
            <Header role="Manager" title="Organization Performance" />

            <div style={{ marginBottom: "32px", marginTop: "10px" }}>
                <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "4px" }}>Performance Monitoring</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>Review periodic performance evaluations across all units</p>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                        type="text"
                        placeholder="Search by Employee or TL..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="glass-input"
                        style={{ paddingLeft: '45px' }}
                    />
                </div>
                <div style={{ width: '200px' }}>
                    <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="glass-input"
                        style={{ padding: '12px' }}
                    >
                        {months.map(m => <option key={m} value={m}>{m === "All" ? "All Months" : m}</option>)}
                    </select>
                </div>
                <button
                    onClick={handleExport}
                    className="apple-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
                >
                    <FaDownload size={14} /> Export Excel
                </button>
            </div>

            <GlassCard title="Performance Data" subtitle="Consolidated view of all reviews">
                <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                    {filteredReviews.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                            <FaStar size={50} style={{ opacity: 0.1, marginBottom: '15px' }} />
                            <p>No performance data found matches your filters.</p>
                        </div>
                    ) : (
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Month/Year</th>
                                    <th style={thStyle}>Employee</th>
                                    <th style={thStyle}>Score</th>
                                    <th style={thStyle}>TL Feedback</th>
                                    <th style={thStyle}>Emp Input</th>
                                    <th style={thStyle}>Reviewer</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReviews.map((r) => (
                                    <tr key={r.id} style={trStyle}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: '600' }}>{r.review_month}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{r.review_year}</div>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: '700', fontSize: '14px' }}>{r.employee_name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--accent-blue)' }}>#{r.employee_id}</div>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '45px',
                                                height: '45px',
                                                borderRadius: '50%',
                                                background: r.score >= 8 ? 'rgba(48,209,88,0.1)' : r.score >= 5 ? 'rgba(255,159,10,0.1)' : 'rgba(255,69,58,0.1)',
                                                color: r.score >= 8 ? '#30d158' : r.score >= 5 ? '#ff9f0a' : '#ff453a',
                                                fontWeight: '800',
                                                border: `1px solid ${r.score >= 8 ? 'rgba(48,209,88,0.2)' : r.score >= 5 ? 'rgba(255,159,10,0.2)' : 'rgba(255,69,58,0.2)'}`
                                            }}>
                                                {r.score}
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, maxWidth: '250px' }}>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{r.tl_feedback || '—'}</div>
                                        </td>
                                        <td style={{ ...tdStyle, maxWidth: '150px' }}>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{r.employee_self_input || 'No input provided'}</div>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: '500' }}>{r.submitted_by_name}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{r.date}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}

const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
};

const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '16px',
    color: 'var(--text-tertiary)',
    borderBottom: '1px solid var(--border-light)',
    textTransform: 'uppercase',
    fontSize: '11px',
    letterSpacing: '1px',
    fontWeight: '700'
};

const tdStyle: React.CSSProperties = {
    padding: '18px 16px',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-light)',
    verticalAlign: 'middle'
};

const trStyle: React.CSSProperties = {
    transition: 'all 0.2s ease',
    background: 'rgba(255,255,255,0.01)'
};
