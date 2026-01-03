import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import useProfileStatus from '../../hooks/useProfileStatus';
import { Loader2 } from 'lucide-react';

const RequireProfile = ({ children }) => {
    const { isSignedIn, isLoaded: isAuthLoaded } = useUser();
    const { isProfileComplete, isLoading: isProfileLoading } = useProfileStatus();
    const location = useLocation();

    // Wait for auth to load OR profile check to complete (isProfileComplete starts as null)
    if (!isAuthLoaded || isProfileLoading || isProfileComplete === null) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (!isSignedIn) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Strict Check: If profile is NOT complete, force them to setup
    if (!isProfileComplete) {
        return <Navigate to="/profile-setup" replace />;
    }

    // If complete, allow access
    return children;
};

export default RequireProfile;
