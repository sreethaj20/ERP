import { useState, useEffect } from 'react';
import { getActiveShiftSession, getEmployeeShift } from '../utils/storage';

export function useLogoutLogic() {
    const [canLogout, setCanLogout] = useState(true);
    const [workInfo, setWorkInfo] = useState<{ totalWorkSec: number; targetSec: number; halfDaySec: number } | null>(null);

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

                setWorkInfo({ totalWorkSec, targetSec, halfDaySec });
                setCanLogout(true);
            } else {
                setWorkInfo(null);
                setCanLogout(true);
            }
        };

        check();
        const int = setInterval(check, 5000);
        return () => clearInterval(int);
    }, []);

    // Wrapper function to intercept clicks
    const handleSafeLogout = async (originalLogoutAction: () => Promise<void> | void) => {
        if (workInfo) {
            const { totalWorkSec, targetSec, halfDaySec } = workInfo;

            // 1. STRICT BLOCK: Before half-day work duration (4 hours), logout is completely forbidden!
            if (totalWorkSec < halfDaySec) {
                const workedH = Math.floor(totalWorkSec / 3600);
                const workedM = Math.floor((totalWorkSec % 3600) / 60);
                const neededSec = halfDaySec - totalWorkSec;
                const neededH = Math.floor(neededSec / 3600);
                const neededM = Math.floor((neededSec % 3600) / 60);

                window.alert(
                    `⛔ LOGOUT RESTRICTED:\n\n` +
                    `You cannot log out from your shift until you complete at least half-day working hours (4.0 hours).\n\n` +
                    `• Current Work Time: ${workedH}h ${workedM}m\n` +
                    `• Remaining Time Needed for Half-Day: ${neededH}h ${neededM}m\n\n` +
                    `Please continue your shift!`
                );
                return; // BLOCK LOGOUT COMPLETELY
            }

            // 2. HALF-DAY COMPLETED (4h <= work < 8h): Allow logout with explicit Half Day warning
            if (totalWorkSec >= halfDaySec && totalWorkSec < targetSec) {
                const workedH = (totalWorkSec / 3600).toFixed(1);
                const confirmLogout = window.confirm(
                    `⚠️ Half-Day Completed (${workedH}h worked):\n\n` +
                    `Logging out now will record your attendance as 'Half Day'.\n\n` +
                    `• Click 'OK' to confirm Half Day Logout.\n` +
                    `• Click 'Cancel' to KEEP WORKING and complete your full shift.`
                );
                if (!confirmLogout) {
                    console.log("[LOGOUT] User cancelled half-day logout attempt to keep working.");
                    return; // ABORT LOGOUT
                }
            } else {
                // 3. FULL SHIFT COMPLETED (>= 8h): Standard confirm
                const confirmLogout = window.confirm("Are you sure you want to end your shift and log out?");
                if (!confirmLogout) {
                    return; // ABORT LOGOUT
                }
            }
        }

        await originalLogoutAction();
    };

    return { canLogout, handleSafeLogout };
}
