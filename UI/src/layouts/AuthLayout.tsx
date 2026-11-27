// src/layouts/AuthLayout.tsx

import React from 'react';
import { motion } from 'motion/react';
import { Coffee, ShoppingCart, Storefront, Translate } from '@phosphor-icons/react';
import { useApp } from '../store/AppContext';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { currentTenant, language, setLanguage } = useApp();
  const [logoError, setLogoError] = React.useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex justify-center items-start py-0 sm:py-6 overflow-x-hidden font-body">
      {/* PWA Phone Frame Simulator Wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full bg-[var(--color-bg)] min-h-screen sm:min-h-[720px] sm:my-auto sm:max-w-[var(--max-width)] sm:rounded-[34px] sm:border border-[var(--color-border)] shadow-[0_24px_60px_-12px_rgba(31,24,20,0.18)] relative flex flex-col justify-start overflow-hidden text-right"
        style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
      >
        {/* Signature Curved Mocha Hero Header */}
        <header
          className="relative text-white rounded-b-[36px] px-6 pt-5 pb-12 overflow-hidden shadow-[var(--shadow-lg)] select-none"
          style={{
            background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark, var(--color-primary)) 100%)',
          }}
        >
          {/* Floating Ambient Light Orb */}
          <div
            className="animate-hero-orb absolute -left-12 -top-10 w-44 h-44 rounded-full pointer-events-none"
            style={{ background: 'rgba(255, 255, 255, 0.07)' }}
          />

          {/* Top Bar: Clean Language Toggle */}
          <div className="relative z-10 flex items-center justify-end mb-4">
            <button
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <Translate size={14} weight="bold" />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
          </div>

          {/* Centered Cafe Emblem + Title (Outer rounded-[24px] - p-1 [4px] = Inner rounded-[20px]) */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              className="w-20 h-20 rounded-[24px] p-1 bg-white/15 backdrop-blur-md border border-white/25 shadow-xl flex items-center justify-center overflow-hidden"
            >
              {currentTenant.logo && !logoError ? (
                <img
                  src={currentTenant.logo}
                  alt={currentTenant.name}
                  onError={() => setLogoError(true)}
                  className="w-full h-full rounded-[20px] object-cover outline-1 -outline-offset-1 outline-white/20"
                />
              ) : (
                <div className="w-full h-full rounded-[20px] bg-white/15 flex items-center justify-center text-white">
                  {currentTenant.businessType === 'supermarket' ? (
                    <ShoppingCart size={34} weight="regular" />
                  ) : currentTenant.businessType === 'retail' ? (
                    <Storefront size={34} weight="regular" />
                  ) : (
                    <Coffee size={34} weight="regular" />
                  )}
                </div>
              )}
            </motion.div>

            <h1 className="text-[26px] font-black text-white tracking-tight mt-3.5 leading-tight">
              {currentTenant.name}
            </h1>
            <p className="text-[13px] font-medium text-white/80 max-w-[260px] mt-1 leading-relaxed text-balance">
              {currentTenant.tagline}
            </p>
          </div>
        </header>

        {/* Overlapping Modern Form Sheet */}
        <main className="-mt-7 px-5 pb-6 relative z-20 flex-1 flex flex-col justify-between gap-6">
          <div>{children}</div>

          {/* Subtle Copyright Footer */}
          <div className="text-center py-2 select-none">
            <span className="text-[10px] tracking-widest uppercase font-semibold text-[var(--color-text-light)] opacity-60">
              Developed by MO2 © 2026
            </span>
          </div>
        </main>
      </motion.div>
    </div>
  );
};
