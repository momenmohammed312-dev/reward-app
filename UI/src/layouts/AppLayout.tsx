// src/layouts/AppLayout.tsx

import React from 'react';
import { useApp } from '../store/AppContext';
import { House, Gift, Receipt, User, List } from '@phosphor-icons/react';
import { motion } from 'motion/react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const {
    currentTenant,
    activeTab,
    currentSubPage,
    setActiveTab,
    setCurrentSubPage,
    setSelectedReward,
    setActiveRedemption,
    language,
    t,
  } = useApp();

  const navItems = [
    { id: 'home' as const, label: t('nav.home'), icon: House },
    ...(currentTenant.showMenu !== false
      ? [
          {
            id: 'menu' as const,
            label:
              currentTenant.businessType === 'supermarket' || currentTenant.businessType === 'retail'
                ? t('nav.offers')
                : t('nav.menu'),
            icon: List,
          },
        ]
      : []),
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

  // On Home main view, the curved Cafe Hero extends cleanly from the top edge
  const isHomeHeroView = activeTab === 'home' && currentSubPage === 'main';

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] flex justify-center items-center py-0 sm:py-6 overflow-x-hidden font-body">
      <div
        className="w-full bg-[var(--color-bg)] min-h-[100dvh] sm:min-h-[844px] sm:max-w-[var(--max-width)] sm:rounded-[36px] sm:border border-[var(--color-border)] shadow-2xl relative flex flex-col overflow-hidden pb-[var(--bottom-nav)]"
        style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
      >
        {/* Top Header for non-hero tabs & subpages */}
        {!isHomeHeroView && (
          <header
            className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-3)] flex items-center justify-between shadow-[var(--shadow-sm)]"
            style={{ height: 'var(--nav-height)' }}
          >
            <div className="flex items-center gap-[var(--space-3)]">
              <div
                className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white font-extrabold text-lg flex items-center justify-center shrink-0 border border-[var(--color-border)] shadow-sm bg-cover bg-center"
                style={currentTenant.logo ? { backgroundImage: `url(${currentTenant.logo})` } : undefined}
              >
                {!currentTenant.logo && currentTenant.name?.slice(0, 1)}
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[var(--text-md)] font-extrabold text-[var(--color-text)] leading-tight tracking-tight">
                  {currentTenant.name}
                </span>
                <span className="text-[10px] tracking-wider font-semibold text-[var(--color-text-muted)] uppercase">
                  {t('brand.tagline')}
                </span>
              </div>
            </div>
          </header>
        )}

        {/* Content canvas */}
        <main className={`flex-1 overflow-y-auto ${isHomeHeroView ? 'p-0' : 'px-[var(--space-5)] py-[var(--space-5)]'}`}>
          {children}
        </main>

        {/* Fixed Bottom Navigation tab bar */}
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
                style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute top-0 w-7 h-[3px] rounded-b-full bg-[var(--color-primary)]"
                    transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  />
                )}

                <IconComponent
                  size={22}
                  weight={isActive ? 'fill' : 'regular'}
                  className={`transition-transform duration-[var(--transition-fast)] ${isActive ? 'scale-105' : 'scale-100'}`}
                />
                <span className={`text-[11.5px] ${isActive ? 'font-extrabold text-[var(--color-primary)]' : 'font-semibold text-[var(--color-text-muted)]'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
