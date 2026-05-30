// src/layouts/AuthLayout.tsx

import React from 'react';
import { useApp } from '../store/AppContext';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { currentTenant } = useApp();

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center py-0 sm:py-6 overflow-x-hidden font-body">
      {/* PWA Phone Frame Simulator Wrapper constraint */}
      <div 
        className="w-full bg-[var(--color-bg)] min-h-screen sm:min-h-[820px] max-w-[var(--max-width)] sm:rounded-[var(--radius-xl)] sm:border border-[var(--color-border)] shadow-2xl relative flex flex-col justify-between overflow-hidden p-[var(--space-6)] text-right"
        style={{ direction: 'rtl' }}
      >
        {/* Top Branding Section */}
        <div className="flex flex-col items-center gap-[var(--space-4)] mt-[var(--space-6)] select-none">
          <div 
            className="w-20 h-20 rounded-[var(--radius-xl)] bg-cover bg-center shadow-[var(--shadow-md)] border-2 border-[var(--color-surface)] ring-4 ring-[var(--color-primary-soft)] animate-fade-in"
            style={{ backgroundImage: `url(${currentTenant.logo})` }}
          />
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-[var(--text-xl)] font-bold text-[var(--color-text)] tracking-tight">
              {currentTenant.name}
            </h1>
            <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] text-center max-w-[280px]">
              {currentTenant.tagline}
            </p>
          </div>
        </div>

        {/* Main interactive form */}
        <main className="flex-1 flex flex-col justify-center my-6 z-10">
          {children}
        </main>

        {/* Footer info */}
        <div className="text-center text-[var(--text-xs)] text-[var(--color-text-light)] py-2 select-none">
          <span>نظام ولاء العملاء السحابي © ٢٠٢٦</span>
        </div>
      </div>
    </div>
  );
};
