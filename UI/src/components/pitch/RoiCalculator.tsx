import React, { useState } from 'react';
import { Sliders, TrendUp } from '@phosphor-icons/react';
import { PitchLang } from './pitchData';

interface RoiCalculatorProps {
  lang: PitchLang;
  theme: 'editorial' | 'obsidian' | 'executive';
}

export const RoiCalculator: React.FC<RoiCalculatorProps> = ({ lang, theme }) => {
  const [avgTicket, setAvgTicket] = useState(180);
  const [returningGuests, setReturningGuests] = useState(60);

  const isEn = lang === 'en';
  const extraMonthlyEgp = avgTicket * returningGuests * 2;
  const starterFee = 1000;
  const roiMultiple = Math.max(1, Math.round(extraMonthlyEgp / starterFee));

  const wrapperCls =
    theme === 'obsidian'
      ? 'bg-[#15181E] border-[#242832] text-[#F4F5F7]'
      : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_14px_34px_-16px_rgba(15,23,42,0.12)]';

  const panelCls =
    theme === 'obsidian'
      ? 'bg-[#1C2029] border-[#242832]'
      : theme === 'editorial'
        ? 'bg-[#F5F3EE] border-[#E5DEC9]'
        : 'bg-slate-50 border-slate-200/80';

  const accentText =
    theme === 'obsidian'
      ? 'text-[#00C896]'
      : theme === 'editorial'
        ? 'text-[#0F5E4A]'
        : 'text-[#059669]';

  const mutedText = theme === 'obsidian' ? 'text-[#9BA1A6]' : 'text-slate-600';

  return (
    <div className={`rounded-3xl border p-6 sm:p-8 ${wrapperCls}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${accentText}`}>
            <Sliders size={14} weight="bold" />
            {isEn ? 'Egyptian Cafe ROI Calculator' : 'حاسبة العائد المتوقع (بالجنيه المصري)'}
          </span>
          <h3 className="text-xl sm:text-2xl font-bold mt-1">
            {isEn
              ? 'See how two extra visits per regular pay for the system'
              : 'احسب بنفسك مكسب الكافيه من رجوع الزبون زيارتين زيادة فقط'}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Sliders */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div>
            <div className="flex items-center justify-between text-sm font-bold mb-2">
              <span>{isEn ? 'Average Customer Ticket' : 'متوسط قيمة الطلب الواحد'}</span>
              <span className="font-mono text-base" dir="ltr">{avgTicket} EGP</span>
            </div>
            <input
              type="range"
              min={80}
              max={400}
              step={10}
              value={avgTicket}
              onChange={(e) => setAvgTicket(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm font-bold mb-2">
              <span>{isEn ? 'Regulars Returning +2 Extra Visits / Mo' : 'عدد الزباين العائدين (+2 زيارة في الشهر)'}</span>
              <span className="font-mono text-base" dir="ltr">{returningGuests}</span>
            </div>
            <input
              type="range"
              min={20}
              max={300}
              step={10}
              value={returningGuests}
              onChange={(e) => setReturningGuests(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Result Box */}
        <div className={`lg:col-span-5 rounded-2xl border p-5 flex flex-col gap-3 ${panelCls}`}>
          <div className={`text-xs font-bold inline-flex items-center gap-1.5 ${mutedText}`}>
            <TrendUp size={15} className={accentText} weight="bold" />
            {isEn ? 'Estimated Monthly Revenue Uplift' : 'مبيعات إضافية تقديرية شهرياً'}
          </div>
          <div className={`font-mono text-3xl sm:text-4xl font-bold ${accentText}`} dir="ltr">
            +{extraMonthlyEgp.toLocaleString()} EGP
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-current/10 text-xs">
            <div>
              <div className={mutedText}>{isEn ? 'Annualized Impact' : 'التأثير السنوي'}</div>
              <div className="font-mono font-bold mt-0.5" dir="ltr">
                {(extraMonthlyEgp * 12).toLocaleString()} EGP
              </div>
            </div>
            <div>
              <div className={mutedText}>{isEn ? 'vs ~1,000 EGP Plan' : 'مقارنة باشتراك 1,000 ج.م'}</div>
              <div className={`font-mono font-bold mt-0.5 ${accentText}`} dir="ltr">
                {roiMultiple}x ROI
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
