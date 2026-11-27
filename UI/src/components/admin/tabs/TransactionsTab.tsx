import React, { useCallback, useEffect, useState } from 'react';
import { Receipt, Gift, ArrowCounterClockwise, MagnifyingGlass } from '@phosphor-icons/react';
import { api } from '../../../services/api';
import { Modal } from '../../ui/Modal';
import { AdminMessage, Branch } from '../types';

interface TransactionsTabProps {
  branches: Branch[];
  onMessage: (msg: AdminMessage) => void;
  onDataChanged: () => Promise<void>;
}

interface TransactionRow {
  id: string;
  invoice_id: string;
  amount: number;
  points_earned: number;
  reversed_points: number;
  created_at: string;
  branch_name?: string;
  customer_name?: string;
  customer_phone?: string;
}

interface RedemptionRow {
  id: string;
  code: string;
  points_used: number;
  status: 'used' | 'expired' | 'pending';
  expires_at: string;
  used_at?: string | null;
  created_at: string;
  reward_name?: string;
  reward_type?: string;
  discount_value?: number | null;
  min_order_egp?: number | null;
  customer_name?: string;
  customer_phone?: string;
  branch_name?: string;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  branches,
  onMessage,
  onDataChanged,
}) => {
  const [subView, setSubView] = useState<'transactions' | 'redemptions'>('transactions');
  const [branchId, setBranchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [refundTarget, setRefundTarget] = useState<TransactionRow | null>(null);
  const [refundMode, setRefundMode] = useState<'full' | 'partial'>('partial');
  const [partialAmount, setPartialAmount] = useState('');
  const [refundNote, setRefundNote] = useState('استرجاع صنف من الفاتورة');
  const [refunding, setRefunding] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (subView === 'transactions') {
        const res = await api.getAdminTransactions({
          branch_id: branchId || undefined,
          search: search || undefined,
          page,
          limit: 30,
        });
        setTransactions(res.transactions || []);
        setTotal(Number(res.total || 0));
      } else {
        const res = await api.getAdminRedemptions({
          branch_id: branchId || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
          page,
          limit: 30,
        });
        setRedemptions(res.redemptions || []);
        setTotal(Number(res.total || 0));
      }
    } catch {
      onMessage({ text: 'تعذر تحميل سجل العمليات', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [subView, branchId, statusFilter, search, page, onMessage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openRefundModal = (tx: TransactionRow) => {
    setRefundTarget(tx);
    setRefundMode('partial');
    setPartialAmount('');
    setRefundNote('استرجاع صنف من الفاتورة');
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;

    if (refundMode === 'partial' && (!Number(partialAmount) || Number(partialAmount) <= 0)) {
      onMessage({ text: 'أدخل قيمة المرتجع بالجنيه أكبر من صفر', type: 'error' });
      return;
    }

    setRefunding(true);
    try {
      await api.adminRefundTransaction({
        invoice_id: refundTarget.invoice_id,
        partial_amount: refundMode === 'partial' ? Number(partialAmount) : undefined,
        note: refundNote.trim() || undefined,
      });
      onMessage({
        text: `تم تنفيذ ${refundMode === 'partial' ? 'الاسترجاع الجزئي' : 'الاسترجاع الكلي'} للفاتورة ${refundTarget.invoice_id}`,
        type: 'success',
      });
      setRefundTarget(null);
      await Promise.all([fetchData(), onDataChanged()]);
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل تنفيذ الاسترجاع', type: 'error' });
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-2xl overflow-hidden flex flex-col">
      <div className="p-5 border-b border-[var(--color-admin-border)] flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)]">
            <button
              type="button"
              onClick={() => {
                setSubView('transactions');
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors ${
                subView === 'transactions'
                  ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)]'
                  : 'text-[var(--color-admin-text-muted)]'
              }`}
            >
              <Receipt size={15} weight="duotone" />
              سجل الفواتير والاسترجاع
            </button>
            <button
              type="button"
              onClick={() => {
                setSubView('redemptions');
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors ${
                subView === 'redemptions'
                  ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)]'
                  : 'text-[var(--color-admin-text-muted)]'
              }`}
            >
              <Gift size={15} weight="duotone" />
              سجل القسائم المصروفة
            </button>
          </div>
          <span className="text-xs text-[var(--color-admin-text-muted)] font-bold tabular-nums">
            إجمالي: {total.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2 relative">
            <MagnifyingGlass
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-admin-text-muted)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={subView === 'transactions' ? 'بحث برقم الفاتورة أو الهاتف...' : 'بحث بكود القسيمة أو الهاتف...'}
              className="w-full bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] pr-9 pl-3 py-2 rounded-xl text-xs outline-none focus:border-[var(--color-admin-primary)]"
            />
          </div>

          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setPage(1);
            }}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-3 py-2 rounded-xl text-xs outline-none"
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {subView === 'redemptions' && (
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-3 py-2 rounded-xl text-xs outline-none"
            >
              <option value="">كل الحالات</option>
              <option value="used">مصروفة عند الكاشير</option>
              <option value="pending">جاهزة للصرف</option>
              <option value="expired">منتهية الصلاحية</option>
            </select>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {subView === 'transactions' ? (
          <table className="w-full text-right text-xs">
            <thead className="bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] text-[10px] font-bold border-b border-[var(--color-admin-border)]">
              <tr>
                <th className="p-3.5">رقم الفاتورة</th>
                <th className="p-3.5">العميل</th>
                <th className="p-3.5">الفرع</th>
                <th className="p-3.5">القيمة</th>
                <th className="p-3.5">النقاط</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">استرجاع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-admin-border)]">
              {transactions.map((tx) => {
                const refundable = Math.max(0, tx.points_earned - tx.reversed_points);
                return (
                  <tr key={tx.id} className="hover:bg-[var(--color-admin-bg)]/60">
                    <td className="p-3.5 font-mono font-bold">{tx.invoice_id}</td>
                    <td className="p-3.5">
                      <div className="font-bold">{tx.customer_name || 'عميل'}</div>
                      <div className="text-[10px] font-mono text-[var(--color-admin-text-muted)]" dir="ltr">
                        {tx.customer_phone}
                      </div>
                    </td>
                    <td className="p-3.5 text-[var(--color-admin-text-muted)]">{tx.branch_name || '—'}</td>
                    <td className="p-3.5 font-bold tabular-nums">{Number(tx.amount).toLocaleString()} ج.م</td>
                    <td className="p-3.5">
                      <span className="font-bold text-emerald-400 tabular-nums">+{tx.points_earned}</span>
                      {tx.reversed_points > 0 && (
                        <span className="block text-[10px] text-rose-400 tabular-nums">
                          مرتجع: -{tx.reversed_points}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-[11px] text-[var(--color-admin-text-muted)]">
                      {new Date(tx.created_at).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        disabled={refundable <= 0}
                        onClick={() => openRefundModal(tx)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 hover:bg-rose-950/60 disabled:opacity-30 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowCounterClockwise size={12} />
                        {refundable > 0 ? 'استرجاع' : 'مكتمل'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--color-admin-text-muted)]">
                    لا توجد فواتير مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-right text-xs">
            <thead className="bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] text-[10px] font-bold border-b border-[var(--color-admin-border)]">
              <tr>
                <th className="p-3.5">الكود</th>
                <th className="p-3.5">المكافأة / الخصم</th>
                <th className="p-3.5">العميل</th>
                <th className="p-3.5">الفرع</th>
                <th className="p-3.5">النقاط</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5">التوقيت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-admin-border)]">
              {redemptions.map((rd) => (
                <tr key={rd.id} className="hover:bg-[var(--color-admin-bg)]/60">
                  <td className="p-3.5 font-mono font-black text-[var(--color-admin-primary)]">{rd.code}</td>
                  <td className="p-3.5">
                    <div className="font-bold">{rd.reward_name || 'مكافأة'}</div>
                    {rd.min_order_egp && (
                      <div className="text-[10px] text-[var(--color-admin-text-muted)]">
                        حد أدنى {rd.min_order_egp} ج.م
                      </div>
                    )}
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold">{rd.customer_name || 'عميل'}</div>
                    <div className="text-[10px] font-mono text-[var(--color-admin-text-muted)]" dir="ltr">
                      {rd.customer_phone}
                    </div>
                  </td>
                  <td className="p-3.5 text-[var(--color-admin-text-muted)]">{rd.branch_name || '—'}</td>
                  <td className="p-3.5 font-bold tabular-nums">{rd.points_used}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rd.status === 'used'
                          ? 'bg-emerald-950 text-emerald-400'
                          : rd.status === 'pending'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {rd.status === 'used' ? 'تم الصرف' : rd.status === 'pending' ? 'جاهز للصرف' : 'منتهي'}
                    </span>
                  </td>
                  <td className="p-3.5 text-[11px] text-[var(--color-admin-text-muted)]">
                    {new Date(rd.used_at || rd.created_at).toLocaleString('ar-EG')}
                  </td>
                </tr>
              ))}
              {!loading && redemptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--color-admin-text-muted)]">
                    لا توجد قسائم مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-4 border-t border-[var(--color-admin-border)] flex justify-between items-center text-xs">
        <span className="text-[var(--color-admin-text-muted)]">صفحة {page}</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-admin-border)] disabled:opacity-30 cursor-pointer"
          >
            السابق
          </button>
          <button
            type="button"
            disabled={page * 30 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-admin-border)] disabled:opacity-30 cursor-pointer"
          >
            التالي
          </button>
        </div>
      </div>

      <Modal isOpen={!!refundTarget} onClose={() => setRefundTarget(null)} title="استرجاع نقاط الفاتورة">
        {refundTarget && (
          <form onSubmit={handleRefundSubmit} className="flex flex-col gap-3.5 text-xs">
            <div className="p-3 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex justify-between">
              <div>
                <div className="font-mono font-bold">{refundTarget.invoice_id}</div>
                <div className="text-[11px] text-[var(--color-admin-text-muted)]">
                  إجمالي الفاتورة: {refundTarget.amount} ج.م
                </div>
              </div>
              <div className="text-left">
                <div className="font-bold text-emerald-400">+{refundTarget.points_earned} نقطة</div>
                <div className="text-[10px] text-[var(--color-admin-text-muted)]">
                  مرتجع سابقاً: {refundTarget.reversed_points}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRefundMode('partial')}
                className={`py-2 rounded-xl border font-bold cursor-pointer ${
                  refundMode === 'partial'
                    ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] border-transparent'
                    : 'bg-[var(--color-admin-bg)] border-[var(--color-admin-border)] text-[var(--color-admin-text-muted)]'
                }`}
              >
                استرجاع جزئي (صنف)
              </button>
              <button
                type="button"
                onClick={() => setRefundMode('full')}
                className={`py-2 rounded-xl border font-bold cursor-pointer ${
                  refundMode === 'full'
                    ? 'bg-rose-600 text-white border-transparent'
                    : 'bg-[var(--color-admin-bg)] border-[var(--color-admin-border)] text-[var(--color-admin-text-muted)]'
                }`}
              >
                استرجاع الفاتورة كاملة
              </button>
            </div>

            {refundMode === 'partial' && (
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[var(--color-admin-text-muted)]">قيمة الصنف المرتجع (ج.م)</label>
                <input
                  type="number"
                  min="1"
                  max={refundTarget.amount}
                  step="0.01"
                  required
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="مثال: 120"
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none font-mono"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">ملاحظة</label>
              <input
                type="text"
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={refunding}
              className="w-full bg-rose-600 text-white font-black py-2.5 rounded-xl hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            >
              {refunding ? 'جارٍ خصم نقاط المرتجع...' : 'تأكيد استرجاع النقاط'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};
