// src/components/ui/Toast.tsx

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WarningCircle, CheckCircle, Info } from '@phosphor-icons/react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getStyleConfigs = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-[var(--color-danger)]',
          icon: <WarningCircle size={18} className="text-white shrink-0" />
        };
      case 'info':
        return {
          bg: 'bg-[var(--color-primary)]',
          icon: <Info size={18} className="text-white shrink-0" />
        };
      case 'success':
      default:
        return {
          bg: 'bg-[var(--color-success)]',
          icon: <CheckCircle size={18} className="text-white shrink-0" />
        };
    }
  };

  const config = getStyleConfigs();

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[360px] px-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] text-white text-right ${config.bg}`}
        style={{ direction: 'rtl' }}
      >
        {config.icon}
        <span className="text-[var(--text-sm)] font-medium leading-normal">{message}</span>
      </motion.div>
    </div>
  );
};
export default Toast;
