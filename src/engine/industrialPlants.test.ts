import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationEngine, DT } from './simulationEngine';
import { CircuitGraph } from '../types/engine';

test('CSTRPlant responds to cooling valve and exhibits thermal balance', () => {
  const cstrGraph: CircuitGraph = {
    nodes: [
      {
        id: 'u-val',
        type: 'Constant',
        title: 'Cooling Valve',
        x: 0,
        y: 0,
        inputs: [],
        outputs: [{ id: 'u-out', name: 'u', type: 'output' }],
        config: { value: 60 }, // 60% cooling
      },
      {
        id: 'cstr-1',
        type: 'CSTRPlant',
        title: 'CSTR Plant',
        x: 100,
        y: 0,
        inputs: [
          { id: 'c-u', name: 'u_cw', type: 'input' },
          { id: 'c-dist', name: 'T_feed', type: 'input' },
        ],
        outputs: [{ id: 'c-out', name: 'Tr', type: 'output' }],
        config: { feedTemp: 350.0 },
      },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'u-val', fromPortId: 'u-out', toBlockId: 'cstr-1', toPortId: 'c-u' },
    ],
  };

  const engine = createSimulationEngine(cstrGraph);
  const res = engine.runMultipleSteps(50);
  const finalTr = res.blockOutputs['cstr-1'];
  assert.ok(finalTr >= 300 && finalTr <= 380, `Reactor temp should stay bounded in normal range, got ${finalTr}`);
});

test('BoilerDrumPlant exhibits inverse response swell dynamic', () => {
  const boilerGraph: CircuitGraph = {
    nodes: [
      {
        id: 'fw-val',
        type: 'Constant',
        title: 'Feedwater',
        x: 0,
        y: 0,
        inputs: [],
        outputs: [{ id: 'fw-out', name: 'fw', type: 'output' }],
        config: { value: 50 },
      },
      {
        id: 'steam-demand',
        type: 'Step',
        title: 'Steam Demand',
        x: 0,
        y: 100,
        inputs: [],
        outputs: [{ id: 's-out', name: 'steam', type: 'output' }],
        config: { initialValue: 50, stepValue: 80, stepTime: 0.1 },
      },
      {
        id: 'boiler-1',
        type: 'BoilerDrumPlant',
        title: 'Boiler Drum',
        x: 150,
        y: 50,
        inputs: [
          { id: 'b-fw', name: 'fw', type: 'input' },
          { id: 'b-steam', name: 'steam', type: 'input' },
        ],
        outputs: [{ id: 'b-out', name: 'level', type: 'output' }],
        config: { inverseTauZ: 2.5 },
      },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'fw-val', fromPortId: 'fw-out', toBlockId: 'boiler-1', toPortId: 'b-fw' },
      { id: 'w2', fromBlockId: 'steam-demand', fromPortId: 's-out', toBlockId: 'boiler-1', toPortId: 'b-steam' },
    ],
  };

  const engine = createSimulationEngine(boilerGraph);
  // Initial level at t=0
  assert.equal(engine.outputs['boiler-1'], 50);

  // Advance right past step: swell effect causes temporary rise
  engine.runMultipleSteps(10);
  const swellLevel = engine.outputs['boiler-1'];
  assert.ok(swellLevel > 50, `Boiler level should exhibit positive swell, got ${swellLevel}`);
});
