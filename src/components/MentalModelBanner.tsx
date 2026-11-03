/**
 * Mental Model Banner (bigp Spec Pillar 1)
 * Clean, high-contrast engineering light banner.
 */

import React, { useState } from 'react';
import { Lightbulb, Sparkles, ChevronDown, ChevronUp, Compass } from 'lucide-react';
import { ModuleSpec } from '../types/curriculum';

interface MentalModelBannerProps {
  module: ModuleSpec;
  lang: 'en' | 'ar';
}

export const MentalModelBanner: React.FC<MentalModelBannerProps> = ({ module, lang }) => {
  const [showAnalogy, setShowAnalogy] = useState(false);
  const isAr = lang === 'ar';

  const sentence = isAr ? module.mentalModel.sentenceAr : module.mentalModel.sentenceEn;
  const analogy = isAr ? module.mentalModel.keyAnalogyAr : module.mentalModel.keyAnalogyEn;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-50/70 via-sky-50/40 to-slate-50 border border-cyan-200/80 p-5 shadow-xs transition-all duration-300">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-100 to-sky-100 border border-cyan-300 flex items-center justify-center text-cyan-700 shrink-0 shadow-xs">
            <Lightbulb className="w-6 h-6 text-amber-500 animate-subtle-float" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-600" />
                {isAr ? 'النموذج الذهني الأساسي' : 'Intuition & Mental Model'}
              </span>
              <span className="text-xs text-slate-500 font-mono font-medium">
                {isAr ? `الوحدة ${module.number} من 14` : `Module ${module.number} of 14`}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight leading-relaxed">
              “{sentence}”
            </h2>
          </div>
        </div>

        {/* Real-world analogy expander */}
        <div className="shrink-0 self-end md:self-center">
          <button
            onClick={() => setShowAnalogy(!showAnalogy)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition-all shadow-xs"
          >
            <span>{isAr ? 'التشبيه الواقعي' : 'Real-World Analogy'}</span>
            {showAnalogy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-cyan-600" />}
          </button>
        </div>
      </div>

      {/* Expanded analogy card */}
      {showAnalogy && (
        <div className="mt-4 pt-4 border-t border-cyan-200/60 flex items-start gap-3 bg-white/80 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
          <Compass className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
          <p>{analogy}</p>
        </div>
      )}
    </div>
  );
};
