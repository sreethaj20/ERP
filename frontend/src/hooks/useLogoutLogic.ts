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
                const halfDaySec = targetSec / 2;

                if (totalWorkSec < halfDaySec) {
                    setCanLogout(false); // Disappear before half day
                    setShowWarning(false);
                } else if (totalWorkSec >= halfDaySec && totalWorkSec < targetSec) {
                    setCanLogout(true);  // Appear after half day, but with warning
                    setShowWarning(true);
                } else {
                    setCanLogout(true);  // Normal logout after shift completes
                    setShowWarning(false);
                }
            } else {
                // If not on shift, allow normal logout
                setCanLogout(true);
                setShowWarning(false);
            }
        };

        check();
        const int = setInterval(check, 5000); // Check every 5s
        return () => clearInterval(int);
    }, []);

    // Wrapper function to intercept clicks
    const handleSafeLogout = async (originalLogoutAction: () => Promise<void> | void) => {
        if (showWarning) {
            const proceed = window.confirm("You are trying to logout early! Keep working?");
            // If they click "OK" on "Keep working?", we ABORT logout.
            // If they click "Cancel", they PROCEED to logout.
            // Actually, a better phrasing for standard confirm:
            // "You are trying to logout early. Click OK to KEEP IT (continue working), or Cancel to Force Logout."
            // Wait, the user said: "message to user trying to logout keepit if keepit is press continuue"
            // Let's use a standard JS confirm:
            // "You are trying to logout before your shift is fully completed. Press Cancel to 'Keep it' and continue working. Press OK to force logout anyway."
            const keepIt = window.confirm("⚠️ You are trying to logout early!\n\nPress OK to FORCE LOGOUT anyway.\nPress Cancel to KEEP IT and continue working.");
            if (!keepIt) {
                return; // User cancelled the logout (Kept it)
            }
        }
        await originalLogoutAction();
    };

    return { canLogout, handleSafeLogout };
}
