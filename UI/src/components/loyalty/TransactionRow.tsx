// src/components/loyalty/TransactionRow.tsx

import React from 'react';
import { Transaction } from '../../types';
import { ShoppingBag, Gift, ArrowCounterClockwise } from '@phosphor-icons/react';
import { motion } from 'motion/react';

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
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, index = 0 }) => {
  const config = txConfig[transaction.type] || txConfig.earn;
  const Icon = config.icon;

  const formattedDate = new Date(transaction.date).toLocaleDateString('ar-EG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 280, damping: 28 }}
      className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm transition-all duration-200"
    >
      <div className={`w-9 h-9 rounded-xl ${config.iconBg} ${config.iconColor} flex items-center justify-center shrink-0`}>
        <Icon size={18} weight="duotone" />
      </div>

      <div className="flex-1 min-w-0 text-right">
        <p className="text-[var(--text-sm)] font-bold text-[var(--color-text)] truncate leading-tight">
          {transaction.description}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 justify-end flex-row-reverse">
          <span className="text-[10px] text-[var(--color-text-muted)] opacity-70">
            {formattedDate}
          </span>
          {transaction.invoiceNumber && (
            <>
              <span className="text-[10px] opacity-30">·</span>
              <span className="text-[10px] text-[var(--color-text-muted)] opacity-50 font-mono">
                #{transaction.invoiceNumber.slice(-6)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className={`shrink-0 px-2.5 py-1.5 rounded-xl ${config.pointsBg} flex flex-col items-center min-w-[52px]`}>
        <span className={`text-sm font-black ${config.pointsColor} leading-none`}>
          {config.prefix}{Math.abs(transaction.points).toLocaleString('ar-EG')}
        </span>
        <span className={`text-[9px] font-semibold ${config.pointsColor} opacity-70 mt-0.5`}>
          نقطة
        </span>
      </div>
    </motion.div>
  );
};
