// src/components/loyalty/RewardCard.tsx

import React from 'react';
import { Reward } from '../../types';
import { useApp } from '../../store/AppContext';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Lock, Check, Clock, CoinVertical } from '@phosphor-icons/react';
import { formatPoints } from '../../utils/formatPoints';

interface RewardCardProps {
  reward: Reward;
  onRedeemClick: (reward: Reward) => void;
}

export const RewardCard: React.FC<RewardCardProps> = ({ reward, onRedeemClick }) => {
  const { points, setSelectedReward, setCurrentSubPage, t } = useApp();
  const canAfford = points >= reward.pointsRequired;

  const handleDetailsClick = () => {
    setSelectedReward(reward);
    setCurrentSubPage('redeem-detail');
  };

  return (
    <Card 
      className="relative flex flex-col h-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden transition-shadow duration-200 hover:shadow-[var(--shadow-md)] group"
    >
      {/* Visual cover card */}
      <CardHeader className="relative p-0 aspect-video w-full overflow-hidden border-b border-[var(--color-border)]">
        <img 
          src={reward.imageUrl} 
          alt={reward.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover outline-1 -outline-offset-1 outline-black/10 group-hover:scale-[1.02] transition-transform duration-300"
        />
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="bg-white/95 backdrop-blur-sm text-[var(--color-text)] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs border border-black/5 leading-none">
            {reward.category}
          </span>
          {reward.rewardType === 'discount_fixed' && reward.discountValue ? (
            <span className="bg-[var(--color-primary)] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-xs leading-none">
              خصم {reward.discountValue} ج.م
            </span>
          ) : reward.rewardType === 'discount_percent' && reward.discountValue ? (
            <span className="bg-[var(--color-primary)] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-xs leading-none">
              خصم {reward.discountValue}%
            </span>
          ) : null}
        </div>
      </CardHeader>

      {/* Body: Specific details grouped by spacing */}
      <CardBody className="flex-1 flex flex-col justify-between gap-4 p-[var(--space-5)]">
        <div className="flex flex-col gap-1.5 text-right">
          <button
            type="button"
            onClick={handleDetailsClick}
            className="text-right text-[var(--text-lg)] font-black text-[var(--color-text)] leading-tight cursor-pointer hover:text-[var(--color-primary)] transition-colors tracking-tight"
          >
            {reward.title}
          </button>
          <p className="text-[12.5px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed font-medium">
            {reward.description}
          </p>
          {reward.minOrderEgp ? (
            <span className="text-[11px] font-bold text-[var(--color-primary)] mt-0.5">
              {t('reward.minOrder', { amount: reward.minOrderEgp })}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-1.5">
            <CoinVertical size={16} weight="regular" className="text-[var(--color-primary)] shrink-0" />
            <span className="points-value text-[17px] font-black text-[var(--color-primary)] number">
              {reward.pointsRequired.toLocaleString()}
            </span>
            <span className="text-[11.5px] font-bold text-[var(--color-text-muted)]">
              {t('pointsLabel')}
            </span>
          </div>

          {reward.expiryDays && (
            <div className="flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)]">
              <Clock size={14} weight="regular" className="shrink-0" />
              <span className="number">{reward.expiryDays}</span>
              <span>{t('reward.day')}</span>
            </div>
          )}
        </div>
      </CardBody>

      {/* Action Footer */}
      <CardFooter className="px-[var(--space-5)] pb-[var(--space-4)] pt-0 bg-transparent border-t-0 flex gap-[var(--space-2)] justify-between items-center">
        {canAfford ? (
          <Button
            variant="primary"
            size="md"
            onClick={() => onRedeemClick(reward)}
            className="flex-1 text-[13px] font-extrabold rounded-2xl shadow-sm"
          >
            <span>{t('reward.redeemNow')}</span>
            <Check size={15} weight="bold" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="md"
            disabled
            className="flex-1 text-[12.5px] font-bold rounded-2xl bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)]"
          >
            <Lock size={14} weight="bold" />
            <span>{t('reward.remaining', { points: formatPoints(reward.pointsRequired - points) })}</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
