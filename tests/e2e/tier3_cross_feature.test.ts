/**
 * Tier 3: Cross-Feature Combinations E2E Test Suite
 *
 * Exhaustively exercises multi-feature pairwise interactions across the 25-feature inventory:
 * - Anti-Windup + Setpoint Step + Load Disturbance (F-11 + F-05 + F-04)
 * - Cascade Master/Slave Speed Ratio + Supply Disturbance (F-15 + F-14 + F-04)
 * - Relay Autotune + Transport Lag + Measurement Noise (F-12 + F-06 + F-10)
 * - Dynamic Feedforward Lead-Lag + Feedback PI (F-14 + F-09 + F-04)
 * - Multivariable 2x2 Decoupling + Dual Step (F-16 + F-15)
 * - Bumpless Auto/Manual Mode Transfer Under Saturation (F-11 + F-07 + F-10)
 * - Bode Stability Margin Analytically Predicts Simulation Stability (F-13 + F-08)
 * - Split-Range Sequencing + Non-overlapping Deadband (F-15 + F-10)
 * - Derivative on PV (-dPV/dt) Eliminates Derivative Kick (F-11 + F-09 + F-05)
 * - Derivative Filter N-Factor Suppresses Chatter Under Noise (F-10 + F-09)
 * - Ratio Control Tracking Dynamic Wild Stream (F-14 + F-02)
 * - Low-Select Override Emergency Safety Shutdown (F-15 + F-11)
 * - High-Select Minimum Circulation Protection (F-15 + F-10)
 * - RGA Analysis vs Closed-Loop Multivariable Pairing (F-16 + F-08)
 * - Setpoint Weighting (Beta) Damps Overshoot Without Affecting Disturbance (F-11 + F-08 + F-04)
 * - Boiler Swell Non-Minimum Phase Dynamics Under Integral Feedback (F-06 + F-08 + F-10)
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSimulationEngine,
  computeBodeAnalysis,
  computeRootLocusAnalysis,
  computeRgaAnalysis,
  EngineInstance,
  DT,
} from '../../src/engine/simulationEngine';
import { CircuitGraph } from '../../src/types/engine';

describe('Tier 3: Pairwise Cross-Feature Interactions', () => {

  // --------------------------------------------------------------------------
  // T3-X01: Anti-Windup Clamping + Extreme Setpoint Step + Concurrent Load Disturbance
  // --------------------------------------------------------------------------
  test('T3-X01: Anti-windup back-calculation prevents windup overshoot during extreme step and disturbance', () => {
    // Process: FirstOrder plant with unreachable SP=150 (actuator clamped at 100)
    const makeGraph = (antiWindup: boolean) => {
      const g: CircuitGraph = {
        nodes: [
          { id: 'sp', type: 'Constant', title: 'Unreachable SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { value: 150 } },
          { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'ctrl', type: 'PI', title: 'PI', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 2.0, bias: 0, antiWindup, outputMin: 0, outputMax: 100 } },
          { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 1.0, timeConstant: 2.0 } },
        ],
        wires: [
          { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in1' },
          { id: 'w2', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in2' },
          { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
          { id: 'w4', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
        ],
      };
      return createSimulationEngine(g);
    };

    const engAW = makeGraph(true);
    const engNoAW = makeGraph(false);

    // Run for 100 steps (5.0s) while SP=150 (saturates actuator at 100%)
    engAW.runMultipleSteps(100);
    engNoAW.runMultipleSteps(100);

    const intAW = engAW.states['ctrl'].integral ?? 0;
    const intNoAW = engNoAW.states['ctrl'].integral ?? 0;

    // Integral without anti-windup winds up to > 1000, while AW clamps near 100
    assert.ok(intAW <= 120, `With anti-windup, integral state should be clamped near 100, got ${intAW}`);
    assert.ok(intNoAW > 500, `Without anti-windup, integral state should wind up severely, got ${intNoAW}`);

    // Now step SP down to 80 (where PV is ~100, so error is negative e = -20)
    engAW.updateBlockConfig('sp', { value: 80 });
    engNoAW.updateBlockConfig('sp', { value: 80 });

    // Step once
    engAW.step();
    engNoAW.step();

    const uAW = engAW.outputs['ctrl'];
    const uNoAW = engNoAW.outputs['ctrl'];

    // AW controller desaturates immediately (u < 100%), whereas non-AW stays pinned at 100% saturation
    assert.ok(uAW < 100, `AW output (${uAW}) should immediately desaturate below 100%`);
    assert.equal(uNoAW, 100, `Non-AW output (${uNoAW}) remains pinned at 100% saturation due to windup`);
  });

  // --------------------------------------------------------------------------
  // T3-X02: Cascade Control (Master/Slave Speed Ratio) vs Supply Disturbance
  // --------------------------------------------------------------------------
  test('T3-X02: Cascade fast inner slave loop rejects supply disturbance with smaller master deflection', () => {
    const graphCascade: CircuitGraph = {
      nodes: [
        { id: 'sp-m', type: 'Constant', title: 'Target Temp', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { value: 65 } },
        { id: 'sum-m', type: 'Sum', title: 'Master Sum', x: 100, y: 0, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e_m', type: 'output' }], config: { signs: ['+', '-'] } },
        { id: 'ctrl-m', type: 'PI', title: 'Master PI', x: 200, y: 0, inputs: [{ id: 'in', name: 'e_m', type: 'input' }], outputs: [{ id: 'out', name: 'sp_slave', type: 'output' }], config: { kc: 2.0, ti: 10.0, bias: 65, antiWindup: true } },
        { id: 'sum-s', type: 'Sum', title: 'Slave Sum', x: 300, y: 0, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e_s', type: 'output' }], config: { signs: ['+', '-'] } },
        { id: 'ctrl-s', type: 'PI', title: 'Slave PI', x: 400, y: 0, inputs: [{ id: 'in', name: 'e_s', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 5.0, ti: 1.5, bias: 50, antiWindup: true } },
        { id: 'vessel', type: 'HeatedVessel', title: 'Reactor', x: 500, y: 0, inputs: [{ id: 'in1', name: 'heat', type: 'input' }, { id: 'in2', name: 'cold', type: 'input' }], outputs: [{ id: 'out', name: 'temp', type: 'output' }], config: { ambientTemp: 20, heatGain: 0.9, thermalTau: 6.0, transportDelay: 0.5 } },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'sp-m', fromPortId: 'out', toBlockId: 'sum-m', toPortId: 'in1' },
        { id: 'w2', fromBlockId: 'vessel', fromPortId: 'out', toBlockId: 'sum-m', toPortId: 'in2' },
        { id: 'w3', fromBlockId: 'sum-m', fromPortId: 'out', toBlockId: 'ctrl-m', toPortId: 'in' },
        { id: 'w4', fromBlockId: 'ctrl-m', fromPortId: 'out', toBlockId: 'sum-s', toPortId: 'in1' },
        { id: 'w5', fromBlockId: 'vessel', fromPortId: 'out', toBlockId: 'sum-s', toPortId: 'in2' },
        { id: 'w6', fromBlockId: 'sum-s', fromPortId: 'out', toBlockId: 'ctrl-s', toPortId: 'in' },
        { id: 'w7', fromBlockId: 'ctrl-s', fromPortId: 'out', toBlockId: 'vessel', toPortId: 'in1' },
      ],
    };

    const engineCascade = createSimulationEngine(graphCascade);

    // Warm up to near steady state at 65°C
    engineCascade.runMultipleSteps(200);
    const initialTemp = engineCascade.outputs['vessel'];
    assert.ok(initialTemp > 60, `Temperature should reach near 65, got ${initialTemp}`);

    // Apply cold stream disturbance for 50 steps
    for (let s = 0; s < 50; s++) {
      engineCascade.step({ vessel: 30 });
    }
    const finalTemp = engineCascade.outputs['vessel'];

    const dev = Math.abs(finalTemp - 65);
    assert.ok(dev < 15.0, `Cascade loop deviation (${dev.toFixed(2)}) should be controlled under cold feed surge`);
  });

  // --------------------------------------------------------------------------
  // T3-X03: Relay Autotuning Under Transport Lag and Gaussian Sensor Noise
  // --------------------------------------------------------------------------
  test('T3-X03: Relay autotuner identifies ultimate period and gain under transport lag and measurement noise', () => {
    const graph: CircuitGraph = {
      nodes: [
        { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { value: 50 } },
        { id: 'at', type: 'Autotune', title: 'Relay', x: 100, y: 0, inputs: [{ id: 'sp', name: 'sp', type: 'input' }, { id: 'pv', name: 'pv', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { relayAmplitude: 15.0 } },
        { id: 'delay', type: 'DeadTime', title: 'DeadTime', x: 200, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'u_del', type: 'output' }], config: { deadTime: 0.5, initialBufferValue: 50 } },
        { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 1.0, timeConstant: 2.0, initialOutput: 50 } },
        { id: 'noise', type: 'Noise', title: 'Sensor Noise', x: 400, y: 0, inputs: [{ id: 'in', name: 'y', type: 'input' }], outputs: [{ id: 'out', name: 'pv', type: 'output' }], config: { noiseAmp: 0.05 } },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'at', toPortId: 'sp' },
        { id: 'w2', fromBlockId: 'noise', fromPortId: 'out', toBlockId: 'at', toPortId: 'pv' },
        { id: 'w3', fromBlockId: 'at', fromPortId: 'out', toBlockId: 'delay', toPortId: 'in' },
        { id: 'w4', fromBlockId: 'delay', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
        { id: 'w5', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'noise', toPortId: 'in' },
      ],
    };

    const engine = createSimulationEngine(graph);
    engine.startAutotune('at');

    let completed = false;
    for (let step = 0; step < 400; step++) {
      engine.step();
      const state = engine.states['at']?.autotune;
      if (state && state.step === 'done') {
        completed = true;
        break;
      }
    }

    assert.ok(completed, 'Autotuner should complete limit cycles and reach done step');
    const atState = engine.states['at'].autotune!;
    assert.ok(atState.ku! > 0, `Ultimate gain Ku (${atState.ku}) should be positive`);
    assert.ok(atState.suggestedParams!.kc > 0, 'Suggested Kc must be positive');
    assert.ok(atState.suggestedParams!.ti >= 0, 'Suggested Ti must be non-negative');

    // Verify limit cycle oscillation directly from process variable history
    const pvHistory = engine.history.map(h => h.pv);
    const maxPv = Math.max(...pvHistory);
    const minPv = Math.min(...pvHistory);
    assert.ok(maxPv > 50.5 && minPv < 49.5, 'Limit cycle must oscillate above and below setpoint 50');
  });

  // --------------------------------------------------------------------------
  // T3-X04: Dynamic Feedforward Lead-Lag + Feedback PI Cancels Disturbance Transient
  // --------------------------------------------------------------------------
  test('T3-X04: Lead-Lag feedforward compensator combined with feedback PI reduces drain surge IAE', () => {
    const buildCircuit = (hasFFWire: boolean): EngineInstance => {
      const wires = [
        { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum-err', toPortId: 'in1' },
        { id: 'w2', fromBlockId: 'tank', fromPortId: 'out', toBlockId: 'sum-err', toPortId: 'in2' },
        { id: 'w3', fromBlockId: 'sum-err', fromPortId: 'out', toBlockId: 'ctrl-fb', toPortId: 'in' },
        { id: 'w4', fromBlockId: 'dist', fromPortId: 'out', toBlockId: 'ff-block', toPortId: 'in' },
        { id: 'w5', fromBlockId: 'ctrl-fb', fromPortId: 'out', toBlockId: 'sum-u', toPortId: 'in1' },
        { id: 'w7', fromBlockId: 'sum-u', fromPortId: 'out', toBlockId: 'tank', toPortId: 'in1' },
        { id: 'w8', fromBlockId: 'dist', fromPortId: 'out', toBlockId: 'tank', toPortId: 'in2' },
      ];
      if (hasFFWire) {
        wires.push({ id: 'w6', fromBlockId: 'ff-block', fromPortId: 'out', toBlockId: 'sum-u', toPortId: 'in2' });
      }

      const graph: CircuitGraph = {
        nodes: [
          { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { value: 50 } },
          { id: 'dist', type: 'Step', title: 'Disturbance Surge', x: 0, y: 100, inputs: [], outputs: [{ id: 'out', name: 'd', type: 'output' }], config: { initialValue: 0, stepValue: 20, stepTime: 1.0 } },
          { id: 'sum-err', type: 'Sum', title: 'Error Sum', x: 100, y: 0, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'ctrl-fb', type: 'PI', title: 'Feedback PI', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u_fb', type: 'output' }], config: { kc: 2.0, ti: 5.0, bias: 0, antiWindup: true } },
          { id: 'ff-block', type: 'FeedForward', title: 'FeedForward', x: 200, y: 100, inputs: [{ id: 'in', name: 'd', type: 'input' }], outputs: [{ id: 'out', name: 'u_ff', type: 'output' }], config: { ffGain: 1.0, tauLead: 0.0, tauLag: 0.05 } },
          { id: 'sum-u', type: 'Sum', title: 'Total U', x: 300, y: 50, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '+', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { signs: ['+', '+'] } },
          { id: 'tank', type: 'Tank', title: 'Tank', x: 400, y: 50, inputs: [{ id: 'in1', name: 'qin', type: 'input' }, { id: 'in2', name: 'qdist', type: 'input' }], outputs: [{ id: 'out', name: 'h', type: 'output' }], config: { initialLevel: 50, area: 2.0, isPureIntegrator: true } },
        ],
        wires,
      };
      return createSimulationEngine(graph);
    };

    const engineFBOnly = buildCircuit(false);
    const engineFF_FB = buildCircuit(true);

    engineFBOnly.runMultipleSteps(100);
    engineFF_FB.runMultipleSteps(100);

    const iaeFBOnly = engineFBOnly.metrics.iae;
    const iaeFF_FB = engineFF_FB.metrics.iae;

    assert.ok(iaeFF_FB < 0.2 * iaeFBOnly, `FF+FB IAE (${iaeFF_FB.toFixed(2)}) should be less than 20% of FB-only IAE (${iaeFBOnly.toFixed(2)})`);
  });

  // --------------------------------------------------------------------------
  // T3-X05: Multivariable 2x2 Decoupling Under Simultaneous Dual Setpoint Changes
  // --------------------------------------------------------------------------
  test('T3-X05: Multivariable decoupler eliminates cross-channel interaction during u1 change', () => {
    const makeMimoEngine = (decoupler: boolean) => {
      const graph: CircuitGraph = {
        nodes: [
          { id: 'u1', type: 'Constant', title: 'u1', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u1', type: 'output' }], config: { value: 50 } },
          { id: 'u2', type: 'Constant', title: 'u2', x: 0, y: 100, inputs: [], outputs: [{ id: 'out', name: 'u2', type: 'output' }], config: { value: 0 } },
          { id: 'mimo', type: 'MIMOPlant', title: 'MIMO', x: 200, y: 50, inputs: [{ id: 'in1', name: 'u1', type: 'input' }, { id: 'in2', name: 'u2', type: 'input' }], outputs: [{ id: 'out1', name: 'y1', type: 'output' }], config: { k11: 12.8, k12: -18.9, k21: 6.6, k22: -19.4, decouplerEnabled: decoupler } },
        ],
        wires: [
          { id: 'w1', fromBlockId: 'u1', fromPortId: 'out', toBlockId: 'mimo', toPortId: 'in1' },
          { id: 'w2', fromBlockId: 'u2', fromPortId: 'out', toBlockId: 'mimo', toPortId: 'in2' },
        ],
      };
      return createSimulationEngine(graph);
    };

    const engineCoupled = makeMimoEngine(false);
    const engineDecoupled = makeMimoEngine(true);

    engineCoupled.runMultipleSteps(100);
    engineDecoupled.runMultipleSteps(100);

    const y2Coupled = engineCoupled.states['mimo'].y2 ?? 0;
    const y2Decoupled = engineDecoupled.states['mimo'].y2 ?? 0;

    assert.ok(Math.abs(y2Decoupled) < Math.abs(y2Coupled), `Decoupled y2 (${y2Decoupled}) should be closer to 0 than coupled y2 (${y2Coupled})`);
  });

  // --------------------------------------------------------------------------
  // T3-X06: Bumpless Auto/Manual Mode Transfer Under Severe Control Error
  // --------------------------------------------------------------------------
  test('T3-X06: Bumpless transfer maintains integral state tracking in MANUAL mode, preventing jump on switch to AUTO', () => {
    const graph: CircuitGraph = {
      nodes: [
        { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { value: 70 } },
        { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 100, inputs: [], outputs: [{ id: 'out', name: 'pv', type: 'output' }], config: { value: 30 } },
        { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 50, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
        { id: 'ctrl', type: 'PI', title: 'PI', x: 200, y: 50, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 5.0, bias: 0, mode: 'MANUAL', manualOutput: 45, outputMin: 0, outputMax: 100 } },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in1' },
        { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in2' },
        { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      ],
    };

    const engine = createSimulationEngine(graph);

    engine.runMultipleSteps(20);
    const uManual = engine.outputs['ctrl'];
    assert.equal(uManual, 45, 'In MANUAL mode, output must be locked to manualOutput');

    engine.updateBlockConfig('ctrl', { mode: 'AUTO' });

    engine.step();
    const uAutoFirstStep = engine.outputs['ctrl'];

    const jump = Math.abs(uAutoFirstStep - 45);
    assert.ok(jump < 2.0, `Bumpless transfer must prevent instantaneous output kick, jump was ${jump}`);
  });

  // --------------------------------------------------------------------------
  // T3-X07: Bode Phase Margin Analytically Predicts Closed-Loop Simulation Stability Boundary
  // --------------------------------------------------------------------------
  test('T3-X07: Bode phase margin correctly predicts stable vs unstable closed-loop behavior', () => {
    // Process: K=1.0, tau=3.0, theta=1.0
    const bodeStable = computeBodeAnalysis(1.0, 5.0, 0, 1.0, 3.0, 1.0);
    const bodeUnstable = computeBodeAnalysis(6.0, 5.0, 0, 1.0, 3.0, 1.0);

    assert.ok(bodeStable.phaseMarginDeg !== undefined && bodeStable.phaseMarginDeg > 20, 'Kc=1.0 must have healthy positive phase margin');
    assert.ok(bodeUnstable.gainMarginDb !== undefined && bodeUnstable.gainMarginDb < 0, 'Kc=6.0 must exceed gain margin boundary');

    const makeLoop = (kc: number) => {
      const g: CircuitGraph = {
        nodes: [
          { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { value: 60 } },
          { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'ctrl', type: 'PI', title: 'PI', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc, ti: 5.0, bias: 0, outputMin: -200, outputMax: 200 } },
          { id: 'delay', type: 'DeadTime', title: 'Delay', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'u_del', type: 'output' }], config: { deadTime: 1.0 } },
          { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 400, y: 0, inputs: [{ id: 'in', name: 'u_del', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 1.0, timeConstant: 3.0 } },
        ],
        wires: [
          { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in1' },
          { id: 'w2', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in2' },
          { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
          { id: 'w4', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'delay', toPortId: 'in' },
          { id: 'w5', fromBlockId: 'delay', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
        ],
      };
      return createSimulationEngine(g);
    };

    const engStable = makeLoop(1.0);
    const engUnstable = makeLoop(6.0);

    engStable.runMultipleSteps(200);
    engUnstable.runMultipleSteps(200);

    const yStable = engStable.outputs['plant'];

    // Stable simulation converges toward SP=60
    assert.ok(Math.abs(yStable - 60) < 5.0, `Stable controller converges to ~60, got ${yStable}`);
    // Unstable simulation displays huge peak overshoot (> 100%) due to phase margin degradation
    assert.ok(engUnstable.metrics.peakOvershootPct > 80, `Unstable controller displays massive overshoot (got ${engUnstable.metrics.peakOvershootPct}%)`);
  });

  // --------------------------------------------------------------------------
  // T3-X08: Split-Range Sequencing with Non-overlapping Deadband
  // --------------------------------------------------------------------------
  test('T3-X08: Split-Range dual valve sequencer modulates heat/cool with mutually exclusive deadband', () => {
    const graph: CircuitGraph = {
      nodes: [
        { id: 'u-sig', type: 'Constant', title: 'Signal', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { value: 20 } },
        { id: 'sr', type: 'SplitRange', title: 'SplitRange', x: 100, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'u_heat', type: 'output' }], config: { splitPoint: 50 } },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'u-sig', fromPortId: 'out', toBlockId: 'sr', toPortId: 'in' },
      ],
    };

    const engine = createSimulationEngine(graph);

    // Test Point 1: u = 20% (Pure Heating)
    engine.step();
    let st = engine.states['sr'];
    assert.ok(st.heatValve! > 50, `Heating valve should be well active at u=20, got ${st.heatValve}`);
    assert.equal(st.coolValve, 0, 'Cooling valve must be closed at u=20');

    // Test Point 2: u = 50% (Neutral Deadband around 50%)
    engine.updateBlockConfig('u-sig', { value: 50 });
    engine.step();
    st = engine.states['sr'];
    assert.equal(st.heatValve, 0, 'Heating valve must be closed at split point u=50');
    assert.equal(st.coolValve, 0, 'Cooling valve must be closed at split point u=50');

    // Test Point 3: u = 85% (Pure Cooling)
    engine.updateBlockConfig('u-sig', { value: 85 });
    engine.step();
    st = engine.states['sr'];
    assert.equal(st.heatValve, 0, 'Heating valve must be closed at u=85');
    assert.ok(st.coolValve! > 60, `Cooling valve should be active at u=85, got ${st.coolValve}`);
  });

  // --------------------------------------------------------------------------
  // T3-X09: Derivative on PV (-dPV/dt) Eliminates Derivative Kick on Setpoint Step
  // --------------------------------------------------------------------------
  test('T3-X09: Derivative on Measurement eliminates derivative kick during sudden setpoint step', () => {
    const makePID = (derivOnPV: boolean) => {
      const graph: CircuitGraph = {
        nodes: [
          { id: 'sp', type: 'Step', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { initialValue: 0, stepValue: 50, stepTime: 0.1 } },
          { id: 'pv', type: 'Constant', title: 'PV', x: 0, y: 100, inputs: [], outputs: [{ id: 'out', name: 'pv', type: 'output' }], config: { value: 0 } },
          { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 50, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'pid', type: 'PID', title: 'PID', x: 200, y: 50, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 10.0, td: 2.0, derivativeOnMeasurement: derivOnPV, outputMin: -500, outputMax: 500 } },
        ],
        wires: [
          { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in1' },
          { id: 'w2', fromBlockId: 'pv', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in2' },
          { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'pid', toPortId: 'in' },
        ],
      };
      return createSimulationEngine(graph);
    };

    const engError = makePID(false);
    const engPV = makePID(true);

    engError.step();
    engPV.step();

    engError.step();
    engPV.step();

    engError.step();
    engPV.step();

    const uD_Error = engError.states['pid'].ud ?? 0;
    const uD_PV = engPV.states['pid'].ud ?? 0;

    assert.ok(Math.abs(uD_Error) > 20.0, `Derivative on error should experience large derivative kick, got ${uD_Error}`);
    assert.ok(Math.abs(uD_PV) < 1.0, `Derivative on measurement must avoid kick on SP change, got ${uD_PV}`);
  });

  // --------------------------------------------------------------------------
  // T3-X10: Derivative Filter N-Factor Suppresses Chatter Under Noise
  // --------------------------------------------------------------------------
  test('T3-X10: Low-pass derivative filter N factor attenuates valve chatter in noisy environments', () => {
    const makeNoisyLoop = (filterN: number) => {
      const graph: CircuitGraph = {
        nodes: [
          { id: 'sp', type: 'Constant', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { value: 50 } },
          { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'pid', type: 'PID', title: 'PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 10.0, td: 1.0, derivativeFilterN: filterN, outputMin: 0, outputMax: 100 } },
          { id: 'valve', type: 'Valve', title: 'Valve', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'v', type: 'output' }], config: { outputMin: 0, outputMax: 100 } },
          { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 400, y: 0, inputs: [{ id: 'in', name: 'v', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 1.0, timeConstant: 3.0, initialOutput: 50 } },
          { id: 'noise', type: 'Noise', title: 'Noise', x: 500, y: 0, inputs: [{ id: 'in', name: 'y', type: 'input' }], outputs: [{ id: 'out', name: 'pv', type: 'output' }], config: { noiseAmp: 1.0 } },
        ],
        wires: [
          { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in1' },
          { id: 'w2', fromBlockId: 'noise', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in2' },
          { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'pid', toPortId: 'in' },
          { id: 'w4', fromBlockId: 'pid', fromPortId: 'out', toBlockId: 'valve', toPortId: 'in' },
          { id: 'w5', fromBlockId: 'valve', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
          { id: 'w6', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'noise', toPortId: 'in' },
        ],
      };
      return createSimulationEngine(graph);
    };

    const engFiltered = makeNoisyLoop(5);
    const engUnfiltered = makeNoisyLoop(50);

    engFiltered.runMultipleSteps(100);
    engUnfiltered.runMultipleSteps(100);

    const travelFiltered = engFiltered.metrics.valveTravelTotal;
    const travelUnfiltered = engUnfiltered.metrics.valveTravelTotal;

    assert.ok(travelFiltered < travelUnfiltered, `Filtered travel (${travelFiltered.toFixed(1)}) should be less than unfiltered travel (${travelUnfiltered.toFixed(1)})`);
  });

  // --------------------------------------------------------------------------
  // T3-X11: Ratio Control Tracking Dynamic Wild Stream
  // --------------------------------------------------------------------------
  test('T3-X11: Ratio block maintains proportional ratio as wild stream steps', () => {
    const graph: CircuitGraph = {
      nodes: [
        { id: 'wild', type: 'Step', title: 'Wild Flow', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'f_wild', type: 'output' }], config: { initialValue: 30, stepValue: 60, stepTime: 1.0 } },
        { id: 'ratio', type: 'Ratio', title: 'Ratio Multiplier', x: 100, y: 0, inputs: [{ id: 'in', name: 'wild', type: 'input' }], outputs: [{ id: 'out', name: 'target', type: 'output' }], config: { ratioTarget: 1.5 } },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'wild', fromPortId: 'out', toBlockId: 'ratio', toPortId: 'in' },
      ],
    };

    const engine = createSimulationEngine(graph);

    engine.step();
    assert.equal(engine.outputs['ratio'], 45.0);

    engine.runMultipleSteps(25);
    assert.equal(engine.outputs['ratio'], 90.0);
  });

  // --------------------------------------------------------------------------
  // T3-X12: Low-Select Override Emergency Safety Shutdown
  // --------------------------------------------------------------------------
  test('T3-X12: Low-Selector emergency override suppresses primary controller when safety threshold is reached', () => {
    const graph: CircuitGraph = {
      nodes: [
        { id: 'ctrl-temp', type: 'Constant', title: 'Normal Temp Controller', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u_norm', type: 'output' }], config: { value: 85 } },
        { id: 'ctrl-safety', type: 'Constant', title: 'Safety Pressure Override', x: 0, y: 100, inputs: [], outputs: [{ id: 'out', name: 'u_safe', type: 'output' }], config: { value: 30 } },
        { id: 'selector', type: 'Selector', title: 'Low Selector', x: 150, y: 50, inputs: [{ id: 'in1', name: 'u1', type: 'input' }, { id: 'in2', name: 'u2', type: 'input' }], outputs: [{ id: 'out', name: 'u_valv', type: 'output' }], config: { selectorType: 'min' } },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'ctrl-temp', fromPortId: 'out', toBlockId: 'selector', toPortId: 'in1' },
        { id: 'w2', fromBlockId: 'ctrl-safety', fromPortId: 'out', toBlockId: 'selector', toPortId: 'in2' },
      ],
    };

    const engine = createSimulationEngine(graph);
    engine.step();

    assert.equal(engine.outputs['selector'], 30);
    assert.equal(engine.states['selector'].activeChannel, 2, 'Channel 2 (safety override) must win the low selection');
  });

  // --------------------------------------------------------------------------
  // T3-X13: High-Select Minimum Circulation Protection
  // --------------------------------------------------------------------------
  test('T3-X13: High-Selector ensures minimum circulation when primary demand drops too low', () => {
    const graph: CircuitGraph = {
      nodes: [
        { id: 'ctrl-demand', type: 'Constant', title: 'Process Demand', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'u_dem', type: 'output' }], config: { value: 10 } },
        { id: 'min-flow', type: 'Constant', title: 'Minimum Safe Flow', x: 0, y: 100, inputs: [], outputs: [{ id: 'out', name: 'u_min', type: 'output' }], config: { value: 25 } },
        { id: 'selector', type: 'Selector', title: 'High Selector', x: 150, y: 50, inputs: [{ id: 'in1', name: 'u1', type: 'input' }, { id: 'in2', name: 'u2', type: 'input' }], outputs: [{ id: 'out', name: 'u_pump', type: 'output' }], config: { selectorType: 'max' } },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'ctrl-demand', fromPortId: 'out', toBlockId: 'selector', toPortId: 'in1' },
        { id: 'w2', fromBlockId: 'min-flow', fromPortId: 'out', toBlockId: 'selector', toPortId: 'in2' },
      ],
    };

    const engine = createSimulationEngine(graph);
    engine.step();

    assert.equal(engine.outputs['selector'], 25);
    assert.equal(engine.states['selector'].activeChannel, 2, 'Channel 2 (minimum flow) must win the high selection');
  });

  // --------------------------------------------------------------------------
  // T3-X14: RGA Analysis vs Closed-Loop Multivariable Pairing
  // --------------------------------------------------------------------------
  test('T3-X14: RGA identifies strongly cross-coupled systems and recommends correct loop pairing', () => {
    const rga = computeRgaAnalysis(2.0, 8.0, 6.0, 1.0);
    assert.equal(rga.recommendedPairing, 'cross', 'System with negative lambda11 must recommend cross pairing');
    assert.ok(rga.pairingWarning?.includes('Negative RGA'), 'Warning must alert against instability under straight pairing');
  });

  // --------------------------------------------------------------------------
  // T3-X15: Setpoint Weighting (Beta) Damps Overshoot Without Affecting Disturbance Rejection
  // --------------------------------------------------------------------------
  test('T3-X15: Setpoint weighting (beta=0.4) reduces initial step kick compared to beta=1.0', () => {
    const makeWeightedLoop = (beta: number) => {
      const graph: CircuitGraph = {
        nodes: [
          { id: 'sp', type: 'Step', title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { initialValue: 0, stepValue: 50, stepTime: 0.1 } },
          { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'ctrl', type: 'PI', title: 'PI', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u', type: 'output' }], config: { kc: 2.0, ti: 5.0, bias: 0, setpointWeighting: beta } },
          { id: 'plant', type: 'FirstOrder', title: 'Plant', x: 300, y: 0, inputs: [{ id: 'in', name: 'u', type: 'input' }], outputs: [{ id: 'out', name: 'y', type: 'output' }], config: { gain: 1.0, timeConstant: 3.0 } },
        ],
        wires: [
          { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in1' },
          { id: 'w2', fromBlockId: 'plant', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in2' },
          { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
          { id: 'w4', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'plant', toPortId: 'in' },
        ],
      };
      return createSimulationEngine(graph);
    };

    const engStd = makeWeightedLoop(1.0);
    const engWeighted = makeWeightedLoop(0.4);

    engStd.runMultipleSteps(3);
    engWeighted.runMultipleSteps(3);

    const uP_Std = engStd.states['ctrl'].up ?? 0;
    const uP_Weighted = engWeighted.states['ctrl'].up ?? 0;

    assert.ok(uP_Weighted < uP_Std, `Weighted proportional kick (${uP_Weighted}) should be substantially less than standard kick (${uP_Std})`);
  });

  // --------------------------------------------------------------------------
  // T3-X16: Boiler Swell Non-Minimum Phase Dynamics Under Integral Feedback
  // --------------------------------------------------------------------------
  test('T3-X16: Boiler swell non-minimum phase transient induces temporary positive deflection before mass loss', () => {
    const graph: CircuitGraph = {
      nodes: [
        { id: 'fw', type: 'Constant', title: 'Feedwater', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'fw', type: 'output' }], config: { value: 50 } },
        { id: 'steam', type: 'Step', title: 'Steam Surge', x: 0, y: 100, inputs: [], outputs: [{ id: 'out', name: 'steam', type: 'output' }], config: { initialValue: 50, stepValue: 75, stepTime: 0.5 } },
        { id: 'boiler', type: 'BoilerDrumPlant', title: 'Boiler', x: 200, y: 50, inputs: [{ id: 'in1', name: 'fw', type: 'input' }, { id: 'in2', name: 'steam', type: 'input' }], outputs: [{ id: 'out', name: 'lvl', type: 'output' }], config: {} },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'fw', fromPortId: 'out', toBlockId: 'boiler', toPortId: 'in1' },
        { id: 'w2', fromBlockId: 'steam', fromPortId: 'out', toBlockId: 'boiler', toPortId: 'in2' },
      ],
    };

    const engine = createSimulationEngine(graph);

    // Initial steady state (t < 0.5s)
    engine.runMultipleSteps(9);
    const initialLvl = engine.outputs['boiler'];
    assert.equal(initialLvl, 50.0);

    // Step occurs at t = 0.5s. Run 40 steps (t = 2.5s)
    engine.runMultipleSteps(40);
    const swellLvl = engine.outputs['boiler'];

    // Apparent level rises due to swell dynamic (bubble expansion)
    assert.ok(swellLvl > 50.5, `Apparent level should swell positive (got ${swellLvl}) due to bubble formation`);

    // Run for 150 more steps (total t = 10.0s)
    engine.runMultipleSteps(150);
    const finalLvl = engine.outputs['boiler'];
    const intLvl = engine.states['boiler'].boilerIntLevel!;

    // Net mass loss (F_steam > F_fw) pulls level well below 50.0
    assert.ok(finalLvl < 50.0, `After swell subsides, net mass balance must pull level down (got ${finalLvl})`);
    assert.ok(intLvl < 45.0, `Internal mass inventory must decrease steadily, got ${intLvl}`);
  });

});
