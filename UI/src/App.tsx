import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import AdminAuthPage from './pages/AdminAuthPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { CashierDashboard } from './pages/CashierDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import CustomerApp from './CustomerApp';

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

        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <div className="min-h-screen bg-slate-950 flex flex-col font-body p-6">
              <AdminDashboard />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/cashier" element={
          <ProtectedRoute requiredRole="cashier">
            <div className="min-h-screen bg-slate-950 flex flex-col font-body p-6">
              <CashierDashboard />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/superadmin" element={
          <ProtectedRoute requiredRole="superadmin">
            <div className="min-h-screen bg-slate-950 flex flex-col font-body p-6">
              <SuperAdminDashboard />
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
