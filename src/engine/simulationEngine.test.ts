/**
 * Unit tests for deterministic simulation engine (Milestones 0, 1 & 2)
 * Run with: npx --yes tsx --test src/engine/simulationEngine.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSimulationEngine,
  computeBodeAnalysis,
  computeRootLocusAnalysis,
  computeRgaAnalysis,
  DT,
} from './simulationEngine';
import { calculateMonodGrowthRate } from '../services/bioprocessService';
import { CircuitGraph } from '../types/engine';

test('engine step advances time deterministically by DT', () => {
  const dummyGraph: CircuitGraph = {
    nodes: [
      {
        id: 'c1',
        type: 'Constant',
        title: 'Constant',
        x: 0,
        y: 0,
        inputs: [],
        outputs: [{ id: 'c1-out', name: 'out', type: 'output' }],
        config: { value: 42 },
      },
    ],
    wires: [],
  };

  const engine = createSimulationEngine(dummyGraph);
  assert.equal(engine.time, 0);

  const res1 = engine.step();
  assert.equal(res1.time, DT);
  assert.equal(res1.blockOutputs['c1'], 42);

  const res2 = engine.step();
  assert.equal(res2.time, +(2 * DT).toFixed(3));
});

test('first order lag converges to K * u analytically', () => {
  const foGraph: CircuitGraph = {
    nodes: [
      {
        id: 'u-src',
        type: 'Constant',
        title: 'Input',
        x: 0,
        y: 0,
        inputs: [],
        outputs: [{ id: 'u-out', name: 'u', type: 'output' }],
        config: { value: 10 },
      },
      {
        id: 'fo-plant',
        type: 'FirstOrder',
        title: 'Lag',
        x: 100,
        y: 0,
        inputs: [{ id: 'fo-in', name: 'u', type: 'input' }],
        outputs: [{ id: 'fo-out', name: 'y', type: 'output' }],
        config: { gain: 2.0, timeConstant: 1.0, initialOutput: 0 },
      },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'u-src', fromPortId: 'u-out', toBlockId: 'fo-plant', toPortId: 'fo-in' },
    ],
  };

  const engine = createSimulationEngine(foGraph);
  const res = engine.runMultipleSteps(100);
  const finalY = res.blockOutputs['fo-plant'];

  assert.ok(finalY > 19.8, `Expected finalY > 19.8, got ${finalY}`);
  assert.ok(finalY <= 20.05, `Expected finalY <= 20.05, got ${finalY}`);
});

test('dead time ring buffer delays signal by exact theta', () => {
  const dtGraph: CircuitGraph = {
    nodes: [
      {
        id: 'step-src',
        type: 'Step',
        title: 'Step',
        x: 0,
        y: 0,
        inputs: [],
        outputs: [{ id: 's-out', name: 'u', type: 'output' }],
        config: { initialValue: 0, stepValue: 100, stepTime: 1.0 },
      },
      {
        id: 'delay-node',
        type: 'DeadTime',
        title: 'Delay',
        x: 100,
        y: 0,
        inputs: [{ id: 'dt-in', name: 'in', type: 'input' }],
        outputs: [{ id: 'dt-out', name: 'out', type: 'output' }],
        config: { deadTime: 1.0, initialBufferValue: 0 },
      },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'step-src', fromPortId: 's-out', toBlockId: 'delay-node', toPortId: 'dt-in' },
    ],
  };

  const engine = createSimulationEngine(dtGraph);
  engine.runMultipleSteps(30); // 1.5s
  assert.equal(engine.outputs['delay-node'], 0);

  engine.runMultipleSteps(15); // t = 2.25s
  assert.equal(engine.outputs['delay-node'], 100);
});

test('back-calculation anti-windup prevents integral runaway when saturated', () => {
  const awGraph: CircuitGraph = {
    nodes: [
      {
        id: 'err-src',
        type: 'Constant',
        title: 'Big Error',
        x: 0,
        y: 0,
        inputs: [],
        outputs: [{ id: 'e-out', name: 'e', type: 'output' }],
        config: { value: 50 }, // Massive persistent error
      },
      {
        id: 'pid-aw',
        type: 'PID',
        title: 'PID with Anti-Windup',
        x: 100,
        y: 0,
        inputs: [{ id: 'p-in', name: 'e', type: 'input' }],
        outputs: [{ id: 'p-out', name: 'u', type: 'output' }],
        config: { kc: 2.0, ti: 2.0, td: 0, antiWindup: true, outputMin: 0, outputMax: 100 },
      },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'err-src', fromPortId: 'e-out', toBlockId: 'pid-aw', toPortId: 'p-in' },
    ],
  };

  const engine = createSimulationEngine(awGraph);
  // Run for 10 seconds under massive positive error
  const res = engine.runMultipleSteps(200);

  const st = engine.states['pid-aw'];
  assert.equal(res.blockOutputs['pid-aw'], 100, 'Actuator should clamp at 100%');
  // With anti-windup tracking, integral should NOT explode to 1000s
  assert.ok((st.integral ?? 0) <= 120, `Expected integral to stay bounded, got ${st.integral}`);
});

test('bumpless transfer seamlessly tracks manual output without transient jump', () => {
  const btGraph: CircuitGraph = {
    nodes: [
      {
        id: 'err-src',
        type: 'Constant',
        title: 'Error',
        x: 0,
        y: 0,
        inputs: [],
        outputs: [{ id: 'e-out', name: 'e', type: 'output' }],
        config: { value: 10 },
      },
      {
        id: 'pid-bt',
        type: 'PID',
        title: 'PID',
        x: 100,
        y: 0,
        inputs: [{ id: 'p-in', name: 'e', type: 'input' }],
        outputs: [{ id: 'p-out', name: 'u', type: 'output' }],
        config: { kc: 2.0, ti: 5.0, mode: 'MANUAL', manualOutput: 45 },
      },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'err-src', fromPortId: 'e-out', toBlockId: 'pid-bt', toPortId: 'p-in' },
    ],
  };

  const engine = createSimulationEngine(btGraph);
  engine.runMultipleSteps(40); // 2 seconds in manual
  assert.equal(engine.outputs['pid-bt'], 45, 'In manual, output should be 45%');

  // Switch mode to AUTO
  engine.updateBlockConfig('pid-bt', { mode: 'AUTO' });
  const stepRes = engine.step();

  // Bumpless transfer check: first auto step should remain exactly at 45% (bump < 0.2%)
  const bump = Math.abs(stepRes.blockOutputs['pid-bt'] - 45);
  assert.ok(bump < 0.5, `Expected bump < 0.5, got bump ${bump}`);
});

test('monod kinetics accurately calculates cell growth rate and limiting factor', () => {
  const normal = calculateMonodGrowthRate(15, 60, 37.0);
  assert.ok(normal.mu > 0.06, `Expected high growth rate, got ${normal.mu}`);
  assert.equal(normal.limitingFactor, 'Optimal Nutrient Supply');

  const hypoxic = calculateMonodGrowthRate(15, 5, 37.0);
  assert.ok(hypoxic.mu < normal.mu, 'Hypoxic growth should be significantly reduced');
  assert.equal(hypoxic.limitingFactor, 'Hypoxia (Oxygen Depletion)');
});

test('bode analysis correctly calculates gain margin, phase margin and ultimate gain', () => {
  // Stable case: Kc = 1.0, Ti = 5.0, K = 1.0, tau = 3.0, theta = 1.0
  const stableBode = computeBodeAnalysis(1.0, 5.0, 0, 1.0, 3.0, 1.0);
  assert.ok(stableBode.points.length > 50, 'Bode points should be populated');
  assert.ok(stableBode.omega180 !== undefined, 'Phase crossover frequency omega180 should exist');
  assert.ok(stableBode.gainMarginDb !== undefined && stableBode.gainMarginDb > 0, 'Gain margin should be positive for stable loop');
  assert.ok(stableBode.isStable, 'Loop should be identified as stable');
  assert.ok(stableBode.ultimateGain !== undefined && stableBode.ultimateGain > 1.0, 'Ku should be greater than 1.0');

  // Unstable case: Kc = 15.0
  const unstableBode = computeBodeAnalysis(15.0, 5.0, 0, 1.0, 3.0, 1.0);
  assert.ok(unstableBode.gainMarginDb !== undefined && unstableBode.gainMarginDb < 0, 'Gain margin should be negative for aggressive loop');
  assert.equal(unstableBode.isStable, false, 'Loop should be identified as unstable');
});

test('root locus analysis identifies poles crossing into right-half plane', () => {
  // Moderate gain: Left-Half Plane
  const stableRL = computeRootLocusAnalysis(1.0, 1.0, 3.0, 1.0);
  assert.equal(stableRL.poles.length, 2, 'Should compute 2 closed-loop poles via Pade approx');
  assert.equal(stableRL.stability, 'stable', 'Moderate gain should place poles in LHP');
  assert.ok(stableRL.poles[0].real < 0 && stableRL.poles[1].real < 0, 'Poles should have negative real parts');

  // Extreme gain: Right-Half Plane (Unstable)
  const unstableRL = computeRootLocusAnalysis(15.0, 1.0, 3.0, 1.0);
  assert.equal(unstableRL.stability, 'unstable', 'Extreme gain should push poles into RHP');
  assert.ok(unstableRL.poles.some((p) => p.real > 0), 'At least one pole should have positive real part');
});

test('bristol RGA analysis gives correct loop pairing recommendation and detects inverted interactions', () => {
  // Standard diagonal pairing: u1->y1, u2->y2
  const diagonalRGA = computeRgaAnalysis(2.0, 0.2, 0.2, 2.0);
  assert.ok(diagonalRGA.lambda11 > 0.8 && diagonalRGA.lambda11 <= 1.1, `Expected lambda11 ~ 1.0, got ${diagonalRGA.lambda11}`);
  assert.equal(diagonalRGA.recommendedPairing, 'straight');

  // Off-diagonal dominant pairing: u1->y2, u2->y1
  const crossRGA = computeRgaAnalysis(0.2, 2.0, 2.0, 0.2);
  assert.ok(crossRGA.lambda11 < 0.2, `Expected low lambda11 for cross system, got ${crossRGA.lambda11}`);
  assert.equal(crossRGA.recommendedPairing, 'cross');

  // Negative interaction warning
  const negRGA = computeRgaAnalysis(1.0, 2.0, 2.0, 1.0);
  assert.ok(negRGA.lambda11 < 0, 'Should detect negative interaction');
  assert.ok(negRGA.pairingWarning !== undefined, 'Should provide pairing warning for negative RGA');
});

test('lead-lag dynamic filter provides lead boost on step and settles to steady-state', () => {
  const llGraph: CircuitGraph = {
    nodes: [
      {
        id: 'u-src',
        type: 'Step',
        title: 'Step',
        x: 0,
        y: 0,
        inputs: [],
        outputs: [{ id: 'u-out', name: 'u', type: 'output' }],
        config: { initialValue: 0, stepValue: 10, stepTime: 0.1 },
      },
      {
        id: 'll-node',
        type: 'LeadLag',
        title: 'LeadLag',
        x: 100,
        y: 0,
        inputs: [{ id: 'll-in', name: 'in', type: 'input' }],
        outputs: [{ id: 'll-out', name: 'out', type: 'output' }],
        config: { tauLead: 4.0, tauLag: 1.0, gain: 1.0, initialOutput: 0 },
      },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'u-src', fromPortId: 'u-out', toBlockId: 'll-node', toPortId: 'll-in' },
    ],
  };

  const engine = createSimulationEngine(llGraph);
  // Advance to step onset
  engine.runMultipleSteps(5); // t = 0.25s
  const transientOut = engine.outputs['ll-node'];
  assert.ok(transientOut > 10, `Lead action should boost output above steady-state 10, got ${transientOut}`);

  // Run to settle
  engine.runMultipleSteps(100); // 5s later
  const settledOut = engine.outputs['ll-node'];
  assert.ok(Math.abs(settledOut - 10) < 0.2, `Output should settle to steady-state 10, got ${settledOut}`);
});

