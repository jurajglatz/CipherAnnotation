/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'User' | 'Admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/documents" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
