/**
 * Block Diagram Canvas (bigp Milestone 0 & 1 Drag-and-Wire Canvas)
 * Features:
 * - Draggable block nodes with input & output ports
 * - Cubic Bezier connection wires with animated flowing pulses
 * - Live signal value tags along wires and ports
 * - Interactive parameter inspector on block click
 * - In Studio & Module 3: interactive port-to-port wiring and wire deletion
 */

import React, { useState, useRef, useEffect } from 'react';
import { BlockNode, CircuitGraph, WireConnection } from '../types/engine';
import { VisualFeatureId } from '../types/curriculum';
import { Settings, Trash2, X, Plus, Sparkles, Check } from 'lucide-react';

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

  // Wiring in progress state (dragging from a port)
  const [wiringFrom, setWiringFrom] = useState<{ blockId: string; portId: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected block for configuration modal
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Animation pulse offset
  const [dashOffset, setDashOffset] = useState(0);

  useEffect(() => {
    let animId: number;
    const animate = () => {
      setDashOffset((prev) => (prev + 0.6) % 24);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  const selectedNode = graph.nodes.find((n) => n.id === selectedBlockId);

  // Mouse move handler for dragging nodes or drawing wire
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
  const nodeH = 76;

  // Calculate port positions
  const getPortCoords = (blockId: string, portId: string, isInput: boolean) => {
    const node = graph.nodes.find((n) => n.id === blockId);
    if (!node) return { x: 0, y: 0 };

    if (isInput) {
      const portIdx = node.inputs.findIndex((p) => p.id === portId);
      const total = node.inputs.length || 1;
      const spacing = nodeH / (total + 1);
      return {
        x: node.x,
        y: node.y + (portIdx + 1) * spacing,
      };
    } else {
      const portIdx = node.outputs.findIndex((p) => p.id === portId);
      const total = node.outputs.length || 1;
      const spacing = nodeH / (total + 1);
      return {
        x: node.x + nodeW,
        y: node.y + (portIdx + 1) * spacing,
      };
    }
  };

  // Connect wire on port drop
  const handlePortMouseUp = (targetBlockId: string, targetPortId: string, isInput: boolean) => {
    if (!wiringFrom || !isInput) return;
    if (wiringFrom.blockId === targetBlockId) return; // Prevent self-loop if same block

    // Remove existing wire going into this input port if any (SISO convention)
    const filteredWires = graph.wires.filter(
      (w) => !(w.toBlockId === targetBlockId && w.toPortId === targetPortId)
    );

    const newWire: WireConnection = {
      id: `w-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fromBlockId: wiringFrom.blockId,
      fromPortId: wiringFrom.portId,
      toBlockId: targetBlockId,
      toPortId: targetPortId,
    };

    onUpdateGraph({ ...graph, wires: [...filteredWires, newWire] });
    setWiringFrom(null);
  };

  const deleteWire = (wireId: string) => {
    onUpdateGraph({
      ...graph,
      wires: graph.wires.filter((w) => w.id !== wireId),
    });
  };

  return (
    <div className="relative bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-lg overflow-hidden flex flex-col">
      {/* Canvas Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
          <h4 className="font-bold text-white uppercase tracking-wider text-xs">
            {isAr ? 'مخطط الصناديق والأسلاك التفاعلي' : 'Interactive Block Diagram Canvas'}
          </h4>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          {allowWiring && (
            <span className="text-cyan-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {isAr ? 'انقر على المنفذ واسحب للتوصيل' : 'Click port & drag to connect wire'}
            </span>
          )}
          <span className="font-mono text-[10px] text-slate-500">
            {graph.nodes.length} {isAr ? 'كتلة' : 'blocks'} / {graph.wires.length} {isAr ? 'سلك' : 'wires'}
          </span>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative w-full h-[320px] bg-slate-950/80 rounded-xl mt-2 overflow-hidden border border-slate-900 select-none cursor-default"
        style={{
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          {/* Render All Connection Wires */}
          {graph.wires.map((wire) => {
            const start = getPortCoords(wire.fromBlockId, wire.fromPortId, false);
            const end = getPortCoords(wire.toBlockId, wire.toPortId, true);

            // Calculate bezier control points
            const dx = Math.abs(end.x - start.x) * 0.5;
            const pathD = `M ${start.x} ${start.y} C ${start.x + Math.max(30, dx)} ${start.y}, ${end.x - Math.max(30, dx)} ${end.y}, ${end.x} ${end.y}`;

            const signalVal = activeSignals[wire.id] ?? 0;
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;

            return (
              <g key={wire.id} className="pointer-events-auto group">
                {/* Background wider hit target */}
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

                {/* Main wire line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  opacity="0.8"
                />

                {/* Flowing animated pulse dots */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeDasharray="4 20"
                  strokeDashoffset={-dashOffset}
                  opacity="0.9"
                />

                {/* Signal value bubble in middle of wire */}
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-18"
                    y="-9"
                    width="36"
                    height="18"
                    rx="4"
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {signalVal.toFixed(1)}
                  </text>

                  {/* Wire delete button on hover if wiring allowed */}
                  {allowWiring && (
                    <g
                      className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWire(wire.id);
                      }}
                    >
                      <circle cx="16" cy="-8" r="6" fill="#ef4444" />
                      <line x1="13" y1="-11" x2="19" y2="-5" stroke="#ffffff" strokeWidth="1.5" />
                      <line x1="19" y1="-11" x2="13" y2="-5" stroke="#ffffff" strokeWidth="1.5" />
                    </g>
                  )}
                </g>
              </g>
            );
          })}

          {/* Wire in progress while dragging from port */}
          {wiringFrom && (
            <path
              d={`M ${wiringFrom.x} ${wiringFrom.y} C ${wiringFrom.x + 50} ${wiringFrom.y}, ${mousePos.x - 50} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {/* Render Block Nodes */}
        {graph.nodes.map((node) => {
          const isControllerHighlighted =
            activeFeature === 'controllerBlock' && ['P', 'PI', 'PID', 'OnOff'].includes(node.type);
          const isSelected = selectedBlockId === node.id;

          return (
            <div
              key={node.id}
              style={{ left: `${node.x}px`, top: `${node.y}px`, width: `${nodeW}px`, height: `${nodeH}px` }}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).dataset.port) return;
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                  setDraggingNodeId(node.id);
                  setDragOffset({
                    x: e.clientX - rect.left - node.x,
                    y: e.clientY - rect.top - node.y,
                  });
                }
              }}
              onClick={() => setSelectedBlockId(node.id)}
              className={`absolute rounded-xl bg-slate-900 border transition-all cursor-move select-none p-2 flex flex-col justify-between shadow-md ${
                isControllerHighlighted
                  ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-950/50'
                  : isSelected
                  ? 'border-cyan-400 ring-1 ring-cyan-400/40'
                  : 'border-slate-700/80 hover:border-slate-500'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white truncate">
                  {isAr ? node.titleAr || node.title : node.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBlockId(node.id);
                  }}
                  className="p-0.5 rounded text-slate-400 hover:text-cyan-300"
                >
                  <Settings className="w-3 h-3" />
                </button>
              </div>

              {/* Node Body Details */}
              <div className="text-[10px] font-mono text-cyan-300/90 truncate">
                {node.type === 'P' && `Kc = ${node.config.kc ?? 2.0} (PB=${(100 / (node.config.kc ?? 2.0)).toFixed(0)}%)`}
                {node.type === 'PI' && `Kc=${node.config.kc ?? 2}, Ti=${node.config.ti ?? 10}s`}
                {node.type === 'OnOff' && `Δ = ${node.config.deadband ?? 3}%`}
                {node.type === 'FirstOrder' && `K=${node.config.gain ?? 1}, τ=${node.config.timeConstant ?? 5}s`}
                {node.type === 'DeadTime' && `θ = ${node.config.deadTime ?? 2}s`}
                {node.type === 'Tank' && `A = ${node.config.area ?? 1.5}m²`}
                {node.type === 'Step' && `Step: ${node.config.stepValue ?? 50}`}
                {node.type === 'Constant' && `Val: ${node.config.value ?? 60}`}
                {node.type === 'Sum' && `${node.config.signs?.join(' ') || '+ -'}`}
              </div>

              {/* Ports: Left (Inputs) & Right (Outputs) */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                {/* Inputs */}
                <div className="flex flex-col gap-1">
                  {node.inputs.map((inp) => (
                    <div
                      key={inp.id}
                      data-port="true"
                      onMouseUp={(e) => {
                        e.stopPropagation();
                        handlePortMouseUp(node.id, inp.id, true);
                      }}
                      className="w-3.5 h-3.5 -ml-3.5 rounded-full bg-slate-800 border-2 border-cyan-400 hover:scale-125 hover:bg-cyan-400 transition-transform cursor-pointer flex items-center justify-center"
                      title={`${inp.name} (${inp.type})`}
                    />
                  ))}
                </div>

                {/* Outputs */}
                <div className="flex flex-col gap-1">
                  {node.outputs.map((out) => (
                    <div
                      key={out.id}
                      data-port="true"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (!allowWiring) return;
                        const coords = getPortCoords(node.id, out.id, false);
                        setWiringFrom({
                          blockId: node.id,
                          portId: out.id,
                          x: coords.x,
                          y: coords.y,
                        });
                      }}
                      className="w-3.5 h-3.5 -mr-3.5 rounded-full bg-slate-800 border-2 border-sky-400 hover:scale-125 hover:bg-sky-400 transition-transform cursor-pointer flex items-center justify-center"
                      title={`${out.name} (${out.type})`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Block Inspector Modal / Slide-over */}
      {selectedNode && (
        <div className="mt-3 p-3 bg-slate-950/90 rounded-xl border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white">
              {isAr ? selectedNode.titleAr || selectedNode.title : selectedNode.title}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
              {selectedNode.type}
            </span>
          </div>

          {/* Inline quick-tune inputs */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedNode.type === 'P' && (
              <div className="flex items-center gap-2">
                <label className="text-slate-400 font-mono">Kc:</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="50"
                  value={selectedNode.config.kc ?? 2.0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0.1;
                    const newNodes = graph.nodes.map((n) =>
                      n.id === selectedNode.id ? { ...n, config: { ...n.config, kc: val } } : n
                    );
                    onUpdateGraph({ ...graph, nodes: newNodes });
                  }}
                  className="w-16 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                />
                <span className="text-slate-400 font-mono ml-2">Action:</span>
                <button
                  onClick={() => {
                    const newAction: 'reverse' | 'direct' = selectedNode.config.action === 'reverse' ? 'direct' : 'reverse';
                    const newNodes = graph.nodes.map((n) =>
                      n.id === selectedNode.id ? { ...n, config: { ...n.config, action: newAction } } : n
                    );
                    onUpdateGraph({ ...graph, nodes: newNodes });
                  }}
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${
                    selectedNode.config.action === 'reverse'
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                      : 'bg-rose-950/80 border-rose-500/80 text-rose-300'
                  }`}
                >
                  {selectedNode.config.action === 'reverse' ? 'Reverse (+)' : 'Direct (-)'}
                </button>
              </div>
            )}

            {selectedNode.type === 'OnOff' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono">Action:</span>
                <button
                  onClick={() => {
                    const newAction: 'reverse' | 'direct' = selectedNode.config.action === 'reverse' ? 'direct' : 'reverse';
                    const newNodes = graph.nodes.map((n) =>
                      n.id === selectedNode.id ? { ...n, config: { ...n.config, action: newAction } } : n
                    );
                    onUpdateGraph({ ...graph, nodes: newNodes });
                  }}
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${
                    selectedNode.config.action === 'reverse'
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                      : 'bg-rose-950/80 border-rose-500/80 text-rose-300'
                  }`}
                >
                  {selectedNode.config.action === 'reverse' ? 'Reverse (Heating/Filling)' : 'Direct (Cooling)'}
                </button>
              </div>
            )}

            {selectedNode.type === 'FirstOrder' && (
              <div className="flex items-center gap-3">
                <label className="text-slate-400 font-mono">K:</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedNode.config.gain ?? 1.5}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 1.0;
                    const newNodes = graph.nodes.map((n) =>
                      n.id === selectedNode.id ? { ...n, config: { ...n.config, gain: val } } : n
                    );
                    onUpdateGraph({ ...graph, nodes: newNodes });
                  }}
                  className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                />
                <label className="text-slate-400 font-mono">τ (sec):</label>
                <input
                  type="number"
                  step="0.5"
                  value={selectedNode.config.timeConstant ?? 5.0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 1.0;
                    const newNodes = graph.nodes.map((n) =>
                      n.id === selectedNode.id ? { ...n, config: { ...n.config, timeConstant: val } } : n
                    );
                    onUpdateGraph({ ...graph, nodes: newNodes });
                  }}
                  className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>
            )}

            {selectedNode.type === 'DeadTime' && (
              <div className="flex items-center gap-2">
                <label className="text-slate-400 font-mono">θ (sec):</label>
                <input
                  type="number"
                  step="0.2"
                  value={selectedNode.config.deadTime ?? 2.0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const newNodes = graph.nodes.map((n) =>
                      n.id === selectedNode.id ? { ...n, config: { ...n.config, deadTime: val } } : n
                    );
                    onUpdateGraph({ ...graph, nodes: newNodes });
                  }}
                  className="w-16 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>
            )}

            <button
              onClick={() => setSelectedBlockId(null)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
