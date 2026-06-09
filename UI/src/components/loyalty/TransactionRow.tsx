// src/components/loyalty/TransactionRow.tsx

import React from 'react';
import { Transaction } from '../../types';
import { ShoppingBag, Gift, ArrowCounterClockwise } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useApp } from '../../store/AppContext';

type TxType = 'earn' | 'redeem' | 'refund';

const txConfig: Record<TxType, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  pointsColor: string;
  pointsBg: string;
  prefix: string;
  label: string;
}> = {
  earn: {
    icon: ShoppingBag,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    pointsColor: 'text-emerald-700',
    pointsBg: 'bg-emerald-50',
    prefix: '+',
    label: 'شراء',
  },
  redeem: {
    icon: Gift,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    pointsColor: 'text-violet-700',
    pointsBg: 'bg-violet-50',
    prefix: '-',
    label: 'استبدال',
  },
  refund: {
    icon: ArrowCounterClockwise,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    pointsColor: 'text-amber-700',
    pointsBg: 'bg-amber-50',
    prefix: '+',
    label: 'استرجاع',
  },
};

interface TransactionRowProps {
  transaction: Transaction;
  index?: number;
  onClick?: (tx: Transaction) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, index = 0, onClick }) => {
  const { t } = useApp();
  const config = txConfig[transaction.type] || txConfig.earn;
  const Icon = config.icon;
  const typeLabel =
    transaction.type === 'earn' ? t('tx.typeEarn') :
    transaction.type === 'redeem' ? t('tx.typeRedeem') :
    t('tx.typeRefund');

  const formattedDate = new Date(transaction.date).toLocaleDateString('ar-EG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const formattedTime = new Date(transaction.date).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring' as const, stiffness: 100, damping: 20 }}
      onClick={() => onClick?.(transaction)}
      className="flex items-center gap-3 py-3 cursor-pointer border-b border-[var(--color-border)] last:border-b-0 group"
    >
      <div className={`w-9 h-9 rounded-xl ${config.iconBg} ${config.iconColor} flex items-center justify-center shrink-0`}>
        <Icon size={18} weight="duotone" />
      </div>

      <div className="flex-1 min-w-0 text-right">
        <p className="text-[var(--text-sm)] font-bold text-[var(--color-text)] leading-tight group-hover:text-[var(--color-primary)] transition-colors">
          {transaction.description}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 justify-end flex-row-reverse">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {formattedDate}
          </span>
          {transaction.invoiceNumber && (
            <>
              <span className="text-[10px] text-[var(--color-text-light)] mx-0.5">/</span>
              <span className="text-[10px] text-[var(--color-text-light)] font-mono">
                {transaction.invoiceNumber.slice(-6)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end">
        <span className={`text-sm font-black ${config.pointsColor} leading-none`}>
          {config.prefix}{Math.abs(transaction.points).toLocaleString('en-US')}
        </span>
        <span className={`text-[9px] font-semibold ${config.pointsColor} opacity-70`}>
          {t('pointsLabel')}
        </span>
      </div>
    </motion.div>
  );
};
