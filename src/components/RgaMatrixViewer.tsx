/**
 * Bristol RGA & Decoupling Matrix Viewer Component (bigp Milestone 3: Module 12)
 * Interactive 2x2 Bristol Relative Gain Array, pairing recommendation rules,
 * dynamic decoupler matrix calculator, and MPC prediction horizon preview.
 */

import React from 'react';
import { RgaAnalysis } from '../types/engine';
import { Network, ArrowRightLeft, ShieldCheck, AlertTriangle, Layers } from 'lucide-react';

interface RgaMatrixViewerProps {
  analysis?: RgaAnalysis;
  decouplerEnabled?: boolean;
  onToggleDecoupler?: (enabled: boolean) => void;
  activeFeature?: string | null;
  lang: 'en' | 'ar';
}

export const RgaMatrixViewer: React.FC<RgaMatrixViewerProps> = ({
  analysis,
  decouplerEnabled = false,
  onToggleDecoupler,
  activeFeature,
  lang,
}) => {
  const isAr = lang === 'ar';

  const defaultAnalysis: RgaAnalysis = {
    lambda11: 1.25,
    lambda12: -0.25,
    lambda21: -0.25,
    lambda22: 1.25,
    recommendedPairing: 'straight',
  };

  const rga = analysis || defaultAnalysis;
  const { lambda11, lambda12, lambda21, lambda22, recommendedPairing, pairingWarning, pairingWarningAr } = rga;

  const isRgaHighlighted = activeFeature === 'rgaMatrix';
  const isDecouplerHighlighted = activeFeature === 'decouplerMatrix';

  // Determine cell color
  const getCellColor = (val: number, isDiagonal: boolean) => {
    if (val < 0) return 'bg-rose-500/20 border-rose-500/50 text-rose-300';
    if (isDiagonal) {
      if (val >= 0.7 && val <= 1.5) return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold';
      return 'bg-amber-500/20 border-amber-500/50 text-amber-300';
    } else {
      if (Math.abs(val) < 0.3) return 'bg-slate-800/60 border-slate-700 text-slate-300';
      return 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300';
    }
  };

  return (
    <div
      className={`bg-slate-900/90 rounded-2xl border transition-all ${
        isRgaHighlighted || isDecouplerHighlighted
          ? 'border-indigo-400/80 shadow-lg shadow-indigo-500/20'
          : 'border-slate-800'
      } p-4 shadow-lg flex flex-col justify-between`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
              {isAr ? 'مصفوفة التفاعل النسبي لبريستول (RGA)' : 'Bristol Relative Gain Array (RGA)'}
            </h3>
            <p className="text-[10px] text-slate-400">
              {isAr
                ? 'Λ = G(0) ⊗ (G(0)^-1)^T — قياس التداخل بين الحلقات'
                : 'Λ = G(0) ⊗ (G(0)^-1)^T — Multivariable loop interaction metric'}
            </p>
          </div>
        </div>

        {/* Recommended Pairing Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${
              recommendedPairing === 'straight'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            {recommendedPairing === 'straight'
              ? isAr
                ? 'الربط المباشر الموصى به: (u1→y1, u2→y2)'
                : 'Diagonal Pairing: (u1→y1, u2→y2)'
              : isAr
              ? 'الربط العكسي الموصى به: (u1→y2, u2→y1)'
              : 'Cross Pairing: (u1→y2, u2→y1)'}
          </span>
        </div>
      </div>

      {/* Main Grid: 2x2 Matrix & Decoupler Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        {/* 2x2 RGA Matrix Card */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-300">
              {isAr ? 'مصفوفة Λ (عناصر الكسب النسبي):' : 'Bristol Matrix (Λ):'}
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              λ11 + λ12 = 1.0
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-center text-xs">
            <div
              className={`p-2.5 rounded-lg border transition-all ${getCellColor(
                lambda11,
                true
              )}`}
            >
              <span className="text-[9px] block text-slate-400">λ11 (u1 → y1)</span>
              <span className="text-sm font-bold">{lambda11}</span>
            </div>
            <div
              className={`p-2.5 rounded-lg border transition-all ${getCellColor(
                lambda12,
                false
              )}`}
            >
              <span className="text-[9px] block text-slate-400">λ12 (u2 → y1)</span>
              <span className="text-sm font-bold">{lambda12}</span>
            </div>
            <div
              className={`p-2.5 rounded-lg border transition-all ${getCellColor(
                lambda21,
                false
              )}`}
            >
              <span className="text-[9px] block text-slate-400">λ21 (u1 → y2)</span>
              <span className="text-sm font-bold">{lambda21}</span>
            </div>
            <div
              className={`p-2.5 rounded-lg border transition-all ${getCellColor(
                lambda22,
                true
              )}`}
            >
              <span className="text-[9px] block text-slate-400">λ22 (u2 → y2)</span>
              <span className="text-sm font-bold">{lambda22}</span>
            </div>
          </div>

          {/* Pairing warning if negative */}
          {(pairingWarning || pairingWarningAr) && (
            <div className="mt-2 p-1.5 bg-rose-500/10 border border-rose-500/30 rounded text-[10px] text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? pairingWarningAr : pairingWarning}</span>
            </div>
          )}
        </div>

        {/* Dynamic Decoupling & MPC Panel */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                {isAr ? 'فك الارتباط الديناميكي (Decoupler)' : 'Dynamic Decoupling Matrix'}
              </span>

              {onToggleDecoupler && (
                <button
                  type="button"
                  onClick={() => onToggleDecoupler(!decouplerEnabled)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    decouplerEnabled
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm shadow-indigo-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {decouplerEnabled
                    ? isAr
                      ? 'مفعل (Decoupled)'
                      : 'Decoupler ON'
                    : isAr
                    ? 'معطل (Coupled)'
                    : 'Decoupler OFF'}
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
              {isAr
                ? 'يحقن إشارة مضادة فورية D12 = -G12/G11 لإلغاء أي اضطراب تسببه حركة الصمام 2 في الخزان 1.'
                : 'Injects counter-signals D12 = -G12/G11 and D21 = -G21/G22 to cancel cross-talk interference.'}
            </p>
          </div>

          {/* MPC Horizon Preview Graphic */}
          <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-bold text-indigo-300">
                <Layers className="w-3 h-3" />
                {isAr ? 'أفق تنبؤ التحكم التنبئي (MPC Horizon)' : 'MPC Prediction Horizon (Hp)'}
              </span>
              <span className="font-mono text-cyan-400 text-[9px]">Hp = 10 steps</span>
            </div>

            {/* Visual Horizon Strip */}
            <div className="relative h-6 bg-slate-950 rounded flex items-center px-2 overflow-hidden border border-slate-800/60">
              <div className="w-1/3 h-1.5 bg-emerald-500 rounded-full" title="Past trajectory" />
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow shadow-cyan-400/50 mx-1" title="Current time t" />
              <div
                className="flex-1 h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-500 to-transparent rounded-full border border-indigo-400/30"
                title="Predicted future trajectory"
              />
              <span className="text-[9px] font-mono text-slate-400 ml-2">t → t+Hp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
