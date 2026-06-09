// src/CustomerApp.tsx
import React, { useState } from 'react';
import { useApp } from './store/AppContext';
import { AppLayout } from './layouts/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { RewardsPage } from './pages/RewardsPage';
import { RedeemPage } from './pages/RedeemPage';
import { RedemptionCode } from './components/loyalty/RedemptionCode';
import { MenuPage } from './pages/MenuPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { Toast } from './components/ui/Toast';
import { AnimatePresence, motion } from 'motion/react';

const CustomerApp: React.FC = () => {
  const { 
    isAuthenticated,
    activeTab, 
    currentSubPage, 
    setCurrentSubPage, 
    selectedReward, 
    activeRedemption,
    setActiveTab,
    setActiveRedemption,
    setSelectedReward,
    t
  } = useApp();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const handleRewardSelected = (reward: any) => {
    setSelectedReward(reward);
    setCurrentSubPage('redeem-detail');
  };

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-body w-full">
      <div className="flex-1 w-full flex justify-center items-start">
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
                {activeTab === 'menu' && <MenuPage />}
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
                transition={{ type: 'spring' as const, damping: 25, stiffness: 200 }}
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
                transition={{ type: 'spring' as const, damping: 20, stiffness: 180 }}
              >
                <RedemptionCode 
                  redemption={activeRedemption}
                  onBackToRewards={() => {
                    setCurrentSubPage('main');
                    setActiveTab('rewards');
                    setActiveRedemption(null);
                    setSelectedReward(null);
                  }}
                  onCopySuccess={() => triggerToast(t('customerApp.copied'), 'success')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </AppLayout>
      </div>

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

export default CustomerApp;
