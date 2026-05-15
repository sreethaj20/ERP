import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { getAnnouncements, addAnnouncement, deleteAnnouncement, getMyEmployee } from "../../utils/storage";
import { FaBullhorn, FaPaperPlane, FaCheckCircle, FaExclamationTriangle, FaTrash } from "react-icons/fa";

export default function BroadcastCenter() {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [attachment, setAttachment] = useState<string | null>(null);
    const [targetRole, setTargetRole] = useState("All");
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const roles = [
        { label: "All Employees", value: "All" },
        { label: "HR Department", value: "HR" },
        { label: "Recruiters", value: "Recruiter" },
        { label: "Team Leaders", value: "TeamLeader" },
        { label: "IT Department", value: "IT" },
    ];

    const fetchAnnouncements = async () => {
        try {
            const data = await getAnnouncements();
            setAnnouncements(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load announcements:", err);
            setAnnouncements([]);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setAttachment(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) return;

        setLoading(true);
        setError("");

        try {
            const me = getMyEmployee();
            await addAnnouncement({
                title,
                message,
                target_role: targetRole,
                sender_id: me?.id || me?.user_id || 1,
                attachments: attachment ? [attachment] : []
            });

            setTitle("");
            setMessage("");
            setAttachment(null);
            setSuccess(true);
            await fetchAnnouncements();

            // Trigger local refresh for other widgets
            window.dispatchEvent(new CustomEvent("announcement_posted"));

            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError("Failed to save announcement.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string | number) => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            await deleteAnnouncement(id);
            await fetchAnnouncements();
            window.dispatchEvent(new CustomEvent("announcement_posted"));
        }
    };

    return (
        <div style={{ padding: "24px", color: "white" }}>
            <Header role="Manager" title="Organization Broadcast Center" />

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "24px", marginTop: "24px" }}>
                <GlassCard title="Compose Announcement" subtitle="Send real-time alerts to the workforce">
                    <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Target Audience</label>
                            <select
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value)}
                                style={selectStyle}
                            >
                                {roles.map(r => <option key={r.value} value={r.value} style={{ background: '#1a1a1a' }}>{r.label}</option>)}
                            </select>
                        </div>

                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Headline</label>
                            <input
                                type="text"
                                placeholder="e.g., Annual Town Hall 2026"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                style={inputStyle}
                                required
                            />
                        </div>

                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Message Detail</label>
                            <textarea
                                rows={6}
                                placeholder="Compose your organization-wide message..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                style={{ ...inputStyle, height: "auto", padding: "12px", resize: "none" }}
                                required
                            />
                        </div>

                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Attachment (Optional)</label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                style={{ ...inputStyle, padding: "10px" }}
                            />
                            {attachment && <span style={{ fontSize: '11px', color: '#30d158', marginTop: '4px' }}>✓ File prepared for broadcast</span>}
                        </div>

                        {error && (
                            <div style={{ color: "#ff453a", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <FaExclamationTriangle /> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="apple-btn"
                            disabled={loading}
                            style={{
                                ...submitBtnStyle,
                                background: success ? "#30d158" : "linear-gradient(180deg, #0a84ff 0%, #0071e3 100%)",
                                boxShadow: success ? "0 8px 24px rgba(48,209,88,0.3)" : "0 8px 24px rgba(10,132,255,0.3)"
                            }}
                        >
                            {loading ? "Transmitting..." : success ? <><FaCheckCircle /> Broadcasted Successfully</> : <><FaPaperPlane /> Dispatch Announcement</>}
                        </button>
                    </form>
                </GlassCard>

                <GlassCard title="Recent Communications" subtitle="Overview of dispatched messages">
                    <div style={{ maxHeight: "700px", overflowY: "auto", marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px", paddingRight: "8px" }}>
                        {announcements.length === 0 ? (
                            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "100px 0" }}>
                                <FaBullhorn size={48} style={{ opacity: 0.1, marginBottom: "16px" }} />
                                <p>No communications dispatched yet.</p>
                            </div>
                        ) : (
                            announcements.map((ann) => (
                                <div key={ann.id} style={historyCardStyle}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#fff" }}>{ann.title}</h4>
                                            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                                                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", background: "rgba(10,132,255,0.15)", color: "#0a84ff", fontWeight: "700" }}>
                                                    TO: {String(ann?.target_audience || ann?.target_role || 'All').toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
                                                {new Date(ann.created_at).toLocaleDateString()} at {new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(ann.id)}
                                                style={{
                                                    background: 'rgba(255,69,58,0.1)',
                                                    border: 'none',
                                                    color: '#ff453a',
                                                    padding: '6px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Delete Announcement"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: "1.5" }}>
                                        {ann.content || ann.message || "No content"}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

const inputGroupStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle: React.CSSProperties = { fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px", textTransform: "uppercase" };
const inputStyle: React.CSSProperties = {
    width: "100%", height: "48px", padding: "0 16px", borderRadius: "12px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", fontSize: "15px", outline: "none", transition: "all 0.2s"
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
const submitBtnStyle: React.CSSProperties = {
    marginTop: "10px", height: "54px", borderRadius: "14px", border: "none",
    color: "#fff", fontSize: "16px", fontWeight: "600", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
    transition: "all 0.3s ease"
};
const historyCardStyle: React.CSSProperties = {
    padding: "20px", borderRadius: "16px", background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
};
