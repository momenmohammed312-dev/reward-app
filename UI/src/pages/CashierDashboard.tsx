import React, { useState } from 'react';
import { Gift, CheckCircle, XCircle, User, Storefront, ArrowClockwise } from '@phosphor-icons/react';

export const CashierDashboard: React.FC = () => {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/loyalty/process-redemption`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('loyalty_admin_token') || ''}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        setResult({ status: 'error', message: err.message || 'كود غير صالح' });
      } else {
        const data = await res.json();
        setResult({ status: 'success', message: `تم التحقق! مكافأة: ${data.reward.name} للعميل ${data.customer.name}` });
        setCode('');
      }
    } catch {
      setResult({ status: 'error', message: 'فشل الاتصال بالخادم' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-slate-100" style={{ direction: 'rtl' }}>
      <div className="flex items-center gap-3 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl mb-6">
        <Storefront size={28} className="text-emerald-400" />
        <div>
          <h1 className="text-lg font-black">واجهة الكاشير</h1>
          <p className="text-xs text-slate-400">التحقق من أكواد استبدال المكافآت</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
          <h2 className="text-sm font-bold border-b border-slate-700 pb-3 mb-4 flex items-center gap-2">
            <Gift size={18} className="text-amber-400" />
            التحقق من كود الاستبدال
          </h2>
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-bold">أدخل كود المكافأة</label>
              <input
                type="text"
                placeholder="CAFE-XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="bg-slate-900 border border-slate-700 p-4 rounded-xl text-lg text-slate-200 text-center font-mono tracking-widest outline-none focus:border-emerald-500"
                maxLength={13}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <ArrowClockwise className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              {loading ? 'جارٍ التحقق...' : 'تحقق من الكود'}
            </button>
          </form>

          {result && (
            <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 text-sm font-bold ${
              result.status === 'success'
                ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800'
                : 'bg-red-950/50 text-red-400 border border-red-800'
            }`}>
              {result.status === 'success' ? <CheckCircle size={20} className="shrink-0 mt-0.5" /> : <XCircle size={20} className="shrink-0 mt-0.5" />}
              <span>{result.message}</span>
            </div>
          )}
        </div>

        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
          <h2 className="text-sm font-bold border-b border-slate-700 pb-3 mb-4 flex items-center gap-2">
            <User size={18} className="text-cyan-400" />
            آخر العمليات
          </h2>
          <div className="flex flex-col gap-3 text-xs text-slate-400">
            <p className="text-center py-8">سيتم عرض آخر عمليات التحقق هنا</p>
          </div>
        </div>
      </div>
    </div>
  );
};
