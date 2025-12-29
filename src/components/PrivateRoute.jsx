import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import csrfManager from '../utils/csrfManager';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { isSignedIn, user, isLoaded } = useUser();
  const [role, setRole] = useState(null);
  const [isRoleLoaded, setIsRoleLoaded] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (isSignedIn && user) {
        try {
          // First check metadata as a fallback or optimization
          let currentRole = user.publicMetadata?.role;

          // Then try to fetch from backend for the source of truth
          if (!currentRole || currentRole === 'user') {
            const response = await csrfManager.secureFetch(`http://localhost:5000/api/profile/${user.id}`);
            if (response.ok) {
              const data = await response.json();
              if (data.role) {
                currentRole = data.role;
              }
            }
          }
          setRole(currentRole || 'user');
        } catch (error) {
          console.error("Failed to fetch user role from backend", error);
          setRole(user.publicMetadata?.role || 'user');
        } finally {
          setIsRoleLoaded(true);
        }
      } else if (isLoaded && !isSignedIn) {
        setIsRoleLoaded(true); // Stop loading if not signed in
      }
    };

    if (isLoaded) {
      fetchUserRole();
    }
  }, [isSignedIn, user, isLoaded]);

  if (!isLoaded || !isRoleLoaded) return <div className="p-10 text-center text-gray-500">Initializing Access...</div>;

  // 🔐 If user not signed in, redirect to login
  if (!isSignedIn) {
    return <Navigate to="/login" />;
  }

  // ✅ Default to 'user' if role is undefined
  const finalRole = role || "user";
  console.log("🔍 Authenticated User Role:", finalRole);

  // ✅ Check role against allowedRoles
  if (!allowedRoles || allowedRoles.includes(finalRole)) {
    return children;
  }

  // ❌ Role not allowed → redirect to /unauthorized (or home)
  return <Navigate to="/home" replace />; // Redirecting to home instead of unauthorized for better UX
};

export default PrivateRoute;
