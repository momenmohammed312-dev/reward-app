// src/components/ui/BottomSheet.tsx

import React, { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from '@phosphor-icons/react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40 transition-opacity"
          />

          {/* Mobile bottom sheet container inside max-width wrapper constraint */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 max-w-[var(--max-width)] mx-auto bg-[var(--color-surface)] rounded-t-[var(--radius-xl)] shadow-[var(--shadow-lg)] z-50 overflow-hidden flex flex-col max-h-[85vh] border-t border-[var(--color-border)]"
          >
            {/* Grab Drag Bar Notch */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-[var(--color-border)] rounded-full" />
            </div>

            {/* Header element */}
            <div className="flex items-center justify-between px-[var(--space-5)] pb-3 border-b border-[var(--color-border)]">
              {title ? (
                <span className="text-[var(--text-lg)] font-bold text-[var(--color-text)]">
                  {title}
                </span>
              ) : (
                <div />
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-[var(--color-bg)] transition-colors text-[var(--color-text-muted)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content body inside bottom sheet */}
            <div className="p-[var(--space-5)] overflow-y-auto flex-1 text-right" style={{ direction: 'rtl' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
