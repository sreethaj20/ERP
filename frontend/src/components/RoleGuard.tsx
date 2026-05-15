import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getRole } from '../utils/storage';

interface RoleGuardProps {
    allowedRoles: string[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
    const role = getRole();
    const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(role)) {
        console.warn(`[AUTH] Access denied for role: ${role}. Required: ${allowedRoles.join(', ')}`);
        // Redirect to their own dashboard if they try to access something unauthorized
        return <Navigate to={`/${role}/dashboard`} replace />;
    }

    return <Outlet />;
};

export default RoleGuard;
