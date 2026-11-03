/**
 * Studio Sandbox Mode (bigp Simulink-Style Free Sandbox)
 * Every block in the palette unlocked from the start:
 * Step, Tank, HeatedVessel, Bioreactor, Valve, Sensor, Sum, OnOff, P, PI, PID,
 * FirstOrder, DeadTime, Saturation, Noise, Scope.
 * Features: Palette block addition, preset loading, simulation speed controls.
 */

import React, { useState } from 'react';
import { CircuitGraph, BlockType, BlockNode } from '../types/engine';
import { BlockDiagramCanvas } from './BlockDiagramCanvas';
import { ScopeChart } from './ScopeChart';
import { EquipmentVisualizer } from './EquipmentVisualizer';
import {
  Layers,
  Plus,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Bookmark,
  FlaskConical,
  Flame,
  Gauge,
  Sliders,
  Download,
} from 'lucide-react';

interface StudioSandboxProps {
  graph: CircuitGraph;
  activeSignals: Record<string, number>;
  onUpdateGraph: (graph: CircuitGraph) => void;
  history: any[];
  isRunning: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  simSpeed: number;
  onSetSimSpeed: (speed: number) => void;
  lang: 'en' | 'ar';
}

const PRESET_CIRCUITS: Record<string, { titleEn: string; titleAr: string; graph: CircuitGraph }> = {
  levelLoop: {
    titleEn: 'Level Control Loop (Tank + PI)',
    titleAr: 'حلقة تحكم بمستوى الخزان (خزان + PI)',
    graph: {
      nodes: [
        {
          id: 'sp',
          type: 'Constant',
          title: 'Setpoint (SP)',
          x: 40,
          y: 60,
          inputs: [],
          outputs: [{ id: 'sp-out', name: 'SP', type: 'output' }],
          config: { value: 70 },
        },
        {
          id: 'sum',
          type: 'Sum',
          title: 'Sum / Error',
          x: 180,
          y: 60,
          inputs: [
            { id: 's-in1', name: '+', type: 'input' },
            { id: 's-in2', name: '-', type: 'input' },
          ],
          outputs: [{ id: 's-out', name: 'e', type: 'output' }],
          config: { signs: ['+', '-'] },
        },
        {
          id: 'pi-ctrl',
          type: 'PI',
          title: 'PI Controller',
          x: 320,
          y: 60,
          inputs: [{ id: 'pi-in', name: 'e', type: 'input' }],
          outputs: [{ id: 'pi-out', name: 'u', type: 'output' }],
          config: { kc: 3.0, ti: 8.0, bias: 10, action: 'reverse', outputMin: 0, outputMax: 100 },
        },
        {
          id: 'valve',
          type: 'Valve',
          title: 'Control Valve',
          x: 480,
          y: 60,
          inputs: [{ id: 'v-in', name: 'u', type: 'input' }],
          outputs: [{ id: 'v-out', name: 'Flow', type: 'output' }],
          config: { scalingFactor: 1.0 },
        },
        {
          id: 'tank',
          type: 'Tank',
          title: 'Liquid Tank',
          x: 640,
          y: 60,
          inputs: [
            { id: 't-in', name: 'Qin', type: 'input' },
            { id: 't-d', name: 'Qdist', type: 'input' },
          ],
          outputs: [{ id: 't-out', name: 'Level', type: 'output' }],
          config: { area: 1.5, initialLevel: 10, gravityCoefficient: 1.2 },
        },
        {
          id: 'sensor',
          type: 'Sensor',
          title: 'Level Transmitter',
          x: 400,
          y: 200,
          inputs: [{ id: 'sens-in', name: 'h', type: 'input' }],
          outputs: [{ id: 'sens-out', name: 'PV', type: 'output' }],
          config: { scalingFactor: 1.0 },
        },
      ],
      wires: [
        { id: 'w-sp', fromBlockId: 'sp', fromPortId: 'sp-out', toBlockId: 'sum', toPortId: 's-in1' },
        { id: 'w-err', fromBlockId: 'sum', fromPortId: 's-out', toBlockId: 'pi-ctrl', toPortId: 'pi-in' },
        { id: 'w-u', fromBlockId: 'pi-ctrl', fromPortId: 'pi-out', toBlockId: 'valve', toPortId: 'v-in' },
        { id: 'w-v', fromBlockId: 'valve', fromPortId: 'v-out', toBlockId: 'tank', toPortId: 't-in' },
        { id: 'w-ts', fromBlockId: 'tank', fromPortId: 't-out', toBlockId: 'sensor', toPortId: 'sens-in' },
        { id: 'w-sf', fromBlockId: 'sensor', fromPortId: 'sens-out', toBlockId: 'sum', toPortId: 's-in2' },
      ],
    },
  },

  thermalDelayLoop: {
    titleEn: 'Thermal Vessel with Dead Time (HeatedVessel + PID)',
    titleAr: 'وعاء تسخين مع زمن ميت (وعاء حراري + PID)',
    graph: {
      nodes: [
        {
          id: 'sp',
          type: 'Constant',
          title: 'Target Temp',
          x: 40,
          y: 60,
          inputs: [],
          outputs: [{ id: 'sp-out', name: 'SP', type: 'output' }],
          config: { value: 65 },
        },
        {
          id: 'sum',
          type: 'Sum',
          title: 'Comparator',
          x: 180,
          y: 60,
          inputs: [
            { id: 's-in1', name: '+', type: 'input' },
            { id: 's-in2', name: '-', type: 'input' },
          ],
          outputs: [{ id: 's-out', name: 'e', type: 'output' }],
          config: { signs: ['+', '-'] },
        },
        {
          id: 'pid-ctrl',
          type: 'PID',
          title: 'PID Controller',
          x: 320,
          y: 60,
          inputs: [{ id: 'pid-in', name: 'e', type: 'input' }],
          outputs: [{ id: 'pid-out', name: 'HeatCmd', type: 'output' }],
          config: { kc: 2.5, ti: 6.0, td: 1.2, derivativeFilterN: 10, action: 'reverse', bias: 20 },
        },
        {
          id: 'heater',
          type: 'HeatedVessel',
          title: 'Thermal Vessel',
          x: 520,
          y: 60,
          inputs: [
            { id: 'h-in', name: 'Heat', type: 'input' },
            { id: 'h-c', name: 'ColdFeed', type: 'input' },
          ],
          outputs: [{ id: 'h-out', name: 'Temp', type: 'output' }],
          config: { ambientTemp: 20, heatGain: 0.9, thermalTau: 6.0, transportDelay: 2.0 },
        },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'sp', fromPortId: 'sp-out', toBlockId: 'sum', toPortId: 's-in1' },
        { id: 'w2', fromBlockId: 'sum', fromPortId: 's-out', toBlockId: 'pid-ctrl', toPortId: 'pid-in' },
        { id: 'w3', fromBlockId: 'pid-ctrl', fromPortId: 'pid-out', toBlockId: 'heater', toPortId: 'h-in' },
        { id: 'w4', fromBlockId: 'heater', fromPortId: 'h-out', toBlockId: 'sum', toPortId: 's-in2' },
      ],
    },
  },

  bioreactorLoop: {
    titleEn: 'Bioreactor Dissolved Oxygen (DO) Control',
    titleAr: 'التحكم بالأكسجين الذائب (DO) في المفاعل الحيوي',
    graph: {
      nodes: [
        {
          id: 'sp-do',
          type: 'Constant',
          title: 'Target DO %',
          x: 40,
          y: 60,
          inputs: [],
          outputs: [{ id: 'sp-out', name: 'DO_SP', type: 'output' }],
          config: { value: 45 },
        },
        {
          id: 'sum-do',
          type: 'Sum',
          title: 'DO Comparator',
          x: 180,
          y: 60,
          inputs: [
            { id: 's1', name: '+', type: 'input' },
            { id: 's2', name: '-', type: 'input' },
          ],
          outputs: [{ id: 'e-out', name: 'e', type: 'output' }],
          config: { signs: ['+', '-'] },
        },
        {
          id: 'pi-do',
          type: 'PI',
          title: 'Agitation PI',
          x: 320,
          y: 60,
          inputs: [{ id: 'pi-in', name: 'e', type: 'input' }],
          outputs: [{ id: 'pi-out', name: 'RPM', type: 'output' }],
          config: { kc: 4.0, ti: 5.0, action: 'reverse', bias: 40, outputMin: 10, outputMax: 100 },
        },
        {
          id: 'bioreactor',
          type: 'Bioreactor',
          title: 'Cell Bioreactor',
          x: 520,
          y: 60,
          inputs: [
            { id: 'b-rpm', name: 'Agitator/Air', type: 'input' },
            { id: 'b-feed', name: 'Glucose', type: 'input' },
          ],
          outputs: [{ id: 'b-do', name: 'DO_meas', type: 'output' }],
          config: { biomassInitial: 1.2, substrateInitial: 20.0, doInitial: 80.0 },
        },
      ],
      wires: [
        { id: 'wb1', fromBlockId: 'sp-do', fromPortId: 'sp-out', toBlockId: 'sum-do', toPortId: 's1' },
        { id: 'wb2', fromBlockId: 'sum-do', fromPortId: 'e-out', toBlockId: 'pi-do', toPortId: 'pi-in' },
        { id: 'wb3', fromBlockId: 'pi-do', fromPortId: 'pi-out', toBlockId: 'bioreactor', toPortId: 'b-rpm' },
        { id: 'wb4', fromBlockId: 'bioreactor', fromPortId: 'b-do', toBlockId: 'sum-do', toPortId: 's2' },
      ],
    },
  },
};

