import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Coffee,
  Gift,
  ClockCounterClockwise,
  Star,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Copy,
} from '@phosphor-icons/react';
import { PitchLang, PhoneDemoTab } from './pitchData';

interface InteractivePhoneDemoProps {
  lang: PitchLang;
  brandName: string;
  activeTab?: PhoneDemoTab;
  onTabChange?: (tab: PhoneDemoTab) => void;
  darkFrame?: boolean;
}

const DEMO_EASE = [0.23, 1, 0.32, 1] as const;

export const InteractivePhoneDemo: React.FC<InteractivePhoneDemoProps> = ({
  lang,
  brandName,
  activeTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<PhoneDemoTab>('pass');
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedTx, setExpandedTx] = useState<'tx1' | 'tx2'>('tx1');

  const currentTab = activeTab ?? internalTab;
  const setTab = (t: PhoneDemoTab) => {
    setInternalTab(t);
    onTabChange?.(t);
  };

  const isEn = lang === 'en';
  const BackArrowIcon = isEn ? ArrowLeft : ArrowRight;

  const menuPreview = [
    {
      id: 'm1',
      name: isEn ? 'Iced Spanish Latte' : 'آيس سبانش لاتيه',
      price: '110 EGP',
      pts: '+110',
      img: '/demo-products/iced-spanish-latte.jpg',
    },
    {
      id: 'm2',
      name: isEn ? 'Double Espresso' : 'دبل إسبريسو مختص',
      price: '75 EGP',
      pts: '+75',
      img: '/demo-products/espresso.jpg',
    },
    {
      id: 'm3',
      name: isEn ? 'Butter Croissant' : 'كرواسون زبدة فرنسي',
      price: '70 EGP',
      pts: '+70',
      img: '/demo-products/butter-croissant.jpg',
    },
    {
      id: 'm4',
      name: isEn ? 'Classic Flat White' : 'فلات وايت (بدون صورة)',
      price: '85 EGP',
      pts: '+85',
      img: '',
    },
  ];

  const handleCopyTicket = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="w-full max-w-[336px] mx-auto rounded-[38px] bg-[#0B0C10] text-[#F4F5F7] border-[6px] border-[#1A1F2B] shadow-[0_30px_70px_-18px_rgba(0,0,0,0.65),0_0_0_1px_rgba(212,175,55,0.22)] overflow-hidden flex flex-col select-none"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {/* Phone Status Bar */}
      <div className="h-8 px-5 pt-1.5 flex items-center justify-between text-[10px] font-bold text-[#9BA1A6] bg-[#0B0C10]">
        <span className="font-mono" dir="ltr">9:41</span>
        <span className="w-16 h-4 rounded-full bg-black border border-white/10" />
        <span className="font-mono text-[#00C896]" dir="ltr">5G</span>
      </div>

      {/* Top Merchant Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#242832]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1E2430] to-[#0A3A2C] border border-[#D4AF37]/40 text-[#F3E5AB] font-bold text-xs flex items-center justify-center shrink-0">
            {brandName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-bold truncate text-[#F4F5F7]">{brandName}</div>
            <div className="text-[10.5px] text-[#9BA1A6]">
              {isEn ? 'Obsidian Loyalty Pass' : 'بطاقة الولاء الرقمية'}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F3E5AB] inline-flex items-center gap-1 shrink-0">
          <Star size={10} weight="fill" />
          VIP Gold
        </span>
      </div>

      {/* Body Stage */}
      <div className="p-3.5 flex-1 min-h-[372px] flex flex-col justify-between bg-[#0B0C10]">
        <AnimatePresence mode="wait">
          {currentTab === 'pass' && (
            <motion.div
              key="pass"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: DEMO_EASE }}
              className="flex flex-col gap-3"
            >
              {/* 3D Flip Wallet Pass */}
              <div className="[perspective:1000px] h-[178px] w-full">
                <div
                  className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
                  style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                >
                  {/* Front Face */}
                  <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl p-4 flex flex-col justify-between border border-[#D4AF37]/45 bg-[radial-gradient(circle_at_12%_15%,rgba(0,200,150,0.22),transparent_48%),linear-gradient(135deg,#181C26_0%,#0E2922_56%,#0D0F15_100%)] shadow-xl">
                    <div className="flex items-center justify-between text-[11px] text-[#9BA1A6]">
                      <span>{isEn ? 'Available Balance' : 'الرصيد المتاح'}</span>
                      <span className="text-[#00C896] font-bold">{brandName}</span>
                    </div>
                    <div>
                      <div className="font-mono text-3xl font-bold text-[#F4F5F7]" dir="ltr">
                        1,240
                      </div>
                      <div className="text-[11px] text-[#00C896] font-semibold mt-0.5">
                        {isEn ? 'Points ready to redeem' : 'نقطة متاحة للاستبدال'}
                      </div>
                    </div>
                    <div className="pt-2.5 border-t border-[#D4AF37]/20 flex items-center justify-between">
                      <span className="font-mono text-[10.5px] text-[#F3E5AB]" dir="ltr">
                        •••• 5678
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsFlipped(true)}
                        className="px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F3E5AB] text-[10.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#D4AF37]/30 transition-colors"
                      >
                        <QrCode size={12} weight="bold" />
                        {isEn ? 'Flip for QR' : 'عرض QR الكاشير'}
                      </button>
                    </div>
                  </div>

                  {/* Back Face */}
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl p-3.5 flex flex-col items-center justify-between bg-[#15181E] border border-[#D4AF37]/50">
                    <div className="w-full flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[#F3E5AB]">
                        {isEn ? 'Scan at till to earn' : 'بطاقة العضوية · امسحها عند الكاشير'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsFlipped(false)}
                        aria-label={isEn ? 'Back' : 'عودة'}
                        className="w-6 h-6 rounded-full bg-[#1C2029] border border-[#242832] flex items-center justify-center text-[#F4F5F7] cursor-pointer"
                      >
                        <BackArrowIcon size={12} weight="bold" />
                      </button>
                    </div>
                    <div className="bg-white p-2 rounded-xl">
                      <QrCode size={72} color="#0B0C10" weight="regular" />
                    </div>
                    <span className="font-mono text-[11px] font-bold text-[#00C896]" dir="ltr">
                      01012345678
                    </span>
                  </div>
                </div>
              </div>

              {/* Milestone Progress Card */}
              <div className="rounded-2xl bg-[#15181E] border border-[#242832] p-3.5">
                <div className="flex items-center justify-between text-[11.5px] font-bold mb-2">
                  <span>{isEn ? 'Next: Free Espresso' : 'الهدية القادمة: إسبريسو مجاني'}</span>
                  <span className="font-mono text-[#00C896]" dir="ltr">92%</span>
                </div>
                <div className="h-2 rounded-full bg-[#1C2029] overflow-hidden border border-[#242832]">
                  <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-[#00C896] to-[#D4AF37]" />
                </div>
                <div className="text-[10.5px] text-[#9BA1A6] mt-2">
                  {isEn ? 'Only 60 pts away · Click card button to flip QR' : 'باقي 60 نقطة فقط · اضغط الزر داخل البطاقة لتجربة قلاب الـ QR'}
                </div>
              </div>
            </motion.div>
          )}

          {currentTab === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: DEMO_EASE }}
              className="flex flex-col gap-2"
            >
              <div className="text-[11px] font-bold text-[#9BA1A6] mb-0.5">
                {isEn ? 'Menu & Earned Points (Photos Optional)' : 'المنيو ونقاط كل منتج (الصور اختيارية من لوحتك)'}
              </div>
              {menuPreview.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[#15181E] border border-[#242832] p-2.5 flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-[#1E2430] to-[#0A3A2C] border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                    {item.img ? (
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Coffee size={20} className="text-[#F3E5AB]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold truncate">{item.name}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-[11px] text-[#9BA1A6]" dir="ltr">{item.price}</span>
                      <span className="font-mono text-[11px] font-bold text-[#00C896]" dir="ltr">
                        {item.pts} {isEn ? 'pts' : 'نقطة'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {currentTab === 'ticket' && (
            <motion.div
              key="ticket"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: DEMO_EASE }}
              className="flex flex-col gap-3"
            >
              <div className="rounded-2xl bg-[#15181E] border border-[#D4AF37]/40 overflow-hidden text-center">
                <div className="p-3.5 border-b border-dashed border-[#D4AF37]/35">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#00C896]/15 border border-[#00C896]/35 text-[#00C896] text-[10px] font-bold mb-1.5">
                    {isEn ? 'Single-Use Till Voucher' : 'كوبون جاهز للصرف عند الكاشير'}
                  </span>
                  <div className="text-[14px] font-bold">
                    {isEn ? 'Free Specialty Espresso' : 'إسبريسو مختص مجاني'}
                  </div>
                </div>
                <div className="p-4 flex flex-col items-center gap-2">
                  <div className="bg-white p-2 rounded-xl">
                    <QrCode size={78} color="#0B0C10" />
                  </div>
                  <div className="font-mono text-base font-bold tracking-widest text-[#F3E5AB]" dir="ltr">
                    MO2-884210
                  </div>
                  <div className="text-[10.5px] text-[#9BA1A6]">
                    {isEn ? 'Expires in 59:42 · Auto-locks after scan' : 'صالح 59:42 · يُغلق فور المسح لمنع التكرار'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyTicket}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B88F20] text-[#0B0C10] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copied ? <CheckCircle size={15} weight="bold" /> : <Copy size={15} weight="bold" />}
                {copied ? (isEn ? 'Code MO2-884210 Copied!' : 'تم نسخ الكود MO2-884210!') : (isEn ? 'Copy Voucher Code' : 'نسخ كود الاستبدال')}
              </button>
            </motion.div>
          )}

          {currentTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: DEMO_EASE }}
              className="flex flex-col gap-2.5"
            >
              <div className="text-[11px] font-bold text-[#9BA1A6]">
                {isEn ? 'Tap any ledger entry to inspect receipt' : 'اضغط على أي حركة لرؤية الفاتورة والأصناف'}
              </div>
              <button
                type="button"
                onClick={() => setExpandedTx('tx1')}
                className={`w-full text-start rounded-2xl p-3 border transition-colors cursor-pointer ${
                  expandedTx === 'tx1'
                    ? 'bg-[#1C2029] border-[#00C896]/45'
                    : 'bg-[#15181E] border-[#242832]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-bold">{isEn ? 'Zamalek Branch' : 'فرع الزمالك'}</div>
                    <div className="text-[10.5px] text-[#9BA1A6]">#POS-9482 · 180 EGP</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#00C896]" dir="ltr">+120</span>
                </div>
                {expandedTx === 'tx1' && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 text-[10.5px] text-[#CBD5E1] space-y-1">
                    <div className="flex justify-between">
                      <span>1× {isEn ? 'Iced Spanish Latte' : 'آيس سبانش لاتيه'}</span>
                      <span className="font-mono" dir="ltr">110 EGP</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1× {isEn ? 'Butter Croissant' : 'كرواسون زبدة فرنسي'}</span>
                      <span className="font-mono" dir="ltr">70 EGP</span>
                    </div>
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setExpandedTx('tx2')}
                className={`w-full text-start rounded-2xl p-3 border transition-colors cursor-pointer ${
                  expandedTx === 'tx2'
                    ? 'bg-[#1C2029] border-[#FB7185]/45'
                    : 'bg-[#15181E] border-[#242832]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-bold">{isEn ? 'Redeemed Espresso' : 'صرف إسبريسو مجاني'}</div>
                    <div className="text-[10.5px] text-[#9BA1A6]">#MO2-741022</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#FB7185]" dir="ltr">-300</span>
                </div>
                {expandedTx === 'tx2' && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 text-[10.5px] text-[#CBD5E1]">
                    {isEn ? 'Verified at Zamalek cashier counter · 0 EGP charged' : 'معتمد من كاشير فرع الزمالك · 0 EGP'}
                  </div>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Demo Tab Navigation */}
        <nav className="mt-3 pt-2 border-t border-[#242832] grid grid-cols-4 gap-1">
          {[
            { id: 'pass' as const, icon: QrCode, label: isEn ? 'Pass' : 'البطاقة' },
            { id: 'menu' as const, icon: Coffee, label: isEn ? 'Menu' : 'المنيو' },
            { id: 'ticket' as const, icon: Gift, label: isEn ? 'Ticket' : 'التذكرة' },
            { id: 'history' as const, icon: ClockCounterClockwise, label: isEn ? 'Ledger' : 'السجل' },
          ].map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`py-1.5 rounded-xl text-[10px] font-bold flex flex-col items-center gap-0.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#D4AF37]/15 text-[#F3E5AB] border border-[#D4AF37]/35'
                    : 'text-[#9BA1A6] hover:text-[#F4F5F7]'
                }`}
              >
                <Icon size={14} weight={active ? 'fill' : 'regular'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
