import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import {
  Sparkle,
  QrCode,
  Lightning,
  ShieldCheck,
  CheckCircle,
  Printer,
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

interface ConceptKeynoteProps {
  lang: PitchLang;
  brandName: string;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export const ConceptKeynote: React.FC<ConceptKeynoteProps> = ({ lang, brandName }) => {
  const heroRef = useRef<HTMLElement>(null);
  const [phoneTab, setPhoneTab] = useState<PhoneDemoTab>('pass');
  const isEn = lang === 'en';
  const ops = OPERATIONS_EXPLAINED.foodicsVsCashier[lang];

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const cardY = useTransform(smoothProgress, [0, 1], [0, -36]);
  const cardScale = useTransform(smoothProgress, [0, 1], [1, 1.04]);

  return (
    <div className="bg-[#07080C] text-[#F4F5F7] overflow-x-clip">
      {/* KEYNOTE HERO WITH SCROLL-LINKED DEPTH */}
      <section
        ref={heroRef}
        className="relative py-20 sm:py-24 px-4 sm:px-6 overflow-hidden border-b border-white/10"
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[620px] h-[340px] rounded-full bg-[radial-gradient(circle,rgba(0,200,150,0.18),rgba(212,175,55,0.08)_50%,transparent_75%)] blur-2xl" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#15181E] border border-[#D4AF37]/40 text-[#F3E5AB] text-xs font-bold mb-6"
          >
            <Sparkle size={14} weight="fill" />
            <span>{isEn ? `${brandName} · Keynote Experience` : `${brandName} · تجربة الولاء الفاخرة`}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: EASE_OUT }}
            className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.12] bg-gradient-to-b from-white via-[#F4F5F7] to-[#9BA1A6] bg-clip-text text-transparent"
          >
            {isEn
              ? 'One QR Scan. Every Visit Compounds.'
              : 'مسحة كود واحدة. وكل زيارة تصنع عميلاً دائماً.'}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: EASE_OUT }}
            className="mt-5 text-base sm:text-lg text-[#9BA1A6] max-w-2xl mx-auto leading-relaxed"
          >
            {isEn
              ? 'Apple Wallet aesthetics meet Foodics-ready automation — built cleanly for high-frequency Egyptian specialty cafés.'
              : 'تصميم بطاقة عضوية فاخرة داخل المتصفح مع تزامن Foodics وتشغيل فوري من اليوم الأول بدون إجبار الزبون على تحميل تطبيق.'}
          </motion.p>
        </div>

        {/* Scroll-linked Floating Stage */}
        <motion.div
          style={{ y: cardY, scale: cardScale }}
          className="max-w-5xl mx-auto mt-12 relative z-10"
        >
          <div className="rounded-3xl bg-[#11141C] border border-[#242832] p-6 sm:p-8 shadow-[0_32px_90px_-20px_rgba(0,0,0,0.85)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <InteractivePhoneDemo
                lang={lang}
                brandName={brandName}
                activeTab={phoneTab}
                onTabChange={setPhoneTab}
                darkFrame
              />
            </div>

            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                {isEn ? 'Interactive 4-Stage Walkthrough' : 'اضغط على أي خطوة لمعاينة الشاشة فوراً'}
              </div>
              {LOYALTY_LOOP_STEPS.map((st) => {
                const isActive = phoneTab === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setPhoneTab(st.key)}
                    className={`w-full text-start rounded-2xl p-4 border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#1C2029] border-[#D4AF37]/55'
                        : 'bg-[#15181E] border-[#242832] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[#F4F5F7]">
                        <span className="font-mono text-[#00C896] me-2">{st.num}</span>
                        {st.title[lang]}
                      </span>
                      <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-[#00C896]/15 text-[#00C896]">
                        {st.badge[lang]}
                      </span>
                    </div>
                    <p className="text-xs text-[#9BA1A6] mt-1.5 leading-relaxed">{st.summary[lang]}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* APPLE KEYNOTE BENTO GRID */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#00C896]">
            {isEn ? 'Engineered For Reality' : 'مبني لتحديات الكافيهات في مصر'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2">
            {isEn ? 'Fast at the till. Effortless for guests.' : 'أقصى سرعة عند الكاشير.. وأسهل تجربة للزبون'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="md:col-span-7 rounded-3xl bg-[#15181E] border border-[#242832] p-7 flex flex-col justify-between"
          >
            <QrCode size={28} className="text-[#D4AF37]" weight="duotone" />
            <div className="mt-6">
              <div className="font-mono text-3xl font-bold text-[#F3E5AB]" dir="ltr">8 sec</div>
              <h3 className="text-xl font-bold mt-1">
                {isEn ? 'Browser QR Onboarding — Zero App Friction' : 'تسجيل في 8 ثوانٍ بالمتصفح بدون تحميل تطبيق'}
              </h3>
              <p className="text-sm text-[#9BA1A6] mt-2 leading-relaxed">
                {isEn
                  ? 'Every table and counter gets a unique QR code that opens directly in Safari or Chrome.'
                  : 'كل طاولة أو كاونتر له QR يفتح فوراً على متصفح الموبايل مع تحقق برقم الهاتف OTP.'}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: 0.08, ease: EASE_OUT }}
            className="md:col-span-5 rounded-3xl bg-gradient-to-br from-[#0E2922] to-[#15181E] border border-[#00C896]/35 p-7 flex flex-col justify-between"
          >
            <Lightning size={28} className="text-[#00C896]" weight="duotone" />
            <div className="mt-6">
              <h3 className="text-xl font-bold">
                {isEn ? 'Foodics + Instant Cashier Fallback' : 'Foodics أوتوماتيك أو شاشة كاشير فورية'}
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                {isEn
                  ? 'Automate points on Foodics orders, or run Day-1 manually from our lightweight Cashier web terminal.'
                  : 'استلم النقاط تلقائياً من Foodics أو شغّل الفرع في نفس اليوم بدون POS معقد.'}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: 0.12, ease: EASE_OUT }}
            className="md:col-span-5 rounded-3xl bg-[#15181E] border border-[#242832] p-7"
          >
            <ShieldCheck size={28} className="text-[#00C896]" weight="duotone" />
            <h3 className="text-lg font-bold mt-4">
              {isEn ? 'Anti-Fraud Single-Use Ledger' : 'حماية مالية تمنع التكرار والتلاعب'}
            </h3>
            <p className="text-sm text-[#9BA1A6] mt-2 leading-relaxed">
              {isEn
                ? 'Idempotent point ledger locks balances atomically so one voucher can never be redeemed twice.'
                : 'كود المكافأة يُصرف مرة واحدة فقط مع سجل كامل لكل عملية وفرع.'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: 0.16, ease: EASE_OUT }}
            className="md:col-span-7 rounded-3xl bg-[#15181E] border border-[#242832] p-7"
          >
            <div className="text-xs font-bold text-[#D4AF37]">
              {isEn ? 'BILINGUAL & WHITE-LABELED' : 'ثنائي اللغة وبألوان علامتك'}
            </div>
            <h3 className="text-xl font-bold mt-2">
              {isEn
                ? `${brandName} colors, logo & optional product photos`
                : `تجربة كاملة باسم ${brandName} ولغتين عربي / إنجليزي`}
            </h3>
            <p className="text-sm text-[#9BA1A6] mt-2 leading-relaxed">
              {isEn
                ? 'Switch Arabic RTL and English LTR seamlessly, with optional menu/reward images controlled directly by you.'
                : 'تبديل فوري بين العربية والإنجليزية وتحكم اختياري من لوحتك في صور المنتجات والمكافآت.'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* MERCHANT ADMIN + CASHIER + FOODICS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 flex flex-col gap-10">
        <div>
          <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">{ops.eyebrow}</span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-1">{ops.headline}</h2>
        </div>
        <AdminCashierPreview lang={lang} brandName={brandName} theme="obsidian" />
        <RoiCalculator lang={lang} theme="obsidian" />

        {/* Dark Closing Pilot Card */}
        <div className="rounded-3xl bg-gradient-to-br from-[#15181E] via-[#0E2922] to-[#15181E] border border-[#D4AF37]/40 p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-[#F3E5AB]">{PRICING_TIERS.pilot.badge[lang]}</span>
            <h3 className="text-2xl sm:text-3xl font-bold mt-2">{PRICING_TIERS.pilot.name[lang]}</h3>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-200">
              {PRICING_TIERS.pilot.features[lang].slice(0, 3).map((f) => (
                <span key={f} className="inline-flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-[#00C896]" weight="fill" />
                  {f}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B88F20] text-[#0B0C10] font-extrabold text-sm inline-flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Printer size={17} weight="bold" />
            {isEn ? 'Print / Save PDF' : 'حفظ العرض كـ PDF'}
          </button>
        </div>
      </section>
    </div>
  );
};
