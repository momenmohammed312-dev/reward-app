// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'admin' | 'cashier' | 'superadmin';
}

const ROLE_TOKEN_MAP = {
  admin: 'loyalty_admin_token',
  cashier: 'loyalty_admin_token', // نفس token بـ role مختلف في الـ JWT
  superadmin: 'loyalty_superadmin_token',
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const tokenKey = ROLE_TOKEN_MAP[requiredRole];
  const token = localStorage.getItem(tokenKey);

  if (!token) {
    const loginPath = requiredRole === 'superadmin' ? '/superadmin/login' : '/admin/login';
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
};