export const StudioSandbox: React.FC<StudioSandboxProps> = ({
  graph,
  activeSignals,
  onUpdateGraph,
  history,
  isRunning,
  onTogglePlay,
  onReset,
  simSpeed,
  onSetSimSpeed,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const addBlockToGraph = (type: BlockType) => {
    const id = `block-${Date.now().toString(36)}`;
    let newNode: BlockNode;

    switch (type) {
      case 'Step':
        newNode = {
          id,
          type: 'Step',
          title: 'Step Input',
          x: 100,
          y: 100,
          inputs: [],
          outputs: [{ id: `${id}-out`, name: 'u', type: 'output' }],
          config: { initialValue: 0, stepValue: 50, stepTime: 3.0 },
        };
        break;

      case 'Tank':
        newNode = {
          id,
          type: 'Tank',
          title: 'Gravity Tank',
          x: 250,
          y: 100,
          inputs: [
            { id: `${id}-in`, name: 'Qin', type: 'input' },
            { id: `${id}-d`, name: 'Qdist', type: 'input' },
          ],
          outputs: [{ id: `${id}-out`, name: 'Level', type: 'output' }],
          config: { area: 1.5, initialLevel: 20, gravityCoefficient: 1.2 },
        };
        break;

      case 'FirstOrder':
        newNode = {
          id,
          type: 'FirstOrder',
          title: 'First-Order Lag',
          x: 250,
          y: 100,
          inputs: [{ id: `${id}-in`, name: 'u', type: 'input' }],
          outputs: [{ id: `${id}-out`, name: 'y', type: 'output' }],
          config: { gain: 1.5, timeConstant: 5.0 },
        };
        break;

      case 'DeadTime':
        newNode = {
          id,
          type: 'DeadTime',
          title: 'Dead Time (Delay)',
          x: 250,
          y: 100,
          inputs: [{ id: `${id}-in`, name: 'in', type: 'input' }],
          outputs: [{ id: `${id}-out`, name: 'out', type: 'output' }],
          config: { deadTime: 2.0 },
        };
        break;

      case 'P':
        newNode = {
          id,
          type: 'P',
          title: 'P Controller',
          x: 200,
          y: 100,
          inputs: [{ id: `${id}-in`, name: 'e', type: 'input' }],
          outputs: [{ id: `${id}-out`, name: 'u', type: 'output' }],
          config: { kc: 2.0, bias: 0, action: 'reverse' },
        };
        break;

      case 'PI':
        newNode = {
          id,
          type: 'PI',
          title: 'PI Controller',
          x: 200,
          y: 100,
          inputs: [{ id: `${id}-in`, name: 'e', type: 'input' }],
          outputs: [{ id: `${id}-out`, name: 'u', type: 'output' }],
          config: { kc: 2.0, ti: 8.0, bias: 0, action: 'reverse' },
        };
        break;

      case 'PID':
        newNode = {
          id,
          type: 'PID',
          title: 'PID Controller',
          x: 200,
          y: 100,
          inputs: [{ id: `${id}-in`, name: 'e', type: 'input' }],
          outputs: [{ id: `${id}-out`, name: 'u', type: 'output' }],
          config: { kc: 2.5, ti: 6.0, td: 1.0, action: 'reverse' },
        };
        break;

      case 'Sum':
        newNode = {
          id,
          type: 'Sum',
          title: 'Sum / Comparator',
          x: 150,
          y: 100,
          inputs: [
            { id: `${id}-i1`, name: '+', type: 'input' },
            { id: `${id}-i2`, name: '-', type: 'input' },
          ],
          outputs: [{ id: `${id}-out`, name: 'e', type: 'output' }],
          config: { signs: ['+', '-'] },
        };
        break;

      case 'HeatedVessel':
        newNode = {
          id,
          type: 'HeatedVessel',
          title: 'Heated Vessel',
          x: 280,
          y: 100,
          inputs: [
            { id: `${id}-h`, name: 'Duty', type: 'input' },
            { id: `${id}-c`, name: 'Cold', type: 'input' },
          ],
          outputs: [{ id: `${id}-out`, name: 'Temp', type: 'output' }],
          config: { ambientTemp: 20, heatGain: 0.8, thermalTau: 7.0 },
        };
        break;

      case 'Bioreactor':
        newNode = {
          id,
          type: 'Bioreactor',
          title: 'Cell Bioreactor',
          x: 280,
          y: 100,
          inputs: [
            { id: `${id}-rpm`, name: 'Air/RPM', type: 'input' },
            { id: `${id}-s`, name: 'Substrate', type: 'input' },
          ],
          outputs: [{ id: `${id}-out`, name: 'DO', type: 'output' }],
          config: { biomassInitial: 0.8, substrateInitial: 15.0, doInitial: 80 },
        };
        break;

      case 'FeedForward':
        newNode = {
          id,
          type: 'FeedForward',
          title: 'Feedforward Lead-Lag',
          x: 250,
          y: 100,
          inputs: [{ id: `${id}-d`, name: 'd', type: 'input' }],
          outputs: [{ id: `${id}-out`, name: 'u_FF', type: 'output' }],
          config: { ffGain: -1.0, tauLead: 3.0, tauLag: 1.0 },
        };
        break;

      case 'SplitRange':
        newNode = {
          id,
          type: 'SplitRange',
          title: 'Split-Range Valves',
          x: 350,
          y: 100,
          inputs: [{ id: `${id}-u`, name: 'u', type: 'input' }],
          outputs: [
            { id: `${id}-heat`, name: 'Heat', type: 'output' },
            { id: `${id}-cool`, name: 'Cool', type: 'output' },
          ],
          config: { splitPoint: 50 },
        };
        break;

      case 'Selector':
        newNode = {
          id,
          type: 'Selector',
          title: 'Selector Override',
          x: 350,
          y: 100,
          inputs: [
            { id: `${id}-u1`, name: 'u1', type: 'input' },
            { id: `${id}-u2`, name: 'u2', type: 'input' },
          ],
          outputs: [{ id: `${id}-out`, name: 'u_safe', type: 'output' }],
          config: { selectorType: 'min' },
        };
        break;

      case 'MIMOPlant':
        newNode = {
          id,
          type: 'MIMOPlant',
          title: 'Wood-Berry 2x2',
          x: 450,
          y: 100,
          inputs: [
            { id: `${id}-u1`, name: 'u1 (L)', type: 'input' },
            { id: `${id}-u2`, name: 'u2 (V)', type: 'input' },
          ],
          outputs: [
            { id: `${id}-y1`, name: 'y1 (xD)', type: 'output' },
            { id: `${id}-y2`, name: 'y2 (xB)', type: 'output' },
          ],
          config: { k11: 12.8, k12: -18.9, k21: 6.6, k22: -19.4, decouplerEnabled: false },
        };
        break;

      case 'CSTRPlant':
        newNode = {
          id,
          type: 'CSTRPlant',
          title: 'Exothermic CSTR',
          x: 420,
          y: 100,
          inputs: [
            { id: id + '-u', name: 'u_cw', type: 'input' },
            { id: id + '-tfeed', name: 'T_feed', type: 'input' },
          ],
          outputs: [{ id: id + '-out', name: 'T_reactor', type: 'output' }],
          config: { feedTemp: 350.0 },
        };
        break;

      case 'HeatExchangerPlant':
        newNode = {
          id,
          type: 'HeatExchangerPlant',
          title: 'Shell-Tube Heater',
          x: 420,
          y: 100,
          inputs: [
            { id: id + '-steam', name: 'u_steam', type: 'input' },
            { id: id + '-fproc', name: 'F_proc', type: 'input' },
          ],
          outputs: [{ id: id + '-out', name: 'T_out', type: 'output' }],
          config: { processFluidFlow: 50.0 },
        };
        break;

      case 'DistillationColumnPlant':
        newNode = {
          id,
          type: 'DistillationColumnPlant',
          title: 'Binary Fractionator',
          x: 450,
          y: 100,
          inputs: [
            { id: id + '-L', name: 'Reflux L', type: 'input' },
            { id: id + '-V', name: 'Steam V', type: 'input' },
            { id: id + '-fdist', name: 'F_dist', type: 'input' },
          ],
          outputs: [{ id: id + '-out', name: 'xD', type: 'output' }],
          config: { feedComp: 50.0 },
        };
        break;

      case 'BoilerDrumPlant':
        newNode = {
          id,
          type: 'BoilerDrumPlant',
          title: 'Boiler Drum (Swell)',
          x: 420,
          y: 100,
          inputs: [
            { id: id + '-fw', name: 'Feedwater', type: 'input' },
            { id: id + '-steam', name: 'Steam Demand', type: 'input' },
          ],
          outputs: [{ id: id + '-out', name: 'Drum Level', type: 'output' }],
          config: { inverseTauZ: 2.5 },
        };
        break;
      case 'Decoupler':
        newNode = {
          id,
          type: 'Decoupler',
          title: 'Decoupler Matrix',
          x: 380,
          y: 100,
          inputs: [
            { id: `${id}-u1`, name: 'u1', type: 'input' },
            { id: `${id}-u2`, name: 'u2', type: 'input' },
          ],
          outputs: [
            { id: `${id}-d1`, name: 'u1_dec', type: 'output' },
            { id: `${id}-d2`, name: 'u2_dec', type: 'output' },
          ],
          config: { k11: 12.8, k12: -18.9, k21: 6.6, k22: -19.4 },
        };
        break;

      default:
        newNode = {
          id,
          type: 'Constant',
          title: 'Constant SP',
          x: 50,
          y: 100,
          inputs: [],
          outputs: [{ id: `${id}-out`, name: 'val', type: 'output' }],
          config: { value: 50 },
        };
        break;
    }

    onUpdateGraph({ ...graph, nodes: [...graph.nodes, newNode] });
  };

  const loadPreset = (presetKey: string) => {
    const preset = PRESET_CIRCUITS[presetKey];
    if (preset) {
      onUpdateGraph(preset.graph);
      onReset();
    }
  };

  const currentPt = history.length > 0 ? history[history.length - 1] : { sp: 50, pv: 0, u: 0 };
  const hasBioreactor = graph.nodes.some((n) => n.type === 'Bioreactor');
  const hasHeatedVessel = graph.nodes.some((n) => n.type === 'HeatedVessel');

  return (
    <div className="space-y-4">
      {/* Studio Top Control Strip */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Presets Menu */}
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-800">{isAr ? 'الدوائر الجاهزة:' : 'Circuit Presets:'}</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PRESET_CIRCUITS).map(([key, item]) => (
              <button
                key={key}
                onClick={() => loadPreset(key)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-700 text-slate-600 hover:text-white border border-slate-300 font-medium transition-colors"
              >
                {isAr ? item.titleAr : item.titleEn}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Simulation Speed & Controls */}
        <div className="flex items-center gap-2">
          {/* Speed selector */}
          <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 font-mono text-[10px]">
            <FastForward className="w-3 h-3 text-slate-500 ml-1.5 mr-0.5" />
            {[0.5, 1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => onSetSimSpeed(spd)}
                className={`px-1.5 py-0.5 rounded ${
                  simSpeed === spd ? 'bg-cyan-600 text-white font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Run / Pause */}
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 ${
              isRunning
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-800'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'تشغيل' : 'Run')}</span>
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-700 text-slate-600 border border-slate-300"
            title={isAr ? 'إعادة ضبط' : 'Reset'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Palette Block Insertion Bar */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-cyan-700 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />
          {isAr ? 'إضافة كتلة من لوحة العناصر:' : 'Add Block to Canvas:'}
        </span>
        {(
          [
            'Step',
            'Constant',
            'Sum',
            'Gain',
            'P',
            'PI',
            'PID',
            'OnOff',
            'FirstOrder',
            'DeadTime',
            'Tank',
            'HeatedVessel',
            'Bioreactor',
            'Valve',
            'Sensor',
            'FeedForward',
            'SplitRange',
            'Selector',
            'MIMOPlant',
            'Decoupler',
          ] as BlockType[]
        ).map((type) => (
          <button
            key={type}
            onClick={() => addBlockToGraph(type)}
            className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-sky-50/60 text-slate-600 hover:text-cyan-800 border border-slate-200 hover:border-sky-200/60 font-mono text-[11px] transition-all"
          >
            + {type}
          </button>
        ))}
      </div>

      {/* Main Canvas + Physical Equipment Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BlockDiagramCanvas
            graph={graph}
            activeSignals={activeSignals}
            onUpdateGraph={onUpdateGraph}
            activeFeature={null}
            allowWiring={true}
            lang={lang}
          />
        </div>
        <div className="lg:col-span-1">
          <EquipmentVisualizer
            type={hasBioreactor ? 'bioreactor' : hasHeatedVessel ? 'heatedVessel' : 'tank'}
            levelPct={currentPt.pv}
            targetSP={currentPt.sp}
            valveOpeningPct={currentPt.u}
            disturbanceFlow={0}
            activeFeature={null}
            lang={lang}
          />
        </div>
      </div>

      {/* Synchronized Scope Chart */}
      <ScopeChart
        history={history}
        isRunning={isRunning}
        onTogglePlay={onTogglePlay}
        onReset={onReset}
        activeFeature={null}
        targetSP={currentPt.sp}
        lang={lang}
      />
    </div>
  );
};
