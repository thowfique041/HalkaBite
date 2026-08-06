import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import type { RootState } from '../../store/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'user' | 'admin' | 'restaurant' | 'delivery'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAppSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authentication is restored from local storage before /auth/me finishes.
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading account...</div>;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
