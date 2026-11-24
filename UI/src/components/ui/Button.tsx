// src/components/ui/Button.tsx

import React from 'react';
import { motion } from 'motion/react';
import { Spinner } from './Spinner';
import { useApp } from '../../store/AppContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'accent' | 'ghost' | 'danger';
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
  const { t } = useApp();
  // Styles resolved cleanly to use exclusively CSS variables
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-l from-[#6b4a35] to-[#53392a] bg-[var(--color-primary)] text-white border border-transparent hover:opacity-95 shadow-[0_8px_20px_-4px_rgba(107,74,53,0.4)] hover:shadow-[0_12px_24px_-4px_rgba(107,74,53,0.5)]';
      case 'secondary':
        return 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/15 hover:opacity-90';
      case 'outline':
        return 'bg-transparent text-[var(--color-primary)] border-2 border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]';
      case 'accent':
        return 'bg-[var(--color-accent)] text-white border border-transparent hover:opacity-90 shadow-md';
      case 'ghost':
        return 'bg-transparent text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]';
      case 'danger':
        return 'bg-[var(--color-danger)] text-white border border-transparent hover:opacity-90 shadow-sm';
      default:
        return '';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-[var(--space-2)] px-[var(--space-4)] text-[var(--text-xs)] rounded-full gap-1.5';
      case 'md':
        return 'py-[var(--space-3)] px-[var(--space-6)] text-[var(--text-base)] rounded-full gap-2';
      case 'lg':
        return 'px-6 py-4 text-[15px] font-extrabold rounded-2xl gap-2.5';
      default:
        return '';
    }
  };

  return (
    <motion.button
      whileTap={!disabled && !loading ? { scale: 0.96 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center font-bold
        transition-[transform,opacity,background-color,box-shadow] duration-[var(--transition-fast)] hover:-translate-y-[1px]
        select-none cursor-pointer leading-tight text-center font-sans
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 w-full
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${className}
      `}
      {...props as any}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-[var(--space-2)]">
          <Spinner size="sm" className="text-current" />
          <span className="opacity-80">{t('common.loading')}</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
};
