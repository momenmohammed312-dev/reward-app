import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Gear, EnvelopeSimple, LockKey, ArrowRight, WarningCircle, Eye, EyeSlash, Sparkle } from '@phosphor-icons/react';

interface AdminAuthPageProps {
  role: 'admin' | 'cashier' | 'superadmin';
}

const roleConfig: Record<string, { title: string; subtitle: string; icon: React.ReactNode; gradient: string }> = {
  admin: {
    title: 'لوحة تحكم الإدارة',
    subtitle: 'إدارة العملاء، المكافآت، والتقارير',
    icon: <Gear size={22} weight="duotone" />,
    gradient: 'from-emerald-600 to-teal-500',
  },
  cashier: {
    title: 'واجهة الكاشير',
    subtitle: 'صرف النقاط والمكافآت للعملاء',
    icon: <Sparkle size={22} weight="duotone" />,
    gradient: 'from-amber-600 to-orange-500',
  },
  superadmin: {
    title: 'Super Admin',
    subtitle: 'البنية التحتية، الفواتير، والمراقبة',
    icon: <Gear size={22} weight="duotone" />,
    gradient: 'from-indigo-600 to-violet-500',
  },
};

const AdminAuthPage: React.FC<AdminAuthPageProps> = ({ role }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
        const data = await res.json();
        throw new Error(data.message || 'بيانات الدخول غير صحيحة');
      }
      const data = await res.json();
      const tokenKey =
        role === 'superadmin' ? 'loyalty_superadmin_token' : 'loyalty_admin_token';
      localStorage.setItem(tokenKey, data.token);
      navigate(role === 'superadmin' ? '/superadmin' : role === 'cashier' ? '/cashier' : '/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cfg = roleConfig[role];

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden" style={{ direction: 'rtl' }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring' as const, stiffness: 120, damping: 20 }}
        className="w-full max-w-sm relative"
      >
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-slate-700/50 via-slate-600/30 to-slate-700/50 rounded-3xl blur-xl opacity-60" />
          <div className="relative bg-slate-900/90 backdrop-blur-2xl border border-slate-700/60 rounded-3xl p-8 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
            <div className="flex flex-col items-center gap-2 mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' as const, stiffness: 200, damping: 15, delay: 0.1 }}
                className={`bg-gradient-to-br ${cfg.gradient} p-3.5 rounded-2xl shadow-lg`}
              >
                {cfg.icon}
              </motion.div>
              <h1 className="text-xl font-black text-slate-100 mt-1">{cfg.title}</h1>
              <p className="text-xs text-slate-500 font-medium">{cfg.subtitle}</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">البريد الإلكتروني</label>
                <div className="relative">
                  <EnvelopeSimple size={16} weight="duotone" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-800/80 text-slate-100 rounded-xl pr-10 pl-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-500/50 focus:bg-slate-800 placeholder-slate-600 transition-all duration-200 border border-slate-700/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">كلمة المرور</label>
                <div className="relative">
                  <LockKey size={16} weight="duotone" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-800/80 text-slate-100 rounded-xl pr-10 pl-10 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-500/50 focus:bg-slate-800 placeholder-slate-600 transition-all duration-200 border border-slate-700/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors outline-none"
                    tabIndex={-1}
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
                    className="flex items-center gap-2 p-3 rounded-xl bg-red-950/50 border border-red-800/40"
                  >
                    <WarningCircle size={16} className="text-red-400 shrink-0" />
                    <span className="text-xs font-medium text-red-300">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className={`mt-1 w-full bg-gradient-to-r ${cfg.gradient} text-white font-bold rounded-xl py-3 text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/20`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    جاري الدخول...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    دخول
                    <ArrowRight size={16} weight="bold" />
                  </span>
                )}
              </motion.button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <p className="text-[10px] text-slate-600 font-mono tracking-wider">MO2 — Platform</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminAuthPage;
