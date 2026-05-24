import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import type { Role } from '../../types';

interface RoleGuardProps {
  allowedRoles: Role[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const role = useAuthStore((state) => state.user?.role);
  const logout = useAuthStore((state) => state.logout);

  const isAllowed = Boolean(role && allowedRoles.includes(role));

  useEffect(() => {
    if (!isAllowed) {
      logout();
    }
  }, [isAllowed, logout]);

  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
