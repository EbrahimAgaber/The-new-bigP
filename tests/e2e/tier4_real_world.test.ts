/**
 * Tier 4: Real-World Application Scenarios E2E Test Suite
 *
 * Implements 5 high-fidelity industrial case studies and the Capstone commissioning run:
 * - Scenario A: Exothermic CSTR Thermal Runaway Prevention Gauntlet (F-23)
 * - Scenario B: Boiler Drum Steam Demand Swell Rejection (3-Element Control) (F-24)
 * - Scenario C: Shell-and-Tube Heat Exchanger Throughput Disturbance Rejection (F-23)
 * - Scenario D: Wood-Berry Distillation Column 2x2 Decoupled Purity Regulation (F-23, F-16)
 * - Scenario E: Capstone Unseen Plant 2-Minute Stress Commissioning Run (F-25)
 *
 * Authoritative Sources:
 * - specifications.md (Curriculum Specifications v2.0.0, Modules 13 & 14)
 * - PROJECT.md (Feature Inventory F-23, F-24, F-25)
 * - modulesData.ts (MODULE_SPECS.m13 & MODULE_SPECS.m14)
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSimulationEngine,
  computeBodeAnalysis,
  computeRgaAnalysis,
  DT,
} from '../../src/engine/simulationEngine';
import { MODULE_SPECS } from '../../src/curriculum/modulesData';
import { CircuitGraph } from '../../src/types/engine';

describe('Tier 4: Real-World Application Scenarios', () => {

  // ==========================================================================
  // SCENARIO A: Exothermic CSTR Thermal Runaway Prevention Gauntlet
  // ==========================================================================
  test('T4-SCN-A: Exothermic CSTR thermal runaway is averted by fast jacket PID cooling under feed temperature surge', () => {
    // Open-loop baseline: Without cooling water control (cooling water lost u_cw = 0), reaction exotherm drives runaway
    const openLoopGraph: CircuitGraph = {
      nodes: [
        { id: 'feed-temp', type: 'Step', title: 'Feed Temp Surge', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'T_feed', type: 'output' }], config: { initialValue: 350.0, stepValue: 355.0, stepTime: 0.5 } },
        { id: 'cw-flow', type: 'Constant', title: 'Zero Cooling', x: 0, y: 100, inputs: [], outputs: [{ id: 'out', name: 'u_cw', type: 'output' }], config: { value: 0.0 } },
        { id: 'cstr', type: 'CSTRPlant', title: 'CSTR', x: 200, y: 50, inputs: [{ id: 'in1', name: 'u_cw', type: 'input' }, { id: 'in2', name: 'T_feed', type: 'input' }], outputs: [{ id: 'out', name: 'T_r', type: 'output' }], config: { feedTemp: 350.0 } },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'cw-flow', fromPortId: 'out', toBlockId: 'cstr', toPortId: 'in1' },
        { id: 'w2', fromBlockId: 'feed-temp', fromPortId: 'out', toBlockId: 'cstr', toPortId: 'in2' },
      ],
    };

    const engOpenLoop = createSimulationEngine(openLoopGraph);
    engOpenLoop.runMultipleSteps(200); // 10s of simulation
    const runawayTemp = engOpenLoop.outputs['cstr'];

    // In open loop without cooling, Arrhenius exotherm drives temperature above trip ceiling (365 K) to max clamped 450 K
    assert.ok(runawayTemp > 365.0, `Open-loop CSTR should trip or run away (got ${runawayTemp} K)`);

    // Closed-loop CSTR control from Module 13 specification
    const closedLoopGraph: CircuitGraph = {
      nodes: [
        { id: 'sp', type: 'Constant', title: 'Target Temp', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { value: 350.0 } },
        { id: 'sum', type: 'Sum', title: 'Sum', x: 100, y: 0, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
        { id: 'ctrl', type: 'PID', title: 'Jacket PID', x: 200, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u_cw', type: 'output' }], config: { kc: 4.0, ti: 6.0, td: 0.5, bias: 40, antiWindup: true, action: 'direct', outputMin: 0, outputMax: 100 } },
        { id: 'cstr', type: 'CSTRPlant', title: 'CSTR', x: 400, y: 0, inputs: [{ id: 'in1', name: 'u_cw', type: 'input' }, { id: 'in2', name: 'T_feed', type: 'input' }], outputs: [{ id: 'out', name: 'T_r', type: 'output' }], config: { feedTemp: 350.0 } },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'sp', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in1' },
        { id: 'w2', fromBlockId: 'cstr', fromPortId: 'out', toBlockId: 'sum', toPortId: 'in2' },
        { id: 'w3', fromBlockId: 'sum', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
        { id: 'w4', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'cstr', toPortId: 'in1' },
      ],
    };

    const engClosedLoop = createSimulationEngine(closedLoopGraph);

    // Warm up to steady state
    engClosedLoop.runMultipleSteps(100);

    // Subject reactor to feed disturbance (feed temp rises to 358 K)
    for (let s = 0; s < 150; s++) {
      engClosedLoop.step({ cstr: 8.0 });
    }

    const controlledTemp = engClosedLoop.outputs['cstr'];

    // Controller must keep reactor strictly under the 365.0 K trip limit
    assert.ok(controlledTemp < 365.0, `Closed-loop PID must prevent thermal runaway (T_r < 365 K, got ${controlledTemp} K)`);
    assert.ok(controlledTemp > 340.0, `Reactor temperature must remain viable (got ${controlledTemp} K)`);
  });

  // ==========================================================================
  // SCENARIO B: Boiler Drum Steam Demand Swell Rejection (3-Element Control)
  // ==========================================================================
  test('T4-SCN-B: Boiler drum 3-element feedwater control maintains level between safe bounds during steam surge', () => {
    const graph: CircuitGraph = {
      nodes: [
        { id: 'sp-lvl', type: 'Constant', title: 'Target Level', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { value: 50.0 } },
        { id: 'steam-demand', type: 'Step', title: 'Steam Demand', x: 0, y: 150, inputs: [], outputs: [{ id: 'out', name: 'F_steam', type: 'output' }], config: { initialValue: 50.0, stepValue: 75.0, stepTime: 1.0 } },
        { id: 'sum-err', type: 'Sum', title: 'Level Error', x: 150, y: 0, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
        { id: 'ctrl-lvl', type: 'PI', title: 'Level Controller', x: 280, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u_fb', type: 'output' }], config: { kc: 2.0, ti: 8.0, bias: 0, antiWindup: true } },
        { id: 'ff-steam', type: 'Gain', title: 'Steam FF Gain', x: 280, y: 150, inputs: [{ id: 'in', name: 'd', type: 'input' }], outputs: [{ id: 'out', name: 'u_ff', type: 'output' }], config: { value: 1.0 } },
        { id: 'sum-fw', type: 'Sum', title: 'Feedwater Command', x: 420, y: 80, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '+', type: 'input' }], outputs: [{ id: 'out', name: 'F_fw', type: 'output' }], config: { signs: ['+', '+'] } },
        { id: 'boiler', type: 'BoilerDrumPlant', title: 'Boiler Drum', x: 560, y: 80, inputs: [{ id: 'in1', name: 'fw', type: 'input' }, { id: 'in2', name: 'steam', type: 'input' }], outputs: [{ id: 'out', name: 'lvl', type: 'output' }], config: {} },
      ],
      wires: [
        { id: 'w1', fromBlockId: 'sp-lvl', fromPortId: 'out', toBlockId: 'sum-err', toPortId: 'in1' },
        { id: 'w2', fromBlockId: 'boiler', fromPortId: 'out', toBlockId: 'sum-err', toPortId: 'in2' },
        { id: 'w3', fromBlockId: 'sum-err', fromPortId: 'out', toBlockId: 'ctrl-lvl', toPortId: 'in' },
        { id: 'w4', fromBlockId: 'steam-demand', fromPortId: 'out', toBlockId: 'ff-steam', toPortId: 'in' },
        { id: 'w5', fromBlockId: 'ctrl-lvl', fromPortId: 'out', toBlockId: 'sum-fw', toPortId: 'in1' },
        { id: 'w6', fromBlockId: 'ff-steam', fromPortId: 'out', toBlockId: 'sum-fw', toPortId: 'in2' },
        { id: 'w7', fromBlockId: 'sum-fw', fromPortId: 'out', toBlockId: 'boiler', toPortId: 'in1' },
        { id: 'w8', fromBlockId: 'steam-demand', fromPortId: 'out', toBlockId: 'boiler', toPortId: 'in2' },
      ],
    };

    const engine = createSimulationEngine(graph);

    // Initial steady state at 50%
    engine.runMultipleSteps(18); // t = 0.9s
    assert.equal(engine.outputs['boiler'], 50.0);

    // Run across steam surge transition and post-surge recovery (total 200 steps = 10s)
    let minObservedLevel = 100.0;
    let maxObservedLevel = 0.0;

    for (let step = 0; step < 182; step++) {
      engine.step();
      const currentLevel = engine.outputs['boiler'];
      if (currentLevel < minObservedLevel) minObservedLevel = currentLevel;
      if (currentLevel > maxObservedLevel) maxObservedLevel = currentLevel;
    }

    const intInventory = engine.states['boiler'].boilerIntLevel!;

    // 3-Element control prevents drum dryout (< 20%) and flood carryover (> 80%)
    assert.ok(minObservedLevel >= 25.0, `Boiler drum level must not drop below safe dryout limit 25%, min was ${minObservedLevel}`);
    assert.ok(maxObservedLevel <= 75.0, `Boiler drum level must not exceed safe flood limit 75%, max was ${maxObservedLevel}`);
    assert.ok(intInventory > 30.0, `Internal mass inventory must be safely sustained by feedwater feedforward, got ${intInventory}`);
  });

  // ==========================================================================
  // SCENARIO C: Shell-and-Tube Heat Exchanger Throughput Disturbance Rejection
  // ==========================================================================
  test('T4-SCN-C: Heat exchanger feedforward cancels process fluid throughput surge deflection', () => {
    // Process: HeatExchangerPlant where throughput F_proc steps from 50 to 80 L/s (+30 L/s surge)
    const buildExchangerEngine = (hasFeedforward: boolean) => {
      const wires = [
        { id: 'w1', fromBlockId: 'sp-temp', fromPortId: 'out', toBlockId: 'sum-err', toPortId: 'in1' },
        { id: 'w2', fromBlockId: 'hex', fromPortId: 'out', toBlockId: 'sum-err', toPortId: 'in2' },
        { id: 'w3', fromBlockId: 'sum-err', fromPortId: 'out', toBlockId: 'ctrl-steam', toPortId: 'in' },
        { id: 'w4', fromBlockId: 'ctrl-steam', fromPortId: 'out', toBlockId: 'sum-u', toPortId: 'in1' },
        { id: 'w5', fromBlockId: 'sum-u', fromPortId: 'out', toBlockId: 'hex', toPortId: 'in1' },
        { id: 'w6', fromBlockId: 'hex-flow', fromPortId: 'out', toBlockId: 'hex', toPortId: 'in2' },
      ];
      if (hasFeedforward) {
        wires.push({ id: 'w7', fromBlockId: 'flow-surge', fromPortId: 'out', toBlockId: 'ff-block', toPortId: 'in' });
        wires.push({ id: 'w8', fromBlockId: 'ff-block', fromPortId: 'out', toBlockId: 'sum-u', toPortId: 'in2' });
      }

      const graph: CircuitGraph = {
        nodes: [
          { id: 'sp-temp', type: 'Constant', title: 'Target Temp', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp', type: 'output' }], config: { value: 65.0 } },
          { id: 'hex-flow', type: 'Step', title: 'Absolute Flow', x: 0, y: 150, inputs: [], outputs: [{ id: 'out', name: 'F_proc', type: 'output' }], config: { initialValue: 50.0, stepValue: 80.0, stepTime: 1.0 } },
          { id: 'flow-surge', type: 'Step', title: 'Flow Surge Delta', x: 0, y: 250, inputs: [], outputs: [{ id: 'out', name: 'dF', type: 'output' }], config: { initialValue: 0.0, stepValue: 30.0, stepTime: 1.0 } },
          { id: 'sum-err', type: 'Sum', title: 'Temp Error', x: 150, y: 0, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '-', type: 'input' }], outputs: [{ id: 'out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'ctrl-steam', type: 'PI', title: 'Steam PID', x: 280, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' }], outputs: [{ id: 'out', name: 'u_fb', type: 'output' }], config: { kc: 3.0, ti: 4.0, bias: 33.3, antiWindup: true } },
          { id: 'ff-block', type: 'FeedForward', title: 'Flow FF', x: 280, y: 250, inputs: [{ id: 'in', name: 'flow', type: 'input' }], outputs: [{ id: 'out', name: 'u_ff', type: 'output' }], config: { ffGain: 0.67, tauLead: 0.0, tauLag: 0.05 } },
          { id: 'sum-u', type: 'Sum', title: 'Combined Steam', x: 420, y: 80, inputs: [{ id: 'in1', name: '+', type: 'input' }, { id: 'in2', name: '+', type: 'input' }], outputs: [{ id: 'out', name: 'u_steam', type: 'output' }], config: { signs: ['+', '+'] } },
          { id: 'hex', type: 'HeatExchangerPlant', title: 'HEX', x: 560, y: 80, inputs: [{ id: 'in1', name: 'steam', type: 'input' }, { id: 'in2', name: 'flow', type: 'input' }], outputs: [{ id: 'out', name: 'Tout', type: 'output' }], config: { processFluidFlow: 50.0 } },
        ],
        wires,
      };
      return createSimulationEngine(graph);
    };

    const engFBOnly = buildExchangerEngine(false);
    const engFF = buildExchangerEngine(true);

    // Run for 160 steps (8.0s)
    engFBOnly.runMultipleSteps(160);
    engFF.runMultipleSteps(160);

    const iaeFB = engFBOnly.metrics.iae;
    const iaeFF = engFF.metrics.iae;

    // Feedforward cuts temperature deviation IAE significantly compared to feedback-only
    assert.ok(iaeFF < iaeFB, `Feedforward IAE (${iaeFF}) must improve over feedback-only IAE (${iaeFB})`);
  });

  // ==========================================================================
  // SCENARIO D: Wood-Berry Distillation Column 2x2 Decoupled Purity Regulation
  // ==========================================================================
  test('T4-SCN-D: Multivariable decoupling decouples distillate and bottoms purities in Wood-Berry column', () => {
    const makeColumnLoop = (decoupled: boolean) => {
      const graph: CircuitGraph = {
        nodes: [
          { id: 'sp-xD', type: 'Step', title: 'Distillate SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'sp1', type: 'output' }], config: { initialValue: 0, stepValue: 30, stepTime: 0.5 } },
          { id: 'sp-xB', type: 'Constant', title: 'Bottoms SP', x: 0, y: 150, inputs: [], outputs: [{ id: 'out', name: 'sp2', type: 'output' }], config: { value: 0 } },
          { id: 'sum-1', type: 'Sum', title: 'Sum 1', x: 120, y: 0, inputs: [{ id: 'in1', name: '+' }, { id: 'in2', name: '-' }], outputs: [{ id: 'out', name: 'e1', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'sum-2', type: 'Sum', title: 'Sum 2', x: 120, y: 150, inputs: [{ id: 'in1', name: '+' }, { id: 'in2', name: '-' }], outputs: [{ id: 'out', name: 'e2', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'ctrl-L', type: 'PI', title: 'Reflux PI', x: 240, y: 0, inputs: [{ id: 'in', name: 'e1', type: 'input' }], outputs: [{ id: 'out', name: 'u1', type: 'output' }], config: { kc: 1.5, ti: 10.0, bias: 0 } },
          { id: 'ctrl-V', type: 'PI', title: 'Boilup PI', x: 240, y: 150, inputs: [{ id: 'in', name: 'e2', type: 'input' }], outputs: [{ id: 'out', name: 'u2', type: 'output' }], config: { kc: 1.5, ti: 10.0, bias: 0 } },
          { id: 'mimo-col', type: 'MIMOPlant', title: 'Wood-Berry Column', x: 420, y: 80, inputs: [{ id: 'in1', name: 'u1', type: 'input' }, { id: 'in2', name: 'u2', type: 'input' }], outputs: [{ id: 'out', name: 'y1', type: 'output' }], config: { k11: 12.8, k12: -18.9, k21: 6.6, k22: -19.4, decouplerEnabled: decoupled } },
        ],
        wires: [
          { id: 'w1', fromBlockId: 'sp-xD', fromPortId: 'out', toBlockId: 'sum-1', toPortId: 'in1' },
          { id: 'w2', fromBlockId: 'sp-xB', fromPortId: 'out', toBlockId: 'sum-2', toPortId: 'in1' },
          { id: 'w3', fromBlockId: 'sum-1', fromPortId: 'out', toBlockId: 'ctrl-L', toPortId: 'in' },
          { id: 'w4', fromBlockId: 'sum-2', fromPortId: 'out', toBlockId: 'ctrl-V', toPortId: 'in' },
          { id: 'w5', fromBlockId: 'ctrl-L', fromPortId: 'out', toBlockId: 'mimo-col', toPortId: 'in1' },
          { id: 'w6', fromBlockId: 'ctrl-V', fromPortId: 'out', toBlockId: 'mimo-col', toPortId: 'in2' },
          { id: 'w7', fromBlockId: 'mimo-col', fromPortId: 'out', toBlockId: 'sum-1', toPortId: 'in2' },
        ],
      };
      return createSimulationEngine(graph);
    };

    const engCoupled = makeColumnLoop(false);
    const engDecoupled = makeColumnLoop(true);

    engCoupled.runMultipleSteps(100);
    engDecoupled.runMultipleSteps(100);

    const crossTalkCoupled = Math.abs(engCoupled.states['mimo-col'].y2 ?? 0);
    const crossTalkDecoupled = Math.abs(engDecoupled.states['mimo-col'].y2 ?? 0);

    assert.ok(crossTalkDecoupled < crossTalkCoupled, `Decoupler must reduce cross-talk deflection (Coupled: ${crossTalkCoupled}, Decoupled: ${crossTalkDecoupled})`);
  });

  // ==========================================================================
  // SCENARIO E: Capstone Unseen Plant 2-Minute Stress Commissioning Run
  // ==========================================================================
  test('T4-SCN-E: Capstone unknown plant commissioning run satisfies automated grading rubric >= 70%', () => {
    const capstoneCircuit = MODULE_SPECS.m14.play.defaultCircuit;
    const engine = createSimulationEngine(capstoneCircuit);

    // Phase 1: Verify Closed Loop Response under nominal setpoint (t = 0 to 10s, 200 steps)
    engine.runMultipleSteps(200);
    const initialPV = engine.outputs['plant-node'];
    const initialSP = engine.outputs['sp-node'];
    assert.ok(initialPV > 45.0 && initialPV < 75.0, `Plant should operate near setpoint 60, got ${initialPV}`);

    // Phase 2: Inject Severe Load Disturbance (-25% wave at t = 10s)
    // Run for 200 steps under adverse disturbance
    for (let s = 0; s < 200; s++) {
      engine.step({ 'plant-node': -15 });
    }

    const metrics = engine.metrics;
    const finalPV = engine.outputs['plant-node'];

    // ------------------------------------------------------------------------
    // Automated Capstone Exam Grading Rubric:
    // Score = 40% Stability + 35% IAE Performance + 25% Actuator Health
    // ------------------------------------------------------------------------

    // 1. Stability Component (40%): No runaway, PV stays bounded within [20, 100]
    let stabilityScore = 0;
    const isBounded = finalPV >= 20.0 && finalPV <= 100.0 && !isNaN(finalPV);
    if (isBounded) {
      stabilityScore = 40.0;
    } else {
      stabilityScore = 0.0;
    }

    // 2. IAE Performance Component (35%): Controlled cumulative error
    let iaeScore = 0;
    if (metrics.iae < 400) {
      iaeScore = 35.0;
    } else if (metrics.iae < 800) {
      iaeScore = 35.0 * (1 - (metrics.iae - 400) / 400);
    } else {
      iaeScore = 5.0;
    }

    // 3. Actuator Health Component (25%): Valve Chatter & Saturation
    let actuatorScore = 0;
    if (metrics.valveTravelTotal < 400) {
      actuatorScore = 25.0;
    } else if (metrics.valveTravelTotal < 800) {
      actuatorScore = 25.0 * (1 - (metrics.valveTravelTotal - 400) / 400);
    } else {
      actuatorScore = 5.0;
    }

    const totalCapstoneScore = stabilityScore + iaeScore + actuatorScore;

    assert.ok(stabilityScore === 40.0, 'Capstone plant must maintain bounded stability throughout stress run');
    assert.ok(totalCapstoneScore >= 70.0, `Capstone overall score (${totalCapstoneScore.toFixed(1)}%) must achieve >= 70% passing threshold`);
  });

});
