/**
 * MetricsPanel Evaluator & Relay Autotuner Component (bigp Milestone 2)
 * Features:
 * - Live and Post-Run Performance Scorecard:
 *   - IAE: Integral of Absolute Error
 *   - Overshoot %
 *   - Rise Time (10% to 90%)
 *   - Settling Time (±2% band)
 *   - Valve Chatter / Wear Index (Cumulative travel)
 * - Åström–Hägglund Relay Autotuner:
 *   - Limit cycle period Pu & gain Ku
 *   - Tuning Rule Picker: Ziegler-Nichols, Cohen-Coon, IMC (with Lambda slider)
 *   - One-click "Apply Tunings to PID"
 */

import React, { useState } from 'react';
import {
  Activity,
  Award,
  Zap,
  Sliders,
  CheckCircle,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface MetricsPanelProps {
  metrics: {
    iae: number;
    ise: number;
    currentError: number;
    peakOvershootPct: number;
    riseTime?: number;
    settlingTime?: number;
    steadyStateOffsetPct?: number;
    inToleranceRatio: number;
    valveTravelTotal: number;
  };
  autotuneState?: {
    active: boolean;
    step: 'idle' | 'tracking' | 'done';
    pu?: number;
    ku?: number;
    suggestedParams?: {
      kc: number;
      ti: number;
      td: number;
    };
  };
  onStartAutotune?: () => void;
  onStopAutotune?: () => void;
  onApplyTuning?: (params: { kc: number; ti: number; td: number }) => void;
  lang: 'en' | 'ar';
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  autotuneState,
  onStartAutotune,
  onStopAutotune,
  onApplyTuning,
  lang,
}) => {
  const isAr = lang === 'ar';

  const [selectedRule, setSelectedRule] = useState<'zn' | 'cc' | 'imc'>('zn');
  const [imcLambda, setImcLambda] = useState<number>(3.0);

  // Compute tuning rules based on autotune Pu and Ku (or defaults)
  const Pu = autotuneState?.pu ?? 8.0;
  const Ku = autotuneState?.ku ?? 4.2;

  // Approximate FOPDT params from relay test: K ~ 1.5, tau ~ Pu / 2, theta ~ Pu / 4
  const estK = 1.5;
  const estTau = Pu * 0.5;
  const estTheta = Pu * 0.25;

  let calculatedKc = 0;
  let calculatedTi = 0;
  let calculatedTd = 0;

  if (selectedRule === 'zn') {
    // Ziegler-Nichols PID
    calculatedKc = +(0.6 * Ku).toFixed(2);
    calculatedTi = +(0.5 * Pu).toFixed(2);
    calculatedTd = +(0.125 * Pu).toFixed(2);
  } else if (selectedRule === 'cc') {
    // Cohen-Coon
    const r = estTheta / Math.max(0.1, estTau);
    calculatedKc = +((1 / estK) * (estTau / estTheta) * (4 / 3 + r / 4)).toFixed(2);
    calculatedTi = +(estTheta * ((32 + 6 * r) / (13 + 8 * r))).toFixed(2);
    calculatedTd = +(estTheta * (4 / (11 + 2 * r))).toFixed(2);
  } else {
    // IMC / Lambda Tuning (Robust, smooth response)
    calculatedKc = +(estTau / (estK * (imcLambda + estTheta))).toFixed(2);
    calculatedTi = +estTau.toFixed(2);
    calculatedTd = 0;
  }

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              {isAr ? 'لوحة قياس الأداء وضبط الحلقات' : 'Control Metrics & Autotuner'}
            </h4>
          </div>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          IAE: {metrics.iae.toFixed(0)}
        </span>
      </div>

      {/* 1. Performance Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        {/* IAE */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 block text-[10px] mb-0.5">
            {isAr ? 'تكامل الخطأ IAE' : 'IAE (∫|e|dt)'}
          </span>
          <span className="text-base font-bold text-cyan-300">{metrics.iae.toFixed(1)}</span>
        </div>

        {/* Overshoot */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 block text-[10px] mb-0.5">
            {isAr ? 'نسبة التجاوز %' : 'Peak Overshoot'}
          </span>
          <span
            className={`text-base font-bold ${
              metrics.peakOvershootPct > 20 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {metrics.peakOvershootPct.toFixed(1)}%
          </span>
        </div>

        {/* Rise Time */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 block text-[10px] mb-0.5">
            {isAr ? 'زمن الصعود tr' : 'Rise Time (tr)'}
          </span>
          <span className="text-base font-bold text-slate-200">
            {metrics.riseTime !== undefined ? `${metrics.riseTime.toFixed(1)}s` : '--'}
          </span>
        </div>

        {/* Settling Time */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 block text-[10px] mb-0.5">
            {isAr ? 'زمن الاستقرار ts' : 'Settling (±2%)'}
          </span>
          <span className="text-base font-bold text-slate-200">
            {metrics.settlingTime !== undefined ? `${metrics.settlingTime.toFixed(1)}s` : '--'}
          </span>
        </div>
      </div>

      {/* Valve Wear & Chatter Alert */}
      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300">
            {isAr ? 'مؤشر اهتزاز الصمام (Valve Chatter):' : 'Cumulative Valve Chatter Index:'}
          </span>
        </div>
        <span
          className={`font-bold ${
            metrics.valveTravelTotal > 150 ? 'text-rose-400 animate-pulse' : 'text-slate-200'
          }`}
        >
          {metrics.valveTravelTotal.toFixed(0)} Δu
        </span>
      </div>

      {/* 2. Åström–Hägglund Relay Autotuner Section */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-800/50 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-white">
              {isAr ? 'المعاير الآلي للتغذية المرحلية (Relay Autotune)' : 'Relay Feedback Autotuner'}
            </span>
          </div>

          {onStartAutotune && (
            <button
              onClick={autotuneState?.active ? onStopAutotune : onStartAutotune}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 shadow-md ${
                autotuneState?.active
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>
                {autotuneState?.active
                  ? isAr ? 'إيقاف المعايرة' : 'Stop Autotune'
                  : isAr ? 'تشغيل المعايرة التلقائية' : 'Run Relay Autotune'}
              </span>
            </button>
          )}
        </div>

        {/* Limit cycle measurements */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">
              {isAr ? 'الدورة النهائية Pu:' : 'Ultimate Period (Pu):'}
            </span>
            <span className="font-bold text-cyan-300">{Pu.toFixed(2)} s</span>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">
              {isAr ? 'الكسب النهائي Ku:' : 'Ultimate Gain (Ku):'}
            </span>
            <span className="font-bold text-emerald-300">{Ku.toFixed(2)}</span>
          </div>
        </div>

        {/* Tuning Rule Picker */}
        <div className="space-y-2 pt-1 border-t border-indigo-900/40 text-xs">
          <span className="text-slate-400 text-[11px] block">
            {isAr ? 'اختر طريقة الضبط الحسابية:' : 'Select PID Tuning Method:'}
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setSelectedRule('zn')}
              className={`p-1.5 rounded-lg border font-mono text-[10px] font-bold transition-colors ${
                selectedRule === 'zn'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Ziegler-Nichols
            </button>
            <button
              onClick={() => setSelectedRule('cc')}
              className={`p-1.5 rounded-lg border font-mono text-[10px] font-bold transition-colors ${
                selectedRule === 'cc'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Cohen-Coon
            </button>
            <button
              onClick={() => setSelectedRule('imc')}
              className={`p-1.5 rounded-lg border font-mono text-[10px] font-bold transition-colors ${
                selectedRule === 'imc'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              IMC / Lambda
            </button>
          </div>

          {/* IMC Lambda speed slider */}
          {selectedRule === 'imc' && (
            <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">{isAr ? 'زمن الاستجابة المغلقة λ:' : 'Lambda Speed (λ):'}</span>
                <span className="text-cyan-300 font-bold">{imcLambda.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={imcLambda}
                onChange={(e) => setImcLambda(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* Calculated Suggested Tunings */}
          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-sky-300 font-bold">Kc: {calculatedKc}</span>
              <span className="text-emerald-300 font-bold">τI: {calculatedTi}s</span>
              <span className="text-pink-300 font-bold">τD: {calculatedTd}s</span>
            </div>

            {onApplyTuning && (
              <button
                onClick={() =>
                  onApplyTuning({ kc: calculatedKc, ti: calculatedTi, td: calculatedTd })
                }
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow"
              >
                <span>{isAr ? 'تطبيق على المتحكم' : 'Apply to PID'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
