import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowsClockwise,
  Clock,
  Crown,
  Fire,
  Gift,
  Repeat,
  Storefront,
  UsersThree,
  WarningCircle,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../services/api';

export interface RetentionBranchOption {
  id: string;
  name: string;
  location?: string;
}

export interface RetentionAnalyticsData {
  branchId: string | null;
  timezone: string;
  repeatVisitRate: {
    totalActiveCustomers: number;
    repeatCustomers: number;
    ratePercent: number;
    avgVisitsPerCustomer: number;
  };
  busiestHours: Array<{
    hour: number;
    label: string;
    ordersCount: number;
    pointsAwarded: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    phone: string;
    tier: string;
    visitsCount: number;
    totalSpent: number;
    pointsBalance: number;
    lastVisit: string | null;
  }>;
  rewardPerformance: Array<{
    id: string;
    title: string;
    category: string;
    requiredPoints: number;
    totalRedemptions: number;
    usedRedemptions: number;
    conversionRate: number;
  }>;
}

interface RetentionAnalyticsProps {
  branches: RetentionBranchOption[];
  selectedBranchId: string | undefined;
  onSelectBranch: (branchId: string | undefined) => void;
}

const tierPill: Record<string, { label: string; cls: string }> = {
  platinum: { label: 'بلاتيني', cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  gold: { label: 'ذهبي', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  silver: { label: 'فضي', cls: 'bg-slate-400/15 text-slate-300 border-slate-400/30' },
  bronze: { label: 'عادي', cls: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
};

export const RetentionAnalytics: React.FC<RetentionAnalyticsProps> = ({
  branches,
  selectedBranchId,
  onSelectBranch,
}) => {
  const [data, setData] = useState<RetentionAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRetention = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminRetentionAnalytics(selectedBranchId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل تحليلات الاحتفاظ');
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchRetention();
  }, [fetchRetention]);

  const peakHour = React.useMemo(() => {
    if (!data?.busiestHours?.length) return null;
    return data.busiestHours.reduce((best, curr) =>
      curr.ordersCount > best.ordersCount ? curr : best
    );
  }, [data]);

  const redemptionTotals = React.useMemo(() => {
    const list = data?.rewardPerformance || [];
    const total = list.reduce((acc, r) => acc + r.totalRedemptions, 0);
    const used = list.reduce((acc, r) => acc + r.usedRedemptions, 0);
    const rate = total > 0 ? Math.round((used / total) * 1000) / 10 : 0;
    return { total, used, rate };
  }, [data]);

  return (
    <section
      aria-label="تحليلات الاحتفاظ والأداء"
      className="flex flex-col gap-5 mt-2"
    >
      {/* Header & Branch Pills Filter */}
      <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_8px_28px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-admin-primary-soft)] border border-[var(--color-admin-primary)]/25 flex items-center justify-center text-[var(--color-admin-primary)] shrink-0">
            <Fire size={20} weight="duotone" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[var(--color-admin-text)] tracking-tight">
              تحليلات الاحتفاظ ونشاط الفروع
            </h2>
            <p className="text-[11px] text-[var(--color-admin-text-muted)] mt-0.5">
              قياس ولاء العملاء المتكرر، ساعات الذروة، وكفاءة استبدال المكافآت
              {data?.timezone ? ` (${data.timezone})` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="تصفية حسب الفرع">
          <button
            type="button"
            role="tab"
            aria-selected={!selectedBranchId}
            onClick={() => onSelectBranch(undefined)}
            className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.96] cursor-pointer flex items-center gap-1.5 border ${
              !selectedBranchId
                ? 'text-[var(--color-admin-bg)] border-transparent'
                : 'text-[var(--color-admin-text-muted)] bg-[var(--color-admin-bg)] border-[var(--color-admin-border)] hover:text-[var(--color-admin-text)]'
            }`}
          >
            {!selectedBranchId && (
              <motion.span
                layoutId="retention-branch-pill"
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="absolute inset-0 rounded-xl bg-[var(--color-admin-primary)]"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Storefront size={14} weight="duotone" />
              كل الفروع
            </span>
          </button>

          {branches.map((b) => {
            const isActive = selectedBranchId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectBranch(b.id)}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.96] cursor-pointer border ${
                  isActive
                    ? 'text-[var(--color-admin-bg)] border-transparent'
                    : 'text-[var(--color-admin-text-muted)] bg-[var(--color-admin-bg)] border-[var(--color-admin-border)] hover:text-[var(--color-admin-text)]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="retention-branch-pill"
                    transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                    className="absolute inset-0 rounded-xl bg-[var(--color-admin-primary)]"
                  />
                )}
                <span className="relative z-10">{b.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-[var(--color-admin-surface)] border border-rose-500/30 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-400 text-xs font-bold">
            <WarningCircle size={20} weight="duotone" className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchRetention}
            className="px-3.5 py-2 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] text-xs font-bold text-[var(--color-admin-text)] hover:border-[var(--color-admin-primary)] transition-colors flex items-center gap-1.5 cursor-pointer active:scale-[0.96]"
          >
            <ArrowsClockwise size={14} />
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Bento KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Repeat Visit Rate */}
        <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-admin-text-muted)]">
              معدل تكرار الزيارات
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Repeat size={16} weight="duotone" />
            </div>
          </div>
          {loading ? (
            <div className="h-14 rounded-xl bg-[var(--color-admin-bg)] animate-pulse" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[var(--color-admin-text)] tabular-nums">
                  {data?.repeatVisitRate.ratePercent ?? 0}%
                </span>
                <span className="text-[11px] font-bold text-emerald-400 tabular-nums">
                  ({data?.repeatVisitRate.repeatCustomers ?? 0} / {data?.repeatVisitRate.totalActiveCustomers ?? 0} عميل)
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="w-full h-1.5 rounded-full bg-[var(--color-admin-bg)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, data?.repeatVisitRate.ratePercent ?? 0)}%` }}
                  />
                </div>
                <span className="text-[11px] text-[var(--color-admin-text-muted)]">
                  متوسط الزيارات لكل عميل:{' '}
                  <strong className="text-[var(--color-admin-text)] tabular-nums">
                    {data?.repeatVisitRate.avgVisitsPerCustomer ?? 0}
                  </strong>
                </span>
              </div>
            </>
          )}
        </div>

        {/* KPI 2: Peak Hour */}
        <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-admin-text-muted)]">
              ساعة الذروة
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-admin-primary-soft)] border border-[var(--color-admin-primary)]/20 flex items-center justify-center text-[var(--color-admin-primary)]">
              <Clock size={16} weight="duotone" />
            </div>
          </div>
          {loading ? (
            <div className="h-14 rounded-xl bg-[var(--color-admin-bg)] animate-pulse" />
          ) : peakHour ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[var(--color-admin-text)] tabular-nums">
                  {peakHour.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--color-admin-text-muted)] pt-1 border-t border-[var(--color-admin-border)]/60">
                <span>
                  الطلبات:{' '}
                  <strong className="text-[var(--color-admin-primary)] tabular-nums">
                    {peakHour.ordersCount}
                  </strong>
                </span>
                <span>
                  النقاط الممنوحة:{' '}
                  <strong className="text-[var(--color-admin-text)] tabular-nums">
                    {peakHour.pointsAwarded.toLocaleString()}
                  </strong>
                </span>
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--color-admin-text-muted)] py-3">
              لا توجد طلبات مسجلة بعد لهذا النطاق
            </div>
          )}
        </div>

        {/* KPI 3: Reward Conversion Efficiency */}
        <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-admin-text-muted)]">
              إتمام استبدال المكافآت
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Gift size={16} weight="duotone" />
            </div>
          </div>
          {loading ? (
            <div className="h-14 rounded-xl bg-[var(--color-admin-bg)] animate-pulse" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[var(--color-admin-text)] tabular-nums">
                  {redemptionTotals.rate}%
                </span>
                <span className="text-[11px] font-bold text-amber-400 tabular-nums">
                  ({redemptionTotals.used} / {redemptionTotals.total} كود)
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="w-full h-1.5 rounded-full bg-[var(--color-admin-bg)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, redemptionTotals.rate)}%` }}
                  />
                </div>
                <span className="text-[11px] text-[var(--color-admin-text-muted)]">
                  الأكواد التي تم مسحها عند الكاشير فعلياً
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Bento Grid: Busiest Hours + Reward Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-2xl p-5 flex flex-col gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
            <div className="flex items-center gap-2">
              <Clock size={18} weight="duotone" className="text-[var(--color-admin-primary)]" />
              <h3 className="text-sm font-bold text-[var(--color-admin-text)]">
                توزيع ساعات النشاط (Busiest Hours)
              </h3>
            </div>
            <span className="text-[11px] text-[var(--color-admin-text-muted)]">حسب التوقيت المحلي</span>
          </div>

          <div className="h-64" dir="ltr">
            {loading ? (
              <div className="h-full w-full rounded-xl bg-[var(--color-admin-bg)] animate-pulse" />
            ) : data?.busiestHours?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.busiestHours} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#a89f96' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#a89f96' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#14110f',
                      border: '1px solid #332a24',
                      borderRadius: 12,
                      fontSize: 12,
                      color: '#f7f4f0',
                    }}
                  />
                  <Bar
                    dataKey="ordersCount"
                    name="عدد الطلبات"
                    fill="#d99b52"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--color-admin-text-muted)] bg-[var(--color-admin-bg)] rounded-xl border border-dashed border-[var(--color-admin-border)]">
                لا توجد طلبات مسجلة لعرض توزيع الساعات
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-2xl p-5 flex flex-col gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
            <div className="flex items-center gap-2">
              <Gift size={18} weight="duotone" className="text-amber-400" />
              <h3 className="text-sm font-bold text-[var(--color-admin-text)]">أداء المكافآت</h3>
            </div>
            <span className="text-[11px] text-[var(--color-admin-text-muted)] tabular-nums">
              {data?.rewardPerformance.length ?? 0} مكافأة
            </span>
          </div>

          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto overscroll-contain pr-0.5">
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-16 rounded-xl bg-[var(--color-admin-bg)] animate-pulse" />
              ))
            ) : data?.rewardPerformance?.length ? (
              data.rewardPerformance.map((rw) => (
                <div
                  key={rw.id}
                  className="p-3 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[var(--color-admin-text)] truncate">
                        {rw.title}
                      </span>
                      <span className="text-[10px] text-[var(--color-admin-text-muted)]">
                        {rw.category} · <span className="tabular-nums">{rw.requiredPoints}</span> نقطة
                      </span>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="text-xs font-black text-[var(--color-admin-primary)] tabular-nums">
                        {rw.usedRedemptions} / {rw.totalRedemptions}
                      </span>
                      <span className="block text-[10px] text-[var(--color-admin-text-muted)] tabular-nums">
                        تحويل {rw.conversionRate}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--color-admin-surface)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-admin-primary)] transition-all duration-300"
                      style={{ width: `${Math.min(100, rw.conversionRate)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-xs text-[var(--color-admin-text-muted)]">
                لا توجد مكافآت نشطة لعرض أدائها
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 10 Customers Leaderboard */}
      <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
        <div className="p-5 border-b border-[var(--color-admin-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown size={18} weight="duotone" className="text-amber-400" />
            <h3 className="text-sm font-bold text-[var(--color-admin-text)]">أفضل ١٠ عملاء ولاءً</h3>
          </div>
          <span className="text-[11px] text-[var(--color-admin-text-muted)] flex items-center gap-1">
            <UsersThree size={14} weight="duotone" />
            مرتبون بعدد الزيارات والإنفاق
          </span>
        </div>

        {loading ? (
          <div className="p-5 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-11 rounded-xl bg-[var(--color-admin-bg)] animate-pulse" />
            ))}
          </div>
        ) : data?.topCustomers?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] text-[10px] font-bold border-b border-[var(--color-admin-border)]">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">الهاتف</th>
                  <th className="py-3 px-4">الفئة</th>
                  <th className="py-3 px-4">الزيارات</th>
                  <th className="py-3 px-4">إجمالي الإنفاق</th>
                  <th className="py-3 px-4">الرصيد الحالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-admin-border)]/70">
                {data.topCustomers.map((cust, index) => {
                  const pill = tierPill[cust.tier] || tierPill.bronze;
                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-[var(--color-admin-bg)]/60 transition-colors duration-150"
                    >
                      <td className="py-3 px-4 font-black tabular-nums">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] ${
                            index < 3
                              ? 'bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-primary)] border border-[var(--color-admin-primary)]/30'
                              : 'bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)]'
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[var(--color-admin-text)]">{cust.name}</td>
                      <td className="py-3 px-4 font-mono text-[var(--color-admin-text-muted)]" dir="ltr">
                        {cust.phone}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${pill.cls}`}>
                          {pill.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[var(--color-admin-text)] tabular-nums">
                        {cust.visitsCount}
                      </td>
                      <td className="py-3 px-4 text-[var(--color-admin-text-muted)] tabular-nums">
                        {cust.totalSpent.toLocaleString()} ج.م
                      </td>
                      <td className="py-3 px-4 font-black text-[var(--color-admin-primary)] tabular-nums">
                        {cust.pointsBalance.toLocaleString()} نقطة
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-xs text-[var(--color-admin-text-muted)]">
            لا توجد زيارات عملاء مسجلة بعد
          </div>
        )}
      </div>
    </section>
  );
};
