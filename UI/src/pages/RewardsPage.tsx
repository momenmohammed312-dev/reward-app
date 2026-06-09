// src/pages/RewardsPage.tsx

import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { RewardCard } from '../components/loyalty/RewardCard';
import { Info, Gift } from '@phosphor-icons/react';
import { Reward } from '../types';
import { motion } from 'motion/react';

interface RewardsPageProps {
  onRedeemRewardTrigger: (reward: Reward) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: 'spring' as const, 
      stiffness: 100, 
      damping: 20 
    } 
  }
};

export const RewardsPage: React.FC<RewardsPageProps> = ({ onRedeemRewardTrigger }) => {
  const { rewards, points, currentTenant, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentTenant.id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-[var(--space-5)] animate-pulse">
        {/* Category filters skeleton */}
        <div className="flex gap-2 w-full justify-start overflow-hidden py-1">
          <div className="h-8 w-16 bg-[var(--color-border)] rounded-full shrink-0" />
          <div className="h-8 w-24 bg-[var(--color-border)] rounded-full shrink-0" />
          <div className="h-8 w-24 bg-[var(--color-border)] rounded-full shrink-0" />
        </div>
        
        {/* Cards skeleton grid */}
        <div className="grid grid-cols-1 gap-[var(--space-4)]">
          <div className="h-[310px] bg-[var(--color-border)] rounded-[var(--radius-lg)]" />
          <div className="h-[310px] bg-[var(--color-border)] rounded-[var(--radius-lg)]" />
        </div>
      </div>
    );
  }

  // Deduce categories
  const categories = ['all', ...Array.from(new Set(rewards.map(r => r.category)))];

  const filteredRewards = filterCategory === 'all' 
    ? rewards 
    : rewards.filter(r => r.category === filterCategory);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-[var(--space-5)] text-right"
    >
      {/* Page Title */}
      <motion.div variants={itemVariants} className="flex flex-col gap-0.5 select-none">
        <h1 className="text-[var(--text-2xl)] font-black text-[var(--color-text)] tracking-tight leading-none">
          {t('rewards.title')}
        </h1>
        <p className="text-[10px] tracking-widest font-bold text-[var(--color-text-light)] uppercase">
          {t('rewards.subtitle')}
        </p>
      </motion.div>

      {/* Points Balance Card */}
      <motion.div
        variants={itemVariants}
        className="relative p-[2px] rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] shadow-lg select-none"
      >
        <div className="rounded-[calc(var(--radius-lg)-2px)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.15em]">Live Balance</span>
              </div>
              <motion.p 
                key={points} 
                initial={{ opacity: 0, y: -6 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="text-4xl font-black text-[var(--color-text)] tracking-tight leading-none number"
              >
                {points.toLocaleString('en-US')}
              </motion.p>
              <p className="text-[10px] font-bold text-[var(--color-text-light)]">{t('rewards.pointsAvailable')}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center">
              <Gift size={24} className="text-[var(--color-primary)]" weight="duotone" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Category filters */}
      <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-2 scrollbar-none justify-start select-none" style={{ direction: 'rtl' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`
              py-1.5 px-3.5 rounded-full text-[var(--text-xs)] font-bold cursor-pointer transition-all shrink-0 border
              ${filterCategory === cat
                ? 'bg-[var(--color-primary)] text-white border-transparent shadow-sm'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-bg)]'
              }
            `}
          >
            {cat === 'all' ? t('rewards.all') : cat}
          </button>
        ))}
      </motion.div>

      {/* Rewards Catalog Cards Grid */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 gap-[var(--space-4)] pb-[var(--space-10)]">
        {filteredRewards.length > 0 ? (
          filteredRewards.map((reward) => (
            <motion.div key={reward.id} variants={itemVariants} layout>
              <RewardCard 
                reward={reward} 
                onRedeemClick={onRedeemRewardTrigger}
              />
            </motion.div>
          ))
        ) : (
          <div className="py-16 text-center text-[var(--color-text-light)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] flex flex-col items-center gap-2">
            <Info size={36} className="text-slate-300" />
                  <span className="text-[var(--text-sm)] font-bold">{t('rewards.empty')}</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">{t('rewards.emptyHint')}</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
export default RewardsPage;
