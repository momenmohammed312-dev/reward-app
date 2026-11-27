import React, { useCallback, useEffect, useState } from 'react';
import { Coins, Plus, Minus, Receipt, Gift, WhatsappLogo, QrCode } from '@phosphor-icons/react';
import { api } from '../../../services/api';
import { Modal } from '../../ui/Modal';
import { AdminMessage, tierDisplay } from '../types';

interface CustomerLedgerDrawerProps {
  customerId: string | null;
  storeName: string;
  onClose: () => void;
  onMessage: (msg: AdminMessage) => void;
  onDataChanged: () => Promise<void>;
}

export const CustomerLedgerDrawer: React.FC<CustomerLedgerDrawerProps> = ({
  customerId,
  storeName,
  onClose,
  onMessage,
  onDataChanged,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<'ledger' | 'transactions' | 'redemptions'>('ledger');
  const [direction, setDirection] = useState<'add' | 'deduct'>('add');
  const [pts, setPts] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadLedger = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await api.getAdminCustomerLedger(customerId);
      setData(res);
    } catch (err: any) {
      onMessage({ text: err?.message || 'تعذر تحميل كشف الحساب', type: 'error' });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [customerId, onMessage, onClose]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    const val = parseInt(pts, 10);
    if (!val || val <= 0) return;

    setSaving(true);
    try {
      await api.adminAdjustPoints({
        customer_id: customerId,
        points: direction === 'add' ? val : -val,
        note: note.trim() || (direction === 'add' ? 'بونص من كشف الحساب' : 'خصم من كشف الحساب'),
      });
      onMessage({
        text: direction === 'add' ? `تمت إضافة +${val} نقطة` : `تم خصم -${val} نقطة`,
        type: 'success',
      });
      setPts('');
      setNote('');
      await Promise.all([loadLedger(), onDataChanged()]);
    } catch (err: any) {
      onMessage({ text: err?.message || 'تعذر تعديل النقاط', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const customer = data?.customer;
  const waNumber = customer?.phone ? `20${String(customer.phone).replace(/^0+/, '')}` : '';
  const waText = customer
    ? encodeURIComponent(
        `أهلاً ${customer.name || 'عميلنا العزيز'} من ${storeName}! رصيدك الحالي ${customer.balance} نقطة جاهز للاستبدال في زيارتك القادمة.`
      )
    : '';

  return (
    <Modal isOpen={!!customerId} onClose={onClose} title="كشف حساب ودفتر العميل">
      {loading || !customer ? (
        <div className="py-10 text-center text-xs text-[var(--color-admin-text-muted)] animate-pulse">
          جارٍ تحميل دفتر العميل...
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
          <div className="p-3.5 rounded-2xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-[var(--color-admin-text)]">{customer.name || 'عميل'}</div>
              <div className="font-mono text-[11px] text-[var(--color-admin-text-muted)]" dir="ltr">
                {customer.phone} · {tierDisplay(customer.tier)}
              </div>
              {(customer.signup_branch_name || customer.signup_station) && (
                <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-primary)] text-[10px] font-bold">
                  <QrCode size={11} />
                  سجّل من: {[customer.signup_branch_name, customer.signup_station].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            <div className="text-left">
              <div className="text-[10px] text-[var(--color-admin-text-muted)]">الرصيد الحالي</div>
              <div className="text-xl font-black text-[var(--color-admin-primary)] tabular-nums">
                {Number(customer.balance).toLocaleString()}
              </div>
              <div className="text-[10px] text-[var(--color-admin-text-muted)]">
                مكتسب: {Number(customer.total_earned).toLocaleString()}
              </div>
            </div>
          </div>

          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center gap-2 hover:bg-emerald-600/30 transition-colors"
            >
              <WhatsappLogo size={16} weight="duotone" />
              إرسال رسالة واتساب للعميل
            </a>
          )}

          {/* Inline +/- Points Adjustment */}
          <form onSubmit={handleAdjust} className="p-3 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-[var(--color-admin-text-muted)]">تعديل سريع للرصيد</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDirection('add')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    direction === 'add' ? 'bg-emerald-600 text-white' : 'text-[var(--color-admin-text-muted)]'
                  }`}
                >
                  <Plus size={10} className="inline" /> إضافة
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('deduct')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    direction === 'deduct' ? 'bg-rose-600 text-white' : 'text-[var(--color-admin-text-muted)]'
                  }`}
                >
                  <Minus size={10} className="inline" /> خصم
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                required
                value={pts}
                onChange={(e) => setPts(e.target.value)}
                placeholder="النقاط"
                className="w-24 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] px-2.5 py-1.5 rounded-lg outline-none font-mono"
              />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="سبب التعديل..."
                className="flex-1 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] px-2.5 py-1.5 rounded-lg outline-none"
              />
              <button
                type="submit"
                disabled={saving}
                className={`px-3 py-1.5 rounded-lg font-black cursor-pointer ${
                  direction === 'add'
                    ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)]'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {saving ? '...' : 'تنفيذ'}
              </button>
            </div>
          </form>

          {/* Sub-tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)]">
            <button
              type="button"
              onClick={() => setSubTab('ledger')}
              className={`py-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer ${
                subTab === 'ledger' ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)]' : 'text-[var(--color-admin-text-muted)]'
              }`}
            >
              <Coins size={12} /> الدفتر ({data.ledger?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('transactions')}
              className={`py-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer ${
                subTab === 'transactions' ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)]' : 'text-[var(--color-admin-text-muted)]'
              }`}
            >
              <Receipt size={12} /> الفواتير ({data.transactions?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('redemptions')}
              className={`py-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer ${
                subTab === 'redemptions' ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)]' : 'text-[var(--color-admin-text-muted)]'
              }`}
            >
              <Gift size={12} /> القسائم ({data.redemptions?.length || 0})
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {subTab === 'ledger' &&
              (data.ledger || []).map((row: any) => {
                const isCredit = ['earned', 'bonus', 'refund', 'adjustment'].includes(row.type);
                return (
                  <div
                    key={row.id}
                    className="p-2.5 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex justify-between items-center"
                  >
                    <div className="min-w-0">
                      <div className="font-bold truncate">{row.note || row.type}</div>
                      <div className="text-[10px] text-[var(--color-admin-text-muted)]">
                        {new Date(row.created_at).toLocaleString('ar-EG')}
                      </div>
                    </div>
                    <span className={`font-mono font-black ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isCredit ? '+' : '-'}
                      {row.points}
                    </span>
                  </div>
                );
              })}

            {subTab === 'transactions' &&
              (data.transactions || []).map((tx: any) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex justify-between items-center"
                >
                  <div>
                    <div className="font-mono font-bold">{tx.invoice_id}</div>
                    <div className="text-[10px] text-[var(--color-admin-text-muted)]">
                      {tx.amount} ج.م · {tx.branch_name || '—'}
                    </div>
                  </div>
                  <span className="font-mono font-black text-emerald-400">+{tx.points_earned}</span>
                </div>
              ))}

            {subTab === 'redemptions' &&
              (data.redemptions || []).map((rd: any) => (
                <div
                  key={rd.id}
                  className="p-2.5 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex justify-between items-center"
                >
                  <div>
                    <div className="font-mono font-bold text-[var(--color-admin-primary)]">{rd.code}</div>
                    <div className="text-[10px] text-[var(--color-admin-text-muted)]">
                      {rd.reward_name} · {rd.used_at ? 'مصروفة' : 'معلقة'}
                    </div>
                  </div>
                  <span className="font-mono font-black text-rose-400">-{rd.points_used}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </Modal>
  );
};
