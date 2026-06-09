// src/layouts/AppLayout.tsx

import React from 'react';
import { useApp } from '../store/AppContext';
import { House, Gift, Receipt, User, List } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

const PulseDot: React.FC = () => (
  <span className="relative inline-flex h-2 w-2 ml-1">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
  </span>
);

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { 
    currentTenant, 
    activeTab, 
    setActiveTab,
    setCurrentSubPage,
    setSelectedReward,
    setActiveRedemption,
    logout,
    t
  } = useApp();

  const navItems = [
    { id: 'home' as const, label: t('nav.home'), icon: House },
    { id: 'menu' as const, label: t('nav.menu'), icon: List },
    { id: 'rewards' as const, label: t('nav.rewards'), icon: Gift },
    { id: 'history' as const, label: t('nav.history'), icon: Receipt },
    { id: 'profile' as const, label: t('nav.profile'), icon: User },
  ];

  const handleTabChange = (tabId: 'home' | 'menu' | 'rewards' | 'history' | 'profile') => {
    setActiveTab(tabId);
    setCurrentSubPage('main');
    setSelectedReward(null);
    setActiveRedemption(null);
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] flex justify-center items-center py-0 sm:py-6 overflow-x-hidden font-body">
      {/* PWA Phone Frame Simulator Wrapper constraint */}
      <div 
        className="w-full bg-[var(--color-bg)] min-h-[100dvh] sm:min-h-[820px] sm:max-w-[var(--max-width)] sm:rounded-[var(--radius-xl)] sm:border border-[var(--color-border)] shadow-2xl relative flex flex-col overflow-hidden pb-[var(--bottom-nav)]"
        style={{ direction: 'rtl' }}
      >
        {/* Top Header toolbar element */}
        <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-4)] flex items-center justify-between shadow-[var(--shadow-sm)]" style={{ height: 'calc(var(--nav-height) + 8px)' }}>
          <div className="flex items-center gap-[var(--space-3)]">
            <div 
              className="w-10 h-10 rounded-xl bg-cover bg-center shrink-0 border border-[var(--color-border)] shadow-sm"
              style={{ backgroundImage: `url(${currentTenant.logo})` }}
            />
            <div className="flex flex-col text-right">
              <span className="text-[var(--text-md)] font-black text-[var(--color-text)] leading-tight tracking-tight">
                {currentTenant.name}
              </span>
              <span className="text-[9px] tracking-widest font-bold text-[var(--color-text-light)] uppercase">
                Loyalty Program
              </span>
            </div>
          </div>

        </header>

        {/* Content canvas */}
        <main className="flex-1 overflow-y-auto px-[var(--space-5)] py-[var(--space-5)]">
          {children}
        </main>

        {/* 10. Fixed Bottom Navigation tab bar */}
        <nav 
          className="absolute bottom-0 left-0 right-0 z-30 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-between items-center select-none"
          style={{ height: 'var(--bottom-nav)' }}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className="flex-1 h-full flex flex-col justify-center items-center gap-1 transition-colors relative cursor-pointer"
                style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-light)' }}
              >
                {/* Visual Accent bubble under active tab */}
                {isActive && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute top-0 w-12 h-[3px] rounded-b-full bg-[var(--color-primary)]"
                    transition={{ type: 'spring' as const, stiffness: 100, damping: 20 }}
                  />
                )}
                
                <IconComponent size={20} className={`transition-transform duration-[var(--transition-fast)] ${isActive ? 'scale-110' : 'scale-100'}`} />
                <span className={`text-[11px] font-bold ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
          
          {/* MO2 branding */}
          <div className="absolute bottom-0 left-0 right-0 text-center pb-0.5 pointer-events-none">
            <span className="text-[8px] tracking-widest uppercase font-semibold text-[var(--color-text-light)] opacity-30">
              MO2
            </span>
          </div>
        </nav>
      </div>
    </div>
  );
};
