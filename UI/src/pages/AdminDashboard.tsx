import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TrendUp, Users, Gift, Coins, Plus, CheckCircle, Storefront, 
  PencilSimple, TrashSimple, XCircle, ArrowClockwise, Star, 
  MapPin, DeviceMobile, WarningCircle
} from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../services/api';
import { Modal } from '../components/ui/Modal';

const chartData = [
  { month: 'يناير', earned: 12400, redeemed: 3200 },
  { month: 'فبراير', earned: 14800, redeemed: 4100 },
  { month: 'مارس', earned: 11200, redeemed: 3800 },
  { month: 'أبريل', earned: 18900, redeemed: 5200 },
  { month: 'مايو', earned: 16200, redeemed: 4900 },
  { month: 'يونيو', earned: 20500, redeemed: 6100 },
];

interface Customer { id: string; name: string; phone: string; tier: string; balance: number; totalEarned: number; status: string; lastVisit: string | null; }
interface Branch { id: string; name: string; location: string; posType: string; active: boolean; key: string; timezone: string; openingTime: string | null; closingTime: string | null; }

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const activeSubTab = ((location.state as any)?.tab) || 'overview';
  const { currentTenant } = useApp();

  const [adminRewards, setAdminRewards] = useState<any[]>([]);
  const [pointsAmount, setPointsAmount] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('مكافأة يدوية من الإدارة');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showCreateRewardForm, setShowCreateRewardForm] = useState(false);
  const [newReward, setNewReward] = useState({ title: '', description: '', pointsRequired: '', category: 'مشروبات', expiryDays: '30' });
  const [isCreatingReward, setIsCreatingReward] = useState(false);

  const mockAdminStats = { totalCustomers: 1240, activeLoyalists: 843, pointsIssuedThisMonth: 45200, redemptionsToday: 18 };
  const [adminStats, setAdminStats] = useState(mockAdminStats);
  const [statsLoading, setStatsLoading] = useState(true);

  const [cafeCustomers, setCafeCustomers] = useState<Customer[]>([]);

  const [branches, setBranches] = useState<Branch[]>([
    { id: 'b1', name: 'فرع وسط البلد', location: 'القاهرة', posType: 'Foodics', active: true, key: 'api_key_****_balad', timezone: 'Africa/Cairo', openingTime: '09:00', closingTime: '22:00' },
    { id: 'b2', name: 'فرع مصر الجديدة', location: 'القاهرة', posType: 'Foodics', active: true, key: 'api_key_****_heliopolis', timezone: 'Africa/Cairo', openingTime: '09:00', closingTime: '23:00' },
    { id: 'b3', name: 'فرع سموحة', location: 'الإسكندرية', posType: 'Manual', active: false, key: 'api_key_****_alex', timezone: 'Africa/Cairo', openingTime: null, closingTime: null },
  ]);

  const [chartStats, setChartStats] = useState(chartData);
  const [chartLoading, setChartLoading] = useState(true);

  const [searchByName, setSearchByName] = useState('');
  const [searchByPhone, setSearchByPhone] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotal, setCustomerTotal] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const handleSearch = () => {
    setCustomerPage(1);
    loadAdminData(1);
  };

  const loadAdminData = useCallback(async (page?: number) => {
    const p = page ?? customerPage;
    try {
      const [customersRes, branchesData, stats, rewardsData] = await Promise.all([
        api.getAdminCustomers({ name: searchByName || undefined, phone: searchByPhone || undefined, page: p, limit: 50 }),
        api.getAdminBranches(),
        api.getAdminStats(),
        api.getAdminRewards(),
      ]);
      setAdminRewards(rewardsData || []);
      const customerList = Array.isArray(customersRes) ? customersRes : customersRes?.customers || [];
      const total = customersRes?.total || customerList.length;
      setCustomerTotal(total);
      setCafeCustomers(customerList.map((c: any) => ({
        id: c.id, name: c.name || 'عميل', phone: c.phone,
        balance: c.balance || 0, totalEarned: c.total_earned || 0,
        tier: c.tier || 'bronze', status: c.is_verified ? 'نشط' : 'معلق',
        lastVisit: c.last_visit || null,
      })));
      setBranches(branchesData.map((b: any) => ({
        id: b.id, name: b.name, location: b.city || 'القاهرة',
        posType: b.pos_type, active: b.is_active, key: 'API Key Active',
        timezone: b.timezone || 'Africa/Cairo', openingTime: b.opening_time || null, closingTime: b.closing_time || null,
      })));
      setAdminStats({
        totalCustomers: Number(stats.total_customers || 0),
        activeLoyalists: Number(stats.active_customers || 0),
        pointsIssuedThisMonth: Number(stats.points_this_month || 0),
        redemptionsToday: Number(stats.redemptions_today || 0),
      });
    } catch {
      setCafeCustomers([]);
      setBranches([]);
      setAdminStats({ totalCustomers: 0, activeLoyalists: 0, pointsIssuedThisMonth: 0, redemptionsToday: 0 });
    } finally {
      setStatsLoading(false);
    }
    const MONTH_NAMES_AR: string[] = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    try {
      const chartRes = await api.getAdminChartStats();
      if (chartRes.length > 0) {
        setChartStats(chartRes.map((r: any) => ({
          month: MONTH_NAMES_AR[parseInt(r.month_num) - 1] || r.month_num,
          earned: Number(r.points_earned), redeemed: Number(r.points_redeemed),
        })));
      }
    } catch {
      setChartStats([]);
    } finally {
      setChartLoading(false);
    }
  }, [searchByName, searchByPhone, customerPage]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { loadAdminData(); }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [loadAdminData]);

  useEffect(() => {
    (async () => {
      try {
        const t = await api.getTenantSettings();
        setSettingsForm({
          name: t.name || '',
          points_per_egp: String(t.points_per_egp || '1.0'),
          min_purchase_egp: String(t.min_purchase_egp || '0'),
          points_expiry_days: String(t.points_expiry_days || '365'),
          primary_color: t.primary_color || '#1e40af',
          accent_color: t.accent_color || '#f59e0b',
          bg_color: t.bg_color || '#f8fafc',
          surface_color: t.surface_color || '#ffffff',
          font_display: t.font_display || 'Playfair Display',
          font_body: t.font_body || 'Cairo',
          logo_url: t.logo_url || '',
          tagline: t.tagline || '',
        });
      } catch { /* ignore */ }
      setSettingsLoading(false);
    })();
  }, []);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReward.title || !newReward.pointsRequired) return;
    setIsCreatingReward(true);
    try {
      await api.createReward({
        title: newReward.title, description: newReward.description,
        points_required: Number(newReward.pointsRequired), category: newReward.category,
        expiry_days: Number(newReward.expiryDays),
      });
      setMessage({ text: `تم إنشاء مكافأة "${newReward.title}" بنجاح!`, type: 'success' });
      setNewReward({ title: '', description: '', pointsRequired: '', category: 'مشروبات', expiryDays: '30' });
      setShowCreateRewardForm(false);
    } catch (err: any) {
      setMessage({ text: err?.message || 'فشل إنشاء المكافأة', type: 'error' });
    } finally {
      setIsCreatingReward(false);
    }
  };

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !pointsAmount) {
      setMessage({ text: 'يرجى ملء جميع الحقول المطلوبة', type: 'error' });
      return;
    }
    setIsSubmittingAdjustment(true);
    setMessage(null);
    try {
      await api.adminEarnPoints({ customer_id: selectedCustomerId, amount: Number(pointsAmount), note: adjustmentNote });
      setCafeCustomers(prev => prev.map(c => c.id === selectedCustomerId ? { ...c, balance: c.balance + Number(pointsAmount), totalEarned: c.totalEarned + Number(pointsAmount) } : c));
      setMessage({ text: `تمت إضافة ${pointsAmount} نقطة بنجاح!`, type: 'success' });
      setPointsAmount('');
      setSelectedCustomerId('');
      setAdjustmentNote('');
    } catch (err: any) {
      setMessage({ text: err.message || 'فشلت العملية', type: 'error' });
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // CRUD modals state
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [editReward, setEditReward] = useState<any | null>(null);
  const [deleteRewardId, setDeleteRewardId] = useState<string | null>(null);
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deleteBranchId, setDeleteBranchId] = useState<string | null>(null);
  const [newBranch, setNewBranch] = useState({ name: '', city: '', posType: 'Manual', timezone: 'Africa/Cairo', openingTime: '', closingTime: '' });

  const [settingsForm, setSettingsForm] = useState({
    name: '', points_per_egp: '1.0', min_purchase_egp: '0',
    points_expiry_days: '365', primary_color: '#1e40af', accent_color: '#f59e0b',
    bg_color: '#f8fafc', surface_color: '#ffffff', font_display: 'Playfair Display',
    font_body: 'Cairo', logo_url: '', tagline: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [editCustomerForm, setEditCustomerForm] = useState({ name: '', phone: '', tier: '', is_verified: true });
  const [editRewardForm, setEditRewardForm] = useState({ title: '', description: '', pointsRequired: '', category: '', expiryDays: '', is_active: true });
  const [editBranchForm, setEditBranchForm] = useState({ name: '', city: '', posType: '', is_active: true, timezone: 'Africa/Cairo', openingTime: '', closingTime: '' });

  const handleEditCustomer = async () => {
    if (!editCustomer) return;
    try {
      await api.updateCustomer(editCustomer.id, {
        name: editCustomerForm.name, phone: editCustomerForm.phone, tier: editCustomerForm.tier, is_verified: editCustomerForm.is_verified,
      });
      setCafeCustomers(prev => prev.map(c => c.id === editCustomer.id ? {
        ...c, name: editCustomerForm.name, phone: editCustomerForm.phone, tier: editCustomerForm.tier, status: editCustomerForm.is_verified ? 'نشط' : 'معلق',
      } : c));
      setMessage({ text: 'تم تحديث العميل بنجاح', type: 'success' });
    } catch (err: any) { setMessage({ text: err?.message || 'فشل تحديث العميل', type: 'error' }); }
    setEditCustomer(null);
  };

  const handleDeleteCustomer = async () => {
    if (!deleteCustomerId) return;
    try {
      await api.deleteCustomer(deleteCustomerId);
      setCafeCustomers(prev => prev.filter(c => c.id !== deleteCustomerId));
      setMessage({ text: 'تم حذف العميل', type: 'success' });
    } catch (err: any) { setMessage({ text: err?.message || 'فشل حذف العميل', type: 'error' }); }
    setDeleteCustomerId(null);
  };

  const handleEditReward = async () => {
    if (!editReward) return;
    try {
      await api.updateReward(editReward.id, {
        title: editRewardForm.title, description: editRewardForm.description,
        points_required: Number(editRewardForm.pointsRequired), category: editRewardForm.category,
        expiry_days: Number(editRewardForm.expiryDays), is_active: editRewardForm.is_active,
      });
      setMessage({ text: 'تم تحديث المكافأة بنجاح', type: 'success' });
    } catch (err: any) { setMessage({ text: err?.message || 'فشل تحديث المكافأة', type: 'error' }); }
    setEditReward(null);
  };

  const handleDeleteReward = async () => {
    if (!deleteRewardId) return;
    try {
      await api.deleteReward(deleteRewardId);
      setMessage({ text: 'تم حذف المكافأة', type: 'success' });
    } catch (err: any) { setMessage({ text: err?.message || 'فشل حذف المكافأة', type: 'error' }); }
    setDeleteRewardId(null);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.name) return;
    try {
      await api.createBranch(newBranch);
      setBranches(prev => [...prev, { id: `b_${Date.now()}`, name: newBranch.name, location: newBranch.city || 'القاهرة', posType: newBranch.posType, active: true, key: 'API Key Active', timezone: newBranch.timezone, openingTime: newBranch.openingTime || null, closingTime: newBranch.closingTime || null }]);
      setMessage({ text: 'تم إنشاء الفرع بنجاح', type: 'success' });
    } catch (err: any) { setMessage({ text: err?.message || 'فشل إنشاء الفرع', type: 'error' }); }
    setCreateBranchOpen(false);
    setNewBranch({ name: '', city: '', posType: 'Manual', timezone: 'Africa/Cairo', openingTime: '', closingTime: '' });
  };

  const handleEditBranch = async () => {
    if (!editBranch) return;
    try {
      await api.updateBranch(editBranch.id, editBranchForm);
      setBranches(prev => prev.map(b => b.id === editBranch.id ? { ...b, name: editBranchForm.name, location: editBranchForm.city, posType: editBranchForm.posType, active: editBranchForm.is_active, timezone: editBranchForm.timezone, openingTime: editBranchForm.openingTime || null, closingTime: editBranchForm.closingTime || null } : b));
      setMessage({ text: 'تم تحديث الفرع بنجاح', type: 'success' });
    } catch (err: any) { setMessage({ text: err?.message || 'فشل تحديث الفرع', type: 'error' }); }
    setEditBranch(null);
  };

  const handleDeleteBranch = async () => {
    if (!deleteBranchId) return;
    try {
      await api.deleteBranch(deleteBranchId);
      setBranches(prev => prev.filter(b => b.id !== deleteBranchId));
      setMessage({ text: 'تم حذف الفرع', type: 'success' });
    } catch (err: any) { setMessage({ text: err?.message || 'فشل حذف الفرع', type: 'error' }); }
    setDeleteBranchId(null);
  };

  const openEditCustomer = (c: Customer) => {
    setEditCustomer(c);
    setEditCustomerForm({ name: c.name, phone: c.phone, tier: c.tier, is_verified: c.status === 'نشط' });
  };

  const openEditReward = (r: any) => {
    setEditReward(r);
    setEditRewardForm({ title: r.title, description: r.description || '', pointsRequired: String(r.pointsRequired), category: r.category || 'مشروبات', expiryDays: String(r.expiryDays || 30), is_active: r.is_active !== false });
  };

  const openEditBranch = (b: Branch) => {
    setEditBranch(b);
    setEditBranchForm({ name: b.name, city: b.location, posType: b.posType, is_active: b.active, timezone: b.timezone, openingTime: b.openingTime || '', closingTime: b.closingTime || '' });
  };

  const tierLabel: Record<string, { ar: string; style: string }> = {
    platinum: { ar: 'بلاتيني', style: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
    gold: { ar: 'ذهبي', style: 'bg-amber-950 text-amber-300 border-amber-800' },
    silver: { ar: 'فضي', style: 'bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] border-[var(--color-admin-border)]' },
    bronze: { ar: 'عادي', style: 'bg-orange-950 text-orange-300 border-orange-800' },
  };

  const tierBadge = (tier: string) => tierLabel[tier]?.style || tierLabel.bronze.style;
  const tierDisplay = (tier: string) => tierLabel[tier]?.ar || tier;

  const statusStyle = (status: string) => status === 'نشط' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400';

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateTenantSettings({
        points_per_egp: Number(settingsForm.points_per_egp),
        min_purchase_egp: Number(settingsForm.min_purchase_egp),
        points_expiry_days: settingsForm.points_expiry_days ? Number(settingsForm.points_expiry_days) : null,
      });
      setMessage({ text: 'تم حفظ إعدادات الولاء', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err?.message || 'فشل حفظ الإعدادات', type: 'error' });
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateTenantSettings({
        name: settingsForm.name,
        primary_color: settingsForm.primary_color,
        accent_color: settingsForm.accent_color,
        bg_color: settingsForm.bg_color,
        surface_color: settingsForm.surface_color,
        font_display: settingsForm.font_display,
        font_body: settingsForm.font_body,
        logo_url: settingsForm.logo_url || null,
        tagline: settingsForm.tagline || null,
      });
      setMessage({ text: 'تم حفظ العلامة التجارية', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err?.message || 'فشل حفظ العلامة التجارية', type: 'error' });
    }
  };

  return (
    <div className="w-full text-[var(--color-admin-text)] flex flex-col gap-6" style={{ direction: 'rtl' }}>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl text-xs font-bold text-center ${message.type === 'success' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800' : 'bg-rose-950/50 text-rose-400 border border-rose-800'}`}
        >
          {message.text}
          <button onClick={() => setMessage(null)} className="mr-3 opacity-60 hover:opacity-100 cursor-pointer"><XCircle size={14} /></button>
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
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-4">
              {statsLoading ? (
                [1,2,3,4].map(i => (
                  <div key={i} className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-2 animate-pulse">
                    <div className="h-3 w-20 bg-[var(--color-admin-border)] rounded" />
                    <div className="h-8 w-16 bg-[var(--color-admin-border)] rounded mt-1" />
                  </div>
                ))
              ) : (
                <>
                   <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, type: 'spring' as const, stiffness: 100, damping: 20 }}
                     className="col-span-2 lg:col-span-3 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-1.5 hover:border-[var(--color-admin-primary)]/30 transition-all"
                   >
                     <div className="flex items-center justify-between text-[var(--color-admin-text-muted)] text-xs font-bold">
                       <span>إجمالي المشتركين</span>
                       <Users size={20} style={{ color: 'var(--color-admin-primary)' }} />
                     </div>
                     <span className="text-2xl font-black text-[var(--color-admin-text)]">{adminStats.totalCustomers}</span>
                  </motion.div>
                   <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07, type: 'spring' as const, stiffness: 100, damping: 20 }}
                     className="col-span-2 lg:col-span-2 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-1.5 hover:border-[var(--color-admin-primary)]/30 transition-all"
                   >
                     <div className="flex items-center justify-between text-[var(--color-admin-text-muted)] text-xs font-bold">
                       <span>النشطين</span>
                       <TrendUp size={20} className="text-emerald-500" />
                     </div>
                     <span className="text-2xl font-black text-[var(--color-admin-text)]">{adminStats.activeLoyalists}</span>
                   </motion.div>
                   <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, type: 'spring' as const, stiffness: 100, damping: 20 }}
                     className="col-span-1 lg:col-span-1 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-1.5 hover:border-[var(--color-admin-primary)]/30 transition-all"
                   >
                     <div className="flex items-center justify-between text-[var(--color-admin-text-muted)] text-xs font-bold">
                       <span>النقاط المصدرة</span>
                       <Coins size={20} className="text-amber-500" />
                     </div>
                     <span className="text-2xl font-black text-[var(--color-admin-text)]">{adminStats.pointsIssuedThisMonth.toLocaleString()}</span>
                   </motion.div>
                   <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21, type: 'spring' as const, stiffness: 100, damping: 20 }}
                     className="col-span-1 lg:col-span-2 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-1.5 hover:border-[var(--color-admin-primary)]/30 transition-all"
                   >
                     <div className="flex items-center justify-between text-[var(--color-admin-text-muted)] text-xs font-bold">
                       <span>الاسترداد (اليوم)</span>
                       <Gift size={20} className="text-rose-500" />
                     </div>
                     <span className="text-2xl font-black text-[var(--color-admin-text)]">{adminStats.redemptionsToday}</span>
                   </motion.div>
                </>
              )}
            </div>

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
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="redeemedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }} />
                        <Area type="monotone" dataKey="earned" stroke="var(--color-primary)" fill="url(#earnedGrad)" strokeWidth={2} name="النقاط المكتسبة" />
                        <Area type="monotone" dataKey="redeemed" stroke="#f59e0b" fill="url(#redeemedGrad)" strokeWidth={2} name="النقاط المستردة" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl">
                <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3 mb-4">
                  <Gift size={20} className="text-amber-500" />
                  <h2 className="text-sm font-bold">النقاط الشهرية</h2>
                </div>
                <div className="h-64" dir="ltr">
                  {chartLoading ? (
                    <div className="h-full w-full bg-[var(--color-admin-border)] rounded-xl animate-pulse" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }} />
                        <Bar dataKey="earned" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="النقاط المكتسبة" />
                        <Bar dataKey="redeemed" fill="#f59e0b" radius={[4, 4, 0, 0]} name="النقاط المستردة" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3">
                  <Coins size={22} className="text-amber-500" />
                  <h2 className="text-sm font-bold">تعديل وإضافة النقاط يدوياً</h2>
                </div>
                <form onSubmit={handleAdjustPoints} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[var(--color-admin-text-muted)] font-bold">اختر العميل</label>
                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-xs text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)]"
                    >
                      <option value="">-- اختر من القائمة --</option>
                      {cafeCustomers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone}) - رصيد: {c.balance}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-[var(--color-text-muted)] dark:text-slate-400 font-bold">النقاط</label>
                       <input type="number" placeholder="100" value={pointsAmount} onChange={(e) => setPointsAmount(e.target.value)}
                         className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-xs text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)]"
                       />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-[var(--color-text-muted)] dark:text-slate-400 font-bold">السبب</label>
                       <input type="text" placeholder="بونص..." value={adjustmentNote} onChange={(e) => setAdjustmentNote(e.target.value)}
                         className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-xs text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)]"
                       />
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmittingAdjustment}
                    className="w-full bg-[var(--color-primary)] text-white text-xs font-bold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                  >
                    {isSubmittingAdjustment ? <ArrowClockwise className="animate-spin" size={16} /> : <Plus size={16} />}
                    تأكيد منح النقاط
                  </button>
                </form>
              </div>

              <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <TrendUp size={22} className="text-emerald-500" />
                    <h2 className="text-sm font-bold">آخر العمليات</h2>
                  </div>
                </div>
                <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto">
                  <div className="flex items-center justify-between p-2.5 bg-[var(--color-admin-bg)] rounded-xl border border-[var(--color-admin-border)]">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--color-text)] dark:text-slate-200">طلب ناجح #INV-9201</span>
                      <span className="text-[9px] text-[var(--color-text-muted)] dark:text-slate-400">فرع مصر الجديدة | Foodics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-500">+150 نقطة</span>
                      <CheckCircle size={16} className="text-emerald-500" />
                    </div>
                  </div>
                   <div className="flex items-center justify-between p-2.5 bg-[var(--color-admin-bg)] rounded-xl border border-[var(--color-admin-border)]">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--color-admin-text)]">طلب ناجح #INV-9192</span>
                        <span className="text-[9px] text-[var(--color-admin-text-muted)]">فرع وسط البلد | Foodics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-500">+45 نقطة</span>
                        <CheckCircle size={16} className="text-emerald-500" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-[var(--color-admin-bg)] rounded-xl border border-[var(--color-admin-border)]">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--color-admin-text)]">استرداد #RDM-8822</span>
                        <span className="text-[9px] text-[var(--color-admin-text-muted)]">تطبيق العميل</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-500">-80 نقطة</span>
                        <CheckCircle size={16} className="text-amber-500" />
                      </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'customers' && (
          <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[var(--color-admin-border)] flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold">قاعدة بيانات العملاء</h2>
                <span className="text-xs text-[var(--color-admin-text-muted)]">{cafeCustomers.length} عميل</span>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="بحث بالاسم..." value={searchByName}
                  onChange={e => setSearchByName(e.target.value)}
                  className="flex-1 bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl text-xs outline-none focus:border-[var(--color-admin-primary)]"
                />
                <input type="text" placeholder="بحث بالهاتف..." value={searchByPhone}
                  onChange={e => setSearchByPhone(e.target.value)}
                  className="flex-1 bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl text-xs outline-none focus:border-[var(--color-admin-primary)]"
                />
                <button onClick={handleSearch}
                  className="bg-[var(--color-admin-primary)] text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer hover:opacity-90"
                >بحث</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] uppercase text-[10px] font-bold border-b border-[var(--color-admin-border)]">
                  <tr>
                    <th className="p-4">الاسم</th>
                    <th className="p-4">الهاتف</th>
                    <th className="p-4">الفئة</th>
                    <th className="p-4">الرصيد</th>
                    <th className="p-4">النقاط المكتسبة</th>
                    <th className="p-4">آخر زيارة</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-admin-border)] text-[var(--color-admin-text)]">
                  {cafeCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-[var(--color-admin-bg)] transition-all">
                      <td className="p-4 font-bold">{customer.name}</td>
                      <td className="p-4 font-mono text-[var(--color-admin-text-muted)]">{customer.phone}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tierBadge(customer.tier)}`}>
                          {tierDisplay(customer.tier)}
                        </span>
                      </td>
                      <td className="p-4 font-bold" style={{ color: 'var(--color-admin-primary)' }}>{customer.balance.toLocaleString()}</td>
                      <td className="p-4 text-[var(--color-admin-text-muted)]">{customer.totalEarned.toLocaleString()}</td>
                      <td className="p-4 text-[var(--color-admin-text-muted)] text-[11px]">{customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('ar-SA') : '—'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusStyle(customer.status)}`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditCustomer(customer)} className="p-1.5 rounded-lg hover:bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-primary)] transition-all cursor-pointer">
                            <PencilSimple size={14} />
                          </button>
                          <button onClick={() => setDeleteCustomerId(customer.id)} className="p-1.5 rounded-lg hover:bg-rose-950/30 text-[var(--color-admin-text-muted)] hover:text-rose-500 transition-all cursor-pointer">
                            <TrashSimple size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-[var(--color-admin-border)] flex justify-between items-center text-xs">
              <span className="text-[var(--color-admin-text-muted)]">إجمالي: {customerTotal} عميل</span>
              <div className="flex gap-2">
                <button disabled={customerPage <= 1} onClick={() => { setCustomerPage(p => Math.max(1, p - 1)); loadAdminData(Math.max(1, customerPage - 1)); }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-admin-border)] disabled:opacity-30 cursor-pointer disabled:cursor-default hover:bg-[var(--color-admin-bg)]"
                >السابق</button>
                <span className="px-3 py-1.5 text-[var(--color-admin-text-muted)]">صفحة {customerPage}</span>
                <button disabled={customerPage * 50 >= customerTotal} onClick={() => { setCustomerPage(p => p + 1); loadAdminData(customerPage + 1); }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-admin-border)] disabled:opacity-30 cursor-pointer disabled:cursor-default hover:bg-[var(--color-admin-bg)]"
                >التالي</button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'rewards' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl">
                <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3 mb-4">
                  <h2 className="text-sm font-bold">المكافآت النشطة</h2>
                  <button onClick={() => setShowCreateRewardForm(!showCreateRewardForm)}
                    className="bg-[var(--color-admin-primary)] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer hover:opacity-90 transition-all"
                  >
                    <Plus size={14} /> إضافة مكافأة
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adminRewards.map((reward) => (
                    <div key={reward.id} className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-4 rounded-xl flex gap-3 relative overflow-hidden group">
                      <img src={reward.imageUrl} alt={reward.title}
                        className="w-16 h-16 rounded-lg object-cover border border-[var(--color-admin-border)] shrink-0"
                      />
                      <div className="flex flex-col gap-1 text-right flex-1 min-w-0">
                        <span className="text-xs font-bold text-[var(--color-admin-text)]">{reward.title}</span>
                        <span className="text-[10px] text-[var(--color-admin-text-muted)] line-clamp-2">{reward.description}</span>
                        <span className="text-[10px] font-black" style={{ color: 'var(--color-admin-primary)' }}>{reward.pointsRequired} نقطة</span>
                      </div>
                      <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditReward(reward)} className="p-1.5 rounded-lg bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-primary)] transition-all cursor-pointer">
                          <PencilSimple size={12} />
                        </button>
                        <button onClick={() => setDeleteRewardId(reward.id)} className="p-1.5 rounded-lg bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] text-[var(--color-admin-text-muted)] hover:text-rose-500 transition-all cursor-pointer">
                          <TrashSimple size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4 ${!showCreateRewardForm ? 'hidden lg:flex' : ''}`}>
              <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3">
                <Plus size={22} className="text-emerald-500" />
                <h2 className="text-sm font-bold">إضافة مكافأة جديدة</h2>
              </div>
              <form onSubmit={handleCreateReward} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-[var(--color-admin-text-muted)] font-bold">اسم المكافأة</label>
                  <input type="text" placeholder="مثال: فلات وايت مجاني" value={newReward.title}
                    onChange={(e) => setNewReward(p => ({ ...p, title: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)]" required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[var(--color-admin-text-muted)] font-bold">النقاط المطلوبة</label>
                  <input type="number" placeholder="100" value={newReward.pointsRequired}
                    onChange={(e) => setNewReward(p => ({ ...p, pointsRequired: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)]" required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[var(--color-admin-text-muted)] font-bold">القسم</label>
                  <select value={newReward.category} onChange={(e) => setNewReward(p => ({ ...p, category: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none"
                  >
                    <option value="مشروبات">مشروبات</option>
                    <option value="حلويات">حلويات</option>
                    <option value="وجبات">وجبات</option>
                    <option value="خصومات">خصومات</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[var(--color-admin-text-muted)] font-bold">الصلاحية (أيام)</label>
                  <input type="number" placeholder="30" value={newReward.expiryDays}
                    onChange={(e) => setNewReward(p => ({ ...p, expiryDays: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[var(--color-admin-text-muted)] font-bold">الوصف</label>
                  <textarea placeholder="شروط المكافأة..." value={newReward.description}
                    onChange={(e) => setNewReward(p => ({ ...p, description: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none h-20 resize-none"
                  />
                </div>
                <button type="submit" disabled={isCreatingReward}
                  className="w-full bg-[var(--color-admin-primary)] text-white font-bold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isCreatingReward ? <ArrowClockwise className="animate-spin" size={16} /> : 'إنشاء المكافأة'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeSubTab === 'branches' && (
          <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3 mb-6">
              <div className="flex items-center gap-2">
                <Storefront size={22} style={{ color: 'var(--color-admin-primary)' }} />
                <h2 className="text-sm font-bold">إدارة الفروع</h2>
              </div>
              <button onClick={() => setCreateBranchOpen(true)}
                className="bg-[var(--color-admin-primary)] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer hover:opacity-90 transition-all"
              >
                <Plus size={14} /> تسجيل فرع جديد
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {branches.map(branch => (
                <div key={branch.id} className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-3 relative group">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-[var(--color-admin-text)]">{branch.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${branch.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'}`}>
                      {branch.active ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-[11px] text-[var(--color-admin-text-muted)]">
                    <span className="flex items-center gap-1.5"><MapPin size={12} /> {branch.location}</span>
                    <span className="flex items-center gap-1.5"><DeviceMobile size={12} /> {branch.posType}</span>
                    <span className="flex items-center gap-1.5 text-[10px]">{branch.timezone}</span>
                    {branch.openingTime && branch.closingTime && (
                      <span className="flex items-center gap-1.5">{branch.openingTime} — {branch.closingTime}</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2 pt-3 border-t border-[var(--color-admin-border)] opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditBranch(branch)} className="flex-1 bg-[var(--color-admin-bg)] hover:bg-[var(--color-admin-border)] text-[10px] font-bold py-1.5 rounded-lg transition-all cursor-pointer text-center text-[var(--color-admin-text-muted)] flex items-center justify-center gap-1">
                      <PencilSimple size={12} /> تعديل
                    </button>
                    <button onClick={() => setDeleteBranchId(branch.id)} className="bg-rose-950/30 hover:bg-rose-950/50 p-1.5 rounded-lg text-rose-500 transition-all cursor-pointer">
                      <TrashSimple size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loyalty Config Card */}
            <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3">
                <Coins size={22} className="text-amber-500" />
                <h2 className="text-sm font-bold">إعدادات برنامج الولاء</h2>
              </div>
              <form onSubmit={handleSaveSettings} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">النقاط لكل جنيه</label>
                  <input type="number" step="0.1" value={settingsForm.points_per_egp}
                    onChange={e => setSettingsForm(p => ({ ...p, points_per_egp: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">الحد الأدنى للشراء (جنيه)</label>
                  <input type="number" step="0.1" value={settingsForm.min_purchase_egp}
                    onChange={e => setSettingsForm(p => ({ ...p, min_purchase_egp: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">صلاحية النقاط (أيام)</label>
                  <input type="number" value={settingsForm.points_expiry_days}
                    onChange={e => setSettingsForm(p => ({ ...p, points_expiry_days: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none" />
                </div>
                <button type="submit" className="bg-[var(--color-admin-primary)] text-white font-bold py-2.5 rounded-xl cursor-pointer hover:opacity-90 transition-all">
                  حفظ الإعدادات
                </button>
              </form>
            </div>

            {/* Branding Card */}
            <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3">
                <Star size={22} className="text-purple-500" />
                <h2 className="text-sm font-bold">العلامة التجارية</h2>
              </div>
              <form onSubmit={handleSaveBranding} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">اسم الكافيه</label>
                  <input type="text" value={settingsForm.name}
                    onChange={e => setSettingsForm(p => ({ ...p, name: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">اللون الأساسي</label>
                  <input type="color" value={settingsForm.primary_color}
                    onChange={e => setSettingsForm(p => ({ ...p, primary_color: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none h-10 cursor-pointer" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">لون التمييز</label>
                  <input type="color" value={settingsForm.accent_color}
                    onChange={e => setSettingsForm(p => ({ ...p, accent_color: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none h-10 cursor-pointer" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">لون الخلفية</label>
                  <input type="color" value={settingsForm.bg_color}
                    onChange={e => setSettingsForm(p => ({ ...p, bg_color: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none h-10 cursor-pointer" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">لون البطاقات</label>
                  <input type="color" value={settingsForm.surface_color}
                    onChange={e => setSettingsForm(p => ({ ...p, surface_color: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none h-10 cursor-pointer" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">خط العناوين</label>
                  <select value={settingsForm.font_display}
                    onChange={e => setSettingsForm(p => ({ ...p, font_display: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
                  >
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Cairo">Cairo</option>
                    <option value="Almarai">Almarai</option>
                    <option value="Noto Kufi Arabic">Noto Kufi Arabic</option>
                    <option value="Tajawal">Tajawal</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">خط النصوص</label>
                  <select value={settingsForm.font_body}
                    onChange={e => setSettingsForm(p => ({ ...p, font_body: e.target.value }))}
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
                  >
                    <option value="Cairo">Cairo</option>
                    <option value="Almarai">Almarai</option>
                    <option value="Noto Kufi Arabic">Noto Kufi Arabic</option>
                    <option value="Tajawal">Tajawal</option>
                    <option value="Playfair Display">Playfair Display</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">رابط الشعار (URL)</label>
                  <input type="url" value={settingsForm.logo_url}
                    onChange={e => setSettingsForm(p => ({ ...p, logo_url: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[var(--color-admin-text-muted)]">الشعار النصي</label>
                  <input type="text" value={settingsForm.tagline}
                    onChange={e => setSettingsForm(p => ({ ...p, tagline: e.target.value }))}
                    placeholder="شعار الكافيه"
                    className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none" />
                </div>
                <button type="submit" className="bg-[var(--color-admin-primary)] text-white font-bold py-2.5 rounded-xl cursor-pointer hover:opacity-90 transition-all">
                  حفظ العلامة التجارية
                </button>
              </form>
            </div>
          </div>
        )}
        </motion.div>
      </AnimatePresence>

      {/* Edit Customer Modal */}
      <Modal isOpen={!!editCustomer} onClose={() => setEditCustomer(null)} title="تعديل بيانات العميل">
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الاسم</label>
            <input type="text" value={editCustomerForm.name}
              onChange={(e) => setEditCustomerForm(p => ({ ...p, name: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none focus:border-[var(--color-admin-primary)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">رقم الهاتف</label>
            <input type="text" value={editCustomerForm.phone}
              onChange={(e) => setEditCustomerForm(p => ({ ...p, phone: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none focus:border-[var(--color-admin-primary)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الفئة</label>
            <select value={editCustomerForm.tier}
              onChange={(e) => setEditCustomerForm(p => ({ ...p, tier: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            >
              <option value="bronze">عادي</option>
              <option value="silver">فضي</option>
              <option value="gold">ذهبي</option>
              <option value="platinum">بلاتيني</option>
            </select>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="cust_verified" checked={editCustomerForm.is_verified}
              onChange={(e) => setEditCustomerForm(p => ({ ...p, is_verified: e.target.checked }))}
              className="rounded border-[var(--color-admin-border)]"
            />
            <label htmlFor="cust_verified" className="text-xs font-bold">حساب نشط</label>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleEditCustomer} className="flex-1 bg-[var(--color-admin-primary)] text-white font-bold py-2.5 rounded-xl cursor-pointer hover:opacity-90 transition-all text-xs">
              حفظ التغييرات
            </button>
            <button onClick={() => setEditCustomer(null)} className="px-4 py-2.5 rounded-xl border border-[var(--color-admin-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-admin-bg)] transition-all">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Customer Modal */}
      <Modal isOpen={!!deleteCustomerId} onClose={() => setDeleteCustomerId(null)} title="تأكيد حذف العميل">
        <div className="flex flex-col gap-4 text-xs">
          <div className="flex items-center gap-2 p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-400">
            <WarningCircle size={18} />
            <span>سيؤدي هذا الإجراء إلى حذف العميل وجميع بياناته بشكل نهائي.</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDeleteCustomer} className="flex-1 bg-rose-600 text-white font-bold py-2.5 rounded-xl cursor-pointer hover:bg-rose-700 transition-all text-xs">
              تأكيد الحذف
            </button>
            <button onClick={() => setDeleteCustomerId(null)} className="px-4 py-2.5 rounded-xl border border-[var(--color-admin-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-admin-bg)] transition-all">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Reward Modal */}
      <Modal isOpen={!!editReward} onClose={() => setEditReward(null)} title="تعديل المكافأة">
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">اسم المكافأة</label>
            <input type="text" value={editRewardForm.title}
              onChange={(e) => setEditRewardForm(p => ({ ...p, title: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none focus:border-[var(--color-admin-primary)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">النقاط المطلوبة</label>
            <input type="number" value={editRewardForm.pointsRequired}
              onChange={(e) => setEditRewardForm(p => ({ ...p, pointsRequired: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none focus:border-[var(--color-admin-primary)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">القسم</label>
            <select value={editRewardForm.category}
              onChange={(e) => setEditRewardForm(p => ({ ...p, category: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            >
              <option value="مشروبات">مشروبات</option>
              <option value="حلويات">حلويات</option>
              <option value="وجبات">وجبات</option>
              <option value="خصومات">خصومات</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الصلاحية (أيام)</label>
            <input type="number" value={editRewardForm.expiryDays}
              onChange={(e) => setEditRewardForm(p => ({ ...p, expiryDays: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الوصف</label>
            <textarea value={editRewardForm.description}
              onChange={(e) => setEditRewardForm(p => ({ ...p, description: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none h-16 resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="reward_active" checked={editRewardForm.is_active}
              onChange={(e) => setEditRewardForm(p => ({ ...p, is_active: e.target.checked }))}
            />
            <label htmlFor="reward_active" className="text-xs font-bold">مكافأة نشطة</label>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={handleEditReward} className="flex-1 bg-[var(--color-admin-primary)] text-white font-bold py-2.5 rounded-xl cursor-pointer hover:opacity-90 transition-all text-xs">
              حفظ التغييرات
            </button>
            <button onClick={() => setEditReward(null)} className="px-4 py-2.5 rounded-xl border border-[var(--color-admin-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-admin-bg)] transition-all">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Reward Modal */}
      <Modal isOpen={!!deleteRewardId} onClose={() => setDeleteRewardId(null)} title="تأكيد حذف المكافأة">
        <div className="flex flex-col gap-4 text-xs">
          <div className="flex items-center gap-2 p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-400">
            <WarningCircle size={18} />
            <span>سيتم حذف المكافأة بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDeleteReward} className="flex-1 bg-rose-600 text-white font-bold py-2.5 rounded-xl cursor-pointer hover:bg-rose-700 transition-all text-xs">
              تأكيد الحذف
            </button>
            <button onClick={() => setDeleteRewardId(null)} className="px-4 py-2.5 rounded-xl border border-[var(--color-admin-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-admin-bg)] transition-all">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Branch Modal */}
      <Modal isOpen={createBranchOpen} onClose={() => setCreateBranchOpen(false)} title="تسجيل فرع جديد">
        <form onSubmit={handleCreateBranch} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">اسم الفرع</label>
            <input type="text" value={newBranch.name}
              onChange={(e) => setNewBranch(p => ({ ...p, name: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none focus:border-[var(--color-admin-primary)]" required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">المدينة</label>
            <input type="text" value={newBranch.city}
              onChange={(e) => setNewBranch(p => ({ ...p, city: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none focus:border-[var(--color-admin-primary)]"
            />
          </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">نظام POS</label>
              <select value={newBranch.posType} onChange={(e) => setNewBranch(p => ({ ...p, posType: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              >
                <option value="Manual">يدوي</option>
                <option value="Foodics">Foodics</option>
                <option value="Other">آخر</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">المنطقة الزمنية</label>
              <select value={newBranch.timezone} onChange={(e) => setNewBranch(p => ({ ...p, timezone: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              >
                <option value="Africa/Cairo">Africa/Cairo (UTC+2)</option>
                <option value="Asia/Riyadh">Asia/Riyadh (UTC+3)</option>
                <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                <option value="Europe/London">Europe/London (UTC+1)</option>
                <option value="America/New_York">America/New_York (UTC-4)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[var(--color-admin-text-muted)]">وقت الفتح</label>
                <input type="time" value={newBranch.openingTime}
                  onChange={(e) => setNewBranch(p => ({ ...p, openingTime: e.target.value }))}
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[var(--color-admin-text-muted)]">وقت الإغلاق</label>
                <input type="time" value={newBranch.closingTime}
                  onChange={(e) => setNewBranch(p => ({ ...p, closingTime: e.target.value }))}
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button type="submit" className="flex-1 bg-[var(--color-admin-primary)] text-white font-bold py-2.5 rounded-xl cursor-pointer hover:opacity-90 transition-all">
                إنشاء الفرع
              </button>
              <button type="button" onClick={() => setCreateBranchOpen(false)} className="px-4 py-2.5 rounded-xl border border-[var(--color-admin-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-admin-bg)] transition-all">
                إلغاء
              </button>
            </div>
          </form>
        </Modal>

      {/* Edit Branch Modal */}
      <Modal isOpen={!!editBranch} onClose={() => setEditBranch(null)} title="تعديل الفرع">
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">اسم الفرع</label>
            <input type="text" value={editBranchForm.name}
              onChange={(e) => setEditBranchForm(p => ({ ...p, name: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none focus:border-[var(--color-admin-primary)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">المدينة</label>
            <input type="text" value={editBranchForm.city}
              onChange={(e) => setEditBranchForm(p => ({ ...p, city: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">نظام POS</label>
            <select value={editBranchForm.posType} onChange={(e) => setEditBranchForm(p => ({ ...p, posType: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            >
              <option value="Manual">يدوي</option>
              <option value="Foodics">Foodics</option>
              <option value="Other">آخر</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">المنطقة الزمنية</label>
            <select value={editBranchForm.timezone} onChange={(e) => setEditBranchForm(p => ({ ...p, timezone: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            >
              <option value="Africa/Cairo">Africa/Cairo (UTC+2)</option>
              <option value="Asia/Riyadh">Asia/Riyadh (UTC+3)</option>
              <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
              <option value="Europe/London">Europe/London (UTC+1)</option>
              <option value="America/New_York">America/New_York (UTC-4)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">وقت الفتح</label>
              <input type="time" value={editBranchForm.openingTime}
                onChange={(e) => setEditBranchForm(p => ({ ...p, openingTime: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">وقت الإغلاق</label>
              <input type="time" value={editBranchForm.closingTime}
                onChange={(e) => setEditBranchForm(p => ({ ...p, closingTime: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="branch_active" checked={editBranchForm.is_active}
              onChange={(e) => setEditBranchForm(p => ({ ...p, is_active: e.target.checked }))}
            />
            <label htmlFor="branch_active" className="text-xs font-bold">فرع نشط</label>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={handleEditBranch} className="flex-1 bg-[var(--color-admin-primary)] text-white font-bold py-2.5 rounded-xl cursor-pointer hover:opacity-90 transition-all text-xs">
              حفظ التغييرات
            </button>
            <button onClick={() => setEditBranch(null)} className="px-4 py-2.5 rounded-xl border border-[var(--color-admin-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-admin-bg)] transition-all">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Branch Modal */}
      <Modal isOpen={!!deleteBranchId} onClose={() => setDeleteBranchId(null)} title="تأكيد حذف الفرع">
        <div className="flex flex-col gap-4 text-xs">
          <div className="flex items-center gap-2 p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-400">
            <WarningCircle size={18} />
            <span>سيتم حذف الفرع وجميع إعداداته. هذا الإجراء نهائي.</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDeleteBranch} className="flex-1 bg-rose-600 text-white font-bold py-2.5 rounded-xl cursor-pointer hover:bg-rose-700 transition-all text-xs">
              تأكيد الحذف
            </button>
            <button onClick={() => setDeleteBranchId(null)} className="px-4 py-2.5 rounded-xl border border-[var(--color-admin-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-admin-bg)] transition-all">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
