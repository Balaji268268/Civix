import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import useProfileStatus from '../../hooks/useProfileStatus';
import { Loader2 } from 'lucide-react';

const RequireProfile = ({ children }) => {
    // Enforcement Disabled by User Request
    return children;
};

export default RequireProfile;
