// src/components/ui/Input.tsx

import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  id,
  ...props
}) => {
  return (
    <div id={id ? `${id}-wrapper` : undefined} className="flex flex-col gap-2 w-full text-right">
      {label && (
        <label className="text-[var(--text-sm)] font-medium text-[var(--color-text)]">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        <input
          id={id}
          className={`
            w-full bg-[var(--color-surface)] border border-[var(--color-border)]
            rounded-[var(--radius-md)] text-[var(--text-base)] text-[var(--color-text)]
            py-[var(--space-3)] px-[var(--space-4)]
            rtl text-right outline-none
            placeholder-[var(--color-text-light)]
            transition-all duration-[var(--transition-fast)]
            focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
            disabled:opacity-50 disabled:bg-[var(--color-bg)]
            ${icon ? 'pl-10 pr-4' : 'px-4'}
            ${error ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)]' : ''}
            ${className}
          `}
          {...props}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-[var(--color-text-muted)]">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <span className="text-[var(--text-xs)] text-[var(--color-danger)] mt-[var(--space-1)] font-sans">
          {error}
        </span>
      )}
    </div>
  );
};
