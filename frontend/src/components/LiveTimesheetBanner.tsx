import React, { useState, useEffect } from "react";
import { FaClock, FaSignOutAlt, FaCoffee, FaPlay } from "react-icons/fa";
import shiftService, { ShiftSession, BreakLog } from "../services/shiftService";

export default function LiveTimesheetBanner() {
    const userId = sessionStorage.getItem("userId") || "";
    const [session, setSession] = useState<ShiftSession | null>(null);
    const [activeBreak, setActiveBreak] = useState<BreakLog | null>(null);
    const [elapsed, setElapsed] = useState("00:00:00");
    const [breakElapsed, setBreakElapsed] = useState("00:00:00");
    const [hoursNum, setHoursNum] = useState(0);

    const loadActiveSession = async () => {
        try {
            const history = await shiftService.getAttendanceHistory();
            const active = history.find((s: ShiftSession) => s.status === 'active');
            setSession(active || null);
            if (active) {
                const breaks = await shiftService.getBreaks();
                const currentBreak = (breaks as any[]).find((b: any) => !b.end_time);
                setActiveBreak(currentBreak || null);
            }
        } catch (error) {
            console.error("Failed to load active session:", error);
        }
    };

    useEffect(() => {
        loadActiveSession();
        const interval = setInterval(loadActiveSession, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!session) return;

        const timer = setInterval(() => {
            const now = new Date();
            const loginDate = new Date(session.login_time);
            const diff = now.getTime() - loginDate.getTime();
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            setHoursNum(hours + minutes / 60);

            if (activeBreak) {
                const breakStart = new Date(activeBreak.start_time);
                const bDiff = now.getTime() - breakStart.getTime();
                const bH = Math.floor(bDiff / (1000 * 60 * 60));
                const bM = Math.floor((bDiff % (1000 * 60 * 60)) / (1000 * 60));
                const bS = Math.floor((bDiff % (1000 * 60)) / 1000);
                setBreakElapsed(`${bH.toString().padStart(2, '0')}:${bM.toString().padStart(2, '0')}:${bS.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [session, activeBreak]);

    const handleEndShift = async () => {
        if (!window.confirm("Are you sure you want to end your shift?")) return;
        await shiftService.endShift();
        setSession(null);
        setActiveBreak(null);
    };

    const handleStartBreak = async () => {
        const type = window.prompt("Break type (break, lunch, meeting):", "break") || "break";
        const res = await shiftService.startBreak(userId, type);
        setActiveBreak(res);
    };

    const handleEndBreak = async () => {
        await shiftService.endBreak(userId);
        setActiveBreak(null);
    };

    if (!session) return null;

    const progressPercent = Math.min((hoursNum / 9) * 100, 100);
    const isComplete = hoursNum >= 9;

    return (
        <div style={{
            background: activeBreak
                ? 'linear-gradient(135deg, rgba(191,90,242,0.15), rgba(191,90,242,0.05))'
                : isComplete
                    ? 'linear-gradient(135deg, rgba(48,209,88,0.15), rgba(48,209,88,0.05))'
                    : 'linear-gradient(135deg, rgba(10,132,255,0.15), rgba(10,132,255,0.05))',
            border: `1px solid ${activeBreak ? 'rgba(191,90,242,0.3)' : isComplete ? 'rgba(48,209,88,0.3)' : 'rgba(10,132,255,0.3)'}`,
            borderRadius: '20px',
            padding: '20px 28px',
            marginBottom: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                    width: '52px', height: '52px', borderRadius: '16px',
                    background: activeBreak ? 'rgba(191,90,242,0.2)' : isComplete ? 'rgba(48,209,88,0.2)' : 'rgba(10,132,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <FaClock size={24} color={activeBreak ? '#bf5af2' : isComplete ? '#30d158' : '#0a84ff'} />
                </div>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '4px' }}>
                        {activeBreak ? `☕ ON ${activeBreak.type.toUpperCase()}` : isComplete ? '✅ SHIFT COMPLETE' : '⏱️ SHIFT ACTIVE'}
                    </div>
                    <div style={{
                        fontSize: '32px', fontWeight: '800',
                        color: activeBreak ? '#bf5af2' : isComplete ? '#30d158' : '#0a84ff',
                        fontFamily: "var(--font-mono, monospace)",
                        letterSpacing: '1px'
                    }}>
                        {activeBreak ? breakElapsed : elapsed}
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Shift Progress</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '700' }}>{Math.round(progressPercent)}%</span>
                </div>
                <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${progressPercent}%`,
                        background: isComplete ? '#30d158' : '#0a84ff',
                        transition: 'width 0.4s ease'
                    }} />
                </div>
                {activeBreak && (
                    <div style={{ fontSize: '11px', color: '#bf5af2', marginTop: '6px', fontWeight: '600' }}>
                        Shift time is still running in background
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
                {activeBreak ? (
                    <button onClick={handleEndBreak} className="apple-btn" style={{ background: 'rgba(48,209,88,0.15)', color: '#30d158', border: '1px solid rgba(48,209,88,0.3)', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                        <FaPlay size={12} /> End Break
                    </button>
                ) : (
                    <button onClick={handleStartBreak} className="apple-btn" style={{ background: 'rgba(191,90,242,0.15)', color: '#bf5af2', border: '1px solid rgba(191,90,242,0.3)', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                        <FaCoffee size={14} /> Start Break
                    </button>
                )}
                <button onClick={handleEndShift} className="apple-btn" style={{ background: 'rgba(255,69,58,0.15)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.3)', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                    <FaSignOutAlt size={14} /> End Shift
                </button>
            </div>
        </div>
    );
}
