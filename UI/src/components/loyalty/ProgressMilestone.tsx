// src/components/loyalty/ProgressMilestone.tsx

import React from 'react';
import { useApp } from '../../store/AppContext';
import { ProgressBar } from '../ui/ProgressBar';
import { Card, CardBody } from '../ui/Card';
import { Trophy, Flame } from '@phosphor-icons/react';

export const ProgressMilestone: React.FC = () => {
  const { points, rewards, setSelectedReward, setCurrentSubPage } = useApp();

  // Find the closest reward that the user CANNOT afford yet
  const nextRewards = [...rewards]
    .filter(r => r.pointsRequired > points)
    .sort((a, b) => a.pointsRequired - b.pointsRequired);

  const targetReward = nextRewards[0];

  // If there's no larger reward, find the ultimate active reward as milestone fallback
  const highestReward = [...rewards].sort((a, b) => b.pointsRequired - a.pointsRequired)[0];

  if (!highestReward) return null;

  const activeTarget = targetReward || highestReward;
  const isCompleted = points >= activeTarget.pointsRequired;
  const pointsRemaining = activeTarget.pointsRequired - points;
  
  const handleRewardClick = () => {
    setSelectedReward(activeTarget);
    setCurrentSubPage('redeem-detail');
  };

  return (
    <Card className="border border-dashed border-[var(--color-border)] shadow-sm bg-[var(--color-primary-soft)]">
      <CardBody className="flex flex-col gap-[var(--space-3)]">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] shrink-0">
              <Trophy size={16} />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[var(--text-sm)] font-bold text-[var(--color-text)]">
                {isCompleted ? 'مبارك! وصلت لأكبر مكافأة' : 'هدفك القادم بانتظارك'}
              </span>
              <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] mt-0.5 font-sans leading-tight">
                {isCompleted 
                  ? `أنت مؤهل الآن للحصول على "${activeTarget.title}"`
                  : `يتبقى لك مَسافة ${pointsRemaining} نقطة للحصول على كوبون متميز`}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleRewardClick}
            className="text-[var(--text-xs)] font-bold text-[var(--color-primary)] hover:underline shrink-0"
          >
            التفاصيل
          </button>
        </div>

        {/* Progress track */}
        <div className="flex flex-col gap-1 w-full mt-1">
          <ProgressBar 
            value={points} 
            max={activeTarget.pointsRequired} 
            variant={isCompleted ? 'primary' : 'accent'}
          />
          <div className="flex justify-between text-[11px] font-sans text-[var(--color-text-light)] select-none">
            <span className="number font-bold points-value">{points}</span>
            <span className="number font-bold points-value">{activeTarget.pointsRequired}</span>
          </div>
        </div>

        {/* Short footer callout */}
        <div className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--color-text-muted)] font-medium mt-1">
          <Flame size={14} className="text-[var(--color-accent)]" />
          <span>المكافأة المستهدفة: <strong>{activeTarget.title}</strong></span>
        </div>
      </CardBody>
    </Card>
  );
};
