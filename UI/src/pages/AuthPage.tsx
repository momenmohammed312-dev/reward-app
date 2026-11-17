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
  Sparkle,
  DeviceMobile,
  ShieldCheck,
  CheckCircle,
  ArrowsClockwise,
  QrCode,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

export const AuthPage: React.FC = () => {
  const { sendOtp, verifyOtp, loadingAuth, authError, language, t } = useApp();

  // Auth navigation step: 'phone' or 'otp'
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  const [qrBranchId, setQrBranchId] = useState<string | null>(() => localStorage.getItem('loyalty_branch_id'));
  const [qrTableNumber, setQrTableNumber] = useState<string | null>(() => localStorage.getItem('loyalty_table_number'));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const branchParam = params.get('branch');
    const tableParam = params.get('table');
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
  };

  const handleFillDemoOtp = () => {
    setOtp('123456');
    setOtpError(null);
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.div
            key="phone-step"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            className="bg-[var(--color-surface)] rounded-[26px] p-6 shadow-[0_14px_34px_rgba(31,24,20,0.08)] border border-[var(--color-border)] flex flex-col gap-5"
          >
            {/* QR Check-in Badge (when launched from branch/table QR) */}
            {(qrBranchId || qrTableNumber) && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold">
                <div className="flex items-center gap-2">
                  <QrCode size={17} weight="duotone" className="shrink-0" />
                  <span>
                    {qrTableNumber
                      ? `تسجيل سريع · طاولة رقم #${qrTableNumber}`
                      : 'تم المسح من رمز QR الخاص بالفرع'}
                  </span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[var(--color-success)] shrink-0" />
              </div>
            )}

            {/* Top Step Badge & Icon Header */}
            <div className="flex items-center justify-between gap-2">
              <span className="bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-[11px] font-extrabold px-3 py-1 rounded-full">
                {t('auth.step1Badge')}
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                <DeviceMobile size={20} weight="duotone" />
              </div>
            </div>

            {/* Welcome Heading */}
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h2 className="text-[21px] font-black text-[var(--color-text)] leading-snug mb-1.5">
                {t('auth.phoneTitle')}
              </h2>
              <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
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
                icon={<Phone size={18} weight="duotone" />}
              />

              {/* Quick Demo Phone Helper Pill */}
              <button
                type="button"
                onClick={handleFillDemoPhone}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-[var(--color-bg)] hover:bg-[var(--color-primary-soft)] border border-dashed border-[var(--color-primary)]/35 text-[var(--color-primary)] text-[12px] font-bold transition-colors cursor-pointer"
              >
                <Sparkle size={15} weight="fill" className="text-[var(--color-accent)] shrink-0" />
                <span>{t('auth.demoPhoneBtn')}</span>
              </button>

              {authError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-[var(--color-danger)] text-xs font-semibold">
                  <WarningCircle size={16} className="shrink-0" />
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

            {/* Security Note */}
            <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-[var(--color-border)]/70 text-[11px] font-medium text-[var(--color-text-muted)]">
              <ShieldCheck size={15} weight="duotone" className="text-[var(--color-success)] shrink-0" />
              <span>{t('auth.securityNote')}</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            className="bg-[var(--color-surface)] rounded-[26px] p-6 shadow-[0_14px_34px_rgba(31,24,20,0.08)] border border-[var(--color-border)] flex flex-col gap-5"
          >
            {/* Top Step Badge & Back Link */}
            <div className="flex items-center justify-between gap-2">
              <span className="bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-[11px] font-extrabold px-3 py-1 rounded-full">
                {t('auth.step2Badge')}
              </span>
              <button
                type="button"
                onClick={handleBackToPhone}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] px-2.5 py-1 rounded-full transition-colors outline-none cursor-pointer"
              >
                {isRtl ? <ArrowRight size={14} weight="bold" /> : <ArrowLeft size={14} weight="bold" />}
                <span>{t('auth.backToPhone')}</span>
              </button>
            </div>

            {/* OTP Heading & Sent Phone Pill */}
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h2 className="text-[21px] font-black text-[var(--color-text)] leading-snug mb-1.5">
                {t('auth.otpTitle')}
              </h2>
              <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                {t('auth.otpDesc').replace(/\s*\{phone\}/, '')}
              </p>

              <div className="mt-3 inline-flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] px-3.5 py-2 rounded-xl">
                <DeviceMobile size={16} weight="duotone" className="text-[var(--color-primary)] shrink-0" />
                <span className="number text-[13.5px] font-extrabold text-[var(--color-primary)] tracking-wider">
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

              {/* Quick Demo OTP Fill Pill */}
              <button
                type="button"
                onClick={handleFillDemoOtp}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-[var(--color-accent-soft)] hover:opacity-90 border border-[var(--color-accent)]/35 text-[#8a571c] text-[12px] font-extrabold transition-all cursor-pointer"
              >
                <Sparkle size={15} weight="fill" className="text-[var(--color-accent)] shrink-0" />
                <span>{t('auth.demoOtpBtn')}</span>
              </button>

              <div className="flex flex-col gap-2.5 pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loadingAuth}
                  disabled={otp.length < 6}
                >
                  <CheckCircle size={18} weight="bold" />
                  <span>{t('auth.confirmOtp')}</span>
                </Button>

                <button
                  type="button"
                  onClick={() => sendOtp(phone)}
                  disabled={loadingAuth}
                  className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] py-2 rounded-xl hover:bg-[var(--color-bg)] transition-colors outline-none cursor-pointer disabled:opacity-50"
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
