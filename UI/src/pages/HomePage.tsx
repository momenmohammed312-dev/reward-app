// src/pages/HomePage.tsx

import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { PointsWallet } from '../components/loyalty/PointsWallet';
import { ProgressMilestone } from '../components/loyalty/ProgressMilestone';
import { TransactionRow } from '../components/loyalty/TransactionRow';
import { ShieldWarning, Smiley } from '@phosphor-icons/react';
import { motion } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.2, 0.8, 0.2, 1] as const,
    },
  },
};

export const HomePage: React.FC = () => {
  const {
    transactions,
    loadingWallet,
    walletError,
    refetchData,
    setActiveTab,
    currentTenant,
    globalError,
    simulateErrorState,
    setSelectedTransaction,
    t,
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [errorSimulated, setErrorSimulated] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [currentTenant.id]);

  const handleRetry = async () => {
    setLoading(true);
    setErrorSimulated(null);
    simulateErrorState(false);
    await refetchData();
    setLoading(false);
  };

  if (loading || loadingWallet) {
    return (
      <div className="flex flex-col gap-[var(--space-5)] animate-pulse">
        <div className="h-[260px] bg-[var(--color-border)] rounded-b-[36px]" />
        <div className="px-[var(--space-5)] flex flex-col gap-4 -mt-12">
          <div className="grid grid-cols-3 gap-3">
            <div className="h-[92px] bg-[var(--color-border)] rounded-[20px]" />
            <div className="h-[92px] bg-[var(--color-border)] rounded-[20px]" />
            <div className="h-[92px] bg-[var(--color-border)] rounded-[20px]" />
          </div>
          <div className="h-[78px] bg-[var(--color-border)] rounded-[20px]" />
          <div className="h-14 bg-[var(--color-border)] rounded-[14px]" />
          <div className="h-14 bg-[var(--color-border)] rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (globalError || errorSimulated || walletError) {
    const activeErrorMsg = globalError || errorSimulated || walletError || t('error.unexpected');
    return (
      <div className="mx-[var(--space-5)] py-12 px-6 text-center flex flex-col items-center justify-center gap-4 bg-[var(--color-surface)] border border-[var(--color-danger)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] mt-12">
        <div className="p-3 bg-[rgba(180,66,58,0.1)] text-[var(--color-danger)] rounded-full">
          <ShieldWarning size={40} />
        </div>
        <h3 className="text-[var(--text-lg)] font-extrabold text-[var(--color-text)]">{t('error.fetchFailed')}</h3>
        <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] max-w-sm leading-relaxed">
          {activeErrorMsg}
        </p>
        <button
          onClick={handleRetry}
          className="mt-2 py-[var(--space-2)] px-[var(--space-5)] bg-[var(--color-primary)] text-white font-bold rounded-[var(--radius-md)] text-[var(--text-sm)] shadow hover:opacity-95 transition-opacity cursor-pointer"
        >
          {t('error.retry')}
        </button>
      </div>
    );
  }

  const topTransactions = transactions.slice(0, 3);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-[var(--space-4)] pb-6"
    >
      {/* 1. Curved Cafe Hero + 3 Overlapping Action Tiles */}
      <motion.div variants={itemVariants}>
        <PointsWallet />
      </motion.div>

      {/* 2. Next Reward Milestone Bar */}
      <motion.div variants={itemVariants} className="px-[var(--space-5)]">
        <ProgressMilestone />
      </motion.div>

      {/* 3. Recent Transactions List */}
      <motion.div variants={itemVariants} className="px-[var(--space-5)] flex flex-col gap-1.5 text-right mt-1">
        <div className="flex justify-between items-center select-none mb-1">
          <h2 className="text-[18px] font-extrabold text-[var(--color-text)] tracking-tight">
            {t('home.title')}
          </h2>
          <button
            onClick={() => setActiveTab('history')}
            className="text-[13px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-3 py-1 rounded-full hover:opacity-85 cursor-pointer transition-opacity"
          >
            {t('home.viewAll')}
          </button>
        </div>

        <div className="flex flex-col">
          {topTransactions.length > 0 ? (
            topTransactions.map((tx, i) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                index={i}
                onClick={() => {
                  setSelectedTransaction(tx);
                  setActiveTab('history');
                }}
              />
            ))
          ) : (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-center bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <Smiley size={26} weight="duotone" className="text-[var(--color-text-light)]" />
              <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                {t('home.empty')}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
