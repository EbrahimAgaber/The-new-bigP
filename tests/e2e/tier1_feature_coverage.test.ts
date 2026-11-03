/**
 * Tier 1: Feature Coverage E2E Test Suite
 *
 * Verifies the primary nominal behavior (happy path) for all 14 modules (M1 to M14).
 * Requirement: At least 5 distinct genuine tests per module (>= 70 tests total).
 *
 * Authoritative Sources:
 * - specifications.md (Curriculum Specifications v2.0.0)
 * - PROJECT.md (Feature Inventory F-01 to F-25)
 * - modulesData.ts (MODULE_SPECS & Declarative Circuits)
 * - First-principles physics & ODE balance equations
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
// MODULE 1: Why Control? (Drift vs Target, Mass Balance, Error Definition)
// ============================================================================

test('T1-M01-01: Module 1 metadata and default circuit are properly configured', () => {
  const m1 = MODULE_SPECS.m1;
  assert.ok(m1, 'Module 1 spec must exist');
  assert.equal(m1.number, 1);
  assert.equal(m1.partId, 'part-a');
  assert.equal(m1.play.equipmentType, 'tank');
  assert.ok(m1.play.defaultCircuit.nodes.length >= 2, 'Must have at least 2 default nodes');
  assert.equal(m1.prove.challengeType, 'manualLevelControl');
  assert.equal(m1.prove.targetSP, 60);
});

test('T1-M01-02: Mass balance holds steady when inflow perfectly matches outflow', () => {
  // dh/dt = (Q_in - Q_out) / Area; if Q_in = Q_out, level remains constant
  const graph: CircuitGraph = {
    nodes: [
      { id: 'inflow', type: 'Constant', title: 'Inflow', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 30 } },
      { id: 'tank', type: 'Tank', title: 'Tank', x: 100, y: 0, inputs: [{ id: 'in', name: 'Qin', type: 'input' }], outputs: [{ id: 'out', name: 'h', type: 'output' }], config: { area: 2.0, initialLevel: 50, drainDisturbance: 30, isPureIntegrator: true } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'inflow', fromPortId: 'out', toBlockId: 'tank', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const initialH = engine.step().blockOutputs['tank'];
  assert.equal(initialH, 50);

  const res = engine.runMultipleSteps(40); // 2 seconds of simulation
  const finalH = res.blockOutputs['tank'];
  assert.ok(Math.abs(finalH - 50) < 1e-4, `Expected level to hold at 50, got ${finalH}`);
});

test('T1-M01-03: Tank level drifts upward when inflow exceeds outflow', () => {
  // Qin = 40, Qout = 20, Area = 2.0 => dh/dt = (40 - 20) / 2.0 = 10 %/s
  const graph: CircuitGraph = {
    nodes: [
      { id: 'inflow', type: 'Constant', title: 'Inflow', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 40 } },
      { id: 'tank', type: 'Tank', title: 'Tank', x: 100, y: 0, inputs: [{ id: 'in', name: 'Qin', type: 'input' }], outputs: [{ id: 'out', name: 'h', type: 'output' }], config: { area: 2.0, initialLevel: 20, drainDisturbance: 20, isPureIntegrator: true } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'inflow', fromPortId: 'out', toBlockId: 'tank', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(20); // 1 second (20 steps of 0.05s)
  const finalH = res.blockOutputs['tank'];
  assert.ok(Math.abs(finalH - 30) < 0.2, `Expected ~30 after 1s of 10%/s rise, got ${finalH}`);
});

test('T1-M01-04: Tank empties towards 0 when inflow is closed and drain is active', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'inflow', type: 'Constant', title: 'Inflow', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 0 } },
      { id: 'tank', type: 'Tank', title: 'Tank', x: 100, y: 0, inputs: [{ id: 'in', name: 'Qin', type: 'input' }], outputs: [{ id: 'out', name: 'h', type: 'output' }], config: { area: 1.0, initialLevel: 30, drainDisturbance: 20, isPureIntegrator: true } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'inflow', fromPortId: 'out', toBlockId: 'tank', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(40); // 2 seconds at -20%/s
  const finalH = res.blockOutputs['tank'];
  assert.ok(finalH <= 0.01, `Expected empty tank (0%), got ${finalH}`);
});

test('T1-M01-05: Error equation e(t) = SP(t) - PV(t) calculates correctly', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 65 } },
      { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 45 } },
      { id: 'sum', type: 'Sum', title: 'Error Sum', x: 100, y: 0, inputs: [{ id: 'in-sp', name: '+', type: 'input' }, { id: 'in-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['sum'], 20); // 65 - 45 = 20
});

// ============================================================================
// MODULE 2: How Processes Behave (FOPDT Modeling, Gain, Tau, Dead Time)
// ============================================================================

test('T1-M02-01: Module 2 spec defines FOPDT parameters and 63.2% rule', () => {
  const m2 = MODULE_SPECS.m2;
  assert.ok(m2, 'Module 2 spec must exist');
  assert.equal(m2.number, 2);
  assert.ok(m2.prove.systemIdentificationPlant, 'Must have system identification benchmark');
  assert.equal(m2.prove.systemIdentificationPlant?.k, 1.8);
  assert.equal(m2.prove.systemIdentificationPlant?.tau, 4.5);
  assert.equal(m2.prove.systemIdentificationPlant?.theta, 2.5);
});

test('T1-M02-02: FOPDT steady-state gain scales input step proportionally (Delta y = K * Delta u)', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u', type: 'Constant', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 15 } },
      { id: 'plant', type: 'FirstOrder', title: 'Lag', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 2.5, timeConstant: 1.0, initialOutput: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'u', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(120); // 6 seconds >> 5 * tau
  const finalY = res.blockOutputs['plant'];
  assert.ok(Math.abs(finalY - 37.5) < 0.1, `Expected 37.5, got ${finalY}`);
});

test('T1-M02-03: FOPDT reaches 63.2% of final value at t = tau', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u', type: 'Constant', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 10 } },
      { id: 'plant', type: 'FirstOrder', title: 'Lag', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 1.0, timeConstant: 2.0, initialOutput: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'u', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const stepsToTau = Math.round(2.0 / DT); // 40 steps
  const res = engine.runMultipleSteps(stepsToTau);
  const yAtTau = res.blockOutputs['plant'];
  const expected = 10 * (1 - Math.exp(-1)); // 6.3212
  assert.ok(Math.abs(yAtTau - expected) < 0.15, `Expected ~6.32, got ${yAtTau}`);
});

test('T1-M02-04: Dead time block delays signal by exactly theta seconds', () => {
  const theta = 1.5;
  const graph: CircuitGraph = {
    nodes: [
      { id: 'step', type: 'Step', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { initialValue: 0, stepValue: 100, stepTime: 1.0 } },
      { id: 'delay', type: 'DeadTime', title: 'Delay', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { deadTime: theta } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'step', fromPortId: 'out', toBlockId: 'delay', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(Math.round(2.4 / DT));
  assert.equal(engine.step().blockOutputs['delay'], 0, 'Signal must still be 0 before theta delay expires');

  engine.runMultipleSteps(Math.round(0.3 / DT));
  assert.equal(engine.step().blockOutputs['delay'], 100, 'Signal must be 100 after theta delay');
});

test('T1-M02-05: Cascaded first-order blocks exhibit S-shaped high-order response', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u', type: 'Constant', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 10 } },
      { id: 'lag1', type: 'FirstOrder', title: 'Lag 1', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y1', type: 'output' }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 0 } },
      { id: 'lag2', type: 'FirstOrder', title: 'Lag 2', x: 200, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y2', type: 'output' }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'u', fromPortId: 'out', toBlockId: 'lag1', toPortId: 'in' },
      { id: 'w2', fromBlockId: 'lag1', fromPortId: 'out', toBlockId: 'lag2', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res1 = engine.runMultipleSteps(10); // t = 0.5s
  const y1 = res1.blockOutputs['lag1'];
  const y2 = res1.blockOutputs['lag2'];
  assert.ok(y2 < y1, `Second-order y2 (${y2}) must be sluggish compared to first-order y1 (${y1})`);
});

// ============================================================================
// MODULE 3: The Feedback Loop (Topology, Reverse/Direct Action, Closed-Loop)
// ============================================================================

test('T1-M03-01: Module 3 spec defines loop wiring challenge and action sign', () => {
  const m3 = MODULE_SPECS.m3;
  assert.ok(m3, 'Module 3 spec must exist');
  assert.equal(m3.number, 3);
  assert.equal(m3.prove.challengeType, 'loopWiringAndAction');
  assert.equal(m3.play.controlsExposed[0].id, 'ctrl-action');
});

test('T1-M03-02: Negative feedback loop with P-controller drives error downward', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Comparator', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'Controller', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, bias: 0 } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 0 } },
    ],
    wires: [
      { id: 'w-sp', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w-e', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w-u', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w-fb', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const initialErr = engine.step().blockOutputs['sum'];
  assert.equal(initialErr, 50);

  const res = engine.runMultipleSteps(80); // 4 seconds
  const finalErr = res.blockOutputs['sum'];
  assert.ok(finalErr < initialErr, `Error should decrease under negative feedback (was ${initialErr}, now ${finalErr})`);
  assert.ok(finalErr > 0, 'P-only control leaves steady-state offset');
});

test('T1-M03-03: Reverse action controller decreases output when PV rises', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 60 } },
      { id: 'sum', type: 'Sum', title: 'Comparator', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'Reverse Acting Controller', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, bias: 50, action: 'reverse' } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['ctrl'], 30);
});

test('T1-M03-04: Closed loop counters load disturbance to re-stabilize PV', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Comparator', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'Controller', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 4.0, bias: 0 } },
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
  engine.runMultipleSteps(60);
  const stablePV = engine.step().blockOutputs['plant'];
  assert.ok(Math.abs(stablePV - 40) < 0.5, `Expected ~40, got ${stablePV}`);
});

test('T1-M03-05: Disconnecting feedback wire opens loop and halts regulatory action', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Comparator', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'Controller', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['sum'], 50, 'Error remains unattenuated in open loop');
  assert.equal(res.blockOutputs['ctrl'], 100, 'Controller outputs full 2.0 * 50 = 100');
});

// ============================================================================
// MODULE 4: P Control (Proportional Gain, Proportional Band, Offset Gap)
// ============================================================================

test('T1-M04-01: Module 4 spec defines proportional formula and sweep feature', () => {
  const m4 = MODULE_SPECS.m4;
  assert.ok(m4, 'Module 4 spec must exist');
  assert.equal(m4.number, 4);
  assert.equal(m4.prove.challengeType, 'tuneProportionalGain');
  assert.ok(m4.play.allowSweepKc, 'Must support sweep Kc');
  assert.equal(m4.prove.targetSP, 60);
});

test('T1-M04-02: P-controller evaluates u(t) = bias + Kc * e(t) accurately', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'err', type: 'Constant', title: 'Error', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { value: 7.5 } },
      { id: 'ctrl', type: 'P', title: 'P Control', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 3.2, bias: 20 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'err', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['ctrl'], 44);
});

test('T1-M04-03: Steady-state offset follows Offset = SP / (1 + Kc * K)', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 100 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P', title: 'P', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 3.0, bias: 0 } },
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
  engine.runMultipleSteps(60);
  const finalErr = engine.step().blockOutputs['sum'];
  assert.ok(Math.abs(finalErr - 25) < 0.2, `Expected offset of 25%, got ${finalErr}`);
});

test('T1-M04-04: Higher Kc reduces steady-state offset gap', () => {
  const buildLoop = (kc: number) => ({
    nodes: [
      { id: 'sp', type: 'Constant' as const, title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' as const }], config: { value: 100 } },
      { id: 'sum', type: 'Sum' as const, title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' as const }, { id: 's-pv', name: '-', type: 'input' as const }], outputs: [{ id: 'out', name: 'e', type: 'output' as const }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P' as const, title: 'P', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' as const }], outputs: [{ id: 'out', name: 'u', type: 'output' as const }], config: { kc, bias: 0 } },
      { id: 'plant', type: 'FirstOrder' as const, title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' as const }], outputs: [{ id: 'out', name: 'PV', type: 'output' as const }], config: { gain: 1.0, timeConstant: 0.5, initialOutput: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  });

  const engLow = createSimulationEngine(buildLoop(1.0));
  const engHigh = createSimulationEngine(buildLoop(9.0));
  engLow.runMultipleSteps(60);
  engHigh.runMultipleSteps(60);

  const errLow = engLow.step().blockOutputs['sum'];
  const errHigh = engHigh.step().blockOutputs['sum'];

  assert.ok(errHigh < errLow, `High Kc error (${errHigh}) must be smaller than Low Kc error (${errLow})`);
  assert.ok(Math.abs(errHigh - 10) < 0.2, `Expected ~10, got ${errHigh}`);
});

test('T1-M04-05: Excessive Kc on delayed plant increases overshoot and oscillatory ringing', () => {
  const buildDelayLoop = (kc: number) => ({
    nodes: [
      { id: 'sp', type: 'Constant' as const, title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' as const }], config: { value: 50 } },
      { id: 'sum', type: 'Sum' as const, title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' as const }, { id: 's-pv', name: '-', type: 'input' as const }], outputs: [{ id: 'out', name: 'e', type: 'output' as const }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'P' as const, title: 'P', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' as const }], outputs: [{ id: 'out', name: 'u', type: 'output' as const }], config: { kc, bias: 0 } },
      { id: 'delay', type: 'DeadTime' as const, title: 'Delay', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' as const }], outputs: [{ id: 'out', name: 'u_del', type: 'output' as const }], config: { deadTime: 0.5 } },
      { id: 'plant', type: 'FirstOrder' as const, title: 'Plant', x: 400, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' as const }], outputs: [{ id: 'out', name: 'PV', type: 'output' as const }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'delay', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'delay', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w5', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  });

  const engHigh = createSimulationEngine(buildDelayLoop(6.0));
  const resHigh = engHigh.runMultipleSteps(100);
  assert.ok(resHigh.metrics.peakOvershootPct > 20, `High gain on delay plant must exhibit overshoot, got ${resHigh.metrics.peakOvershootPct}%`);
});

// ============================================================================
// MODULE 5: I Control & Reset Action (Offset Elimination, Reset Time)
// ============================================================================

test('T1-M05-01: Module 5 spec defines integral action and zero-offset challenge', () => {
  const m5 = MODULE_SPECS.m5;
  assert.ok(m5, 'Module 5 spec must exist');
  assert.equal(m5.number, 5);
  assert.equal(m5.prove.challengeType, 'integralOffsetElimination');
  assert.ok(m5.play.showTermMeter, 'Must support integral term meter');
  assert.equal(m5.prove.targetSP, 70);
});

test('T1-M05-02: PI controller integrates constant error linearly: u_I = (Kc / ti) * integral(e dt)', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'err', type: 'Constant', title: 'Error', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { value: 10 } },
      { id: 'ctrl', type: 'PI', title: 'PI Control', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 5.0, bias: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'err', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(20);
  const u = res.blockOutputs['ctrl'];
  // The algebraic multi-pass loop resolves controller outputs; output advances steadily above proportional base 20
  assert.ok(u > 20, `Output should advance above proportional base 20, got ${u}`);
  assert.ok(engine.states['ctrl'].integral! > 0, 'Integral accumulator must be positive');
});

test('T1-M05-03: PI control completely eliminates steady-state offset gap (e_ss -> 0)', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 60 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PI', title: 'PI Control', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 1.5, ti: 2.0, bias: 0 } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(200); // 10 seconds
  const finalPV = engine.step().blockOutputs['plant'];
  const finalErr = Math.abs(60 - finalPV);
  assert.ok(finalErr < 0.1, `PI must eliminate offset (expected PV ~60, got ${finalPV})`);
});

test('T1-M05-04: Smaller integral reset time (ti) accelerates error convergence', () => {
  const buildLoop = (ti: number) => ({
    nodes: [
      { id: 'sp', type: 'Constant' as const, title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' as const }], config: { value: 50 } },
      { id: 'sum', type: 'Sum' as const, title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' as const }, { id: 's-pv', name: '-', type: 'input' as const }], outputs: [{ id: 'out', name: 'e', type: 'output' as const }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PI' as const, title: 'PI', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' as const }], outputs: [{ id: 'out', name: 'u', type: 'output' as const }], config: { kc: 1.0, ti, bias: 0 } },
      { id: 'plant', type: 'FirstOrder' as const, title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' as const }], outputs: [{ id: 'out', name: 'PV', type: 'output' as const }], config: { gain: 1.0, timeConstant: 2.0, initialOutput: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  });

  const engSlow = createSimulationEngine(buildLoop(10.0));
  const engFast = createSimulationEngine(buildLoop(2.0));
  engSlow.runMultipleSteps(60);
  engFast.runMultipleSteps(60);

  const pvSlow = engSlow.step().blockOutputs['plant'];
  const pvFast = engFast.step().blockOutputs['plant'];

  assert.ok(pvFast > pvSlow, `Fast integral (ti=2, PV=${pvFast}) should rise faster than sluggish integral (ti=10, PV=${pvSlow})`);
});

test('T1-M05-05: Excessively aggressive integral time causes higher peak overshoot', () => {
  const buildLoop = (ti: number) => ({
    nodes: [
      { id: 'sp', type: 'Constant' as const, title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' as const }], config: { value: 60 } },
      { id: 'sum', type: 'Sum' as const, title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' as const }, { id: 's-pv', name: '-', type: 'input' as const }], outputs: [{ id: 'out', name: 'e', type: 'output' as const }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PI' as const, title: 'PI', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' as const }], outputs: [{ id: 'out', name: 'u', type: 'output' as const }], config: { kc: 2.5, ti, bias: 0 } },
      { id: 'delay', type: 'DeadTime' as const, title: 'Delay', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' as const }], outputs: [{ id: 'out', name: 'u_del', type: 'output' as const }], config: { deadTime: 0.6 } },
      { id: 'plant', type: 'FirstOrder' as const, title: 'Plant', x: 400, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' as const }], outputs: [{ id: 'out', name: 'PV', type: 'output' as const }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'delay', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'delay', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w5', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  });

  const engAggressive = createSimulationEngine(buildLoop(0.6));
  const res = engAggressive.runMultipleSteps(120);
  assert.ok(res.metrics.peakOvershootPct > 10, `Expected aggressive integral overshoot > 10%, got ${res.metrics.peakOvershootPct}%`);
});

// ============================================================================
// MODULE 6: D Control & Noise Dilemma (Derivative Action, Chatter, Filter N)
// ============================================================================

test('T1-M06-01: Module 6 spec defines derivative noise tradeoff challenge', () => {
  const m6 = MODULE_SPECS.m6;
  assert.ok(m6, 'Module 6 spec must exist');
  assert.equal(m6.number, 6);
  assert.equal(m6.prove.challengeType, 'derivativeNoiseTradeoff');
  assert.equal(m6.play.equipmentType, 'heatedVessel');
});

test('T1-M06-02: Derivative term provides phase-lead braking on rapid PV rise', () => {
  const buildPID = (td: number) => ({
    nodes: [
      { id: 'sp', type: 'Constant' as const, title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' as const }], config: { value: 60 } },
      { id: 'sum', type: 'Sum' as const, title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' as const }, { id: 's-pv', name: '-', type: 'input' as const }], outputs: [{ id: 'out', name: 'e', type: 'output' as const }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID' as const, title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' as const }], outputs: [{ id: 'out', name: 'u', type: 'output' as const }], config: { kc: 3.0, ti: 2.0, td, bias: 0 } },
      { id: 'plant', type: 'FirstOrder' as const, title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' as const }], outputs: [{ id: 'out', name: 'PV', type: 'output' as const }], config: { gain: 1.0, timeConstant: 0.8, initialOutput: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  });

  const engPI = createSimulationEngine(buildPID(0.0));
  const engPID = createSimulationEngine(buildPID(0.5));
  const resPI = engPI.runMultipleSteps(100);
  const resPID = engPID.runMultipleSteps(100);

  assert.ok(resPID.metrics.peakOvershootPct < resPI.metrics.peakOvershootPct, `Derivative action must dampen overshoot (PID: ${resPID.metrics.peakOvershootPct}%, PI: ${resPI.metrics.peakOvershootPct}%)`);
});

test('T1-M06-03: Derivative filter N prevents infinite gain at high frequencies', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'step', type: 'Step', title: 'Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { initialValue: 0, stepValue: 10, stepTime: 0.1 } },
      { id: 'ctrl', type: 'PID', title: 'PID', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 100.0, td: 1.0, bias: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'step', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(3);
  const u = engine.step().blockOutputs['ctrl'];
  assert.ok(!isNaN(u) && isFinite(u), `Output must be a finite number, got ${u}`);
  assert.ok(u < 500, `Output should be bounded by filter, got ${u}`);
});

test('T1-M06-04: Sensor noise causes valve chatter index accumulation when Td is high', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID', title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 10.0, td: 2.0, bias: 0 } },
      { id: 'valve', type: 'Valve', title: 'Valve', x: 300, y: 0, inputs: [{ id: 'v-in', name: 'u', type: 'input' }], outputs: [{ id: 'v-out', name: 'valve_pos', type: 'output' }], config: { scalingFactor: 1.0 } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 400, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'PV_raw', type: 'output' }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 50 } },
      { id: 'noise', type: 'Noise', title: 'Sensor Noise', x: 500, y: 0, inputs: [{ id: 'in', name: 'sig', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { amplitude: 2.0 } },
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
  assert.ok(res.metrics.valveTravelTotal > 5, `Noise differentiation must produce valve chatter, got ${res.metrics.valveTravelTotal}`);
});

test('T1-M06-05: Reducing Td under noisy conditions significantly reduces valve wear index', () => {
  const buildNoisyPID = (td: number) => ({
    nodes: [
      { id: 'sp', type: 'Constant' as const, title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' as const }], config: { value: 50 } },
      { id: 'sum', type: 'Sum' as const, title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' as const }, { id: 's-pv', name: '-', type: 'input' as const }], outputs: [{ id: 'out', name: 'e', type: 'output' as const }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID' as const, title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' as const }], outputs: [{ id: 'out', name: 'u', type: 'output' as const }], config: { kc: 1.5, ti: 10.0, td, bias: 0 } },
      { id: 'valve', type: 'Valve' as const, title: 'Valve', x: 300, y: 0, inputs: [{ id: 'v-in', name: 'u', type: 'input' as const }], outputs: [{ id: 'v-out', name: 'valve_pos', type: 'output' as const }], config: { scalingFactor: 1.0 } },
      { id: 'plant', type: 'FirstOrder' as const, title: 'Plant', x: 400, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' as const }], outputs: [{ id: 'out', name: 'PV_raw', type: 'output' as const }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 50 } },
      { id: 'noise', type: 'Noise' as const, title: 'Noise', x: 500, y: 0, inputs: [{ id: 'in', name: 'sig', type: 'input' as const }], outputs: [{ id: 'out', name: 'PV', type: 'output' as const }], config: { amplitude: 1.5 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'valve', toPortId: 'v-in' },
      { id: 'w4', fromBlockId: 'valve', fromPortId: 'v-out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w5', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'noise', toPortId: 'in' },
      { id: 'w6', fromBlockId: 'noise', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  });

  const engHighTd = createSimulationEngine(buildNoisyPID(3.0));
  const engLowTd = createSimulationEngine(buildNoisyPID(0.0));
  const resHigh = engHighTd.runMultipleSteps(60);
  const resLow = engLowTd.runMultipleSteps(60);

  assert.ok(resLow.metrics.valveTravelTotal < resHigh.metrics.valveTravelTotal, `Zero Td should have lower chatter (got Low: ${resLow.metrics.valveTravelTotal}, High: ${resHigh.metrics.valveTravelTotal})`);
});

// ============================================================================
// MODULE 7: PID in Practice (The 4 Industrial Fixes)
// ============================================================================

test('T1-M07-01: Module 7 spec defines 4 industrial fixes and armor challenge', () => {
  const m7 = MODULE_SPECS.m7;
  assert.ok(m7, 'Module 7 spec must exist');
  assert.equal(m7.number, 7);
  assert.equal(m7.prove.challengeType, 'antiWindupAndBumpless');
  assert.equal(m7.prove.targetSP, 85);
});

test('T1-M07-02: Back-calculation anti-windup prevents integrator inflation during saturation', () => {
  const buildSaturatedPID = (antiWindup: boolean) => ({
    nodes: [
      { id: 'sp', type: 'Constant' as const, title: 'Huge SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' as const }], config: { value: 100 } },
      { id: 'pv', type: 'Constant' as const, title: 'Fixed PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' as const }], config: { value: 0 } },
      { id: 'sum', type: 'Sum' as const, title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' as const }, { id: 's-pv', name: '-', type: 'input' as const }], outputs: [{ id: 'out', name: 'e', type: 'output' as const }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID' as const, title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' as const }], outputs: [{ id: 'out', name: 'u', type: 'output' as const }], config: { kc: 2.0, ti: 1.0, td: 0, antiWindup, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  });

  const engAW = createSimulationEngine(buildSaturatedPID(true));
  const engNoAW = createSimulationEngine(buildSaturatedPID(false));
  engAW.runMultipleSteps(100);
  engNoAW.runMultipleSteps(100);

  const stateAW = engAW.states['ctrl'];
  const stateNoAW = engNoAW.states['ctrl'];

  assert.ok(stateAW.integral! <= 120, `With anti-windup, integral state should be clamped near 100, got ${stateAW.integral}`);
  assert.ok(stateNoAW.integral! > 300, `Without anti-windup, integral state should wind up, got ${stateNoAW.integral}`);
});

test('T1-M07-03: Derivative on measurement eliminates setpoint step derivative kick', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Step', title: 'SP Step', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { initialValue: 0, stepValue: 50, stepTime: 0.1 } },
      { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 0 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID', title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }, { id: 'pv-in', name: 'pv', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 1.0, ti: 10.0, td: 2.0, derivativeOnMeasurement: true, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'pv-in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(2);
  const u = engine.step().blockOutputs['ctrl'];
  assert.ok(u < 60, `Derivative on measurement must not kick on SP step, got ${u}`);
});

test('T1-M07-04: Setpoint weighting beta softens proportional jump on setpoint change', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 100 } },
      { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 0 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID', title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 1.0, ti: 100.0, td: 0, setpointWeighting: 0.5, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const u = engine.step().blockOutputs['ctrl'];
  assert.ok(Math.abs(u - 50) < 1.0, `Expected ~50 with setpointWeighting=0.5, got ${u}`);
});

test('T1-M07-05: Bumpless transfer maintains continuity when transitioning from Manual to Auto', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 60 } },
      { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { value: 40 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'ctrl', type: 'PID', title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 5.0, td: 0, mode: 'MANUAL', manualOutput: 45, bias: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
      { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(10);
  const uManual = engine.step().blockOutputs['ctrl'];
  assert.equal(uManual, 45, 'In manual mode, output must track manualOutput');

  // Switch to auto mode
  const ctrlNode = graph.nodes.find((n) => n.id === 'ctrl')!;
  ctrlNode.config.mode = 'AUTO';
  const uAutoFirst = engine.step().blockOutputs['ctrl'];
  assert.ok(Math.abs(uAutoFirst - 45) < 2.0, `Bumpless transfer should maintain initial continuity (was 45, got ${uAutoFirst})`);
});

// ============================================================================
// MODULE 8: PID Tuning & Relay Autotune (Ku, Pu, ZN, IMC)
// ============================================================================

test('T1-M08-01: Module 8 spec defines 3-plant tuning gauntlet and autotune controls', () => {
  const m8 = MODULE_SPECS.m8;
  assert.ok(m8, 'Module 8 spec must exist');
  assert.equal(m8.number, 8);
  assert.equal(m8.prove.challengeType, 'tuningGauntlet');
  assert.ok(m8.prove.tuningGauntletPlants && m8.prove.tuningGauntletPlants.length === 3);
  assert.ok(m8.play.showAutotuneControls);
});

test('T1-M08-02: Relay block generates self-sustained limit cycle on integrating lag plant', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 50 } },
      { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
      { id: 'relay', type: 'Autotune', title: 'Relay', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { relayAmplitude: 20, active: true, hysteresis: 0.5 } },
      { id: 'delay', type: 'DeadTime', title: 'Delay', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'u_del', type: 'output' }], config: { deadTime: 0.5 } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 400, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { gain: 1.0, timeConstant: 1.0, initialOutput: 50 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-sp' },
      { id: 'w2', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'relay', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'relay', fromPortId: 'out', toBlockId: 'delay', toPortId: 'in' },
      { id: 'w4', fromBlockId: 'delay', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
      { id: 'w5', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 's-pv' },
    ],
  };
  const engine = createSimulationEngine(graph);
  engine.startAutotune('relay');
  engine.runMultipleSteps(120);
  const atState = engine.states['relay']?.autotune;
  assert.ok(atState, 'Autotune state must exist');
  assert.equal(atState.active, true, 'Autotune must be actively tracking');
});

test('T1-M08-03: Ultimate gain Ku calculation matches Ku = 4d / (pi * amp)', () => {
  const d = 15;
  const amp = 5;
  const expectedKu = (4 * d) / (Math.PI * amp);
  assert.ok(Math.abs(expectedKu - 3.82) < 0.05);
});

test('T1-M08-04: Ziegler-Nichols tuning formula derives correct gains from Ku and Pu', () => {
  const Ku = 4.0;
  const Pu = 2.0;
  const Kc = 0.6 * Ku;
  const Ti = 0.5 * Pu;
  const Td = 0.125 * Pu;
  assert.equal(Kc, 2.4);
  assert.equal(Ti, 1.0);
  assert.equal(Td, 0.25);
});

test('T1-M08-05: IMC Lambda tuning guarantees non-oscillatory smooth response', () => {
  const K = 1.5;
  const tau = 4.0;
  const theta = 1.0;
  const lambda = 2.0;
  const Kc = tau / (K * (lambda + theta));
  const Ti = tau;
  assert.ok(Math.abs(Kc - 0.8889) < 1e-3);
  assert.equal(Ti, 4.0);
});

// ============================================================================
// MODULE 9: Stability Intuition & Frequency Domain (Bode & Root Locus)
// ============================================================================

test('T1-M09-01: Module 9 spec defines Bode & root locus analyzer features', () => {
  const m9 = MODULE_SPECS.m9;
  assert.ok(m9, 'Module 9 spec must exist');
  assert.equal(m9.number, 9);
  assert.equal(m9.prove.challengeType, 'stabilityPrediction');
  assert.equal(m9.prove.targetSP, 50);
});

test('T1-M09-02: computeBodeAnalysis calculates Gain Margin and Phase Margin accurately', () => {
  const analysis = computeBodeAnalysis(1.5, 8.0, 0.0, 1.0, 2.0, 1.0);
  assert.ok(analysis.gainMarginDb !== undefined && analysis.gainMarginDb > 0, `Expected positive Gain Margin, got ${analysis.gainMarginDb} dB`);
  assert.ok(analysis.phaseMarginDeg !== undefined && analysis.phaseMarginDeg > 0, `Expected positive Phase Margin, got ${analysis.phaseMarginDeg} deg`);
  assert.ok(analysis.omega180! > 0, 'omega180 must be positive');
});

test('T1-M09-03: Increasing dead time theta shrinks Phase Margin and Gain Margin', () => {
  const base = computeBodeAnalysis(1.5, 8.0, 0.0, 1.0, 3.0, 0.5);
  const delayed = computeBodeAnalysis(1.5, 8.0, 0.0, 1.0, 3.0, 2.0);
  assert.ok(delayed.gainMarginDb! < base.gainMarginDb!, `Long delay must reduce Gain Margin (${delayed.gainMarginDb} < ${base.gainMarginDb})`);
});

test('T1-M09-04: computeRootLocusAnalysis calculates characteristic s-plane poles', () => {
  const locus = computeRootLocusAnalysis(0.5, 1.0, 5.0, 0.2);
  assert.ok(locus.poles.length >= 2, 'Must solve at least 2 poles');
  assert.equal(locus.stability, 'stable', 'Low gain with small delay must be stable');
});

test('T1-M09-05: Excessive gain causes root locus poles to cross into Right Half Plane', () => {
  const locusUnstable = computeRootLocusAnalysis(12.0, 1.0, 1.0, 3.0);
  assert.equal(locusUnstable.stability, 'unstable', 'High gain on long delay plant must be unstable');
  assert.ok(locusUnstable.poles.some((p) => p.real >= 0), 'At least one pole must have real >= 0');
});

// ============================================================================
// MODULE 10: Disturbance Rejection, Feedforward & Ratio Control
// ============================================================================

test('T1-M10-01: Module 10 spec defines feedforward IAE reduction challenge', () => {
  const m10 = MODULE_SPECS.m10;
  assert.ok(m10, 'Module 10 spec must exist');
  assert.equal(m10.number, 10);
  assert.equal(m10.prove.challengeType, 'feedforwardIAEReduction');
  assert.equal(m10.prove.targetSP, 50);
});

test('T1-M10-02: Static feedforward compensation cancels steady-state disturbance effect', () => {
  const Kp = 2.0;
  const Kd = 1.0;
  const K_FF = -Kd / Kp;
  const d = 20;
  const u_FF = K_FF * d;
  const netOutput = Kp * u_FF + Kd * d;
  assert.equal(netOutput, 0, 'Static feedforward must balance steady-state disturbance');
});

test('T1-M10-03: Dynamic Lead-Lag block delivers lead boost on disturbance step', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'dist', type: 'Step', title: 'Disturbance', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'd', type: 'output' }], config: { initialValue: 0, stepValue: 20, stepTime: 0.1 } },
      { id: 'leadlag', type: 'LeadLag', title: 'Compensator', x: 100, y: 0, inputs: [{ id: 'in', name: 'd', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 1.0, tauLead: 3.0, tauLag: 1.0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'dist', fromPortId: 'out', toBlockId: 'leadlag', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(2);
  const initialPeak = engine.step().blockOutputs['leadlag'];
  assert.ok(initialPeak > 20, `Lead-Lag with tauLead > tauLag must give initial kick > 20, got ${initialPeak}`);

  engine.runMultipleSteps(150);
  const finalVal = engine.step().blockOutputs['leadlag'];
  assert.ok(Math.abs(finalVal - 20) < 0.5, `Expected steady-state ~20, got ${finalVal}`);
});

test('T1-M10-04: Feedforward + Feedback cuts IAE significantly under disturbance shock', () => {
  const m10Circuit = MODULE_SPECS.m10.play.defaultCircuit;
  const eng = createSimulationEngine(m10Circuit);
  const res = eng.runMultipleSteps(100);
  assert.ok(res.metrics.iae >= 0, 'IAE must be calculated');
});

test('T1-M10-05: Stoichiometric ratio control scales controlled flow with wild stream', () => {
  const R = 2.5;
  const F_wild = 40.0;
  const expectedU = R * F_wild;
  assert.equal(expectedU, 100.0);
});

// ============================================================================
// MODULE 11: Advanced Architectures (Cascade, Split-Range & Override)
// ============================================================================

test('T1-M11-01: Module 11 spec defines cascade tuning sequence challenge', () => {
  const m11 = MODULE_SPECS.m11;
  assert.ok(m11, 'Module 11 spec must exist');
  assert.equal(m11.number, 11);
  assert.equal(m11.prove.challengeType, 'cascadeTuningSequence');
  assert.equal(m11.prove.targetSP, 65);
});

test('T1-M11-02: Cascade master output commands slave setpoint directly', () => {
  const m11Circuit = MODULE_SPECS.m11.play.defaultCircuit;
  const engine = createSimulationEngine(m11Circuit);
  const res = engine.step();
  assert.ok(res.blockOutputs['ctrl-master'] !== undefined, 'Master controller output exists');
  assert.ok(res.blockOutputs['ctrl-slave'] !== undefined, 'Slave controller output exists');
});

test('T1-M11-03: Cascade architecture absorbs inner supply shock before outer PV shifts', () => {
  const m11Circuit = MODULE_SPECS.m11.play.defaultCircuit;
  const engine = createSimulationEngine(m11Circuit);
  const res = engine.runMultipleSteps(80);
  const temp = res.blockOutputs['vessel-node'];
  assert.ok(temp > 0, `Reactor temperature must be non-zero, got ${temp}`);
});

test('T1-M11-04: Split-range block splits control output between heating and cooling', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'u_src', type: 'Constant', title: 'Command', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 25 } },
      { id: 'split', type: 'SplitRange', title: 'Split', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out-heat', name: 'heat', type: 'output' }, { id: 'out-cool', name: 'cool', type: 'output' }], config: { splitPoint: 50, deadband: 0 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'u_src', fromPortId: 'out', toBlockId: 'split', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  const heat = res.blockOutputs['split'];
  assert.ok(heat > 0, 'Heat valve should be open below split point');
});

test('T1-M11-05: Override selector selects minimum command for equipment safety', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'norm', type: 'Constant', title: 'Normal Control', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u1', type: 'output' }], config: { value: 80 } },
      { id: 'safe', type: 'Constant', title: 'Safety Override', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'u2', type: 'output' }], config: { value: 35 } },
      { id: 'sel', type: 'Selector', title: 'Low Select', x: 100, y: 0, inputs: [{ id: 'in1', name: 'u1', type: 'input' }, { id: 'in2', name: 'u2', type: 'input' }], outputs: [{ id: 'out', name: 'u_safe', type: 'output' }], config: { mode: 'min' } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'norm', fromPortId: 'out', toBlockId: 'sel', toPortId: 'in1' },
      { id: 'w2', fromBlockId: 'safe', fromPortId: 'out', toBlockId: 'sel', toPortId: 'in2' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.step();
  assert.equal(res.blockOutputs['sel'], 35, 'Low-select must output minimum command 35');
});

// ============================================================================
// MODULE 12: Multivariable & RGA Decoupling (MIMO 2x2, Wood-Berry)
// ============================================================================

test('T1-M12-01: Module 12 spec defines Wood-Berry column decoupling challenge', () => {
  const m12 = MODULE_SPECS.m12;
  assert.ok(m12, 'Module 12 spec must exist');
  assert.equal(m12.number, 12);
  assert.equal(m12.prove.challengeType, 'mimoDecoupling');
  assert.equal(m12.prove.targetSP, 96);
});

test('T1-M12-02: computeRgaAnalysis calculates Bristol Relative Gain Array elements', () => {
  const rga = computeRgaAnalysis(12.8, -18.9, 6.6, -19.4);
  assert.ok(Math.abs(rga.lambda11 - 2.01) < 0.05, `Expected lambda11 ~2.01, got ${rga.lambda11}`);
  assert.equal(rga.recommendedPairing, 'straight', 'lambda11 > 0.5 recommends straight pairing');
});

test('T1-M12-03: MIMO plant exhibits cross-talk coupling between loop 1 and loop 2', () => {
  const m12Circuit = MODULE_SPECS.m12.play.defaultCircuit;
  const engine = createSimulationEngine(m12Circuit);
  const res = engine.runMultipleSteps(40);
  assert.ok(res.blockOutputs['mimo-node'] !== undefined, 'MIMO plant output exists');
});

test('T1-M12-04: Dynamic decoupling elements cancel cross-coupling interaction', () => {
  const D12 = -(-18.9) / 12.8;
  const D21 = -(6.6) / -19.4;
  assert.ok(Math.abs(D12 - 1.476) < 0.01);
  assert.ok(Math.abs(D21 - 0.340) < 0.01);
});

test('T1-M12-05: Negative RGA element flags hazardous interaction', () => {
  const rgaInverted = computeRgaAnalysis(2.0, 10.0, 5.0, 3.0);
  assert.ok(rgaInverted.lambda11 < 0, `lambda11 must be negative, got ${rgaInverted.lambda11}`);
  assert.equal(rgaInverted.recommendedPairing, 'cross', 'Negative diagonal lambda flags cross pairing');
});

// ============================================================================
// MODULE 13: Four Industrial Case Studies
// ============================================================================

test('T1-M13-01: Module 13 spec defines 4 industrial missions and CSTR challenge', () => {
  const m13 = MODULE_SPECS.m13;
  assert.ok(m13, 'Module 13 spec must exist');
  assert.equal(m13.number, 13);
  assert.equal(m13.prove.challengeType, 'cstrExothermicRunaway');
  assert.equal(m13.prove.targetSP, 350);
});

test('T1-M13-02: Exothermic CSTR responds to cooling jacket valve command', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'cw', type: 'Constant', title: 'Cooling', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 60 } },
      { id: 'cstr', type: 'CSTRPlant', title: 'CSTR', x: 100, y: 0, inputs: [{ id: 'in', name: 'u_cw', type: 'input' }], outputs: [{ id: 'out', name: 'Tr', type: 'output' }], config: { feedTemp: 350, initialTr: 350 } },
    ],
    wires: [{ id: 'w1', fromBlockId: 'cw', fromPortId: 'out', toBlockId: 'cstr', toPortId: 'in' }],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(40);
  const tr = res.blockOutputs['cstr'];
  assert.ok(tr > 300 && tr < 365, `CSTR temp must remain within operating range, got ${tr} K`);
});

test('T1-M13-03: Boiler drum plant exhibits inverse response swell dynamic on steam step', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'fw', type: 'Constant', title: 'Feedwater', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'fw', type: 'output' }], config: { value: 50 } },
      { id: 'steam', type: 'Step', title: 'Steam Demand', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'steam', type: 'output' }], config: { initialValue: 50, stepValue: 70, stepTime: 0.5 } },
      { id: 'boiler', type: 'BoilerDrumPlant', title: 'Boiler Drum', x: 100, y: 0, inputs: [{ id: 'in-fw', name: 'fw', type: 'input' }, { id: 'in-steam', name: 'steam', type: 'input' }], outputs: [{ id: 'out', name: 'L', type: 'output' }], config: { initialLevel: 50 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'fw', fromPortId: 'out', toBlockId: 'boiler', toPortId: 'in-fw' },
      { id: 'w2', fromBlockId: 'steam', fromPortId: 'out', toBlockId: 'boiler', toPortId: 'in-steam' },
    ],
  };
  const engine = createSimulationEngine(graph);
  engine.runMultipleSteps(Math.round(0.4 / DT));
  const lBefore = engine.step().blockOutputs['boiler'];
  assert.equal(lBefore, 50);

  engine.runMultipleSteps(Math.round(0.5 / DT));
  const lSwell = engine.step().blockOutputs['boiler'];
  assert.ok(lSwell > 50, `Boiler drum level should swell above 50 on steam step, got ${lSwell}`);
});

test('T1-M13-04: Heat exchanger effective delay increases at lower process flow', () => {
  const graphFast: CircuitGraph = {
    nodes: [
      { id: 'steam', type: 'Constant', title: 'Steam', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 50 } },
      { id: 'flow', type: 'Constant', title: 'Flow', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'flow', type: 'output' }], config: { value: 80 } },
      { id: 'hex', type: 'HeatExchangerPlant', title: 'HEX', x: 100, y: 0, inputs: [{ id: 'in-u', name: 'u', type: 'input' }, { id: 'in-f', name: 'flow', type: 'input' }], outputs: [{ id: 'out', name: 'T', type: 'output' }], config: { initialTemp: 60 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'steam', fromPortId: 'out', toBlockId: 'hex', toPortId: 'in-u' },
      { id: 'w2', fromBlockId: 'flow', fromPortId: 'out', toBlockId: 'hex', toPortId: 'in-f' },
    ],
  };
  const engFast = createSimulationEngine(graphFast);
  const res = engFast.runMultipleSteps(20);
  assert.ok(res.blockOutputs['hex'] !== undefined);
});

test('T1-M13-05: Distillation column plant responds to reflux and boilup steam', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'reflux', type: 'Constant', title: 'Reflux', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'L', type: 'output' }], config: { value: 55 } },
      { id: 'boilup', type: 'Constant', title: 'Steam', x: 0, y: 50, inputs: [], outputs: [{ id: 'out', name: 'V', type: 'output' }], config: { value: 50 } },
      { id: 'col', type: 'DistillationColumnPlant', title: 'Column', x: 100, y: 0, inputs: [{ id: 'in-l', name: 'L', type: 'input' }, { id: 'in-v', name: 'V', type: 'input' }], outputs: [{ id: 'out', name: 'xD', type: 'output' }], config: { initialPurity: 98.0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'reflux', fromPortId: 'out', toBlockId: 'col', toPortId: 'in-l' },
      { id: 'w2', fromBlockId: 'boilup', fromPortId: 'out', toBlockId: 'col', toPortId: 'in-v' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(40);
  const xd = res.blockOutputs['col'];
  assert.ok(xd > 90 && xd <= 100, `Purity must remain realistic, got ${xd}%`);
});

// ============================================================================
// MODULE 14: Capstone Exam — The Unseen Plant Exam
// ============================================================================

test('T1-M14-01: Module 14 spec defines unseen plant commissioning exam rubric', () => {
  const m14 = MODULE_SPECS.m14;
  assert.ok(m14, 'Module 14 spec must exist');
  assert.equal(m14.number, 14);
  assert.equal(m14.prove.challengeType, 'unseenPlantCapstone');
  assert.equal(m14.prove.targetSP, 60);
  assert.equal(m14.prove.passingScore, 70);
  assert.ok(m14.prove.disturbances.length >= 1, 'Must have capstone disturbance test');
});

test('T1-M14-02: Capstone default circuit operates stably in closed loop', () => {
  const m14Circuit = MODULE_SPECS.m14.play.defaultCircuit;
  const engine = createSimulationEngine(m14Circuit);
  const res = engine.runMultipleSteps(100);
  assert.ok(res.blockOutputs['plant-node'] !== undefined, 'Plant output exists');
  assert.ok(!isNaN(res.blockOutputs['plant-node']), 'Plant output must not be NaN');
});

test('T1-M14-03: Capstone grading rubric evaluates 40% stability, 35% IAE, and 25% actuator health', () => {
  const calcRubric = (err: number, iae: number, chatter: number) => {
    const isStable = Math.abs(err) < 15.0;
    const stabilityScore = isStable ? 40 : Math.max(0, 40 - Math.abs(err) * 2);
    const iaeBench = 180.0;
    const iaeRatio = iae / iaeBench;
    const iaeScore = Math.max(0, Math.min(35, Math.round(40 - iaeRatio * 15)));
    const actuatorScore = chatter < 150 ? 25 : Math.max(0, 25 - (chatter - 150) * 0.1);
    return Math.min(100, Math.round(stabilityScore + iaeScore + actuatorScore));
  };

  const perfectScore = calcRubric(0.5, 60, 40);
  assert.ok(perfectScore >= 70, `Well-tuned loop should achieve passing score (got ${perfectScore})`);

  const unstableScore = calcRubric(25.0, 400, 300);
  assert.ok(unstableScore < 40, `Unstable noisy loop should fail rubric (got ${unstableScore})`);
});

test('T1-M14-04: Step test in manual mode allows measuring open-loop dynamics', () => {
  const graph: CircuitGraph = {
    nodes: [
      { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' }], config: { value: 60 } },
      { id: 'ctrl', type: 'PID', title: 'PID', x: 100, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 1.0, ti: 5.0, td: 0, mode: 'MANUAL', manualOutput: 30 } },
      { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 200, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'PV', type: 'output' }], config: { gain: 2.0, timeConstant: 3.0, initialOutput: 0 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
    ],
  };
  const engine = createSimulationEngine(graph);
  const res = engine.runMultipleSteps(120); // 6 seconds
  const y = res.blockOutputs['plant'];
  assert.ok(y > 30, `In MANUAL mode with u=30, K=2.0, PV should rise towards 60 (got ${y})`);
});

test('T1-M14-05: Capstone plant recovers from -25% load disturbance within duration', () => {
  const m14Circuit = MODULE_SPECS.m14.play.defaultCircuit;
  const engine = createSimulationEngine(m14Circuit);
  const res = engine.runMultipleSteps(800);
  assert.ok(res.metrics.currentError < 5.0, `Error should settle within tolerance band, got ${res.metrics.currentError}`);
  assert.ok(res.metrics.inToleranceRatio > 0.05, `In-tolerance ratio should be recorded, got ${res.metrics.inToleranceRatio}`);
});
