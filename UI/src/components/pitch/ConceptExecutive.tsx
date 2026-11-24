import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle,
  QrCode,
  DeviceMobile,
  Storefront,
  TrendUp,
  Printer,
} from '@phosphor-icons/react';
import {
  PitchLang,
  PhoneDemoTab,
  COMPARISON_ROWS,
  OPERATIONS_EXPLAINED,
  PRICING_TIERS,
} from './pitchData';
import { InteractivePhoneDemo } from './InteractivePhoneDemo';
import { AdminCashierPreview } from './AdminCashierPreview';
import { RoiCalculator } from './RoiCalculator';

interface ConceptExecutiveProps {
  lang: PitchLang;
  brandName: string;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export const ConceptExecutive: React.FC<ConceptExecutiveProps> = ({ lang, brandName }) => {
  const [phoneTab, setPhoneTab] = useState<PhoneDemoTab>('pass');
  const [explorerTab, setExplorerTab] = useState<'customer' | 'admin' | 'cashier'>('customer');
  const isEn = lang === 'en';
  const ops = OPERATIONS_EXPLAINED.foodicsVsCashier[lang];

  return (
    <div className="bg-[#F4F6FA] text-[#0F172A] overflow-x-clip">
      {/* ASYMMETRIC EXECUTIVE HERO (Madar / Stripe Light Style) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
            className="lg:col-span-6"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FF] border border-[#4F46E5]/25 text-[#4F46E5] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              {isEn ? `SaaS Loyalty Platform · ${brandName}` : `منصة ولاء متكاملة · ${brandName}`}
            </span>

            <h1 className="text-3xl sm:text-5xl font-bold mt-4 leading-[1.15] tracking-tight">
              {isEn
                ? 'Turn every first cup into a repeat weekly habit.'
                : 'حوّل كل زيارة أولى إلى عميل دائم يرجع كل أسبوع.'}
            </h1>

            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              {isEn
                ? 'Customer browser wallet, automated Foodics webhook points, 5-second cashier redemption, and live retention analytics — launched on day one.'
                : 'محفظة عملاء تعمل من المتصفح فوراً، ربط أوتوماتيك مع Foodics أو شاشة كاشير فورية، وتحليلات احتفاظ حية لصاحب الكافيه.'}
            </p>

            {/* Quick KPI Pills */}
            <div className="grid grid-cols-3 gap-3 mt-7">
              <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm">
                <div className="font-mono text-xl font-bold text-[#4F46E5]" dir="ltr">8s</div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {isEn ? 'QR Onboarding' : 'دخول بمسح QR'}
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm">
                <div className="font-mono text-xl font-bold text-[#059669]" dir="ltr">0 EGP</div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {isEn ? '14-Day Pilot' : 'تجربة 14 يوم'}
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm">
                <div className="font-mono text-xl font-bold text-[#0F172A]" dir="ltr">100%</div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {isEn ? 'AR & EN RTL/LTR' : 'عربي وإنجليزي'}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="lg:col-span-6 flex justify-center">
            <InteractivePhoneDemo
              lang={lang}
              brandName={brandName}
              activeTab={phoneTab}
              onTabChange={setPhoneTab}
            />
          </div>
        </div>
      </section>

      {/* ANIMATED DATA FLOW ARCHITECTURE DIAGRAM */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-[0_14px_34px_-16px_rgba(15,23,42,0.1)]">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">
              {isEn ? 'How All 3 Screens Work Together' : 'كيف تتصل الشاشات معاً داخل الكافيه؟'}
            </span>
            <h2 className="text-2xl font-bold mt-1">
              {isEn ? 'Live Point & Redemption Architecture' : 'مسار النقاط والمكافآت من الترابيزة حتى الكاشير'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                icon: QrCode,
                step: '01',
                title: isEn ? 'Table QR Standee' : 'كارت QR على الطاولة',
                desc: isEn
                  ? 'Guest opens branded URL (?tenant=...) and verifies phone OTP once.'
                  : 'العميل يمسح الكود ويسجّل برقمه في ثوانٍ بدون تحميل أي تطبيق.',
                color: 'text-[#4F46E5] bg-[#EEF2FF]',
              },
              {
                icon: DeviceMobile,
                step: '02',
                title: isEn ? '3D Member Pass' : 'كود بطاقة العضوية',
                desc: isEn
                  ? 'Customer flips card at till; cashier scans QR or Foodics logs phone.'
                  : 'العميل يعرض QR ظهر البطاقة للكاشير (أو يعطيه رقمه) لتنزل النقاط.',
                color: 'text-[#059669] bg-[#ECFDF5]',
              },
              {
                icon: Storefront,
                step: '03',
                title: isEn ? 'Foodics / Cashier' : 'Foodics أو الكاشير',
                desc: isEn
                  ? 'Foodics awards points automatically; Cashier verifies reward codes in 5s.'
                  : 'Foodics يضيف النقاط تلقائياً، والكاشير يعتمد تذكرة الهدية لمنع التكرار.',
                color: 'text-amber-600 bg-amber-50',
              },
              {
                icon: TrendUp,
                step: '04',
                title: isEn ? 'Admin Analytics' : 'لوحة المالك (/admin)',
                desc: isEn
                  ? 'Track repeat visits, peak hours, and manage rewards & optional photos.'
                  : 'تراقب معدل العودة وساعات الذروة وتدير المكافآت وصورها.',
                color: 'text-slate-800 bg-slate-100',
              },
            ].map((box) => {
              const Icon = box.icon;
              return (
                <div key={box.step} className="rounded-2xl bg-[#F4F6FA] border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${box.color}`}>
                      <Icon size={18} weight="duotone" />
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-400">{box.step}</span>
                  </div>
                  <h3 className="text-sm font-bold">{box.title}</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{box.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* INTERACTIVE SCREEN EXPLORER (CUSTOMER VS ADMIN VS CASHIER) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">{ops.headline}</h2>
          </div>
          <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-xs">
            {[
              { id: 'customer' as const, label: isEn ? 'Customer App' : 'تطبيق العميل' },
              { id: 'admin' as const, label: isEn ? 'Merchant Admin' : 'لوحة التاجر' },
              { id: 'cashier' as const, label: isEn ? 'Cashier & POS' : 'الكاشير و Foodics' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setExplorerTab(t.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  explorerTab === t.id ? 'bg-[#4F46E5] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {explorerTab === 'customer' ? (
          <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <InteractivePhoneDemo
                lang={lang}
                brandName={brandName}
                activeTab={phoneTab}
                onTabChange={setPhoneTab}
              />
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['pass', 'menu', 'ticket', 'history'] as const).map((tabId, idx) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setPhoneTab(tabId)}
                  className={`text-start rounded-2xl border p-4 cursor-pointer transition-all ${
                    phoneTab === tabId
                      ? 'bg-[#EEF2FF] border-[#4F46E5]'
                      : 'bg-[#F4F6FA] border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-[#4F46E5]">0{idx + 1}</span>
                  <div className="font-bold text-sm mt-1">
                    {tabId === 'pass'
                      ? isEn
                        ? '3D Member Pass + QR'
                        : 'بطاقة العضوية بقلاب 3D'
                      : tabId === 'menu'
                        ? isEn
                          ? 'Menu & Product Detail'
                          : 'المنيو وتفاصيل المنتجات'
                        : tabId === 'ticket'
                          ? isEn
                            ? 'Redemption Ticket'
                            : 'تذكرة استرداد المكافأة'
                          : isEn
                            ? 'Itemized Wallet Ledger'
                            : 'سجل الحركات بالفاتورة'}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {isEn ? 'Click to preview live on phone' : 'اضغط للمعاينة الحية داخل الهاتف'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AdminCashierPreview lang={lang} brandName={brandName} theme="executive" />
        )}
      </section>

      {/* COMPARISON MATRIX TABLE */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold">
              {isEn ? 'Why MO2 Loyalty vs Alternatives' : 'مقارنة سريعة: لماذا MO2 Loyalty؟'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead className="bg-[#F4F6FA] text-slate-600">
                <tr>
                  <th className="p-4 font-bold text-start">{isEn ? 'Criteria' : 'وجه المقارنة'}</th>
                  <th className="p-4 font-bold text-start">{isEn ? 'Paper Cards' : 'كروت ورقية'}</th>
                  <th className="p-4 font-bold text-start">{isEn ? 'Custom Mobile App' : 'تطبيق خاص مكلف'}</th>
                  <th className="p-4 font-bold text-start text-[#4F46E5]">MO2 Loyalty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.metric.en}>
                    <td className="p-4 font-bold">{row.metric[lang]}</td>
                    <td className="p-4 text-slate-500">{row.paper[lang]}</td>
                    <td className="p-4 text-slate-500">{row.nativeApp[lang]}</td>
                    <td className="p-4 font-bold text-[#059669] bg-emerald-50/40">{row.mo2[lang]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ROI + PILOT CLOSING */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 flex flex-col gap-8">
        <RoiCalculator lang={lang} theme="executive" />

        <div className="rounded-3xl bg-[#0F172A] text-white p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-emerald-400">{PRICING_TIERS.pilot.badge[lang]}</span>
            <h3 className="text-2xl font-bold mt-1">{PRICING_TIERS.pilot.name[lang]}</h3>
            <p className="text-xs text-slate-300 mt-2">
              {isEn
                ? 'Followed by Starter (950–1,200 EGP/branch) or Growth (1,800–2,200 EGP/mo).'
                : 'وبعد التجربة باقات مرنة تبدأ من Starter (950–1,200 ج.م/فرع) أو Growth حتى 3 فروع.'}
            </p>
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-emerald-300">
              {PRICING_TIERS.pilot.features[lang].slice(0, 2).map((f) => (
                <span key={f} className="inline-flex items-center gap-1.5">
                  <CheckCircle size={14} weight="fill" />
                  {f}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="no-print px-6 py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-bold inline-flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Printer size={17} weight="bold" />
            {isEn ? 'Print / Save PDF' : 'طباعة / حفظ كـ PDF'}
          </button>
        </div>
      </section>
    </div>
  );
};
