/**
 * See the Math Card (bigp Spec Pillar 2)
 * Clean, light-themed equation cards with hover-to-trace link and plain language explanations.
 */

import React, { useState } from 'react';
import { Eye } from 'lucide-react';
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
  const equations = module.seeTheMath.equations;
  const [selectedSymbol, setSelectedSymbol] = useState<MathSymbolSpec | null>(
    equations[0]?.symbols[0] || null
  );

  return (
    <div className="panel-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{isAr ? 'افهم الرياضيات بصرياً' : 'See the Math'}</span>
              <span className="text-[10px] text-cyan-600 font-mono font-medium">
                {isAr ? '(مرر على أي رمز لتمييزه على المخطط)' : '(Hover symbol to trace on chart)'}
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* Equations */}
      <div className="space-y-4">
        {equations.map((eq) => (
          <div key={eq.id} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>{isAr ? eq.labelAr : eq.labelEn}</span>
            </div>

            {/* Main equation display */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-center overflow-x-auto shadow-xs">
              <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-cyan-700">
                {eq.displayMath}
              </span>
            </div>

            {/* Interactive Symbols Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {eq.symbols.map((sym, sIdx) => {
                const isHovered = activeFeature === sym.linkedFeature;
                return (
                  <div
                    key={sIdx}
                    onMouseEnter={() => {
                      setSelectedSymbol(sym);
                      onHoverFeature(sym.linkedFeature);
                    }}
                    onMouseLeave={() => {
                      onHoverFeature(null);
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all duration-200 ${
                      isHovered
                        ? 'bg-cyan-50 border-cyan-400 shadow-sm scale-[1.01]'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded border border-cyan-200 text-xs">
                        {sym.symbol}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]">
                        {isAr ? sym.techTermAr : sym.techTermEn}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs mb-1">
                      {isAr ? sym.plainNameAr : sym.plainNameEn}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {isAr ? sym.descriptionAr : sym.descriptionEn}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
