import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Network, 
  Users, 
  ArrowLeft, 
  Warning, 
  CheckCircle 
} from '@phosphor-icons/react';

const adminCard = 'bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)]';
const adminText = 'text-[var(--color-admin-text)]';
const adminTextMuted = 'text-[var(--color-admin-text-muted)]';

// ─── TYPES ──────────────────────────────────────────────────

interface NetworkMembership {
  id: string;
  network_id: string;
  tenant_id: string;
  status: 'pending' | 'active' | 'suspended';
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
  active:   { label: 'نشط',   bg: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700' },
  pending:  { label: 'معلق',  bg: 'bg-amber-900/50 text-amber-400 border border-amber-700' },
  suspended:{ label: 'معلّق', bg: 'bg-red-900/50 text-red-400 border border-red-700' },
};

// ─── COMPONENT ──────────────────────────────────────────────

export const MyNetworks: React.FC = () => {
  const [networks, setNetworks] = useState<NetworkMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const data = await api.getMyNetworkDetails(id);
      setSelectedNetwork(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load network details');
    } finally {
      setLoadingDetails(false);
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
        {/* Back Button */}
        <button 
          onClick={() => setSelectedNetwork(null)}
          className="flex items-center gap-2 text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-text)] text-xs font-bold transition-colors self-start"
        >
          <ArrowLeft size={16} />
          العودة للشبكات
        </button>

        {/* Network Header */}
        <div className={`${adminCard} p-5 rounded-2xl flex flex-col gap-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-700/40 flex items-center justify-center">
                <Network size={20} className="text-amber-400" />
              </div>
              <div>
                <h2 className={`text-sm font-black ${adminText}`}>{network.name}</h2>
                <p className={`text-[10px] ${adminTextMuted} font-mono`}>/{network.slug}</p>
              </div>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-900/50 text-emerald-400 border border-emerald-700`}>
              نشط
            </span>
          </div>
          {network.description && (
            <p className={`text-xs ${adminTextMuted}`}>{network.description}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`${adminCard} p-4 rounded-2xl`}>
            <span className={`text-[10px] ${adminTextMuted} font-bold flex items-center gap-2`}>
              <Users size={14} className="text-cyan-400" />
              عدد الأعضاء
            </span>
            <span className={`text-lg font-black ${adminText}`}>{network.member_count || members.length}</span>
          </div>
          <div className={`${adminCard} p-4 rounded-2xl`}>
            <span className={`text-[10px] ${adminTextMuted} font-bold`}>الأعضاء النشطين</span>
            <span className={`text-lg font-black ${adminText}`}>
              {members.filter(m => m.status === 'active').length}
            </span>
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
                    <span className={`text-[10px] ${adminTextMuted} block font-mono`}>/{member.tenant_slug}</span>
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

        {/* Leave Network */}
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
      {/* Header */}
      <div className={`${adminCard} p-4 rounded-2xl flex items-center gap-3`}>
        <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-700/40 flex items-center justify-center">
          <Network size={20} className="text-amber-400" />
        </div>
        <div>
          <h2 className={`text-sm font-black ${adminText}`}>شبكاتي</h2>
          <p className={`text-[10px] ${adminTextMuted}`}>الشبكات التي أنت عضو فيها</p>
        </div>
      </div>

      {/* Error */}
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

      {/* Loading */}
      {loading ? (
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
              const netStatus = statusConfig[net.status] || { label: net.status, bg: '' };
              return (
                <motion.div
                  key={net.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`${adminCard} p-4 rounded-2xl cursor-pointer hover:border-[var(--color-admin-primary)]/30 transition-all`}
                  onClick={() => loadNetworkDetails(net.network_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-700/40 flex items-center justify-center">
                        <Network size={16} className="text-amber-400" />
                      </div>
                      <div>
                        <span className={`text-xs font-bold ${adminText} block`}>{net.network_name}</span>
                        <span className={`text-[10px] ${adminTextMuted} font-mono`}>/{net.network_slug}</span>
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
