// src/components/ui/Button.tsx

import React from 'react';
import { motion } from 'motion/react';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  ...props
}) => {
  // Styles resolved cleanly to use exclusively CSS variables
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[var(--color-primary)] text-[var(--color-surface)] border border-transparent hover:opacity-90';
      case 'accent':
        return 'bg-[var(--color-accent)] text-[var(--color-surface)] border border-transparent hover:opacity-90';
      case 'ghost':
        return 'bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-primary-soft)]';
      case 'danger':
        return 'bg-[var(--color-danger)] text-[var(--color-surface)] border border-transparent hover:opacity-90';
      default:
        return '';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-[var(--space-2)] px-[var(--space-4)] text-[var(--text-xs)]';
      case 'md':
        return 'py-[var(--space-3)] px-[var(--space-6)] text-[var(--text-base)]';
      case 'lg':
        return 'py-[14px] px-[var(--space-8)] text-[var(--text-base)]';
      default:
        return '';
    }
  };

  return (
    <motion.button
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center font-bold rounded-full
        transition-all duration-[var(--transition-fast)] hover:-translate-y-[1px]
        select-none cursor-pointer leading-tight text-center font-sans
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 w-full
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-[var(--space-2)]">
          <Spinner size="sm" className="text-current" />
          <span className="opacity-80">جاري التحميل...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
};
