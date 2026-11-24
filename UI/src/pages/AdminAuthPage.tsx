import React, { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coffee,
  EnvelopeSimple,
  LockKey,
  ArrowLeft,
  ArrowUpRight,
  WarningCircle,
  Eye,
  EyeSlash,
  ShieldCheck,
  Storefront,
  SlidersHorizontal,
} from '@phosphor-icons/react';

interface AdminAuthPageProps {
  role: 'admin' | 'cashier' | 'superadmin';
}

const roleConfig: Record<
  'admin' | 'cashier' | 'superadmin',
  {
    tabLabel: string;
    path: string;
    title: string;
    subtitle: string;
    badge: string;
    icon: React.ReactNode;
  }
> = {
  admin: {
    tabLabel: 'الإدارة',
    path: '/admin/login',
    title: 'لوحة تحكم الإدارة',
    subtitle: 'إدارة العملاء، المكافآت، وتحليلات الاحتفاظ',
    badge: 'بوابة مدير العلامة التجارية',
    icon: <SlidersHorizontal size={22} weight="duotone" />,
  },
  cashier: {
    tabLabel: 'الكاشير',
    path: '/cashier/login',
    title: 'واجهة نقطة الكاشير',
    subtitle: 'التحقق الفوري من أكواد صرف المكافآت',
    badge: 'بوابة الفروع ونقاط البيع',
    icon: <Storefront size={22} weight="duotone" />,
  },
  superadmin: {
    tabLabel: 'المشرف العام',
    path: '/superadmin/login',
    title: 'بوابة المشرف العام',
    subtitle: 'إدارة الشبكات، الاشتراكات، ومراقبة المنصة',
    badge: 'MO2 Cloud Operations',
    icon: <ShieldCheck size={22} weight="duotone" />,
  },
};

const AdminAuthPage: React.FC<AdminAuthPageProps> = ({ role }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const emailId = useId();
  const passwordId = useId();

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'بيانات الدخول غير صحيحة');
      }
      const data = await res.json();
      const tokenKey =
        role === 'superadmin' ? 'loyalty_superadmin_token' : 'loyalty_admin_token';
      localStorage.setItem(tokenKey, data.token);
      navigate(role === 'superadmin' ? '/superadmin' : role === 'cashier' ? '/cashier' : '/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const cfg = roleConfig[role];

  return (
    <div
      className="min-h-[100dvh] bg-[var(--color-admin-bg)] text-[var(--color-admin-text)] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-body"
      dir="rtl"
    >
      {/* Warm Espresso Atmospheric Glow */}
      <div
        className="pointer-events-none absolute -top-32 right-1/4 w-[420px] h-[420px] rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, var(--color-admin-primary) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-36 left-1/4 w-[380px] h-[380px] rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, var(--color-admin-accent) 0%, transparent 70%)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-[28px] p-6 sm:p-8 shadow-[0_32px_70px_-20px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-white/5">
          {/* Role Switcher Pills */}
          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] mb-7"
            role="tablist"
            aria-label="اختيار بوابة الدخول"
          >
            {(['admin', 'cashier', 'superadmin'] as const).map((r) => {
              const active = r === role;
              return (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setError(null);
                    navigate(roleConfig[r].path);
                  }}
                  className={`flex items-center justify-center text-center py-2 px-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)] ${
                    active
                      ? 'bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-primary)] border border-[var(--color-admin-primary)]/30'
                      : 'text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-text)]'
                  }`}
                >
                  {roleConfig[r].tabLabel}
                </button>
              );
            })}
          </div>

          {/* Emblem + Heading */}
          <div className="flex flex-col items-center text-center gap-2 mb-7">
            <div className="w-13 h-13 rounded-2xl bg-[var(--color-admin-primary-soft)] border border-[var(--color-admin-primary)]/30 text-[var(--color-admin-primary)] flex items-center justify-center shadow-inner">
              {cfg.icon}
            </div>
            <span className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] text-[10px] font-bold text-[var(--color-admin-text-muted)]">
              <Coffee size={12} weight="duotone" className="text-[var(--color-admin-primary)]" />
              {cfg.badge}
            </span>
            <h1 className="text-xl font-black text-[var(--color-admin-text)] mt-1">{cfg.title}</h1>
            <p className="text-xs text-[var(--color-admin-text-muted)] leading-relaxed">{cfg.subtitle}</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={emailId} className="text-xs font-bold text-[var(--color-admin-text-muted)]">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <EnvelopeSimple
                  size={17}
                  weight="duotone"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-admin-text-light)] pointer-events-none"
                />
                <input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  dir="ltr"
                  placeholder="owner@cafe.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[var(--color-admin-bg)] text-[var(--color-admin-text)] text-left rounded-xl pr-10 pl-4 py-3 text-sm outline-none border border-[var(--color-admin-border)] placeholder:text-[var(--color-admin-text-light)] transition-colors focus:border-[var(--color-admin-primary)] focus:ring-2 focus:ring-[var(--color-admin-primary)]/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={passwordId} className="text-xs font-bold text-[var(--color-admin-text-muted)]">
                كلمة المرور
              </label>
              <div className="relative">
                <LockKey
                  size={17}
                  weight="duotone"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-admin-text-light)] pointer-events-none"
                />
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  dir="ltr"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[var(--color-admin-bg)] text-[var(--color-admin-text)] text-left rounded-xl pr-10 pl-11 py-3 text-sm outline-none border border-[var(--color-admin-border)] placeholder:text-[var(--color-admin-text-light)] transition-colors focus:border-[var(--color-admin-primary)] focus:ring-2 focus:ring-[var(--color-admin-primary)]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-primary)] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/50 border border-rose-800/40"
                >
                  <WarningCircle size={16} className="text-rose-400 shrink-0" />
                  <span className="text-xs font-medium text-rose-300">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black rounded-xl py-3 text-sm hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-[opacity,transform] enabled:active:scale-[0.96] cursor-pointer shadow-lg shadow-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-admin-surface)]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-[var(--color-admin-bg)]/30 border-t-[var(--color-admin-bg)] rounded-full animate-spin" />
                  جاري الدخول...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  دخول إلى اللوحة
                  <ArrowLeft size={16} weight="bold" />
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-[var(--color-admin-border)] flex items-center justify-between text-[11px]">
            <span className="text-[var(--color-admin-text-light)] font-mono tracking-wider">MO2 Loyalty</span>
            <a
              href="/?tenant=mo2-loyalty"
              className="inline-flex items-center gap-1 font-bold text-[var(--color-admin-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)] rounded"
            >
              تطبيق العميل
              <ArrowUpRight size={13} weight="bold" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminAuthPage;
