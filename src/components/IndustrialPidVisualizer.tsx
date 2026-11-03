/**
 * Industrial P&ID Visualizer (bigp Milestone 4: Module 13 & 14)
 * High-fidelity animated SVG P&ID schematics in clean engineering light theme:
 * 1. Exothermic Jacketed CSTR (TT-101, JT-102, CW Valve, Trip alarm)
 * 2. Shell-and-Tube Heat Exchanger (FT-201, TT-202, Steam Valve)
 * 3. Binary Fractionator Distillation Column (AT-301 Top, AT-302 Bottom, L/V valves)
 * 4. Boiler Steam Drum with Shrink & Swell (LT-401, FT-402 Steam, FT-403 FW)
 */

import React from 'react';

interface IndustrialPidVisualizerProps {
  caseIndex: 1 | 2 | 3 | 4;
  pv: number;
  sp: number;
  u: number;
  pv2?: number;
  disturbance?: number;
  lang: 'en' | 'ar';
}

export const IndustrialPidVisualizer: React.FC<IndustrialPidVisualizerProps> = ({
  caseIndex,
  pv,
  sp,
  u,
  pv2,
  disturbance = 0,
  lang,
}) => {
  const isAr = lang === 'ar';

  // Case 1: Exothermic CSTR
  if (caseIndex === 1) {
    const isRunawayRisk = pv > 360;
    const isTripped = pv >= 365;
    return (
      <div className="panel-card p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isTripped ? 'bg-rose-500 animate-ping' : isRunawayRisk ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="font-bold text-slate-900 text-xs">P&ID: Exothermic CSTR (R-101)</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${isTripped ? 'bg-rose-50 text-rose-700 border-rose-300' : isRunawayRisk ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300'}`}>
            {isTripped ? (isAr ? 'إنذار: إيقاف طارئ!' : 'TRIP: >365 K!') : isRunawayRisk ? (isAr ? 'تحذير: حرارة عالية' : 'HI-TEMP ALERT') : (isAr ? 'تشغيل آمن' : 'NORMAL')}
          </span>
        </div>

        <svg viewBox="0 0 400 210" className="w-full h-48 my-2">
          {/* Reactor Vessel outer jacket */}
          <rect x="110" y="45" width="180" height="130" rx="20" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2.5" />
          <path d="M 115 150 Q 200 185 285 150" fill="none" stroke="#0284c7" strokeWidth="6" strokeDasharray="6,4" />

          {/* Reactor inner chamber */}
          <rect x="130" y="55" width="140" height="110" rx="14" fill={pv > 355 ? '#fee2e2' : '#e2e8f0'} stroke="#64748b" strokeWidth="2" />
          
          {/* Agitator Impeller */}
          <line x1="200" y1="20" x2="200" y2="135" stroke="#475569" strokeWidth="4" />
          <ellipse cx="200" cy="135" rx="35" ry="10" fill="#94a3b8" />

          {/* Transmitter Bubbles */}
          <circle cx="270" cy="85" r="16" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
          <text x="270" y="83" fill="#0369a1" fontSize="8" fontWeight="bold" textAnchor="middle">TT-101</text>
          <text x="270" y="94" fill="#0284c7" fontSize="8" fontWeight="bold" textAnchor="middle">{pv.toFixed(1)}K</text>

          <circle cx="90" cy="135" r="16" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
          <text x="90" y="133" fill="#0369a1" fontSize="8" fontWeight="bold" textAnchor="middle">JT-102</text>
          <text x="90" y="144" fill="#0284c7" fontSize="8" fontWeight="bold" textAnchor="middle">{(pv2 ?? 320).toFixed(0)}K</text>

          {/* Cooling valve */}
          <polygon points="60,110 80,120 80,100" fill="#0284c7" />
          <polygon points="100,110 80,120 80,100" fill="#0284c7" />
          <text x="80" y="95" fill="#0369a1" fontSize="9" fontWeight="bold" textAnchor="middle">CV-101: {u.toFixed(0)}%</text>
        </svg>

        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 block">{isAr ? 'حرارة المفاعل' : 'Reactor Temp'}</span>
            <span className={`font-bold ${isRunawayRisk ? 'text-rose-600' : 'text-emerald-700'}`}>{pv.toFixed(1)} K</span>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? 'حرارة الغلاف' : 'Jacket Temp'}</span>
            <span className="text-cyan-700 font-bold">{(pv2 ?? 320).toFixed(1)} K</span>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? 'صمام التبريد' : 'Cooling Valve'}</span>
            <span className="text-slate-800 font-bold">{u.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Shell & Tube Heat Exchanger
  if (caseIndex === 2) {
    return (
      <div className="panel-card p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <span className="font-bold text-slate-900 text-xs">P&ID: Shell-and-Tube Steam Heater (E-201)</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
            FF + FB Feedforward
          </span>
        </div>

        <svg viewBox="0 0 400 210" className="w-full h-48 my-2">
          {/* Exchanger Shell */}
          <rect x="80" y="60" width="240" height="90" rx="30" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" />
          {/* Tubes inside */}
          <line x1="100" y1="85" x2="300" y2="85" stroke="#38bdf8" strokeWidth="4" />
          <line x1="100" y1="105" x2="300" y2="105" stroke="#38bdf8" strokeWidth="4" />
          <line x1="100" y1="125" x2="300" y2="125" stroke="#38bdf8" strokeWidth="4" />

          {/* Steam inlet top */}
          <polygon points="190,20 210,35 210,5" fill="#f59e0b" />
          <polygon points="230,20 210,35 210,5" fill="#f59e0b" />
          <text x="210" y="15" fill="#b45309" fontSize="8" fontWeight="bold" textAnchor="middle">Steam: {u.toFixed(0)}%</text>

          {/* Transmitters */}
          <circle cx="50" cy="105" r="16" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
          <text x="50" y="103" fill="#0369a1" fontSize="8" fontWeight="bold" textAnchor="middle">FT-201</text>
          <text x="50" y="114" fill="#0284c7" fontSize="8" fontWeight="bold" textAnchor="middle">{(50 + disturbance).toFixed(0)}kg/s</text>

          <circle cx="350" cy="105" r="16" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
          <text x="350" y="103" fill="#0369a1" fontSize="8" fontWeight="bold" textAnchor="middle">TT-202</text>
          <text x="350" y="114" fill="#0284c7" fontSize="8" fontWeight="bold" textAnchor="middle">{pv.toFixed(1)}°C</text>
        </svg>

        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 block">{isAr ? 'حرارة المخرج' : 'Outlet Temp'}</span>
            <span className="text-emerald-700 font-bold">{pv.toFixed(1)} °C</span>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? 'تدفق العملية' : 'Process Flow'}</span>
            <span className="text-cyan-700 font-bold">{(50 + disturbance).toFixed(1)} kg/s</span>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? 'صمام البخار' : 'Steam Valve'}</span>
            <span className="text-slate-800 font-bold">{u.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Binary Distillation Fractionator
  if (caseIndex === 3) {
    return (
      <div className="panel-card p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <span className="font-bold text-slate-900 text-xs">P&ID: Binary Fractionator (T-301)</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-50 text-cyan-700 border border-cyan-200">
            2x2 MIMO & Decoupler
          </span>
        </div>

        <svg viewBox="0 0 400 210" className="w-full h-48 my-2">
          {/* Distillation Tower */}
          <rect x="170" y="25" width="60" height="160" rx="15" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" />
          {/* Trays */}
          {[55, 75, 95, 115, 135, 155].map((y) => (
            <line key={y} x1="175" y1={y} x2="225" y2={y} stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" />
          ))}

          {/* Reflux L top left */}
          <polygon points="100,45 120,55 120,35" fill="#0284c7" />
          <polygon points="140,45 120,55 120,35" fill="#0284c7" />
          <text x="120" y="30" fill="#0369a1" fontSize="8" fontWeight="bold" textAnchor="middle">Reflux L: {u.toFixed(0)}%</text>

          {/* Analyzer Overhead */}
          <circle cx="280" cy="45" r="16" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
          <text x="280" y="43" fill="#0369a1" fontSize="8" fontWeight="bold" textAnchor="middle">AT-301</text>
          <text x="280" y="54" fill="#0284c7" fontSize="8" fontWeight="bold" textAnchor="middle">{pv.toFixed(1)}%</text>

          {/* Analyzer Bottoms */}
          <circle cx="280" cy="165" r="16" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
          <text x="280" y="163" fill="#0369a1" fontSize="8" fontWeight="bold" textAnchor="middle">AT-302</text>
          <text x="280" y="174" fill="#0284c7" fontSize="8" fontWeight="bold" textAnchor="middle">{(pv2 ?? 2.0).toFixed(1)}%</text>
        </svg>

        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 block">{isAr ? 'نقاوة القمة (xD)' : 'Top Purity xD'}</span>
            <span className="text-emerald-700 font-bold">{pv.toFixed(2)}%</span>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? 'شوائب القاع (xB)' : 'Bottoms xB'}</span>
            <span className="text-cyan-700 font-bold">{(pv2 ?? 2.0).toFixed(2)}%</span>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? 'تدفق الارتجاع' : 'Reflux Valve'}</span>
            <span className="text-slate-800 font-bold">{u.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Case 4: Steam Boiler Drum Level with Shrink & Swell
  return (
    <div className="panel-card p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <span className="font-bold text-slate-900 text-xs">P&ID: Steam Boiler Drum with Swell (B-401)</span>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
          3-Element Control
        </span>
      </div>

      <svg viewBox="0 0 400 210" className="w-full h-48 my-2">
        {/* Boiler Drum horizontal vessel */}
        <rect x="70" y="60" width="260" height="90" rx="35" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" />
        
        {/* Water Level */}
        <rect x="75" y={150 - (pv * 0.8)} width="250" height={pv * 0.8} rx="10" fill="#bae6fd" opacity="0.8" />
        <line x1="75" y1={150 - (pv * 0.8)} x2="325" y2={150 - (pv * 0.8)} stroke="#0284c7" strokeWidth="3" strokeDasharray="4,2" />

        {/* Steam demand pipe top */}
        <line x1="200" y1="60" x2="200" y2="20" stroke="#f59e0b" strokeWidth="5" />
        <circle cx="200" cy="15" r="14" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
        <text x="200" y="14" fill="#b45309" fontSize="7" fontWeight="bold" textAnchor="middle">FT-402</text>
        <text x="200" y="23" fill="#d97706" fontSize="7" fontWeight="bold" textAnchor="middle">{(50 + disturbance).toFixed(0)}</text>

        {/* Level Transmitter */}
        <circle cx="340" cy="105" r="16" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
        <text x="340" y="103" fill="#0369a1" fontSize="8" fontWeight="bold" textAnchor="middle">LT-401</text>
        <text x="340" y="114" fill="#0284c7" fontSize="8" fontWeight="bold" textAnchor="middle">{pv.toFixed(1)}%</text>

        {/* Feedwater valve bottom left */}
        <polygon points="40,165 60,175 60,155" fill="#0284c7" />
        <polygon points="80,165 60,175 60,155" fill="#0284c7" />
        <text x="60" y="150" fill="#0369a1" fontSize="8" fontWeight="bold" textAnchor="middle">FW: {u.toFixed(0)}%</text>
      </svg>

      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <div>
          <span className="text-slate-500 block">{isAr ? 'منسوب المرجل' : 'Drum Level'}</span>
          <span className="text-emerald-700 font-bold">{pv.toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-slate-500 block">{isAr ? 'طلب البخار' : 'Steam Demand'}</span>
          <span className="text-amber-700 font-bold">{(50 + disturbance).toFixed(1)} kg/s</span>
        </div>
        <div>
          <span className="text-slate-500 block">{isAr ? 'صمام مياه التغذية' : 'Feedwater Valve'}</span>
          <span className="text-slate-800 font-bold">{u.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
