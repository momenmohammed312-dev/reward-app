// src/components/loyalty/RedemptionCode.tsx

import React, { useState, useEffect, useRef } from 'react';
import { RedeemedReward } from '../../types';
import { useApp } from '../../store/AppContext';
import { Clock, Check, ArrowsCounterClockwise, Phone, Copy } from '@phosphor-icons/react';
import { Card, CardBody, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { motion } from 'motion/react';

interface QRCanvasProps {
  value: string;
  size?: number;
  fgColor?: string;
}

export const QRCanvas: React.FC<QRCanvasProps> = ({ 
  value, 
  size = 180, 
  fgColor = 'var(--color-primary)' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      const qr = (window as any).qrcode;
      if (!qr) {
        console.warn('qrcode-generator is not loaded yet');
        return;
      }
      
      const q = qr(0, 'M');
      q.addData(value);
      q.make();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const moduleCount = q.getModuleCount();
      const cellSize = size / moduleCount;
      
      canvas.width = size;
      canvas.height = size;
      
      ctx.clearRect(0, 0, size, size);
      
      let strokeColor = fgColor;
      if (fgColor.startsWith('var(')) {
        strokeColor = getComputedStyle(canvas).getPropertyValue(fgColor.slice(4, -1)).trim() || '#000000';
      }
      
      ctx.fillStyle = strokeColor;
      
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (q.isDark(r, c)) {
            ctx.fillRect(
              Math.floor(c * cellSize), 
              Math.floor(r * cellSize), 
              Math.ceil(cellSize), 
              Math.ceil(cellSize)
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to render QR Code', err);
    }
  }, [value, size, fgColor]);

  return <canvas ref={canvasRef} className="mx-auto rounded-md block" style={{ width: size, height: size }} />;
};

interface RedemptionCodeProps {
  redemption: RedeemedReward;
  onBackToRewards: () => void;
  onCopySuccess: () => void;
}

export const RedemptionCode: React.FC<RedemptionCodeProps> = ({
  redemption,
  onBackToRewards,
  onCopySuccess
}) => {
  const { markCodeAsUsed, currentTenant, t } = useApp();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expires = new Date(redemption.expiresAt).getTime();
      const now = new Date().getTime();
      return Math.max(0, Math.floor((expires - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [redemption]);

  const formatTimer = (secondsTotal: number) => {
    const hours = Math.floor(secondsTotal / 3600);
    const mins = Math.floor((secondsTotal % 3600) / 60);
    const secs = secondsTotal % 60;
    
    const mStr = mins.toString().padStart(2, '0');
    const sStr = secs.toString().padStart(2, '0');
    
    if (hours > 0) {
      return `${hours}:${mStr}:${sStr}`;
    }
    return `${mStr}:${sStr}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(redemption.code);
    setCopied(true);
    onCopySuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseCodeSimulate = () => {
    markCodeAsUsed(redemption.code);
  };

  const isExpired = timeLeft <= 0;
  const isUsed = redemption.status === 'used';

  return (
    <div className="flex flex-col gap-[var(--space-5)] w-full text-center">
      <Card className="border border-[var(--color-primary)] shadow-[var(--shadow-lg)] bg-[var(--color-surface)] overflow-hidden">
        {/* Card Header showing Cover info */}
        <div className="relative py-6 px-[var(--space-5)] text-center text-white bg-[var(--color-primary)]">
          <div className="absolute top-2 right-2 opacity-15">
            <Phone size={80} />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <span className="text-[var(--text-xs)] tracking-wider font-bold uppercase opacity-80 font-sans">
              {t('code.title')}
            </span>
            <span className="text-[var(--text-xl)] font-bold font-body leading-tight">
              {redemption.rewardTitle}
            </span>
            <div 
              className="mt-3 w-12 h-12 rounded-full border-2 border-white bg-cover bg-center shrink-0 shadow-md"
              style={{ backgroundImage: `url(${redemption.rewardImageUrl})` }}
            />
          </div>
        </div>

        {/* Dynamic barcode presentation */}
        <CardBody className="p-[var(--space-6)] flex flex-col items-center gap-[var(--space-4)]">
          {isUsed ? (
            <div className="flex flex-col items-center gap-2 py-6 text-[var(--color-success)]">
              <div className="p-4 rounded-full bg-[rgba(5,150,105,0.08)]">
                <Check size={48} className="animate-pulse" />
              </div>
              <span className="text-[var(--text-lg)] font-bold">{t('code.used')}</span>
              <span className="text-[var(--text-xs)] text-[var(--color-text-muted)]">{t('code.usedDesc')}</span>
            </div>
          ) : isExpired ? (
            <div className="flex flex-col items-center gap-2 py-6 text-[var(--color-danger)]">
              <span className="text-[var(--text-lg)] font-bold">{t('code.expired')}</span>
              <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] mt-1">{t('code.expiredDesc')}</span>
            </div>
          ) : (
            <>
              {/* Countdown section */}
              <div className="flex items-center gap-2 bg-[var(--color-primary-soft)] text-[var(--color-primary)] px-4 py-1.5 rounded-full font-bold select-none text-[var(--text-sm)]">
                <Clock size={15} />
                <span>{t('code.validUntil')}</span>
                <span className="number ml-1 tracking-wider text-[var(--text-md)]" style={{ direction: 'ltr' }}>
                  {formatTimer(timeLeft)}
                </span>
              </div>

              {/* Huge redemption visual Code block */}
              <div className="flex flex-col items-center gap-3 w-full bg-[var(--color-bg)] border border-[var(--color-border)] p-5 rounded-[var(--radius-lg)] shadow-inner">
                {/* Visual QR Code canvas instead of barcode */}
                <div className="py-2.5">
                  <QRCanvas value={redemption.code} size={150} fgColor="var(--color-primary)" />
                </div>

                {/* Readable numbers layout */}
                <div className="flex items-center justify-between w-full mt-1">
                  <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] select-none">{t('code.redeemCode')}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCopy}
                      className="p-1.5 rounded-full hover:bg-[var(--color-border)] text-[var(--color-primary)] cursor-pointer"
                      title={t('code.copy')}
                    >
                      <Copy size={16} />
                    </button>
                    <span 
                      className="code-display text-[var(--text-xl)] font-bold tracking-[0.2em] text-[var(--color-text)] cursor-pointer select-all font-mono"
                      onClick={handleCopy}
                    >
                      {redemption.code}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructions text */}
              <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] px-3 leading-relaxed">
                {t('code.instructions')}
              </p>
            </>
          )}
        </CardBody>

        {/* Simulated POS triggers */}
        {!isUsed && !isExpired && (
          <CardFooter className="bg-[var(--color-bg)] border-t border-[var(--color-border)] py-3 px-[var(--space-5)] flex flex-col gap-2">
            <span className="text-[11px] text-[var(--color-text-muted)] font-medium">{t('code.simulate')}</span>
            <Button
              variant="accent"
              size="sm"
              onClick={handleUseCodeSimulate}
              className="w-full text-[var(--text-xs)] flex items-center justify-center gap-2 shadow-sm font-bold"
            >
              <ArrowsCounterClockwise size={13} className="animate-spin-slow" />
              <span>{t('code.scanSim')}</span>
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <Button 
        variant="ghost" 
        size="md" 
        onClick={onBackToRewards}
        className="w-full flex items-center justify-center gap-1.5 font-bold border-[var(--color-border)] text-[var(--color-text)]"
      >
        <span>{t('code.backToRewards')}</span>
      </Button>
    </div>
  );
};
