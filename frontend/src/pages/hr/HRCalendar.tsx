import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getHolidays, addHoliday, deleteHoliday } from "../../services/hrService";
import { FaCalendarAlt, FaTrash, FaCheckCircle, FaFileDownload } from "react-icons/fa";

export default function HRCalendar() {
    const [holidays, setHolidays] = useState<any[]>([]);
    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const data = await getHolidays();
            setHolidays(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    const handleAdd = async () => {
        if (!name || !date) {
            alert("Please provide both name and date.");
            return;
        }
        try {
            await addHoliday(name, date);
            fetchHolidays();
            setName("");
            setDate("");
            alert("✅ Holiday added successfully!");
        } catch (e: any) {
            alert(e?.response?.data?.detail || "Failed to add holiday");
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this holiday?")) {
            try {
                await deleteHoliday(id);
                fetchHolidays();
            } catch (e) {
                alert("Failed to delete");
            }
        }
    };

    return (
        <div className="dashboard-container">
            <Header role="HR" title="Holiday Management" />

            <div style={{ marginBottom: "30px" }}>
                <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Company Calendar</h1>
                <p className="subtitle">Manage public holidays and mandatory off-days</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <GlassCard title="Add Holiday" subtitle="Define a new company holiday">
                        <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={labelStyle}>HOLIDAY NAME</label>
                                <input
                                    placeholder="e.g. Independence Day"
                                    className="apple-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={labelStyle}>DATE</label>
                                <input
                                    type="date"
                                    className="apple-input"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <button className="apple-btn" onClick={handleAdd} style={{ marginTop: '10px' }}>
                                <FaCalendarAlt /> Add to Calendar
                            </button>
                        </div>
                    </GlassCard>

                    <GlassCard title="Guidelines" subtitle="Holiday policy configuration">
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <FaCheckCircle color="#30d158" style={{ flexShrink: 0, marginTop: '3px' }} />
                                <span>Holidays are automatically marked as 'OFF' in all employee calendars.</span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <FaCheckCircle color="#30d158" style={{ flexShrink: 0, marginTop: '3px' }} />
                                <span>Leave requested on holidays will not deduct from balance.</span>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <GlassCard
                        title="Declared Holidays"
                        subtitle={`${holidays.length} holidays configured for this year`}
                        headerAction={
                            <button className="apple-btn" style={{ fontSize: '11px', padding: '6px 12px', background: 'rgba(255,159,10,0.1)', color: '#ff9f0a' }}>
                                <FaFileDownload /> Export List
                            </button>
                        }
                    >
                        <div style={{ maxHeight: "600px", overflowY: "auto", marginTop: "15px" }}>
                            {holidays.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                    <FaCalendarAlt size={40} style={{ opacity: 0.1, marginBottom: '15px' }} />
                                    <p>No holidays added yet.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    {holidays.sort((a, b) => a.date.localeCompare(b.date)).map((h) => (
                                        <div
                                            key={h.id}
                                            style={{
                                                padding: '16px',
                                                borderRadius: '16px',
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid var(--border-light)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '15px' }}>{h.name}</div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                    {new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(h.id)}
                                                style={{
                                                    background: 'rgba(255,69,58,0.1)',
                                                    border: 'none',
                                                    color: '#ff453a',
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.5px'
};
