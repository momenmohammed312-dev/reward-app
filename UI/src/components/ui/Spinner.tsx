// src/components/ui/Spinner.tsx

import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const getDims = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4 border-2';
      case 'lg':
        return 'w-12 h-12 border-4';
      case 'md':
      default:
        return 'w-8 h-8 border-[3px]';
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`
          rounded-full animate-spin
          border-t-[var(--color-primary)]
          border-r-transparent
          border-b-[var(--color-border)]
          border-l-[var(--color-border)]
          ${getDims()}
          ${className}
        `}
        style={{
          borderTopColor: 'var(--color-primary)',
        }}
      />
    </div>
  );
};
