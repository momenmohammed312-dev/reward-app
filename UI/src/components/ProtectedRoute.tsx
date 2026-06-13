import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'admin' | 'cashier' | 'superadmin';
}

const ROLE_TOKEN_MAP = {
  admin: 'loyalty_admin_token',
  cashier: 'loyalty_admin_token',
  superadmin: 'loyalty_superadmin_token',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isTokenExpired(payload: Record<string, unknown>): boolean {
  if (!payload.exp) return false;
  return Date.now() >= (payload.exp as number) * 1000;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const tokenKey = ROLE_TOKEN_MAP[requiredRole];
  const token = localStorage.getItem(tokenKey);

  if (!token) {
    const loginPath = requiredRole === 'superadmin' ? '/superadmin/login' : '/admin/login';
    return <Navigate to={loginPath} replace />;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    localStorage.removeItem(tokenKey);
    const loginPath = requiredRole === 'superadmin' ? '/superadmin/login' : '/admin/login';
    return <Navigate to={loginPath} replace />;
  }

  if (isTokenExpired(payload)) {
    localStorage.removeItem(tokenKey);
    const loginPath = requiredRole === 'superadmin' ? '/superadmin/login' : '/admin/login';
    return <Navigate to={loginPath} replace />;
  }

  if (requiredRole === 'superadmin' && payload.role !== 'superadmin') {
    localStorage.removeItem(tokenKey);
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};
