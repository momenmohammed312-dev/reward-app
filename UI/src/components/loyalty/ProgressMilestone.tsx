// src/components/loyalty/ProgressMilestone.tsx

import React from 'react';
import { useApp } from '../../store/AppContext';
import { Card, CardBody } from '../ui/Card';
import { Trophy, Flame, ArrowLeft } from '@phosphor-icons/react';
import { motion } from 'motion/react';

export const ProgressMilestone: React.FC = () => {
  const { points, rewards, setSelectedReward, setCurrentSubPage } = useApp();

  const nextRewards = [...rewards]
    .filter(r => r.pointsRequired > points)
    .sort((a, b) => a.pointsRequired - b.pointsRequired);

  const targetReward = nextRewards[0];
  const highestReward = [...rewards].sort((a, b) => b.pointsRequired - a.pointsRequired)[0];

  if (!highestReward) return null;

  const activeTarget = targetReward || highestReward;
  const isCompleted = points >= activeTarget.pointsRequired;
  const pointsRemaining = Math.max(activeTarget.pointsRequired - points, 0);
  
  const progress = Math.min(points / activeTarget.pointsRequired, 1);
  const percentage = Math.round(progress * 100);

  const handleRewardClick = () => {
    setSelectedReward(activeTarget);
    setCurrentSubPage('redeem-detail');
  };

  return (
    <Card className="border border-[var(--color-border)] shadow-[var(--shadow-md)] bg-[var(--color-surface)] overflow-hidden">
      <CardBody className="flex flex-col gap-[var(--space-4)]">
        {/* Top section: icon + status + details button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-[var(--space-3)]">
            <div className="p-2.5 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] shrink-0">
              <Trophy size={20} weight="duotone" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[var(--text-md)] font-black text-[var(--color-text)] leading-tight">
                {isCompleted ? 'أهنئك! يمكنك استرداد المكافأة الآن' : 'هدفك التالي'}
              </span>
              <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] leading-tight mt-0.5">
                {isCompleted
                  ? `أنت مؤهل للحصول على "${activeTarget.title}"`
                  : `استهدف "${activeTarget.title}"`}
              </span>
            </div>
          </div>

          <motion.button
            onClick={handleRewardClick}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-all shrink-0 cursor-pointer"
          >
            <span>التفاصيل</span>
            <ArrowLeft size={14} weight="bold" />
          </motion.button>
        </div>

        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${isCompleted ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-accent)]'}`}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-lg)] font-black text-[var(--color-text)] number">{points}</span>
            <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{percentage}%</span>
            <span className="text-[var(--text-sm)] font-bold text-[var(--color-text-light)] number">{activeTarget.pointsRequired}</span>
          </div>
        </div>

        {/* Points remaining callout */}
        <div className="flex items-center justify-between bg-[var(--color-bg)] rounded-xl px-[var(--space-3)] py-[var(--space-2)]">
          <div className="flex items-center gap-1.5">
            <Flame size={16} weight="duotone" className="text-[var(--color-accent)]" />
            <span className="text-[11px] font-bold text-[var(--color-text-muted)]">
              النقاط المتبقية
            </span>
          </div>
          <span className="text-[var(--text-md)] font-black text-[var(--color-accent)] number">{pointsRemaining.toLocaleString()}</span>
        </div>
      </CardBody>
    </Card>
  );
};
