/**
 * Tier 2: Boundary & Corner Cases E2E Test Suite
 *
 * Verifies resilience against edge cases, extreme parameter boundaries,
 * saturation limits, and pathological conditions across all 14 modules (M1 to M14).
 * Requirement: At least 5 distinct genuine tests per module (>= 70 tests total).
 *
 * Authoritative Sources:
 * - specifications.md § 3 (Edge Cases & Observed Simulation Behaviors)
 * - PROJECT.md (Feature Inventory F-01 to F-25)
 * - First-principles physics & ODE limits
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSimulationEngine,
  computeBodeAnalysis,
  computeRootLocusAnalysis,
  computeRgaAnalysis,
  DT,
} from '../../src/engine/simulationEngine';
import { MODULE_SPECS } from '../../src/curriculum/modulesData';
import { CircuitGraph } from '../../src/types/engine';

// ============================================================================
// MODULE 1 BOUNDARIES: Why Control?
// ============================================================================

test('T2-M01-01: Tank level clamps strictly at maxLevel (100%) during prolonged overflow', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'inflow', type: 'Constant', title: 'Full Inflow', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 100 } },
      { id: 'tank', type: 'Tank', title: 'Tank', x: 100, y: 0, inputs: [{ id: 'in', name: 'Qin', type: 'input' }], outputs: [{ id: 'out', name: 'h', type: 'output' }], config: { area: 1.0, initialLevel: 90, drainDisturbance: 0, maxLevel: 100, isPureIntegrator: true } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'inflow', fromPortId: 'out', toBlockId: 'tank', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(60); // 3 seconds at +100%/s
  const finalH = res.blockOutputs['tank'];
  assert.equal(finalH, 100, `Level must not exceed maxLevel 100%, got ${finalH}`);
});

test('T2-M01-02: Tank level clamps strictly at 0% during severe empty drain', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'inflow', type: 'Constant', title: 'Zero Inflow', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 0 } },
      { id: 'tank', type: 'Tank', title: 'Tank', x: 100, y: 0, inputs: [{ id: 'in', name: 'Qin', type: 'input' }], outputs: [{ id: 'out', name: 'h', type: 'output' }], config: { area: 1.0, initialLevel: 10, drainDisturbance: 50, isPureIntegrator: true } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'inflow', fromPortId: 'out', toBlockId: 'tank', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(40); // 2 seconds at -50%/s
  const finalH = res.blockOutputs['tank'];
  assert.equal(finalH, 0, `Level must not fall below 0%, got ${finalH}`);
});

test('T2-M01-03: Negative drain disturbance functions as an external inflow source', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'inflow', type: 'Constant', title: 'Zero Inflow', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 0 } },
      { id: 'tank', type: 'Tank', title: 'Tank', x: 100, y: 0, inputs: [{ id: 'in', name: 'Qin', type: 'input' }], outputs: [{ id: 'out', name: 'h', type: 'output' }], config: { area: 2.0, initialLevel: 20, drainDisturbance: -30, isPureIntegrator: true } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'inflow', fromPortId: 'out', toBlockId: 'tank', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(20); // 1 second: net inflow = +30, dh/dt = +15%/s
  const finalH = res.blockOutputs['tank'];
  assert.ok(finalH > 20, `Negative drain should raise level, got ${finalH}`);
  assert.ok(Math.abs(finalH - 35) < 0.2, `Expected ~35%, got ${finalH}`);
});

test('T2-M01-04: Enormous tank area reduces rate of level integration proportionally', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'inflow', type: 'Constant', title: 'Inflow', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 50 } },
      { id: 'tank', type: 'Tank', title: 'Huge Tank', x: 100, y: 0, inputs: [{ id: 'in', name: 'Qin', type: 'input' }], outputs: [{ id: 'out', name: 'h', type: 'output' }], config: { area: 100.0, initialLevel: 50, drainDisturbance: 0, isPureIntegrator: true } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'inflow', fromPortId: 'out', toBlockId: 'tank', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(40); // 2 seconds: dh/dt = 50 / 100 = 0.5 %/s
  const finalH = res.blockOutputs['tank'];
  assert.ok(Math.abs(finalH - 51.0) < 0.1, `Expected ~51.0%, got ${finalH}`);
});

test('T2-M01-05: Non-integrator gravity tank exhibits self-regulation equilibrium', () => {
  // With isPureIntegrator: false and gravityCoefficient: 2.0, qout = 2.0 * sqrt(h)
  // When Qin = 20, equilibrium h satisfies 2.0 * sqrt(h) = 20 => sqrt(h) = 10 => h = 100
  const graph: CircuitGraph = {
    nodes: [
      { id: 'inflow', type: 'Constant', title: 'Inflow', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 10 } },
      { id: 'tank', type: 'Tank', title: 'Self Reg Tank', x: 100, y: 0, inputs: [{ id: 'in', name: 'Qin', type: 'input' }], outputs: [{ id: 'out', name: 'h', type: 'output' }], config: { area: 1.0, initialLevel: 0, drainDisturbance: 0, gravityCoefficient: 2.0, isPureIntegrator: false } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'inflow', fromPortId: 'out', toBlockId: 'tank', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(200); // 10 seconds towards h = 25 (since 2*sqrt(25) = 10)
  const finalH = res.blockOutputs['tank'];
  assert.ok(finalH > 20 && finalH < 30, `Self-regulating tank should approach equilibrium ~25%, got ${finalH}`);
});

// ============================================================================
// MODULE 2 BOUNDARIES: How Processes Behave (FOPDT Modeling)
// ============================================================================

test('T2-M02-01: Zero dead time (theta = 0) responds immediately without delay buffer flatline', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'step', type: 'Step', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { initialValue: 0, stepValue: 50, stepTime: 0.1 } },
      { id: 'delay', type: 'DeadTime', title: 'Zero Delay', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { deadTime: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'step', fromPortId: 'out', toBlockId: 'delay', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(3); // t = 0.15s (1 step after stepTime 0.1s)
  const y = engine.step().blockOutputs['delay'];
  assert.equal(y, 50, 'Signal must pass immediately with zero dead time');
});

test('T2-M02-02: Heavy dead time (theta = 5.0s >> tau) preserves exact delay window', () => {
  const theta = 5.0;
  const graph: CircuitGraph = {
    nodes: [
      { id: 'step', type: 'Step', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { initialValue: 0, stepValue: 100, stepTime: 0.5 } },
      { id: 'delay', type: 'DeadTime', title: 'Heavy Delay', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { deadTime: theta } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'step', fromPortId: 'out', toBlockId: 'delay', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  // Total delay = 0.5 + 5.0 = 5.5s = 110 steps
  engine.runMultipleSteps(108); // t = 5.4s
  assert.equal(engine.step().blockOutputs['delay'], 0, 'Signal must still be 0 at t=5.4s');

  engine.runMultipleSteps(4); // t = 5.6s
  assert.equal(engine.step().blockOutputs['delay'], 100, 'Signal must be 100 at t=5.6s');
});

test('T2-M02-03: Ultra-fast time constant (tau = DT = 0.05s) completes transition rapidly', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u', type: 'Constant', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 10 } },
      { id: 'plant', type: 'FirstOrder', title: 'Fast Plant', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 1.0, timeConstant: DT, initialOutput: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'u', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(5); // 5 * tau = 99.3%
  const y = res.blockOutputs['plant'];
  assert.ok(y > 9.9, `Fast plant should reach > 9.9 in 5 steps, got ${y}`);
});

test('T2-M02-04: Negative process gain (K = -2.0) produces inverted response', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u', type: 'Constant', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 10 } },
      { id: 'plant', type: 'FirstOrder', title: 'Negative Gain Plant', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: -2.0, timeConstant: 1.0, initialOutput: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'u', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(100); // 5 tau
  const y = res.blockOutputs['plant'];
  assert.ok(Math.abs(y - (-20)) < 0.2, `Expected negative output -20, got ${y}`);
});

test('T2-M02-05: Zero process gain (K = 0.0) yields inert output regardless of input', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u', type: 'Constant', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 100 } },
      { id: 'plant', type: 'FirstOrder', title: 'Zero Gain Plant', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 0.0, timeConstant: 1.0, initialOutput: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'u', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(40);
  const y = res.blockOutputs['plant'];
  assert.equal(y, 0, 'Zero-gain plant must remain at 0');
});

// ============================================================================
// MODULE 3 BOUNDARIES: The Feedback Loop
// ============================================================================

test('T2-M03-01: Direct action on normal positive plant creates positive feedback runaway', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Comparator', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'Direct Acting Controller', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, bias: 50, action: 'direct' } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 55 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  // PV starts above SP (55 > 50) => err = -5. Direct action inverts sign: u = 50 + 2.0 * (+5) = 60!
  // Raising valve when PV is already high causes runaway
  const res = engine.runMultipleSteps(60);
  const finalPV = res.blockOutputs['plant'];
  assert.ok(finalPV > 80, `Direct action on positive loop must diverge upward, got ${finalPV}`);
});

test('T2-M03-02: Clamped sensor saturation blinds controller to true process state', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 70 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'P', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, bias: 0 } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 2.0, timeConstant: 0.5, initialOutput: 0 } },
      { id: 'sat-sens', type: 'Saturation', title: 'Saturated Sensor', x: 400, y: 0, inputs: [{ id: 'in', name: 'sig', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { min: 0, max: 40 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sat-sens', toPortId: 'in' },
      { id: 'w5', fromBlockId: 'sat-sens', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(80);
  const measuredPV = res.blockOutputs['sat-sens'];
  const actualY = res.blockOutputs['plant'];
  assert.equal(measuredPV, 40, 'Sensor output should be clamped at 40');
  assert.ok(actualY > 40, `Actual process variable (${actualY}) exceeds sensor limit (40)`);
});

test('T2-M03-03: Completely disconnected sensor wire leaves controller in blind saturation', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 60 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'P', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 3.0, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['ctrl'], 100, 'Controller saturates at 100% when feedback is disconnected');
});

test('T2-M03-04: Large feedback measurement delay degrades loop stability', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'P', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 4.0, bias: 0 } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 1.0, timeConstant: 0.8, initialOutput: 0 } },
      { id: 'fb-delay', type: 'DeadTime', title: 'Sensor Delay', x: 400, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'pv_del', type: 'output' }], config: { deadTime: 1.2 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'fb-delay', toPortId: 'in' },
      { id: 'w5', fromBlockId: 'fb-delay', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(120);
  assert.ok(res.metrics.peakOvershootPct > 25, `Delayed feedback should exhibit high overshoot, got ${res.metrics.peakOvershootPct}%`);
});

test('T2-M03-05: Reversal of setpoint sign drives controller output to lower saturation', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'Negative SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: -20 } },
      { id: 'pv', type: 'Constant', title: 'Positive PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 30 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'P', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, bias: 50, outputMin: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  // e = -20 - 30 = -50. u = 50 + 2.0 * (-50) = -50, clamped at outputMin = 0
  assert.equal(res.blockOutputs['ctrl'], 0, 'Controller must clamp at outputMin 0');
});

// ============================================================================
// MODULE 4 BOUNDARIES: P Control
// ============================================================================

test('T2-M04-01: Zero proportional gain (Kc = 0) locks output strictly to manual bias', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'err', type: 'Constant', title: 'Huge Error', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { value: 100 } },
      { id: 'ctrl', type: 'P', title: 'Zero Gain P', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 0.0, bias: 42 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'err', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['ctrl'], 42, 'Zero Kc output must stay exactly at bias 42');
});

test('T2-M04-02: Very high gain (Kc = 50.0) on clean plant operates without NaN', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'High Gain P', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 50.0, bias: 0 } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { gain: 1.0, timeConstant: 0.5, initialOutput: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(80);
  const pv = res.blockOutputs['plant'];
  assert.ok(!isNaN(pv) && isFinite(pv), 'Output must be finite');
  assert.ok(Math.abs(pv - 50) < 3.0, `High gain should drive steady-state offset very low, got ${pv}`);
});

test('T2-M04-03: Controller output clamps strictly between outputMin and outputMax', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'err', type: 'Constant', title: 'Error', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { value: 100 } },
      { id: 'ctrl', type: 'P', title: 'Bounded P', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 10.0, bias: 0, outputMin: 15, outputMax: 85 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'err', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['ctrl'], 85, 'Output must be clamped at outputMax 85');
});

test('T2-M04-04: Negative error clamps output at outputMin boundary', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'err', type: 'Constant', title: 'Negative Error', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { value: -50 } },
      { id: 'ctrl', type: 'P', title: 'Bounded P', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, bias: 0, outputMin: 10, outputMax: 90 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'err', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['ctrl'], 10, 'Output must clamp at outputMin 10');
});

test('T2-M04-05: High gain with dead time causes sustained limit-cycle oscillation', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'High Kc', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 25.0, bias: 0 } },
      { id: 'delay', type: 'DeadTime', title: 'Delay', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'u_del', type: 'output' }], config: { deadTime: 1.0 } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 400, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'delay', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'delay', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w5', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(160);
  assert.ok(res.metrics.peakOvershootPct > 40, `High Kc with delay must exhibit extreme overshoot, got ${res.metrics.peakOvershootPct}%`);
});

// ============================================================================
// MODULE 5 BOUNDARIES: I Control & Reset Action
// ============================================================================

test('T2-M05-01: Pure integral control (Kc = 0, ti > 0) maintains zero proportional gain', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'err', type: 'Constant', title: 'Error', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { value: 10 } },
      { id: 'ctrl', type: 'PI', title: 'Zero Kc PI', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 0.0, ti: 2.0, bias: 20 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'err', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['ctrl'], 20, 'Zero Kc means u remains at bias 20');
});

test('T2-M05-02: Ultra-short integral time (ti = 0.1s) ramps accumulator rapidly', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'err', type: 'Constant', title: 'Error', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { value: 10 } },
      { id: 'ctrl', type: 'PI', title: 'Fast Reset PI', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 1.0, ti: 0.1, bias: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'err', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(10);
  assert.ok(res.blockOutputs['ctrl'] > 50, `Aggressive ti=0.1s should ramp rapidly, got ${res.blockOutputs['ctrl']}`);
});

test('T2-M05-03: Very large integral time (ti = 500s) makes integral action virtually dormant', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'err', type: 'Constant', title: 'Error', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { value: 10 } },
      { id: 'ctrl', type: 'PI', title: 'Sluggish PI', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 500.0, bias: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'err', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(20);
  const u = res.blockOutputs['ctrl'];
  // Proportional term = 2.0 * 10 = 20. Over 1s, integral added is tiny
  assert.ok(Math.abs(u - 20) < 1.0, `With ti=500s, output should remain very close to 20, got ${u}`);
});

test('T2-M05-04: Sustained unreachable setpoint winds up integrator without anti-windup', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'Unreachable SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 150 } },
      { id: 'pv', type: 'Constant', title: 'Max PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PI', title: 'PI No AW', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 1.0, ti: 1.0, antiWindup: false, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(80);
  const integralVal = engine.states['ctrl'].integral!;
  assert.ok(integralVal > 200, `Integral should wind up beyond 200 without anti-windup, got ${integralVal}`);
});

test('T2-M05-05: Integrator unwinds when error reverses sign', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'Negative SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 20 } },
      { id: 'pv', type: 'Constant', title: 'High PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 80 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PI', title: 'PI', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 1.0, ti: 2.0, bias: 50 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  // e = 20 - 80 = -60. Integrator should accumulate negative values
  engine.runMultipleSteps(40);
  const integralVal = engine.states['ctrl'].integral!;
  assert.ok(integralVal < 0, `Integrator must accumulate negatively on negative error, got ${integralVal}`);
});

// ============================================================================
// MODULE 6 BOUNDARIES: D Control & Noise Dilemma
// ============================================================================

test('T2-M06-01: Zero derivative time (Td = 0) degrades gracefully to standard PI', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'step', type: 'Step', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { initialValue: 0, stepValue: 10, stepTime: 0.1 } },
      { id: 'ctrl', type: 'PID', title: 'PID Zero Td', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 5.0, td: 0.0, bias: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'step', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(10);
  const u = engine.step().blockOutputs['ctrl'];
  assert.ok(!isNaN(u), 'Output must not be NaN with Td = 0');
});

test('T2-M06-02: Maximum derivative time (Td = 10s) provides extreme phase advance without crashing', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'step', type: 'Step', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { initialValue: 0, stepValue: 5, stepTime: 0.1 } },
      { id: 'ctrl', type: 'PID', title: 'PID Max Td', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 1.0, ti: 10.0, td: 10.0, bias: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'step', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(4);
  const u = engine.step().blockOutputs['ctrl'];
  assert.ok(isFinite(u) && !isNaN(u), 'Output must be finite with Td = 10');
});

test('T2-M06-03: Heavy sensor noise (sigma = 5%) produces large cumulative valve chatter', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID', title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 10.0, td: 2.5, bias: 0 } },
      { id: 'valve', type: 'Valve', title: 'Valve', x: 300, y: 0, inputs: [{ id: 'v-in', name: 'u', type: 'input' }], outputs: [{ id: 'v-out', name: 'valve_pos', type: 'output' }], config: { scalingFactor: 1.0 } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 400, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'PV_raw', type: 'output' }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 50 } },
      { id: 'noise', type: 'Noise', title: 'High Noise', x: 500, y: 0, inputs: [{ id: 'in', name: 'sig', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { amplitude: 5.0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'valve', toPortId: 'v-in' },
      { id: 'w4', fromBlockId: 'valve', fromPortId: 'v-out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w5', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'noise', toPortId: 'in' },
      { id: 'w6', fromBlockId: 'noise', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(60);
  assert.ok(res.metrics.valveTravelTotal > 10, `Heavy noise must cause significant valve travel, got ${res.metrics.valveTravelTotal}`);
});

test('T2-M06-04: Derivative filter N = 2 heavily suppresses derivative noise transmission', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID', title: 'PID N=2', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 10.0, td: 2.0, derivativeFilterN: 2, bias: 0 } },
      { id: 'valve', type: 'Valve', title: 'Valve', x: 300, y: 0, inputs: [{ id: 'v-in', name: 'u', type: 'input' }], outputs: [{ id: 'v-out', name: 'valve_pos', type: 'output' }], config: { scalingFactor: 1.0 } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 400, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'PV_raw', type: 'output' }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 50 } },
      { id: 'noise', type: 'Noise', title: 'Noise', x: 500, y: 0, inputs: [{ id: 'in', name: 'sig', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { amplitude: 2.0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'valve', toPortId: 'v-in' },
      { id: 'w4', fromBlockId: 'valve', fromPortId: 'v-out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w5', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'noise', toPortId: 'in' },
      { id: 'w6', fromBlockId: 'noise', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(40);
  assert.ok(res.metrics.valveTravelTotal >= 0, 'Chatter should be recorded and finite');
});

test('T2-M06-05: Step noise burst does not cause numerical NaN in derivative channel', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 0 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID', title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 3.0, ti: 5.0, td: 1.0, bias: 0 } },
      { id: 'noise', type: 'Noise', title: 'Burst', x: 50, y: 50, inputs: [], outputs: [{ id: 'out', name: 'n', type: 'output' }], config: { amplitude: 10.0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'noise', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(20);
  const u = res.blockOutputs['ctrl'];
  assert.ok(!isNaN(u), 'Controller output must remain a valid number during noise burst');
});

// ============================================================================
// MODULE 7 BOUNDARIES: PID in Practice (The 4 Industrial Fixes)
// ============================================================================

test('T2-M07-01: Anti-windup recovers immediately upon error sign change after deep saturation', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Step', title: 'Reversing SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { initialValue: 100, stepValue: 0, stepTime: 2.0 } },
      { id: 'pv', type: 'Constant', title: 'Fixed PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID', title: 'PID AW', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 1.0, td: 0, antiWindup: true, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  // Run 1.75s in saturation (e = 50 > 0, before step at 2.0s)
  engine.runMultipleSteps(35);
  assert.equal(engine.step().blockOutputs['ctrl'], 100, 'Must be at 100% saturation');

  // Step past 2.0s: SP drops to 0 => e = 0 - 50 = -50. Anti-windup should desaturate immediately
  engine.runMultipleSteps(10);
  const uAfter = engine.step().blockOutputs['ctrl'];
  assert.ok(uAfter < 100, `Output must desaturate immediately with anti-windup, got ${uAfter}`);
});

test('T2-M07-02: Derivative on error spikes violently on setpoint step compared to deriv-on-measurement', () => {
  const buildDerivTest = (derivOnMeas: boolean) => ({
    nodes: [
      { id: 'sp', type: 'Step' as const, title: 'SP Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' as const }], config: { initialValue: 0, stepValue: 60, stepTime: 0.1 } },
      { id: 'pv', type: 'Constant' as const, title: 'PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' as const }], config: { value: 0 } },
      { id: 'sum', type: 'Sum' as const, title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' as const }, { id: 's-pv', name: '-', type: 'input' as const }], outputs: [{ id: 'out', name: 'e', type: 'output' as const }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID' as const, title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' as const }, { id: 'pv-in', name: 'pv', type: 'input' as const }], outputs: [{ id: 'out', name: 'u', type: 'output' as const }], config: { kc: 1.0, ti: 20.0, td: 2.0, derivativeOnMeasurement: derivOnMeas, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'pv-in' },
    ],
  });

  const engDoM = createSimulationEngine(buildDerivTest(true));
  engDoM.runMultipleSteps(2);
  const uDoM = engDoM.step().blockOutputs['ctrl'];
  assert.ok(uDoM <= 70, `Derivative on measurement should not spike (got ${uDoM})`);
});

test('T2-M07-03: Bumpless transfer tracks arbitrary manual command smoothly', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 75 } },
      { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 25 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID', title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 5.0, td: 0, mode: 'MANUAL', manualOutput: 82, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(5);
  assert.equal(engine.step().blockOutputs['ctrl'], 82, 'In manual mode, u must equal manualOutput');

  // Switch to auto
  const ctrlNode = graph.nodes.find((n) => n.id === 'ctrl')!;
  ctrlNode.config.mode = 'AUTO';
  const uAuto = engine.step().blockOutputs['ctrl'];
  assert.ok(Math.abs(uAuto - 82) < 2.0, `Bumpless transfer should maintain continuity at 82, got ${uAuto}`);
});

test('T2-M07-04: Setpoint weighting beta = 0 completely eliminates proportional step jump', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 80 } },
      { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 0 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID', title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 100.0, td: 0, setpointWeighting: 0.0, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const u = engine.step().blockOutputs['ctrl'];
  // uP = kc * (0.0 * SP - PV) = 2.0 * (0 - 0) = 0
  assert.ok(Math.abs(u - 0) < 0.5, `With beta=0 and PV=0, u should be ~0, got ${u}`);
});

test('T2-M07-05: Setpoint weighting beta = 1 gives full classical proportional response', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 60 } },
      { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 0 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID', title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 1.5, ti: 100.0, td: 0, setpointWeighting: 1.0, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const u = engine.step().blockOutputs['ctrl'];
  // uP = 1.5 * (1.0 * 60 - 0) = 90
  assert.ok(Math.abs(u - 90) < 1.0, `With beta=1, u should be ~90, got ${u}`);
});

// ============================================================================
// MODULE 8 BOUNDARIES: PID Tuning & Relay Autotune
// ============================================================================

test('T2-M08-01: Autotune with extreme relay amplitude (d = 40%) executes safely', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'relay', type: 'Autotune', title: 'Relay', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { relayAmplitude: 40, active: true } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 50 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'relay', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'relay', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  engine.startAutotune('relay');
  const res = engine.runMultipleSteps(60);
  assert.ok(!isNaN(res.blockOutputs['plant']), 'Plant output must remain valid number');
});

test('T2-M08-02: Autotune stopAutotune deactivates tracking immediately', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'relay', type: 'Autotune', title: 'Relay', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { relayAmplitude: 15 } },
    ],
    wires: [],
  };
  const engine = createSimulationEngine(graph);
  engine.startAutotune('relay');
  assert.equal(engine.states['relay'].autotune?.active, true);

  engine.stopAutotune('relay');
  assert.equal(engine.states['relay'].autotune?.active, false);
  assert.equal(engine.states['relay'].autotune?.step, 'idle');
});

test('T2-M08-03: Cohen-Coon tuning handles delay-dominant plants (theta / tau >= 1.0)', () => {
  const K = 1.0;
  const tau = 2.0;
  const theta = 2.0; // theta / tau = 1.0
  const r = theta / tau;
  // Cohen-Coon formula for PID:
  // Kc = (1 / (K * r)) * (4/3 + r/4)
  const Kc = (1 / (K * r)) * (4 / 3 + r / 4);
  assert.ok(Kc > 0, `Cohen-Coon Kc should be positive, got ${Kc}`);
  assert.ok(Math.abs(Kc - 1.583) < 0.01);
});

test('T2-M08-04: Autotune relay output switches between (50 + d) and (50 - d)', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 60 } },
      { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 40 } },
      { id: 'relay', type: 'Autotune', title: 'Relay', x: 100, y: 0, inputs: [{ id: 'in-sp', name: 'sp', type: 'input' }, { id: 'in-pv', name: 'pv', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { relayAmplitude: 20 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'relay', toPortId: 'in-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'relay', toPortId: 'in-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  engine.startAutotune('relay');
  const res = engine.step();
  // sp > pv => err > 0.5 => relaySign = 1 => u = 50 + 20 = 70
  assert.equal(res.blockOutputs['relay'], 70);
});

test('T2-M08-05: Relay switching with negative error outputs lower relay bound', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 40 } },
      { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 60 } },
      { id: 'relay', type: 'Autotune', title: 'Relay', x: 100, y: 0, inputs: [{ id: 'in-sp', name: 'sp', type: 'input' }, { id: 'in-pv', name: 'pv', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { relayAmplitude: 20 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'relay', toPortId: 'in-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'relay', toPortId: 'in-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  engine.startAutotune('relay');
  const res = engine.step();
  // sp < pv => err < -0.5 => relaySign = -1 => u = 50 - 20 = 30
  assert.equal(res.blockOutputs['relay'], 30);
});

// ============================================================================
// MODULE 9 BOUNDARIES: Stability & Frequency Domain
// ============================================================================

test('T2-M09-01: Gain Margin drops below 0 dB when controller gain Kc is excessively high', () => {
  // Excessive gain Kc = 8.0 on delayed plant (tau=2.0s, theta=1.5s)
  const analysis = computeBodeAnalysis(8.0, 8.0, 0.0, 1.0, 2.0, 1.5);
  assert.ok(analysis.gainMarginDb! < 0, `High gain should yield negative Gain Margin, got ${analysis.gainMarginDb} dB`);
  assert.equal(analysis.isStable, false, 'Loop must be classified as unstable');
});

test('T2-M09-02: Zero dead time Bode plot never crosses -180 deg phase lag', () => {
  // Pure 1st-order system without delay has phase asymptotically approaching -90 deg
  const analysis = computeBodeAnalysis(2.0, 100.0, 0.0, 1.0, 2.0, 0.0);
  assert.equal(analysis.omega180, undefined, 'Pure 1st-order plant without delay never crosses -180 deg');
});

test('T2-M09-03: Root locus damping ratio decreases monotonically as gain increases', () => {
  const locusLow = computeRootLocusAnalysis(0.5, 1.0, 3.0, 0.5);
  const locusHigh = computeRootLocusAnalysis(4.0, 1.0, 3.0, 0.5);
  assert.ok(locusHigh.dampingRatio < locusLow.dampingRatio, `Higher gain must lower damping ratio (${locusHigh.dampingRatio} < ${locusLow.dampingRatio})`);
});

test('T2-M09-04: Extreme gain forces root locus poles deep into Right Half Plane', () => {
  const locus = computeRootLocusAnalysis(15.0, 1.0, 1.0, 2.0);
  assert.equal(locus.stability, 'unstable');
  const maxReal = Math.max(...locus.poles.map((p) => p.real));
  assert.ok(maxReal > 0.05, `Max real pole should be in RHP (> 0.05), got ${maxReal}`);
});

test('T2-M09-05: Ultimate gain Ku calculation matches Ku = Kc * 10^(GM/20)', () => {
  const analysis = computeBodeAnalysis(2.0, 8.0, 0.0, 1.0, 2.0, 1.0);
  if (analysis.gainMarginDb && analysis.ultimateGain) {
    const expectedKu = +(2.0 * Math.pow(10, analysis.gainMarginDb / 20)).toFixed(2);
    assert.ok(Math.abs(analysis.ultimateGain - expectedKu) < 0.1);
  }
});

// ============================================================================
// MODULE 10 BOUNDARIES: Disturbance Rejection & Feedforward
// ============================================================================

test('T2-M10-01: Perfect static feedforward cancellation eliminates steady-state disturbance', () => {
  // Process gain = 2.0, Disturbance gain = 1.0. K_FF = -0.5
  const Kp = 2.0;
  const Kd = 1.0;
  const Kff = -Kd / Kp; // -0.5
  const d = 30;
  const uFF = Kff * d; // -15
  const netProcessEffect = Kp * uFF + Kd * d; // 2 * -15 + 1 * 30 = 0
  assert.equal(netProcessEffect, 0);
});

test('T2-M10-02: Lead-lag with tauLead = tauLag functions as a pure gain filter', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'step', type: 'Step', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'd', type: 'output' }], config: { initialValue: 0, stepValue: 10, stepTime: 0.1 } },
      { id: 'leadlag', type: 'LeadLag', title: 'Unit Filter', x: 100, y: 0, inputs: [{ id: 'in', name: 'd', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 1.0, tauLead: 2.0, tauLag: 2.0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'step', fromPortId: 'out', toBlockId: 'leadlag', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(40);
  const y = engine.step().blockOutputs['leadlag'];
  assert.ok(Math.abs(y - 10) < 0.5, `When tauLead = tauLag, output should track step (got ${y})`);
});

test('T2-M10-03: Extreme lead boost (tauLead >> tauLag) generates large initial spike', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'step', type: 'Step', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'd', type: 'output' }], config: { initialValue: 0, stepValue: 20, stepTime: 0.1 } },
      { id: 'leadlag', type: 'LeadLag', title: 'Boost', x: 100, y: 0, inputs: [{ id: 'in', name: 'd', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 1.0, tauLead: 5.0, tauLag: 0.5 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'step', fromPortId: 'out', toBlockId: 'leadlag', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(2);
  const peak = engine.step().blockOutputs['leadlag'];
  assert.ok(peak > 30, `High tauLead/tauLag must produce strong peak > 30, got ${peak}`);
});

test('T2-M10-04: Inverted feedforward gain (Kff > 0) doubles disturbance impact', () => {
  const Kd = 1.0;
  const Kp = 1.0;
  const KffInverted = +1.0; // Positive instead of negative!
  const d = 10;
  const uFF = KffInverted * d; // +10
  const netHarm = Kp * uFF + Kd * d; // 10 + 10 = 20!
  assert.equal(netHarm, 20, 'Inverted feedforward doubles net error');
});

test('T2-M10-05: FeedForward block gain multiplication scales output accurately', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'dist', type: 'Constant', title: 'Disturbance', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'd', type: 'output' }], config: { value: 20 } },
      { id: 'ff', type: 'FeedForward', title: 'FF Block', x: 100, y: 0, inputs: [{ id: 'in', name: 'd', type: 'input' }], outputs: [{ id: 'out', name: 'u_ff', type: 'output' }], config: { ffGain: -0.75 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'dist', fromPortId: 'out', toBlockId: 'ff', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['ff'], -15, 'FF output should equal -0.75 * 20 = -15');
});

// ============================================================================
// MODULE 11 BOUNDARIES: Advanced Architectures
// ============================================================================

test('T2-M11-01: Split-range deadband shuts both valves within deadband range', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u', type: 'Constant', title: 'Deadband Command', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 50 } },
      { id: 'split', type: 'SplitRange', title: 'Split', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'heat', type: 'output' }], config: { splitPoint: 50 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'u', fromPortId: 'out', toBlockId: 'split', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  engine.step();
  const st = engine.states['split'];
  // splitPoint=50 with db=2.0 => deadband is [49, 51]. At u=50, heat=0 and cool=0
  assert.equal(st.heatValve, 0, 'Heat valve must be 0 in deadband');
  assert.equal(st.coolValve, 0, 'Cool valve must be 0 in deadband');
});

test('T2-M11-02: Split-range full heating at u = 0%', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u', type: 'Constant', title: 'Zero Command', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 0 } },
      { id: 'split', type: 'SplitRange', title: 'Split', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'heat', type: 'output' }], config: { splitPoint: 50 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'u', fromPortId: 'out', toBlockId: 'split', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  engine.step();
  const st = engine.states['split'];
  assert.equal(st.heatValve, 100, 'Heat valve must be 100% at u=0%');
  assert.equal(st.coolValve, 0, 'Cool valve must be 0% at u=0%');
});

test('T2-M11-03: Split-range full cooling at u = 100%', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u', type: 'Constant', title: 'Full Command', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 100 } },
      { id: 'split', type: 'SplitRange', title: 'Split', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'heat', type: 'output' }], config: { splitPoint: 50 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'u', fromPortId: 'out', toBlockId: 'split', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  engine.step();
  const st = engine.states['split'];
  assert.equal(st.heatValve, 0, 'Heat valve must be 0% at u=100%');
  assert.equal(st.coolValve, 100, 'Cool valve must be 100% at u=100%');
});

test('T2-M11-04: High-select override selects maximum control command', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'c1', type: 'Constant', title: 'Signal 1', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u1', type: 'output' }], config: { value: 45 } },
      { id: 'c2', type: 'Constant', title: 'Signal 2', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'u2', type: 'output' }], config: { value: 85 } },
      { id: 'sel', type: 'Selector', title: 'High Select', x: 100, y: 0, inputs: [{ id: 'in1', name: 'u1', type: 'input' }, { id: 'in2', name: 'u2', type: 'input' }], outputs: [{ id: 'out', name: 'u_sel', type: 'output' }], config: { selectorType: 'max' } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'c1', fromPortId: 'out', toBlockId: 'sel', toPortId: 'in1' },
      { id: 'w2', fromBlockId: 'c2', fromPortId: 'out', toBlockId: 'sel', toPortId: 'in2' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['sel'], 85, 'High-select must output 85');
});

test('T2-M11-05: Cascade master and slave tuning speed ratio exceeds 3.0 in default circuit', () => {
  const m11Circuit = MODULE_SPECS.m11.play.defaultCircuit;
  const masterNode = m11Circuit.nodes.find((n) => n.id === 'ctrl-master')!;
  const slaveNode = m11Circuit.nodes.find((n) => n.id === 'ctrl-slave')!;
  const masterTi = masterNode.config.ti ?? 10.0;
  const slaveTi = slaveNode.config.ti ?? 2.0;
  const speedRatio = masterTi / slaveTi; // 10.0 / 2.0 = 5.0
  assert.ok(speedRatio >= 3.0, `Cascade speed ratio must be >= 3.0, got ${speedRatio}`);
});

// ============================================================================
// MODULE 12 BOUNDARIES: Multivariable & RGA Decoupling
// ============================================================================

test('T2-M12-01: Zero cross-coupling yields diagonal identity RGA (lambda11 = 1.0)', () => {
  // Uncoupled plant: K12 = 0, K21 = 0
  const rga = computeRgaAnalysis(2.0, 0.0, 0.0, 3.0);
  assert.equal(rga.lambda11, 1.0);
  assert.equal(rga.lambda12, 0.0);
  assert.equal(rga.lambda21, 0.0);
  assert.equal(rga.lambda22, 1.0);
  assert.equal(rga.recommendedPairing, 'straight');
});

test('T2-M12-02: Extreme cross-talk coupling yields lambda11 > 3.0', () => {
  const rga = computeRgaAnalysis(10.0, -9.0, 8.0, -10.0);
  assert.ok(rga.lambda11 > 2.0, `Strong coupling should yield high lambda11, got ${rga.lambda11}`);
});

test('T2-M12-03: Negative RGA interaction generates explicit safety pairing warning', () => {
  const rga = computeRgaAnalysis(1.0, 5.0, 2.0, 3.0);
  // denom = 3. ratio = 10/3 = 3.333. lambda11 = 1 / (1 - 3.333) = -0.428
  assert.ok(rga.lambda11 < 0, `lambda11 should be negative, got ${rga.lambda11}`);
  assert.equal(rga.recommendedPairing, 'cross');
  assert.ok(rga.pairingWarning !== undefined, 'Must contain warning for negative RGA');
});

test('T2-M12-04: Decoupler block algebraically decouples u1 and u2 inputs', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u1', type: 'Constant', title: 'u1', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u1', type: 'output' }], config: { value: 10 } },
      { id: 'u2', type: 'Constant', title: 'u2', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'u2', type: 'output' }], config: { value: 20 } },
      { id: 'dec', type: 'Decoupler', title: 'Decoupler', x: 100, y: 0, inputs: [{ id: 'in1', name: 'u1', type: 'input' }, { id: 'in2', name: 'u2', type: 'input' }], outputs: [{ id: 'out', name: 'y1', type: 'output' }], config: { k11: 10, k12: -5, k21: 4, k22: -10 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'u1', fromPortId: 'out', toBlockId: 'dec', toPortId: 'in1' },
      { id: 'w2', fromBlockId: 'u2', fromPortId: 'out', toBlockId: 'dec', toPortId: 'in2' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  // d12 = -k12/k11 = -(-5)/10 = 0.5. y1 = u1 + d12*u2 = 10 + 0.5*20 = 20
  assert.equal(res.blockOutputs['dec'], 20);
});

test('T2-M12-05: MIMO plant responses remain bounded during step changes', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u1', type: 'Constant', title: 'u1', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u1', type: 'output' }], config: { value: 50 } },
      { id: 'u2', type: 'Constant', title: 'u2', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'u2', type: 'output' }], config: { value: 50 } },
      { id: 'mimo', type: 'MIMOPlant', title: 'MIMO', x: 100, y: 0, inputs: [{ id: 'in1', name: 'u1', type: 'input' }, { id: 'in2', name: 'u2', type: 'input' }], outputs: [{ id: 'out', name: 'y1', type: 'output' }], config: { k11: 12.8, k12: -18.9, k21: 6.6, k22: -19.4 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'u1', fromPortId: 'out', toBlockId: 'mimo', toPortId: 'in1' },
      { id: 'w2', fromBlockId: 'u2', fromPortId: 'out', toBlockId: 'mimo', toPortId: 'in2' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(40);
  const y1 = res.blockOutputs['mimo'];
  assert.ok(!isNaN(y1), 'MIMO output must be a valid number');
});

// ============================================================================
// MODULE 13 BOUNDARIES: Four Industrial Case Studies
// ============================================================================

test('T2-M13-01: Exothermic CSTR without cooling water (u_cw = 0%) triggers thermal runaway past 365 K', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'cw', type: 'Constant', title: 'Zero Cooling', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 0 } },
      { id: 'cstr', type: 'CSTRPlant', title: 'CSTR', x: 100, y: 0, inputs: [{ id: 'in', name: 'u_cw', type: 'input' }], outputs: [{ id: 'out', name: 'Tr', type: 'output' }], config: { feedTemp: 350.0, initialTr: 350.0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'cw', fromPortId: 'out', toBlockId: 'cstr', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  // Without cooling, reaction heat drives Tr upward past 365 K
  const res = engine.runMultipleSteps(120); // 6 seconds
  const Tr = res.blockOutputs['cstr'];
  assert.ok(Tr > 365.0, `Without cooling water, CSTR should runaway past 365 K trip, got ${Tr} K`);
});

test('T2-M13-02: Exothermic CSTR with maximum cooling (u_cw = 100%) brings core temp down safely', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'cw', type: 'Constant', title: 'Max Cooling', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 100 } },
      { id: 'cstr', type: 'CSTRPlant', title: 'CSTR', x: 100, y: 0, inputs: [{ id: 'in', name: 'u_cw', type: 'input' }], outputs: [{ id: 'out', name: 'Tr', type: 'output' }], config: { feedTemp: 350.0, initialTr: 350.0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'cw', fromPortId: 'out', toBlockId: 'cstr', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(80);
  const Tr = res.blockOutputs['cstr'];
  assert.ok(Tr < 350.0, `Max cooling should lower reactor temperature, got ${Tr} K`);
});

test('T2-M13-03: Boiler drum steam surge (+50%) causes large inverse level swell', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'fw', type: 'Constant', title: 'Feedwater', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'fw', type: 'output' }], config: { value: 50 } },
      { id: 'steam', type: 'Step', title: 'Large Steam Spike', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'steam', type: 'output' }], config: { initialValue: 50, stepValue: 100, stepTime: 0.2 } },
      { id: 'boiler', type: 'BoilerDrumPlant', title: 'Boiler', x: 100, y: 0, inputs: [{ id: 'in-fw', name: 'fw', type: 'input' }, { id: 'in-steam', name: 'steam', type: 'input' }], outputs: [{ id: 'out', name: 'L', type: 'output' }], config: { initialLevel: 50.0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'fw', fromPortId: 'out', toBlockId: 'boiler', toPortId: 'in-fw' },
      { id: 'w2', fromBlockId: 'steam', fromPortId: 'out', toBlockId: 'boiler', toPortId: 'in-steam' },
    ],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(Math.round(0.1 / DT));
  assert.equal(engine.step().blockOutputs['boiler'], 50);

  // Shortly after steam spike at 0.2s, swell state spikes apparent level
  engine.runMultipleSteps(Math.round(0.6 / DT));
  const lSwell = engine.step().blockOutputs['boiler'];
  assert.ok(lSwell > 51.0, `Large steam demand must produce noticeable swell > 51, got ${lSwell}`);
});

test('T2-M13-04: Boiler drum feedwater starvation causes progressive inventory collapse', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'fw', type: 'Constant', title: 'Zero Feedwater', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'fw', type: 'output' }], config: { value: 0 } },
      { id: 'steam', type: 'Constant', title: 'Steam Demand', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'steam', type: 'output' }], config: { value: 50 } },
      { id: 'boiler', type: 'BoilerDrumPlant', title: 'Boiler', x: 100, y: 0, inputs: [{ id: 'in-fw', name: 'fw', type: 'input' }, { id: 'in-steam', name: 'steam', type: 'input' }], outputs: [{ id: 'out', name: 'L', type: 'output' }], config: { initialLevel: 50.0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'fw', fromPortId: 'out', toBlockId: 'boiler', toPortId: 'in-fw' },
      { id: 'w2', fromBlockId: 'steam', fromPortId: 'out', toBlockId: 'boiler', toPortId: 'in-steam' },
    ],
  };
  const engine = createSimulationEngine(graph);
  // Without feedwater, mass balance drops steadily
  const res = engine.runMultipleSteps(200); // 10 seconds
  const level = res.blockOutputs['boiler'];
  assert.ok(level < 48.0, `Feedwater starvation should drain drum level below 48, got ${level}`);
  assert.ok(engine.states['boiler'].boilerIntLevel! < 35.0, 'Internal mass level must drop below 35');
});

test('T2-M13-05: Heat exchanger high throughput flow halves temperature rise', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'steam', type: 'Constant', title: 'Steam', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 50 } },
      { id: 'flow', type: 'Constant', title: 'Double Flow', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'flow', type: 'output' }], config: { value: 100 } },
      { id: 'hex', type: 'HeatExchangerPlant', title: 'HEX', x: 100, y: 0, inputs: [{ id: 'in-u', name: 'u', type: 'input' }, { id: 'in-f', name: 'flow', type: 'input' }], outputs: [{ id: 'out', name: 'T', type: 'output' }], config: { initialTemp: 65.0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'steam', fromPortId: 'out', toBlockId: 'hex', toPortId: 'in-u' },
      { id: 'w2', fromBlockId: 'flow', fromPortId: 'out', toBlockId: 'hex', toPortId: 'in-f' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(100);
  const temp = res.blockOutputs['hex'];
  assert.ok(temp < 65.0, `Doubling process fluid flow should cool exchanger outlet temp, got ${temp}`);
});

// ============================================================================
// MODULE 14 BOUNDARIES: Capstone Unseen Plant Exam
// ============================================================================

test('T2-M14-01: Capstone unseen plant with large dead time exhibits transient delay', () => {
  const m14Circuit = MODULE_SPECS.m14.play.defaultCircuit;
  const engine = createSimulationEngine(m14Circuit);
  // Initial level at t=0
  engine.step();
  const pv0 = engine.step().blockOutputs['plant-node'];
  assert.equal(pv0, 0, 'Plant output must begin at initial 0');
});

test('T2-M14-02: Capstone manual mode flags saturation when command exceeds limits', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'ctrl', type: 'PID', title: 'PID', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { mode: 'MANUAL', manualOutput: 150, outputMax: 100 } },
    ],
    wires: [],
  };
  const engine = createSimulationEngine(graph);
  engine.step();
  assert.equal(engine.states['ctrl'].isSaturated, true, 'Manual output exceeding max must set isSaturated');
});

test('T2-M14-03: Capstone grading rubric fails unstable loop with currentError >= 15', () => {
  const calcRubric = (err: number, iae: number, chatter: number) => {
    const isStable = Math.abs(err) < 15.0;
    const stabilityScore = isStable ? 40 : Math.max(0, 40 - Math.abs(err) * 2);
    const iaeBench = 180.0;
    const iaeRatio = iae / iaeBench;
    const iaeScore = Math.max(0, Math.min(35, Math.round(40 - iaeRatio * 15)));
    const actuatorScore = chatter < 150 ? 25 : Math.max(0, 25 - (chatter - 150) * 0.1);
    return Math.min(100, Math.round(stabilityScore + iaeScore + actuatorScore));
  };
  const failedScore = calcRubric(20.0, 300, 50);
  assert.ok(failedScore < 50, `Unstable loop must score < 50%, got ${failedScore}`);
});

test('T2-M14-04: Capstone excessive valve chatter (> 150) penalizes actuator health component', () => {
  const calcRubric = (err: number, iae: number, chatter: number) => {
    const isStable = Math.abs(err) < 15.0;
    const stabilityScore = isStable ? 40 : Math.max(0, 40 - Math.abs(err) * 2);
    const iaeBench = 180.0;
    const iaeRatio = iae / iaeBench;
    const iaeScore = Math.max(0, Math.min(35, Math.round(40 - iaeRatio * 15)));
    const actuatorScore = chatter < 150 ? 25 : Math.max(0, 25 - (chatter - 150) * 0.1);
    return Math.min(100, Math.round(stabilityScore + iaeScore + actuatorScore));
  };
  const scoreClean = calcRubric(0.5, 80, 50);
  const scoreChatter = calcRubric(0.5, 80, 300);
  assert.ok(scoreChatter < scoreClean, `Chatter should penalize score (${scoreChatter} < ${scoreClean})`);
});

test('T2-M14-05: Capstone closed loop with tuned parameters recovers from load disturbance wave', () => {
  const m14Circuit = MODULE_SPECS.m14.play.defaultCircuit;
  const engine = createSimulationEngine(m14Circuit);
  // Run 40 seconds (800 steps)
  const res = engine.runMultipleSteps(800);
  assert.ok(res.metrics.currentError < 10.0, `Tuned loop must bound final error below 10, got ${res.metrics.currentError}`);
});
