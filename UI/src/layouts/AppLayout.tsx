// src/layouts/AppLayout.tsx

import React from 'react';
import { useApp } from '../store/AppContext';
import { House, Gift, Receipt, User, ArrowClockwise, Storefront, CaretDown, List } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { 
    currentTenant, 
    tenants, 
    selectTenant, 
    loadingTenant, 
    activeTab, 
    setActiveTab,
    setCurrentSubPage,
    setSelectedReward,
    setActiveRedemption,
    logout
  } = useApp();

  const navItems = [
    { id: 'home' as const, label: 'الرئيسية', icon: House },
    { id: 'menu' as const, label: 'القائمة', icon: List },
    { id: 'rewards' as const, label: 'مكافآتي', icon: Gift },
    { id: 'history' as const, label: 'سجل حركاتي', icon: Receipt },
    { id: 'profile' as const, label: 'حسابي', icon: User },
  ];

  const handleTabChange = (tabId: 'home' | 'menu' | 'rewards' | 'history' | 'profile') => {
    setActiveTab(tabId);
    setCurrentSubPage('main');
    setSelectedReward(null);
    setActiveRedemption(null);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex justify-center items-center py-0 sm:py-6 overflow-x-hidden font-body">
      {/* PWA Phone Frame Simulator Wrapper constraint */}
      <div 
        className="w-full bg-[var(--color-bg)] min-h-[100dvh] sm:min-h-[820px] max-w-[var(--max-width)] sm:rounded-[var(--radius-xl)] sm:border border-[var(--color-border)] shadow-2xl relative flex flex-col overflow-hidden pb-[var(--bottom-nav)]"
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

          {/* Quick Dynamic Brand Switcher for the SaaS Sandbox */}
          {import.meta.env.DEV && (
            <div className="flex items-center gap-1">
              <label htmlFor="tenant-select" className="sr-only">Switch brand</label>
              <div className="relative">
                <select
                  id="tenant-select"
                  value={currentTenant.id}
                  onChange={(e) => selectTenant(e.target.value)}
                  disabled={loadingTenant}
                  className="appearance-none bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] py-1.5 pr-3 pl-7 rounded-[var(--radius-sm)] text-[11px] font-bold outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <CaretDown size={12} weight="bold" className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              </div>
              <Storefront size={14} className="text-[var(--color-text-muted)]" weight="duotone" />
            </div>
          )}
        </header>

        {/* Content canvas */}
        <main className="flex-1 overflow-y-auto px-[var(--space-5)] py-[var(--space-5)]">
          {loadingTenant ? (
            <div className="flex flex-col items-center justify-center gap-[var(--space-4)] h-[300px]">
              <ArrowClockwise size={32} className="text-[var(--color-primary)] animate-spin" />
              <span className="text-[var(--text-sm)] text-[var(--color-text-muted)] font-bold">جاري تبديل ثيم ونظام الـ POS...</span>
            </div>
          ) : (
            children
          )}
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
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
              MO2 CAPITAL
            </span>
          </div>
        </nav>
      </div>
    </div>
  );
};
