// src/components/ui/OtpInput.tsx

import React, { useRef, useState, useEffect } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  error?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({ length = 6, value, onChange, error }) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const newDigits = Array(length).fill('');
    for (let i = 0; i < value.length && i < length; i++) {
      newDigits[i] = value[i];
    }
    setDigits(newDigits);
  }, [value, length]);

  const handleChange = (index: number, val: string) => {
    const onlyNums = val.replace(/[^0-9]/g, '');
    if (!onlyNums) {
      const updated = [...digits];
      updated[index] = '';
      setDigits(updated);
      onChange(updated.join(''));
      return;
    }

    const singleChar = onlyNums[onlyNums.length - 1];
    const updated = [...digits];
    updated[index] = singleChar;
    setDigits(updated);
    onChange(updated.join(''));

    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        const updated = [...digits];
        updated[index - 1] = '';
        setDigits(updated);
        onChange(updated.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    if (!pasted) return;
    const updated = Array(length).fill('');
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setDigits(updated);
    onChange(updated.join(''));
    const focusIndex = Math.min(pasted.length - 1, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="flex flex-col gap-[var(--space-3)] items-center w-full">
      <div className="flex flex-row justify-center gap-2 sm:gap-2.5 w-full" style={{ direction: 'ltr' }}>
        {Array(length)
          .fill(0)
          .map((_, index) => {
            const isFilled = !!digits[index];
            return (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                value={digits[index]}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                style={{ textAlign: 'center', direction: 'ltr' }}
                className={`
                  w-11 h-13 sm:w-[48px] sm:h-[56px] !text-center text-[21px] font-black
                  points-value rounded-2xl border-2 outline-none select-none
                  transition-all duration-200
                  ${error
                    ? 'border-[var(--color-danger)] bg-red-50/70 text-[var(--color-danger)]'
                    : isFilled
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-[0_4px_12px_rgba(107,74,53,0.12)] -translate-y-0.5'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)]/70 text-[var(--color-text)] hover:border-[var(--color-primary)]/50'
                  }
                  focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] focus:ring-4 focus:ring-[var(--color-primary-soft)] focus:scale-105
                `}
              />
            );
          })}
      </div>
      {error && (
        <span className="text-[var(--text-xs)] font-semibold text-[var(--color-danger)] text-center font-sans">
          {error}
        </span>
      )}
    </div>
  );
};
