/**
 * Equipment Visualizer (bigp Spec Physical Plant View)
 * Clean, light-themed engineering SVG representation of Tanks, Vessels, and Bioreactors.
 */

import React from 'react';
import { VisualFeatureId } from '../types/curriculum';
import { Droplet, Flame, Gauge, Zap } from 'lucide-react';

interface EquipmentVisualizerProps {
  type: 'tank' | 'heatedVessel' | 'bioreactor' | 'generic';
  levelPct: number;
  targetSP: number;
  valveOpeningPct: number;
  disturbanceFlow: number;
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
  const clampedLevel = Math.min(100, Math.max(0, levelPct));
  const liquidHeightPx = (clampedLevel / 100) * 140;

  const isLevelHighlighted = activeFeature === 'tankLevel';
  const isValveHighlighted = activeFeature === 'inflowValve';
  const isDrainHighlighted = activeFeature === 'outflowValve';

  return (
    <div
      className={`panel-card p-4 sm:p-5 flex flex-col justify-between transition-all ${
        isLevelHighlighted || isValveHighlighted
          ? 'ring-2 ring-cyan-500 shadow-md'
          : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
            {type === 'heatedVessel' ? (
              <Flame className="w-4 h-4 text-orange-500" />
            ) : type === 'bioreactor' ? (
              <Zap className="w-4 h-4 text-emerald-600" />
            ) : (
              <Droplet className="w-4 h-4 text-cyan-600" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-xs">
              {type === 'heatedVessel'
                ? isAr ? 'الوعاء الحراري المستمر' : 'Continuous Heated Vessel'
                : type === 'bioreactor'
                ? isAr ? 'المفاعل الحيوي (Bioreactor)' : 'Cell Culture Bioreactor'
                : isAr ? 'الخزان الهيدروليكي السائل' : 'Process Liquid Surge Tank'}
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              {isAr ? 'عرض المعدة الفيزيائية المباشر' : 'Live Physical Equipment Schematic'}
            </span>
          </div>
        </div>

        {/* Level Percentage Tag */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-slate-800">
          <span>{clampedLevel.toFixed(1)}%</span>
        </div>
      </div>

      {/* SVG Equipment Display */}
      <div className="relative w-full h-[220px] my-2 bg-slate-50/70 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200">
        <svg viewBox="0 0 360 220" className="w-full h-full max-h-[220px]">
          <defs>
            <style>{`
              @keyframes streamFlow {
                from { stroke-dashoffset: 0; }
                to { stroke-dashoffset: -28; }
              }
              @keyframes surfaceWave {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-1.5px); }
              }
              .animate-stream-flow {
                animation: streamFlow 0.8s linear infinite;
              }
              .animate-surface-wave {
                animation: surfaceWave 2.5s ease-in-out infinite;
                transform-origin: center;
              }
            `}</style>
            <linearGradient id="liquidGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="thermalGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="vesselSteelLight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          </defs>

          {/* 1. Inflow Pipe (Top Left) */}
          <path
            d="M 40 40 L 130 40 L 130 60"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Inflow Valve Icon & Bowtie */}
          <g transform="translate(85, 30)">
            <circle
              cx="10"
              cy="10"
              r="16"
              fill={isValveHighlighted ? '#e0f2fe' : '#ffffff'}
              stroke={isValveHighlighted ? '#0284c7' : '#94a3b8'}
              strokeWidth="2"
              className="transition-colors duration-300 shadow-xs"
            />
            <polygon points="2,4 18,16 18,4 2,16" fill={valveOpeningPct > 0 ? '#0284c7' : '#94a3b8'} />
            <line x1="10" y1="2" x2="10" y2="10" stroke="#64748b" strokeWidth="2" />
            <circle cx="10" cy="2" r="3" fill="#0284c7" />
            <text x="10" y="32" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="bold">
              {valveOpeningPct.toFixed(0)}%
            </text>
          </g>

          {/* Flowing stream falling into tank */}
          {valveOpeningPct > 2 && (
            <line
              x1="130"
              y1="60"
              x2="130"
              y2={205 - liquidHeightPx}
              stroke="#0284c7"
              strokeWidth={Math.max(2, (valveOpeningPct / 100) * 8)}
              strokeDasharray="4 3"
              className="animate-stream-flow"
              opacity="0.8"
            />
          )}

          {/* 2. Main Tank Vessel Body */}
          <rect
            x="110"
            y="55"
            width="170"
            height="150"
            rx="16"
            fill="url(#vesselSteelLight)"
            stroke="#94a3b8"
            strokeWidth="3"
          />

          {/* Liquid Inventory */}
          <g>
            <rect
              x="115"
              y={200 - liquidHeightPx}
              width="160"
              height={liquidHeightPx}
              rx="10"
              fill={type === 'heatedVessel' ? 'url(#thermalGradLight)' : 'url(#liquidGradLight)'}
              className="transition-all duration-300"
            />
            {/* Animated liquid surface wave line */}
            <path
              d={`M 115 ${200 - liquidHeightPx} Q 155 ${
                198 - liquidHeightPx
              }, 195 ${200 - liquidHeightPx} T 275 ${200 - liquidHeightPx}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              opacity="0.8"
              className="animate-surface-wave"
            />
          </g>

          {/* SP Target Line Indicator */}
          {targetSP > 0 && (
            <g transform={`translate(105, ${200 - (targetSP / 100) * 140})`}>
              <line x1="0" y1="0" x2="180" y2="0" stroke="#d97706" strokeWidth="2" strokeDasharray="5 3" />
              <polygon points="0,-4 8,0 0,4" fill="#d97706" />
              <text x="185" y="3" fill="#b45309" fontSize="9" fontFamily="monospace" fontWeight="bold">
                SP {targetSP.toFixed(0)}%
              </text>
            </g>
          )}

          {/* Level Calliper Bracket */}
          <line x1="290" y1="60" x2="290" y2="200" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="285" y1="60" x2="295" y2="60" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="285" y1="200" x2="295" y2="200" stroke="#cbd5e1" strokeWidth="1.5" />
          <text x="300" y="135" fill="#64748b" fontSize="9" fontFamily="monospace">
            {clampedLevel.toFixed(0)}%
          </text>

          {/* 3. Outflow Drain Pipe (Bottom Right) */}
          <path
            d="M 280 185 L 340 185"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Drain Valve Icon */}
          <g transform="translate(305, 175)">
            <circle
              cx="10"
              cy="10"
              r="14"
              fill={isDrainHighlighted ? '#fee2e2' : '#ffffff'}
              stroke={isDrainHighlighted ? '#ef4444' : '#94a3b8'}
              strokeWidth="2"
              className="shadow-xs"
            />
            <polygon points="4,5 16,15 16,5 4,15" fill={disturbanceFlow > 0 ? '#ef4444' : '#94a3b8'} />
            <text x="10" y="30" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">
              {disturbanceFlow > 0 ? `${disturbanceFlow.toFixed(0)}L/s` : 'auto'}
            </text>
          </g>
        </svg>
      </div>

      {/* Process Metrics Footer */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-xs">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] text-slate-500 block">{isAr ? 'منسوب PV' : 'Level PV'}</span>
          <span className="font-bold text-cyan-700">{clampedLevel.toFixed(1)}%</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] text-slate-500 block">{isAr ? 'الهدف SP' : 'Target SP'}</span>
          <span className="font-bold text-amber-700">{targetSP.toFixed(1)}%</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] text-slate-500 block">{isAr ? 'الصمام u' : 'Valve u'}</span>
          <span className="font-bold text-slate-800">{valveOpeningPct.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
