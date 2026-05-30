// src/components/ui/Card.tsx

import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        transition: 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 450ms cubic-bezier(0.16, 1, 0.3, 1), border-color 450ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className={`
        card relative overflow-hidden ring-1 ring-black/5 dark:ring-white/5 shadow-[var(--shadow-card)]
        ${onClick ? 'cursor-pointer hover:translate-y-[-3px] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-primary)]' : ''}
        ${className}
      `}
    >
      {/* Double bezel premium outline */}
      <div className="absolute inset-[1px] rounded-[calc(var(--radius-lg)-1px)] border border-white/[0.04] pointer-events-none z-10" />
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`card-header p-6 sm:p-8 ${className}`}>
      {children}
    </div>
  );
};

export const CardBody: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`card-body p-6 sm:p-8 ${className}`}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`card-footer p-6 border-t border-[var(--color-border)] ${className}`}>
      {children}
    </div>
  );
};
