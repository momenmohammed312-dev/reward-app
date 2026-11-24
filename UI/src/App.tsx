import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import AdminAuthPage from './pages/AdminAuthPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { CashierDashboard } from './pages/CashierDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import CustomerApp from './CustomerApp';
import PitchPresentationPage from './pages/PitchPresentationPage';
import { AdminLayout } from './layouts/AdminLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer PWA — الرابط الرئيسي */}
        <Route path="/*" element={
          <AppProvider>
            <CustomerApp />
          </AppProvider>
        } />

        {/* Admin Auth Pages */}
        <Route path="/admin/login" element={<AdminAuthPage role="admin" />} />
        <Route path="/cashier/login" element={<AdminAuthPage role="cashier" />} />
        <Route path="/superadmin/login" element={<AdminAuthPage role="superadmin" />} />

        {/* Interactive Client Pitch Landing Page */}
        <Route path="/pitch" element={<PitchPresentationPage />} />

        {/* Protected Admin Routes with Layout */}
        <Route path="/admin" element={
          <AppProvider>
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          </AppProvider>
        } />
        <Route path="/cashier" element={
          <ProtectedRoute requiredRole="cashier">
            <div className="min-h-screen bg-[var(--color-admin-bg)] flex flex-col font-body p-6">
              <CashierDashboard />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/superadmin" element={
          <AppProvider>
            <ErrorBoundary>
            <ProtectedRoute requiredRole="superadmin">
              <div className="min-h-screen bg-[var(--color-admin-bg)] flex flex-col font-body p-6">
                <SuperAdminDashboard />
              </div>
            </ProtectedRoute>
            </ErrorBoundary>
          </AppProvider>
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
