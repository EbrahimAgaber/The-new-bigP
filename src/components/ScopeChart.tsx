/**
 * Scope Chart (bigp Milestones 0, 1 & 2 Live Multi-Trace Strip Chart)
 * High-performance HTML5 Canvas renderer with interactive visual overlays:
 * - Module 1: Error gap bracket
 * - Module 2: 63.2% Tau fitting tool & dead-time Theta bracket
 * - Module 4: Steady-State Offset gap shading & Kc sweep family
 * - Module 5: Integral Area Shading (∫ e dt) in translucent emerald/crimson
 * - Module 6: Derivative Slope Vector (tangent arrow & damping brake vector)
 * - Module 7: Windup Ghost Trace (requested u_raw vs actual clamped u)
 * - Module 8: Metrics Callipers (tr, ts ±2% tunnel, Overshoot %, IAE shading)
 * - Live PID Term Breakdown Stacked Bar Meter (uP, uI, uD)
 */

import React, { useEffect, useRef, useState } from 'react';
import { ScopeDataPoint } from '../types/engine';
import { VisualFeatureId } from '../types/curriculum';
import { Play, Pause, RotateCcw, Clock, Eye, Layers, AlertCircle, TrendingUp, BarChart2 } from 'lucide-react';

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
  const [showError, setShowError] = useState(false);
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

    // Background
    ctx.fillStyle = '#090d16';
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
    ctx.strokeStyle = '#1e293b';
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
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(padLeft, topY, plotW, botY - topY);
      ctx.setLineDash([]);
    }

    const visiblePoints = history.filter((p) => p.time >= startTime - 0.2);

    // ==========================================
    // OVERLAY: Module 5 Integral Area Shading (∫ e dt)
    // ==========================================
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

        const isPositiveErr = p1.error >= 0;
        ctx.fillStyle = isPositiveErr ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';

        ctx.beginPath();
        ctx.moveTo(x1, spY1);
        ctx.lineTo(x2, spY2);
        ctx.lineTo(x2, pvY2);
        ctx.lineTo(x1, pvY1);
        ctx.closePath();
        ctx.fill();
      }

      // Live Integral Shading Callout Badge
      const lastP = visiblePoints[visiblePoints.length - 1];
      if (lastP) {
        ctx.fillStyle = '#059669';
        const lx = Math.min(padLeft + plotW - 130, xToPx(lastP.time) - 130);
        const ly = yToPx(lastP.sp) - 10;
        ctx.fillRect(lx, ly, 125, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`∫ e dt Memory: uI = ${(lastP.ui ?? 0).toFixed(1)}%`, lx + 5, ly + 12);
      }
    }

    // ==========================================
    // OVERLAY: Module 7 Windup Ghost Area (Requested u_raw vs Clamped u)
    // ==========================================
    if ((activeFeature === 'windupGhostTrace' || moduleId === 'm7') && visiblePoints.length > 2) {
      for (let i = 0; i < visiblePoints.length - 1; i++) {
        const p1 = visiblePoints[i];
        const p2 = visiblePoints[i + 1];
        if (p1.rawU !== undefined && p2.rawU !== undefined) {
          if (p1.rawU > 100 || p2.rawU > 100 || p1.rawU < 0 || p2.rawU < 0) {
            const x1 = xToPx(p1.time);
            const x2 = xToPx(p2.time);
            const rawY1 = yToPx(p1.rawU);
            const rawY2 = yToPx(p2.rawU);
            const clmY1 = yToPx(p1.u);
            const clmY2 = yToPx(p2.u);

            ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
            ctx.beginPath();
            ctx.moveTo(x1, clmY1);
            ctx.lineTo(x2, clmY2);
            ctx.lineTo(x2, rawY2);
            ctx.lineTo(x1, rawY1);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    // ==========================================
    // OVERLAY: Multi-Trace Sweep Curves (Module 4)
    // ==========================================
    if (sweepCurves && sweepCurves.length > 0) {
      sweepCurves.forEach((curve) => {
        const pts = curve.data.filter((p) => p.time >= startTime - 0.2);
        if (pts.length < 2) return;

        ctx.strokeStyle = curve.color;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([]);
        ctx.beginPath();
        pts.forEach((p, idx) => {
          const x = xToPx(p.time);
          const y = yToPx(p.pv);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        const lastPt = pts[pts.length - 1];
        if (lastPt) {
          ctx.fillStyle = curve.color;
          ctx.font = '9px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`Kc=${curve.kc}`, xToPx(lastPt.time) + 4, yToPx(lastPt.pv) + 3);
        }
      });
    }

    // ==========================================
    // PRIMARY TRACES (SP, PV, u, rawU, e)
    // ==========================================
    if (visiblePoints.length > 1) {
      // Windup Ghost Trace: Requested Output u_raw (Module 7)
      if (showRawU && (moduleId === 'm7' || activeFeature === 'windupGhostTrace')) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
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
        ctx.strokeStyle = '#a855f7';
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

      // Error e (yellow)
      if (showError) {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        visiblePoints.forEach((p, idx) => {
          const x = xToPx(p.time);
          const y = yToPx(p.error + 50);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Target SP (amber dashed)
      if (showSP) {
        ctx.strokeStyle = activeFeature === 'spLine' ? '#f59e0b' : '#d97706';
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

      // Process Variable PV (cyan solid)
      if (showPV) {
        ctx.strokeStyle = activeFeature === 'pvLine' ? '#38bdf8' : '#06b6d4';
        ctx.lineWidth = activeFeature === 'pvLine' ? 3 : 2.4;
        ctx.beginPath();
        visiblePoints.forEach((p, idx) => {
          const x = xToPx(p.time);
          const y = yToPx(p.pv);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Secondary PV2 (e.g. Bottoms purity xB in MIMO or slave jacket temp in Cascade)
      const hasPV2 = visiblePoints.some((p) => p.pv2 !== undefined);
      if (hasPV2) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.2;
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
        ctx.strokeStyle = '#34d399';
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

      // Feedforward Action uFF (Module 10)
      const hasUFF = visiblePoints.some((p) => p.uFF !== undefined);
      if (hasUFF) {
        ctx.strokeStyle = '#818cf8';
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

    // ==========================================
    // OVERLAY: Module 6 Derivative Tangent Slope Vector (de/dt & Braking Arrow)
    // ==========================================
    if ((activeFeature === 'derivativeSlope' || moduleId === 'm6') && visiblePoints.length > 5) {
      const cur = visiblePoints[visiblePoints.length - 1];
      const slope = cur.derivativeSlope ?? 0;
      const cx = xToPx(cur.time);
      const cy = yToPx(cur.pv);

      // Tangent vector
      const arrowLen = 35;
      const angle = Math.atan2(-slope * 2, 20); // inverted y for canvas
      const endX = cx + arrowLen * Math.cos(angle);
      const endY = cy + arrowLen * Math.sin(angle);

      // Draw Tangent Arrow
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Opposite Braking Vector (Damping Force -Td * dPV/dt)
      const brakeX = cx - arrowLen * 0.8 * Math.cos(angle);
      const brakeY = cy - arrowLen * 0.8 * Math.sin(angle);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(brakeX, brakeY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Slope: ${slope.toFixed(1)} %/s (uD = ${(cur.ud ?? 0).toFixed(1)}%)`, endX + 4, endY + 2);
    }

    // ==========================================
    // OVERLAY: Module 8 Metrics Callipers (tr, ts, Overshoot)
    // ==========================================
    if ((activeFeature === 'metricsCallipers' || moduleId === 'm8') && visiblePoints.length > 5) {
      // Draw ±2% Settling Tunnel
      const sY1 = yToPx(targetSP * 1.02);
      const sY2 = yToPx(targetSP * 0.98);
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(padLeft, sY1, plotW, sY2 - sY1);
      ctx.setLineDash([]);

      ctx.fillStyle = '#0ea5e9';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('±2% Settle Band', padLeft + plotW - 4, sY1 - 3);
    }

    // ==========================================
    // OVERLAY: 63.2% Tau & Theta Brackets (Module 2)
    // ==========================================
    if ((activeFeature === 'tauCrosshair' || moduleId === 'm2') && fopdtParams) {
      const stepT = fopdtParams.stepTime ?? 3.0;
      const theta = fopdtParams.theta ?? 2.0;
      const tau = fopdtParams.tau ?? 5.0;
      const K = fopdtParams.k ?? 1.5;
      const deltaU = fopdtParams.stepVal ?? 40;
      const finalDeltaY = K * deltaU;
      const val63 = 0.632 * finalDeltaY;
      const t63 = stepT + theta + tau;

      if (t63 >= startTime && t63 <= endTime) {
        const x63 = xToPx(t63);
        const y63 = yToPx(val63);

        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(padLeft, y63);
        ctx.lineTo(x63, y63);
        ctx.lineTo(x63, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(x63, y63, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0891b2';
        ctx.fillRect(x63 + 6, y63 - 18, 92, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`63.2% (τ=${tau.toFixed(1)}s)`, x63 + 10, y63 - 6);
      }
    }

    // Mouse inspection crosshair
    if (hoveredPoint) {
      const hx = xToPx(hoveredPoint.time);
      if (hx >= padLeft && hx <= padLeft + plotW) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
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
    showError,
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

  // Compute live term meter percentages (Normalized to 100%)
  const up = Math.max(0, currentPt?.up ?? 0);
  const ui = Math.max(0, currentPt?.ui ?? 0);
  const ud = Math.max(0, currentPt?.ud ?? 0);
  const totalTerms = Math.max(0.1, up + ui + ud);
  const pctP = Math.round((up / totalTerms) * 100);
  const pctI = Math.round((ui / totalTerms) * 100);
  const pctD = Math.max(0, 100 - pctP - pctI);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-lg flex flex-col">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">
              {isAr ? 'راسم الإشارات الرقمي (Strip Scope)' : 'Digital Process Scope'}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>t = {currentPt ? currentPt.time.toFixed(1) : '0.0'}s</span>
          </div>

          {currentPt?.isSaturated && (
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono font-bold text-[10px] border border-rose-800 animate-pulse flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span>{isAr ? 'الصمام متشبع 100%' : 'VALVE SATURATED'}</span>
            </span>
          )}
        </div>

        {/* Trace Toggles */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <button
            onClick={() => setShowSP(!showSP)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
              showSP ? 'bg-amber-950/70 border-amber-500/70 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-0.5 bg-amber-400 inline-block" />
            <span>SP</span>
          </button>
          <button
            onClick={() => setShowPV(!showPV)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
              showPV ? 'bg-cyan-950/70 border-cyan-500/70 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-0.5 bg-cyan-400 inline-block" />
            <span>PV</span>
          </button>
          <button
            onClick={() => setShowU(!showU)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
              showU ? 'bg-purple-950/70 border-purple-500/70 text-purple-300' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-0.5 bg-purple-400 inline-block" />
            <span>u</span>
          </button>
          {moduleId === 'm7' && (
            <button
              onClick={() => setShowRawU(!showRawU)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                showRawU ? 'bg-rose-950/70 border-rose-500/70 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              <span className="w-2 h-0.5 bg-rose-400 inline-block" />
              <span>u_raw (Windup)</span>
            </button>
          )}
          <button
            onClick={() => setShowError(!showError)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
              showError ? 'bg-yellow-950/70 border-yellow-500/70 text-yellow-300' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-0.5 bg-yellow-400 inline-block" />
            <span>e</span>
          </button>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[10px] font-mono">
            {[15, 30, 60].map((sec) => (
              <button
                key={sec}
                onClick={() => setTimeWindow(sec)}
                className={`px-2 py-0.5 rounded ${
                  timeWindow === sec ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          <button
            onClick={onTogglePlay}
            className={`p-1.5 rounded-lg border font-medium transition-all ${
              isRunning
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title={isRunning ? (isAr ? 'إيقاف مؤقت' : 'Pause Simulation') : (isAr ? 'تشغيل' : 'Run Simulation')}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title={isAr ? 'إعادة ضبط المحاكاة' : 'Reset Scope'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="relative w-full h-64 mt-2">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          className="w-full h-full rounded-xl cursor-crosshair block"
        />

        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-slate-950/90 border border-slate-700 rounded-lg p-2 text-[10px] font-mono shadow-xl backdrop-blur pointer-events-none flex items-center gap-3">
            <span className="text-slate-400">t: <b className="text-white">{hoveredPoint.time.toFixed(2)}s</b></span>
            <span className="text-amber-400">SP: <b>{hoveredPoint.sp.toFixed(1)}%</b></span>
            <span className="text-cyan-400">PV: <b>{hoveredPoint.pv.toFixed(1)}%</b></span>
            <span className="text-purple-400">u: <b>{hoveredPoint.u.toFixed(1)}%</b></span>
            {hoveredPoint.rawU !== undefined && (
              <span className="text-rose-400">u_raw: <b>{hoveredPoint.rawU.toFixed(1)}%</b></span>
            )}
            <span className="text-yellow-400">e: <b>{(hoveredPoint.sp - hoveredPoint.pv).toFixed(1)}%</b></span>
          </div>
        )}
      </div>

      {/* Live PID Term Breakdown Meter (uP, uI, uD) */}
      {showTermMeter && currentPt && (currentPt.up !== undefined || currentPt.ui !== undefined) && (
        <div className="mt-3 p-2 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] font-mono space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span className="flex items-center gap-1">
              <BarChart2 className="w-3 h-3 text-cyan-400" />
              {isAr ? 'توزيع جهود التحكم الحالية (uP + uI + uD):' : 'Live PID Term Contributions:'}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sky-300">P: {(currentPt.up ?? 0).toFixed(1)}%</span>
              <span className="text-emerald-300">I: {(currentPt.ui ?? 0).toFixed(1)}%</span>
              <span className="text-pink-300">D: {(currentPt.ud ?? 0).toFixed(1)}%</span>
            </div>
          </div>
          {/* Stacked bar */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
            <div className="bg-sky-400 transition-all duration-150" style={{ width: `${pctP}%` }} title={`Proportional: ${pctP}%`} />
            <div className="bg-emerald-400 transition-all duration-150" style={{ width: `${pctI}%` }} title={`Integral: ${pctI}%`} />
            <div className="bg-pink-400 transition-all duration-150" style={{ width: `${pctD}%` }} title={`Derivative: ${pctD}%`} />
          </div>
        </div>
      )}

      {/* Live Metrics Strip */}
      <div className="mt-2.5 pt-2 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
        <div className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
          <span className="text-slate-400">SP:</span>
          <span className="text-amber-300 font-bold">{currentPt ? currentPt.sp.toFixed(1) : 0}%</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
          <span className="text-slate-400">PV:</span>
          <span className="text-cyan-300 font-bold">{currentPt ? currentPt.pv.toFixed(1) : 0}%</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
          <span className="text-slate-400">Error:</span>
          <span className={`font-bold ${Math.abs(currentPt ? currentPt.sp - currentPt.pv : 0) > 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {currentPt ? (currentPt.sp - currentPt.pv).toFixed(1) : 0}%
          </span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
          <span className="text-slate-400">Valve u:</span>
          <span className="text-purple-300 font-bold">{currentPt ? currentPt.u.toFixed(1) : 0}%</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
          <span className="text-slate-400">{isAr ? 'اهتزاز الصمام:' : 'Valve Travel:'}</span>
          <span className="text-slate-200 font-bold">{currentPt?.valveChatter ?? 0}</span>
        </div>
      </div>
    </div>
  );
};
