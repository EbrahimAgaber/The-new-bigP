/**
 * Bode Plot Viewer Component (bigp Milestone 3: Module 9 Stability Intuition)
 * Interactive logarithmic frequency response display (Magnitude dB & Phase Deg).
 * Highlights Phase Crossover (w180), Gain Margin (GM), Gain Crossover (wC), Phase Margin (PM),
 * and computes Ultimate Gain (Ku) and Ultimate Period (Pu).
 */

import React, { useState } from 'react';
import { BodeAnalysis } from '../types/engine';
import { Activity, ShieldCheck, AlertTriangle, ShieldAlert, Waves } from 'lucide-react';

interface BodeViewerProps {
  analysis?: BodeAnalysis;
  activeFeature?: string | null;
  lang: 'en' | 'ar';
  onHoverFreq?: (omega: number | null) => void;
}

export const BodeViewer: React.FC<BodeViewerProps> = ({
  analysis,
  activeFeature,
  lang,
  onHoverFreq,
}) => {
  const isAr = lang === 'ar';
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!analysis || !analysis.points || analysis.points.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-500 text-xs">
        {isAr ? 'جاري حساب استجابة التردد المفتوحة (Bode)...' : 'Computing open-loop frequency response (Bode)...'}
      </div>
    );
  }

  const { points, omega180, omegaC, gainMarginDb, phaseMarginDeg, ultimateGain, ultimatePeriod, isStable } = analysis;

  const width = 560;
  const magHeight = 130;
  const phaseHeight = 130;
  const pad = { top: 15, right: 25, bottom: 25, left: 45 };

  const minLogW = Math.log10(points[0].omega);
  const maxLogW = Math.log10(points[points.length - 1].omega);

  const scaleX = (w: number) => {
    const logW = Math.log10(Math.max(1e-4, w));
    return pad.left + ((logW - minLogW) / (maxLogW - minLogW)) * (width - pad.left - pad.right);
  };

  // Magnitude Y scale: -40 dB to +40 dB
  const minDb = -40;
  const maxDb = 40;
  const scaleMagY = (db: number) => {
    const clamped = Math.max(minDb, Math.min(maxDb, db));
    return pad.top + ((maxDb - clamped) / (maxDb - minDb)) * (magHeight - pad.top - pad.bottom);
  };

  // Phase Y scale: -270 deg to 0 deg
  const minPhase = -270;
  const maxPhase = 0;
  const scalePhaseY = (deg: number) => {
    const clamped = Math.max(minPhase, Math.min(maxPhase, deg));
    return pad.top + ((maxPhase - clamped) / (maxPhase - minPhase)) * (phaseHeight - pad.top - pad.bottom);
  };

  // Build SVG path for Magnitude
  const magPath = points.reduce((acc, pt, idx) => {
    const x = scaleX(pt.omega);
    const y = scaleMagY(pt.magDb);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Build SVG path for Phase
  const phasePath = points.reduce((acc, pt, idx) => {
    const x = scaleX(pt.omega);
    const y = scalePhaseY(pt.phaseDeg);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const isBodeHighlighted = activeFeature === 'bodeMargins';

  // Stability status styling
  const stabilityBadge = isStable ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
      <ShieldCheck className="w-3 h-3" />
      {isAr ? 'حلقة مستقرة (Stable)' : 'Stable Closed Loop'}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[10px]">
      <ShieldAlert className="w-3 h-3" />
      {isAr ? 'حلقة غير مستقرة (Unstable!)' : 'Unstable Feedback Runaway!'}
    </span>
  );

  return (
    <div className={`bg-white rounded-2xl border transition-all ${
      isBodeHighlighted ? 'border-cyan-400/80 shadow-lg shadow-cyan-500/20' : 'border-slate-200'
    } p-4 shadow-lg flex flex-col justify-between`}>
      {/* Header with Stability Verdict and Key Metrics */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              {isAr ? 'مخطط بودي لاستقرار المنظومة (Bode Plot)' : 'Open-Loop Bode Stability Analyzer'}
              {stabilityBadge}
            </h3>
            <p className="text-[10px] text-slate-500">
              {isAr ? 'L(jω) = Gc(jω)·Gp(jω)e^(-jωθ)' : 'L(jω) = Gc(jω)·Gp(jω)e^(-jωθ)'}
            </p>
          </div>
        </div>

        {/* Live Stability Metrics HUD */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="bg-slate-50 px-2 py-1 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] block">{isAr ? 'هامش الكسب (GM)' : 'Gain Margin (GM)'}</span>
            <span className={`font-bold ${
              gainMarginDb === undefined || gainMarginDb < 2
                ? 'text-rose-400'
                : gainMarginDb < 6
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}>
              {gainMarginDb !== undefined ? `${gainMarginDb} dB` : '∞'}
            </span>
          </div>

          <div className="bg-slate-50 px-2 py-1 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] block">{isAr ? 'هامش الطور (PM)' : 'Phase Margin (PM)'}</span>
            <span className={`font-bold ${
              phaseMarginDeg === undefined || phaseMarginDeg < 20
                ? 'text-rose-400'
                : phaseMarginDeg < 45
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}>
              {phaseMarginDeg !== undefined ? `${phaseMarginDeg}°` : '—'}
            </span>
          </div>

          <div className="bg-slate-50 px-2 py-1 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] block">{isAr ? 'الكسب الحرج (Ku)' : 'Ultimate Gain (Ku)'}</span>
            <span className="font-bold text-sky-700">
              {ultimateGain !== undefined ? ultimateGain : '—'}
            </span>
          </div>

          <div className="bg-slate-50 px-2 py-1 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] block">{isAr ? 'الدور الحرج (Pu)' : 'Ultimate Period (Pu)'}</span>
            <span className="font-bold text-amber-800">
              {ultimatePeriod !== undefined ? `${ultimatePeriod} s` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Strip Charts */}
      <div className="relative my-2 w-full flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${magHeight + phaseHeight + 10}`}
          className="w-full max-w-[620px] h-auto select-none"
        >
          {/* DEFINITIONS & GRADIENTS */}
          <defs>
            <linearGradient id="bodeMagGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="bodePhaseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* ================= PANE 1: MAGNITUDE (dB) ================= */}
          <g>
            {/* Grid & Background */}
            <rect x={pad.left} y={pad.top} width={width - pad.left - pad.right} height={magHeight - pad.top - pad.bottom} fill="#090d16" rx="6" />

            {/* 0 dB reference line */}
            <line
              x1={pad.left}
              y1={scaleMagY(0)}
              x2={width - pad.right}
              y2={scaleMagY(0)}
              stroke="#64748b"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text x={pad.left - 6} y={scaleMagY(0) + 3} textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              0 dB
            </text>

            {/* Grid lines for +20dB and -20dB */}
            <line x1={pad.left} y1={scaleMagY(20)} x2={width - pad.right} y2={scaleMagY(20)} stroke="#1e293b" strokeWidth="1" />
            <text x={pad.left - 6} y={scaleMagY(20) + 3} textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">+20</text>
            <line x1={pad.left} y1={scaleMagY(-20)} x2={width - pad.right} y2={scaleMagY(-20)} stroke="#1e293b" strokeWidth="1" />
            <text x={pad.left - 6} y={scaleMagY(-20) + 3} textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">-20</text>

            {/* Decade frequency vertical lines */}
            {[0.1, 1.0, 10.0].map((f) => (
              <g key={`f-grid-${f}`}>
                <line x1={scaleX(f)} y1={pad.top} x2={scaleX(f)} y2={magHeight - pad.bottom} stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
                <text x={scaleX(f)} y={pad.top + 10} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">
                  {f} rad/s
                </text>
              </g>
            ))}

            {/* Magnitude Curve */}
            <path d={magPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />

            {/* Gain Crossover wC (where magnitude = 0 dB) */}
            {omegaC && (
              <g>
                <circle cx={scaleX(omegaC)} cy={scaleMagY(0)} r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                <line x1={scaleX(omegaC)} y1={scaleMagY(0)} x2={scaleX(omegaC)} y2={magHeight + scalePhaseY(-180)} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <text x={scaleX(omegaC)} y={scaleMagY(0) - 8} textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  ωc = {omegaC}
                </text>
              </g>
            )}

            {/* Gain Margin GM bracket at omega180 */}
            {omega180 && (
              <g>
                <line x1={scaleX(omega180)} y1={pad.top} x2={scaleX(omega180)} y2={magHeight - pad.bottom} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 2" />
                {gainMarginDb !== undefined && (
                  <g>
                    {/* Vertical bracket from curve to 0dB */}
                    <line
                      x1={scaleX(omega180)}
                      y1={scaleMagY(0)}
                      x2={scaleX(omega180)}
                      y2={scaleMagY(-gainMarginDb)}
                      stroke="#f59e0b"
                      strokeWidth="3"
                    />
                    <circle cx={scaleX(omega180)} cy={scaleMagY(-gainMarginDb)} r="3.5" fill="#f59e0b" />
                    <rect x={scaleX(omega180) + 6} y={scaleMagY(-gainMarginDb / 2) - 8} width="58" height="16" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
                    <text x={scaleX(omega180) + 35} y={scaleMagY(-gainMarginDb / 2) + 4} textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      GM: {gainMarginDb}dB
                    </text>
                  </g>
                )}
              </g>
            )}

            {/* Y-axis Label */}
            <text x={pad.left + 8} y={pad.top + 14} fill="#38bdf8" fontSize="9" fontWeight="bold">
              {isAr ? 'الكسب |L(jω)| (dB)' : 'Magnitude |L(jω)| (dB)'}
            </text>
          </g>

          {/* ================= PANE 2: PHASE (DEG) ================= */}
          <g transform={`translate(0, ${magHeight + 5})`}>
            {/* Grid & Background */}
            <rect x={pad.left} y={pad.top} width={width - pad.left - pad.right} height={phaseHeight - pad.top - pad.bottom} fill="#090d16" rx="6" />

            {/* -180 deg Critical Stability Line */}
            <line
              x1={pad.left}
              y1={scalePhaseY(-180)}
              x2={width - pad.right}
              y2={scalePhaseY(-180)}
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <text x={pad.left - 6} y={scalePhaseY(-180) + 3} textAnchor="end" fill="#f43f5e" fontSize="9" fontWeight="bold" fontFamily="monospace">
              -180°
            </text>

            {/* Grid lines for -90 and 0 */}
            <line x1={pad.left} y1={scalePhaseY(-90)} x2={width - pad.right} y2={scalePhaseY(-90)} stroke="#1e293b" strokeWidth="1" />
            <text x={pad.left - 6} y={scalePhaseY(-90) + 3} textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">-90°</text>
            <line x1={pad.left} y1={scalePhaseY(0)} x2={width - pad.right} y2={scalePhaseY(0)} stroke="#1e293b" strokeWidth="1" />
            <text x={pad.left - 6} y={scalePhaseY(0) + 3} textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">0°</text>

            {/* Decade vertical lines */}
            {[0.1, 1.0, 10.0].map((f) => (
              <line key={`phase-f-${f}`} x1={scaleX(f)} y1={pad.top} x2={scaleX(f)} y2={phaseHeight - pad.bottom} stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
            ))}

            {/* Phase Curve */}
            <path d={phasePath} fill="none" stroke="#fbbf24" strokeWidth="2.5" />

            {/* Phase Crossover w180 (where phase hits -180 deg) */}
            {omega180 && (
              <g>
                <circle cx={scaleX(omega180)} cy={scalePhaseY(-180)} r="4.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                <text x={scaleX(omega180)} y={scalePhaseY(-180) + 16} textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  ω180 = {omega180}
                </text>
              </g>
            )}

            {/* Phase Margin PM bracket at omegaC */}
            {omegaC && phaseMarginDeg !== undefined && (
              <g>
                <line
                  x1={scaleX(omegaC)}
                  y1={scalePhaseY(-180)}
                  x2={scaleX(omegaC)}
                  y2={scalePhaseY(-180 + phaseMarginDeg)}
                  stroke="#10b981"
                  strokeWidth="3"
                />
                <circle cx={scaleX(omegaC)} cy={scalePhaseY(-180 + phaseMarginDeg)} r="3.5" fill="#10b981" />
                <rect x={scaleX(omegaC) + 6} y={scalePhaseY(-180 + phaseMarginDeg / 2) - 8} width="58" height="16" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                <text x={scaleX(omegaC) + 35} y={scalePhaseY(-180 + phaseMarginDeg / 2) + 4} textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  PM: {phaseMarginDeg}°
                </text>
              </g>
            )}

            {/* Y-axis Label */}
            <text x={pad.left + 8} y={pad.top + 14} fill="#fbbf24" fontSize="9" fontWeight="bold">
              {isAr ? 'الطور ∠L(jω) (درجة)' : 'Phase Angle ∠L(jω) (Deg)'}
            </text>

            {/* X-axis Frequency (rad/s) label */}
            <text x={width / 2} y={phaseHeight - 6} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              {isAr ? 'التردد الزاوي ω (rad/s) — مقياس لوغاريتمي' : 'Angular Frequency ω (rad/s) — Log Scale'}
            </text>
          </g>
        </svg>
      </div>

      {/* Educational Footer Note */}
      <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200 text-[11px] flex items-start gap-2">
        <Activity className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-slate-600">
          {isAr ? (
            <span>
              <strong className="text-slate-900">قاعدة الاستقرار الهندسية:</strong> يجب أن يعبر الكسب خط الـ 0dB (<span className="text-sky-700">ωc</span>) <strong className="text-emerald-700">قبل</strong> أن يهبط الطور تحت -180° (<span className="text-rose-600">ω180</span>). إذا أصبح الكسب موجباً عند طور -180°، تتحول التغذية الراجعة السالبة إلى موجبة وتنفجر المنظومة!
            </span>
          ) : (
            <span>
              <strong className="text-slate-900">Bode Stability Criterion:</strong> Gain must cross 0 dB (<span className="text-sky-700">ωc</span>) <strong className="text-emerald-700">before</strong> phase drops below -180° (<span className="text-rose-600">ω180</span>). If gain &gt; 0 dB at -180°, feedback inverts and self-amplifies into violent instability!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
