import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import csrfManager from '../utils/csrfManager';

const ROLE_DASHBOARDS = {
    admin: '/admin/dashboard',
    moderator: '/moderator',
    officer: '/officer/dashboard', // New Portal
    user: '/user/dashboard'
};

const PortalGuard = ({ children, allowedRoles }) => {
    const { isSignedIn, user, isLoaded } = useUser();
    const [role, setRole] = useState(null);
    const [isRoleLoaded, setIsRoleLoaded] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const fetchUserRole = async () => {
            if (isSignedIn && user) {
                try {
                    // 1. Try publicMetadata (Fastest)
                    let currentRole = user.publicMetadata?.role;

                    // 2. Fallback to Backend (Source of Truth)
                    if (!currentRole || currentRole === 'user') {
                        const response = await csrfManager.secureFetch(`/api/profile/${user.id}`);
                        if (response.ok) {
                            const data = await response.json();
                            if (data.role) currentRole = data.role;
                        }
                    }
                    setRole(currentRole || 'user');
                } catch (error) {
                    console.error("Role Sync Failed:", error);
                    setRole('user'); // Default safely
                } finally {
                    setIsRoleLoaded(true);
                }
            } else if (isLoaded && !isSignedIn) {
                setIsRoleLoaded(true);
            }
        };

        if (isLoaded) fetchUserRole();
    }, [isSignedIn, user, isLoaded]);

    if (!isLoaded || !isRoleLoaded) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                <p className="text-gray-500 animate-pulse">Verifying Access Permissions...</p>
            </div>
        );
    }

    // 1. Not Signed In -> Login
    if (!isSignedIn) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Access Granted
    if (allowedRoles.includes(role)) {
        return children;
    }

    // 3. Access Denied -> Smart Redirect
    // If I am an Admin trying to access /user/dashboard, send me to /admin/dashboard
    const targetDashboard = ROLE_DASHBOARDS[role] || '/home';
    console.warn(`[PortalGuard] Access Denied for ${role} at ${location.pathname}. Redirecting to ${targetDashboard}`);
    return <Navigate to={targetDashboard} replace />;
};

export default PortalGuard;
