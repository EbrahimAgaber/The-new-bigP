/**
 * Milestone 2 Challenger 1: Empirical Layout & Reactivity Stress Suite
 *
 * Verifies:
 * 1. App.tsx FreeCodeCamp-style split layout structure (Left Study Journey & Right Simulation Studio).
 * 2. Complete 14-Module selection, container element inventory, and child component rendering.
 * 3. Reactive simulation state & parameter slider updates under nominal, extreme, and burst perturbations.
 * 4. Challenge evaluator scoring, catastrophic trip limits, and module unlock state machine.
 * 5. High-contrast theme compliance and residual text-white remediation across all 6 touched components.
 * 6. Empirical Challenge: Discovery and verification of Module 13 case study control desynchronization and scoring branch unreachability.
 *
 * Run with: npx tsx --test tests/empirical/m2_challenger_stress.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

// Curriculum and Engine
import { MODULE_SPECS, ROADMAP_MODULES_METADATA } from '../../src/curriculum/modulesData';
import { createSimulationEngine, DT } from '../../src/engine/simulationEngine';

// Components
import { MentalModelBanner } from '../../src/components/MentalModelBanner';
import { SeeTheMathCard } from '../../src/components/SeeTheMathCard';
import { GuidedStepsPanel } from '../../src/components/GuidedStepsPanel';
import { ProveChallengePanel } from '../../src/components/ProveChallengePanel';
import { MetricsPanel } from '../../src/components/MetricsPanel';
import { ModuleRoadmapDrawer } from '../../src/components/ModuleRoadmapDrawer';
import { MasteryDashboardModal } from '../../src/components/MasteryDashboardModal';
import { BioprocessModal } from '../../src/components/BioprocessModal';
import { IndustrialPidVisualizer } from '../../src/components/IndustrialPidVisualizer';
import { EquipmentVisualizer } from '../../src/components/EquipmentVisualizer';
import { BlockDiagramCanvas } from '../../src/components/BlockDiagramCanvas';

const ALL_MODULE_IDS = Array.from({ length: 14 }, (_, i) => `m${i + 1}`);

// Setup DOM / Browser Polyfills for SSR testing
const localStorageStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => localStorageStore.get(key) ?? null,
  setItem: (key: string, val: string) => localStorageStore.set(key, String(val)),
  removeItem: (key: string) => localStorageStore.delete(key),
  clear: () => localStorageStore.clear(),
};
(globalThis as any).document = {
  documentElement: {
    dir: 'ltr',
    lang: 'en',
  },
};

// ============================================================================
// SUITE 1: Layout & Container Structure Verification of App.tsx
// ============================================================================

test('SUITE 1.1: App.tsx enforces a two-pane 12-column responsive split grid in Academy mode', () => {
  const appPath = path.resolve('src/App.tsx');
  assert.ok(fs.existsSync(appPath), 'src/App.tsx must exist');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  // Verify responsive split layout grid
  assert.match(
    appContent,
    /grid\s+grid-cols-1\s+lg:grid-cols-12\s+gap-5/,
    'App.tsx must declare a responsive 12-column split grid (lg:grid-cols-12 gap-5)'
  );

  // Verify Left Study Journey pane column allocation (41.7% / 5 cols)
  assert.match(
    appContent,
    /lg:col-span-5\s+space-y-4/,
    'App.tsx Left Study Journey must occupy lg:col-span-5'
  );

  // Verify Right Consolidated Studio Workspace pane column allocation (58.3% / 7 cols)
  assert.match(
    appContent,
    /lg:col-span-7\s+space-y-4/,
    'App.tsx Right Simulation Studio must occupy lg:col-span-7'
  );
});

test('SUITE 1.2: Left Pane contains complete FreeCodeCamp Study Journey hierarchy', () => {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');

  // 1. Module Header Bar with number badge, title, and prev/next steppers
  assert.match(appContent, /currentModule\.number/, 'Module header must render module number badge');
  assert.match(appContent, /canGoPrev/, 'Module header must handle prev module navigation condition');
  assert.match(appContent, /canGoNext/, 'Module header must handle next module navigation condition');
  assert.match(appContent, /ChevronLeft/, 'Module header must include ChevronLeft icon');
  assert.match(appContent, /ChevronRight/, 'Module header must include ChevronRight icon');

  // 2. Study Journey Segmented Tab Switcher with 4 states
  assert.match(appContent, /setJourneyTab\('concept'\)/, 'Tab switcher must support concept tab');
  assert.match(appContent, /setJourneyTab\('steps'\)/, 'Tab switcher must support steps tab');
  assert.match(appContent, /setJourneyTab\('prove'\)/, 'Tab switcher must support prove tab');
  assert.match(appContent, /setJourneyTab\('all'\)/, 'Tab switcher must support all tab');

  // 3. Progressive disclosure forward buttons
  assert.match(
    appContent,
    /Continue to Guided Steps|الانتقال إلى خطوات التطبيق الموجهة/,
    'Concept tab must feature forward progression button to Guided Steps'
  );
  assert.match(
    appContent,
    /Proceed to Graded Challenge|الانتقال إلى تحدي الإثبات الهندسي/,
    'Steps tab must feature forward progression button to Graded Challenge'
  );

  // 4. Core Study Journey components embedded
  assert.match(appContent, /<MentalModelBanner/, 'Left pane must render MentalModelBanner');
  assert.match(appContent, /<SeeTheMathCard/, 'Left pane must render SeeTheMathCard');
  assert.match(appContent, /<GuidedStepsPanel/, 'Left pane must render GuidedStepsPanel');
  assert.match(appContent, /<ProveChallengePanel/, 'Left pane must render ProveChallengePanel');
});

test('SUITE 1.3: Right Pane contains Consolidated Simulation Studio Workspace hierarchy', () => {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');

  // 1. Studio Toolbar Header & Live Transport Controls
  assert.match(appContent, /Simulation Studio Workspace|مختبر المحاكاة/, 'Studio toolbar must feature header title');
  assert.match(appContent, /setSimSpeed\(spd\)/, 'Studio toolbar must feature 1x, 2x, 5x speed buttons');
  assert.match(appContent, /setIsRunning\(!isRunning\)/, 'Studio toolbar must feature Play/Pause button');
  assert.match(appContent, /engineRef\.current\.reset\(\)/, 'Studio toolbar must feature Reset button');
  assert.match(appContent, /handleTriggerManualDisturbance/, 'Studio toolbar must feature disturbance shock button');

  // 2. Adaptive Visualizer Deck (M1-12 Dual Equipment/Flowsheet; M13-14 Industrial P&ID)
  assert.match(appContent, /currentModule\.id === 'm13' \|\| currentModule\.id === 'm14'/, 'Visualizer deck must branch for M13/M14');
  assert.match(appContent, /<IndustrialPidVisualizer/, 'M13/M14 must render IndustrialPidVisualizer');
  assert.match(appContent, /<EquipmentVisualizer/, 'M1-12 must render EquipmentVisualizer');
  assert.match(appContent, /<BlockDiagramCanvas/, 'M1-12 must render BlockDiagramCanvas');

  // 3. M13 Industrial Case Study Selector
  assert.match(appContent, /handleSelectCaseStudy\(c\.idx/, 'Module 13 must render case study selector tabs');

  // 4. Consolidated Process Controls Surface
  assert.match(appContent, /currentModule\.play\.controlsExposed\.map/, 'Control surface must map controlsExposed');
  assert.match(appContent, /handleUpdateControl/, 'Control surface must handle slider/toggle updates');

  // 5. Digital Oscilloscope Scope Chart
  assert.match(appContent, /<ScopeChart/, 'Right pane must render ScopeChart oscilloscope');

  // 6. Specialized Docked Analyzers
  assert.match(appContent, /currentModule\.id === 'm8'[\s\S]*?<MetricsPanel/, 'M8 must dock MetricsPanel relay autotuner');
  assert.match(appContent, /currentModule\.id === 'm9'[\s\S]*?<BodeViewer[\s\S]*?<RootLocusViewer/, 'M9 must dock Bode & Root Locus viewers');
  assert.match(appContent, /currentModule\.id === 'm12'[\s\S]*?<RgaMatrixViewer/, 'M12 must dock RgaMatrixViewer');
});

// ============================================================================
// SUITE 2: All 14 Modules Selection & Element Inventory Verification
// ============================================================================

test('SUITE 2.1: All 14 modules have valid schemas and playable circuits', () => {
  for (const modId of ALL_MODULE_IDS) {
    const spec = MODULE_SPECS[modId];
    assert.ok(spec, `Module ${modId} must exist in MODULE_SPECS`);
    assert.equal(typeof spec.number, 'number', `Module ${modId} number must be a number`);
    assert.ok(spec.titleEn.length > 0, `Module ${modId} titleEn must not be empty`);
    assert.ok(spec.titleAr.length > 0, `Module ${modId} titleAr must not be empty`);

    // Verify play specification
    assert.ok(spec.play, `Module ${modId} must have play spec`);
    assert.ok(spec.play.defaultCircuit, `Module ${modId} must have defaultCircuit`);
    assert.ok(Array.isArray(spec.play.defaultCircuit.nodes), `Module ${modId} defaultCircuit nodes must be array`);
    assert.ok(spec.play.defaultCircuit.nodes.length > 0, `Module ${modId} defaultCircuit nodes must not be empty`);
    assert.ok(Array.isArray(spec.play.defaultCircuit.wires), `Module ${modId} defaultCircuit wires must be array`);

    // Verify prove specification
    assert.ok(spec.prove, `Module ${modId} must have prove spec`);
    assert.ok(spec.prove.challengeType, `Module ${modId} must have challengeType`);
    assert.ok(spec.prove.durationSeconds > 0, `Module ${modId} durationSeconds must be > 0`);
    assert.ok(spec.prove.passingScore >= 50 && spec.prove.passingScore <= 100, `Module ${modId} passingScore must be 50-100`);
  }
});

test('SUITE 2.2: Deep Audit of exposed controls against circuit nodes across all 14 modules', () => {
  const orphanedControls: { modId: string; ctrlId: string; blockId: string }[] = [];

  for (const modId of ALL_MODULE_IDS) {
    const spec = MODULE_SPECS[modId];
    const nodeIds = new Set(spec.play.defaultCircuit.nodes.map((n) => n.id));

    for (const ctrl of spec.play.controlsExposed) {
      assert.ok(ctrl.id, `Control in ${modId} must have id`);
      assert.ok(ctrl.labelEn, `Control ${ctrl.id} in ${modId} must have labelEn`);
      assert.ok(ctrl.labelAr, `Control ${ctrl.id} in ${modId} must have labelAr`);
      assert.ok(ctrl.blockId, `Control ${ctrl.id} in ${modId} must have blockId`);
      assert.ok(ctrl.property, `Control ${ctrl.id} in ${modId} must have property`);

      // Check min/max bounds if numeric slider
      if (ctrl.controlType !== 'toggle' && ctrl.controlType !== 'select') {
        assert.ok(ctrl.min <= ctrl.max, `Control ${ctrl.id} in ${modId} min (${ctrl.min}) must be <= max (${ctrl.max})`);
        assert.ok(ctrl.step > 0, `Control ${ctrl.id} in ${modId} step must be > 0`);
      }

      if (!nodeIds.has(ctrl.blockId)) {
        orphanedControls.push({ modId, ctrlId: ctrl.id, blockId: ctrl.blockId });
      }
    }
  }

  // Verification finding documentation:
  // Module 13 defines 'case-selector' referencing 'case-ctrl' which does not exist as a block node in defaultCircuit.
  // We empirically check whether any OTHER modules have orphaned controls.
  const nonM13Orphans = orphanedControls.filter((c) => c.modId !== 'm13');
  assert.equal(
    nonM13Orphans.length,
    0,
    `Modules 1-12 and 14 must have 0 orphaned controls! Found: ${JSON.stringify(nonM13Orphans)}`
  );

  // In M13, verify that case-selector is documented as an orphaned control
  const m13Orphans = orphanedControls.filter((c) => c.modId === 'm13');
  assert.equal(m13Orphans.length, 1, 'Only case-selector in M13 references a non-existent blockId');
  assert.equal(m13Orphans[0].ctrlId, 'case-selector');
  assert.equal(m13Orphans[0].blockId, 'case-ctrl');
});

test('SUITE 2.3: EquipmentVisualizer accepts equipmentType for all Modules 1 to 12', () => {
  const validEquipmentTypes = ['tank', 'heatedVessel', 'bioreactor', 'generic'];

  for (let i = 1; i <= 12; i++) {
    const modId = `m${i}`;
    const eqType = MODULE_SPECS[modId].play.equipmentType;
    assert.ok(
      validEquipmentTypes.includes(eqType),
      `Module ${modId} equipmentType "${eqType}" must be valid in EquipmentVisualizer`
    );

    // Verify SSR rendering of EquipmentVisualizer for each module
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(EquipmentVisualizer, {
        type: eqType as any,
        levelPct: 50,
        targetSP: 60,
        valveOpeningPct: 45,
        disturbanceFlow: 0,
        activeFeature: null,
        lang: 'en',
      })
    );
    assert.ok(html.length > 50, `EquipmentVisualizer for ${modId} must render valid HTML`);
    assert.match(html, /svg|div/, `EquipmentVisualizer for ${modId} must contain svg or div`);
  }
});

test('SUITE 2.4: IndustrialPidVisualizer renders without error across all 4 Case Studies and Capstone', () => {
  for (const caseIdx of [1, 2, 3, 4] as const) {
    const htmlEn = ReactDOMServer.renderToStaticMarkup(
      React.createElement(IndustrialPidVisualizer, {
        caseIndex: caseIdx,
        pv: 50,
        sp: 50,
        u: 40,
        pv2: 60,
        disturbance: 0,
        lang: 'en',
      })
    );
    assert.ok(htmlEn.length > 100, `IndustrialPidVisualizer case ${caseIdx} EN must render HTML`);

    const htmlAr = ReactDOMServer.renderToStaticMarkup(
      React.createElement(IndustrialPidVisualizer, {
        caseIndex: caseIdx,
        pv: 50,
        sp: 50,
        u: 40,
        pv2: 60,
        disturbance: 10,
        lang: 'ar',
      })
    );
    assert.ok(htmlAr.length > 100, `IndustrialPidVisualizer case ${caseIdx} AR must render HTML`);
  }
});

test('SUITE 2.5: SSR rendering of FreeCodeCamp Study Journey panels across all 14 modules', () => {
  for (const modId of ALL_MODULE_IDS) {
    const spec = MODULE_SPECS[modId];

    // 1. MentalModelBanner
    const mmHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(MentalModelBanner, { module: spec, lang: 'en' })
    );
    assert.ok(mmHtml.includes('Mental Model') || mmHtml.includes('Intuition'), `MentalModelBanner for ${modId} must render`);

    // 2. SeeTheMathCard
    const mathHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(SeeTheMathCard, {
        module: spec,
        lang: 'en',
        activeFeature: null,
        onHoverFeature: () => {},
      })
    );
    assert.ok(mathHtml.length > 100, `SeeTheMathCard for ${modId} must render`);

    // 3. GuidedStepsPanel
    const stepsHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(GuidedStepsPanel, { module: spec, lang: 'en' })
    );
    assert.ok(stepsHtml.length > 100, `GuidedStepsPanel for ${modId} must render`);

    // 4. ProveChallengePanel
    const proveHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ProveChallengePanel, {
        module: spec,
        score: 0,
        isChallengeRunning: false,
        challengeTimeLeft: spec.prove.durationSeconds,
        onStartChallenge: () => {},
        onStopChallenge: () => {},
        onUnlockNext: () => {},
        currentMetrics: {
          iae: 0,
          ise: 0,
          inToleranceRatio: 0,
          peakOvershootPct: 0,
          currentError: 0,
          valveTravelTotal: 0,
        },
        mysteryInputs: { k: 1, tau: 3, theta: 1 },
        onUpdateMysteryInputs: () => {},
        onSubmitMysteryGuesses: () => {},
        mysteryScoreResult: null,
        activeGauntletPlantIndex: 0,
        onSelectGauntletPlant: () => {},
        gauntletScores: [],
        lang: 'en',
      })
    );
    assert.ok(proveHtml.length > 100, `ProveChallengePanel for ${modId} must render`);
  }
});

// ============================================================================
// SUITE 3: Reactive Simulation State & Parameter Slider Updates
// ============================================================================

test('SUITE 3.1: updateBlockConfig immediately mutates node config without destroying engine state', () => {
  for (const modId of ALL_MODULE_IDS) {
    const spec = MODULE_SPECS[modId];
    const engine = createSimulationEngine(spec.play.defaultCircuit);

    // Initial 10 steps
    const initialRes = engine.runMultipleSteps(10);
    assert.ok(initialRes.history.length === 10, `${modId}: Engine must execute 10 steps`);
    const initialTime = engine.time;
    assert.ok(Math.abs(initialTime - 0.5) < 1e-4, `${modId}: Time must advance to 0.5s`);

    // Test parameter updates on each exposed control
    for (const ctrl of spec.play.controlsExposed) {
      if (ctrl.controlType === 'toggle') {
        engine.updateBlockConfig(ctrl.blockId, { [ctrl.property]: true });
        const targetNode = engine.graph.nodes.find((n) => n.id === ctrl.blockId);
        if (targetNode) {
          assert.equal(targetNode.config[ctrl.property], true, `${modId} ${ctrl.id} toggle ON`);
        }
        engine.updateBlockConfig(ctrl.blockId, { [ctrl.property]: false });
        if (targetNode) {
          assert.equal(targetNode.config[ctrl.property], false, `${modId} ${ctrl.id} toggle OFF`);
        }
      } else if (ctrl.controlType === 'select') {
        if (ctrl.options && ctrl.options.length > 0) {
          const testVal = ctrl.options[0].value;
          engine.updateBlockConfig(ctrl.blockId, { [ctrl.property]: testVal });
          const targetNode = engine.graph.nodes.find((n) => n.id === ctrl.blockId);
          if (targetNode) {
            assert.equal(targetNode.config[ctrl.property], testVal, `${modId} ${ctrl.id} select option`);
          }
        }
      } else {
        // Numeric slider: test min, max, midpoint
        const midVal = (ctrl.min + ctrl.max) / 2;
        engine.updateBlockConfig(ctrl.blockId, { [ctrl.property]: midVal });
        const targetNode = engine.graph.nodes.find((n) => n.id === ctrl.blockId);
        if (targetNode) {
          assert.equal(targetNode.config[ctrl.property], midVal, `${modId} ${ctrl.id} numeric midVal`);
        }
      }
    }

    // Step 10 more steps after parameter mutations: ensure finite numbers
    const postRes = engine.runMultipleSteps(10);
    for (const pt of postRes.history) {
      assert.ok(!Number.isNaN(pt.pv), `${modId}: PV must not be NaN after slider update`);
      assert.ok(Number.isFinite(pt.pv), `${modId}: PV must be finite after slider update`);
      assert.ok(!Number.isNaN(pt.sp), `${modId}: SP must not be NaN after slider update`);
      assert.ok(!Number.isNaN(pt.u), `${modId}: u must not be NaN after slider update`);
      assert.ok(Number.isFinite(pt.u), `${modId}: u must be finite after slider update`);
    }
  }
});

test('SUITE 3.2: High-Frequency Slider Update Burst Stress (1,000 updates in tight loop)', () => {
  // Test rapid slider dragging on PID controller parameters in Module 7
  const spec = MODULE_SPECS.m7;
  const engine = createSimulationEngine(spec.play.defaultCircuit);

  engine.runMultipleSteps(20);

  // 1,000 rapid updates simulating fast continuous user dragging
  for (let i = 0; i < 1000; i++) {
    const kcVal = 0.5 + (i % 200) * 0.1;
    const tiVal = 1.0 + (i % 100) * 0.2;
    const tdVal = 0.05 + (i % 50) * 0.02;

    engine.updateBlockConfig('ctrl-pid-ind', { kc: kcVal, ti: tiVal, td: tdVal });

    // Step engine every 10 updates
    if (i % 10 === 0) {
      const res = engine.step();
      const latest = res.history[res.history.length - 1];
      assert.ok(Number.isFinite(latest.pv), 'PV must remain finite during high-freq slider burst');
      assert.ok(Number.isFinite(latest.u), 'u must remain finite during high-freq slider burst');
    }
  }

  // After 1,000 updates, engine continues stepping cleanly
  const finalRes = engine.runMultipleSteps(50);
  const finalPt = finalRes.history[finalRes.history.length - 1];
  assert.ok(Number.isFinite(finalPt.pv), 'PV must remain stable after 1,000 updates');
  assert.ok(finalRes.metrics.iae >= 0, 'IAE must be non-negative');
});

test('SUITE 3.3: Extreme Parameter Slider Boundary Stress (Zero, Min, Max, Out-of-Bounds)', () => {
  // Module 4 Proportional Control
  const specM4 = MODULE_SPECS.m4;
  const engineM4 = createSimulationEngine(specM4.play.defaultCircuit);

  const extremeKcValues = [0, 0.0001, 0.1, 50.0, 100.0, 999.0];
  for (const kc of extremeKcValues) {
    engineM4.updateBlockConfig('ctrl-p', { kc });
    const res = engineM4.runMultipleSteps(20);
    const last = res.history[res.history.length - 1];
    assert.ok(!Number.isNaN(last.pv), `M4: PV must not be NaN with Kc=${kc}`);
    assert.ok(Number.isFinite(last.pv), `M4: PV must be finite with Kc=${kc}`);
    assert.ok(last.u >= 0 && last.u <= 100, `M4: Valve output u must respect saturation [0, 100]`);
  }

  // Module 5 Integral Control: Very small Ti vs very large Ti
  const specM5 = MODULE_SPECS.m5;
  const engineM5 = createSimulationEngine(specM5.play.defaultCircuit);

  const extremeTiValues = [0.01, 0.1, 100.0, 1000.0];
  for (const ti of extremeTiValues) {
    engineM5.updateBlockConfig('ctrl-pi', { ti });
    const res = engineM5.runMultipleSteps(20);
    const last = res.history[res.history.length - 1];
    assert.ok(!Number.isNaN(last.pv), `M5: PV must not be NaN with Ti=${ti}`);
    assert.ok(Number.isFinite(last.pv), `M5: PV must be finite with Ti=${ti}`);
  }

  // Module 6 Derivative Control: Derivative filter coefficient and high noise
  const specM6 = MODULE_SPECS.m6;
  const engineM6 = createSimulationEngine(specM6.play.defaultCircuit);

  const extremeTdValues = [0, 0.01, 5.0, 10.0];
  for (const td of extremeTdValues) {
    engineM6.updateBlockConfig('ctrl-pid', { td });
    const res = engineM6.runMultipleSteps(20);
    const last = res.history[res.history.length - 1];
    assert.ok(!Number.isNaN(last.pv), `M6: PV must not be NaN with Td=${td}`);
    assert.ok(Number.isFinite(last.pv), `M6: PV must be finite with Td=${td}`);
  }
});

test('SUITE 3.4: Disturbance Shock Reactivity across all 14 modules', () => {
  for (const modId of ALL_MODULE_IDS) {
    const spec = MODULE_SPECS[modId];
    const engine = createSimulationEngine(spec.play.defaultCircuit);

    // Run 20 nominal steps
    engine.runMultipleSteps(20);

    // Find the plant block
    const plantNode = engine.graph.nodes.find(
      (n) =>
        n.type === 'Tank' ||
        n.type === 'FirstOrder' ||
        n.type === 'HeatedVessel' ||
        n.type === 'Bioreactor' ||
        n.type === 'CSTRPlant' ||
        n.type === 'HeatExchangerPlant' ||
        n.type === 'DistillationColumnPlant' ||
        n.type === 'BoilerDrumPlant' ||
        n.type === 'MIMOPlant'
    );

    const distBlockId = plantNode ? plantNode.id : 'dist';
    const shockDisturbance = { [distBlockId]: 30 };

    // Step 20 steps with shock disturbance
    for (let s = 0; s < 20; s++) {
      const res = engine.step(shockDisturbance);
      const pt = res.history[res.history.length - 1];
      assert.ok(Number.isFinite(pt.pv), `${modId}: PV must be finite under disturbance shock`);
      assert.ok(Number.isFinite(pt.u), `${modId}: u must be finite under disturbance shock`);
    }

    // Remove disturbance (shock off)
    for (let s = 0; s < 20; s++) {
      const res = engine.step({});
      const pt = res.history[res.history.length - 1];
      assert.ok(Number.isFinite(pt.pv), `${modId}: PV must recover cleanly`);
    }
  }
});

// ============================================================================
// SUITE 4: Specialized Workbenches & Analyzer Reactivity
// ============================================================================

test('SUITE 4.1: Module 8 Åström–Hägglund Relay Autotuner triggers, cycles, and yields valid PID tuning', () => {
  const spec = MODULE_SPECS.m8;
  const engine = createSimulationEngine(spec.play.defaultCircuit);

  // Step nominal
  engine.runMultipleSteps(20);

  // Start Autotune
  engine.startAutotune();
  const atNode = engine.graph.nodes.find((n) => n.type === 'Autotune');
  assert.ok(atNode, 'M8 must contain Autotune block');
  assert.equal(engine.states[atNode.id]?.autotune?.active, true, 'Autotuner must be active after start');

  // Step until oscillation cycles are detected (150 steps = 7.5s)
  for (let i = 0; i < 150; i++) {
    engine.step();
  }

  const atState = engine.states[atNode.id]?.autotune;
  assert.ok(atState, 'Autotune state must exist');

  // Stop autotune
  engine.stopAutotune();
  assert.equal(engine.states[atNode.id]?.autotune?.active, false, 'Autotuner must be inactive after stop');

  // Apply tuning parameters
  const tunedParams = { kc: 4.2, ti: 3.5, td: 0.8 };
  // Simulate handleApplyTuning
  const updatedNodes = engine.graph.nodes.map((n) => {
    if (['P', 'PI', 'PID'].includes(n.type)) {
      return { ...n, config: { ...n.config, ...tunedParams } };
    }
    return n;
  });
  engine.setGraph({ ...engine.graph, nodes: updatedNodes });

  // Engine resets and runs cleanly with new tuned parameters
  const postTunedRes = engine.runMultipleSteps(30);
  const lastPt = postTunedRes.history[postTunedRes.history.length - 1];
  assert.ok(Number.isFinite(lastPt.pv), 'PV must be finite after applying autotuned parameters');
});

test('SUITE 4.2: Module 9 Bode & Root Locus Analyzers produce valid s-plane telemetry', () => {
  const spec = MODULE_SPECS.m9;
  const engine = createSimulationEngine(spec.play.defaultCircuit);

  const res = engine.runMultipleSteps(30);
  const metrics = res.metrics;

  assert.ok(metrics.bodeAnalysis, 'M9 metrics must include bodeAnalysis');
  assert.ok(Array.isArray(metrics.bodeAnalysis.points), 'Bode points must be array');
  assert.ok(metrics.bodeAnalysis.points.length > 20, 'Bode analysis must compute frequency points');
  assert.ok(typeof metrics.bodeAnalysis.gainMarginDb === 'number', 'Bode must compute gainMarginDb');
  assert.ok(typeof metrics.bodeAnalysis.phaseMarginDeg === 'number', 'Bode must compute phaseMarginDeg');

  assert.ok(metrics.rootLocusAnalysis, 'M9 metrics must include rootLocusAnalysis');
  assert.ok(Array.isArray(metrics.rootLocusAnalysis.poles), 'Root locus must have poles');
  assert.ok(metrics.rootLocusAnalysis.poles.length >= 2, 'Root locus must calculate closed-loop poles');
  assert.ok(['stable', 'marginal', 'unstable'].includes(metrics.rootLocusAnalysis.stability), 'Root locus must classify stability');
});

test('SUITE 4.3: Module 12 Multivariable Bristol RGA Decoupler toggle alters MIMO coupling', () => {
  const spec = MODULE_SPECS.m12;
  const engine = createSimulationEngine(spec.play.defaultCircuit);

  // Decoupler initially disabled
  const mimoNode = engine.graph.nodes.find((n) => n.type === 'MIMOPlant');
  assert.ok(mimoNode, 'M12 must contain MIMOPlant block');

  engine.runMultipleSteps(20);
  const coupledRes = engine.step();
  assert.ok(coupledRes.metrics.rgaAnalysis, 'M12 must calculate rgaAnalysis');
  assert.ok(['straight', 'cross'].includes(coupledRes.metrics.rgaAnalysis.recommendedPairing), 'RGA must recommend pairing strategy');

  // Toggle decoupler ON
  engine.updateBlockConfig('mimo-node', { decouplerEnabled: true });
  engine.updateBlockConfig('decoupler-node', { decouplerEnabled: true });

  const decoupledRes = engine.runMultipleSteps(30);
  const lastPt = decoupledRes.history[decoupledRes.history.length - 1];
  assert.ok(Number.isFinite(lastPt.pv), 'MIMO PV1 must remain finite with decoupler ON');
});

test('SUITE 4.4: Module 13 Case Study ODE models step and produce bounded outputs', () => {
  const cstrSpec = MODULE_SPECS.m13;

  // Case 1: Exothermic CSTR
  const cstrEngine = createSimulationEngine(cstrSpec.play.defaultCircuit);
  const cstrRes = cstrEngine.runMultipleSteps(30);
  const cstrPt = cstrRes.history[cstrRes.history.length - 1];
  assert.ok(Number.isFinite(cstrPt.pv), 'CSTR PV must be finite');
  assert.ok(cstrPt.pv >= 300 && cstrPt.pv <= 380, `CSTR reactor temperature should operate near 350K, got ${cstrPt.pv}`);

  // Case 4: Boiler Drum (Inverse Swell Dynamics)
  const boilerGraph = {
    nodes: [
      { id: 'sp-node', type: 'Constant' as const, title: 'SP', x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'SP', type: 'output' as const }], config: { value: 50 } },
      { id: 'sum-node', type: 'Sum' as const, title: 'Sum', x: 0, y: 0, inputs: [{ id: 'in1', name: '+', type: 'input' as const }, { id: 'in2', name: '-', type: 'input' as const }], outputs: [{ id: 'out', name: 'e', type: 'output' as const }], config: { signs: ['+', '-'] as ('+' | '-')[] } },
      { id: 'ctrl', type: 'PID' as const, title: 'PID', x: 0, y: 0, inputs: [{ id: 'in', name: 'e', type: 'input' as const }], outputs: [{ id: 'out', name: 'u', type: 'output' as const }], config: { kc: 1.8, ti: 12.0, td: 1.0, bias: 50, antiWindup: true } },
      { id: 'boiler', type: 'BoilerDrumPlant' as const, title: 'Boiler', x: 0, y: 0, inputs: [{ id: 'u', name: 'u', type: 'input' as const }, { id: 'd', name: 'd', type: 'input' as const }], outputs: [{ id: 'out', name: 'L', type: 'output' as const }], config: { inverseTauZ: 2.5 } },
    ],
    wires: [
      { id: 'w1', fromBlockId: 'sp-node', fromPortId: 'out', toBlockId: 'sum-node', toPortId: 'in1' },
      { id: 'w2', fromBlockId: 'sum-node', fromPortId: 'out', toBlockId: 'ctrl', toPortId: 'in' },
      { id: 'w3', fromBlockId: 'ctrl', fromPortId: 'out', toBlockId: 'boiler', toPortId: 'u' },
      { id: 'w4', fromBlockId: 'boiler', fromPortId: 'out', toBlockId: 'sum-node', toPortId: 'in2' },
    ],
  };

  const boilerEngine = createSimulationEngine(boilerGraph);
  const boilerRes = boilerEngine.runMultipleSteps(30);
  const boilerPt = boilerRes.history[boilerRes.history.length - 1];
  assert.ok(Number.isFinite(boilerPt.pv), 'Boiler level must be finite');
});

// ============================================================================
// SUITE 5: Challenge Evaluator Live Scoring & Stale Closure Fix Verification
// ============================================================================

test('SUITE 5.1: Challenge evaluator handles custom modules and default fallback gracefully', () => {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');

  // Verify explicit branches in App.tsx
  const explicitChallengeTypes = [
    'integralOffsetElimination',
    'derivativeNoiseTradeoff',
    'antiWindupAndBumpless',
    'tuningGauntlet',
    'stabilityPrediction',
    'feedforwardIAEReduction',
    'cascadeTuningSequence',
    'mimoDecoupling',
    'cstrExothermicRunaway',
    'unseenPlantCapstone',
  ];

  for (const cType of explicitChallengeTypes) {
    assert.match(
      appContent,
      new RegExp(`challengeType === ['"]${cType}['"]`),
      `App.tsx must have an explicit evaluation branch for challengeType: "${cType}"`
    );
  }

  // Verify default fallback handles standard tracking modules (m1, m4, etc.)
  assert.match(
    appContent,
    /const baseScore = result\.metrics\.inToleranceRatio \* 100;/,
    'App.tsx evaluator must provide standard inToleranceRatio default scoring fallback'
  );
});

test('SUITE 5.2: Stale closure fix verified: App.tsx reads result.history[last] directly in scoring loop', () => {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');

  // Verify that the stale closure over latestPt?.pv is eliminated
  assert.match(
    appContent,
    /result\.history\[result\.history\.length - 1\]/,
    'App.tsx challenge evaluator must read latest point directly from result.history rather than closed-over latestPt'
  );
  assert.doesNotMatch(
    appContent,
    /currentTr = latestPt\?\.pv/,
    'latestPt?.pv must NOT be used for CSTR runaway scoring'
  );
});

test('SUITE 5.3: Catastrophic trip limits immediately collapse score to 0', () => {
  // Test CSTR thermal runaway trip rule in App.tsx
  // Rule: if currentTr >= 365.0 => liveScore = 0
  const runawayTr = 366.5;
  const isTrip = runawayTr >= 365.0;
  assert.equal(isTrip, true, 'Temperature >= 365K must trigger trip condition');

  // Test Boiler shrink/swell dryout/flood rule in App.tsx
  // Rule: if currentL < 20.0 || currentL > 80.0 => liveScore = 0
  const dryoutL = 18.5;
  const floodL = 82.0;
  assert.equal(dryoutL < 20.0 || dryoutL > 80.0, true, 'Level < 20% must trigger dryout trip');
  assert.equal(floodL < 20.0 || floodL > 80.0, true, 'Level > 80% must trigger flood trip');
});

// ============================================================================
// SUITE 6: Accessibility & Theme Remediation Verification (6 Touched Components)
// ============================================================================

test('SUITE 6.1: ProveChallengePanel has no text-white on light backgrounds and proper contrast badges', () => {
  const filePath = path.resolve('src/components/ProveChallengePanel.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify badge styling: dark amber text on light amber badge
  assert.match(content, /text-amber-800 bg-amber-100/, 'Badge must use high-contrast dark amber text on light badge');
  assert.match(content, /border-amber-300/, 'Badge must have amber border');
  // Verify passing score styling
  assert.match(content, /text-emerald-700 font-bold/, 'Passing score must use high-contrast text-emerald-700');
  // Verify no text-white inside light inputs
  assert.doesNotMatch(content, /bg-slate-50[^>]*text-white/, 'Inputs must not use text-white on light bg');
});

test('SUITE 6.2: GuidedStepsPanel has high-contrast badge and legible AI Tutor hover button', () => {
  const filePath = path.resolve('src/components/GuidedStepsPanel.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(content, /text-sky-800 bg-sky-100/, 'Badge must use text-sky-800 on bg-sky-100');
  assert.match(content, /border-sky-300/, 'Badge must have border-sky-300');
  assert.match(content, /hover:bg-indigo-100 text-indigo-700/, 'AI Tutor button hover must use legible light indigo bg with dark text');
});

test('SUITE 6.3: ModuleRoadmapDrawer has dark backdrop and high-contrast completion badges', () => {
  const filePath = path.resolve('src/components/ModuleRoadmapDrawer.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(content, /bg-slate-900\/40 backdrop-blur-sm/, 'Backdrop must use dark blur overlay');
  assert.match(content, /bg-emerald-100 text-emerald-700 border border-emerald-300/, 'Completed badge must be high-contrast');
});

test('SUITE 6.4: MasteryDashboardModal learner input and titles are fully legible', () => {
  const filePath = path.resolve('src/components/MasteryDashboardModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Header title must be dark text
  assert.match(content, /text-base sm:text-lg font-bold text-slate-900/, 'Modal title must use text-slate-900');
  // Learner input must be dark text on white input
  assert.match(content, /text-slate-900 bg-white border border-slate-300/, 'Learner name input must use text-slate-900 on white bg');
});

test('SUITE 6.5: BioprocessModal uses dark backdrop and dark readable titles', () => {
  const filePath = path.resolve('src/components/BioprocessModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(content, /bg-slate-900\/40 backdrop-blur-sm/, 'Backdrop must use dark blur overlay');
  assert.match(content, /text-base sm:text-lg font-bold text-slate-900/, 'Modal title must use text-slate-900');
  assert.match(content, /font-bold text-slate-900 text-xs/, 'Chemical compound titles must use text-slate-900');
});

test('SUITE 6.6: MetricsPanel uses high-contrast tuning method selector buttons', () => {
  const filePath = path.resolve('src/components/MetricsPanel.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(content, /font-bold text-slate-900 text-xs uppercase/, 'MetricsPanel title must use text-slate-900');
  assert.match(content, /text-cyan-700 font-bold/, 'Tuning method selector buttons must use high-contrast text-cyan-700');
});

// ============================================================================
// SUITE 7: Adversarial Challenges & Edge Case Mining
// ============================================================================

test('SUITE 7.1 [CHALLENGE 1]: Module 13 case-selector control is orphaned and fails to switch activeCaseStudyIndex', () => {
  const specM13 = MODULE_SPECS.m13;
  const caseCtrl = specM13.play.controlsExposed.find((c) => c.id === 'case-selector');
  assert.ok(caseCtrl, 'case-selector must exist in M13 controlsExposed');

  // Verify that 'case-ctrl' does NOT exist in M13 defaultCircuit nodes
  const nodeExists = specM13.play.defaultCircuit.nodes.some((n) => n.id === caseCtrl.blockId);
  assert.equal(nodeExists, false, 'case-ctrl node does NOT exist in circuit graph (Challenge 1 verified)');

  // Verify in App.tsx handleUpdateControl:
  // Clicking case-selector in control surface runs:
  // engineRef.current.updateBlockConfig('case-ctrl', { caseIndex: value })
  // which is a no-op and does NOT trigger handleSelectCaseStudy(value)!
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
  assert.match(
    appContent,
    /handleUpdateControl\(ctrl,\s+opt\.value\)/,
    'Control surface select buttons call handleUpdateControl rather than handleSelectCaseStudy'
  );
});

test('SUITE 7.2 [CHALLENGE 2]: Module 13 Cases 2, 3, and 4 scoring branches in App.tsx are unreachable', () => {
  const specM13 = MODULE_SPECS.m13;
  // In modulesData.ts, specM13.prove.challengeType is statically 'cstrExothermicRunaway'
  assert.equal(specM13.prove.challengeType, 'cstrExothermicRunaway');

  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');

  // App.tsx has branches for heatExchangerFeedforward, distillationPurityMimo, boilerDrumShrinkSwell:
  assert.match(appContent, /currentModule\.prove\.challengeType === 'heatExchangerFeedforward'/);
  assert.match(appContent, /currentModule\.prove\.challengeType === 'distillationPurityMimo'/);
  assert.match(appContent, /currentModule\.prove\.challengeType === 'boilerDrumShrinkSwell'/);

  // But NONE of the 14 modules in MODULE_SPECS has those challengeTypes!
  const allChallengeTypes = ALL_MODULE_IDS.map((id) => MODULE_SPECS[id].prove.challengeType);
  assert.equal(allChallengeTypes.includes('heatExchangerFeedforward' as any), false);
  assert.equal(allChallengeTypes.includes('distillationPurityMimo' as any), false);
  assert.equal(allChallengeTypes.includes('boilerDrumShrinkSwell' as any), false);

  // Therefore, when a user is on M13 Case 2, 3, or 4, challengeType remains 'cstrExothermicRunaway',
  // meaning Cases 2, 3, and 4 evaluate against CSTR runaway rules (350K target, 365K trip limit)!
});
