/**
 * Scope Chart (bigp Milestones 0-4 Live Multi-Trace Digital Strip Chart)
 * Clean, high-contrast engineering light theme with crisp traces and tooltips.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ScopeDataPoint } from '../types/engine';
import { VisualFeatureId } from '../types/curriculum';
import { Play, Pause, RotateCcw, Clock, AlertCircle } from 'lucide-react';

interface SweepCurve {
  label: string;
  kc: number;
  data: ScopeDataPoint[];
  color: string;
}

interface ScopeChartProps {
  history: ScopeDataPoint[];
  isRunning: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  activeFeature: VisualFeatureId | null;
  targetSP: number;
  toleranceBandPct?: number;
  sweepCurves?: SweepCurve[];
  moduleId?: string;
  lang: 'en' | 'ar';
  fopdtParams?: { k: number; tau: number; theta: number; stepTime: number; stepVal: number };
  showTermMeter?: boolean;
}

export const ScopeChart: React.FC<ScopeChartProps> = ({
  history,
  isRunning,
  onTogglePlay,
  onReset,
  activeFeature,
  targetSP,
  toleranceBandPct,
  sweepCurves,
  moduleId,
  lang,
  fopdtParams,
  showTermMeter = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isAr = lang === 'ar';

  const [timeWindow, setTimeWindow] = useState<number>(30);
  const [showSP, setShowSP] = useState(true);
  const [showPV, setShowPV] = useState(true);
  const [showU, setShowU] = useState(true);
  const [showRawU, setShowRawU] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<ScopeDataPoint | null>(null);

  // Render chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const padLeft = 46;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 28;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Clean engineering graph paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Coordinates
    const latestTime = history.length > 0 ? history[history.length - 1].time : 0;
    const startTime = Math.max(0, latestTime - timeWindow);
    const endTime = startTime + timeWindow;

    const yMin = 0;
    const yMax = 100;

    const xToPx = (t: number) => padLeft + ((t - startTime) / (endTime - startTime)) * plotW;
    const yToPx = (val: number) => padTop + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

    // 1. Grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let yVal = 0; yVal <= 100; yVal += 25) {
      const yPos = yToPx(yVal);
      ctx.moveTo(padLeft, yPos);
      ctx.lineTo(padLeft + plotW, yPos);
    }
    const firstGridTime = Math.ceil(startTime / 5) * 5;
    for (let t = firstGridTime; t <= endTime; t += 5) {
      const xPos = xToPx(t);
      ctx.moveTo(xPos, padTop);
      ctx.lineTo(xPos, padTop + plotH);
    }
    ctx.stroke();

    // Border line around plot
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // 2. Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    for (let yVal = 0; yVal <= 100; yVal += 25) {
      const yPos = yToPx(yVal);
      ctx.fillText(`${yVal}%`, padLeft - 6, yPos + 3);
    }
    ctx.textAlign = 'center';
    for (let t = firstGridTime; t <= endTime; t += 5) {
      const xPos = xToPx(t);
      ctx.fillText(`${t}s`, xPos, padTop + plotH + 16);
    }

    // 3. Challenge Tolerance Corridor Shading
    if (toleranceBandPct && targetSP > 0) {
      const bandHalf = (toleranceBandPct / 100) * targetSP;
      const topY = yToPx(Math.min(100, targetSP + bandHalf));
      const botY = yToPx(Math.max(0, targetSP - bandHalf));
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(padLeft, topY, plotW, botY - topY);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(padLeft, topY, plotW, botY - topY);
      ctx.setLineDash([]);
    }

    const visiblePoints = history.filter((p) => p.time >= startTime - 0.2);

    // OVERLAY: Module 5 Integral Area Shading (∫ e dt)
    if ((activeFeature === 'integralArea' || moduleId === 'm5') && visiblePoints.length > 2) {
      for (let i = 0; i < visiblePoints.length - 1; i++) {
        const p1 = visiblePoints[i];
        const p2 = visiblePoints[i + 1];
        const x1 = xToPx(p1.time);
        const x2 = xToPx(p2.time);
        const spY1 = yToPx(p1.sp);
        const spY2 = yToPx(p2.sp);
        const pvY1 = yToPx(p1.pv);
        const pvY2 = yToPx(p2.pv);

        ctx.fillStyle = p1.error >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)';
        ctx.beginPath();
        ctx.moveTo(x1, spY1);
        ctx.lineTo(x2, spY2);
        ctx.lineTo(x2, pvY2);
        ctx.lineTo(x1, pvY1);
        ctx.closePath();
        ctx.fill();
      }
    }

    // OVERLAY: Module 4 Steady-State Offset Shading
    if ((activeFeature === 'offsetGap' || moduleId === 'm4') && visiblePoints.length > 1) {
      const lastP = visiblePoints[visiblePoints.length - 1];
      const startX = Math.max(padLeft, xToPx(Math.max(startTime, latestTime - 8)));
      const endX = xToPx(latestTime);
      const topY = Math.min(yToPx(lastP.sp), yToPx(lastP.pv));
      const botY = Math.max(yToPx(lastP.sp), yToPx(lastP.pv));

      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.fillRect(startX, topY, endX - startX, botY - topY);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(startX, topY, endX - startX, botY - topY);
      ctx.setLineDash([]);

      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Offset: ${Math.abs(lastP.error).toFixed(1)}%`, endX - 6, (topY + botY) / 2 + 3);
    }

    // RENDER MAIN TRACES
    if (visiblePoints.length > 1) {
      // Windup Ghost Trace (rawU)
      if (showRawU && (activeFeature === 'windupGhostTrace' || moduleId === 'm7')) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        visiblePoints.forEach((p, idx) => {
          if (p.rawU !== undefined) {
            const x = xToPx(p.time);
            const y = yToPx(p.rawU);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Controller Output u (purple solid)
      if (showU) {
        ctx.strokeStyle = '#9333ea';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        visiblePoints.forEach((p, idx) => {
          const x = xToPx(p.time);
          const y = yToPx(p.u);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Target SP (amber dashed)
      if (showSP) {
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = activeFeature === 'spLine' ? 2.5 : 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        visiblePoints.forEach((p, idx) => {
          const x = xToPx(p.time);
          const y = yToPx(p.sp);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Process Variable PV (rich deep cyan/teal solid)
      if (showPV) {
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = activeFeature === 'pvLine' ? 3.5 : 2.5;
        ctx.beginPath();
        visiblePoints.forEach((p, idx) => {
          const x = xToPx(p.time);
          const y = yToPx(p.pv);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Secondary PV2
      const hasPV2 = visiblePoints.some((p) => p.pv2 !== undefined);
      if (hasPV2) {
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        visiblePoints.forEach((p, idx) => {
          if (p.pv2 !== undefined) {
            const x = xToPx(p.time);
            const y = yToPx(p.pv2);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      }

      // Secondary SP2
      const hasSP2 = visiblePoints.some((p) => p.sp2 !== undefined);
      if (hasSP2) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        visiblePoints.forEach((p, idx) => {
          if (p.sp2 !== undefined) {
            const x = xToPx(p.time);
            const y = yToPx(p.sp2);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Feedforward Action uFF
      const hasUFF = visiblePoints.some((p) => p.uFF !== undefined);
      if (hasUFF) {
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        visiblePoints.forEach((p, idx) => {
          if (p.uFF !== undefined) {
            const x = xToPx(p.time);
            const y = yToPx(p.uFF + 50);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Crosshair on hover
    if (hoveredPoint) {
      const hx = xToPx(hoveredPoint.time);
      if (hx >= padLeft && hx <= padLeft + plotW) {
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(hx, padTop);
        ctx.lineTo(hx, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [
    history,
    timeWindow,
    showSP,
    showPV,
    showU,
    showRawU,
    activeFeature,
    targetSP,
    toleranceBandPct,
    sweepCurves,
    moduleId,
    fopdtParams,
    hoveredPoint,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padLeft = 46;
    const padRight = 20;
    const plotW = rect.width - padLeft - padRight;

    if (x < padLeft || x > padLeft + plotW) {
      setHoveredPoint(null);
      return;
    }

    const latestTime = history[history.length - 1].time;
    const startTime = Math.max(0, latestTime - timeWindow);
    const endTime = startTime + timeWindow;

    const targetTime = startTime + ((x - padLeft) / plotW) * (endTime - startTime);

    let closest = history[0];
    let minDiff = Infinity;
    for (const p of history) {
      const diff = Math.abs(p.time - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    setHoveredPoint(closest);
  };

  const currentPt = history.length > 0 ? history[history.length - 1] : null;

  // Compute live term meter percentages
  const up = Math.max(0, currentPt?.up ?? 0);
  const ui = Math.max(0, currentPt?.ui ?? 0);
  const ud = Math.max(0, currentPt?.ud ?? 0);
  const totalTerms = Math.max(0.1, up + ui + ud);
  const pctP = Math.round((up / totalTerms) * 100);
  const pctI = Math.round((ui / totalTerms) * 100);
  const pctD = Math.max(0, 100 - pctP - pctI);

  return (
    <div className="panel-card p-4 sm:p-5 flex flex-col space-y-3">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-pulse" />
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
              {isAr ? 'راسم الإشارات الرقمي (Strip Scope)' : 'Digital Process Scope'}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 font-mono text-[11px] text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-cyan-600" />
            <span>t = {currentPt ? currentPt.time.toFixed(1) : '0.0'}s</span>
          </div>

          {currentPt?.isSaturated && (
            <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-mono font-bold text-[10px] border border-rose-200 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>{isAr ? 'الصمام متشبع 100%' : 'VALVE SATURATED'}</span>
            </span>
          )}
        </div>

        {/* Trace Toggles */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => setShowSP(!showSP)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
              showSP ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <span className="w-2 h-0.5 bg-amber-500 inline-block" />
            <span>SP</span>
          </button>
          <button
            onClick={() => setShowPV(!showPV)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
              showPV ? 'bg-sky-50 border-sky-300 text-sky-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <span className="w-2 h-0.5 bg-sky-600 inline-block" />
            <span>PV</span>
          </button>
          <button
            onClick={() => setShowU(!showU)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
              showU ? 'bg-purple-50 border-purple-300 text-purple-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <span className="w-2 h-0.5 bg-purple-600 inline-block" />
            <span>u</span>
          </button>
          {moduleId === 'm7' && (
            <button
              onClick={() => setShowRawU(!showRawU)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                showRawU ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <span>u_raw</span>
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full h-[260px] sm:h-[300px] rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-3 right-3 bg-white/95 border border-slate-200 p-2.5 rounded-xl shadow-lg backdrop-blur-md text-[11px] font-mono space-y-1 z-10 pointer-events-none">
            <div className="text-slate-500 border-b border-slate-200 pb-1 flex items-center justify-between gap-4">
              <span>Time</span>
              <span className="text-slate-900 font-bold">{hoveredPoint.time.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between gap-4 text-amber-700">
              <span>SP:</span>
              <span className="font-bold">{hoveredPoint.sp.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4 text-sky-700">
              <span>PV:</span>
              <span className="font-bold">{hoveredPoint.pv.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4 text-purple-700">
              <span>u:</span>
              <span className="font-bold">{hoveredPoint.u.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4 text-slate-700">
              <span>Error:</span>
              <span className="font-bold">{hoveredPoint.error.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
        <div className="flex items-center gap-2">
          {/* Play / Pause button */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${
              isRunning
                ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5 text-amber-700" /> : <Play className="w-3.5 h-3.5 text-emerald-700 fill-emerald-700" />}
            <span>{isRunning ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'تشغيل' : 'Run')}</span>
          </button>

          {/* Reset button */}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
          </button>
        </div>

        {/* Live Term Meter (uP, uI, uD) */}
        {showTermMeter && (
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-[11px] font-mono">
            <span className="text-slate-500 font-bold px-1">{isAr ? 'مكونات PID:' : 'PID Split:'}</span>
            <div className="w-24 sm:w-32 h-2.5 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              <div style={{ width: `${pctP}%` }} className="bg-sky-500" title={`P: ${pctP}%`} />
              <div style={{ width: `${pctI}%` }} className="bg-emerald-500" title={`I: ${pctI}%`} />
              <div style={{ width: `${pctD}%` }} className="bg-purple-500" title={`D: ${pctD}%`} />
            </div>
            <div className="flex gap-1.5 text-[10px]">
              <span className="text-sky-700 font-bold">P:{pctP}%</span>
              <span className="text-emerald-700 font-bold">I:{pctI}%</span>
              <span className="text-purple-700 font-bold">D:{pctD}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
