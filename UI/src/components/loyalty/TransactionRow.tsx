// src/components/loyalty/TransactionRow.tsx

import React from 'react';
import { Transaction } from '../../types';
import { motion } from 'motion/react';

type TxType = 'earn' | 'redeem' | 'refund';

const txConfig: Record<TxType, {
  pointsColor: string;
  prefix: string;
}> = {
  earn: {
    pointsColor: 'text-[var(--color-success)]',
    prefix: '+',
  },
  redeem: {
    pointsColor: 'text-[var(--color-danger)]',
    prefix: '−',
  },
  refund: {
    pointsColor: 'text-[var(--color-success)]',
    prefix: '+',
  },
};

interface TransactionRowProps {
  transaction: Transaction;
  index?: number;
  onClick?: (tx: Transaction) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, index = 0, onClick }) => {
  const config = txConfig[transaction.type] || txConfig.earn;

  const formattedDate = new Date(transaction.date).toLocaleDateString('ar-EG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.06, duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      onClick={() => onClick?.(transaction)}
      className="flex items-center justify-between gap-3 py-3 px-2 -mx-2 rounded-xl cursor-pointer border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-primary-soft)] transition-colors group"
    >
      <div className="flex-1 min-w-0 text-right">
        <p className="text-[15px] font-bold text-[var(--color-text)] leading-snug group-hover:text-[var(--color-primary)] transition-colors truncate">
          {transaction.description}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
          <span>{formattedDate}</span>
          {transaction.invoiceNumber && (
            <>
              <span>•</span>
              <span className="number font-medium">{transaction.invoiceNumber.slice(-6)}</span>
            </>
          )}
        </div>
      </div>

      <span className={`number text-[16.5px] font-extrabold shrink-0 ${config.pointsColor}`}>
        {config.prefix}{Math.abs(transaction.points).toLocaleString('en-US')}
      </span>
    </motion.div>
  );
};
