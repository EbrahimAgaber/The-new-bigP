/**
 * Block Diagram Canvas (bigp Drag-and-Wire Canvas)
 * Industrial P&ID / ISA-5.1 standard shapes:
 * - Valves: ISA Bowtie triangles with pneumatic actuator diaphragm
 * - Tanks: Cylindrical curved vessels with liquid level fill
 * - Heat Exchangers: Cylindrical shell with internal U-tubes
 * - Controllers: ISA circular instrument bubbles with Tag and Function
 * - Sum / Comparator: Circular summing junctions with + / - signs
 * - Clean light theme styling with crisp Bezier connection lines.
 */

import React, { useState, useRef, useEffect } from 'react';
import { BlockNode, CircuitGraph, WireConnection } from '../types/engine';
import { VisualFeatureId } from '../types/curriculum';
import { Settings, Trash2, X, Plus, Sparkles, Check, Activity, HelpCircle } from 'lucide-react';

interface BlockDiagramCanvasProps {
  graph: CircuitGraph;
  activeSignals: Record<string, number>;
  onUpdateGraph: (newGraph: CircuitGraph) => void;
  activeFeature: VisualFeatureId | null;
  allowWiring?: boolean;
  lang: 'en' | 'ar';
}

export const BlockDiagramCanvas: React.FC<BlockDiagramCanvasProps> = ({
  graph,
  activeSignals,
  onUpdateGraph,
  activeFeature,
  allowWiring = false,
  lang,
}) => {
  const isAr = lang === 'ar';
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Wiring in progress state
  const [wiringFrom, setWiringFrom] = useState<{ blockId: string; portId: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected block for configuration modal
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showPidGuide, setShowPidGuide] = useState(false);

  const selectedNode = graph.nodes.find((n) => n.id === selectedBlockId);

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    setMousePos({ x: curX, y: curY });

    if (draggingNodeId) {
      const newNodes = graph.nodes.map((n) => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            x: Math.max(10, Math.min(850, curX - dragOffset.x)),
            y: Math.max(10, Math.min(450, curY - dragOffset.y)),
          };
        }
        return n;
      });
      onUpdateGraph({ ...graph, nodes: newNodes });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setWiringFrom(null);
  };

  // Node dimension constants
  const nodeW = 140;
  const nodeH = 80;

  // Calculate port positions
  const getPortCoords = (blockId: string, portId: string, isInput: boolean) => {
    const node = graph.nodes.find((n) => n.id === blockId);
    if (!node) return { x: 0, y: 0 };

    if (isInput) {
      const idx = node.inputs.findIndex((p) => p.id === portId);
      const total = Math.max(1, node.inputs.length);
      const stepY = nodeH / (total + 1);
      return {
        x: node.x,
        y: node.y + stepY * (idx + 1),
      };
    } else {
      const idx = node.outputs.findIndex((p) => p.id === portId);
      const total = Math.max(1, node.outputs.length);
      const stepY = nodeH / (total + 1);
      return {
        x: node.x + nodeW,
        y: node.y + stepY * (idx + 1),
      };
    }
  };

  const handleStartWire = (blockId: string, portId: string, e: React.MouseEvent) => {
    if (!allowWiring) return;
    e.stopPropagation();
    const coords = getPortCoords(blockId, portId, false);
    setWiringFrom({ blockId, portId, x: coords.x, y: coords.y });
  };

  const handleEndWire = (toBlockId: string, toPortId: string, e: React.MouseEvent) => {
    if (!allowWiring || !wiringFrom) return;
    e.stopPropagation();

    if (wiringFrom.blockId === toBlockId) return;

    const exists = graph.wires.some(
      (w) =>
        w.fromBlockId === wiringFrom.blockId &&
        w.fromPortId === wiringFrom.portId &&
        w.toBlockId === toBlockId &&
        w.toPortId === toPortId
    );
    if (exists) return;

    const newWire: WireConnection = {
      id: `w-${Date.now()}`,
      fromBlockId: wiringFrom.blockId,
      fromPortId: wiringFrom.portId,
      toBlockId,
      toPortId,
    };

    onUpdateGraph({
      ...graph,
      wires: [...graph.wires, newWire],
    });

    setWiringFrom(null);
  };

  const deleteWire = (wireId: string) => {
    onUpdateGraph({
      ...graph,
      wires: graph.wires.filter((w) => w.id !== wireId),
    });
  };

  const deleteNode = (nodeId: string) => {
    onUpdateGraph({
      nodes: graph.nodes.filter((n) => n.id !== nodeId),
      wires: graph.wires.filter((w) => w.fromBlockId !== nodeId && w.toBlockId !== nodeId),
    });
    if (selectedBlockId === nodeId) setSelectedBlockId(null);
  };

  return (
    <div className="panel-card p-4 sm:p-5 flex flex-col justify-between">
      {/* Canvas Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-xs">
              {isAr ? 'مخطط المنظومة الصناعية التفاعلي (P&ID Flowsheet)' : 'Interactive P&ID Process Flowsheet'}
            </h3>
            <span className="text-[10px] text-slate-500">
              {allowWiring
                ? isAr
                  ? 'اسحب الدوائر بين المنافذ للتوصيل، وانقر على السلك لحذفه'
                  : 'Drag from ports to wire; click wire to disconnect'
                : isAr
                ? 'رموز الصمامات والخزانات وأجهزة القياس وفق معيار ISA القياسي'
                : 'ISA-standard Valves, Vessels, Bubble Controllers & Transmitters'}
            </span>
          </div>
        </div>

        {/* Live Blocks Counter & Guide Trigger */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <button
            onClick={() => setShowPidGuide(!showPidGuide)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-sans font-semibold transition-all ${
              showPidGuide
                ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title={isAr ? 'دليل فهم رموز P&ID' : 'How does P&ID work?'}
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-600" />
            <span className="hidden sm:inline">{isAr ? 'كيف يعمل P&ID؟' : 'How P&ID works'}</span>
          </button>
          <span className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200">
            {graph.nodes.length} Elements
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200">
            {graph.wires.length} Lines
          </span>
        </div>
      </div>

      {/* Guide Banner for Learner */}
      {showPidGuide && (
        <div className="mt-3 p-3.5 bg-gradient-to-r from-sky-50 to-indigo-50/70 rounded-xl border border-sky-200 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>📐 {isAr ? 'دليل فهم مخطط الأنابيب والأجهزة الصناعي (P&ID):' : 'How the Interactive P&ID Works:'}</span>
            </span>
            <button
              onClick={() => setShowPidGuide(false)}
              className="text-slate-400 hover:text-slate-600 text-[11px]"
            >
              ✕
            </button>
          </div>
          <p className="text-slate-700 leading-relaxed text-[11px]">
            {isAr
              ? 'مخطط P&ID يترجم المنظومة المادية إلى حلقة تحكم ديناميكية. الإشارات الزرقاء تتدفق من الهدف (SP) عبر المقارن إلى صمام التحكم، ثم إلى الخزان، ليعود حساس المستوى بقياس PV لإكمال الحلقة.'
              : 'The P&ID diagram models the physical system as a closed decision loop. Dynamic signals flow from Setpoint (SP) through the Error Comparator to the Control Valve, which fills the Tank. The Level Sensor then measures PV and feeds it back.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 font-sans">
            <div className="p-2 rounded-lg bg-white/90 border border-slate-200">
              <span className="font-bold text-slate-800 block text-[10px]">1. Setpoint (SP)</span>
              <span className="text-[10px] text-slate-500">{isAr ? 'القيمة المستهدفة المطلوبة' : 'Desired Target value'}</span>
            </div>
            <div className="p-2 rounded-lg bg-white/90 border border-slate-200">
              <span className="font-bold text-slate-800 block text-[10px]">2. Comparator (Sum)</span>
              <span className="text-[10px] text-slate-500">{isAr ? 'يحسب الفجوة e = SP - PV' : 'Calculates error e = SP - PV'}</span>
            </div>
            <div className="p-2 rounded-lg bg-white/90 border border-slate-200">
              <span className="font-bold text-slate-800 block text-[10px]">3. Actuator (Valve)</span>
              <span className="text-[10px] text-slate-500">{isAr ? 'يضخ التدفق للتعويض' : 'Commands inflow rate u'}</span>
            </div>
            <div className="p-2 rounded-lg bg-white/90 border border-slate-200">
              <span className="font-bold text-slate-800 block text-[10px]">4. Process Vessel</span>
              <span className="text-[10px] text-slate-500">{isAr ? 'الخزان الديناميكي' : 'Accumulates level PV'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Canvas Area with Horizontal Scroll Guard */}
      <div className="overflow-x-auto w-full mt-3 rounded-2xl border border-slate-200">
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="relative min-w-[640px] w-full h-[330px] bg-slate-50/60 overflow-hidden select-none cursor-default bg-dot-grid shadow-inner"
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <style>{`
                @keyframes pulseFlow {
                  from { stroke-dashoffset: 20; }
                  to { stroke-dashoffset: 0; }
                }
                .animate-signal-pulse {
                  animation: pulseFlow 1.2s linear infinite;
                }
              `}</style>
            </defs>
            {/* Render All Connection Wires */}
            {graph.wires.map((wire) => {
              const start = getPortCoords(wire.fromBlockId, wire.fromPortId, false);
              const end = getPortCoords(wire.toBlockId, wire.toPortId, true);

              const dx = Math.abs(end.x - start.x) * 0.5;
              const pathD = `M ${start.x} ${start.y} C ${start.x + Math.max(30, dx)} ${start.y}, ${end.x - Math.max(30, dx)} ${end.y}, ${end.x} ${end.y}`;

              const signalVal = activeSignals[wire.id] ?? 0;
              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;

              return (
                <g key={wire.id} className="pointer-events-auto group">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="14"
                    className="cursor-pointer"
                    onClick={() => {
                      if (allowWiring) deleteWire(wire.id);
                    }}
                  />

                  {/* Main pipe/signal line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.5"
                    opacity="0.85"
                  />

                  {/* Flowing animated pulse dots */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="4 16"
                    className="animate-signal-pulse"
                    opacity="0.95"
                  />

                {/* Signal value tag */}
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-20"
                    y="-10"
                    width="40"
                    height="20"
                    rx="6"
                    fill="#ffffff"
                    stroke="#0284c7"
                    strokeWidth="1.2"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.05))"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#0369a1"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {signalVal.toFixed(1)}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Wire in progress */}
          {wiringFrom && (
            <path
              d={`M ${wiringFrom.x} ${wiringFrom.y} L ${mousePos.x} ${mousePos.y}`}
              fill="none"
              stroke="#d97706"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {/* Render Industrial Plant & Control Elements */}
        {graph.nodes.map((node) => {
          const isSelected = selectedBlockId === node.id;
          const isHighlighted =
            (activeFeature === 'controllerBlock' && ['P', 'PI', 'PID'].includes(node.type)) ||
            (activeFeature === 'inflowValve' && node.type === 'Valve') ||
            (activeFeature === 'tankLevel' && node.type === 'Tank');

          const isValve = node.type === 'Valve' || node.type === 'SplitRange';
          const isVessel = ['Tank', 'HeatedVessel', 'Bioreactor', 'CSTRPlant', 'BoilerDrumPlant'].includes(node.type);
          const isExchanger = node.type === 'HeatExchangerPlant';
          const isController = ['P', 'PI', 'PID', 'OnOff', 'Autotune'].includes(node.type);
          const isSum = node.type === 'Sum';

          return (
            <div
              key={node.id}
              style={{ left: `${node.x}px`, top: `${node.y}px`, width: `${nodeW}px`, height: `${nodeH}px` }}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).tagName === 'BUTTON') return;
                setDraggingNodeId(node.id);
                setDragOffset({
                  x: e.clientX - containerRef.current!.getBoundingClientRect().left - node.x,
                  y: e.clientY - containerRef.current!.getBoundingClientRect().top - node.y,
                });
              }}
              onClick={() => setSelectedBlockId(node.id)}
              className={`absolute p-2 cursor-grab active:cursor-grabbing transition-all select-none shadow-sm ${
                isVessel
                  ? 'rounded-2xl border-2'
                  : isValve
                  ? 'rounded-xl border'
                  : isSum
                  ? 'rounded-full border-2'
                  : 'rounded-xl border'
              } ${
                isHighlighted
                  ? 'border-cyan-500 bg-cyan-50 shadow-md ring-2 ring-cyan-400/50'
                  : isSelected
                  ? 'border-indigo-500 bg-indigo-50/70 shadow-sm'
                  : isVessel
                  ? 'border-slate-300 bg-gradient-to-b from-white to-slate-100 hover:border-slate-400'
                  : isValve
                  ? 'border-amber-300 bg-amber-50/60 hover:border-amber-400'
                  : isController
                  ? 'border-sky-300 bg-sky-50/70 hover:border-sky-400'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Specialized ISA Shape Visual Rendering */}
              {isValve ? (
                /* ISA Control Valve Bowtie Shape */
                <div className="flex flex-col items-center justify-between h-full py-0.5">
                  <div className="flex items-center gap-1">
                    <span className="w-5 h-2.5 rounded-t-full bg-amber-400 border border-amber-600 block" title="Diaphragm Actuator" />
                    <span className="text-[9px] font-bold text-amber-900 font-mono">CV</span>
                  </div>
                  {/* Bowtie SVG */}
                  <svg width="44" height="20" viewBox="0 0 44 20" className="my-0.5">
                    <polygon points="2,2 20,10 2,18" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
                    <polygon points="42,2 24,10 42,18" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
                    <line x1="22" y1="2" x2="22" y2="10" stroke="#b45309" strokeWidth="2" />
                  </svg>
                  <span className="font-bold text-[10px] text-slate-800 truncate">{node.title}</span>
                </div>
              ) : isVessel ? (
                /* Cylindrical Process Vessel Shape */
                <div className="flex flex-col justify-between h-full py-0.5 px-1">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                    <span className="font-bold text-[10px] text-slate-800 truncate">{node.title}</span>
                    <span className="text-[8px] font-mono px-1 rounded bg-slate-200 text-slate-700 font-bold">
                      {node.type === 'Tank' ? 'TK' : 'VESSEL'}
                    </span>
                  </div>
                  {/* Vessel graphic */}
                  <div className="relative w-full h-7 bg-slate-200 rounded-md overflow-hidden border border-slate-300">
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-cyan-600 to-sky-400 transition-all duration-300"
                      style={{ height: `${Math.min(100, Math.max(10, activeSignals[node.id] || 50))}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-[9px] text-slate-800 drop-shadow-xs">
                      {(activeSignals[node.id] || 0).toFixed(0)}%
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 text-center">Process Vessel</span>
                </div>
              ) : isController ? (
                /* ISA Circle Instrument Bubble */
                <div className="flex flex-col items-center justify-between h-full py-0.5">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-sky-600 flex flex-col items-center justify-center shadow-xs">
                    <span className="text-[9px] font-mono font-bold text-sky-800">{node.type}</span>
                    <span className="text-[8px] font-mono text-slate-500">101</span>
                  </div>
                  <span className="font-bold text-[10px] text-slate-800 truncate">{node.title}</span>
                </div>
              ) : isSum ? (
                /* Summing junction */
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-700 flex items-center justify-center font-bold text-slate-800 font-mono text-xs">
                    Σ
                  </div>
                  <span className="text-[9px] font-bold text-slate-600 mt-1">Sum/Err</span>
                </div>
              ) : (
                /* Standard Functional Block */
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="font-bold text-slate-800 text-[11px] truncate">{node.title}</span>
                    <span className="text-[9px] font-mono font-bold text-cyan-800 bg-cyan-100 px-1 rounded">
                      {node.type}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                    <span>{node.customLabel || `${node.inputs.length} in / ${node.outputs.length} out`}</span>
                  </div>
                </div>
              )}

              {/* Input Ports (Left) */}
              {node.inputs.map((port, pIdx) => {
                const total = Math.max(1, node.inputs.length);
                const stepY = nodeH / (total + 1);
                const yPos = stepY * (pIdx + 1);

                return (
                  <div
                    key={port.id}
                    style={{ top: `${yPos}px`, left: '-7px' }}
                    onMouseUp={(e) => handleEndWire(node.id, port.id, e)}
                    className="absolute -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-cyan-600 hover:bg-cyan-600 hover:scale-125 transition-all cursor-pointer z-20 flex items-center justify-center group shadow-xs"
                    title={`Input: ${port.name}`}
                  >
                    <span className="absolute -left-6 text-[8px] font-mono text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {port.name}
                    </span>
                  </div>
                );
              })}

              {/* Output Ports (Right) */}
              {node.outputs.map((port, pIdx) => {
                const total = Math.max(1, node.outputs.length);
                const stepY = nodeH / (total + 1);
                const yPos = stepY * (pIdx + 1);

                return (
                  <div
                    key={port.id}
                    style={{ top: `${yPos}px`, right: '-7px' }}
                    onMouseDown={(e) => handleStartWire(node.id, port.id, e)}
                    className="absolute -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 hover:bg-emerald-600 hover:scale-125 transition-all cursor-pointer z-20 flex items-center justify-center group shadow-xs"
                    title={`Output: ${port.name}`}
                  >
                    <span className="absolute -right-6 text-[8px] font-mono text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {port.name}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
        </div>
      </div>

      {/* Selected Block Parameter Tuning Bar */}
      {selectedNode && (
        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-700" />
            <span className="font-bold text-slate-800">
              {isAr ? 'معاملات العنصر:' : 'Tuning Element:'} {selectedNode.title} ({selectedNode.type})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {['P', 'PI', 'PID'].includes(selectedNode.type) && (
              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-mono text-xs font-bold">Kc:</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedNode.config.kc ?? 2.0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0.1;
                    const newNodes = graph.nodes.map((n) =>
                      n.id === selectedNode.id ? { ...n, config: { ...n.config, kc: val } } : n
                    );
                    onUpdateGraph({ ...graph, nodes: newNodes });
                  }}
                  className="w-16 px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 font-mono text-xs focus:border-cyan-600 outline-none"
                />
              </div>
            )}

            <button
              onClick={() => setSelectedBlockId(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
