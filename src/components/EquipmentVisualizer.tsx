/**
 * Equipment Visualizer (bigp Spec Physical Plant View)
 * High-fidelity animated SVG representation of Tanks, Heated Vessels, and Bioreactors.
 * Synchronized with live simulation variables and See-the-Math hover highlights.
 */

import React, { useEffect, useState } from 'react';
import { VisualFeatureId } from '../types/curriculum';
import { Droplet, Flame, Gauge, Zap } from 'lucide-react';

interface EquipmentVisualizerProps {
  type: 'tank' | 'heatedVessel' | 'bioreactor' | 'generic';
  levelPct: number;          // 0 to 100
  targetSP: number;          // 0 to 100
  valveOpeningPct: number;   // 0 to 100
  disturbanceFlow: number;   // 0 to 50
  activeFeature: VisualFeatureId | null;
  lang: 'en' | 'ar';
  customMetrics?: {
    temp?: number;
    doPct?: number;
    biomass?: number;
  };
}

export const EquipmentVisualizer: React.FC<EquipmentVisualizerProps> = ({
  type,
  levelPct,
  targetSP,
  valveOpeningPct,
  disturbanceFlow,
  activeFeature,
  lang,
  customMetrics,
}) => {
  const isAr = lang === 'ar';
  const [waveOffset, setWaveOffset] = useState(0);

  // Smooth wave animation
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setWaveOffset((prev) => (prev + 1.2) % 360);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  const clampedLevel = Math.min(100, Math.max(0, levelPct));
  const clampedSP = Math.min(100, Math.max(0, targetSP));
  const tankHeightPx = 180;
  const liquidHeightPx = (clampedLevel / 100) * tankHeightPx;
  const targetHeightPx = (clampedSP / 100) * tankHeightPx;

  const isLevelHighlighted = activeFeature === 'tankLevel' || activeFeature === 'pvLine';
  const isSPHighlighted = activeFeature === 'spLine';
  const isValveHighlighted = activeFeature === 'inflowValve' || activeFeature === 'uLine';
  const isErrorHighlighted = activeFeature === 'errorBracket';

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-lg flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            {type === 'bioreactor' ? <Zap className="w-3.5 h-3.5" /> : type === 'heatedVessel' ? <Flame className="w-3.5 h-3.5 text-amber-400" /> : <Gauge className="w-3.5 h-3.5" />}
          </div>
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            {type === 'bioreactor'
              ? isAr ? 'المفاعل الحيوي (Bioreactor)' : 'Cell Culture Bioreactor'
              : type === 'heatedVessel'
              ? isAr ? 'الوعاء الحراري المعزول' : 'Thermal Heated Vessel'
              : isAr ? 'خزان السائل الفيزيائي' : 'Process Liquid Tank'}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-slate-400">PV:</span>
          <span className="text-cyan-300 font-bold">{levelPct.toFixed(1)}%</span>
          <span className="text-slate-400 ml-1">SP:</span>
          <span className="text-amber-300 font-bold">{targetSP.toFixed(1)}%</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-56 flex items-center justify-center my-1 select-none">
        <svg viewBox="0 0 400 240" className="w-full h-full max-w-md overflow-visible">
          <defs>
            {/* Water gradient */}
            <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
            </linearGradient>
            {/* Bioreactor medium gradient */}
            <linearGradient id="bioGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.95" />
            </linearGradient>
            {/* Thermal gradient */}
            <linearGradient id="thermalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.95" />
            </linearGradient>
            {/* Steel tank gradient */}
            <linearGradient id="steelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>

          {/* 1. Inflow Pipe (Top Left) */}
          <path
            d="M 40 40 L 130 40 L 130 60"
            fill="none"
            stroke="#475569"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Inflow Valve Icon & Glow */}
          <g transform="translate(85, 30)">
            <circle
              cx="10"
              cy="10"
              r="16"
              fill={isValveHighlighted ? '#06b6d4' : '#1e293b'}
              stroke={isValveHighlighted ? '#22d3ee' : '#64748b'}
              strokeWidth="2"
              className="transition-colors duration-300"
            />
            {/* Valve stem & triangle bowtie */}
            <polygon points="2,4 18,16 18,4 2,16" fill={valveOpeningPct > 0 ? '#38bdf8' : '#94a3b8'} />
            <line x1="10" y1="2" x2="10" y2="10" stroke="#f8fafc" strokeWidth="2" />
            <circle cx="10" cy="2" r="3" fill="#38bdf8" />
            <text x="10" y="32" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
              {valveOpeningPct.toFixed(0)}%
            </text>
          </g>

          {/* Flowing stream falling into tank */}
          {valveOpeningPct > 2 && (
            <line
              x1="130"
              y1="60"
              x2="130"
              y2={210 - liquidHeightPx}
              stroke="#38bdf8"
              strokeWidth={Math.max(2, (valveOpeningPct / 100) * 8)}
              strokeDasharray="4 3"
              strokeDashoffset={-waveOffset}
              opacity="0.8"
            />
          )}

          {/* 2. Main Tank Body */}
          <rect
            x="110"
            y="50"
            width="180"
            height="160"
            rx="12"
            fill="url(#steelGrad)"
            stroke={isLevelHighlighted ? '#38bdf8' : '#475569'}
            strokeWidth={isLevelHighlighted ? '3' : '2'}
            className="transition-all duration-300"
          />

          {/* Tank Glass Window / Cutout */}
          <rect
            x="120"
            y="55"
            width="160"
            height="150"
            rx="8"
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Tank Graduated Scale (Tick marks) */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const yTick = 205 - (pct / 100) * 150;
            return (
              <g key={pct}>
                <line x1="122" y1={yTick} x2="130" y2={yTick} stroke="#475569" strokeWidth="1" />
                <text x="133" y={yTick + 3} fill="#64748b" fontSize="7" fontFamily="monospace">
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Liquid Mass in Tank */}
          <g>
            {clampedLevel > 0 && (
              <rect
                x="120"
                y={205 - (clampedLevel / 100) * 150}
                width="160"
                height={(clampedLevel / 100) * 150}
                rx="2"
                fill={
                  type === 'bioreactor'
                    ? 'url(#bioGrad)'
                    : type === 'heatedVessel'
                    ? 'url(#thermalGrad)'
                    : 'url(#liquidGrad)'
                }
              />
            )}

            {/* Wavy surface on top of water */}
            {clampedLevel > 0 && clampedLevel < 100 && (
              <ellipse
                cx="200"
                cy={205 - (clampedLevel / 100) * 150}
                rx="80"
                ry={2 + Math.sin(waveOffset * 0.05) * 1.5}
                fill="#7dd3fc"
                opacity="0.8"
              />
            )}
          </g>

          {/* Target SP Dashed Guideline */}
          <g>
            <line
              x1="120"
              y1={205 - (clampedSP / 100) * 150}
              x2="280"
              y2={205 - (clampedSP / 100) * 150}
              stroke={isSPHighlighted ? '#f59e0b' : '#d97706'}
              strokeWidth={isSPHighlighted ? '2.5' : '1.5'}
              strokeDasharray="5 3"
            />
            <rect
              x="270"
              y={197 - (clampedSP / 100) * 150}
              width="24"
              height="14"
              rx="3"
              fill="#d97706"
            />
            <text
              x="282"
              y={207 - (clampedSP / 100) * 150}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="8"
              fontWeight="bold"
              fontFamily="monospace"
            >
              SP
            </text>
          </g>

          {/* Live Error Gap Bracket (Highlighted when activeFeature === 'errorBracket') */}
          {(isErrorHighlighted || Math.abs(clampedSP - clampedLevel) > 1) && (
            <g opacity={isErrorHighlighted ? 1 : 0.6}>
              {/* Bracket line */}
              <line
                x1="260"
                y1={205 - (clampedLevel / 100) * 150}
                x2="260"
                y2={205 - (clampedSP / 100) * 150}
                stroke={isErrorHighlighted ? '#facc15' : '#eab308'}
                strokeWidth={isErrorHighlighted ? '3' : '2'}
              />
              {/* Top and bottom bracket ticks */}
              <line
                x1="254"
                y1={205 - (clampedLevel / 100) * 150}
                x2="266"
                y2={205 - (clampedLevel / 100) * 150}
                stroke="#facc15"
                strokeWidth="2"
              />
              <line
                x1="254"
                y1={205 - (clampedSP / 100) * 150}
                x2="266"
                y2={205 - (clampedSP / 100) * 150}
                stroke="#facc15"
                strokeWidth="2"
              />
              <text
                x="250"
                y={205 - ((clampedLevel + clampedSP) / 200) * 150 + 3}
                textAnchor="end"
                fill="#facc15"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                e={(clampedSP - clampedLevel).toFixed(1)}%
              </text>
            </g>
          )}

          {/* Bioreactor Agitator & DO Bubbles if Bioreactor */}
          {type === 'bioreactor' && (
            <g>
              {/* Central shaft */}
              <line x1="200" y1="50" x2="200" y2="185" stroke="#94a3b8" strokeWidth="4" />
              {/* Impeller blades spinning */}
              <line
                x1={200 - 30 * Math.cos(waveOffset * 0.08)}
                y1={180 - 8 * Math.sin(waveOffset * 0.08)}
                x2={200 + 30 * Math.cos(waveOffset * 0.08)}
                y2={180 + 8 * Math.sin(waveOffset * 0.08)}
                stroke="#cbd5e1"
                strokeWidth="6"
              />
              {/* Dissolved oxygen micro-bubbles */}
              {[150, 180, 220, 240].map((bx, i) => (
                <circle
                  key={i}
                  cx={bx + Math.sin(waveOffset * 0.05 + i) * 8}
                  cy={190 - ((waveOffset * 1.5 + i * 40) % 120)}
                  r="2.5"
                  fill="#ffffff"
                  opacity="0.6"
                />
              ))}
            </g>
          )}

          {/* 3. Outflow Drain Pipe (Bottom Right) */}
          <path
            d="M 270 205 L 270 220 L 360 220"
            fill="none"
            stroke="#475569"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Drain Valve & disturbance icon */}
          <g transform="translate(310, 210)">
            <circle cx="10" cy="10" r="14" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <polygon points="4,5 16,15 16,5 4,15" fill={disturbanceFlow > 0 ? '#f43f5e' : '#64748b'} />
            <text x="10" y="30" textAnchor="middle" fill="#f43f5e" fontSize="8" fontFamily="monospace">
              {disturbanceFlow > 0 ? `-${disturbanceFlow}L/s` : 'Closed'}
            </text>
          </g>

          {/* Outflow draining stream */}
          {disturbanceFlow > 0 && clampedLevel > 2 && (
            <line
              x1="360"
              y1="220"
              x2="390"
              y2="220"
              stroke="#38bdf8"
              strokeWidth="6"
              strokeDasharray="4 2"
              strokeDashoffset={-waveOffset}
            />
          )}

          {/* Level Float Sensor (Transmitter) */}
          <g transform={`translate(160, ${205 - (clampedLevel / 100) * 150})`}>
            <circle cx="0" cy="0" r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="0" y1="0" x2="0" y2={- (205 - (clampedLevel / 100) * 150) + 45} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
          </g>
        </svg>
      </div>

      {/* Equipment status footer */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] text-center">
        <div className="p-1 rounded bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">{isAr ? 'صمام التغذية u' : 'Inflow Valve u'}</span>
          <span className="font-mono font-bold text-cyan-300">{valveOpeningPct.toFixed(0)}%</span>
        </div>
        <div className="p-1 rounded bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">{isAr ? 'معدل السحب d' : 'Drain Disturbance'}</span>
          <span className="font-mono font-bold text-rose-400">
            {disturbanceFlow > 0 ? `${disturbanceFlow} L/s` : '0 L/s'}
          </span>
        </div>
        <div className="p-1 rounded bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">{isAr ? 'حالة التوازن' : 'Mass Balance'}</span>
          <span
            className={`font-mono font-bold ${
              Math.abs(clampedSP - clampedLevel) < 2
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {Math.abs(clampedSP - clampedLevel) < 2
              ? isAr ? 'متوازن' : 'Balanced'
              : isAr ? 'منحرف' : 'Drifting'}
          </span>
        </div>
      </div>
    </div>
  );
};
