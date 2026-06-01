// src/App.tsx

import React, { useState } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { AppLayout } from './layouts/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { RewardsPage } from './pages/RewardsPage';
import { RedeemPage } from './pages/RedeemPage';
import { RedemptionCode } from './components/loyalty/RedemptionCode';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { CashierDashboard } from './pages/CashierDashboard';
import { Toast } from './components/ui/Toast';
import { AnimatePresence, motion } from 'motion/react';
import { UserGear, Gear, User, CashRegister } from '@phosphor-icons/react';

// Wrapper core to leverage state context hooks
const MainAppContent: React.FC = () => {
  const { 
    isAuthenticated,
    activeTab, 
    currentSubPage, 
    setCurrentSubPage, 
    selectedReward, 
    activeRedemption,
    setActiveTab,
    setActiveRedemption,
    setSelectedReward
  } = useApp();

  // Simulated platform role: customer, admin, superadmin, cashier
  const [role, setRole] = useState<'customer' | 'admin' | 'superadmin' | 'cashier'>('customer');

  // Floating toast notifier state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const handleRewardSelected = (reward: any) => {
    setSelectedReward(reward);
    setCurrentSubPage('redeem-detail');
  };

  if (!isAuthenticated && role === 'customer') {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-body">
      {/* Global Simulator Hub Bar */}
      {import.meta.env.DEV && (
        <div className="w-full bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap gap-4 items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping"></span>
            <span className="text-xs font-black text-slate-300">محاكي منصة الولاء (SaaS Sandbox Hub)</span>
          </div>
          
          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setRole('customer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${role === 'customer' ? 'bg-[var(--color-primary)] text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <User size={14} />
              تطبيق العميل PWA
            </button>
            
            <button
              onClick={() => setRole('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${role === 'admin' ? 'bg-[var(--color-primary)] text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <UserGear size={14} />
              لوحة تحكم الكافيه
            </button>
            
            <button
              onClick={() => setRole('cashier')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${role === 'cashier' ? 'bg-[var(--color-primary)] text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <CashRegister size={14} />
              الكاشير
            </button>

            <button
              onClick={() => setRole('superadmin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${role === 'superadmin' ? 'bg-[var(--color-primary)] text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Gear size={14} />
              لوحة تحكم النظام
            </button>
          </div>
        </div>
      )}

      {/* Main Panel Canvas */}
      <div className="flex-1 w-full flex justify-center items-start">
        {role === 'customer' ? (
          <AppLayout>
            <AnimatePresence mode="wait">
              {currentSubPage === 'main' && (
                <motion.div
                  key={`tab-${activeTab}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'home' && <HomePage />}
                  {activeTab === 'rewards' && <RewardsPage onRedeemRewardTrigger={handleRewardSelected} />}
                  {activeTab === 'history' && <HistoryPage />}
                  {activeTab === 'profile' && <ProfilePage onShowToast={triggerToast} />}
                </motion.div>
              )}

              {currentSubPage === 'redeem-detail' && selectedReward && (
                <motion.div
                  key="redeem-details"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                  <RedeemPage 
                    reward={selectedReward} 
                    onBack={() => {
                      setCurrentSubPage('main');
                      setSelectedReward(null);
                    }}
                    onRedeemedSuccess={(redemption) => {
                      setActiveRedemption(redemption);
                      setCurrentSubPage('code-display');
                    }}
                    onShowToast={triggerToast}
                  />
                </motion.div>
              )}

              {currentSubPage === 'code-display' && activeRedemption && (
                <motion.div
                  key="code-details-display"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 180 }}
                >
                  <RedemptionCode 
                    redemption={activeRedemption}
                    onBackToRewards={() => {
                      setCurrentSubPage('main');
                      setActiveTab('rewards');
                      setActiveRedemption(null);
                      setSelectedReward(null);
                    }}
                    onCopySuccess={() => triggerToast('تم نسخ كود المكافأة بنجاح!', 'success')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </AppLayout>
        ) : (
          <div className="w-full max-w-7xl px-6 py-8">
            <AnimatePresence mode="wait">
              {role === 'admin' && (
                <motion.div
                  key="admin-dashboard-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  <AdminDashboard />
                </motion.div>
              )}
              {role === 'superadmin' && (
                <motion.div
                  key="superadmin-dashboard-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  <SuperAdminDashboard />
                </motion.div>
              )}
              {role === 'cashier' && (
                <motion.div
                  key="cashier-dashboard-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  <CashierDashboard />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Global floating notification system */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
