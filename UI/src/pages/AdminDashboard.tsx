import React, { useState, useEffect, useCallback, useRef } from 'react';
import { XCircle } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../store/AppContext';
import { api } from '../services/api';
import { MyNetworks } from '../components/MyNetworks';
import { BranchQrModal } from '../components/admin/BranchQrModal';
import { OverviewTab } from '../components/admin/tabs/OverviewTab';
import { TransactionsTab } from '../components/admin/tabs/TransactionsTab';
import { CustomersTab } from '../components/admin/tabs/CustomersTab';
import { CustomerLedgerDrawer } from '../components/admin/tabs/CustomerLedgerDrawer';
import { RewardsTab } from '../components/admin/tabs/RewardsTab';
import { OffersTab } from '../components/admin/tabs/OffersTab';
import { CampaignsTab } from '../components/admin/tabs/CampaignsTab';
import { BranchesPosTab } from '../components/admin/tabs/BranchesPosTab';
import { StaffAuditTab } from '../components/admin/tabs/StaffAuditTab';
import { SettingsTab } from '../components/admin/tabs/SettingsTab';
import {
  AdminMessage,
  AdminStats,
  Branch,
  Customer,
  EMPTY_ADMIN_STATS,
  TenantSettingsForm,
  TierSetting,
} from '../components/admin/types';

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const activeSubTab = ((location.state as any)?.tab) || 'overview';
  const { currentTenant } = useApp();

  const [message, setMessage] = useState<AdminMessage | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats>(EMPTY_ADMIN_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartStats, setChartStats] = useState<Array<{ month: string; earned: number; redeemed: number }>>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string | undefined>(undefined);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [adminRewards, setAdminRewards] = useState<any[]>([]);
  const [qrModalBranch, setQrModalBranch] = useState<Branch | null>(null);
  const [ledgerCustomerId, setLedgerCustomerId] = useState<string | null>(null);

  const [searchByName, setSearchByName] = useState('');
  const [searchByPhone, setSearchByPhone] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [inactiveDays, setInactiveDays] = useState<number | undefined>(undefined);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotal, setCustomerTotal] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const [settingsForm, setSettingsForm] = useState<TenantSettingsForm>({
    slug: '',
    name: '',
    points_per_egp: '1.0',
    min_purchase_egp: '0',
    points_expiry_days: '365',
    primary_color: '#1e40af',
    accent_color: '#f59e0b',
    bg_color: '#f8fafc',
    surface_color: '#ffffff',
    font_display: 'Playfair Display',
    font_body: 'Cairo',
    logo_url: '',
    tagline: '',
    business_type: 'cafe',
    code_prefix: 'MO2',
    show_menu: true,
    cashier_max_invoice_egp: '',
    point_value_egp: '0.05',
    welcome_bonus_points: '0',
    excluded_item_keywords: [],
  });

  const [tierSettings, setTierSettings] = useState<TierSetting[]>([
    { tier_name: 'bronze', multiplier: 1.0, min_earned_points: 0 },
    { tier_name: 'silver', multiplier: 1.5, min_earned_points: 500 },
    { tier_name: 'gold', multiplier: 2.0, min_earned_points: 2000 },
    { tier_name: 'platinum', multiplier: 3.0, min_earned_points: 5000 },
  ]);

  const loadAdminData = useCallback(async () => {
    try {
      const [customersRes, branchesData, stats, rewardsData] = await Promise.all([
        api.getAdminCustomers({
          name: searchByName || undefined,
          phone: searchByPhone || undefined,
          tier: tierFilter || undefined,
          inactive_days: inactiveDays,
          page: customerPage,
          limit: 50,
        }),
        api.getAdminBranches(),
        api.getAdminStats(selectedBranchFilter),
        api.getAdminRewards(),
      ]);

      setAdminRewards(rewardsData || []);
      const customerList = Array.isArray(customersRes) ? customersRes : customersRes?.customers || [];
      setCustomerTotal(customersRes?.total ?? customerList.length);
      setCustomers(
        customerList.map((c: any) => ({
          id: c.id,
          name: c.name || 'عميل',
          phone: c.phone,
          balance: Number(c.balance || 0),
          totalEarned: Number(c.total_earned || 0),
          tier: c.tier || 'bronze',
          status: c.is_verified ? 'نشط' : 'معلق',
          lastVisit: c.last_visit || null,
          signupStation: c.signup_station || null,
          signupBranchName: c.signup_branch_name || null,
        }))
      );

      setBranches(
        (branchesData || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          location: b.city || 'القاهرة',
          posType: b.pos_type,
          active: b.is_active,
          key: 'API Key Active',
          timezone: b.timezone || 'Africa/Cairo',
          openingTime: b.opening_time || null,
          closingTime: b.closing_time || null,
        }))
      );

      setAdminStats({
        totalCustomers: Number(stats.total_customers || 0),
        activeLoyalists: Number(stats.active_customers || 0),
        pointsIssuedThisMonth: Number(stats.points_this_month || 0),
        redemptionsToday: Number(stats.redemptions_today || 0),
        avgBasketEgp: Number(stats.avg_basket_egp || 0),
        totalRevenue30d: Number(stats.total_revenue_30d || 0),
        totalOutstandingPoints: Number(stats.total_outstanding_points || 0),
        pointValueEgp: Number(stats.point_value_egp || 0.05),
        pointsLiabilityEgp: Number(stats.points_liability_egp || 0),
        redemptionRatePct: Number(stats.redemption_rate_pct || 0),
        inactive14dCount: Number(stats.inactive_14d_count || 0),
        inactive30dCount: Number(stats.inactive_30d_count || 0),
      });
    } catch {
      setCustomers([]);
      setBranches([]);
      setAdminStats(EMPTY_ADMIN_STATS);
    } finally {
      setStatsLoading(false);
    }

    const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    try {
      const chartRes = await api.getAdminChartStats(selectedBranchFilter);
      setChartStats(
        (chartRes || []).map((r: any) => ({
          month: MONTH_NAMES_AR[parseInt(r.month_num, 10) - 1] || r.month_num,
          earned: Number(r.points_earned),
          redeemed: Number(r.points_redeemed),
        }))
      );
    } catch {
      setChartStats([]);
    } finally {
      setChartLoading(false);
    }
  }, [searchByName, searchByPhone, tierFilter, inactiveDays, customerPage, selectedBranchFilter]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadAdminData();
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [loadAdminData]);

  useEffect(() => {
    (async () => {
      try {
        const t = await api.getTenantSettings();
        setSettingsForm({
          slug: t.slug || '',
          name: t.name || '',
          points_per_egp: String(t.points_per_egp ?? '1.0'),
          min_purchase_egp: String(t.min_purchase_egp ?? '0'),
          points_expiry_days: String(t.points_expiry_days ?? '365'),
          primary_color: t.primary_color || '#1e40af',
          accent_color: t.accent_color || '#f59e0b',
          bg_color: t.bg_color || '#f8fafc',
          surface_color: t.surface_color || '#ffffff',
          font_display: t.font_display || 'Playfair Display',
          font_body: t.font_body || 'Cairo',
          logo_url: t.logo_url || '',
          tagline: t.tagline || '',
          business_type: t.business_type || 'cafe',
          code_prefix: t.code_prefix || 'MO2',
          show_menu: typeof t.show_menu === 'boolean' ? t.show_menu : t.business_type !== 'supermarket',
          cashier_max_invoice_egp: t.cashier_max_invoice_egp ? String(t.cashier_max_invoice_egp) : '',
          point_value_egp: String(t.point_value_egp ?? '0.05'),
          welcome_bonus_points: String(t.welcome_bonus_points ?? '0'),
          excluded_item_keywords: Array.isArray(t.excluded_item_keywords) ? t.excluded_item_keywords : [],
        });
      } catch {
        // Ignore offline fallback
      }
      try {
        const tiers = await api.getAdminTiers();
        if (Array.isArray(tiers) && tiers.length > 0) {
          setTierSettings(
            tiers.map((tr: any) => ({
              tier_name: tr.tier_name,
              multiplier: Number(tr.multiplier),
              min_earned_points: Number(tr.min_earned_points),
            }))
          );
        }
      } catch {
        // Ignore offline fallback
      }
    })();
  }, []);

  return (
    <div className="w-full text-[var(--color-admin-text)] flex flex-col gap-6" style={{ direction: 'rtl' }}>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800'
              : 'bg-rose-950/50 text-rose-400 border border-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100 cursor-pointer">
            <XCircle size={14} />
          </button>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring' as const, stiffness: 100, damping: 20 }}
        >
          {activeSubTab === 'overview' && (
            <OverviewTab
              adminStats={adminStats}
              statsLoading={statsLoading}
              chartStats={chartStats}
              chartLoading={chartLoading}
              customers={customers}
              branches={branches}
              selectedBranchFilter={selectedBranchFilter}
              onSelectBranchFilter={setSelectedBranchFilter}
              onMessage={setMessage}
              onDataChanged={loadAdminData}
              onOpenCustomerLedger={setLedgerCustomerId}
            />
          )}

          {activeSubTab === 'transactions' && (
            <TransactionsTab
              branches={branches}
              onMessage={setMessage}
              onDataChanged={loadAdminData}
            />
          )}

          {activeSubTab === 'customers' && (
            <CustomersTab
              customers={customers}
              customerTotal={customerTotal}
              customerPage={customerPage}
              searchByName={searchByName}
              searchByPhone={searchByPhone}
              tierFilter={tierFilter}
              inactiveDays={inactiveDays}
              onSearchNameChange={setSearchByName}
              onSearchPhoneChange={setSearchByPhone}
              onTierFilterChange={setTierFilter}
              onInactiveDaysChange={setInactiveDays}
              onPageChange={setCustomerPage}
              onOpenLedger={setLedgerCustomerId}
              onMessage={setMessage}
              onCustomersUpdated={loadAdminData}
            />
          )}

          {activeSubTab === 'rewards' && (
            <RewardsTab
              rewards={adminRewards}
              businessType={settingsForm.business_type}
              onMessage={setMessage}
              onRewardsChanged={loadAdminData}
            />
          )}

          {activeSubTab === 'offers' && <OffersTab onMessage={setMessage} />}

          {activeSubTab === 'campaigns' && (
            <CampaignsTab
              storeName={settingsForm.name || currentTenant.name}
              onMessage={setMessage}
            />
          )}

          {activeSubTab === 'branches' && (
            <BranchesPosTab
              branches={branches}
              businessType={settingsForm.business_type}
              onOpenQrModal={setQrModalBranch}
              onMessage={setMessage}
              onBranchesChanged={loadAdminData}
            />
          )}

          {activeSubTab === 'staff' && (
            <StaffAuditTab branches={branches} onMessage={setMessage} />
          )}

          {activeSubTab === 'networks' && <MyNetworks />}

          {activeSubTab === 'settings' && (
            <SettingsTab
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
              tierSettings={tierSettings}
              setTierSettings={setTierSettings}
              onMessage={setMessage}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <CustomerLedgerDrawer
        customerId={ledgerCustomerId}
        storeName={settingsForm.name || currentTenant.name}
        onClose={() => setLedgerCustomerId(null)}
        onMessage={setMessage}
        onDataChanged={loadAdminData}
      />

      <BranchQrModal
        branch={qrModalBranch}
        tenantSlug={settingsForm.slug || currentTenant.id}
        tenantName={settingsForm.name || currentTenant.name}
        businessType={settingsForm.business_type as 'cafe' | 'supermarket' | 'retail'}
        onClose={() => setQrModalBranch(null)}
      />
    </div>
  );
};
