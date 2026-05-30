// src/components/loyalty/RewardCard.tsx

import React, { useState } from 'react';
import { Reward } from '../../types';
import { useApp } from '../../store/AppContext';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Lock, Check } from '@phosphor-icons/react';
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
          <Badge variant="primary">
            {reward.category}
          </Badge>
        </div>
      </CardHeader>

      {/* Explicit standard body */}
      <CardBody className="flex-1 flex flex-col justify-between gap-[var(--space-2)] p-[var(--space-5)] z-20">
        <div className="flex flex-col gap-1.5 align-right text-right">
          <span 
            className="text-[var(--text-lg)] font-bold text-[var(--color-text)] leading-tight cursor-pointer hover:text-[var(--color-primary)] transition-colors"
            onClick={handleDetailsClick}
          >
            {reward.title}
          </span>
          <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
            {reward.description}
          </p>
        </div>

        <div className="flex justify-between items-center mt-3 border-t border-[var(--color-border)] pt-2 select-none">
          <span className="text-[11px] text-[var(--color-text-light)] font-medium">خطوات الاسترداد</span>
          <div className="flex items-baseline gap-1.5 justify-end">
            <span className="points-value text-[var(--text-md)] font-bold text-[var(--color-primary)]">
              {reward.pointsRequired}
            </span>
            <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] font-bold font-sans">
              نقطة
            </span>
          </div>
        </div>
      </CardBody>

      {/* Explicit standard footer */}
      <CardFooter className="p-[var(--space-4)] bg-[var(--color-bg)] flex gap-[var(--space-2)] justify-between items-center z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDetailsClick}
          className="w-1/3 text-[var(--text-xs)] font-bold border-[var(--color-border)]"
        >
          البنود
        </Button>
        
        {canAfford ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onRedeemClick(reward)}
            className="w-2/3 text-[var(--text-xs)] font-bold flex items-center justify-center gap-1.5"
          >
            <span>استرد الآن</span>
            <Check size={14} weight="bold" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="w-2/3 text-[var(--text-xs)] font-bold bg-[var(--color-primary-soft)] opacity-40 text-[var(--color-primary)] border-transparent flex items-center justify-center gap-1.5"
          >
            <Lock size={14} weight="bold" />
            <span>يتبقى {reward.pointsRequired - points} نقطة</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
