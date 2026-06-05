// src/pages/HomePage.tsx

import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { PointsWallet } from '../components/loyalty/PointsWallet';
import { ProgressMilestone } from '../components/loyalty/ProgressMilestone';
import { TransactionRow } from '../components/loyalty/TransactionRow';
import { ShieldWarning, Smiley, HandWaving } from '@phosphor-icons/react';
import { motion } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
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

export const HomePage: React.FC = () => {
  const { 
    transactions, 
    user, 
    loadingWallet, 
    walletError, 
    refetchData, 
    setActiveTab, 
    currentTenant, 
    globalError, 
    simulateErrorState 
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [errorSimulated, setErrorSimulated] = useState<string | null>(null);

  // Load screen with simulation skeleton as mandated in Design Tokens Page 9
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [currentTenant.id]);

  const handleRetry = async () => {
    setLoading(true);
    setErrorSimulated(null);
    simulateErrorState(false);
    await refetchData();
    setLoading(false);
  };

  // 11. Custom PageSkeleton (mandated by page 9)
  if (loading || loadingWallet) {
    return (
      <div className="flex flex-col gap-[var(--space-5)] animate-pulse">
        {/* Points wallet skeleton */}
        <div className="h-[210px] bg-[var(--color-border)] rounded-[var(--radius-lg)]" />
        {/* Milestone skeleton */}
        <div className="h-[120px] bg-[var(--color-border)] rounded-[var(--radius-lg)]" />
        {/* List skeleton */}
        <div className="flex flex-col gap-2 mt-2 text-right">
          <div className="h-4 bg-[var(--color-border)] rounded w-28 mb-2" />
          <div className="h-14 bg-[var(--color-border)] rounded-[var(--radius-md)]" />
          <div className="h-14 bg-[var(--color-border)] rounded-[var(--radius-md)] border-t border-transparent" />
          <div className="h-14 bg-[var(--color-border)] rounded-[var(--radius-md)] border-t border-transparent" />
        </div>
      </div>
    );
  }

  // 11. Custom ErrorState (mandated by page 9)
  if (globalError || errorSimulated || walletError) {
    const activeErrorMsg = globalError || errorSimulated || walletError || 'حدث خطأ غير متوقع أثناء تحميل معلومات محفظتكم.';
    return (
      <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-4 bg-[var(--color-surface)] border border-[var(--color-danger)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] mt-12">
        <div className="p-3 bg-[rgba(220,38,38,0.08)] text-[var(--color-danger)] rounded-full">
          <ShieldWarning size={40} />
        </div>
        <h3 className="text-[var(--text-lg)] font-bold text-[var(--color-text)] font-sans">فشلت عملية جلب البيانات</h3>
        <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] max-w-sm leading-relaxed">
          {activeErrorMsg}
        </p>
        <button
          onClick={handleRetry}
          className="mt-2 py-[var(--space-2)] px-[var(--space-5)] bg-[var(--color-primary)] text-white font-bold rounded-[var(--radius-md)] text-[var(--text-sm)] shadow hover:opacity-95 transition-opacity cursor-pointer"
        >
          أعد المحاولة الآن
        </button>
      </div>
    );
  }

  // Display top 3 recent transactions
  const topTransactions = transactions.slice(0, 3);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-[var(--space-6)]"
    >
      {/* 1. Welcoming Hero Bar */}
      <motion.div variants={itemVariants} className="flex items-center select-none text-right">
        <div className="flex flex-col gap-0.5">
          <span className="text-[var(--text-xs)] text-[var(--color-text-light)] font-medium flex items-center gap-1.5">
            <span>مرحباً بعودتك</span>
            <HandWaving size={14} className="text-amber-500" weight="fill" />
          </span>
          <h1 className="text-xl font-black text-[var(--color-text)] tracking-tight leading-none">
            {user?.name || 'أحمد عبد الله'}
          </h1>
        </div>
      </motion.div>

      {/* 2. Main Points Wallet */}
      <motion.div variants={itemVariants}>
        <PointsWallet />
      </motion.div>

      {/* 3. Progress Milestones towards next closest discount coupon */}
      <motion.div variants={itemVariants}>
        <ProgressMilestone />
      </motion.div>

      {/* 4. Transactions summary logs */}
      <motion.div variants={itemVariants} className="flex flex-col gap-[var(--space-3)] text-right mt-0">
        <div className="flex justify-between items-start select-none">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[var(--text-lg)] font-black text-[var(--color-text)] tracking-tight">
              آخر العمليات
            </h2>
            <p className="text-[10px] text-[var(--color-text-muted)] opacity-70">
              أحدث {topTransactions.length} حركات على حسابك
            </p>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="text-[10px] font-bold text-[var(--color-primary)] hover:opacity-80 cursor-pointer transition-opacity mt-0.5"
          >
            عرض الكل ←
          </button>
        </div>

        <div className="flex flex-col gap-[var(--space-4)]">
          {topTransactions.length > 0 ? (
            topTransactions.map((tx, i) => (
              <TransactionRow key={tx.id} transaction={tx} index={i} />
            ))
          ) : (
            <div className="py-8 px-4 text-center text-[var(--color-text-light)] text-[var(--text-xs)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)] flex flex-col items-center gap-2">
              <Smiley size={24} />
              <span>لا توجد معاملات شراء سابقة مسجلة في هذا الكافيه للمحاكاة بعد!</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
export default HomePage;
