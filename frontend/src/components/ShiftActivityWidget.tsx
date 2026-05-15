import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaClock, FaCoffee, FaSignOutAlt, FaHistory, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import GlassCard from "./GlassCard";
import { getActiveShiftSession, takeBreak, endBreak, endShiftSession, startShiftSession, getEmployeeShift, requestEarlyLogin, getEmployees } from "../utils/storage";

function calcShiftHours(start: string | undefined, end: string | undefined): number {
    if (!start || !end) return 8;
    const parts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);
    if (parts.length < 2 || endParts.length < 2) return 8;
    const [sh, sm] = parts;
    const [eh, em] = endParts;
    let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    return totalMinutes / 60;
}

export default function ShiftActivityWidget() {
    const userId = sessionStorage.getItem("userId") || "";
    const role = sessionStorage.getItem("userRole") || "";
    const navigate = useNavigate();

    const [session, setSession] = useState<any>(null);
    const [autoStarted, setAutoStarted] = React.useState(false);
    const [timers, setTimers] = useState({
        loginTime: "--:--",
        workDuration: "00:00:00",
        breakDuration: "00:00:00",
        totalBreak: "00:00:00",
        remainingWork: "08:00:00",
        totalShift: "00:00:00",
        expectedLogout: "--:--",
        halfDayRemaining: "04:00:00"
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const formatSeconds = (totalSeconds: number) => {
        if (isNaN(totalSeconds)) return "--:--:--";
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // 1. Polling: Sync session state from backend
    const syncData = async () => {
        const res = await getActiveShiftSession();
        if (res?.active) {
        }
        setSession(res?.active ? res.session : null);
    };

    // 2. Ticking: Local timer updates for fluid UI
    const tick = () => {
        if (!session) return;

        const now = new Date();
        const loginDate = new Date(session.login_time || session.started_at);

        // Total Shift (Elapsed since login)
        const totalShiftSec = Math.floor((now.getTime() - loginDate.getTime()) / 1000);

        // Break Duration (Current + Previous)
        let currentBreakSec = 0;
        if (session.on_break && session.current_break_start) {
            currentBreakSec = Math.floor((now.getTime() - new Date(session.current_break_start).getTime()) / 1000);
        }
        const totalBreakSec = (session.total_break_seconds || 0) + currentBreakSec;

        // Work Duration (Shift - Breaks)
        const totalWorkSec = Math.max(0, totalShiftSec - totalBreakSec);

        // Logic: Use assigned shift or default to 8h
        const targetId = sessionStorage.getItem("employeeId") || userId;
        const myShift = getEmployeeShift(targetId);
        const shiftHours = myShift ? calcShiftHours(myShift.start_time, myShift.end_time) : 8;
        const targetSec = shiftHours * 3600;
        const remainingSec = Math.max(0, targetSec - totalWorkSec);

        // Half Day (Target / 2)
        const halfDaySec = Math.max(0, (targetSec / 2) - totalWorkSec);

        // Expected Logout (Login + Shift Duration + 1h break implicit)
        const logoutTime = new Date(loginDate.getTime() + (shiftHours + 1) * 3600 * 1000);

        setTimers({
            loginTime: loginDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            workDuration: formatSeconds(totalWorkSec),
            breakDuration: formatSeconds(currentBreakSec),
            totalBreak: formatSeconds(totalBreakSec),
            remainingWork: formatSeconds(remainingSec),
            totalShift: formatSeconds(totalShiftSec),
            expectedLogout: logoutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            halfDayRemaining: formatSeconds(halfDaySec)
        });
    };

    useEffect(() => {
        const init = async () => {
            const res = await getActiveShiftSession();
            setSession(res?.active ? res.session : null);

            // AUTO-START LOGIC: If no active session and shift is assigned
            if (!res?.active && !autoStarted) {
                const targetId = sessionStorage.getItem("employeeId") || userId;
                const myShift = getEmployeeShift(targetId);
                const isOperationalRole = ['employee', 'tl', 'teamleader', 'recruiter', 'hr', 'it', 'itdepartment'].includes(role.toLowerCase().replace(/[\s_]+/g, ''));

                if (isOperationalRole) {
                    console.log("[SHIFT] Attempting auto-start for staff login...");
                    try {
                        // Use assigned shift if exists, otherwise fallback to General Shift (0)
                        const targetShiftId = myShift ? myShift.id : 0;
                        await startShiftSession(targetShiftId);
                        setAutoStarted(true);
                        await syncData();
                    } catch (e) {
                        console.warn("Auto-start suppressed:", e);
                    }
                }
            }
        };

        init();

        // Listen for storage hydration to refresh shift info
        const handleStorage = () => {
            console.log("[SHIFT] Storage updated, refreshing widget...");
            init();
        };
        window.addEventListener('storage', handleStorage);

        const pollInt = setInterval(syncData, 20000); // Poll backend every 20s
        const tickInt = setInterval(tick, 1000);    // Tick UI every 1s

        return () => {
            window.removeEventListener('storage', handleStorage);
            clearInterval(pollInt);
            clearInterval(tickInt);
        };
    }, []);

    // Also tick whenever session changes (e.g. after takeBreak)
    useEffect(() => {
        tick();
    }, [session]);

    const handleTakeBreak = async () => {
        try {
            setLoading(true);
            await takeBreak(userId);
            await syncData();
        } catch (err) {
            console.error("[SHIFT] Take Break Error:", err);
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    };

    const handleEndBreak = async () => {
        try {
            setLoading(true);
            await endBreak(userId);
            await syncData();
        } catch (err) {
            console.error("[SHIFT] End Break Error:", err);
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    };

    const handleLogout = async () => {
        if (session.on_break) {
            setMessage({ type: 'error', text: "Cannot logout while on break!" });
            return;
        }

        const res = await endShiftSession(userId);
        if (res.success || res.message === "Shift ended") {
            setMessage({ type: 'success', text: "Logged out successfully!" });
            setTimeout(() => window.location.href = "/login", 1000);
        } else {
            setMessage({ type: 'error', text: res.message || "Logout failed" });
            setTimeout(() => setMessage(null), 5000);
        }
    };

    // Everyone should be able to log in/out to track attendance
    // if (role === 'manager') return null; 

    // No active session — show a "not started" placeholder with optional START button
    if (!session) {
        const targetId = sessionStorage.getItem("employeeId") || userId;
        const myShift = getEmployeeShift(targetId);

        return (
            <div style={{ marginBottom: '30px' }}>
                <div style={{
                    background: 'rgba(28, 28, 30, 0.5)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    padding: '24px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            padding: '14px', borderRadius: '16px',
                            background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.2)'
                        }}>
                            <FaClock size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                Ready to start your shift?
                            </div>
                            {myShift ? (
                                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                    Assigned: <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>{myShift.shift_name}</span> ({myShift.start_time} – {myShift.end_time})
                                </div>
                            ) : (
                                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                    No shift assigned for today. Please contact HR.
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => navigate(`/${role.toLowerCase().replace(/\s/g, '')}/shift-timesheet`)}
                            className="apple-btn"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            <FaHistory style={{ marginRight: '8px' }} />History
                        </button>
                        {myShift && (
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        await startShiftSession(myShift.id);
                                        await syncData();
                                        setMessage({ type: 'success', text: "Shift started! Have a productive day." });
                                        setTimeout(() => setMessage(null), 3000);
                                    } catch (e) {
                                        setMessage({ type: 'error', text: "Failed to start shift. Already active?" });
                                    }
                                    setLoading(false);
                                }}
                                disabled={loading}
                                className="apple-btn"
                                style={{ background: 'rgba(48,209,88,0.2)', color: '#30d158', border: '1px solid rgba(48,209,88,0.3)', fontWeight: '700', padding: '10px 24px' }}
                            >
                                <FaClock style={{ marginRight: '8px' }} /> Start {myShift.shift_name}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '30px' }}>
            <div style={{
                background: 'rgba(28, 28, 30, 0.6)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            padding: '12px',
                            background: session.on_break ? 'rgba(255, 159, 10, 0.15)' : 'rgba(48, 209, 88, 0.15)',
                            borderRadius: '16px',
                            color: session.on_break ? '#ff9f0a' : '#30d158'
                        }}>
                            {session.on_break ? <FaCoffee size={20} /> : <FaClock size={20} />}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>
                                    {session.on_break ? "Currently on Break" : "Shift In Progress"}
                                </h3>
                                <div style={{
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(10, 132, 255, 0.2)',
                                    color: 'var(--accent-blue)',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    border: '1px solid rgba(10, 132, 255, 0.3)',
                                    textTransform: 'uppercase'
                                }}>
                                    {session.shift_name || "General Shift"}
                                </div>
                            </div>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {session.remark === 'Shift Extension' ? (
                                    <span style={{ color: '#ff9f0a', fontWeight: 'bold' }}>🕒 Shift Extension</span>
                                ) : session.is_early_login ? (
                                    <span style={{ color: '#0a84ff', fontWeight: 'bold' }}>🕒 Early Login Session</span>
                                ) : (
                                    `Logged in at ${timers.loginTime}`
                                )}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => navigate(`/${role}/shift-timesheet`)}
                            className="apple-btn"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            <FaHistory style={{ marginRight: '8px' }} /> View History
                        </button>
                        {!session.on_break ? (
                            <button
                                onClick={handleTakeBreak}
                                disabled={loading}
                                className="apple-btn"
                                style={{ background: 'rgba(255, 159, 10, 0.2)', color: '#ff9f0a', border: '1px solid rgba(255, 159, 10, 0.3)' }}
                            >
                                <FaCoffee style={{ marginRight: '8px' }} /> Take Break
                            </button>
                        ) : (
                            <button
                                onClick={handleEndBreak}
                                disabled={loading}
                                className="apple-btn"
                                style={{ background: 'rgba(48, 209, 88, 0.2)', color: '#30d158', border: '1px solid rgba(48, 209, 88, 0.3)' }}
                            >
                                <FaClock style={{ marginRight: '8px' }} /> End Break
                            </button>
                        )}
                        <button
                            onClick={handleLogout}
                            className="apple-btn"
                            style={{ background: 'rgba(255, 69, 58, 0.2)', color: '#ff453a', border: '1px solid rgba(255, 69, 58, 0.3)' }}
                        >
                            <FaSignOutAlt style={{ marginRight: '8px' }} /> Logout
                        </button>
                    </div>
                </div>

                {session.is_early_login && session.early_approval_status === 'pending' && (
                    <div style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        background: 'rgba(255, 159, 10, 0.1)',
                        border: '1px solid rgba(255, 159, 10, 0.2)',
                        color: '#ff9f0a',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <FaExclamationTriangle />
                        Early login detected. Attendance calculation will resume once your Team Leader approves the record.
                    </div>
                )}

                {message && (
                    <div style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        background: message.type === 'error' ? 'rgba(255, 69, 58, 0.1)' : 'rgba(48, 209, 88, 0.1)',
                        border: `1px solid ${message.type === 'error' ? 'rgba(255, 69, 58, 0.2)' : 'rgba(48, 209, 88, 0.2)'}`,
                        color: message.type === 'error' ? '#ff453a' : '#30d158',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        {message.type === 'error' ? <FaExclamationTriangle /> : <FaCheckCircle />}
                        {message.text}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
                    <TimerCard label="Total Work" value={timers.workDuration} color="#0a84ff" subValue="Min 8h Required" />
                    <TimerCard label="Break Time" value={timers.totalBreak} color="#bf5af2" />
                    <TimerCard label="Remaining" value={timers.remainingWork} color={timers.remainingWork === "00:00:00" ? "#30d158" : "#ff9f0a"} />
                    <TimerCard label="Half Day In" value={timers.halfDayRemaining} color={timers.halfDayRemaining === "00:00:00" ? "#30d158" : "#bf5af2"} subValue="4h Work needed" />
                    <TimerCard label="Exp. Logout" value={timers.expectedLogout} color="#64d2ff" subValue="Login + 9h" />
                </div>

                {/* ADVANCE EARLY LOGIN REQUEST (New Feature) */}
                {!session.on_break && (
                    <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Planning an Early Start?</h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Requests must be approved 24h in advance by your TL</p>
                            </div>
                            <button
                                onClick={async () => {
                                    const reason = window.prompt("Reason for Early Login (e.g. Critical Deployment):");
                                    if (reason) {
                                        const allEmps = await getEmployees();
                                        const me = allEmps.find((e: any) => e.id === userId || e.user_id === userId);

                                        await requestEarlyLogin({
                                            employee_id: userId,
                                            employee_name: sessionStorage.getItem("userName") || '',
                                            tl_id: me?.reporting_to_id || '',
                                            reason: reason
                                        });
                                        setMessage({ type: 'success', text: "Early login request submitted for TL approval!" });
                                        setTimeout(() => setMessage(null), 5000);
                                    }
                                }}
                                className="apple-btn"
                                style={{ background: 'rgba(10, 132, 255, 0.1)', color: '#0a84ff', fontSize: '12px', border: '1px solid rgba(10, 132, 255, 0.2)' }}
                            >
                                Request Advance Early Login
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const TimerCard = ({ label, value, color, subValue }: { label: string, value: string, color: string, subValue?: string }) => (
    <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '15px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        textAlign: 'center'
    }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: '800', color, fontFamily: 'monospace' }}>{value}</div>
        {subValue && <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{subValue}</div>}
    </div>
);
