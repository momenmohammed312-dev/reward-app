// src/pages/HistoryPage.tsx

import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { TransactionRow } from '../components/loyalty/TransactionRow';
import { Transaction } from '../types';
import { Receipt, ClipboardText, ShoppingBag, Gift, ArrowCounterClockwise } from '@phosphor-icons/react';
import { Badge } from '../components/ui/Badge';
import { BottomSheet } from '../components/ui/BottomSheet';
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
      type: 'spring' as const, 
      stiffness: 100, 
      damping: 20 
    } 
  }
};

export const HistoryPage: React.FC = () => {
  const { transactions, redeemedRewards, currentTenant, setActiveRedemption, setCurrentSubPage, selectedTransaction, setSelectedTransaction, t, language } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'tx' | 'vouchers'>('tx');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(selectedTransaction);

  useEffect(() => {
    if (selectedTransaction) {
      setActiveSubTab('tx');
      setSelectedTransaction(null);
    }
  }, [selectedTransaction]);

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
    <>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-[var(--space-5)] text-right pb-10"
      >
        {/* Page header */}
        <motion.div variants={itemVariants} className="flex flex-col gap-0.5 select-none text-right">
          <h1 className="text-[24px] font-extrabold text-[var(--color-text)]">
            {t('history.title')}
          </h1>
          <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
            {t('history.subtitle')}
          </p>
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
            {t('history.tx')}
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
            {t('history.vouchers', { count: redeemedRewards.length })}
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
              className="flex flex-col"
            >
              {transactions.length > 0 ? (
                transactions.map((tx, i) => (
                  <motion.div key={tx.id} variants={itemVariants}>
                    <TransactionRow transaction={tx} index={i} onClick={setSelectedTx} />
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center text-[var(--color-text-light)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] flex flex-col items-center gap-2">
                  <Receipt size={40} className="text-slate-300" />
                  <span className="text-[var(--text-sm)] font-bold">{t('history.empty')}</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">{t('history.emptyHint')}</span>
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
              className="flex flex-col"
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
                      className="flex justify-between items-center py-3.5 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-bg)] -mx-[var(--space-5)] px-[var(--space-5)] transition-colors select-none cursor-pointer text-right group"
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
                            <span>{t('history.code')}: <strong className="number tracking-wider font-mono">{voucher.code}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0 text-left">
                        {isActive ? (
                          <Badge variant="success" className="font-bold flex items-center gap-1.5 pl-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-dot-breath shrink-0" />
                            <span>{t('history.active')}</span>
                          </Badge>
                        ) : isUsed ? (
                          <Badge variant="muted" className="opacity-70">
                            <span>{t('history.used')}</span>
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="opacity-70">
                            <span>{t('history.expired')}</span>
                          </Badge>
                        )}
                        <span className="text-[12px] points-value font-bold text-[var(--color-text-muted)] mt-0.5">
                          {t('history.voucherPoints', { points: voucher.pointsSpent })}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-20 text-center text-[var(--color-text-light)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] flex flex-col items-center gap-2">
                  <ClipboardText size={40} className="text-slate-300" />
                  <span className="text-[var(--text-sm)] font-bold">{t('history.voucherEmpty')}</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">{t('history.voucherEmptyHint')}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Transaction Detail BottomSheet */}
      <BottomSheet
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title={t('history.detailTitle')}
      >
        {selectedTx && (
          <div className="flex flex-col gap-[var(--space-4)]">
            <div className="flex items-center gap-3 p-4 bg-[var(--color-bg)] rounded-[var(--radius-md)]">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                selectedTx.type === 'earn' ? 'bg-emerald-50 text-emerald-600' :
                selectedTx.type === 'redeem' ? 'bg-violet-50 text-violet-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                {selectedTx.type === 'earn' ? <ShoppingBag size={20} weight="regular" /> :
                 selectedTx.type === 'redeem' ? <Gift size={20} weight="regular" /> :
                 <ArrowCounterClockwise size={20} weight="regular" />}
              </div>
              <div className="flex-1 text-right">
                <p className="text-[var(--text-sm)] font-bold text-[var(--color-text)]">
                  {selectedTx.description}
                </p>
                <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                  {selectedTx.type === 'earn' ? t('earn') :
                   selectedTx.type === 'redeem' ? t('redeem') : t('refund')}
                </p>
              </div>
              <div className={`shrink-0 px-3 py-2 rounded-xl font-black number ${
                selectedTx.type === 'earn' ? 'bg-emerald-50 text-emerald-700' :
                selectedTx.type === 'redeem' ? 'bg-violet-50 text-violet-700' :
                'bg-amber-50 text-amber-700'
              }`}>
                {selectedTx.type === 'earn' ? '+' : selectedTx.type === 'refund' ? '+' : '-'}
                {Math.abs(selectedTx.points)}
              </div>
            </div>

            <div className="flex flex-col gap-[var(--space-3)]">
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] number">{new Date(selectedTx.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                <span className="text-[var(--text-xs)] font-bold text-[var(--color-text)]">{t('history.date')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] number">{new Date(selectedTx.date).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-[var(--text-xs)] font-bold text-[var(--color-text)]">{t('history.time')}</span>
              </div>
              {selectedTx.amount && selectedTx.type === 'earn' && (
                <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                  <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] number font-bold">{selectedTx.amount} {t('sr')}</span>
                  <span className="text-[var(--text-xs)] font-bold text-[var(--color-text)]">{t('history.amount')}</span>
                </div>
              )}
              {selectedTx.invoiceNumber && (
                <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                  <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] font-mono">{selectedTx.invoiceNumber}</span>
                  <span className="text-[var(--text-xs)] font-bold text-[var(--color-text)]">{t('history.invoice')}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] number">{Math.abs(selectedTx.points)} {t('pointsLabel')}</span>
                <span className="text-[var(--text-xs)] font-bold text-[var(--color-text)]">{selectedTx.type === 'earn' ? t('history.pointsEarned') : t('history.pointsUsed')}</span>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
};
export default HistoryPage;
