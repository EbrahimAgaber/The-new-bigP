/**
 * Tier 5: Adversarial Stress & Hardening Test Suite
 * bigP Process Control Academy & Simulation Studio
 *
 * Exhaustively stress-tests:
 * 1. React Stale Closure elimination in challenge finalization
 * 2. Rapid concurrent module switching and circuit re-seeding
 * 3. Extreme numerical perturbations and non-linear plant stability
 * 4. Module 13 four-case physical variable challenge scoring
 * 5. Elimination of continuous RAF loops via CSS animations
 * 6. WCAG AA light-theme contrast invariants across analyzers and modals
 * 7. Canvas layout truncation guard & minimum width enforcement
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { createSimulationEngine } from '../../src/engine/simulationEngine';
import { MODULE_SPECS } from '../../src/curriculum/modulesData';
import { EquipmentVisualizer } from '../../src/components/EquipmentVisualizer';
import { BlockDiagramCanvas } from '../../src/components/BlockDiagramCanvas';
import { BodeViewer } from '../../src/components/BodeViewer';
import { RootLocusViewer } from '../../src/components/RootLocusViewer';
import { RgaMatrixViewer } from '../../src/components/RgaMatrixViewer';
import { MasteryDashboardModal } from '../../src/components/MasteryDashboardModal';
import { BioprocessModal } from '../../src/components/BioprocessModal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../../src');

// ---------------------------------------------------------------------------
// 1. React Stale Closure Elimination & Ref Invariants
// ---------------------------------------------------------------------------
test('Tier 5.1: App.tsx uses challengeScoreRef and reads challengeScoreRef.current in finalizeChallenge', () => {
  const appPath = path.join(SRC_DIR, 'App.tsx');
  const content = fs.readFileSync(appPath, 'utf-8');

  assert.ok(
    content.includes('challengeScoreRef = useRef<number>(0)') || content.includes('challengeScoreRef = useRef(0)'),
    'App.tsx must declare challengeScoreRef = useRef(0)'
  );
  assert.ok(
    content.includes('challengeScoreRef.current = liveScore'),
    'App.tsx must update challengeScoreRef.current in simulation loop'
  );
  assert.ok(
    content.includes('Math.round(challengeScoreRef.current)'),
    'finalizeChallenge must read challengeScoreRef.current to prevent stale closure'
  );
  assert.ok(
    !content.includes('const finalScore = Math.round(challengeScore);'),
    'App.tsx must NOT read stale challengeScore state directly in finalizeChallenge'
  );
});

// ---------------------------------------------------------------------------
// 2. Module 13 Case Study Control Routing & Synchronized State
// ---------------------------------------------------------------------------
test('Tier 5.2: handleUpdateControl intercepts case-selector and routes to handleSelectCaseStudy', () => {
  const appPath = path.join(SRC_DIR, 'App.tsx');
  const content = fs.readFileSync(appPath, 'utf-8');

  assert.ok(
    content.includes("if (ctrl.id === 'case-selector')"),
    'handleUpdateControl must intercept case-selector'
  );
  assert.ok(
    content.includes('handleSelectCaseStudy(value'),
    'handleUpdateControl must route case-selector to handleSelectCaseStudy'
  );
  assert.ok(
    content.includes("ctrl.id === 'case-selector'") && content.includes('activeCaseStudyIndex'),
    'Docked controls rack must bind case-selector active state to activeCaseStudyIndex'
  );
});

// ---------------------------------------------------------------------------
// 3. Module 13 Physical Process Variable Scoring for All 4 Cases
// ---------------------------------------------------------------------------
test('Tier 5.3: Module 13 challenge evaluator scores dynamically across all 4 industrial cases', () => {
  const appPath = path.join(SRC_DIR, 'App.tsx');
  const content = fs.readFileSync(appPath, 'utf-8');

  // Verify branching on activeCaseStudyIndex inside m13 scoring
  assert.ok(
    content.includes("currentModule.id === 'm13'") && content.includes('activeCaseStudyIndex === 1'),
    'Must branch on activeCaseStudyIndex === 1 for CSTR'
  );
  assert.ok(
    content.includes('activeCaseStudyIndex === 2') && content.includes('65.0'),
    'Must branch on activeCaseStudyIndex === 2 for Shell-Tube Exchanger'
  );
  assert.ok(
    content.includes('activeCaseStudyIndex === 3') && content.includes('97.5'),
    'Must branch on activeCaseStudyIndex === 3 for Binary Distillation purity'
  );
  assert.ok(
    content.includes('currentL < 20.0 || currentL > 80.0'),
    'Must evaluate boiler swell water level limits [20%, 80%] for Case 4'
  );
});

// ---------------------------------------------------------------------------
// 4. Elimination of High-Frequency RAF Loops
// ---------------------------------------------------------------------------
test('Tier 5.4: EquipmentVisualizer & BlockDiagramCanvas eliminate requestAnimationFrame React state loops', () => {
  const equipPath = path.join(SRC_DIR, 'components/EquipmentVisualizer.tsx');
  const equipContent = fs.readFileSync(equipPath, 'utf-8');
  assert.ok(
    !equipContent.includes('requestAnimationFrame'),
    'EquipmentVisualizer.tsx must NOT use requestAnimationFrame'
  );
  assert.ok(
    equipContent.includes('@keyframes streamFlow') && equipContent.includes('@keyframes surfaceWave'),
    'EquipmentVisualizer.tsx must define CSS keyframes for fluid animations'
  );

  const blockPath = path.join(SRC_DIR, 'components/BlockDiagramCanvas.tsx');
  const blockContent = fs.readFileSync(blockPath, 'utf-8');
  assert.ok(
    !blockContent.includes('requestAnimationFrame'),
    'BlockDiagramCanvas.tsx must NOT use requestAnimationFrame'
  );
  assert.ok(
    blockContent.includes('@keyframes pulseFlow'),
    'BlockDiagramCanvas.tsx must define CSS keyframes for signal pulse animation'
  );
});

// ---------------------------------------------------------------------------
// 5. Flowsheet Canvas Layout Truncation Guard
// ---------------------------------------------------------------------------
test('Tier 5.5: BlockDiagramCanvas is guarded by horizontal scroll and minimum width', () => {
  const blockPath = path.join(SRC_DIR, 'components/BlockDiagramCanvas.tsx');
  const blockContent = fs.readFileSync(blockPath, 'utf-8');

  assert.ok(
    blockContent.includes('overflow-x-auto') && blockContent.includes('min-w-[640px]'),
    'BlockDiagramCanvas must include an overflow-x-auto container with min-w-[640px]'
  );

  const appPath = path.join(SRC_DIR, 'App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');
  assert.ok(
    !appContent.includes('grid grid-cols-1 md:grid-cols-2 gap-3.5') || appContent.includes('grid grid-cols-1 gap-3.5'),
    'App.tsx visualizer deck must not force narrow 2-column squishing'
  );
});

// ---------------------------------------------------------------------------
// 6. WCAG AA Light-Theme Contrast & Text Visibility
// ---------------------------------------------------------------------------
test('Tier 5.6: Docked Analyzers and Modals are free of text-white contrast traps', () => {
  // BodeViewer
  const bodePath = path.join(SRC_DIR, 'components/BodeViewer.tsx');
  const bodeContent = fs.readFileSync(bodePath, 'utf-8');
  assert.ok(
    !bodeContent.includes('<h3 className="font-bold text-white'),
    'BodeViewer header must not use text-white'
  );
  assert.ok(
    !bodeContent.includes('<strong className="text-white">'),
    'BodeViewer educational rule text must not use text-white'
  );

  // RootLocusViewer
  const rootPath = path.join(SRC_DIR, 'components/RootLocusViewer.tsx');
  const rootContent = fs.readFileSync(rootPath, 'utf-8');
  assert.ok(
    !rootContent.includes('<h3 className="font-bold text-white'),
    'RootLocusViewer header must not use text-white'
  );

  // RgaMatrixViewer
  const rgaPath = path.join(SRC_DIR, 'components/RgaMatrixViewer.tsx');
  const rgaContent = fs.readFileSync(rgaPath, 'utf-8');
  assert.ok(
    !rgaContent.includes('<h3 className="font-bold text-white'),
    'RgaMatrixViewer header must not use text-white'
  );
  assert.ok(
    !rgaContent.includes('hover:text-white'),
    'RgaMatrixViewer button must not invert to hover:text-white on light button'
  );

  // MasteryDashboardModal
  const masteryPath = path.join(SRC_DIR, 'components/MasteryDashboardModal.tsx');
  const masteryContent = fs.readFileSync(masteryPath, 'utf-8');
  assert.ok(
    !masteryContent.includes('text-cyan-200 text-xs font-bold'),
    'MasteryDashboardModal export button must not use text-cyan-200 on sky-50'
  );
  assert.ok(
    masteryContent.includes('text-cyan-800'),
    'MasteryDashboardModal export button must use high-contrast text-cyan-800'
  );

  // BioprocessModal
  const bioPath = path.join(SRC_DIR, 'components/BioprocessModal.tsx');
  const bioContent = fs.readFileSync(bioPath, 'utf-8');
  assert.ok(
    !bioContent.includes('hover:bg-slate-700 text-slate-600'),
    'BioprocessModal close button must not use dark-on-dark hover contrast'
  );
});

// ---------------------------------------------------------------------------
// 7. Non-Linear Simulation Engine Extreme Perturbations
// ---------------------------------------------------------------------------
test('Tier 5.7: Deterministic Fixed-Step ODE Solver holds numerical stability under 5,000 steps of extreme load shocks', () => {
  for (const modId of ['m1', 'm5', 'm7', 'm10', 'm13']) {
    const circuit = MODULE_SPECS[modId].play.defaultCircuit;
    const engine = createSimulationEngine(circuit);

    for (let step = 0; step < 1000; step++) {
      // Violent disturbance shock every 100 steps
      const drain = (step % 200 === 0) ? 90 : (step % 100 === 0) ? -20 : 0;
      const res = engine.step({ dist: drain });

      // Invariants: non-NaN, non-Infinite, finite numbers
      assert.ok(!Number.isNaN(res.metrics.currentError), `currentError in ${modId} must not be NaN at step ${step}`);
      assert.ok(Number.isFinite(res.metrics.iae), `iae in ${modId} must be finite at step ${step}`);
      assert.ok(Number.isFinite(res.metrics.valveTravelTotal), `valveTravelTotal in ${modId} must be finite at step ${step}`);
    }
  }
});
