// src/components/loyalty/TransactionRow.tsx

import React from 'react';
import { Transaction } from '../../types';
import { ArrowUpRight, ArrowDownLeft, ArrowCounterClockwise } from '@phosphor-icons/react';
import { formatDateTime } from '../../utils/formatDate';

interface TransactionRowProps {
  transaction: Transaction;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction }) => {
  const isGain = transaction.type === 'earn';
  const isRefund = transaction.type === 'refund';

  const getPointsColor = () => {
    if (isGain) return 'text-[var(--color-success)]';
    if (isRefund) return 'text-[var(--color-primary)]';
    return 'text-[var(--color-danger)]';
  };

  const getIcon = () => {
    if (isGain) {
      return (
        <div className="p-2 rounded-full bg-[rgba(5,150,105,0.08)] text-[var(--color-success)] shrink-0">
          <ArrowUpRight size={16} />
        </div>
      );
    }
    if (isRefund) {
      return (
        <div className="p-2 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] shrink-0">
          <ArrowCounterClockwise size={16} />
        </div>
      );
    }
    return (
      <div className="p-2 rounded-full bg-[rgba(220,38,38,0.08)] text-[var(--color-danger)] shrink-0">
        <ArrowDownLeft size={16} />
      </div>
    );
  };

  return (
    <div className="flex justify-between items-center py-[var(--space-3)] px-[var(--space-4)] border-b border-[var(--color-border)] bg-[var(--color-surface)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg)] transition-colors select-none">
      {/* Right side: Icon + details */}
      <div className="flex items-center gap-[var(--space-3)] text-right">
        {getIcon()}
        <div className="flex flex-col gap-0.5">
          <span className="text-[var(--text-sm)] font-bold text-[var(--color-text)] leading-tight">
            {transaction.description}
          </span>
          <div className="flex gap-2 items-center text-[var(--text-xs)] text-[var(--color-text-light)]">
            <span className="font-sans">{formatDateTime(transaction.date)}</span>
            {transaction.invoiceNumber && (
              <>
                <span className="opacity-40">•</span>
                <span className="font-mono">{transaction.invoiceNumber}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Left side: Points changes */}
      <div className="flex items-center gap-1.5 direction-ltr justify-end text-left shrink-0">
        <span className={`points-value font-bold text-[var(--text-md)] ${getPointsColor()}`}>
          {isGain ? '+' : '-'}{transaction.points}
        </span>
        <span className="text-[var(--text-xs)] font-bold text-[var(--color-text-muted)] font-sans">
          نقطة
        </span>
      </div>
    </div>
  );
};
