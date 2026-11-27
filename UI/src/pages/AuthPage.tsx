// src/pages/AuthPage.tsx

import React, { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { OtpInput } from '../components/ui/OtpInput';
import { validateEgyptianPhone, formatEgyptianPhoneForDisplay } from '../utils/validators';
import {
  Phone,
  ArrowRight,
  ArrowLeft,
  WarningCircle,
  DeviceMobile,
  Check,
  ArrowsClockwise,
  QrCode,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

export const AuthPage: React.FC = () => {
  const { sendOtp, verifyOtp, loadingAuth, authError, currentTenant, language, t } = useApp();

  // Auth navigation step: 'phone' or 'otp'
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [demoPhoneFeedback, setDemoPhoneFeedback] = useState(false);

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [demoOtpFeedback, setDemoOtpFeedback] = useState(false);

  const [qrBranchId, setQrBranchId] = useState<string | null>(() => localStorage.getItem('loyalty_branch_id'));
  const [qrTableNumber, setQrTableNumber] = useState<string | null>(() => localStorage.getItem('loyalty_table_number'));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const branchParam = params.get('branch');
    const tableParam = params.get('station') || params.get('table');
    if (branchParam) {
      localStorage.setItem('loyalty_branch_id', branchParam);
      setQrBranchId(branchParam);
    }
    if (tableParam) {
      localStorage.setItem('loyalty_table_number', tableParam);
      setQrTableNumber(tableParam);
    }
  }, []);

  const isRtl = language === 'ar';

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    if (!phone.trim()) {
      setPhoneError(t('auth.phoneRequired'));
      return;
    }

    if (!validateEgyptianPhone(phone)) {
      setPhoneError(t('auth.phoneInvalid'));
      return;
    }

    const success = await sendOtp(phone);
    if (success) {
      setStep('otp');
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (otp.length < 6) {
      setOtpError(t('auth.otpRequired'));
      return;
    }

    const success = await verifyOtp(otp);
    if (!success) {
      setOtpError(authError || t('auth.otpInvalid'));
    }
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setOtp('');
    setOtpError(null);
  };

  const handleFillDemoPhone = () => {
    setPhone('01012345678');
    setPhoneError(null);
    setDemoPhoneFeedback(true);
    window.setTimeout(() => setDemoPhoneFeedback(false), 1400);
  };

  const handleFillDemoOtp = () => {
    setOtp('123456');
    setOtpError(null);
    setDemoOtpFeedback(true);
    window.setTimeout(() => setDemoOtpFeedback(false), 1400);
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.div
            key="phone-step"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="bg-[var(--color-surface)] rounded-[26px] p-6 shadow-[0_14px_34px_rgba(31,24,20,0.08)] border border-[var(--color-border)] flex flex-col gap-5"
          >
            {/* QR Check-in Context (only when launched from branch/table QR) */}
            {(qrBranchId || qrTableNumber) && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/15 text-[var(--color-primary)] text-xs font-bold">
                <div className="flex items-center gap-2">
                  <QrCode size={16} weight="regular" className="shrink-0" />
                  <span>
                    {qrTableNumber
                      ? currentTenant.businessType === 'supermarket' || currentTenant.businessType === 'retail'
                        ? t('auth.qrStationCheckIn', { station: qrTableNumber })
                        : t('auth.qrTableCheckIn', { table: qrTableNumber })
                      : t('auth.qrBranchCheckIn')}
                  </span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[var(--color-success)] shrink-0" />
              </div>
            )}

            {/* Specific Heading & Concise Copy */}
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h2 className="text-[21px] font-black text-[var(--color-text)] leading-snug mb-1.5">
                {t('auth.phoneTitle')}
              </h2>
              <p className="text-[13.5px] text-[var(--color-text-muted)] leading-relaxed text-balance">
                {t('auth.phoneDesc')}
              </p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
              <Input
                label={t('auth.phoneLabel')}
                type="tel"
                inputMode="tel"
                dir="ltr"
                placeholder={t('auth.phonePlaceholder')}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/[^0-9+]/g, ''));
                  if (phoneError) setPhoneError(null);
                }}
                error={phoneError || undefined}
                disabled={loadingAuth}
                className="number !text-left tracking-wider"
                icon={<Phone size={18} weight="regular" />}
              />

              {/* Functional Quick Demo Phone Fill (dev-only) */}
              {import.meta.env.DEV && (
              <button
                type="button"
                onClick={handleFillDemoPhone}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-2xl border text-[12px] font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  demoPhoneFeedback
                    ? 'bg-[rgba(47,125,91,0.08)] border-[var(--color-success)]/35 text-[var(--color-success)]'
                    : 'bg-[var(--color-bg)] hover:bg-[var(--color-primary-soft)] border-dashed border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {demoPhoneFeedback ? (
                    <motion.span
                      key="phone-filled"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Check size={15} weight="bold" />
                      <span>{t('auth.demoPhoneFilled')}</span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="phone-fill"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-1.5"
                    >
                      <DeviceMobile size={15} weight="regular" />
                      <span>{t('auth.demoPhoneBtn')}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              )}

              {authError && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-[var(--color-danger)] text-xs font-semibold">
                  <WarningCircle size={16} weight="regular" className="shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loadingAuth}
              >
                <span>{t('auth.sendOtp')}</span>
                {isRtl ? <ArrowLeft size={18} weight="bold" /> : <ArrowRight size={18} weight="bold" />}
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="bg-[var(--color-surface)] rounded-[26px] p-6 shadow-[0_14px_34px_rgba(31,24,20,0.08)] border border-[var(--color-border)] flex flex-col gap-5"
          >
            {/* Back Navigation */}
            <div className="flex items-center justify-start">
              <button
                type="button"
                onClick={handleBackToPhone}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] px-3 py-1.5 -mx-3 rounded-full transition-colors outline-none cursor-pointer"
              >
                {isRtl ? <ArrowRight size={15} weight="bold" /> : <ArrowLeft size={15} weight="bold" />}
                <span>{t('auth.backToPhone')}</span>
              </button>
            </div>

            {/* OTP Heading & Target Number */}
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h2 className="text-[21px] font-black text-[var(--color-text)] leading-snug mb-1.5">
                {t('auth.otpTitle')}
              </h2>
              <p className="text-[13.5px] text-[var(--color-text-muted)] leading-relaxed text-balance">
                {t('auth.otpDesc').replace(/\s*\{phone\}/, '')}
              </p>

              <div className="mt-3 inline-flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] px-3.5 py-2 rounded-2xl">
                <DeviceMobile size={16} weight="regular" className="text-[var(--color-primary)] shrink-0" />
                <span className="number text-[14px] font-extrabold text-[var(--color-primary)] tracking-wider">
                  {formatEgyptianPhoneForDisplay(phone)}
                </span>
              </div>
            </div>

            <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
              <OtpInput
                length={6}
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  setOtpError(null);
                }}
                error={otpError || authError || undefined}
              />

              {/* Functional Demo OTP Fill (dev-only) */}
              {import.meta.env.DEV && (
              <button
                type="button"
                onClick={handleFillDemoOtp}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-2xl border text-[12px] font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  demoOtpFeedback
                    ? 'bg-[rgba(47,125,91,0.08)] border-[var(--color-success)]/35 text-[var(--color-success)]'
                    : 'bg-[var(--color-accent-soft)] hover:opacity-90 border-[var(--color-accent)]/35 text-[var(--color-primary-dark)]'
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {demoOtpFeedback ? (
                    <motion.span
                      key="otp-filled"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Check size={15} weight="bold" />
                      <span>{t('auth.demoOtpFilled')}</span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="otp-fill"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-1.5"
                    >
                      <span>{t('auth.demoOtpBtn')}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loadingAuth}
                  disabled={otp.length < 6}
                >
                  <Check size={18} weight="bold" />
                  <span>{t('auth.confirmOtp')}</span>
                </Button>

                <button
                  type="button"
                  onClick={() => sendOtp(phone)}
                  disabled={loadingAuth}
                  className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] py-2 rounded-2xl hover:bg-[var(--color-bg)] transition-colors outline-none cursor-pointer disabled:opacity-50"
                >
                  <ArrowsClockwise size={14} weight="bold" />
                  <span>{t('auth.resendOtp')}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};
