import React, { useState, useEffect } from "react";
import GlassCard from "./GlassCard";
import { FaBullhorn, FaExpandAlt, FaCompressAlt } from "react-icons/fa";
import { getAnnouncements, getRole } from "../utils/storage";

interface Announcement {
    id: number;
    title: string;
    content?: string; // New backend schema
    message?: string; // Old/Legacy field
    target_audience?: string;
    attachment_url?: string;
    created_at: string;
}

export default function AnnouncementWidget() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());

    const userRole = getRole();

    const fetchAnnouncements = async () => {
        try {
            const data = await getAnnouncements();
            // Backend now handles role-based filtering, so we just need to display what we get
            if (Array.isArray(data)) {
                setAnnouncements(data.slice(0, 5)); // Show latest 5
            }
        } catch (err) {
            console.error("Failed to load announcements:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleMessageExpansion = (id: number) => {
        setExpandedMessages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    useEffect(() => {
        fetchAnnouncements();

        // Listen for custom "announcement_posted" event to refresh the widget locally
        const handleRefresh = () => {
            console.log("[Local] Refreshing AnnouncementWidget");
            fetchAnnouncements();
        };

        window.addEventListener("announcement_posted", handleRefresh);

        return () => {
            window.removeEventListener("announcement_posted", handleRefresh);
        };
    }, [userRole]);

    if (loading) return null;
    if (announcements.length === 0) return null;

    return (
        <GlassCard title="Official Announcements" subtitle="Latest updates from management">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
                {announcements.map((ann) => {
                    const msg = ann.content || ann.message || "";
                    const isExpanded = expandedMessages.has(ann.id);
                    const shouldTruncate = msg.length > 80 && !isExpanded;
                    const displayMessage = shouldTruncate ? msg.substring(0, 80) + "..." : msg;
                    
                    return (
                        <div key={ann.id} style={itemStyle}>
                            <div style={{ display: "flex", justifyContent: 'space-between', alignItems: "center", marginBottom: "4px" }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaBullhorn size={12} color="#0a84ff" />
                                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>{ann.title}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                                        {new Date(ann.created_at).toLocaleDateString()}
                                    </span>
                                    {msg.length > 80 && (
                                        <button
                                            onClick={() => toggleMessageExpansion(ann.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-secondary)',
                                                padding: '2px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title={isExpanded ? "Collapse message" : "Expand message"}
                                        >
                                            {isExpanded ? <FaCompressAlt size={10} /> : <FaExpandAlt size={10} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                                {displayMessage}
                            </p>
                            {ann.attachment_url && (
                                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <a 
                                        href={ann.attachment_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '11px', color: '#0a84ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        📎 View Attachment
                                    </a>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
}

const itemStyle: React.CSSProperties = {
    padding: "12px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.05)"
};
