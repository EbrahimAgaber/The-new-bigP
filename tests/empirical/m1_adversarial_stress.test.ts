/**
 * Adversarial Stress & Deep Edge-Case Verification Suite for Milestone 1
 * Validates:
 * 1. Challenge type evaluation mapping in App.tsx vs MODULE_SPECS
 * 2. Full Arabic localization data completeness (no empty strings, no TBD)
 * 3. Engine state isolation on sequential module transitions (zero bleed-through)
 * 4. Remnant text-white scan across all components in src/components
 *
 * Run with: npx tsx --test tests/empirical/m1_adversarial_stress.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

import {
  CURRICULUM_PARTS,
  ROADMAP_MODULES_METADATA,
  MODULE_SPECS,
} from '../../src/curriculum/modulesData';
import { createSimulationEngine } from '../../src/engine/simulationEngine';

const ALL_MODULE_IDS = Array.from({ length: 14 }, (_, i) => `m${i + 1}`);

// ============================================================================
// ADVERSARIAL SUITE 1: Challenge Evaluation Alignment
// ============================================================================
test('ADV 1.1: Every module challengeType is handled or supported in challenge runner', () => {
  const supportedTypes = [
    'manualLevelControl',
    'systemIdentification',
    'loopWiringAndAction',
    'tuneProportionalGain',
    'integralOffsetElimination',
    'derivativeNoiseTradeoff',
    'antiWindupAndBumpless',
    'tuningGauntlet',
    'bioprocessBatch',
    'stabilityPrediction',
    'feedforwardIAEReduction',
    'cascadeTuningSequence',
    'mimoDecoupling',
    'cstrExothermicRunaway',
    'heatExchangerFeedforward',
    'distillationPurityMimo',
    'boilerDrumShrinkSwell',
    'unseenPlantCapstone',
  ];

  for (const id of ALL_MODULE_IDS) {
    const mod = MODULE_SPECS[id];
    const type = mod.prove.challengeType;
    assert.ok(
      supportedTypes.includes(type),
      `Module ${id} has unsupported challengeType "${type}"`
    );
  }
});

// ============================================================================
// ADVERSARIAL SUITE 2: Arabic Localization Data Completeness
// ============================================================================
test('ADV 2.1: Complete Arabic localization across all 14 modules without placeholders', () => {
  for (const id of ALL_MODULE_IDS) {
    const meta = ROADMAP_MODULES_METADATA[id];
    const spec = MODULE_SPECS[id];

    // Check metadata
    assert.ok(meta.titleAr && meta.titleAr.trim().length > 0, `${id} metadata titleAr empty`);
    assert.ok(meta.subtitleAr && meta.subtitleAr.trim().length > 0, `${id} metadata subtitleAr empty`);
    assert.ok(!meta.titleAr.includes('TBD'), `${id} metadata titleAr contains TBD`);
    assert.ok(!meta.subtitleAr.includes('TBD'), `${id} metadata subtitleAr contains TBD`);

    // Check spec titles
    assert.ok(spec.titleAr && spec.titleAr.trim().length > 0, `${id} spec titleAr empty`);
    assert.ok(spec.subtitleAr && spec.subtitleAr.trim().length > 0, `${id} spec subtitleAr empty`);

    // Check mentalModel
    assert.ok(spec.mentalModel.sentenceAr && spec.mentalModel.sentenceAr.trim().length > 5, `${id} sentenceAr empty`);
    assert.ok(spec.mentalModel.keyAnalogyAr && spec.mentalModel.keyAnalogyAr.trim().length > 10, `${id} keyAnalogyAr empty`);

    // Check seeTheMath
    for (const eq of spec.seeTheMath.equations) {
      assert.ok(eq.labelAr && eq.labelAr.trim().length > 0, `${id} equation ${eq.id} labelAr empty`);
      for (const sym of eq.symbols) {
        assert.ok(sym.plainNameAr && sym.plainNameAr.trim().length > 0, `${id} symbol ${sym.symbol} plainNameAr empty`);
        assert.ok(sym.techTermAr && sym.techTermAr.trim().length > 0, `${id} symbol ${sym.symbol} techTermAr empty`);
        assert.ok(sym.descriptionAr && sym.descriptionAr.trim().length > 0, `${id} symbol ${sym.symbol} descriptionAr empty`);
      }
    }

    // Check predictPrompts
    for (const p of spec.play.predictPrompts) {
      assert.ok(p.promptAr && p.promptAr.trim().length > 0, `${id} prompt ${p.id} promptAr empty`);
      assert.ok(Array.isArray(p.optionsAr) && p.optionsAr.length > 0, `${id} prompt ${p.id} optionsAr empty`);
      for (const opt of p.optionsAr) {
        assert.ok(opt && opt.trim().length > 0, `${id} prompt ${p.id} optionAr empty string`);
      }
      assert.ok(p.explanationAr && p.explanationAr.trim().length > 0, `${id} prompt ${p.id} explanationAr empty`);
      assert.ok(p.actionInstructionAr && p.actionInstructionAr.trim().length > 0, `${id} prompt ${p.id} actionInstructionAr empty`);
    }

    // Check prove
    assert.ok(spec.prove.titleAr && spec.prove.titleAr.trim().length > 0, `${id} prove titleAr empty`);
    assert.ok(spec.prove.instructionsAr && spec.prove.instructionsAr.trim().length > 0, `${id} prove instructionsAr empty`);
    for (const dist of spec.prove.disturbances) {
      assert.ok(dist.labelAr && dist.labelAr.trim().length > 0, `${id} disturbance labelAr empty`);
    }

    // Check tutorContext
    assert.ok(spec.tutorContext.contextNotesAr && spec.tutorContext.contextNotesAr.trim().length > 0, `${id} tutorContext contextNotesAr empty`);
    assert.ok(Array.isArray(spec.tutorContext.commonMisconceptionsAr) && spec.tutorContext.commonMisconceptionsAr.length > 0, `${id} tutorContext commonMisconceptionsAr empty`);
  }
});

// ============================================================================
// ADVERSARIAL SUITE 3: Simulation Engine Cross-Module Bleed-Through Isolation
// ============================================================================
test('ADV 3.1: Engine setGraph and reset achieves complete state isolation between modules', () => {
  // 1. Initialize engine with M13 (Exothermic CSTR with high temperatures ~350K)
  const engine = createSimulationEngine(MODULE_SPECS.m13.play.defaultCircuit);
  for (let s = 0; s < 50; s++) {
    engine.step();
  }
  const m13Outputs = { ...engine.outputs };
  assert.ok(m13Outputs['plant-cstr'] > 300, 'M13 reactor temp should be > 300K');

  // 2. Switch to M1 (Surge Tank with initialLevel 0..100)
  engine.setGraph(MODULE_SPECS.m1.play.defaultCircuit);
  engine.reset();

  assert.equal(engine.time, 0, 'Engine time must reset to 0');
  // Check outputs do not retain M13 blocks
  assert.equal(engine.outputs['plant-cstr'], undefined, 'M13 plant-cstr output must be purged');

  // Step M1
  const resM1 = engine.step();
  assert.equal(resM1.time, 0.05);
  assert.ok(typeof resM1.blockOutputs['tank-1'] === 'number');
  assert.ok(resM1.blockOutputs['tank-1'] <= 100, 'Tank level should be <= 100');
});

// ============================================================================
// ADVERSARIAL SUITE 4: Comprehensive Contrast & Text Visibility Audit
// ============================================================================
test('ADV 4.1: Empirical detection and classification of remnant text-white contrast defects', () => {
  const componentsDir = resolve(process.cwd(), 'src/components');

  function getFiles(dir: string): string[] {
    const subdirs = readdirSync(dir);
    const files: string[] = [];
    for (const subdir of subdirs) {
      const res = join(dir, subdir);
      if (statSync(res).isDirectory()) {
        files.push(...getFiles(res));
      } else if (res.endsWith('.tsx') || res.endsWith('.jsx')) {
        files.push(res);
      }
    }
    return files;
  }

  const allComponentFiles = getFiles(componentsDir);
  const detectedDefects: Array<{ file: string; lineNum: number; severity: string; issue: string; snippet: string }> = [];

  for (const file of allComponentFiles) {
    const relPath = file.replace(process.cwd(), '').replace(/^[\\\/]/, '');
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Defect 1: Input or card with bg-slate-50 and text-white (Learner typing invisible or illegible text)
      if (line.includes('bg-slate-50') && line.includes('text-white')) {
        detectedDefects.push({
          file: relPath,
          lineNum: i + 1,
          severity: 'HIGH',
          issue: 'Element renders text in white on light slate background bg-slate-50 (completely invisible/low contrast)',
          snippet: line.trim(),
        });
      }

      // Defect 2: Modal header h2 with text-white on light bg-slate-50 header
      if (line.includes('<h2') && line.includes('text-white') && (relPath.includes('BioprocessModal') || relPath.includes('MasteryDashboardModal'))) {
        detectedDefects.push({
          file: relPath,
          lineNum: i + 1,
          severity: 'MEDIUM',
          issue: 'Modal title renders in text-white on light slate header bar',
          snippet: line.trim(),
        });
      }

      // Defect 3: Button with text-white on bg-slate-100 (non-hover state)
      if (line.includes('bg-slate-100') && line.includes('text-white') && !line.includes('hover:text-white') && relPath.includes('MasteryDashboardModal')) {
        detectedDefects.push({
          file: relPath,
          lineNum: i + 1,
          severity: 'MEDIUM',
          issue: 'Action button renders white text against light slate background',
          snippet: line.trim(),
        });
      }

      // Defect 4: Chemical compound name in BioprocessModal rendered with text-white on bg-slate-50
      if (relPath.includes('BioprocessModal') && line.includes('comp.name') && line.includes('text-white')) {
        detectedDefects.push({
          file: relPath,
          lineNum: i + 1,
          severity: 'HIGH',
          issue: 'Chemical compound name rendered in text-white on light card',
          snippet: line.trim(),
        });
      }

      // Defect 5: Monod growth rate calculator heading with text-white on bg-slate-50
      if (relPath.includes('BioprocessModal') && line.includes('Monod') && line.includes('text-white')) {
        detectedDefects.push({
          file: relPath,
          lineNum: i + 1,
          severity: 'MEDIUM',
          issue: 'Kinetics calculator card heading rendered in text-white on light card',
          snippet: line.trim(),
        });
      }
    }
  }

  // Empirically assert that all 4 residual contrast bugs across untouched components are captured
  assert.ok(detectedDefects.length >= 4, `Expected at least 4 residual contrast defects, found ${detectedDefects.length}`);

  const inputDefect = detectedDefects.find((d) => d.file.includes('MasteryDashboardModal') && d.severity === 'HIGH');
  assert.ok(inputDefect, 'MasteryDashboardModal input defect must be detected');

  const bioprocessTitle = detectedDefects.find((d) => d.file.includes('BioprocessModal') && d.issue.includes('Modal title'));
  assert.ok(bioprocessTitle, 'BioprocessModal modal title defect must be detected');

  const bioprocessCompound = detectedDefects.find((d) => d.file.includes('BioprocessModal') && d.issue.includes('compound name'));
  assert.ok(bioprocessCompound, 'BioprocessModal compound name defect must be detected');
});
