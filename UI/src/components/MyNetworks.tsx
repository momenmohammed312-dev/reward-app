import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import {
  Network,
  Users,
  ArrowLeft,
  Warning,
  CheckCircle,
  Coins,
  ArrowsLeftRight,
  Receipt,
} from '@phosphor-icons/react';

const adminCard = 'bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)]';
const adminText = 'text-[var(--color-admin-text)]';
const adminTextMuted = 'text-[var(--color-admin-text-muted)]';

// ─── TYPES ──────────────────────────────────────────────────

interface NetworkMembership {
  id: string;
  membership_id?: string;
  network_id?: string;
  tenant_id?: string;
  status?: 'pending' | 'active' | 'suspended';
  membership_status?: 'pending' | 'active' | 'suspended';
  joined_at: string;
  network_name: string;
  network_slug: string;
  network_description: string;
  member_count: number;
  created_at: string;
}

interface NetworkMember {
  id: string;
  network_id: string;
  tenant_id: string;
  status: 'pending' | 'active' | 'suspended';
  joined_at: string;
  tenant_name: string;
  tenant_slug: string;
}

interface NetworkRate {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  egp_per_point: number | null;
  is_active: boolean;
}

interface NetPosition {
  debtor_tenant_id: string;
  debtor_tenant_name: string;
  creditor_tenant_id: string;
  creditor_tenant_name: string;
  pending_redemptions_count: number;
  owed_egp: number;
}

interface SettlementRow {
  id: string;
  from_tenant_name: string;
  to_tenant_name: string;
  amount_egp: number;
  method: 'bank_transfer' | 'subscription_deduction';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  external_reference: string | null;
  created_at: string;
}

interface NetworkDetails {
  network: {
    id: string;
    name: string;
    slug: string;
    description: string;
    logo_url: string;
    is_active: boolean;
    created_at: string;
    members: NetworkMember[];
    member_count: number;
  };
}

// ─── STATUS CONFIG ──────────────────────────────────────────

