/**
 * See the Math Card (bigp Spec Pillar 2)
 * Interactive equation cards where every mathematical symbol is tied via
 * hover/click highlighting to its visible feature on the live curve or diagram.
 * Rule: Plain words first, technical terms second.
 */

import React, { useState } from 'react';
import { Eye, HelpCircle, Sparkles } from 'lucide-react';
import { MathSymbolSpec, ModuleSpec, VisualFeatureId } from '../types/curriculum';

interface SeeTheMathCardProps {
  module: ModuleSpec;
  lang: 'en' | 'ar';
  activeFeature: VisualFeatureId | null;
  onHoverFeature: (feature: VisualFeatureId | null) => void;
}

export const SeeTheMathCard: React.FC<SeeTheMathCardProps> = ({
  module,
  lang,
  activeFeature,
  onHoverFeature,
}) => {
  const isAr = lang === 'ar';
  const [selectedSymbol, setSelectedSymbol] = useState<MathSymbolSpec | null>(
    module.seeTheMath.equations[0]?.symbols[0] || null
  );

  const equations = module.seeTheMath.equations;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{isAr ? 'افهم الرياضيات بصرياً' : 'See the Math'}</span>
              <span className="text-[10px] text-cyan-400 font-mono font-normal">
                {isAr ? '(مرر على أي رمز لتمييزه على الرسم)' : '(Hover any symbol to trace on chart)'}
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* Equations list */}
      <div className="space-y-4">
        {equations.map((eq) => (
          <div key={eq.id} className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>{isAr ? eq.labelAr : eq.labelEn}</span>
            </div>

            {/* Main equation display */}
            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center justify-center text-center overflow-x-auto">
              <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-cyan-300">
                {eq.displayMath}
              </span>
            </div>

            {/* Interactive symbol pills */}
            <div className="mt-3 flex flex-wrap gap-2">
              {eq.symbols.map((sym) => {
                const isActive =
                  activeFeature === sym.linkedFeature || selectedSymbol?.symbol === sym.symbol;

                return (
                  <button
                    key={sym.symbol}
                    onMouseEnter={() => {
                      onHoverFeature(sym.linkedFeature);
                      setSelectedSymbol(sym);
                    }}
                    onMouseLeave={() => {
                      onHoverFeature(null);
                    }}
                    onClick={() => {
                      setSelectedSymbol(sym);
                      onHoverFeature(sym.linkedFeature);
                    }}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950 scale-102'
                        : 'bg-slate-800/70 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    <span className="font-mono font-bold text-cyan-300 text-sm">{sym.symbol}</span>
                    <span className="text-slate-400 text-[11px] group-hover:text-slate-200">
                      {isAr ? sym.plainNameAr : sym.plainNameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Symbol Explanation Drawer */}
      {selectedSymbol && (
        <div className="mt-3.5 p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-800/40 animate-fadeIn">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-base font-extrabold text-cyan-300">
                  {selectedSymbol.symbol}
                </span>
                <span className="text-xs font-bold text-white">
                  {isAr ? selectedSymbol.plainNameAr : selectedSymbol.plainNameEn}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {isAr ? selectedSymbol.techTermAr : selectedSymbol.techTermEn}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isAr ? selectedSymbol.descriptionAr : selectedSymbol.descriptionEn}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1 text-[11px] text-cyan-400 font-medium bg-cyan-950/80 px-2 py-1 rounded border border-cyan-800/60">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{isAr ? 'مُضاء على المخطط' : 'Highlighted on chart'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
