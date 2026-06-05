// src/components/loyalty/RewardCard.tsx

import React, { useState } from 'react';
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
  const { points, setSelectedReward, setCurrentSubPage } = useApp();
  const [spotlightCoords, setSpotlightCoords] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const canAfford = points >= reward.pointsRequired;

  const handleDetailsClick = () => {
    setSelectedReward(reward);
    setCurrentSubPage('redeem-detail');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSpotlightCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <Card 
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="relative flex flex-col h-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden transition-all duration-300 group"
    >
      {/* Spotlight Border Layer */}
      {isHovering && (
        <div 
          className="absolute inset-0 pointer-events-none z-10 opacity-70 transition-opacity duration-300"
          style={{
            background: `radial-gradient(150px circle at ${spotlightCoords.x}px ${spotlightCoords.y}px, rgba(30, 64, 175, 0.12), transparent 75%)`
          }}
        />
      )}

      {/* 4.3 Explicit header: holds the visual cover card */}
      <CardHeader className="relative p-0 aspect-video w-full overflow-hidden border-b border-[var(--color-border)]">
        <img 
          src={reward.imageUrl} 
          alt={reward.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover brightness-95 group-hover:brightness-100 transition-all duration-[var(--transition-slow)]"
        />
        <div className="absolute top-3 right-3 flex gap-1 items-center">
          <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm border border-white/50">
            {reward.category}
          </span>
        </div>
      </CardHeader>

      {/* Explicit standard body */}
      <CardBody className="flex-1 flex flex-col justify-between gap-[var(--space-2)] p-[var(--space-5)] z-20">
        <div className="flex flex-col gap-1.5 text-right">
          <span 
            className="text-[var(--text-lg)] font-black text-[var(--color-text)] leading-tight cursor-pointer hover:text-[var(--color-primary)] transition-colors tracking-tight"
            onClick={handleDetailsClick}
          >
            {reward.title}
          </span>
          <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed font-medium">
            {reward.description}
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-[var(--color-border)]">
          {/* Points required */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CoinVertical size={14} weight="duotone" className="text-[var(--color-primary)]" />
              <span className="text-[10px] font-bold text-[var(--color-text-light)] uppercase tracking-wider">Value</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="points-value text-[var(--text-md)] font-black text-[var(--color-primary)] number">
                {reward.pointsRequired.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
                نقطة
              </span>
            </div>
          </div>

          {/* Expiration */}
          {reward.expiryDays && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock size={14} weight="duotone" className="text-[var(--color-accent)]" />
                <span className="text-[10px] font-bold text-[var(--color-text-light)] uppercase tracking-wider">Expiry</span>
              </div>
              <span className="text-[11px] font-bold text-[var(--color-text-muted)] number">
                {reward.expiryDays} يوم
              </span>
            </div>
          )}
        </div>
      </CardBody>

      {/* Explicit standard footer */}
      <CardFooter className="p-[var(--space-4)] bg-[var(--color-bg)] flex gap-[var(--space-2)] justify-between items-center z-20">
        {canAfford ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onRedeemClick(reward)}
            className="flex-1 text-[var(--text-xs)] font-bold flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>استرد الآن</span>
            <Check size={14} weight="bold" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="flex-1 text-[var(--text-xs)] font-bold bg-[var(--color-primary-soft)] opacity-50 text-[var(--color-primary)] border-transparent flex items-center justify-center gap-1.5"
          >
            <Lock size={14} weight="bold" />
            <span>يتبقى {formatPoints(reward.pointsRequired - points)} نقطة</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
