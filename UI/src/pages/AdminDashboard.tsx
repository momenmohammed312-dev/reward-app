import React, { useState, useEffect } from 'react';
import { 
  TrendUp, 
  Users, 
  Gift, 
  Coins, 
  Plus, 
  CheckCircle, 
  Sliders, 
  Storefront, 
  UserPlus, 
  ArrowClockwise,
  UserGear
} from '@phosphor-icons/react';
import { useApp } from '../store/AppContext';
import { api } from '../services/api';
import { AnimatePresence, motion } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const { currentTenant, rewards } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'customers' | 'rewards' | 'branches'>('overview');
  const [pointsAmount, setPointsAmount] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [adjustmentNote, setAdjustmentNote] = useState<string>('مكافأة يدوية من الإدارة');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showCreateRewardForm, setShowCreateRewardForm] = useState(false);
  const [newReward, setNewReward] = useState({
    title: '',
    description: '',
    pointsRequired: '',
    category: 'مشروبات',
    expiryDays: '30',
  });
  const [isCreatingReward, setIsCreatingReward] = useState(false);

  // Admin states (loaded from API with mock fallback)
  const mockAdminStats = {
    totalCustomers: 1240,
    activeLoyalists: 843,
    pointsIssuedThisMonth: 45200,
    redemptionsToday: 18,
    conversionRate: '87.4%'
  };
  const [adminStats, setAdminStats] = useState(mockAdminStats);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const [customers, branchesData, stats] = await Promise.all([
          api.getAdminCustomers(),
          api.getAdminBranches(),
          api.getAdminStats(),
        ]);
        setCafeCustomers(customers.map((c: any) => ({
          id: c.id,
          name: c.name || 'عميل',
          phone: c.phone,
          balance: c.balance || 0,
          totalEarned: c.total_earned || 0,
          tier: c.tier || 'bronze',
          joinDate: c.created_at?.split('T')[0] || '',
        })));
        setBranches(branchesData.map((b: any) => ({
          id: b.id,
          name: b.name,
          location: b.pos_location_id || 'القاهرة',
          posType: b.pos_type,
          active: b.is_active,
          key: b.api_key ? `api_key_****_${b.api_key.substring(0, 4)}` : 'N/A'
        })));
        setAdminStats({
          totalCustomers: Number(stats.totalCustomers || 0),
          activeLoyalists: Number(stats.totalCustomers || 0),
          pointsIssuedThisMonth: Number(stats.totalPointsIssued || 0),
          redemptionsToday: Number(stats.totalRedemptions || 0),
          conversionRate: '87.4%',
        });
      } catch (err) {
        console.warn('Admin API not reachable, using mock data');
      } finally {
        setStatsLoading(false);
      }
    };
    loadAdminData();
  }, []);

  const [cafeCustomers, setCafeCustomers] = useState([
    { id: 'c1', name: 'أحمد محمود', phone: '+201000000001', tier: 'الذهبي', balance: 1450, totalEarned: 3500, status: 'نشط' },
    { id: 'c2', name: 'سارة علي', phone: '+201200000002', tier: 'البلاتيني', balance: 5200, totalEarned: 8900, status: 'نشط' },
    { id: 'c3', name: 'مصطفى كامل', phone: '+201500000003', tier: 'الفضي', balance: 320, totalEarned: 950, status: 'نشط' },
    { id: 'c4', name: 'منى أحمد', phone: '+201100000004', tier: 'العادي', balance: 90, totalEarned: 340, status: 'معلق' },
    { id: 'c5', name: 'كريم حسن', phone: '+201000000005', tier: 'الذهبي', balance: 2100, totalEarned: 4800, status: 'نشط' }
  ]);

  const [branches, setBranches] = useState([
    { id: 'b1', name: 'فرع وسط البلد', location: 'القاهرة', posType: 'Foodics', active: true, key: 'api_key_****_balad' },
    { id: 'b2', name: 'فرع مصر الجديدة', location: 'القاهرة', posType: 'Foodics', active: true, key: 'api_key_****_heliopolis' },
    { id: 'b3', name: 'فرع سموحة', location: 'الإسكندرية', posType: 'Manual', active: false, key: 'api_key_****_alex' }
  ]);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReward.title || !newReward.pointsRequired) return;
    setIsCreatingReward(true);
    try {
      await api.createReward({
        title: newReward.title,
        description: newReward.description,
        points_required: Number(newReward.pointsRequired),
        category: newReward.category,
        expiry_days: Number(newReward.expiryDays)
      });
      setMessage({ text: `تم إنشاء مكافأة "${newReward.title}" بنجاح!`, type: 'success' });
      setNewReward({ title: '', description: '', pointsRequired: '', category: 'مشروبات', expiryDays: '30' });
      setShowCreateRewardForm(false);
    } catch {
      setMessage({ text: `تم إنشاء المكافأة "${newReward.title}" (وضع العرض)`, type: 'success' });
      setShowCreateRewardForm(false);
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
      await api.adminEarnPoints({
        customer_id: selectedCustomerId,
        amount: Number(pointsAmount),
        note: adjustmentNote || 'تعديل يدوي من الإدارة',
      });

      setCafeCustomers(prev =>
        prev.map(c => {
          if (c.id === selectedCustomerId) {
            const newBalance = c.balance + Number(pointsAmount);
            return { ...c, balance: newBalance, totalEarned: c.totalEarned + Number(pointsAmount) };
          }
          return c;
        })
      );

      setMessage({ text: `تمت إضافة ${pointsAmount} نقطة بنجاح!`, type: 'success' });
      setPointsAmount('');
      setSelectedCustomerId('');
      setAdjustmentNote('');
    } catch (err: any) {
      setMessage({ text: err.message || 'فشلت العملية، يرجى المحاولة لاحقاً', type: 'error' });
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  return (
    <div className="w-full text-slate-100 flex flex-col gap-6" style={{ direction: 'rtl' }}>
      {/* Title bar */}
      <div className="flex items-center justify-between bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <UserGear size={32} className="text-[var(--color-primary)] animate-pulse" />
          <div>
            <h1 className="text-xl font-black">لوحة تحكم الكافيه (Admin Dashboard)</h1>
            <p className="text-xs text-slate-400">العلامة التجارية الحالية: {currentTenant.name}</p>
            <p className="text-[9px] tracking-widest uppercase text-slate-500 opacity-60 mt-1">
              Powered by MO2 CAPITAL
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="text-[11px] font-bold text-emerald-400">متصل بنظام Foodics API</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button 
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${activeSubTab === 'overview' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          نظرة عامة
        </button>
        <button 
          onClick={() => setActiveSubTab('customers')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${activeSubTab === 'customers' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          العملاء والولاء
        </button>
        <button 
          onClick={() => setActiveSubTab('rewards')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${activeSubTab === 'rewards' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          المكافآت والعروض
        </button>
        <button 
          onClick={() => setActiveSubTab('branches')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${activeSubTab === 'branches' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          الفروع والـ POS
        </button>
      </div>

      {/* Content Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="min-h-[400px]"
        >
        {activeSubTab === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* KPI Cards */}
            <motion.div
              variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {statsLoading ? (
                <>
                  {[1,2,3,4].map(i => (
                    <div key={i} className="bg-slate-800/40 border border-slate-700/40 p-5 rounded-2xl flex flex-col gap-2 animate-pulse">
                      <div className="h-3 w-20 bg-slate-700 rounded" />
                      <div className="h-8 w-16 bg-slate-700 rounded mt-1" />
                      <div className="h-3 w-24 bg-slate-700 rounded" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <motion.div
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 20 } } }}
                    className="bg-slate-800/40 border border-slate-700/40 p-5 rounded-2xl flex flex-col gap-1.5 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                      <span>إجمالي المشتركين</span>
                      <Users size={20} className="text-cyan-400" />
                    </div>
                    <span className="text-2xl font-black text-slate-100">{adminStats.totalCustomers}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">+12% من الأسبوع الماضي</span>
                  </motion.div>

                  <motion.div
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 20 } } }}
                    className="bg-slate-800/40 border border-slate-700/40 p-5 rounded-2xl flex flex-col gap-1.5 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                      <span>النشطين حالياً</span>
                      <Sliders size={20} className="text-indigo-400" />
                    </div>
                    <span className="text-2xl font-black text-slate-100">{adminStats.activeLoyalists}</span>
                    <span className="text-[10px] text-slate-400">زيارة واحدة على الأقل شهرياً</span>
                  </motion.div>

                  <motion.div
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 20 } } }}
                    className="bg-slate-800/40 border border-slate-700/40 p-5 rounded-2xl flex flex-col gap-1.5 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                      <span>النقاط المصدرة</span>
                      <Coins size={20} className="text-amber-400" />
                    </div>
                    <span className="text-2xl font-black text-slate-100">{adminStats.pointsIssuedThisMonth.toLocaleString()}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">+18.5% هذا الشهر</span>
                  </motion.div>

                  <motion.div
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 20 } } }}
                    className="bg-slate-800/40 border border-slate-700/40 p-5 rounded-2xl flex flex-col gap-1.5 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                      <span>عمليات الاسترداد (اليوم)</span>
                      <Gift size={20} className="text-rose-400" />
                    </div>
                    <span className="text-2xl font-black text-slate-100">{adminStats.redemptionsToday}</span>
                    <span className="text-[10px] text-rose-400 font-semibold">-2 عملية عن أمس</span>
                  </motion.div>
                </>
              )}
            </motion.div>

            {/* Quick manual adjust & Live activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Point Adjustment Box */}
              <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
                  <Coins size={22} className="text-amber-400" />
                  <h2 className="text-sm font-bold">تعديل وإضافة النقاط يدوياً للعملاء</h2>
                </div>

                <form onSubmit={handleAdjustPoints} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-400 font-bold">اختر العميل</label>
                    <select 
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="">-- اختر من القائمة --</option>
                      {cafeCustomers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone}) - رصيد: {c.balance}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-bold">النقاط المراد إضافتها</label>
                      <input 
                        type="number" 
                        placeholder="مثال: 100"
                        value={pointsAmount}
                        onChange={(e) => setPointsAmount(e.target.value)}
                        className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-bold">السبب / الملاحظة</label>
                      <input 
                        type="text" 
                        placeholder="بونص كاشير، هدايا..."
                        value={adjustmentNote}
                        onChange={(e) => setAdjustmentNote(e.target.value)}
                        className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAdjustment}
                    className="w-full bg-[var(--color-primary)] text-white text-xs font-bold py-3 rounded-xl hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isSubmittingAdjustment ? (
                      <ArrowClockwise className="animate-spin" size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    تأكيد منح النقاط
                  </button>

                  {message && (
                    <div className={`p-3 rounded-xl text-xs font-bold text-center mt-2 ${message.type === 'success' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800' : 'bg-rose-950/50 text-rose-400 border border-rose-800'}`}>
                      {message.text}
                    </div>
                  )}
                </form>
              </div>

              {/* Webhook logs stream */}
              <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendUp size={22} className="text-cyan-400" />
                    <h2 className="text-sm font-bold">آخر عمليات نقاط الـ POS</h2>
                  </div>
                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono">Real-time Stream</span>
                </div>

                <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1">
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-850">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">طلب ناجح #INV-9201</span>
                      <span className="text-[9px] text-slate-400">فرع مصر الجديدة | Foodics API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400">+150 نقطة</span>
                      <CheckCircle size={16} className="text-emerald-400" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-850">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">طلب ناجح #INV-9192</span>
                      <span className="text-[9px] text-slate-400">فرع وسط البلد | Foodics API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400">+45 نقطة</span>
                      <CheckCircle size={16} className="text-emerald-400" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-850">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">استرداد مكافأة #RDM-8822</span>
                      <span className="text-[9px] text-slate-400">فرع سموحة | تطبيق العميل</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400">-80 نقطة</span>
                      <CheckCircle size={16} className="text-amber-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'customers' && (
          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-sm font-bold">قاعدة بيانات العملاء المسجلين</h2>
              <button className="bg-[var(--color-primary)] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer">
                <UserPlus size={16} />
                إضافة عميل يدوي
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/40 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-700">
                  <tr>
                    <th className="p-4">الاسم</th>
                    <th className="p-4">الهاتف</th>
                    <th className="p-4">الفئة</th>
                    <th className="p-4">الرصيد الحالي</th>
                    <th className="p-4">إجمالي النقاط المكتسبة</th>
                    <th className="p-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 text-slate-200">
                  {cafeCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-750/30 transition-all">
                      <td className="p-4 font-bold">{customer.name}</td>
                      <td className="p-4 font-mono">{customer.phone}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          customer.tier === 'البلاتيني' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                          customer.tier === 'الذهبي' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          customer.tier === 'الفضي' ? 'bg-slate-950 text-slate-300 border border-slate-850' :
                          'bg-orange-950 text-orange-300 border border-orange-800'
                        }`}>
                          {customer.tier}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-amber-400">{customer.balance}</td>
                      <td className="p-4 text-slate-400">{customer.totalEarned}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${customer.status === 'نشط' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                          {customer.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'rewards' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reward list */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
                <h2 className="text-sm font-bold border-b border-slate-700 pb-3 mb-4">المكافآت النشطة حالياً في الكافيه</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rewards.map((reward) => (
                    <div key={reward.id} className="bg-slate-900 border border-slate-750 p-4 rounded-xl flex gap-3 relative overflow-hidden">
                      <img 
                        src={reward.imageUrl} 
                        alt={reward.title} 
                        className="w-16 h-16 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                      <div className="flex flex-col gap-1 text-right">
                        <span className="text-xs font-bold text-slate-200">{reward.title}</span>
                        <span className="text-[10px] text-slate-400 line-clamp-2 leading-normal">{reward.description}</span>
                        <span className="text-[10px] font-black text-amber-400 mt-1">{reward.pointsRequired} نقطة مطلوبين</span>
                      </div>
                      <span className="absolute top-2 left-2 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-bold">نشط</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Create Reward Box */}
            <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
                <Plus size={22} className="text-emerald-400" />
                <h2 className="text-sm font-bold">إضافة مكافأة جديدة</h2>
              </div>

              <form onSubmit={handleCreateReward} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">اسم المكافأة</label>
                  <input 
                    type="text" 
                    placeholder="مثال: فلات وايت مجاني" 
                    value={newReward.title}
                    onChange={(e) => setNewReward(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-slate-200 outline-none" 
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">النقاط المطلوبة للاسترداد</label>
                  <input 
                    type="number" 
                    placeholder="100" 
                    value={newReward.pointsRequired}
                    onChange={(e) => setNewReward(prev => ({ ...prev, pointsRequired: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-slate-200 outline-none" 
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">القسم</label>
                  <select 
                    value={newReward.category}
                    onChange={(e) => setNewReward(prev => ({ ...prev, category: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-slate-200 outline-none"
                  >
                    <option value="مشروبات">مشروبات</option>
                    <option value="حلويات">حلويات</option>
                    <option value="وجبات">وجبات</option>
                    <option value="خصومات">خصومات</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">صلاحية الكوبون (بالأيام)</label>
                  <input 
                    type="number" 
                    placeholder="30" 
                    value={newReward.expiryDays}
                    onChange={(e) => setNewReward(prev => ({ ...prev, expiryDays: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-slate-200 outline-none" 
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">الوصف والشروط</label>
                  <textarea 
                    placeholder="شروط الحصول على المكافأة..." 
                    value={newReward.description}
                    onChange={(e) => setNewReward(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-slate-200 outline-none h-20 resize-none" 
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isCreatingReward}
                  className="w-full bg-[var(--color-primary)] text-white font-bold py-3 rounded-xl hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isCreatingReward ? <ArrowClockwise className="animate-spin" size={16} /> : 'إنشاء المكافأة وتعميمها'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeSubTab === 'branches' && (
          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-6">
              <div className="flex items-center gap-2">
                <Storefront size={22} className="text-[var(--color-primary)]" />
                <h2 className="text-sm font-bold">إدارة الفروع وربط الـ POS</h2>
              </div>
              <button className="bg-slate-900 border border-slate-750 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer">
                تسجيل فرع جديد
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {branches.map(branch => (
                <div key={branch.id} className="bg-slate-900 border border-slate-750 p-5 rounded-2xl flex flex-col gap-3 relative">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-200">{branch.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${branch.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'}`}>
                      {branch.active ? 'نشط' : 'معطل'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                    <span>الموقع: {branch.location}</span>
                    <span>نوع النظام: {branch.posType}</span>
                    <span className="font-mono text-slate-500">{branch.key}</span>
                  </div>

                  <div className="flex gap-2 mt-2 pt-3 border-t border-slate-800">
                    <button className="flex-1 bg-slate-800 hover:bg-slate-750 text-[10px] font-bold py-1.5 rounded-lg transition-all cursor-pointer text-center text-slate-300">
                      تعديل الربط
                    </button>
                    <button className="bg-slate-850 hover:bg-slate-800 p-1.5 rounded-lg text-slate-400 cursor-pointer">
                      <Sliders size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
