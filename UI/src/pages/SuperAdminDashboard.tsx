import React, { useState } from 'react';
import { 
  Building, 
  CreditCard, 
  Pulse, 
  TerminalWindow, 
  ArrowClockwise, 
  CheckCircle, 
  Gear, 
  Coins 
} from '@phosphor-icons/react';

const statusConfig: Record<string, { label: string; bg: string }> = {
  active:   { label: 'نشط',      bg: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700' },
  past_due: { label: 'متأخر',    bg: 'bg-amber-900/50 text-amber-400 border border-amber-700' },
  canceled: { label: 'ملغي',     bg: 'bg-red-900/50 text-red-400 border border-red-700' },
  trialing: { label: 'تجريبي',   bg: 'bg-blue-900/50 text-blue-400 border border-blue-700' },
};

const webhookStatusConfig: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  success: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-950/50 border border-emerald-800/40', label: 'تمت بنجاح' },
  failed:  { dot: 'bg-red-400',     text: 'text-red-400',     bg: 'bg-red-950/50 border border-red-800/40',       label: 'فشلت' },
  pending: { dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-950/50 border border-amber-800/40',   label: 'معلق' },
};

export const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'subscriptions' | 'logs'>('tenants');

  // Mock SaaS Global Stats
  const globalStats = {
    totalTenants: 48,
    activeSubscriptions: 42,
    mrrEgp: 68500,
    apiRequestsToday: 142300,
    systemUptime: '99.98%'
  };

  const [tenants, setTenants] = useState([
    { id: 't1', name: 'أروما كافيه', slug: 'aroma', plan: 'Starter', status: 'active', monthlyFee: 1200, joinedDate: '٢٠٢٥/٠١/١٠' },
    { id: 't2', name: 'برو أند كو', slug: 'brew-co', plan: 'Premium', status: 'active', monthlyFee: 2500, joinedDate: '٢٠٢٥/٠٢/١٢' },
    { id: 't3', name: 'حلويات الياسمين', slug: 'yasmeen', plan: 'Enterprise', status: 'active', monthlyFee: 6000, joinedDate: '٢٠٢٥/٠٣/٠1' },
    { id: 't4', name: 'سينابون زون', slug: 'cinnabon-zone', plan: 'Starter', status: 'past_due', monthlyFee: 1200, joinedDate: '٢٠٢٥/٠٤/١٥' },
    { id: 't5', name: 'كافيين هاب', slug: 'caffeine-hub', plan: 'Premium', status: 'canceled', monthlyFee: 2500, joinedDate: '٢٠٢٥/٠١/٠٥' }
  ]);

  const [webhooks, setWebhooks] = useState([
    { id: 'w1', tenant: 'أروما كافيه', event: 'order.paid', status: 'success', time: '13:54:12', message: 'Points processed successfully (+150 pts)' },
    { id: 'w2', tenant: 'حلويات الياسمين', event: 'order.closed', status: 'success', time: '13:52:05', message: 'Points processed successfully (+320 pts)' },
    { id: 'w3', tenant: 'برو أند كو', event: 'order.paid', status: 'failed', time: '13:50:00', message: 'Customer not registered under tenant. Phone created.' },
    { id: 'w4', tenant: 'سينابون زون', event: 'order.paid', status: 'success', time: '13:45:10', message: 'Points processed successfully (+90 pts)' },
    { id: 'w5', tenant: 'أروما كافيه', event: 'customer.created', status: 'success', time: '13:40:22', message: 'New customer account created' }
  ]);

  const handleToggleTenantStatus = (tenantId: string) => {
    setTenants(prev => prev.map(t => {
      if (t.id === tenantId) {
        const nextStatus = t.status === 'active' ? 'past_due' : 'active';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  return (
    <div className="w-full text-slate-100 flex flex-col gap-6" style={{ direction: 'rtl' }}>
      {/* Title bar */}
      <div className="flex items-center justify-between bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Gear size={32} className="text-amber-500 animate-spin-slow" />
          <div>
            <h1 className="text-xl font-black">لوحة التحكم الفائقة (Super Admin)</h1>
            <p className="text-xs text-slate-400">إدارة البنية التحتية، الفواتير، ومراقبة الكافيهات المشتركة</p>
            <p className="text-[9px] tracking-widest uppercase text-slate-500 opacity-60 mt-1">
              MO2 CAPITAL — Platform Infrastructure
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="text-[11px] font-bold text-emerald-400">جميع الخدمات تعمل بكفاءة 100%</span>
        </div>
      </div>

      {/* SaaS Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800/40 border border-slate-700/40 p-5 rounded-2xl flex flex-col gap-1">
          <span className="text-slate-400 text-xs font-bold flex justify-between items-center">
            إجمالي المشتركين
            <Building size={16} className="text-cyan-400" />
          </span>
          <span className="text-xl font-black text-slate-100">{globalStats.totalTenants}</span>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/40 p-5 rounded-2xl flex flex-col gap-1">
          <span className="text-slate-400 text-xs font-bold flex justify-between items-center">
            الاشتراكات النشطة
            <CreditCard size={16} className="text-indigo-400" />
          </span>
          <span className="text-xl font-black text-slate-100">{globalStats.activeSubscriptions}</span>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/40 p-5 rounded-2xl flex flex-col gap-1">
          <span className="text-slate-400 text-xs font-bold flex justify-between items-center">
            الدخل الشهري (MRR)
            <Coins size={16} className="text-emerald-400" />
          </span>
          <span className="text-xl font-black text-slate-100">{globalStats.mrrEgp.toLocaleString()} EGP</span>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/40 p-5 rounded-2xl flex flex-col gap-1">
          <span className="text-slate-400 text-xs font-bold flex justify-between items-center">
            طلبات الـ API اليوم
            <Pulse size={16} className="text-amber-400" />
          </span>
          <span className="text-xl font-black text-slate-100">{globalStats.apiRequestsToday.toLocaleString()}</span>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/40 p-5 rounded-2xl flex flex-col gap-1">
          <span className="text-slate-400 text-xs font-bold flex justify-between items-center">
            استقرار النظام
            <CheckCircle size={16} className="text-rose-400" />
          </span>
          <span className="text-xl font-black text-slate-100">{globalStats.systemUptime}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button 
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${activeTab === 'tenants' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          الكافيهات المشتركة
        </button>
        <button 
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${activeTab === 'subscriptions' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          خطط الأسعار
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${activeTab === 'logs' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          شاشة مراقبة الـ Webhooks
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'tenants' && (
          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-sm font-bold">كل العلامات التجارية (Tenants)</h2>
              <button className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-amber-500">
                تسجيل كافيه جديد بالنظام
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/40 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-700">
                  <tr>
                    <th className="p-4">اسم الكافيه</th>
                    <th className="p-4">Slug المسار</th>
                    <th className="p-4">الباقة</th>
                    <th className="p-4">القيمة الشهرية</th>
                    <th className="p-4">تاريخ الانضمام</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 text-slate-200">
                  {tenants.map(t => {
                    const statusVal = statusConfig[t.status] || { label: t.status, bg: 'bg-slate-900 text-slate-400 border border-slate-700' };
                    return (
                      <tr key={t.id} className="hover:bg-slate-750/30 transition-all">
                        <td className="p-4 font-bold">{t.name}</td>
                        <td className="p-4 font-mono text-slate-400">/{t.slug}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.plan === 'Enterprise' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                            t.plan === 'Premium' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                            'bg-slate-950 text-slate-300 border border-slate-850'
                          }`}>
                            {t.plan}
                          </span>
                        </td>
                        <td className="p-4 font-bold">{t.monthlyFee} EGP</td>
                        <td className="p-4 text-slate-400">{t.joinedDate}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusVal.bg}`}>
                            {statusVal.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => handleToggleTenantStatus(t.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-[10px] font-bold py-1 px-2.5 rounded border border-slate-750 cursor-pointer"
                          >
                            تعديل الحالة
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/60 border border-slate-700/50 p-6 rounded-2xl flex flex-col gap-4 relative">
              <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold self-start">الباقة الأساسية</span>
              <h3 className="text-lg font-black text-slate-100">Starter Plan</h3>
              <p className="text-xs text-slate-400">مناسبة للكافيهات الصغيرة وعربات القهوة المبتدئة.</p>
              <div className="text-2xl font-black text-slate-100 my-2">1,200 EGP <span className="text-xs text-slate-400">/ شهرياً</span></div>
              <ul className="text-xs text-slate-300 flex flex-col gap-2 border-t border-slate-700/60 pt-4">
                <li>• حتى 1000 عميل نشط</li>
                <li>• فرع واحد فقط</li>
                <li>• ربط POS كامل (Foodics)</li>
                <li>• دعم فني عبر البريد الإلكتروني</li>
              </ul>
            </div>

            <div className="bg-slate-800/60 border border-indigo-500/50 p-6 rounded-2xl flex flex-col gap-4 relative">
              <span className="text-[10px] bg-indigo-950 border border-indigo-900 text-indigo-400 px-2 py-0.5 rounded font-bold self-start">الأكثر شيوعاً</span>
              <h3 className="text-lg font-black text-slate-100">Premium Plan</h3>
              <p className="text-xs text-slate-400">مثالية للكافيهات والمطاعم ذات الفروع المتعددة.</p>
              <div className="text-2xl font-black text-slate-100 my-2">2,500 EGP <span className="text-xs text-slate-400">/ شهرياً</span></div>
              <ul className="text-xs text-slate-300 flex flex-col gap-2 border-t border-slate-700/60 pt-4">
                <li>• عملاء بلا حدود</li>
                <li>• حتى 5 فروع مختلفة</li>
                <li>• إمكانية تغيير ثيم وألوان الـ PWA للعملاء</li>
                <li>• إحصائيات متقدمة للحملات</li>
              </ul>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 p-6 rounded-2xl flex flex-col gap-4 relative">
              <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold self-start">للشركات الكبرى</span>
              <h3 className="text-lg font-black text-slate-100">Enterprise Plan</h3>
              <p className="text-xs text-slate-400">للسلاسل الكبرى والعلامات التجارية التي تحتاج نطاقاً خاصاً.</p>
              <div className="text-2xl font-black text-slate-100 my-2">6,000 EGP <span className="text-xs text-slate-400">/ شهرياً</span></div>
              <ul className="text-xs text-slate-300 flex flex-col gap-2 border-t border-slate-700/60 pt-4">
                <li>• فروع وعملاء بلا حدود</li>
                <li>• دومين مخصص للعلامة التجارية</li>
                <li>• أولوية قصوى للدعم الفني والتكامل الفوري</li>
                <li>• خادم مستقل لضمان أقصى سرعة</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <TerminalWindow size={24} className="text-indigo-400" />
                <h2 className="text-sm font-bold">بوابة مراقبة الـ Webhooks الموحدة</h2>
              </div>
              <button className="bg-slate-950 hover:bg-slate-900 border border-slate-850 p-1.5 rounded-lg text-slate-400 cursor-pointer">
                <ArrowClockwise size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {webhooks.map((log) => {
                const whStatus = webhookStatusConfig[log.status] || { dot: 'bg-slate-400', text: 'text-slate-400', bg: 'bg-slate-950/50 border border-slate-800/40', label: log.status };
                return (
                  <div key={log.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-200">{log.tenant}</span>
                        <span className="text-[10px] bg-slate-800 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold">{log.event}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{log.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">{log.message}</span>
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1.5 ${whStatus.bg} ${whStatus.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${whStatus.dot}`} />
                        <span>{whStatus.label}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
