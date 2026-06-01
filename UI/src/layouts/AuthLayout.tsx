// src/layouts/AuthLayout.tsx

import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../store/AppContext';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { currentTenant } = useApp();
  const [logoError, setLogoError] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center py-0 sm:py-6 overflow-x-hidden font-body">
      {/* PWA Phone Frame Simulator Wrapper constraint */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full bg-[var(--color-bg)] min-h-screen sm:min-h-[820px] max-w-[var(--max-width)] sm:rounded-[var(--radius-xl)] sm:border border-[var(--color-border)] shadow-2xl relative flex flex-col justify-start overflow-hidden px-[var(--space-6)] pt-10 pb-6 text-right gap-8"
        style={{ direction: 'rtl' }}
      >
        {/* Smart Logo Block */}
        <div className="flex flex-col items-center gap-3 select-none">
          {currentTenant.logo && !logoError ? (
            <img
              src={currentTenant.logo}
              alt={currentTenant.name}
              onError={() => setLogoError(true)}
              className="w-[72px] h-[72px] rounded-2xl object-cover shadow-md border-2 border-[var(--color-surface)] ring-4 ring-[var(--color-primary-soft)]"
            />
          ) : (
            // Fallback SVG icon — coffee cup brand mark
            <div className="w-[72px] h-[72px] rounded-2xl bg-[var(--color-primary-soft)] border-2 border-[var(--color-surface)] ring-4 ring-[var(--color-primary-soft)] flex items-center justify-center shadow-md">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 10h20v2H8zM9 12h18l-2 14H11L9 12zM26 14h2a3 3 0 010 6h-2" 
                      stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 28h12" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )}

          <div className="flex flex-col items-center gap-0.5">
            <h1 className="text-2xl font-black text-[var(--color-text)] tracking-tight leading-none">
              {currentTenant.name}
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] opacity-70 text-center max-w-[240px] leading-relaxed">
              {currentTenant.tagline}
            </p>
          </div>
        </div>

        {/* Main interactive form */}
        <main className="z-10">
          {children}
        </main>

        {/* Footer info */}
        <div className="text-center py-2 select-none mt-auto">
          <span className="text-[9px] tracking-widest uppercase font-semibold text-[var(--color-text-light)] opacity-50">
            Developed by MO2 CAPITAL © 2026
          </span>
        </div>
      </motion.div>
    </div>
  );
};
