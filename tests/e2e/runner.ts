/**
 * Unified E2E Test Suite Runner for bigP Process Control Academy
 *
 * Executes all 4 testing tiers:
 * - Tier 1: Feature Coverage (M1 - M14, 70 genuine tests)
 * - Tier 2: Boundary & Corner Cases (M1 - M14, 70 genuine tests)
 * - Tier 3: Cross-Feature Combinations (16 pairwise interaction tests)
 * - Tier 4: Real-World Application Scenarios (5 industrial case studies & capstone)
 *
 * Produces a consolidated report table and exits with code 0 on complete pass.
 */

import { exec } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TierRunConfig {
  name: string;
  tier: string;
  description: string;
  filePath: string;
}

interface TierRunResult {
  config: TierRunConfig;
  passed: number;
  failed: number;
  durationMs: number;
  success: boolean;
  rawOutput: string;
}

const TIERS: TierRunConfig[] = [
  {
    name: 'Tier 1: Feature Coverage',
    tier: 'Tier 1',
    description: 'Primary happy-path nominal behavior across Modules 1-14',
    filePath: path.join(__dirname, 'tier1_feature_coverage.test.ts'),
  },
  {
    name: 'Tier 2: Boundary & Corner Cases',
    tier: 'Tier 2',
    description: 'Extremes, saturations, zero-delays, and edge limits across Modules 1-14',
    filePath: path.join(__dirname, 'tier2_boundary_corner.test.ts'),
  },
  {
    name: 'Tier 3: Cross-Feature Combinations',
    tier: 'Tier 3',
    description: 'Pairwise feature interactions across the 25-feature inventory',
    filePath: path.join(__dirname, 'tier3_cross_feature.test.ts'),
  },
  {
    name: 'Tier 4: Real-World Scenarios',
    tier: 'Tier 4',
    description: 'Industrial case studies (CSTR, Boiler, HEX, Distillation, Capstone)',
    filePath: path.join(__dirname, 'tier4_real_world.test.ts'),
  },
  {
    name: 'Tier 5: Adversarial Stress & Hardening',
    tier: 'Tier 5',
    description: 'Stale closures, extreme shocks, M13 4-case scoring, CSS keyframes, WCAG AA contrast',
    filePath: path.join(__dirname, 'tier5_adversarial_stress.test.ts'),
  },
];

async function runTier(config: TierRunConfig): Promise<TierRunResult> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const cmd = `npx tsx --test "${config.filePath}"`;
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      const durationMs = Date.now() - startTime;
      const combinedOutput = stdout + '\n' + stderr;

      let passed = 0;
      let failed = 0;

      const passMatch = combinedOutput.match(/ℹ\s+pass\s+(\d+)/);
      if (passMatch) {
        passed = parseInt(passMatch[1], 10);
      }

      const failMatch = combinedOutput.match(/ℹ\s+fail\s+(\d+)/);
      if (failMatch) {
        failed = parseInt(failMatch[1], 10);
      }

      if (passed === 0 && failed === 0) {
        const checkmarks = (combinedOutput.match(/✔/g) || []).length;
        const crosses = (combinedOutput.match(/✖/g) || []).length;
        if (checkmarks > 0 || crosses > 0) {
          passed = checkmarks;
          failed = crosses;
        }
      }

      resolve({
        config,
        passed,
        failed,
        durationMs,
        success: !err && failed === 0,
        rawOutput: combinedOutput,
      });
    });
  });
}

async function main() {
  console.log('================================================================================');
  console.log('   bigP Process Control Academy & Simulation Studio — Unified E2E Test Runner  ');
  console.log('================================================================================\n');

  const results: TierRunResult[] = [];
  let allSuccess = true;

  for (const tierConfig of TIERS) {
    process.stdout.write(`Executing ${tierConfig.name} [${path.basename(tierConfig.filePath)}] ... `);
    const result = await runTier(tierConfig);
    results.push(result);

    if (result.success) {
      console.log(`PASSED (${result.passed} tests in ${(result.durationMs / 1000).toFixed(2)}s)`);
    } else {
      console.log(`FAILED (${result.failed} failed, ${result.passed} passed)`);
      allSuccess = false;
    }
  }

  // Print Summary Table
  console.log('\n================================================================================');
  console.log('                               TEST SUITE SUMMARY                               ');
  console.log('================================================================================');
  console.log(
    'Tier / Suite Name'.padEnd(35) +
    'Passed'.padStart(10) +
    'Failed'.padStart(10) +
    'Time (s)'.padStart(12) +
    'Status'.padStart(13)
  );
  console.log('--------------------------------------------------------------------------------');

  let totalPassed = 0;
  let totalFailed = 0;
  let totalDurationMs = 0;

  for (const res of results) {
    totalPassed += res.passed;
    totalFailed += res.failed;
    totalDurationMs += res.durationMs;

    const statusStr = res.success ? 'PASS [100%]' : 'FAIL';
    console.log(
      res.config.name.padEnd(35) +
      res.passed.toString().padStart(10) +
      res.failed.toString().padStart(10) +
      (res.durationMs / 1000).toFixed(2).padStart(12) +
      statusStr.padStart(13)
    );
  }

  console.log('--------------------------------------------------------------------------------');
  const grandStatusStr = allSuccess ? 'ALL PASSED' : 'FAILURES DETECTED';
  console.log(
    'TOTAL (All 5 Tiers)'.padEnd(35) +
    totalPassed.toString().padStart(10) +
    totalFailed.toString().padStart(10) +
    (totalDurationMs / 1000).toFixed(2).padStart(12) +
    grandStatusStr.padStart(13)
  );
  console.log('================================================================================\n');

  if (allSuccess) {
    console.log(` SUCCESS: All ${totalPassed} E2E tests across Modules 1-14 passed cleanly with 0 failures.\n`);
    process.exit(0);
  } else {
    console.error(` ERROR: Test suite encountered failures. Total failed: ${totalFailed}.\n`);
    for (const res of results) {
      if (!res.success) {
        console.error(`--- Failures in ${res.config.name} ---`);
        console.error(res.rawOutput);
      }
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error executing test runner:', err);
  process.exit(1);
});
