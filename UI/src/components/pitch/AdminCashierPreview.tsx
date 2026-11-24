import React, { useState } from 'react';
import {
  Storefront,
  QrCode,
  CheckCircle,
  TrendUp,
  Coins,
  Image as ImageIcon,
  Coffee,
  Lightning,
} from '@phosphor-icons/react';
import { PitchLang, slugifyBrand } from './pitchData';

interface AdminCashierPreviewProps {
  lang: PitchLang;
  brandName: string;
  theme: 'editorial' | 'obsidian' | 'executive';
}

const PEAK_HOURS = [
  { h: '10', pct: 28 },
  { h: '12', pct: 44 },
  { h: '14', pct: 58 },
  { h: '16', pct: 70 },
  { h: '18', pct: 95, peak: true },
  { h: '20', pct: 82 },
  { h: '22', pct: 64 },
];

export const AdminCashierPreview: React.FC<AdminCashierPreviewProps> = ({
  lang,
  brandName,
  theme,
}) => {
  const [activeView, setActiveView] = useState<'admin' | 'cashier'>('admin');
  const [withPhoto, setWithPhoto] = useState(true);
  const [voucherCode, setVoucherCode] = useState('MO2-884210');
  const [verified, setVerified] = useState(false);

  const isEn = lang === 'en';
  const isDark = theme === 'obsidian';
  const slug = slugifyBrand(brandName);

  const cardBg = isDark
    ? 'bg-[#15181E] border-[#242832] text-[#F4F5F7]'
    : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_12px_34px_-14px_rgba(15,23,42,0.12)]';
  const innerBg = isDark ? 'bg-[#1C2029] border-[#242832]' : 'bg-slate-50 border-slate-200/80';
  const mutedText = isDark ? 'text-[#9BA1A6]' : 'text-slate-500';
  const accentBtn =
    theme === 'obsidian'
      ? 'bg-[#D4AF37] text-[#0B0C10]'
      : theme === 'editorial'
        ? 'bg-[#C86428] text-white'
        : 'bg-[#4F46E5] text-white';

  return (
    <div className={`rounded-3xl border p-5 sm:p-7 ${cardBg}`}>
      {/* Header + 2-Tab Switcher (Merchant Admin vs Cashier/Foodics ONLY — zero SuperAdmin) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-current/10">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider opacity-70">
            {isEn ? 'Merchant Operations Suite' : 'منظومة إدارة التاجر والفروع'}
          </div>
          <h3 className="text-xl font-bold mt-1">
            {isEn ? `${brandName} Control & Till Flow` : `لوحة تحكم ${brandName} ونقطة الكاشير`}
          </h3>
        </div>

        <div className={`inline-flex p-1 rounded-xl border ${innerBg}`}>
          <button
            type="button"
            onClick={() => setActiveView('admin')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeView === 'admin' ? accentBtn : mutedText
            }`}
          >
            <TrendUp size={14} weight="bold" />
            {isEn ? 'Admin Dashboard' : 'لوحة التاجر (/admin)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('cashier')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeView === 'cashier' ? accentBtn : mutedText
            }`}
          >
            <Storefront size={14} weight="bold" />
            {isEn ? 'Cashier & Foodics Sync' : 'الكاشير وربط Foodics'}
          </button>
        </div>
      </div>

      {activeView === 'admin' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-6">
          {/* KPIs + Peak Hours */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-2xl border p-3.5 ${innerBg}`}>
                <div className={`text-[11px] font-semibold ${mutedText}`}>
                  {isEn ? 'Active Members' : 'العملاء المسجلون'}
                </div>
                <div className="font-mono text-2xl font-bold mt-1" dir="ltr">1,428</div>
                <div className="text-[11px] font-bold text-emerald-500 mt-0.5">+12.4%</div>
              </div>
              <div className={`rounded-2xl border p-3.5 ${innerBg}`}>
                <div className={`text-[11px] font-semibold ${mutedText}`}>
                  {isEn ? 'Repeat Visit Rate' : 'معدل الرجوع'}
                </div>
                <div className="font-mono text-2xl font-bold mt-1" dir="ltr">68.4%</div>
                <div className="text-[11px] font-bold text-emerald-500 mt-0.5">+4.2%</div>
              </div>
              <div className={`rounded-2xl border p-3.5 ${innerBg}`}>
                <div className={`text-[11px] font-semibold ${mutedText}`}>
                  {isEn ? 'Issued Points' : 'رصيد متداول'}
                </div>
                <div className="font-mono text-2xl font-bold mt-1" dir="ltr">184.9K</div>
                <div className={`text-[11px] mt-0.5 ${mutedText}`}>{isEn ? 'Live Ledger' : 'دفتر حي'}</div>
              </div>
            </div>

            <div className={`rounded-2xl border p-4 ${innerBg}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold">
                  {isEn ? 'Peak Hours Velocity' : 'توزيع ساعات الذروة (Peak Hours)'}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                  {isEn ? 'Peak 18:00' : 'الذروة 18:00'}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2 items-end h-28 pt-2">
                {PEAK_HOURS.map((bar) => (
                  <div key={bar.h} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        bar.peak
                          ? 'bg-emerald-500'
                          : isDark
                            ? 'bg-[#D4AF37]/75'
                            : 'bg-[#4F46E5]/80'
                      }`}
                      style={{ height: `${bar.pct}%` }}
                    />
                    <span className={`font-mono text-[10px] ${mutedText}`}>{bar.h}:00</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table QR + Optional Photo Toggle */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className={`rounded-2xl border p-4 ${innerBg}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold inline-flex items-center gap-1.5">
                  <ImageIcon size={15} weight="bold" />
                  {isEn ? 'Optional Product / Reward Photo' : 'صور المنتجات والمكافآت (اختياري)'}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWithPhoto(true)}
                    className={`px-2 py-1 rounded-md text-[10.5px] font-bold cursor-pointer border ${
                      withPhoto
                        ? `${accentBtn} border-transparent`
                        : 'border-current/15 opacity-70'
                    }`}
                  >
                    {isEn ? 'Photo' : 'بصورة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithPhoto(false)}
                    className={`px-2 py-1 rounded-md text-[10.5px] font-bold cursor-pointer border ${
                      !withPhoto
                        ? `${accentBtn} border-transparent`
                        : 'border-current/15 opacity-70'
                    }`}
                  >
                    {isEn ? 'Icon' : 'بدون صورة'}
                  </button>
                </div>
              </div>
              <div className={`rounded-xl border p-3 flex items-center gap-3 ${cardBg}`}>
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-emerald-950/50 border border-current/15 flex items-center justify-center shrink-0">
                  {withPhoto ? (
                    <img
                      src="/demo-products/iced-spanish-latte.jpg"
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Coffee size={22} className="text-amber-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {isEn ? 'Iced Spanish Latte Reward' : 'آيس سبانش لاتيه مجاني'}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${mutedText}`}>
                    {withPhoto
                      ? isEn
                        ? 'Custom photo uploaded in Admin'
                        : 'صورة مرفوعة من لوحة التاجر'
                      : isEn
                        ? 'Clean default icon when omitted'
                        : 'أيقونة قياسية أنيقة عند عدم الرفع'}
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${innerBg}`}>
              <div className="min-w-0">
                <div className="text-xs font-bold">{isEn ? 'Table QR Standee URL' : 'رابط كارت طاولة #7'}</div>
                <div className={`font-mono text-[10.5px] truncate mt-1 ${mutedText}`} dir="ltr">
                  /?tenant={slug}&amp;table=7
                </div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 shrink-0">
                <QrCode size={44} color="#0B0C10" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-6">
          {/* Animated Foodics POS Pipeline */}
          <div className={`lg:col-span-7 rounded-2xl border p-5 flex flex-col justify-between gap-4 ${innerBg}`}>
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
                <Lightning size={13} weight="fill" />
                {isEn ? 'Auto-Earn Mode (Foodics Webhook)' : 'مسار كسب النقاط التلقائي مع Foodics'}
              </span>
              <h4 className="text-sm font-bold mt-1">
                {isEn
                  ? 'Order paid on POS → Webhook Queue → Points in Wallet'
                  : 'الفاتورة تتقفل على Foodics ← النقاط تنزل للعميل أوتوماتيك'}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className={`rounded-xl border p-3 text-center ${cardBg}`}>
                <div className="text-[11px] font-bold">Foodics POS</div>
                <div className={`text-[10.5px] mt-1 ${mutedText}`}>
                  {isEn ? 'Cashier enters customer phone & closes bill' : 'الكاشير يضيف رقم العميل ويقفل الفاتورة'}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <svg className="w-full h-6" viewBox="0 0 120 24" fill="none">
                  <path
                    d="M6 12 H114"
                    stroke="currentColor"
                    strokeOpacity="0.35"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    className="pitch-flow-line"
                  />
                </svg>
                <span className="text-[10px] font-mono font-bold text-emerald-500">HMAC + BullMQ</span>
              </div>

              <div className={`rounded-xl border p-3 text-center ${cardBg}`}>
                <div className="text-[11px] font-bold inline-flex items-center gap-1">
                  <Coins size={13} className="text-emerald-500" />
                  {isEn ? 'Wallet Credited' : 'رصيد العميل'}
                </div>
                <div className="font-mono text-xs font-bold text-emerald-500 mt-1" dir="ltr">+120 pts</div>
              </div>
            </div>

            <div className={`text-[11.5px] leading-relaxed ${mutedText}`}>
              {isEn
                ? 'Branches without Foodics use the same Cashier page below to award points by phone number on Day 1.'
                : 'وفي حالة الفروع التي لا تستخدم Foodics، تضم شاشة الكاشير نفسها تبويباً فورياً لإضافة النقاط برقم الموبايل.'}
            </div>
          </div>

          {/* Interactive 5-Second Cashier Voucher Verifier */}
          <div className={`lg:col-span-5 rounded-2xl border p-5 flex flex-col justify-between gap-3 ${innerBg}`}>
            <div>
              <div className="text-xs font-bold">{isEn ? 'Live Cashier Voucher Check' : 'تجربة شاشة الكاشير (صرف الهدية)'}</div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>
                {isEn ? 'Redeeming rewards takes 5 seconds and prevents reuse.' : 'تحقق من كود المكافأة في 5 ثوانٍ واقفله لمنع تكراره.'}
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                dir="ltr"
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  setVerified(false);
                }}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-mono font-bold outline-none ${cardBg}`}
              />
              <button
                type="button"
                onClick={() => setVerified(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${accentBtn}`}
              >
                {isEn ? 'Verify' : 'اعتماد'}
              </button>
            </div>

            {verified && (
              <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/35 px-3 py-2 text-[11.5px] font-bold text-emerald-500 flex items-center gap-2">
                <CheckCircle size={16} weight="fill" />
                <span>
                  {isEn
                    ? `Approved! Free Espresso dispensed for ${voucherCode}`
                    : `تم الاعتماد! اصرف كوب إسبريسو مجاني (${voucherCode})`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
