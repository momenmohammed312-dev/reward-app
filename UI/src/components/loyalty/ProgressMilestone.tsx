// src/components/loyalty/ProgressMilestone.tsx

import React from 'react';
import { useApp } from '../../store/AppContext';
import { motion } from 'motion/react';

export const ProgressMilestone: React.FC = () => {
  const { points, rewards, setSelectedReward, setCurrentSubPage, t } = useApp();

  const nextRewards = [...rewards]
    .filter((r) => r.pointsRequired > points)
    .sort((a, b) => a.pointsRequired - b.pointsRequired);

  const targetReward = nextRewards[0];
  const highestReward = [...rewards].sort((a, b) => b.pointsRequired - a.pointsRequired)[0];

  if (!highestReward) return null;

  const activeTarget = targetReward || highestReward;
  const isCompleted = points >= activeTarget.pointsRequired;
  const progress = Math.min(points / activeTarget.pointsRequired, 1);
  const percentage = Math.round(progress * 100);

  const handleRewardClick = () => {
    setSelectedReward(activeTarget);
    setCurrentSubPage('redeem-detail');
  };

  return (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleRewardClick}
      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] px-4 py-3.5 shadow-[var(--shadow-sm)] cursor-pointer transition-colors hover:border-[var(--color-primary)] select-none"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14.5px] font-bold text-[var(--color-text)] truncate">
          {isCompleted
            ? t('progress.eligible', { title: activeTarget.title })
            : t('progress.nextRewardLine', { title: activeTarget.title })}
        </span>
        <span className="number text-[15.5px] font-extrabold text-[var(--color-primary)] shrink-0">
          {percentage}%
        </span>
      </div>

      <div className="w-full h-[10px] rounded-full bg-[var(--color-track,#ece9e3)] overflow-hidden mt-2.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
          className="h-full rounded-full bg-[var(--color-primary)]"
        />
      </div>
    </motion.div>
  );
};
