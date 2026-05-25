import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import type { Role } from '../../types';

interface RoleGuardProps {
  allowedRoles: Role[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const role = useAuthStore((state) => state.user?.role);

  const isAllowed = Boolean(role && allowedRoles.includes(role));

  if (!isAllowed) {
    return <Navigate to="/store" replace />;
  }

  return <Outlet />;
};
