// src/components/ui/Input.tsx

import React, { InputHTMLAttributes, useId } from 'react';

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
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div id={id ? `${id}-wrapper` : undefined} className="flex flex-col gap-2 w-full text-start">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-bold text-[var(--color-text)]">
          {label}
        </label>
      )}
      <div
        className={`
          flex items-center gap-2.5 w-full
          bg-[var(--color-bg)]/60 border-2 border-[var(--color-border)]
          rounded-2xl px-4 py-3.5
          transition-[background-color,border-color,box-shadow] duration-200
          focus-within:bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary-soft)]
          has-[input:disabled]:opacity-50 has-[input:disabled]:bg-[var(--color-bg)]
          ${error ? 'border-[var(--color-danger)] focus-within:border-[var(--color-danger)] focus-within:ring-red-500/10' : ''}
        `}
      >
        <input
          id={inputId}
          className={`
            flex-1 min-w-0 bg-transparent border-0 p-0
            text-[15px] font-bold text-[var(--color-text)]
            outline-none
            placeholder-[var(--color-text-light)] placeholder:font-medium
            ${className}
          `}
          {...props}
        />
        {icon && (
          <div className="shrink-0 flex items-center pointer-events-none text-[var(--color-text-muted)]">
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
