import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import { PitchConceptId, PitchLang, getBrandDisplay } from '../components/pitch/pitchData';
import { ConceptEditorial } from '../components/pitch/ConceptEditorial';
import { ConceptKeynote } from '../components/pitch/ConceptKeynote';
import { ConceptExecutive } from '../components/pitch/ConceptExecutive';

export const PitchPresentationPage: React.FC = () => {
  const [concept, setConcept] = useState<PitchConceptId>(1);
  const [lang, setLang] = useState<PitchLang>('ar');
  const [clientName, setClientName] = useState('');

  const brandDisplay = getBrandDisplay(clientName, lang);
  const isEn = lang === 'en';
  const BackIcon = isEn ? ArrowRight : ArrowLeft;

  useEffect(() => {
    const prevDir = document.documentElement.dir || 'rtl';
    document.documentElement.dir = isEn ? 'ltr' : 'rtl';
    return () => {
      document.documentElement.dir = prevDir;
    };
  }, [isEn]);

  return (
    <div dir={isEn ? 'ltr' : 'rtl'} className="min-h-screen font-body">
      <style>{`
        @keyframes pitchFlowDash {
          to { stroke-dashoffset: -24; }
        }
        .pitch-flow-line {
          animation: pitchFlowDash 0.9s linear infinite;
        }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Sticky Controls Header (Hidden when Printing / Exporting PDF) */}
      <header className="no-print sticky top-0 z-50 bg-[#0B0F19]/95 backdrop-blur-md text-slate-100 border-b border-white/10 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Concept Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-300 me-1 hidden sm:inline">
              {isEn ? 'Pitch Style:' : 'نموذج العرض:'}
            </span>
            <div className="inline-flex flex-wrap p-1 rounded-xl bg-[#131B2E] border border-white/10 gap-1">
              {[
                { id: 1 as const, label: isEn ? '1 · Editorial Report (PDF)' : '1 · التقرير الفخم (PDF)' },
                { id: 2 as const, label: isEn ? '2 · Apple Keynote Obsidian' : '2 · سينما داكن (Keynote)' },
                { id: 3 as const, label: isEn ? '3 · SaaS Executive (Madar)' : '3 · واجهة SaaS تنفيذية' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setConcept(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    concept === c.id
                      ? 'bg-[#4F46E5] text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Client Customizer + Lang + Print */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={isEn ? 'Cafe name (e.g. GEFFO)...' : 'اسم الكافيه (مثال: GEFFO)...'}
              aria-label={isEn ? 'Client cafe name' : 'اسم الكافيه العميل'}
              className="w-44 sm:w-52 rounded-lg bg-[#131B2E] border border-white/15 px-3 py-1.5 text-xs text-white placeholder:text-slate-400 outline-none focus:border-[#6366F1]"
            />

            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
              className="px-3 py-1.5 rounded-lg bg-[#131B2E] border border-white/15 text-xs font-bold hover:border-[#6366F1] cursor-pointer"
            >
              {isEn ? 'عربي' : 'EN'}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={14} weight="bold" />
              <span>{isEn ? 'Print / PDF' : 'طباعة / PDF'}</span>
            </button>

            <a
              href="/customer-concepts.html?v=obsidian2"
              className="px-3 py-1.5 rounded-lg bg-[#131B2E] border border-white/15 text-xs font-bold text-slate-200 hover:border-[#6366F1] inline-flex items-center gap-1"
            >
              <span>{isEn ? 'App Preview' : 'معاينة الموبايل'}</span>
              <BackIcon size={13} />
            </a>
          </div>
        </div>
      </header>

      {/* Active Concept Canvas */}
      <AnimatePresence mode="wait">
        <motion.main
          key={concept}
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          {concept === 1 && <ConceptEditorial lang={lang} brandName={brandDisplay} />}
          {concept === 2 && <ConceptKeynote lang={lang} brandName={brandDisplay} />}
          {concept === 3 && <ConceptExecutive lang={lang} brandName={brandDisplay} />}
        </motion.main>
      </AnimatePresence>
    </div>
  );
};

export default PitchPresentationPage;
