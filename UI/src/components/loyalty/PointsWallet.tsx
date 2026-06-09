// src/components/loyalty/PointsWallet.tsx

import React, { useEffect, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardBody } from '../ui/Card';
import { Trophy, QrCode, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

import QRCodeLib from 'qrcode';

const QRCanvas: React.FC<{ value: string; size?: number; fgColor?: string }> = ({
  value,
  size = 160,
  fgColor = '#000000',
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      color: { dark: fgColor, light: '#ffffff' },
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
  const phoneValue = user?.phone || '01012345678';
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[var(--space-4)]">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
          />
          
          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring' as const, stiffness: 100, damping: 20 }}
            className="relative z-10 w-full max-w-[340px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-[var(--space-5)] shadow-2xl flex flex-col items-center gap-[var(--space-4)] text-center select-none"
          >
            {/* Header / Dismiss */}
            <div className="w-full flex justify-between items-center border-b border-[var(--color-border)] pb-3">
              <span className="text-[var(--text-sm)] font-bold text-[var(--color-text)] font-sans">
                {t('home.customerCode')}
              </span>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-pointer"
                aria-label={t('home.closeCode')}
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Subtext description */}
            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              {t('home.codeDescription')}
            </p>

            {/* QR Card container */}
            <div className="bg-white border-2 border-[var(--color-primary)] p-[var(--space-4)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] flex flex-col items-center gap-[var(--space-3)] w-full">
              <div className="p-1 bg-white">
                <QRCanvas value={phoneValue} size={160} fgColor="var(--color-primary)" />
              </div>

              {/* Readable code number layout */}
              <div className="flex flex-col gap-0.5 select-all">
                <span className="code-display text-[var(--text-md)] font-bold tracking-[0.2em] font-mono text-slate-800">
                  {phoneValue ? phoneValue.slice(-7) : '0129482'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{t('home.validFor')}</span>
              </div>
            </div>

            {/* Close action */}
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
  const { currentTenant, user, points, t } = useApp();

  return (
    <Card className="relative overflow-hidden border border-[var(--color-border)] hover:shadow-[var(--shadow-md)] p-1 bg-[var(--color-surface)]">
      {/* Premium Double Bezel Layer */}
      <div className="border border-dashed border-[var(--color-primary-soft)] rounded-[calc(var(--radius-lg)-4px)] p-[var(--space-4)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-bg)] flex flex-col gap-[var(--space-4)]">
        
        {/* Top brand header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[var(--space-3)]">
            <div 
              className="w-10 h-10 rounded-[var(--radius-md)] bg-cover bg-center border border-[var(--color-border)] shadow-sm shrink-0"
              style={{ backgroundImage: `url(${currentTenant.logo})` }}
            />
            <div className="flex flex-col text-right">
              <span className="text-[var(--text-md)] font-bold text-[var(--color-text)]">
                {currentTenant.name}
              </span>
              <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] line-clamp-1">
                {currentTenant.tagline}
              </span>
            </div>
          </div>
          
          <Badge variant="accent" className="px-2.5 py-1 text-[var(--text-xs)] flex items-center gap-1 font-bold">
            <Trophy size={14} weight="fill" />
            <span>{user?.loyaltyTier || ''}</span>
          </Badge>
        </div>

        {/* Big Points counter widget */}
        <div className="flex flex-col items-center justify-center py-[var(--space-1)] text-center">
          <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] font-medium mb-1">
            {t('home.points')}
          </span>
          <div className="flex items-baseline gap-2 direction-ltr justify-center">
            <motion.span 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
transition={{ type: 'spring' as const, stiffness: 100, damping: 20 }}
              className="points-value text-[var(--text-3xl)] font-semibold text-[var(--color-primary)] tracking-wide leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {points}
            </motion.span>
            <span className="text-[var(--text-sm)] font-bold text-[var(--color-text-muted)]">
              {t('pointsLabel')}
            </span>
          </div>
        </div>

        {/* Access barcode CTA */}
        {onShowScannerCode && (
          <Button 
            variant="ghost" 
            size="md" 
            onClick={onShowScannerCode}
            className="w-full flex items-center justify-center gap-2 border-[var(--color-primary)] text-[var(--color-primary)] font-bold py-3 transition-colors hover:bg-[var(--color-primary-soft)]"
          >
            <QrCode size={18} weight="bold" />
            <span>{t('home.scannerCode')}</span>
          </Button>
        )}
      </div>
    </Card>
  );
};
