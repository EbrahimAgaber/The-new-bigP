/**
 * Mental Model Banner (bigp Spec Pillar 1)
 * High-contrast, memorable banner sentence that makes the core intuition "click".
 */

import React, { useState } from 'react';
import { Lightbulb, Info, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-800/40 p-4 sm:p-5 shadow-lg shadow-cyan-950/20">
      {/* Background visual motif */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-900/40">
            <Lightbulb className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                {isAr ? 'النموذج الذهني الأساسي' : 'Core Mental Model'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {isAr ? `الوحدة ${module.number}` : `Module ${module.number}`}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
              “{sentence}”
            </h2>
          </div>
        </div>

        {/* Real-world analogy expander */}
        <div className="shrink-0 self-end md:self-center">
          <button
            onClick={() => setShowAnalogy(!showAnalogy)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'مثال من واقع الحياة' : 'Real-Life Analogy'}</span>
            {showAnalogy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {showAnalogy && (
        <div className="mt-3.5 pt-3 border-t border-cyan-800/30 text-xs sm:text-sm text-slate-300 flex items-start gap-2.5 animate-fadeIn">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-slate-300 italic">{analogy}</p>
        </div>
      )}
    </div>
  );
};
