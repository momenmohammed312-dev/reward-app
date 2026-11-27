import React, { useId, useRef, useState } from 'react';
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
  Receipt,
  Barcode,
  Tag,
  Camera,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { CameraScannerModal } from '../components/ui/CameraScannerModal';

interface CashierVerificationEntry {
  id: string;
  code: string;
  status: 'success' | 'error';
  message: string;
  time: string;
}

interface ApprovedRedemptionBanner {
  actionLabel: string;
  rewardName: string;
  customerLabel: string;
  minOrderEgp?: number | null;
}

export const CashierDashboard: React.FC = () => {
  const navigate = useNavigate();
  const codeInputId = useId();
  const phoneInputId = useId();
  const amountInputId = useId();
  const invoiceInputId = useId();
  const pointsInputId = useId();
  const noteInputId = useId();

  const codeInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'redeem' | 'earn'>('redeem');
  const [earnMethod, setEarnMethod] = useState<'invoice' | 'manual'>('invoice');
  const [code, setCode] = useState('');
  const [earnPhone, setEarnPhone] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [earnPoints, setEarnPoints] = useState('');
  const [earnNote, setEarnNote] = useState('');
  const [result, setResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [approvedBanner, setApprovedBanner] = useState<ApprovedRedemptionBanner | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentVerifications, setRecentVerifications] = useState<CashierVerificationEntry[]>([]);
  const [scannerTarget, setScannerTarget] = useState<'code' | 'phone' | null>(null);

  const handleLogout = () => {
    localStorage.removeItem('loyalty_admin_token');
    navigate('/cashier/login');
  };

  const formatRewardAction = (reward?: {
    name?: string;
    type?: string;
    discount_value?: number | string | null;
  }) => {
    if (!reward) return 'صرف المكافأة';
    if (reward.type === 'discount_fixed' && reward.discount_value) {
      return `اخصم ${Number(reward.discount_value)} ج.م من الفاتورة`;
    }
    if (reward.type === 'discount_percent' && reward.discount_value) {
      return `اخصم ${Number(reward.discount_value)}% من الفاتورة`;
    }
    return `اصرف: ${reward.name || 'مكافأة مجانية'}`;
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    setApprovedBanner(null);

    const timeLabel = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      const data = await api.cashierProcessRedemption(trimmed);
      const actionLabel = formatRewardAction(data.reward);
      const customerLabel = data.customer?.name || data.customer?.phone || '';
      const msg = `${actionLabel} — للعميل ${customerLabel}`;

      setResult({ status: 'success', message: msg });
      setApprovedBanner({
        actionLabel,
        rewardName: data.reward?.name || 'مكافأة',
        customerLabel,
        minOrderEgp: data.reward?.min_order_egp ? Number(data.reward.min_order_egp) : null,
      });
      setRecentVerifications((prev) => [
        { id: `${Date.now()}`, code: trimmed, status: 'success', message: msg, time: timeLabel },
        ...prev.slice(0, 9),
      ]);
      setCode('');
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err: any) {
      const msg = err?.message || 'كود غير صالح أو منتهي الصلاحية';
      setResult({ status: 'error', message: msg });
      setRecentVerifications((prev) => [
        { id: `${Date.now()}`, code: trimmed, status: 'error', message: msg, time: timeLabel },
        ...prev.slice(0, 9),
      ]);
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleEarnByInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = earnPhone.replace(/\D/g, '');
    const amountNum = Number(invoiceAmount);
    if (!/^01[0-9]{9}$/.test(cleanedPhone)) {
      setResult({ status: 'error', message: 'أدخل رقم موبايل مصري صحيح (11 رقم يبدأ بـ 01)' });
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setResult({ status: 'error', message: 'أدخل قيمة الفاتورة بالجنيه أكبر من صفر' });
      return;
    }

    setLoading(true);
    setResult(null);
    setApprovedBanner(null);

    const timeLabel = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      const data = await api.cashierEarnByInvoice({
        customer_phone: cleanedPhone,
        amount_egp: amountNum,
        invoice_id: invoiceId.trim() || undefined,
        note: earnNote.trim() || undefined,
      });
      const pts = Number(data.pointsEarned || 0);
      const newBadge = data.customerCreated ? ' (عميل جديد تم تسجيله تلقائياً)' : '';
      const msg = `تمت إضافة +${pts} نقطة لفاتورة ${amountNum} ج.م${newBadge}`;
      setResult({ status: 'success', message: msg });
      setRecentVerifications((prev) => [
        {
          id: `${Date.now()}`,
          code: `+${pts} نقطة`,
          status: 'success',
          message: `${cleanedPhone} · ${amountNum} ج.م (#${data.invoiceId})`,
          time: timeLabel,
        },
        ...prev.slice(0, 9),
      ]);
      setEarnPhone('');
      setInvoiceAmount('');
      setInvoiceId('');
      setEarnNote('');
      setTimeout(() => phoneInputRef.current?.focus(), 50);
    } catch (err: any) {
      const msg = err?.message || 'تعذر احتساب نقاط الفاتورة';
      setResult({ status: 'error', message: msg });
      setRecentVerifications((prev) => [
        { id: `${Date.now()}`, code: cleanedPhone, status: 'error', message: msg, time: timeLabel },
        ...prev.slice(0, 9),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEarnPointsManual = async (e: React.FormEvent) => {
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
    setApprovedBanner(null);

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
            note: earnNote.trim() || 'نقاط بونص من نقطة الكاشير',
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
                متصل · جاهز للباركود
              </span>
            </div>
            <p className="text-xs text-[var(--color-admin-text-muted)]">
              امسح باركود الكوبون للخصم أو سجّل قيمة الفاتورة لإضافة النقاط تلقائياً
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
        {/* Code Verification & Invoice Earn Card */}
        <section className="lg:col-span-7 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl shadow-md flex flex-col gap-5">
          {/* 2-Tab Mode Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)]">
            <button
              type="button"
              onClick={() => {
                setMode('redeem');
                setResult(null);
                setApprovedBanner(null);
              }}
              className={`py-2.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                mode === 'redeem'
                  ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] shadow-sm'
                  : 'text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-text)]'
              }`}
            >
              <Gift size={16} weight="duotone" />
              اعتماد كود خصم / مكافأة
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('earn');
                setResult(null);
                setApprovedBanner(null);
              }}
              className={`py-2.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                mode === 'earn'
                  ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] shadow-sm'
                  : 'text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-text)]'
              }`}
            >
              <Receipt size={16} weight="duotone" />
              تسجيل فاتورة / إضافة نقاط
            </button>
          </div>

          {mode === 'redeem' ? (
            <>
              <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
                <h2 className="text-sm font-black flex items-center gap-2">
                  <Barcode size={18} className="text-[var(--color-admin-primary)]" weight="duotone" />
                  التحقق من كود الاستبدال (كتابة أو مسح باركود)
                </h2>
                <span className="text-[11px] font-mono text-[var(--color-admin-text-muted)]">
                  MO2-XXXXXX
                </span>
              </div>

              <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={codeInputId}
                    className="text-xs text-[var(--color-admin-text-muted)] font-bold flex items-center justify-between"
                  >
                    <span>كود المكافأة / القسيمة</span>
                    <button
                      type="button"
                      onClick={() => setScannerTarget('code')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-primary)] border border-[var(--color-admin-primary)]/30 text-[11px] font-bold cursor-pointer"
                    >
                      <Camera size={13} weight="duotone" />
                      مسح بالكاميرا
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      ref={codeInputRef}
                      id={codeInputId}
                      type="text"
                      dir="ltr"
                      placeholder="MO2-000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="w-full bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-11 py-4 rounded-2xl text-xl text-[var(--color-admin-text)] text-center font-mono tracking-[0.18em] outline-none focus:border-[var(--color-admin-primary)] focus:ring-2 focus:ring-[var(--color-admin-primary)]/20 transition-colors"
                      maxLength={20}
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

              {approvedBanner && (
                <div className="p-4 rounded-2xl bg-emerald-950/70 border-2 border-emerald-500/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-300">إجراء الكاشير المطلوب الآن</span>
                    {approvedBanner.minOrderEgp ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold">
                        <Tag size={12} weight="bold" />
                        الحد الأدنى للفاتورة: {approvedBanner.minOrderEgp} ج.م
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xl font-black text-white">{approvedBanner.actionLabel}</div>
                  <div className="text-xs text-emerald-200/80">
                    {approvedBanner.rewardName} · العميل: {approvedBanner.customerLabel}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-admin-border)] pb-3">
                <h2 className="text-sm font-black flex items-center gap-2">
                  <Coins size={18} className="text-[var(--color-admin-primary)]" weight="duotone" />
                  {earnMethod === 'invoice'
                    ? 'احتساب نقاط الفاتورة تلقائياً (ج.م)'
                    : 'إضافة نقاط بونص يدوية'}
                </h2>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)]">
                  <button
                    type="button"
                    onClick={() => {
                      setEarnMethod('invoice');
                      setResult(null);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                      earnMethod === 'invoice'
                        ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)]'
                        : 'text-[var(--color-admin-text-muted)]'
                    }`}
                  >
                    بقيمة الفاتورة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEarnMethod('manual');
                      setResult(null);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                      earnMethod === 'manual'
                        ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)]'
                        : 'text-[var(--color-admin-text-muted)]'
                    }`}
                  >
                    نقاط مباشرة
                  </button>
                </div>
              </div>

              {earnMethod === 'invoice' ? (
                <form onSubmit={handleEarnByInvoice} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={phoneInputId}
                      className="text-xs text-[var(--color-admin-text-muted)] font-bold flex items-center justify-between gap-1.5"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <DeviceMobile size={14} />
                        رقم موبايل العميل (أو امسح باركود البطاقة)
                      </span>
                      <button
                        type="button"
                        onClick={() => setScannerTarget('phone')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-primary)] border border-[var(--color-admin-primary)]/30 text-[11px] font-bold cursor-pointer"
                      >
                        <Camera size={13} weight="duotone" />
                        مسح بالكاميرا
                      </button>
                    </label>
                    <input
                      ref={phoneInputRef}
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
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label
                        htmlFor={amountInputId}
                        className="text-xs text-[var(--color-admin-text-muted)] font-bold"
                      >
                        إجمالي الفاتورة (ج.م)
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[100, 250, 500, 1000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setInvoiceAmount(String(preset))}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                              invoiceAmount === String(preset)
                                ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] border-[var(--color-admin-primary)]'
                                : 'bg-[var(--color-admin-bg)] border-[var(--color-admin-border)] text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-text)]'
                            }`}
                          >
                            {preset} ج.م
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      id={amountInputId}
                      type="number"
                      min={1}
                      step="0.01"
                      dir="ltr"
                      placeholder="450"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      className="w-full bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-4 py-3 rounded-xl text-base font-mono font-bold text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)] focus:ring-2 focus:ring-[var(--color-admin-primary)]/20 transition-colors"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={invoiceInputId}
                        className="text-xs text-[var(--color-admin-text-muted)] font-bold"
                      >
                        رقم الإيصال / الفاتورة (اختياري)
                      </label>
                      <input
                        id={invoiceInputId}
                        type="text"
                        dir="ltr"
                        placeholder="INV-4821"
                        value={invoiceId}
                        onChange={(e) => setInvoiceId(e.target.value)}
                        className="w-full bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-4 py-2.5 rounded-xl text-xs font-mono text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)] transition-colors"
                        maxLength={80}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={noteInputId}
                        className="text-xs text-[var(--color-admin-text-muted)] font-bold"
                      >
                        ملاحظة (اختياري)
                      </label>
                      <input
                        id={noteInputId}
                        type="text"
                        placeholder="مشتريات بقالة..."
                        value={earnNote}
                        onChange={(e) => setEarnNote(e.target.value)}
                        className="w-full bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-4 py-2.5 rounded-xl text-xs text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)] transition-colors"
                        maxLength={120}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !earnPhone.trim() || !invoiceAmount}
                    className="w-full bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-3.5 rounded-xl hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity enabled:active:scale-[0.96] flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
                  >
                    {loading ? (
                      <ArrowClockwise className="animate-spin" size={18} />
                    ) : (
                      <Plus size={18} weight="bold" />
                    )}
                    {loading ? 'جارٍ احتساب النقاط...' : 'حساب وإضافة نقاط الفاتورة'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleEarnPointsManual} className="flex flex-col gap-4">
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
              )}
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
              <p className="text-xs font-bold">لم يتم تسجيل أي عملية في هذه الجلسة بعد</p>
              <p className="text-[11px] text-[var(--color-admin-text-light)] mt-1">
                ستظهر الفواتير والأكواد المعتمدة هنا مباشرة
              </p>
            </div>
          )}
        </section>
      </div>

      <CameraScannerModal
        isOpen={scannerTarget !== null}
        title={scannerTarget === 'phone' ? 'مسح باركود بطاقة العميل' : 'مسح باركود قسيمة الخصم'}
        onDetected={(val) => {
          if (scannerTarget === 'phone') {
            setEarnPhone(val.replace(/\D/g, ''));
          } else if (scannerTarget === 'code') {
            setCode(val.toUpperCase());
          }
        }}
        onClose={() => setScannerTarget(null)}
      />
    </div>
  );
};
