import { useUser } from '@clerk/clerk-react';
import { useLocation, Navigate } from 'react-router-dom';

const RequireAdmin = ({ children }) => {
  const { user, isLoaded, isSignedIn } = useUser();
  const location = useLocation();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user.publicMetadata?.role;

  return role === 'admin' ? children : <Navigate to="/home" replace />;
};

export default RequireAdmin;
