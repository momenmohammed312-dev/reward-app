import React, { useState } from 'react';
import {
  TrendUp,
  Users,
  Gift,
  Coins,
  Plus,
  Minus,
  CheckCircle,
  ArrowClockwise,
  CurrencyCircleDollar,
  Receipt,
  WarningCircle,
  Percent,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api } from '../../../services/api';
import { RetentionAnalytics } from '../RetentionAnalytics';
import { AdminMessage, AdminStats, Branch, Customer } from '../types';

interface OverviewTabProps {
  adminStats: AdminStats;
  statsLoading: boolean;
  chartStats: Array<{ month: string; earned: number; redeemed: number }>;
  chartLoading: boolean;
  customers: Customer[];
  branches: Branch[];
  selectedBranchFilter?: string;
  onSelectBranchFilter: (branchId: string | undefined) => void;
  onMessage: (msg: AdminMessage) => void;
  onDataChanged: () => Promise<void>;
  onOpenCustomerLedger: (customerId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  adminStats,
  statsLoading,
  chartStats,
  chartLoading,
  customers,
  branches,
  selectedBranchFilter,
  onSelectBranchFilter,
  onMessage,
  onDataChanged,
  onOpenCustomerLedger,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [adjustDirection, setAdjustDirection] = useState<'add' | 'deduct'>('add');
  const [pointsAmount, setPointsAmount] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('مكافأة يدوية من الإدارة');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseInt(pointsAmount, 10);
    if (!selectedCustomerId || !numeric || numeric <= 0) {
      onMessage({ text: 'يرجى اختيار العميل وإدخال عدد نقاط أكبر من صفر', type: 'error' });
      return;
    }

    const signedPoints = adjustDirection === 'add' ? numeric : -numeric;
    setIsSubmitting(true);
    try {
      await api.adminAdjustPoints({
        customer_id: selectedCustomerId,
        points: signedPoints,
        note: adjustmentNote.trim() || (adjustDirection === 'add' ? 'إضافة إدارية' : 'خصم إداري'),
      });
      onMessage({
        text:
          adjustDirection === 'add'
            ? `تمت إضافة +${numeric} نقطة بنجاح`
            : `تم خصم -${numeric} نقطة بنجاح`,
        type: 'success',
      });
      setPointsAmount('');
      setSelectedCustomerId('');
      await onDataChanged();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل تعديل النقاط', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Core 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-2 animate-pulse"
            >
              <div className="h-3 w-20 bg-[var(--color-admin-border)] rounded" />
              <div className="h-8 w-16 bg-[var(--color-admin-border)] rounded mt-1" />
            </div>
          ))
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between text-[var(--color-admin-text-muted)] text-xs font-bold">
                <span>إجمالي المشتركين</span>
                <Users size={20} style={{ color: 'var(--color-admin-primary)' }} />
              </div>
              <span className="text-2xl font-black text-[var(--color-admin-text)] tabular-nums">
                {adminStats.totalCustomers.toLocaleString()}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between text-[var(--color-admin-text-muted)] text-xs font-bold">
                <span>النشطين (آخر 30 يوم)</span>
                <TrendUp size={20} className="text-emerald-500" />
              </div>
              <span className="text-2xl font-black text-[var(--color-admin-text)] tabular-nums">
                {adminStats.activeLoyalists.toLocaleString()}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between text-[var(--color-admin-text-muted)] text-xs font-bold">
                <span>النقاط المصدرة (هذا الشهر)</span>
                <Coins size={20} className="text-amber-500" />
              </div>
              <span className="text-2xl font-black text-[var(--color-admin-text)] tabular-nums">
                {adminStats.pointsIssuedThisMonth.toLocaleString()}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between text-[var(--color-admin-text-muted)] text-xs font-bold">
                <span>القسائم المصروفة اليوم</span>
                <Gift size={20} className="text-rose-500" />
              </div>
              <span className="text-2xl font-black text-[var(--color-admin-text)] tabular-nums">
                {adminStats.redemptionsToday.toLocaleString()}
              </span>
            </motion.div>
          </>
        )}
      </div>

      {/* Financial Margin & Grocery Liability KPIs */}
      {!statsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-4 rounded-2xl flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-admin-text-muted)]">
              <span>متوسط قيمة الفاتورة</span>
              <Receipt size={18} className="text-sky-400" />
            </div>
            <span className="text-xl font-black text-[var(--color-admin-text)] tabular-nums">
              {adminStats.avgBasketEgp.toLocaleString()} <span className="text-xs font-bold text-[var(--color-admin-text-muted)]">ج.م</span>
            </span>
            <span className="text-[10px] text-[var(--color-admin-text-muted)]">
              مبيعات آخر 30 يوم: {adminStats.totalRevenue30d.toLocaleString()} ج.م
            </span>
          </div>

          <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-4 rounded-2xl flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-admin-text-muted)]">
              <span>الالتزام المالي للنقاط</span>
              <CurrencyCircleDollar size={18} className="text-amber-400" />
            </div>
            <span className="text-xl font-black text-amber-400 tabular-nums">
              {adminStats.pointsLiabilityEgp.toLocaleString()} <span className="text-xs font-bold">ج.م</span>
            </span>
            <span className="text-[10px] text-[var(--color-admin-text-muted)]">
              {adminStats.totalOutstandingPoints.toLocaleString()} نقطة متداولة × {adminStats.pointValueEgp} ج.م
            </span>
          </div>

          <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-4 rounded-2xl flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-admin-text-muted)]">
              <span>نسبة استخدام القسائم</span>
              <Percent size={18} className="text-emerald-400" />
            </div>
            <span className="text-xl font-black text-emerald-400 tabular-nums">
              {adminStats.redemptionRatePct}%
            </span>
            <span className="text-[10px] text-[var(--color-admin-text-muted)]">
              أكواد مصروفة فعلياً من إجمالي المصدرة
            </span>
          </div>

          <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-4 rounded-2xl flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-admin-text-muted)]">
              <span>عملاء بحاجة لتنشيط</span>
              <WarningCircle size={18} className="text-rose-400" />
            </div>
            <span className="text-xl font-black text-rose-400 tabular-nums">
              {adminStats.inactive14dCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-[var(--color-admin-text-muted)]">
              غايبين +14 يوم (منهم {adminStats.inactive30dCount} غايبين +30 يوم)
            </span>
          </div>
        </div>
      )}

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl">
          <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3 mb-4">
            <TrendUp size={20} style={{ color: 'var(--color-admin-primary)' }} />
            <h2 className="text-sm font-bold">اتجاه النقاط (آخر 6 أشهر)</h2>
          </div>
          <div className="h-64" dir="ltr">
            {chartLoading ? (
              <div className="h-full w-full bg-[var(--color-admin-border)] rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earnedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-admin-success)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-admin-success)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="redeemedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-admin-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-admin-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-admin-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-admin-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', borderRadius: 12, fontSize: 12, color: 'var(--color-admin-text)' }} />
                  <Area type="monotone" dataKey="earned" stroke="var(--color-admin-success)" fill="url(#earnedGrad)" strokeWidth={2} name="النقاط المكتسبة" />
                  <Area type="monotone" dataKey="redeemed" stroke="var(--color-admin-primary)" fill="url(#redeemedGrad)" strokeWidth={2} name="النقاط المستردة" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl">
          <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3 mb-4">
            <Gift size={20} className="text-[var(--color-admin-primary)]" />
            <h2 className="text-sm font-bold">النقاط الشهرية</h2>
          </div>
          <div className="h-64" dir="ltr">
            {chartLoading ? (
              <div className="h-full w-full bg-[var(--color-admin-border)] rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-admin-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-admin-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', borderRadius: 12, fontSize: 12, color: 'var(--color-admin-text)' }} />
                  <Bar dataKey="earned" fill="var(--color-admin-success)" radius={[4, 4, 0, 0]} name="النقاط المكتسبة" />
                  <Bar dataKey="redeemed" fill="var(--color-admin-primary)" radius={[4, 4, 0, 0]} name="النقاط المستردة" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Quick (+/-) Points Adjustment & Active Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-admin-border)] pb-3">
            <div className="flex items-center gap-2">
              <Coins size={22} className="text-[var(--color-admin-primary)]" />
              <h2 className="text-sm font-bold">تعديل النقاط يدوياً (إضافة أو خصم)</h2>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)]">
              <button
                type="button"
                onClick={() => {
                  setAdjustDirection('add');
                  setAdjustmentNote('مكافأة يدوية من الإدارة');
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  adjustDirection === 'add'
                    ? 'bg-emerald-600 text-white'
                    : 'text-[var(--color-admin-text-muted)]'
                }`}
              >
                <Plus size={12} weight="bold" /> إضافة
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustDirection('deduct');
                  setAdjustmentNote('خصم تصحيحي من الإدارة');
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  adjustDirection === 'deduct'
                    ? 'bg-rose-600 text-white'
                    : 'text-[var(--color-admin-text-muted)]'
                }`}
              >
                <Minus size={12} weight="bold" /> خصم
              </button>
            </div>
          </div>

          <form onSubmit={handleAdjustPoints} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--color-admin-text-muted)] font-bold">اختر العميل</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-xs text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)]"
              >
                <option value="">-- اختر من القائمة --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - رصيد: {c.balance}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[var(--color-admin-text-muted)] font-bold">النقاط</label>
                <input
                  type="number"
                  min="1"
                  placeholder="100"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-xs text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[var(--color-admin-text-muted)] font-bold">السبب</label>
                <input
                  type="text"
                  placeholder="بونص أو تصحيح خطأ..."
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-xs text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-xs font-black py-3 rounded-xl hover:opacity-95 enabled:active:scale-[0.96] transition-opacity flex items-center justify-center gap-2 cursor-pointer mt-1 disabled:opacity-50 ${
                adjustDirection === 'add'
                  ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)]'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {isSubmitting ? (
                <ArrowClockwise className="animate-spin" size={16} />
              ) : adjustDirection === 'add' ? (
                <Plus size={16} />
              ) : (
                <Minus size={16} />
              )}
              {adjustDirection === 'add' ? 'تأكيد إضافة النقاط' : 'تأكيد خصم النقاط'}
            </button>
          </form>
        </div>

        <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
            <div className="flex items-center gap-2">
              <TrendUp size={22} className="text-emerald-400" />
              <h2 className="text-sm font-bold">أحدث العملاء النشطين</h2>
            </div>
            <span className="text-[10px] font-bold text-[var(--color-admin-text-muted)] tabular-nums">
              {customers.length}
            </span>
          </div>
          <div className="flex flex-col gap-2.5 max-h-[250px] overflow-y-auto overscroll-contain">
            {customers.slice(0, 5).map((cust) => (
              <button
                key={cust.id}
                type="button"
                onClick={() => onOpenCustomerLedger(cust.id)}
                className="w-full text-right flex items-center justify-between p-2.5 bg-[var(--color-admin-bg)] rounded-xl border border-[var(--color-admin-border)] hover:border-[var(--color-admin-primary)]/40 transition-colors cursor-pointer"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[var(--color-admin-text)] truncate">{cust.name}</span>
                  <span className="text-[10px] font-mono text-[var(--color-admin-text-muted)]" dir="ltr">
                    {cust.phone}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black text-[var(--color-admin-primary)] tabular-nums">
                    {cust.balance.toLocaleString()} نقطة
                  </span>
                  <CheckCircle size={15} className="text-emerald-400" />
                </div>
              </button>
            ))}
            {customers.length === 0 && (
              <div className="py-10 text-center text-xs text-[var(--color-admin-text-muted)]">
                لا يوجد عملاء مسجلون بعد
              </div>
            )}
          </div>
        </div>
      </div>

      <RetentionAnalytics
        branches={branches}
        selectedBranchId={selectedBranchFilter}
        onSelectBranch={onSelectBranchFilter}
      />
    </div>
  );
};
