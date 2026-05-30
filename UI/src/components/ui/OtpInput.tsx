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
    }
  };

  return (
    <div className="flex flex-col gap-[var(--space-2)] items-center w-full">
      {/* Container is rendered in LTR, elements placed reverse order because of Arabic user flow */}
      <div className="flex flex-row justify-center gap-[var(--space-2)] w-full" style={{ direction: 'ltr' }}>
        {Array(length)
          .fill(0)
          .map((_, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              maxLength={1}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              value={digits[index]}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`
                w-10 h-12 text-center text-[var(--text-xl)] font-bold
                number rounded-[var(--radius-md)] border border-[var(--color-border)]
                bg-[var(--color-surface)] shadow-[var(--shadow-sm)]
                focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
                outline-none transition-all duration-[var(--transition-fast)]
                ${error ? 'border-[var(--color-danger)]' : ''}
              `}
            />
          ))}
      </div>
      {error && (
        <span className="text-[var(--text-xs)] text-[var(--color-danger)] mt-[var(--space-1)] text-center font-sans">
          {error}
        </span>
      )}
    </div>
  );
};
