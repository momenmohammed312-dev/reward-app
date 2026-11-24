import React, { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift,
  CheckCircle,
  XCircle,
  ClockCounterClockwise,
  Storefront,
  ArrowClockwise,
  SignOut,
  X,
  Coins,
  Plus,
  DeviceMobile,
} from '@phosphor-icons/react';

interface CashierVerificationEntry {
  id: string;
  code: string;
  status: 'success' | 'error';
  message: string;
  time: string;
}

export const CashierDashboard: React.FC = () => {
  const navigate = useNavigate();
  const codeInputId = useId();
  const phoneInputId = useId();
  const pointsInputId = useId();
  const noteInputId = useId();
  const [mode, setMode] = useState<'redeem' | 'earn'>('redeem');
  const [code, setCode] = useState('');
  const [earnPhone, setEarnPhone] = useState('');
  const [earnPoints, setEarnPoints] = useState('');
  const [earnNote, setEarnNote] = useState('');
  const [result, setResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentVerifications, setRecentVerifications] = useState<CashierVerificationEntry[]>([]);

  const handleLogout = () => {
    localStorage.removeItem('loyalty_admin_token');
    navigate('/cashier/login');
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);

    const timeLabel = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/loyalty/process-redemption`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('loyalty_admin_token') || ''}`,
          },
          body: JSON.stringify({ code: trimmed }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.message || 'كود غير صالح أو منتهي الصلاحية';
        setResult({ status: 'error', message: msg });
        setRecentVerifications((prev) => [
          { id: `${Date.now()}`, code: trimmed, status: 'error', message: msg, time: timeLabel },
          ...prev.slice(0, 9),
        ]);
      } else {
        const data = await res.json();
        const msg = `تم التحقق! مكافأة: ${data.reward?.name || 'مكافأة'} للعميل ${data.customer?.name || data.customer?.phone || ''}`;
        setResult({ status: 'success', message: msg });
        setRecentVerifications((prev) => [
          { id: `${Date.now()}`, code: trimmed, status: 'success', message: msg, time: timeLabel },
          ...prev.slice(0, 9),
        ]);
        setCode('');
      }
    } catch {
      const msg = 'فشل الاتصال بالخادم';
      setResult({ status: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleEarnPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = earnPhone.replace(/\D/g, '');
    const numericPoints = parseInt(earnPoints, 10);
    if (!/^01[0-9]{9}$/.test(cleanedPhone)) {
      setResult({ status: 'error', message: 'أدخل رقم موبايل مصري صحيح (11 رقم يبدأ بـ 01)' });
      return;
    }
    if (!numericPoints || numericPoints <= 0) {
      setResult({ status: 'error', message: 'أدخل عدد نقاط صحيح أكبر من صفر' });
      return;
    }

    setLoading(true);
    setResult(null);

    const timeLabel = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/loyalty/manual-earn`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('loyalty_admin_token') || ''}`,
          },
          body: JSON.stringify({
            customer_phone: cleanedPhone,
            points: numericPoints,
            note: earnNote.trim() || 'نقاط طلب من نقطة الكاشير',
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.message || 'تعذر إضافة النقاط — تأكد من تسجيل العميل أولاً';
        setResult({ status: 'error', message: msg });
        setRecentVerifications((prev) => [
          { id: `${Date.now()}`, code: cleanedPhone, status: 'error', message: msg, time: timeLabel },
          ...prev.slice(0, 9),
        ]);
      } else {
        const data = await res.json();
        const customerLabel = data.summary?.name || cleanedPhone;
        const msg = `تمت إضافة +${numericPoints} نقطة للعميل ${customerLabel}`;
        setResult({ status: 'success', message: msg });
        setRecentVerifications((prev) => [
          {
            id: `${Date.now()}`,
            code: `+${numericPoints} نقطة`,
            status: 'success',
            message: `${customerLabel} (${cleanedPhone})`,
            time: timeLabel,
          },
          ...prev.slice(0, 9),
        ]);
        setEarnPhone('');
        setEarnPoints('');
        setEarnNote('');
      }
    } catch {
      setResult({ status: 'error', message: 'فشل الاتصال بالخادم' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full max-w-5xl mx-auto text-[var(--color-admin-text)] font-body flex flex-col gap-6"
      dir="rtl"
    >
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-5 rounded-2xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--color-admin-primary-soft)] border border-[var(--color-admin-primary)]/30 flex items-center justify-center text-[var(--color-admin-primary)]">
            <Storefront size={24} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black">واجهة نقطة الكاشير</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                متصل
              </span>
            </div>
            <p className="text-xs text-[var(--color-admin-text-muted)]">
              أدخل كود المكافأة من شاشة العميل لاعتماد الخصم أو الهدية فوراً
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="px-3.5 py-2 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] hover:border-rose-500/40 text-xs font-bold text-rose-400 flex items-center gap-2 transition-colors cursor-pointer enabled:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <SignOut size={16} weight="bold" />
          تسجيل خروج
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Code Verification & Manual Earn Card */}
        <section className="lg:col-span-7 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl shadow-md flex flex-col gap-5">
          {/* 2-Tab Mode Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)]">
            <button
              type="button"
              onClick={() => { setMode('redeem'); setResult(null); }}
              className={`py-2.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                mode === 'redeem'
                  ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] shadow-sm'
                  : 'text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-text)]'
              }`}
            >
              <Gift size={16} weight="duotone" />
              اعتماد كود مكافأة
            </button>
            <button
              type="button"
              onClick={() => { setMode('earn'); setResult(null); }}
              className={`py-2.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                mode === 'earn'
                  ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] shadow-sm'
                  : 'text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-text)]'
              }`}
            >
              <Coins size={16} weight="duotone" />
              إضافة نقاط طلب
            </button>
          </div>

          {mode === 'redeem' ? (
            <>
              <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
                <h2 className="text-sm font-black flex items-center gap-2">
                  <Gift size={18} className="text-[var(--color-admin-primary)]" weight="duotone" />
                  التحقق من كود الاستبدال
                </h2>
                <span className="text-[11px] font-mono text-[var(--color-admin-text-muted)]">
                  CAFE-XXXXXX
                </span>
              </div>

              <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={codeInputId}
                    className="text-xs text-[var(--color-admin-text-muted)] font-bold"
                  >
                    كود المكافأة
                  </label>
                  <div className="relative">
                    <input
                      id={codeInputId}
                      type="text"
                      dir="ltr"
                      placeholder="CAFE-XXXXXX"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="w-full bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-11 py-4 rounded-2xl text-xl text-[var(--color-admin-text)] text-center font-mono tracking-[0.18em] outline-none focus:border-[var(--color-admin-primary)] focus:ring-2 focus:ring-[var(--color-admin-primary)]/20 transition-colors"
                      maxLength={16}
                      autoFocus
                    />
                    {code && (
                      <button
                        type="button"
                        onClick={() => setCode('')}
                        aria-label="مسح الكود"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-text)] hover:bg-[var(--color-admin-surface)] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-3.5 rounded-xl hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity enabled:active:scale-[0.96] flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
                >
                  {loading ? (
                    <ArrowClockwise className="animate-spin" size={18} />
                  ) : (
                    <CheckCircle size={18} weight="bold" />
                  )}
                  {loading ? 'جارٍ التحقق...' : 'اعتماد وصرف المكافأة'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
                <h2 className="text-sm font-black flex items-center gap-2">
                  <Coins size={18} className="text-[var(--color-admin-primary)]" weight="duotone" />
                  إضافة نقاط طلب يدوياً (بدون ربط POS)
                </h2>
                <span className="text-[11px] font-bold text-emerald-400">تشغيل فوري</span>
              </div>

              <form onSubmit={handleEarnPoints} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={phoneInputId}
                    className="text-xs text-[var(--color-admin-text-muted)] font-bold flex items-center gap-1.5"
                  >
                    <DeviceMobile size={14} />
                    رقم موبايل العميل
                  </label>
                  <input
                    id={phoneInputId}
                    type="tel"
                    dir="ltr"
                    placeholder="01012345678"
                    value={earnPhone}
                    onChange={(e) => setEarnPhone(e.target.value)}
                    className="w-full bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-4 py-3 rounded-xl text-sm text-[var(--color-admin-text)] font-mono tracking-wider outline-none focus:border-[var(--color-admin-primary)] focus:ring-2 focus:ring-[var(--color-admin-primary)]/20 transition-colors"
                    maxLength={14}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={pointsInputId}
                      className="text-xs text-[var(--color-admin-text-muted)] font-bold"
                    >
                      عدد النقاط المضافة
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[25, 50, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEarnPoints(String(preset))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                            earnPoints === String(preset)
                              ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] border-[var(--color-admin-primary)]'
                              : 'bg-[var(--color-admin-bg)] border-[var(--color-admin-border)] text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-text)]'
                          }`}
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    id={pointsInputId}
                    type="number"
                    min={1}
                    dir="ltr"
                    placeholder="50"
                    value={earnPoints}
                    onChange={(e) => setEarnPoints(e.target.value)}
                    className="w-full bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-4 py-3 rounded-xl text-base font-mono font-bold text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)] focus:ring-2 focus:ring-[var(--color-admin-primary)]/20 transition-colors"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={noteInputId}
                    className="text-xs text-[var(--color-admin-text-muted)] font-bold"
                  >
                    رقم الفاتورة أو ملاحظة (اختياري)
                  </label>
                  <input
                    id={noteInputId}
                    type="text"
                    placeholder="رقم الفاتورة أو ملاحظة (اختياري)"
                    value={earnNote}
                    onChange={(e) => setEarnNote(e.target.value)}
                    className="w-full bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-4 py-2.5 rounded-xl text-xs text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)] focus:ring-2 focus:ring-[var(--color-admin-primary)]/20 transition-colors"
                    maxLength={120}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !earnPhone.trim() || !earnPoints}
                  className="w-full bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-3.5 rounded-xl hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity enabled:active:scale-[0.96] flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
                >
                  {loading ? (
                    <ArrowClockwise className="animate-spin" size={18} />
                  ) : (
                    <Plus size={18} weight="bold" />
                  )}
                  {loading ? 'جارٍ الإضافة...' : 'إضافة النقاط للعميل'}
                </button>
              </form>
            </>
          )}

          {result && (
            <div
              role="status"
              className={`p-4 rounded-xl flex items-start gap-3 text-sm font-bold ${
                result.status === 'success'
                  ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950/50 text-rose-400 border border-rose-800'
              }`}
            >
              {result.status === 'success' ? (
                <CheckCircle size={20} className="shrink-0 mt-0.5" />
              ) : (
                <XCircle size={20} className="shrink-0 mt-0.5" />
              )}
              <span>{result.message}</span>
            </div>
          )}
        </section>

        {/* Session Log Card */}
        <section className="lg:col-span-5 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl shadow-md flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
            <h2 className="text-sm font-black flex items-center gap-2">
              <ClockCounterClockwise
                size={18}
                className="text-[var(--color-admin-primary)]"
                weight="duotone"
              />
              سجل الوردية الحالية
            </h2>
            <span className="text-[11px] font-bold text-[var(--color-admin-text-muted)] tabular-nums">
              {recentVerifications.length} عملية
            </span>
          </div>

          {recentVerifications.length > 0 ? (
            <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto overscroll-contain">
              {recentVerifications.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-black text-[var(--color-admin-text)] block">
                      {entry.code}
                    </span>
                    <span className="text-[11px] text-[var(--color-admin-text-muted)] line-clamp-2 mt-0.5 block">
                      {entry.message}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        entry.status === 'success'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {entry.status === 'success' ? 'مقبول' : 'مرفوض'}
                    </span>
                    <span className="text-[10px] text-[var(--color-admin-text-light)] tabular-nums">
                      {entry.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-[var(--color-admin-text-muted)]">
              <ClockCounterClockwise size={28} weight="duotone" className="opacity-50 mb-2" />
              <p className="text-xs font-bold">لم يتم فحص أي كود في هذه الجلسة بعد</p>
              <p className="text-[11px] text-[var(--color-admin-text-light)] mt-1">
                ستظهر الأكواد التي تم التحقق منها هنا مباشرة
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
