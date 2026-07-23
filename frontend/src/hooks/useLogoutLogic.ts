import { useState, useEffect } from 'react';
import { getActiveShiftSession, getEmployeeShift } from '../utils/storage';

export function useLogoutLogic() {
    const [canLogout, setCanLogout] = useState(true);
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        const check = async () => {
            const res = await getActiveShiftSession();
            if (res?.active && res.session) {
                const session = res.session;
                const now = new Date();
                const loginDate = new Date(session.login_time || session.started_at);
                const totalShiftSec = Math.floor((now.getTime() - loginDate.getTime()) / 1000);

                let currentBreakSec = 0;
                if (session.on_break && session.current_break_start) {
                    currentBreakSec = Math.floor((now.getTime() - new Date(session.current_break_start).getTime()) / 1000);
                }
                const totalBreakSec = (session.total_break_seconds || 0) + currentBreakSec;
                const totalWorkSec = Math.max(0, totalShiftSec - totalBreakSec);

                const targetId = sessionStorage.getItem("employeeId") || sessionStorage.getItem("userId") || "";
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

                setCanLogout(true); // Keep button accessible
                if (totalWorkSec < targetSec) {
                    setShowWarning(true);
                } else {
                    setShowWarning(false);
                }
            } else {
                setCanLogout(true);
                setShowWarning(false);
            }
        };

        check();
        const int = setInterval(check, 5000);
        return () => clearInterval(int);
    }, []);

    // Wrapper function to intercept clicks
    const handleSafeLogout = async (originalLogoutAction: () => Promise<void> | void) => {
        if (showWarning) {
            const confirmLogout = window.confirm(
                "⚠️ Warning: Your shift is currently in progress!\n\n" +
                "• Click 'Cancel' to KEEP WORKING (cancel logout).\n" +
                "• Click 'OK' ONLY if you really want to end your shift and log out."
            );
            if (!confirmLogout) {
                console.log("[LOGOUT] Logout cancelled by user. Shift timer continues uninterrupted.");
                return; // User clicked Cancel -> ABORT LOGOUT
            }
        } else {
            const confirmLogout = window.confirm("Are you sure you want to log out?");
            if (!confirmLogout) {
                console.log("[LOGOUT] Logout cancelled by user.");
                return; // User clicked Cancel -> ABORT LOGOUT
            }
        }

        await originalLogoutAction();
    };

    return { canLogout, handleSafeLogout };
}
