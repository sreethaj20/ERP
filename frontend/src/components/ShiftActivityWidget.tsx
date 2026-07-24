import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaClock, FaCoffee, FaSignOutAlt, FaHistory, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import GlassCard from "./GlassCard";
import { getActiveShiftSession, takeBreak, endBreak, endShiftSession, startShiftSession, getEmployeeShift, requestEarlyLogin, getEmployees } from "../utils/storage";
import { parseISOToLocalDate, formatLocalTime } from "../utils/formatters";
import { useLogoutLogic } from '../hooks/useLogoutLogic';

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
    return null;
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
