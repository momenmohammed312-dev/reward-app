// src/pages/RewardsPage.tsx

import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { RewardCard } from '../components/loyalty/RewardCard';
import { Coins, ShieldWarning, Info } from '@phosphor-icons/react';
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
      type: 'spring', 
      stiffness: 260, 
      damping: 25 
    } 
  }
};

export const RewardsPage: React.FC<RewardsPageProps> = ({ onRedeemRewardTrigger }) => {
  const { rewards, points, currentTenant } = useApp();
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
        <h1 className="text-[var(--text-xl)] font-black text-[var(--color-text)] font-display tracking-tight">
          كتالوج المكافآت
        </h1>
        <p className="text-[var(--text-xs)] text-[var(--color-text-light)]">
          استبدل نقاطك بمكافآت وخصومات حصرية
        </p>
      </motion.div>

      {/* Points Balance Card */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-[var(--radius-lg)] p-4 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg select-none"
      >
        <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -right-2 w-28 h-28 rounded-full bg-white/5" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-semibold opacity-80 uppercase tracking-widest">رصيدك الحالي</p>
            <motion.p 
              key={points} 
              initial={{ opacity: 0, y: -6 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="text-3xl font-black tracking-tight leading-none"
            >
              {points.toLocaleString('ar-EG')}
            </motion.p>
            <p className="text-[11px] opacity-70 font-medium">نقطة متاحة للاستبدال</p>
          </div>
          <Coins size={48} className="opacity-20" weight="duotone" />
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
            {cat === 'all' ? 'الكل' : cat}
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
            <span className="text-[var(--text-sm)] font-bold">عذراً، الكتالوج فارغ حالياً!</span>
            <span className="text-[11px] text-[var(--color-text-muted)]">لا توجد مكافآت مسجلة في هذا القسم.</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
export default RewardsPage;
