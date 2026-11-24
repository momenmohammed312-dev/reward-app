import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle,
  Printer,
  ArrowDown,
  QrCode,
  Coins,
  Gift,
  TrendUp,
} from '@phosphor-icons/react';
import {
  PitchLang,
  PhoneDemoTab,
  LOYALTY_LOOP_STEPS,
  OPERATIONS_EXPLAINED,
  PRICING_TIERS,
} from './pitchData';
import { InteractivePhoneDemo } from './InteractivePhoneDemo';
import { AdminCashierPreview } from './AdminCashierPreview';
import { RoiCalculator } from './RoiCalculator';

interface ConceptEditorialProps {
  lang: PitchLang;
  brandName: string;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export const ConceptEditorial: React.FC<ConceptEditorialProps> = ({ lang, brandName }) => {
  const [phoneTab, setPhoneTab] = useState<PhoneDemoTab>('pass');
  const isEn = lang === 'en';
  const ops = OPERATIONS_EXPLAINED.foodicsVsCashier[lang];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="bg-[#F5F3EE] text-[#0B1020] overflow-x-clip">
      {/* Editorial Chapter Quick-Nav Bar (ABAP-inspired progression) */}
      <nav
        aria-label="Chapters"
        className="no-print sticky top-[57px] z-30 bg-[#0B1020]/95 backdrop-blur-md text-slate-300 border-b border-white/10"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between gap-2 overflow-x-auto text-xs font-semibold">
          <div className="flex items-center gap-2 sm:gap-4 whitespace-nowrap">
            {[
              { id: 'ed-cover', num: '01', label: isEn ? 'Overview' : 'المقدمة' },
              { id: 'ed-sticky', num: '02', label: isEn ? 'Customer Experience' : 'رحلة العميل' },
              { id: 'ed-ops', num: '03', label: isEn ? 'POS & Admin' : 'الربط والإدارة' },
              { id: 'ed-roi', num: '04', label: isEn ? 'ROI & Pricing' : 'العائد والباقات' },
              { id: 'ed-close', num: '05', label: isEn ? 'Start Pilot' : 'بدء التجربة' },
            ].map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => scrollTo(ch.id)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:text-white transition-colors cursor-pointer"
              >
                <span className="font-mono text-[10px] text-[#C86428]">{ch.num}</span>
                <span>{ch.label}</span>
              </button>
            ))}
          </div>
          <span className="hidden md:inline-block font-mono text-[10.5px] text-slate-400">
            {brandName} · PDF Editorial Edition
          </span>
        </div>
      </nav>

      {/* CHAPTER 01: MIDNIGHT NAVY PDF OPENING COVER */}
      <section
        id="ed-cover"
        className="min-h-[82svh] bg-[#0B1020] text-[#F5F3EE] relative flex flex-col justify-between px-6 py-16 sm:py-20"
      >
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <span className="w-9 h-9 rounded-full border border-[#C86428] text-[#C86428] font-bold text-sm flex items-center justify-center">
              M2
            </span>
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-slate-300">
              MO2 LOYALTY
            </span>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
            {isEn ? `Prepared for ${brandName}` : `مُعد خصيصاً لـ ${brandName}`}
          </span>
        </div>

        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE_OUT }}
            className="lg:col-span-7"
          >
            <div className="text-xs font-bold tracking-[0.18em] uppercase text-[#C86428] mb-4">
              {isEn ? 'PROPOSAL & PRODUCT SHOWCASE' : 'ملف العرض والتشغيل الحي'}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.12] tracking-tight">
              {isEn ? (
                <>
                  The way to get more customers{' '}
                  <span className="text-[#C86428]">back.</span>
                </>
              ) : (
                <>
                  الطريقة الأسهل لرجوع عملائك{' '}
                  <span className="text-[#C86428]">كل أسبوع.</span>
                </>
              )}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
              {isEn
                ? `A complete loyalty & rewards infrastructure tailored for ${brandName} — turning first-time visitors into weekly regulars with zero app download.`
                : `بنية ولاء ومكافآت متكاملة جاهزة باسم ${brandName} — تحوّل الزائر الأول إلى عميل دائم في 8 ثوانٍ بدون تحميل أي تطبيق.`}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => scrollTo('ed-sticky')}
                className="px-6 py-3 rounded-xl bg-[#C86428] text-white font-bold text-sm hover:bg-[#b5571f] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                {isEn ? 'Explore Live Flow' : 'شاهد تجربة العميل حياً'}
                <ArrowDown size={16} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => scrollTo('ed-close')}
                className="px-5 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-bold text-sm hover:bg-white/15 transition-colors cursor-pointer"
              >
                {isEn ? '14-Day Free Pilot' : 'عرض التجربة 14 يوم مجاناً'}
              </button>
            </div>
          </motion.div>

          {/* Animated Vertical Flow Chain (ABAP Story Opening Inspiration) */}
          <div className="lg:col-span-5 flex flex-col items-center gap-2.5">
            {[
              { step: 1, icon: QrCode, label: isEn ? '01 · SCAN TABLE QR' : '01 · مسح QR الطاولة', accent: false },
              { step: 2, icon: Coins, label: isEn ? '02 · EARN AUTOMATICALLY' : '02 · جمع النقاط تلقائياً', accent: true },
              { step: 3, icon: Gift, label: isEn ? '03 · REDEEM AT TILL' : '03 · صرف المكافأة عند الكاشير', accent: false },
              { step: 4, icon: TrendUp, label: isEn ? '04 · RETAIN & GROW' : '04 · تحليل العودة والنمو', accent: false },
            ].map((node, idx) => {
              const Icon = node.icon;
              return (
                <React.Fragment key={node.step}>
                  <motion.div
                    initial={{ opacity: 0.85, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: idx * 0.05, ease: EASE_OUT }}
                    className={`w-full max-w-xs px-5 py-3.5 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                      node.accent
                        ? 'bg-[#0F5E4A]/35 border-[#00C896]/50 text-[#00C896]'
                        : 'bg-white/5 border-white/15 text-slate-200'
                    }`}
                  >
                    <span>{node.label}</span>
                    <Icon size={17} weight="duotone" />
                  </motion.div>
                  {idx < 3 && <div className="w-px h-5 bg-white/25" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="max-w-6xl mx-auto w-full flex items-center justify-between pt-6 border-t border-white/10 text-xs text-slate-400">
          <span>{isEn ? 'Loyalty Infrastructure · Egypt' : 'بنية برامج الولاء للكافيهات · مصر'}</span>
          <span>{isEn ? `Prepared for ${brandName}` : `مقدم لـ ${brandName}`}</span>
        </div>
      </section>

      {/* CHAPTER 02: APPLE STICKY SCROLL CUSTOMER SHOWCASE */}
      <section id="ed-sticky" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-12">
          <div className="text-xs font-bold tracking-[0.16em] uppercase text-[#C86428]">
            {isEn ? '02 · THE CUSTOMER JOURNEY' : '02 · رحلة عميلك خطوة بخطوة'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 text-[#0B1020]">
            {isEn ? 'Four steps. One interactive wallet.' : 'أربع خطوات واضحة.. وجرّب الموبايل بجانبك'}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Scrolling Narrative Triggers */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {LOYALTY_LOOP_STEPS.map((step) => {
              const active = phoneTab === step.key;
              return (
                <motion.div
                  key={step.key}
                  onViewportEnter={() => setPhoneTab(step.key)}
                  viewport={{ amount: 0.6 }}
                  onClick={() => setPhoneTab(step.key)}
                  className={`rounded-3xl p-6 sm:p-7 border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0B1020] text-[#F5F3EE] border-[#0B1020] shadow-xl'
                      : 'bg-white text-[#0B1020] border-[#E4DEC9] hover:border-[#C86428]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-[#C86428]">
                      STEP {step.num}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                        active ? 'bg-[#0F5E4A] text-white' : 'bg-[#F5F3EE] text-[#0F5E4A]'
                      }`}
                    >
                      {step.badge[lang]}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{step.title[lang]}</h3>
                  <p
                    className={`mt-2.5 text-sm leading-relaxed ${
                      active ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {step.summary[lang]}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Sticky Interactive Phone */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <InteractivePhoneDemo
              lang={lang}
              brandName={brandName}
              activeTab={phoneTab}
              onTabChange={setPhoneTab}
            />
          </div>
        </div>
      </section>

      {/* CHAPTER 03: MERCHANT OPERATIONS (FOODICS + ADMIN + CASHIER — NO SUPERADMIN) */}
      <section id="ed-ops" className="bg-white border-y border-[#E5DEC9] py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
          <div>
            <div className="text-xs font-bold tracking-[0.16em] uppercase text-[#0F5E4A]">
              03 · {ops.eyebrow}
            </div>
            <h2 className="text-3xl font-bold mt-2 text-[#0B1020]">{ops.headline}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ops.points.map((pt) => (
              <div
                key={pt.title}
                className="rounded-2xl bg-[#F5F3EE] border border-[#E5DEC9] p-5 flex flex-col gap-2"
              >
                <h3 className="text-sm font-bold text-[#0B1020]">{pt.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{pt.body}</p>
              </div>
            ))}
          </div>

          <AdminCashierPreview lang={lang} brandName={brandName} theme="editorial" />
        </div>
      </section>

      {/* CHAPTER 04: ROI CALCULATOR & PRICING */}
      <section id="ed-roi" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 flex flex-col gap-12">
        <RoiCalculator lang={lang} theme="editorial" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5 rounded-3xl bg-[#0B1020] text-[#F5F3EE] p-7 flex flex-col justify-between">
            <div>
              <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-[#C86428] text-white">
                {PRICING_TIERS.pilot.badge[lang]}
              </span>
              <h3 className="text-2xl font-bold mt-4">{PRICING_TIERS.pilot.name[lang]}</h3>
              <div className="mt-3 font-mono text-4xl font-bold text-[#00C896]" dir="ltr">
                {PRICING_TIERS.pilot.price[lang]}
              </div>
              <div className="text-xs text-slate-400 mt-1">{PRICING_TIERS.pilot.period[lang]}</div>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-200">
                {PRICING_TIERS.pilot.features[lang].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle size={17} className="text-[#00C896] shrink-0 mt-0.5" weight="fill" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PRICING_TIERS.plans.map((pl) => (
              <div
                key={pl.name}
                className={`rounded-3xl p-6 border flex flex-col justify-between ${
                  pl.highlight
                    ? 'bg-white border-[#0F5E4A] ring-2 ring-[#0F5E4A]/15 shadow-lg'
                    : 'bg-white border-[#E5DEC9]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{pl.name}</span>
                    {pl.highlight && (
                      <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-[#0F5E4A]/15 text-[#0F5E4A]">
                        {isEn ? 'Most Popular' : 'الأكثر ملاءمة'}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 font-mono text-2xl font-bold text-[#0B1020]">
                    {pl.price[lang]}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{pl.unit[lang]}</div>
                  <ul className="mt-5 space-y-2 text-xs text-slate-700">
                    {pl.bullets[lang].map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <CheckCircle size={15} className="text-[#0F5E4A] shrink-0 mt-0.5" weight="bold" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHAPTER 05: CLOSING COVER */}
      <section id="ed-close" className="bg-[#0B1020] text-[#F5F3EE] py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-11 h-11 rounded-full border border-[#C86428] text-[#C86428] font-bold flex items-center justify-center mx-auto mb-6">
            M2
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold leading-tight">
            {isEn
              ? 'Give your regulars a reason to stay regular.'
              : `اجعل لعملاء ${brandName} سبباً للعودة كل أسبوع.`}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300">
            {isEn
              ? 'Setup completes in the same day. We launch a live branch test with zero upfront commitment.'
              : 'الإعداد يتم في نفس اليوم — نبدأ بتشغيل تجريبي على فرع واحد مجاناً لترى النتائج بعينك.'}
          </p>
          <div className="no-print mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-6 py-3 rounded-xl bg-[#C86428] text-white font-bold text-sm inline-flex items-center gap-2 hover:bg-[#b5571f] transition-colors cursor-pointer"
            >
              <Printer size={17} weight="bold" />
              {isEn ? 'Save / Print as PDF' : 'حفظ أو طباعة كـ PDF'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
