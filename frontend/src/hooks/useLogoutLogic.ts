import { useState, useEffect } from 'react';
import { getActiveShiftSession, getEmployeeShift, getLeaves } from '../utils/storage';
import { parseISOToLocalDate } from '../utils/formatters';

export function useLogoutLogic() {
    const [canLogout, setCanLogout] = useState(false);
    const [isOnLeaveToday, setIsOnLeaveToday] = useState(false);
    const [workInfo, setWorkInfo] = useState<{ totalWorkSec: number; targetSec: number; halfDaySec: number } | null>(null);

    useEffect(() => {
        const check = async () => {
            const targetId = sessionStorage.getItem("employeeId") || localStorage.getItem("employeeId") || sessionStorage.getItem("userId") || localStorage.getItem("userId") || "";
            const todayStr = new Date().toLocaleDateString('sv-SE');

            // Check if current employee has an active / approved leave for today
            const allLeaves = getLeaves();
            const userOnLeave = Array.isArray(allLeaves) && allLeaves.some((l: any) => {
                const empMatch = String(l.employee_id || '').toLowerCase() === String(targetId).toLowerCase() ||
                                 String(l.user_id || '').toLowerCase() === String(targetId).toLowerCase();
                const status = (l.status || '').toLowerCase();
                const isApprovedOrPending = status === 'approved' || status === 'pending' || status === 'recommended';
                if (!empMatch || !isApprovedOrPending) return false;

                const start = l.start_date ? String(l.start_date).split('T')[0] : '';
                const end = l.end_date ? String(l.end_date).split('T')[0] : start;
                return todayStr >= start && todayStr <= end;
            });

            setIsOnLeaveToday(userOnLeave);

            const res = await getActiveShiftSession();
            if (res?.active && res.session) {
                const session = res.session;
                const now = new Date();
                const loginDate = parseISOToLocalDate(session.login_time || session.started_at);
                const totalShiftSec = Math.floor((now.getTime() - loginDate.getTime()) / 1000);

                let currentBreakSec = 0;
                if (session.on_break && session.current_break_start) {
                    currentBreakSec = Math.floor((now.getTime() - parseISOToLocalDate(session.current_break_start).getTime()) / 1000);
                }
                const totalBreakSec = (session.total_break_seconds || 0) + currentBreakSec;
                const totalWorkSec = Math.max(0, totalShiftSec - totalBreakSec);

                const myShift = getEmployeeShift(targetId);
                let shiftHours = 8;
                
                if (myShift && myShift.start_time && myShift.end_time) {
                    const startParts = myShift.start_time.split(':').map(Number);
                    const endParts = myShift.end_time.split(':').map(Number);
                    if (startParts.length >= 2 && endParts.length >= 2) {
                        let totalMins = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);
                        if (totalMins < 0) totalMins += 24 * 60;
                        shiftHours = totalMins / 60;
                    }
                }
                
                const targetSec = shiftHours * 3600;
                const halfDaySec = 4 * 3600; // Exact 4 hours for standard half-day credit

                setWorkInfo({ totalWorkSec, targetSec, halfDaySec });

                // 🚨 CRITICAL RULE: If employee applied leave for today and logged in accidentally, ENABLE LOGOUT IMMEDIATELY
                if (userOnLeave) {
                    setCanLogout(true);
                } else {
                    // Standard shift logic: require 4 hours minimum
                    setCanLogout(totalWorkSec >= halfDaySec);
                }
            } else {
                setWorkInfo(null);
                setCanLogout(true); // No active session — allow logout
            }
        };

        check();
        const int = setInterval(check, 1000);
        return () => clearInterval(int);
    }, []);

    // Wrapper function to intercept clicks
    const handleSafeLogout = async (originalLogoutAction: () => Promise<void> | void) => {
        if (isOnLeaveToday) {
            const confirmLogout = window.confirm(
                `🏖️ You are currently ON LEAVE today!\n\nLogging out now will ensure your day is recorded strictly as 'Leave' (not a working day).\n\nClick 'OK' to log out immediately.`
            );
            if (!confirmLogout) return;
        } else if (workInfo) {
            const { totalWorkSec, targetSec, halfDaySec } = workInfo;

            // 1. HALF-DAY or more: prompt for half-day vs full shift logout
            if (totalWorkSec >= halfDaySec && totalWorkSec < targetSec) {
                const workedH = (totalWorkSec / 3600).toFixed(1);
                const confirmLogout = window.confirm(
                    `⚠️ Half-Day Completed (${workedH}h worked):\n\nLogging out now will record your attendance as 'Half Day'.\n\nClick 'OK' to confirm, or 'Cancel' to keep working.`
                );
                if (!confirmLogout) {
                    console.log("[LOGOUT] User cancelled half-day logout attempt to keep working.");
                    return; // ABORT LOGOUT
                }
            } else if (totalWorkSec >= targetSec) {
                // 2. FULL SHIFT COMPLETED (>= 8h): Standard confirm
                const confirmLogout = window.confirm("Are you sure you want to end your shift and log out?");
                if (!confirmLogout) {
                    return; // ABORT LOGOUT
                }
            }
        } else {
            const confirmLogout = window.confirm("Are you sure you want to log out?");
            if (!confirmLogout) {
                return;
            }
        }

        await originalLogoutAction();
    };

    return { canLogout, isOnLeaveToday, handleSafeLogout };
}

