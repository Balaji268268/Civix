import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from "@clerk/clerk-react";
import csrfManager from '../utils/csrfManager';

const ProfileContext = createContext(null);

export const ProfileProvider = ({ children }) => {
    const { user, isSignedIn, isLoaded: isAuthLoaded } = useUser();
    const { getToken } = useAuth();

    const [isProfileComplete, setIsProfileComplete] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState(null);
    const [role, setRole] = useState('user');

    const checkProfileStatus = useCallback(async () => {
        if (!isAuthLoaded) return;

        if (!isSignedIn || !user) {
            setIsProfileComplete(false);
            setProfileData(null);
            setIsLoading(false);
            return;
        }

        const cacheKey = `civix_profile_${user.id}`;

        try {
            // 1. FAST PATH: Check Local Cache first
            const cachedStatus = localStorage.getItem(cacheKey);
            if (cachedStatus === 'true') {
                // Optimistically assume true to unblock UI immediately
                setIsProfileComplete(true);
                if (user.publicMetadata?.role) setRole(user.publicMetadata.role);
            }

            // 2. BACKGROUND SYNC: Verify with Backend (Source of Truth)
            const token = await getToken();
            const response = await csrfManager.secureFetch(`/api/profile/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setProfileData(data);

                const isComplete = Boolean(data.isProfileComplete);
                setIsProfileComplete(isComplete);
                if (data.role) setRole(data.role);

                // Update Cache
                localStorage.setItem(cacheKey, isComplete ? "true" : "false");
            } else {
                setIsProfileComplete(false);
                localStorage.removeItem(cacheKey); // Clear invalid cache
            }
        } catch (error) {
            console.error("Profile Context Sync Error:", error);
            // If fetch fails but we had a cache, we usually keep the cache or fallback.
            // For safety, if error, we might doubt the cache, but for UX, we trust it if it exists.
        } finally {
            setIsLoading(false);
        }
    }, [user, isSignedIn, getToken, isAuthLoaded]);

    useEffect(() => {
        checkProfileStatus();
    }, [checkProfileStatus]);

    const refetch = () => {
        // Force loading state only if we don't have a cache? 
        // No, refetch implies we want fresh data.
        return checkProfileStatus();
    };

    // Immediate local update (for when we know we just saved)
    const setProfileCompleteLocally = (val) => {
        setIsProfileComplete(val);
        if (user) {
            localStorage.setItem(`civix_profile_${user.id}`, val ? "true" : "false");
        }
    };

    return (
        <ProfileContext.Provider value={{
            isProfileComplete,
            isLoading,
            profileData,
            role,
            refetch,
            setProfileCompleteLocally
        }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfileContext = () => {
    const context = useContext(ProfileContext);
    if (!context) throw new Error("useProfileContext must be used within a ProfileProvider");
    return context;
};

export default ProfileContext;
