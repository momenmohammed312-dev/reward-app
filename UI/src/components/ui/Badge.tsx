// src/components/ui/Badge.tsx

import React, { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'accent' | 'success' | 'danger' | 'warning' | 'muted';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]';
      case 'accent':
        return 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]';
      case 'success':
        return 'bg-[rgba(5,150,105,0.08)] text-[var(--color-success)]';
      case 'danger':
        return 'bg-[rgba(220,38,38,0.08)] text-[var(--color-danger)]';
      case 'warning':
        return 'bg-[rgba(217,119,6,0.08)] text-[var(--color-warning)]';
      case 'muted':
      default:
        return 'bg-[var(--color-border)] text-[var(--color-text-muted)]';
    }
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center font-medium font-sans
        px-3 py-1 rounded-full
        text-[10px] uppercase tracking-[0.05em] select-none leading-none
        ${getColors()}
        ${className}
      `}
    >
      {children}
    </span>
  );
};