const statusConfig: Record<string, { label: string; bg: string }> = {
  active:     { label: 'نشط',          bg: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700' },
  pending:    { label: 'معلق',         bg: 'bg-amber-900/50 text-amber-400 border border-amber-700' },
  suspended:  { label: 'معلّق',        bg: 'bg-red-900/50 text-red-400 border border-red-700' },
  processing: { label: 'قيد التنفيذ',  bg: 'bg-blue-900/50 text-blue-300 border border-blue-700' },
  completed:  { label: 'مكتمل',        bg: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700' },
  failed:     { label: 'فشل',          bg: 'bg-red-900/50 text-red-400 border border-red-700' },
};

// ─── COMPONENT ──────────────────────────────────────────────

export const MyNetworks: React.FC = () => {
  const [networks, setNetworks] = useState<NetworkMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rates, setRates] = useState<NetworkRate[]>([]);
  const [positions, setPositions] = useState<NetPosition[]>([]);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [myRateInput, setMyRateInput] = useState('0.25');
  const [savingRate, setSavingRate] = useState(false);
  const [rateSuccess, setRateSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadNetworks();
  }, []);

  const loadNetworks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyNetworks();
      setNetworks(data.networks || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load networks');
    } finally {
      setLoading(false);
    }
  };

  const loadNetworkDetails = async (id: string) => {
    setLoadingDetails(true);
    setError(null);
    setRateSuccess(null);
    try {
      const [detailsData, ratesRes, posRes, setRes] = await Promise.all([
        api.getMyNetworkDetails(id),
        api.getMyNetworkRates(id).catch(() => ({ rates: [] })),
        api.getMyNetPositions(id).catch(() => ({ positions: [] })),
        api.getMyNetworkSettlements(id).catch(() => ({ settlements: [] })),
      ]);
      setSelectedNetwork(detailsData);
      setRates(ratesRes.rates || []);
      setPositions(posRes.positions || []);
      setSettlements(setRes.settlements || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load network details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNetwork) return;
    const numericRate = Number(myRateInput);
    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      setError('يرجى إدخال قيمة صحيحة أكبر من صفر (مثال: 0.25)');
      return;
    }

    setSavingRate(true);
    setError(null);
    setRateSuccess(null);
    try {
      await api.upsertMyNetworkRate(selectedNetwork.network.id, numericRate);
      setRateSuccess(`تم تحديث قيمة النقطة إلى ${numericRate} ج.م بنجاح`);
      const refreshed = await api.getMyNetworkRates(selectedNetwork.network.id);
      setRates(refreshed.rates || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ سعر الصرف');
    } finally {
      setSavingRate(false);
    }
  };

  const handleLeaveNetwork = async (id: string) => {
    if (!confirm('هل أنت متأكد من مغادرة هذه الشبكة؟')) return;
    try {
      await api.leaveNetwork(id);
      setSelectedNetwork(null);
      loadNetworks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to leave network');
    }
  };

  // ─── DETAIL VIEW ──────────────────────────────────────────

  if (selectedNetwork) {
    const { network } = selectedNetwork;
    const members = network.members || [];

    return (
      <div className="flex flex-col gap-4" style={{ direction: 'rtl' }}>
        <button
          onClick={() => setSelectedNetwork(null)}
          className="flex items-center gap-2 text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-text)] text-xs font-bold transition-colors self-start cursor-pointer"
        >
          <ArrowLeft size={16} />
          العودة للشبكات
        </button>

        {error && (
          <div className="bg-red-950/60 border border-red-800/40 p-3 rounded-xl flex items-center gap-2">
            <Warning size={16} className="text-red-400 shrink-0" />
            <span className="text-xs font-medium text-red-300">{error}</span>
          </div>
        )}

        {rateSuccess && (
          <div className="bg-emerald-950/60 border border-emerald-800/40 p-3 rounded-xl flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            <span className="text-xs font-medium text-emerald-300">{rateSuccess}</span>
          </div>
        )}

        {/* Network Header */}
        <div className={`${adminCard} p-5 rounded-2xl flex flex-col gap-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-admin-primary-soft)] border border-[var(--color-admin-primary)]/30 flex items-center justify-center">
                <Network size={20} className="text-[var(--color-admin-primary)]" />
              </div>
              <div>
                <h2 className={`text-sm font-black ${adminText}`}>{network.name}</h2>
                <p className={`text-[10px] ${adminTextMuted} font-mono`} dir="ltr">/{network.slug}</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-900/50 text-emerald-400 border border-emerald-700">
              نشط
            </span>
          </div>
          {network.description && (
            <p className={`text-xs ${adminTextMuted}`}>{network.description}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`${adminCard} p-4 rounded-2xl`}>
            <span className={`text-[10px] ${adminTextMuted} font-bold flex items-center gap-1.5`}>
              <Users size={14} className="text-cyan-400" />
              عدد الأعضاء
            </span>
            <span className={`text-lg font-black ${adminText} tabular-nums`}>
              {network.member_count || members.length}
            </span>
          </div>
          <div className={`${adminCard} p-4 rounded-2xl`}>
            <span className={`text-[10px] ${adminTextMuted} font-bold`}>الأعضاء النشطين</span>
            <span className={`text-lg font-black ${adminText} tabular-nums`}>
              {members.filter((m) => m.status === 'active').length}
            </span>
          </div>
          <div className={`${adminCard} p-4 rounded-2xl`}>
            <span className={`text-[10px] ${adminTextMuted} font-bold flex items-center gap-1.5`}>
              <ArrowsLeftRight size={14} className="text-[var(--color-admin-primary)]" />
              مراكز صافية معلقة
            </span>
            <span className={`text-lg font-black ${adminText} tabular-nums`}>{positions.length}</span>
          </div>
          <div className={`${adminCard} p-4 rounded-2xl`}>
            <span className={`text-[10px] ${adminTextMuted} font-bold flex items-center gap-1.5`}>
              <Receipt size={14} className="text-emerald-400" />
              التسويات المسجلة
            </span>
            <span className={`text-lg font-black ${adminText} tabular-nums`}>{settlements.length}</span>
          </div>
        </div>

        {/* Phase 2: Exchange Rate Configuration & Member Rates */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form
            onSubmit={handleSaveRate}
            className={`lg:col-span-5 ${adminCard} p-5 rounded-2xl flex flex-col gap-3`}
          >
            <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-2.5">
              <Coins size={18} className="text-[var(--color-admin-primary)]" weight="duotone" />
              <h3 className={`text-xs font-bold ${adminText}`}>سعر صرف نقطتك في الشبكة</h3>
            </div>
            <p className={`text-[11px] ${adminTextMuted}`}>
              حدد القيمة المعادلة بالجنيه المصري لكل نقطة عند استبدال نقاط عملائك لدى أعضاء الشبكة الآخرين.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={myRateInput}
                onChange={(e) => setMyRateInput(e.target.value)}
                dir="ltr"
                className="flex-1 bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] focus:border-[var(--color-admin-primary)] rounded-xl px-3 py-2 text-xs text-[var(--color-admin-text)] outline-none font-mono"
              />
              <span className={`text-xs font-bold ${adminTextMuted}`}>ج.م / نقطة</span>
            </div>
            <button
              type="submit"
              disabled={savingRate}
              className="bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black text-xs py-2.5 rounded-xl hover:opacity-95 disabled:opacity-50 transition-opacity active:scale-[0.96] cursor-pointer"
            >
              {savingRate ? 'جاري الحفظ...' : 'تحديث سعر الصرف'}
            </button>
          </form>

          <div className={`lg:col-span-7 ${adminCard} rounded-2xl overflow-hidden`}>
            <div className="p-4 border-b border-[var(--color-admin-border)] flex items-center justify-between">
              <h3 className={`text-xs font-bold ${adminText}`}>أسعار الصرف المعتمدة للأعضاء</h3>
              <span className={`text-[10px] ${adminTextMuted}`}>{rates.length} عضو</span>
            </div>
            <div className="divide-y divide-[var(--color-admin-border)] max-h-60 overflow-y-auto overscroll-contain">
              {rates.map((r) => (
                <div key={r.tenant_id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold ${adminText} block`}>{r.tenant_name}</span>
                    <span className={`text-[10px] ${adminTextMuted} font-mono`} dir="ltr">/{r.tenant_slug}</span>
                  </div>
                  {r.egp_per_point ? (
                    <span className="px-2.5 py-1 rounded-lg bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-primary)] text-xs font-black tabular-nums">
                      {r.egp_per_point} ج.م / نقطة
                    </span>
                  ) : (
                    <span className={`text-[10px] ${adminTextMuted}`}>غير محدد بعد</span>
                  )}
                </div>
              ))}
              {rates.length === 0 && (
                <div className={`p-6 text-center text-xs ${adminTextMuted}`}>لا توجد أسعار مسجلة</div>
              )}
            </div>
          </div>
        </div>

        {/* Phase 4: Net Positions & Settlements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${adminCard} rounded-2xl overflow-hidden`}>
            <div className="p-4 border-b border-[var(--color-admin-border)]">
              <h3 className={`text-xs font-bold ${adminText}`}>صافي المستحقات قيد التسوية</h3>
            </div>
            <div className="divide-y divide-[var(--color-admin-border)]">
              {positions.map((pos, idx) => (
                <div key={`${pos.debtor_tenant_id}-${pos.creditor_tenant_id}-${idx}`} className="p-3.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className={`font-bold ${adminText} block truncate`}>
                      {pos.debtor_tenant_name} → {pos.creditor_tenant_name}
                    </span>
                    <span className={`text-[10px] ${adminTextMuted} tabular-nums`}>
                      {pos.pending_redemptions_count} عملية استبدال عابرة
                    </span>
                  </div>
                  <span className="font-black text-amber-400 tabular-nums shrink-0">
                    {pos.owed_egp.toLocaleString()} ج.م
                  </span>
                </div>
              ))}
              {positions.length === 0 && (
                <div className={`p-6 text-center text-xs ${adminTextMuted}`}>لا توجد مستحقات معلقة حالياً</div>
              )}
            </div>
          </div>

          <div className={`${adminCard} rounded-2xl overflow-hidden`}>
            <div className="p-4 border-b border-[var(--color-admin-border)]">
              <h3 className={`text-xs font-bold ${adminText}`}>سجل التسويات المالية</h3>
            </div>
            <div className="divide-y divide-[var(--color-admin-border)] max-h-60 overflow-y-auto overscroll-contain">
              {settlements.map((st) => {
                const stCfg = statusConfig[st.status] || { label: st.status, bg: '' };
                return (
                  <div key={st.id} className="p-3.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className={`font-bold ${adminText} block truncate`}>
                        {st.from_tenant_name} ← {st.to_tenant_name}
                      </span>
                      <span className={`text-[10px] ${adminTextMuted}`}>
                        {st.method === 'subscription_deduction' ? 'خصم من الاشتراك' : 'تحويل بنكي'}
                        {st.external_reference ? ` · ${st.external_reference}` : ''}
                      </span>
                    </div>
                    <div className="text-left shrink-0 flex flex-col items-end gap-1">
                      <span className="font-black text-[var(--color-admin-text)] tabular-nums">
                        {Number(st.amount_egp).toLocaleString()} ج.م
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${stCfg.bg}`}>
                        {stCfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
              {settlements.length === 0 && (
                <div className={`p-6 text-center text-xs ${adminTextMuted}`}>لا توجد تسويات مسجلة بعد</div>
              )}
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className={`${adminCard} overflow-hidden rounded-2xl`}>
          <div className="p-4 border-b border-[var(--color-admin-border)]">
            <h3 className={`text-xs font-bold ${adminText}`}>أعضاء الشبكة</h3>
          </div>
          <div className="divide-y divide-[var(--color-admin-border)]">
            {members.map((member: NetworkMember) => {
              const memberStatus = statusConfig[member.status] || { label: member.status, bg: '' };
              return (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-[var(--color-admin-bg)] transition-all">
                  <div>
                    <span className={`text-xs font-bold ${adminText}`}>{member.tenant_name}</span>
                    <span className={`text-[10px] ${adminTextMuted} block font-mono`} dir="ltr">/{member.tenant_slug}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${memberStatus.bg}`}>
                    {memberStatus.label}
                  </span>
                </div>
              );
            })}
            {members.length === 0 && (
              <div className={`p-6 text-center text-xs ${adminTextMuted}`}>
                لا يوجد أعضاء في هذه الشبكة
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => handleLeaveNetwork(network.id)}
          className="bg-red-950/50 hover:bg-red-900/50 text-red-400 text-xs font-bold py-2 px-4 rounded-xl border border-red-800/40 cursor-pointer transition-colors self-start"
        >
          مغادرة الشبكة
        </button>
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4" style={{ direction: 'rtl' }}>
      <div className={`${adminCard} p-4 rounded-2xl flex items-center gap-3`}>
        <div className="w-10 h-10 rounded-xl bg-[var(--color-admin-primary-soft)] border border-[var(--color-admin-primary)]/30 flex items-center justify-center">
          <Network size={20} className="text-[var(--color-admin-primary)]" />
        </div>
        <div>
          <h2 className={`text-sm font-black ${adminText}`}>شبكاتي</h2>
          <p className={`text-[10px] ${adminTextMuted}`}>الشبكات المشتركة لتبادل النقاط والتسويات</p>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-950/60 border border-red-800/40 p-3 rounded-xl flex items-center gap-2"
        >
          <Warning size={16} className="text-red-400 shrink-0" />
          <span className="text-xs font-medium text-red-300">{error}</span>
        </motion.div>
      )}

      {loading || loadingDetails ? (
        <div className={`${adminCard} p-8 rounded-2xl flex items-center justify-center`}>
          <div className="w-6 h-6 border-2 border-[var(--color-admin-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : networks.length === 0 ? (
        <div className={`${adminCard} p-8 rounded-2xl flex flex-col items-center gap-3`}>
          <Network size={40} className="text-[var(--color-admin-text-muted)] opacity-40" />
          <p className={`text-sm ${adminTextMuted}`}>لم تنضم لأي شبكة بعد</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {networks.map((net) => {
              const stKey = net.membership_status || net.status || 'active';
              const netStatus = statusConfig[stKey] || { label: stKey, bg: '' };
              const targetNetworkId = net.network_id || net.id;
              return (
                <motion.div
                  key={net.membership_id || net.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`${adminCard} p-4 rounded-2xl cursor-pointer hover:border-[var(--color-admin-primary)]/40 transition-all`}
                  onClick={() => loadNetworkDetails(targetNetworkId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-admin-primary-soft)] border border-[var(--color-admin-primary)]/30 flex items-center justify-center">
                        <Network size={16} className="text-[var(--color-admin-primary)]" />
                      </div>
                      <div>
                        <span className={`text-xs font-bold ${adminText} block`}>{net.network_name}</span>
                        <span className={`text-[10px] ${adminTextMuted} font-mono`} dir="ltr">/{net.network_slug}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${netStatus.bg}`}>
                        {netStatus.label}
                      </span>
                      <ArrowLeft size={14} className="text-[var(--color-admin-text-muted)]" />
                    </div>
                  </div>
                  {net.network_description && (
                    <p className={`text-[10px] ${adminTextMuted} mt-2 pr-11`}>{net.network_description}</p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
