// src/pages/RedeemPage.tsx

import React, { useState } from 'react';
import { Reward } from '../types';
import { useApp } from '../store/AppContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { ArrowRight, Info } from '@phosphor-icons/react';
import { motion } from 'motion/react';

interface RedeemPageProps {
  reward: Reward;
  onBack: () => void;
  onRedeemedSuccess: (redemption: any) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const RedeemPage: React.FC<RedeemPageProps> = ({
  reward,
  onBack,
  onRedeemedSuccess,
  onShowToast
}) => {
  const { redeemReward, points, t } = useApp();
  const [redeeming, setRedeeming] = useState(false);
  const canAfford = points >= reward.pointsRequired;

  const handleConfirmRedeem = async () => {
    if (!canAfford) {
      onShowToast(t('redeem.insufficientTitle'), 'error');
      return;
    }

    setRedeeming(true);
    try {
      const redemption = await redeemReward(reward);
      onShowToast(t('redeem.success', { title: reward.title }), 'success');
      onRedeemedSuccess(redemption);
    } catch (e: any) {
      onShowToast(e.message || t('redeem.failed'), 'error');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="flex flex-col gap-[var(--space-5)] text-right animate-fade-in pb-12">
      {/* Editorial Title banner */}
      <div className="flex items-center gap-[var(--space-2)] justify-start select-none">
        <button 
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-[var(--color-border)] text-[var(--color-text)] transition-colors cursor-pointer shrink-0"
        >
          <ArrowRight size={18} />
        </button>
        <div className="flex flex-col">
          <span className="text-[11px] text-[var(--color-text-light)]">{t('redeem.detail')}</span>
          <span className="text-[var(--text-lg)] font-bold text-[var(--color-text)]">{reward.title}</span>
        </div>
      </div>

      {/* Main card styled with Double-Bezel visual depth */}
      <Card className="border border-[var(--color-border)] shadow-[var(--shadow-lg)] overflow-hidden">
        {/* Full bleeded cover frame */}
        <div className="relative aspect-video w-full overflow-hidden select-none bg-slate-900">
          <img 
            src={reward.imageUrl} 
            alt={reward.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute top-4 right-4">
            <Badge variant="accent">
              {t('redeem.badge')}
            </Badge>
          </div>
        </div>

        {/* Info panel */}
        <CardBody className="p-[var(--space-5)] flex flex-col gap-[var(--space-4)]">
          <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
            <div className="flex flex-col">
              <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] font-medium mb-0.5">{t('redeem.pointsRequired')}</span>
              <div className="flex items-baseline gap-1 justify-start">
                <span className="points-value text-[var(--text-xl)] font-bold text-[var(--color-primary)] font-sans">
                  {reward.pointsRequired}
                </span>
                <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] font-bold">{t('pointsLabel')}</span>
              </div>
            </div>

            <div className="flex flex-col items-end text-left">
              <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] font-medium mb-0.5">{t('redeem.expiry')}</span>
              <span className="text-[var(--text-sm)] font-bold text-[var(--color-text)]">
                {reward.expiryDays} {t('redeem.expiryDays')}
              </span>
            </div>
          </div>

          {/* Description Block */}
          <div className="flex flex-col gap-1 text-right">
            <span className="text-[var(--text-sm)] font-bold text-[var(--color-text)]">{t('redeem.about')}</span>
            <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] leading-relaxed text-slate-600 mt-1">
              {reward.description}
            </p>
          </div>

          {/* Terms & Conditions list banner details */}
          <div className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] p-[var(--space-4)] border border-[var(--color-border)] mt-1">
            <div className="flex items-center gap-1.5 text-[var(--text-sm)] font-bold text-[var(--color-text)]">
              <Info size={15} className="text-[var(--color-primary)] shrink-0" />
              <span>{t('redeem.terms')}</span>
            </div>
            
            <ul className="flex flex-col gap-1.5 text-[11px] text-[var(--color-text-muted)] leading-normal pr-5 list-disc mt-1 select-none">
              <li>{reward.terms}</li>
              <li>الرمز الرقمي صالح للاستخدام لمرة واحدة فقط بمطابقتها لطلب العميل بالفرع.</li>
              <li>الرموز الرقمية المصدّرة لا يمكن استراجع قيمتها مرة أخرى لمحفظتكم بعد الحجز.</li>
              <li>يرجى إبراز الرمز الفوري للكاونتر قبل تسجيل الفاتورة بنظام الكاشير.</li>
            </ul>
          </div>
        </CardBody>

        {/* Interactive CTA bar */}
        <CardFooter className="bg-[var(--color-bg)] p-[var(--space-5)] border-t border-[var(--color-border)] flex flex-col gap-3">
          <div className="flex justify-between items-center w-full select-none">
            <span className="text-[var(--text-xs)] text-[var(--color-text-muted)]">{t('redeem.balanceStatus')}</span>
            <span className="text-[var(--text-xs)] font-bold text-[var(--color-text)]">
              {points >= reward.pointsRequired ? (
                <span className="text-[var(--color-success)]">{t('redeem.sufficient', { points })}</span>
              ) : (
                <span className="text-[var(--color-danger)]">{t('redeem.insufficient', { points: reward.pointsRequired - points })}</span>
              )}
            </span>
          </div>

          <Button
            variant={canAfford ? 'primary' : 'ghost'}
            size="lg"
            loading={redeeming}
            disabled={!canAfford || redeeming}
            onClick={handleConfirmRedeem}
            className="w-full text-[var(--text-sm)] font-bold py-3.5 shadow-sm"
          >
            {canAfford ? t('redeem.confirm') : t('redeem.insufficientTitle')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
export default RedeemPage;
