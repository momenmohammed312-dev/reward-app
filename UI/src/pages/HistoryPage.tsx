// src/pages/HistoryPage.tsx

import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { TransactionRow } from '../components/loyalty/TransactionRow';
import { Receipt, ClipboardText, Clock, CheckCircle } from '@phosphor-icons/react';
import { Badge } from '../components/ui/Badge';
import { motion, AnimatePresence } from 'motion/react';

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

export const HistoryPage: React.FC = () => {
  const { transactions, redeemedRewards, currentTenant, setActiveRedemption, setCurrentSubPage } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'tx' | 'vouchers'>('tx');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [currentTenant.id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-[var(--space-5)] animate-pulse">
        <div className="flex gap-2 w-full justify-start select-none">
          <div className="h-8 w-24 bg-[var(--color-border)] rounded-full shrink-0" />
          <div className="h-8 w-24 bg-[var(--color-border)] rounded-full shrink-0" />
        </div>
        <div className="flex flex-col gap-3 mt-4">
          <div className="h-14 bg-[var(--color-border)] rounded-[var(--radius-md)]" />
          <div className="h-14 bg-[var(--color-border)] rounded-[var(--radius-md)]" />
          <div className="h-14 bg-[var(--color-border)] rounded-[var(--radius-md)]" />
        </div>
      </div>
    );
  }

  const handleVoucherClick = (voucher: any) => {
    setActiveRedemption(voucher);
    setCurrentSubPage('code-display');
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-[var(--space-5)] text-right pb-10"
    >
      {/* Page header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-0.5 select-none text-right">
        <span className="text-[var(--text-xs)] text-[var(--color-text-light)]">مراجعة حركات الحساب والولاية</span>
        <span className="text-[var(--text-xl)] font-bold text-[var(--color-text)] font-sans">
          سجل الأنشطة والكوبونات
        </span>
      </motion.div>

      {/* Segment switcher */}
      <motion.div variants={itemVariants} className="flex border-b border-[var(--color-border)] select-none">
        <button
          onClick={() => setActiveSubTab('tx')}
          className={`flex-1 pb-3 text-[var(--text-xs)] font-bold border-b-2 text-center transition-all cursor-pointer
            ${activeSubTab === 'tx'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-muted)]'
            }
          `}
        >
          سجل المعاملات المباشرة
        </button>
        <button
          onClick={() => setActiveSubTab('vouchers')}
          className={`flex-1 pb-3 text-[var(--text-xs)] font-bold border-b-2 text-center transition-all cursor-pointer
            ${activeSubTab === 'vouchers'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-muted)]'
            }
          `}
        >
          الكوبونات المستردة ({redeemedRewards.length})
        </button>
      </motion.div>

      {/* Interactive Logs Render */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'tx' ? (
          <motion.div 
            key="tx"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="flex flex-col gap-[var(--space-3)]"
          >
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <motion.div key={tx.id} variants={itemVariants}>
                  <TransactionRow transaction={tx} />
                </motion.div>
              ))
            ) : (
              <div className="py-20 text-center text-[var(--color-text-light)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] flex flex-col items-center gap-2">
                <Receipt size={40} className="text-slate-300" />
                <span className="text-[var(--text-sm)] font-bold">السجل نظيف تماماً</span>
                <span className="text-[11px] text-[var(--color-text-muted)]">لم تقم بأي عمليات شراء مع العلامة بعد للمحاكاة.</span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="vouchers"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="flex flex-col gap-[var(--space-3)]"
          >
            {redeemedRewards.length > 0 ? (
              redeemedRewards.map((voucher) => {
                const isActive = voucher.status === 'active';
                const isUsed = voucher.status === 'used';
                return (
                  <motion.div
                    key={voucher.code}
                    variants={itemVariants}
                    onClick={() => handleVoucherClick(voucher)}
                    className="flex justify-between items-center py-3.5 px-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg)] transition-colors select-none cursor-pointer text-right group"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-11 h-11 bg-cover bg-center rounded-[var(--radius-sm)] border border-[var(--color-border)] shrink-0 shadow-sm"
                        style={{ backgroundImage: `url(${voucher.rewardImageUrl})` }}
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[var(--text-sm)] font-bold text-[var(--color-text)] leading-tight group-hover:text-[var(--color-primary)] transition-colors">
                          {voucher.rewardTitle}
                        </span>
                        <div className="flex gap-2 items-center text-[var(--text-xs)] text-[var(--color-text-light)]">
                          <span>كود: <strong className="number tracking-wider font-mono">{voucher.code}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 text-left">
                      {isActive ? (
                        <Badge variant="success" className="font-bold flex items-center gap-1.5 pl-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-dot-breath shrink-0" />
                          <span>نشط ومتاح</span>
                        </Badge>
                      ) : isUsed ? (
                        <Badge variant="muted" className="opacity-70">
                          <span>مستعمل</span>
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="opacity-70">
                          <span>منتهي صلاحية</span>
                        </Badge>
                      )}
                      <span className="text-[11px] points-value font-mono font-bold text-[var(--color-text-muted)] mt-0.5">
                        -{voucher.pointsSpent} ن
                      </span>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-20 text-center text-[var(--color-text-light)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] flex flex-col items-center gap-2">
                <ClipboardText size={40} className="text-slate-300" />
                <span className="text-[var(--text-sm)] font-bold">لا كوبونات مستبدلة</span>
                <span className="text-[11px] text-[var(--color-text-muted)]">توجه لكتالوج المكافآت لاستبدال نقاطك التراكمية.</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
export default HistoryPage;
