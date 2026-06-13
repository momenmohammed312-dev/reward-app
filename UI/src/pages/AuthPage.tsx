// src/pages/AuthPage.tsx

import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { OtpInput } from '../components/ui/OtpInput';
import { Card, CardBody } from '../components/ui/Card';
import { validateEgyptianPhone, formatEgyptianPhoneForDisplay } from '../utils/validators';
import { Phone, ArrowRight, WarningCircle, Lightbulb } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

export const AuthPage: React.FC = () => {
  const { sendOtp, verifyOtp, loadingAuth, authError, t } = useApp();
  
  // Auth navigation step: 'phone' or 'otp'
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

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

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.div
            key="phone-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Card className="border border-[var(--color-border)] shadow-[var(--shadow-md)]">
              <CardBody className="flex flex-col gap-[var(--space-4)]">
                <div className="text-right">
                  <h2 className="text-[var(--text-lg)] font-bold text-[var(--color-text)] mb-1">
                    {t('auth.phoneTitle')}
                  </h2>
                  <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] leading-relaxed">
                    {t('auth.phoneDesc')}
                  </p>
                </div>

                <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-[var(--space-4)]">
                  <Input
                    label={t('auth.phoneLabel')}
                    type="tel"
                    inputMode="tel"
                    placeholder={t('auth.phonePlaceholder')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                    error={phoneError}
                    disabled={loadingAuth}
                    icon={<Phone size={18} />}
                  />

                  {authError && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-md bg-red-50 text-[var(--color-danger)] text-xs font-medium">
                      <WarningCircle size={14} className="shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    variant="primary" 
                    loading={loadingAuth}
                  >
                    {t('auth.sendOtp')}
                  </Button>
                </form>
              </CardBody>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Card className="border border-[var(--color-border)] shadow-[var(--shadow-md)]">
              <CardBody className="flex flex-col gap-[var(--space-4)] border-b border-transparent">
                {/* Back Link Button */}
                <button
                  onClick={handleBackToPhone}
                  className="flex items-center gap-1 text-[var(--text-xs)] font-bold text-[var(--color-primary)] hover:opacity-85 outline-none mb-1 self-start cursor-pointer transition-opacity"
                >
                  <ArrowRight size={14} />
                  <span>{t('auth.backToPhone')}</span>
                </button>

                <div className="text-right">
                  <h2 className="text-[var(--text-lg)] font-bold text-[var(--color-text)] mb-1">
                    {t('auth.otpTitle')}
                  </h2>
                  <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] leading-relaxed">
                    {t('auth.otpDesc').split('{phone}')[0]}<strong className="number tracking-wider">{formatEgyptianPhoneForDisplay(phone)}</strong>{t('auth.otpDesc').split('{phone}')[1]}
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="flex flex-col gap-[var(--space-5)]">
                  <OtpInput
                    length={6}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      setOtpError(null);
                    }}
                    error={otpError}
                  />

                  <div className="flex flex-col gap-2">
                    <Button 
                      type="submit" 
                      variant="primary" 
                      loading={loadingAuth}
                      disabled={otp.length < 6}
                    >
                      {t('auth.confirmOtp')}
                    </Button>
                    
                    <button
                      type="button"
                      onClick={() => sendOtp(phone)}
                      disabled={loadingAuth}
                      className="text-[var(--text-xs)] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] py-1 mt-1 transition-colors outline-none cursor-pointer"
                    >
                      {t('auth.resendOtp')}
                    </button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};
