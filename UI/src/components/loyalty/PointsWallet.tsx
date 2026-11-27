// src/components/loyalty/PointsWallet.tsx

import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { Button } from '../ui/Button';
import { QrCode, Gift, List, Receipt, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import QRCodeLib from 'qrcode';
import { Barcode128 } from '../ui/Barcode128';

const QRCanvas: React.FC<{ value: string; size?: number; fgColor?: string }> = ({
  value,
  size = 160,
  fgColor = '#6b4a35',
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvasRef.current || !value) return;
    let resolvedColor = fgColor;
    if (fgColor.startsWith('var(')) {
      resolvedColor =
        getComputedStyle(document.documentElement)
          .getPropertyValue(fgColor.slice(4, -1))
          .trim() || '#6b4a35';
    }
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      color: { dark: resolvedColor, light: '#ffffff' },
      margin: 1,
    }).catch(console.error);
  }, [value, size, fgColor]);

  return <canvas ref={canvasRef} width={size} height={size} className="mx-auto block" />;
};

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose }) => {
  const { user, t } = useApp();
  const cardCodeValue = user?.cardNumber || user?.phone || 'MO2-00000000';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[var(--space-4)]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/60 backdrop-blur-[3px]"
          />

          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="relative z-10 w-full max-w-[340px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-[var(--space-5)] shadow-2xl flex flex-col items-center gap-[var(--space-4)] text-center select-none"
          >
            <div className="w-full flex justify-between items-center border-b border-[var(--color-border)] pb-3">
              <span className="text-[var(--text-md)] font-extrabold text-[var(--color-text)]">
                {t('home.customerCode')}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-pointer transition-colors"
                aria-label={t('home.closeCode')}
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">
              {t('home.codeDescription')}
            </p>

            <div className="bg-white border-2 border-[var(--color-primary)] p-[var(--space-4)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] flex flex-col items-center gap-[var(--space-3)] w-full">
              <div className="p-1 bg-white">
                <QRCanvas value={cardCodeValue} size={150} fgColor="var(--color-primary)" />
              </div>

              <div className="w-full border-t border-stone-200 pt-2 flex flex-col items-center">
                <Barcode128 value={cardCodeValue} height={42} showLabel={false} />
              </div>

              <div className="flex flex-col gap-0.5 select-all">
                <span className="text-[10px] font-bold text-stone-400">{t('home.cardNumberLabel')}</span>
                <span className="code-display text-[var(--text-md)] font-bold tracking-[0.14em] text-stone-800">
                  {cardCodeValue}
                </span>
                <span className="text-[11px] text-stone-400 font-medium">{t('home.validFor')}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="md"
              onClick={onClose}
              className="mt-1 border-[var(--color-border)] text-[var(--color-text)] font-bold py-2.5 hover:bg-[var(--color-primary-soft)]"
            >
              <span>{t('home.closeCode')}</span>
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface PointsWalletProps {
  onShowScannerCode?: () => void;
}

export const PointsWallet: React.FC<PointsWalletProps> = ({ onShowScannerCode }) => {
  const { currentTenant, user, points, rewards, setActiveTab, t } = useApp();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [displayPoints, setDisplayPoints] = useState(points);

  // Smooth count-up animation when balance loads or updates
  useEffect(() => {
    let rafId: number;
    const start = 0;
    const duration = 550;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPoints(Math.round(start + (points - start) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [points]);

  // Compute nearest next reward for hero subtitle
  const nextReward = [...rewards]
    .filter((r) => r.pointsRequired > points)
    .sort((a, b) => a.pointsRequired - b.pointsRequired)[0];

  const fallbackReward = [...rewards].sort((a, b) => b.pointsRequired - a.pointsRequired)[0];
  const targetTitle = nextReward?.title || fallbackReward?.title || t('home.defaultReward');
  const pointsLeft = nextReward ? Math.max(nextReward.pointsRequired - points, 0) : 0;

  const firstName = (user?.name || t('home.guestName')).split(' ')[0];
  const brandInitial = currentTenant?.name?.trim()?.slice(0, 1) || 'أ';

  const handleOpenCode = () => {
    if (onShowScannerCode) {
      onShowScannerCode();
    } else {
      setScannerOpen(true);
    }
  };

  return (
    <div className="relative select-none">
      {/* Curved Espresso Hero Card */}
      <div
        className="relative text-white rounded-b-[36px] px-[var(--space-5)] pt-5 pb-16 overflow-hidden shadow-[var(--shadow-lg)]"
        style={{
          background: 'linear-gradient(160deg, var(--color-primary) 0%, var(--color-primary-dark, var(--color-primary)) 100%)',
        }}
      >
        {/* Subtle floating radial decorative orb */}
        <div
          className="animate-hero-orb absolute -left-14 top-14 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'rgba(255, 255, 255, 0.07)' }}
        />
        <div
          className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full pointer-events-none"
          style={{ background: 'rgba(255, 255, 255, 0.05)' }}
        />

        {/* Top Bar: Avatar + Greeting + Cafe Title + Tier Pill */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full bg-white text-[var(--color-primary)] font-extrabold text-[19px] flex items-center justify-center shrink-0 shadow-sm bg-cover bg-center"
              style={currentTenant.logo ? { backgroundImage: `url(${currentTenant.logo})` } : undefined}
            >
              {!currentTenant.logo && brandInitial}
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[12.5px] font-medium text-white/85 leading-tight">
                {t('home.greeting', { name: firstName })}
              </span>
              <span className="text-[19px] font-extrabold text-white tracking-tight leading-snug">
                {currentTenant.name}
              </span>
            </div>
          </div>

          <span className="bg-white/20 backdrop-blur-sm border border-white/25 text-white text-[12.5px] font-bold px-3.5 py-1.5 rounded-full shrink-0">
            ★ {user?.loyaltyTier || 'عضو ذهبي'}
          </span>
        </div>

        {/* Center Balance Display */}
        <div className="relative z-10 text-center mt-5">
          <p className="text-[13.5px] font-semibold text-white/85">
            {t('home.points')}
          </p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="points-value text-[58px] font-extrabold text-white leading-[1.08] mt-1 tracking-tight"
          >
            {displayPoints.toLocaleString('en-US')}
          </motion.div>
          <p className="text-[13.5px] font-semibold text-white/90 mt-1.5">
            {nextReward
              ? t('home.remainingToNext', {
                  points: pointsLeft.toLocaleString('en-US'),
                  reward: targetTitle,
                })
              : t('home.unlockedNext', { reward: targetTitle })}
          </p>
          {((user?.walletValueEgp && user.walletValueEgp > 0) || (user?.totalSavedEgp && user.totalSavedEgp > 0)) ? (
            <div className="mt-2.5 flex items-center justify-center gap-2 flex-wrap">
              {user?.walletValueEgp !== undefined && user.walletValueEgp > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[11.5px] font-bold text-white number">
                  {t('home.walletValue', { amount: user.walletValueEgp.toLocaleString('en-US') })}
                </span>
              )}
              {user?.totalSavedEgp !== undefined && user.totalSavedEgp > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-200/35 text-[11.5px] font-bold text-white number">
                  {t('home.totalSaved', { amount: user.totalSavedEgp.toLocaleString('en-US') })}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Overlapping 3 Quick-Action Tiles */}
      <div className="relative z-20 grid grid-cols-3 gap-3 px-[var(--space-5)] -mt-10">
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.2 }}
          onClick={handleOpenCode}
          className="h-[92px] rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-primary)] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <span className="w-11 h-11 rounded-[14px] bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center">
            <QrCode size={22} weight="bold" />
          </span>
          <span className="text-[14px] font-bold text-[var(--color-text)]">
            {t('home.tileCode')}
          </span>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.2 }}
          onClick={() => setActiveTab('rewards')}
          className="h-[92px] rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-primary)] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <span className="w-11 h-11 rounded-[14px] bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center">
            <Gift size={22} weight="bold" />
          </span>
          <span className="text-[14px] font-bold text-[var(--color-text)]">
            {t('home.tileRewards')}
          </span>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.2 }}
          onClick={() => setActiveTab(currentTenant.showMenu === false ? 'history' : 'menu')}
          className="h-[92px] rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-primary)] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <span className="w-11 h-11 rounded-[14px] bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center">
            {currentTenant.showMenu === false ? (
              <Receipt size={22} weight="bold" />
            ) : (
              <List size={22} weight="bold" />
            )}
          </span>
          <span className="text-[14px] font-bold text-[var(--color-text)]">
            {currentTenant.showMenu === false
              ? t('home.tileHistory')
              : currentTenant.businessType === 'supermarket'
              ? t('home.tileOffers')
              : t('home.tileMenu')}
          </span>
        </motion.button>
      </div>

      {!onShowScannerCode && (
        <ScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />
      )}
    </div>
  );
};
