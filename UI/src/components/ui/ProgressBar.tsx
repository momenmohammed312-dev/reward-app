// src/components/ui/ProgressBar.tsx

import React from 'react';
import { motion } from 'motion/react';

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  variant?: 'primary' | 'accent';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  className = '',
  variant = 'primary',
}) => {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  const getBarColor = () => {
    return variant === 'accent' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-primary)]';
  };

  const getTrackColor = () => {
    return variant === 'accent' 
      ? 'bg-[var(--color-accent-soft)]' 
      : 'bg-[var(--color-primary-soft)]';
  };

  return (
    <div className={`w-full overflow-hidden h-2.5 rounded-[var(--radius-full)] ${getTrackColor()} ${className}`}>
      <motion.div
        className={`h-full rounded-[var(--radius-full)] ${getBarColor()}`}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      />
    </div>
  );
};
