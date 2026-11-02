/**
 * Root Locus Viewer Component (bigp Milestone 3: Module 9 Stability Intuition)
 * Interactive complex s-plane showing closed-loop poles, stability regions,
 * damping ratio (zeta), and natural frequency (omega_n).
 */

import React, { useState } from 'react';
import { RootLocusAnalysis } from '../types/engine';
import { Crosshair, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface RootLocusViewerProps {
  analysis?: RootLocusAnalysis;
  activeFeature?: string | null;
  lang: 'en' | 'ar';
}

export const RootLocusViewer: React.FC<RootLocusViewerProps> = ({
  analysis,
  activeFeature,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [hoverPole, setHoverPole] = useState<number | null>(null);

  if (!analysis || !analysis.poles || analysis.poles.length === 0) {
    return (
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 text-center text-slate-400 text-xs">
        {isAr ? 'جاري حساب المسار الجذري (Root Locus)...' : 'Computing Root Locus in the complex s-plane...'}
      </div>
    );
  }

  const { poles, zeros, stability, dampingRatio, naturalFrequency } = analysis;

  const width = 480;
  const height = 280;
  const pad = { top: 20, right: 20, bottom: 25, left: 20 };

  // s-plane bounds: sigma from -5 to +3, j*omega from -4 to +4
  const minSigma = -5;
  const maxSigma = 3;
  const minImag = -4;
  const maxImag = 4;

  const scaleX = (sigma: number) => {
    return pad.left + ((sigma - minSigma) / (maxSigma - minSigma)) * (width - pad.left - pad.right);
  };

  const scaleY = (imag: number) => {
    return pad.top + ((maxImag - imag) / (maxImag - minImag)) * (height - pad.top - pad.bottom);
  };

  const jOmegaX = scaleX(0); // Imaginary axis position
  const realAxisY = scaleY(0); // Real axis position

  const isHighlighted = activeFeature === 'rootLocusPoles';

  const stabilityBadge =
    stability === 'stable' ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
        <ShieldCheck className="w-3 h-3" />
        {isAr ? 'مستقر (LHP)' : 'Stable (Left-Half Plane)'}
      </span>
    ) : stability === 'marginal' ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
        <AlertTriangle className="w-3 h-3" />
        {isAr ? 'حرج على المحور (jω)' : 'Marginally Oscillating (jω Axis)'}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[10px]">
        <ShieldAlert className="w-3 h-3" />
        {isAr ? 'غير مستقر (RHP)' : 'Unstable Runaway (Right-Half Plane)'}
      </span>
    );

  return (
    <div
      className={`bg-slate-900/90 rounded-2xl border transition-all ${
        isHighlighted ? 'border-amber-400/80 shadow-lg shadow-amber-500/20' : 'border-slate-800'
      } p-4 shadow-lg flex flex-col justify-between`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
              {isAr ? 'المسار الجذري في المستوى المركب (s-Plane)' : 'Root Locus Closed-Loop Poles'}
              {stabilityBadge}
            </h3>
            <p className="text-[10px] text-slate-400">
              {isAr ? '1 + L(s) = 0 مع تقريب بادي لتأخير الزمن' : '1 + L(s) = 0 via 1st-order Padé approximation'}
            </p>
          </div>
        </div>

        {/* Live Metrics HUD */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-center">
            <span className="text-slate-400 text-[9px] block">{isAr ? 'معامل التخميد (ζ)' : 'Damping Ratio (ζ)'}</span>
            <span className="font-bold text-amber-300">
              {dampingRatio !== undefined ? dampingRatio : '—'}
            </span>
          </div>
          <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-center">
            <span className="text-slate-400 text-[9px] block">{isAr ? 'التردد الطبيعي (ωn)' : 'Natural Freq (ωn)'}</span>
            <span className="font-bold text-cyan-300">
              {naturalFrequency !== undefined ? `${naturalFrequency} r/s` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative mt-2 flex justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-full h-auto bg-slate-950 rounded-xl border border-slate-800/80"
        >
          <defs>
            {/* Left-Half Plane Gradient (Stable) */}
            <linearGradient id="lhpGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
            </linearGradient>

            {/* Right-Half Plane Gradient (Unstable) */}
            <linearGradient id="rhpGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.18" />
            </linearGradient>
          </defs>

          {/* Left-Half Plane Shading (Stable) */}
          <rect
            x={pad.left}
            y={pad.top}
            width={jOmegaX - pad.left}
            height={height - pad.top - pad.bottom}
            fill="url(#lhpGradient)"
          />
          <text
            x={pad.left + 15}
            y={pad.top + 20}
            fill="#10b981"
            opacity="0.8"
            fontSize="10"
            fontWeight="bold"
          >
            {isAr ? 'منطقة الاستقرار (LHP)' : 'STABLE REGION (LHP)'}
          </text>

          {/* Right-Half Plane Shading (Unstable) */}
          <rect
            x={jOmegaX}
            y={pad.top}
            width={width - pad.right - jOmegaX}
            height={height - pad.top - pad.bottom}
            fill="url(#rhpGradient)"
          />
          <text
            x={width - pad.right - 10}
            y={pad.top + 20}
            textAnchor="end"
            fill="#f43f5e"
            opacity="0.8"
            fontSize="10"
            fontWeight="bold"
          >
            {isAr ? 'منطقة عدم الاستقرار (RHP)' : 'UNSTABLE REGION (RHP)'}
          </text>

          {/* Grid lines */}
          {[-4, -3, -2, -1, 1, 2].map((s) => (
            <line
              key={`grid-s-${s}`}
              x1={scaleX(s)}
              y1={pad.top}
              x2={scaleX(s)}
              y2={height - pad.bottom}
              stroke="#334155"
              strokeDasharray="2,3"
              strokeOpacity="0.4"
            />
          ))}
          {[-3, -2, -1, 1, 2, 3].map((im) => (
            <line
              key={`grid-im-${im}`}
              x1={pad.left}
              y1={scaleY(im)}
              x2={width - pad.right}
              y2={scaleY(im)}
              stroke="#334155"
              strokeDasharray="2,3"
              strokeOpacity="0.4"
            />
          ))}

          {/* Real Axis (Sigma) */}
          <line
            x1={pad.left}
            y1={realAxisY}
            x2={width - pad.right}
            y2={realAxisY}
            stroke="#64748b"
            strokeWidth="1.5"
          />
          <text
            x={width - pad.right - 5}
            y={realAxisY - 6}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            σ (Real)
          </text>

          {/* Imaginary Axis (j*omega) - Marginal stability boundary */}
          <line
            x1={jOmegaX}
            y1={pad.top}
            x2={jOmegaX}
            y2={height - pad.bottom}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="4,2"
          />
          <text
            x={jOmegaX + 6}
            y={pad.top + 12}
            fill="#f59e0b"
            fontSize="10"
            fontWeight="bold"
            fontFamily="monospace"
          >
            jω
          </text>

          {/* Render Zeros (Circles) */}
          {zeros.map((z, idx) => {
            const x = scaleX(z.real);
            const y = scaleY(z.imag);
            return (
              <g key={`zero-${idx}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <text
                  x={x}
                  y={y - 9}
                  fill="#38bdf8"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  z
                </text>
              </g>
            );
          })}

          {/* Render Poles (Crosses X) */}
          {poles.map((p, idx) => {
            const x = scaleX(p.real);
            const y = scaleY(p.imag);
            const isUnstable = p.real > 0.02;
            const strokeColor = isUnstable ? '#f43f5e' : '#34d399';
            const isHovered = hoverPole === idx;

            return (
              <g
                key={`pole-${idx}`}
                className="cursor-pointer transition-transform duration-200"
                onMouseEnter={() => setHoverPole(idx)}
                onMouseLeave={() => setHoverPole(null)}
              >
                {/* Glow ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 14 : 9}
                  fill={isUnstable ? '#f43f5e' : '#10b981'}
                  fillOpacity="0.2"
                />
                {/* Pole X mark */}
                <line
                  x1={x - 6}
                  y1={y - 6}
                  x2={x + 6}
                  y2={y + 6}
                  stroke={strokeColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <line
                  x1={x - 6}
                  y1={y + 6}
                  x2={x + 6}
                  y2={y - 6}
                  stroke={strokeColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Pole label */}
                <text
                  x={x + 8}
                  y={y - 6}
                  fill={strokeColor}
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  s{idx + 1}: {p.real > 0 ? `+${p.real}` : p.real}
                  {p.imag !== 0 ? (p.imag > 0 ? `+j${p.imag}` : `-j${Math.abs(p.imag)}`) : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Explanatory Intuition Footer */}
      <div className="mt-3 bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
        <span>
          {isAr
            ? '💡 زيادة الكسب Kc تدفع الأقطاب يميناً. عبورها محور jω يسبب اهتزازات متصاعدة غير مستقرة.'
            : '💡 Increasing Kc pushes poles rightward. Crossing the jω axis causes unbounded runaway oscillations.'}
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          Re(s) {poles.map((p) => p.real).join(', ')}
        </span>
      </div>
    </div>
  );
};
