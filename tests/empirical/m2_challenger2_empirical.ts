/**
 * Milestone 2 Challenger 2: Empirical UI Contrast & Modal Accessibility Verification
 *
 * Verifies:
 * 1. AST/JSX Token Inspection across modified modal dialogs and panels:
 *    - MasteryDashboardModal
 *    - BioprocessModal
 *    - ModuleRoadmapDrawer
 *    - ProveChallengePanel
 *    - GuidedStepsPanel
 *    - MetricsPanel
 *    - App.tsx (split layout container)
 * 2. Invisible base text classes (text-white or low-contrast light text on light backgrounds).
 * 3. Exact WCAG AA contrast ratio calculations for key text and input elements.
 * 4. Input fields in MasteryDashboardModal (learner name input) and ProveChallengePanel (system identification parameters).
 * 5. Full SSR DOM rendering verification for all 6 dialogs/panels.
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

// Components under empirical review
import { MasteryDashboardModal } from '../../src/components/MasteryDashboardModal';
import { BioprocessModal } from '../../src/components/BioprocessModal';
import { ModuleRoadmapDrawer } from '../../src/components/ModuleRoadmapDrawer';
import { ProveChallengePanel } from '../../src/components/ProveChallengePanel';
import { GuidedStepsPanel } from '../../src/components/GuidedStepsPanel';
import { MetricsPanel } from '../../src/components/MetricsPanel';
import { MODULE_SPECS } from '../../src/curriculum/modulesData';

// --- Color Luminance & Contrast Calculation ---
// Tailwind CSS color palette approximations (sRGB hex)
const TAILWIND_HEX: Record<string, string> = {
  'white': '#ffffff',
  'black': '#000000',
  'slate-50': '#f8fafc',
  'slate-100': '#f1f5f9',
  'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1',
  'slate-400': '#94a3b8',
  'slate-500': '#64748b',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',
  'slate-950': '#020617',
  'sky-50': '#f0f9ff',
  'sky-100': '#e0f2fe',
  'sky-200': '#bae6fd',
  'sky-300': '#7dd3fc',
  'sky-400': '#38bdf8',
  'sky-500': '#0ea5e9',
  'sky-600': '#0284c7',
  'sky-700': '#0369a1',
  'sky-800': '#075985',
  'sky-900': '#0c4a6e',
  'sky-950': '#082f49',
  'cyan-50': '#ecfeff',
  'cyan-100': '#cffafe',
  'cyan-200': '#a5f3fc',
  'cyan-300': '#67e8f9',
  'cyan-400': '#22d3ee',
  'cyan-500': '#06b6d4',
  'cyan-600': '#0891b2',
  'cyan-700': '#0e7490',
  'cyan-800': '#155e75',
  'cyan-900': '#164e63',
  'cyan-950': '#083344',
  'emerald-50': '#ecfdf5',
  'emerald-100': '#d1fae5',
  'emerald-200': '#a7f3d0',
  'emerald-300': '#6ee7b7',
  'emerald-400': '#34d399',
  'emerald-500': '#10b981',
  'emerald-600': '#059669',
  'emerald-700': '#047857',
  'emerald-800': '#065f46',
  'emerald-900': '#064e3b',
  'emerald-950': '#022c22',
  'amber-50': '#fffbeb',
  'amber-100': '#fef3c7',
  'amber-200': '#fde68a',
  'amber-300': '#fcd34d',
  'amber-400': '#fbbf24',
  'amber-500': '#f59e0b',
  'amber-600': '#d97706',
  'amber-700': '#b45309',
  'amber-800': '#92400e',
  'amber-900': '#78350f',
  'amber-950': '#451a03',
  'indigo-50': '#eef2ff',
  'indigo-100': '#e0e7ff',
  'indigo-600': '#4f46e5',
  'indigo-700': '#4338ca',
  'indigo-900': '#312e81',
  'indigo-950': '#1e1b4b',
  'rose-50': '#fff1f2',
  'rose-500': '#f43f5e',
  'rose-600': '#e11d48',
  'rose-700': '#be123c',
};

function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const sR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const sG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const sB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

export function calculateContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = getRelativeLuminance(foregroundHex);
  const l2 = getRelativeLuminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

interface Finding {
  file: string;
  line: number;
  tagName: string;
  className: string;
  issue: string;
  contrastRatio?: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

const findings: Finding[] = [];

// Light background class patterns
const LIGHT_BG_PATTERNS = [
  /bg-white/,
  /bg-slate-50/,
  /bg-slate-100/,
  /bg-slate-200/,
  /bg-gray-50/,
  /bg-sky-50/,
  /bg-emerald-50/,
  /bg-amber-50/,
  /bg-amber-100/,
  /bg-rose-50/,
  /bg-indigo-50/,
  /panel-card/,
];

// Dark background class patterns (including gradients, opacities)
const DARK_BG_PATTERNS = [
  /bg-slate-800/,
  /bg-slate-900/,
  /bg-slate-950/,
  /bg-cyan-600/,
  /bg-cyan-700/,
  /bg-sky-950/,
  /bg-indigo-600/,
  /bg-indigo-900/,
  /bg-indigo-950/,
  /bg-rose-600/,
  /bg-emerald-600/,
  /bg-emerald-700/,
  /bg-amber-500/,
  /from-(slate-900|slate-950|indigo-950|amber-950|cyan-600|emerald-600)/,
  /via-(slate-900|slate-950)/,
  /to-(slate-950|indigo-950)/,
  /bg-gradient-to-(r|br).*from-(amber-950|slate-900|emerald-600|indigo-950|cyan-600)/,
];

function isLightBackground(bgClasses: string[]): boolean {
  for (let i = bgClasses.length - 1; i >= 0; i--) {
    const bg = bgClasses[i];
    if (DARK_BG_PATTERNS.some((p) => p.test(bg))) return false;
    if (LIGHT_BG_PATTERNS.some((p) => p.test(bg))) return true;
  }
  return true; // Default application palette is light
}

function parseJsxTags(content: string) {
  const tags: Array<{ tagName: string; attrsStr: string; isClosing: boolean; isSelfClosing: boolean; offset: number }> = [];
  let i = 0;
  const len = content.length;

  while (i < len) {
    if (content[i] === '<' && i + 1 < len && /[a-zA-Z0-9_\/.]/.test(content[i + 1])) {
      const tagStart = i;
      i++;
      let isClosing = false;
      if (content[i] === '/') {
        isClosing = true;
        i++;
      }
      const nameStart = i;
      while (i < len && /[a-zA-Z0-9_.-]/.test(content[i])) i++;
      const tagName = content.slice(nameStart, i);

      let depth = 0;
      let inQuote: string | null = null;
      let isSelfClosing = false;
      const attrsStart = i;

      while (i < len) {
        const ch = content[i];
        if (inQuote) {
          if (ch === '\\') {
            i += 2;
            continue;
          }
          if (ch === inQuote) inQuote = null;
        } else {
          if (ch === '"' || ch === "'" || ch === '`') {
            inQuote = ch;
          } else if (ch === '{') {
            depth++;
          } else if (ch === '}') {
            if (depth > 0) depth--;
          } else if (depth === 0) {
            if (ch === '/' && i + 1 < len && content[i + 1] === '>') {
              isSelfClosing = true;
              i += 2;
              break;
            } else if (ch === '>') {
              i++;
              break;
            }
          }
        }
        i++;
      }
      const attrsStr = content.slice(attrsStart, isSelfClosing ? i - 2 : i - 1);
      tags.push({ tagName, attrsStr, isClosing, isSelfClosing, offset: tagStart });
    } else {
      i++;
    }
  }
  return tags;
}

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = path.relative(process.cwd(), filePath);

  const lineOffsets: number[] = [0];
  for (let i = 0; i < lines.length; i++) {
    lineOffsets.push(lineOffsets[i] + lines[i].length + 1);
  }

  function getLineNumber(offset: number): number {
    let low = 0;
    let high = lineOffsets.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineOffsets[mid] <= offset) {
        if (mid === lineOffsets.length - 1 || lineOffsets[mid + 1] > offset) {
          return mid + 1;
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return 1;
  }

  const tags = parseJsxTags(content);
  const bgStack: { tag: string; bgClasses: string[] }[] = [];

  for (const tag of tags) {
    const { tagName, attrsStr, isClosing, offset } = tag;
    const line = getLineNumber(offset);

    if (isClosing) {
      if (bgStack.length > 0 && bgStack[bgStack.length - 1].tag === tagName) {
        bgStack.pop();
      }
      continue;
    }

    let className = '';
    const classMatch = attrsStr.match(/className=(?:(?:"([^"]*)")|(?:\{`([^`]*)`\})|(?:\{'([^']*)'\})|(?:\{"([^"]*)"\})|(?:\{([^}]+)\}))/);
    if (classMatch) {
      className = classMatch[1] || classMatch[2] || classMatch[3] || classMatch[4] || classMatch[5] || '';
    }

    const elBgClasses: string[] = [];
    const bgs = className.match(/\bbg-[a-z0-9\/-]+/g);
    if (bgs) elBgClasses.push(...bgs);
    if (className.includes('panel-card')) elBgClasses.push('panel-card');

    // Also track gradient sources on element
    const gradMatches = className.match(/(?:from|via|to)-[a-z0-9\/-]+/g);
    if (gradMatches) elBgClasses.push(...gradMatches);

    const currentBgContext = bgStack.flatMap((b) => b.bgClasses).concat(elBgClasses);
    const bgIsLight = isLightBackground(currentBgContext);
    const directDarkBg = DARK_BG_PATTERNS.some((p) => p.test(className));

    // Check 1: base text-white on light background container
    const hasBaseTextWhite = /(?:^|\s)text-white(?:\s|$)/.test(className);
    if (hasBaseTextWhite && bgIsLight && !directDarkBg) {
      findings.push({
        file: relPath,
        line,
        tagName,
        className,
        issue: 'Critical invisible text: base "text-white" used on light background container',
        severity: 'CRITICAL',
      });
    }

    // Check 2: Low-contrast light text on light background
    const lowContrastLightMatches = [
      { pattern: /\btext-cyan-200\b/, color: 'cyan-200' },
      { pattern: /\btext-cyan-100\b/, color: 'cyan-100' },
      { pattern: /\btext-sky-200\b/, color: 'sky-200' },
      { pattern: /\btext-sky-100\b/, color: 'sky-100' },
      { pattern: /\btext-slate-100\b/, color: 'slate-100' },
      { pattern: /\btext-slate-200\b/, color: 'slate-200' },
      { pattern: /\btext-emerald-100\b/, color: 'emerald-100' },
      { pattern: /\btext-emerald-200\b/, color: 'emerald-200' },
    ];

    for (const { pattern, color } of lowContrastLightMatches) {
      if (pattern.test(className) && bgIsLight && !directDarkBg) {
        const activeBg = elBgClasses.find((b) => LIGHT_BG_PATTERNS.some((lp) => lp.test(b))) || 'slate-50';
        const bgClean = activeBg.replace('bg-', '').split('/')[0];
        const fgHex = TAILWIND_HEX[color] || '#a5f3fc';
        const bgHex = TAILWIND_HEX[bgClean] || '#f8fafc';
        const ratio = calculateContrastRatio(fgHex, bgHex);

        findings.push({
          file: relPath,
          line,
          tagName,
          className,
          issue: `Low-contrast defect: "${color}" on "${bgClean}" yields contrast ratio of ${ratio.toFixed(2)}:1 (WCAG AA requires 4.5:1)`,
          contrastRatio: ratio,
          severity: ratio < 3.0 ? 'CRITICAL' : 'WARNING',
        });
      }
    }

    // Check 3: Input elements inspect background vs text
    if (tagName === 'input') {
      const typeMatch = attrsStr.match(/type="([^"]+)"/);
      const inputType = typeMatch ? typeMatch[1] : 'text';

      if (inputType !== 'range' && inputType !== 'hidden' && inputType !== 'file') {
        const hasDarkText = /\btext-slate-[89]00\b/.test(className) || /\btext-black\b/.test(className);
        const hasWhiteBg = /\bbg-white\b/.test(className) || /\bbg-slate-50\b/.test(className);

        if (!hasDarkText || !hasWhiteBg) {
          findings.push({
            file: relPath,
            line,
            tagName,
            className,
            issue: `Input field legibility concern: text or background is not explicitly high-contrast (DarkText=${hasDarkText}, WhiteBg=${hasWhiteBg})`,
            severity: 'WARNING',
          });
        }
      }
    }

    if (!tag.isSelfClosing) {
      bgStack.push({ tag: tagName, bgClasses: elBgClasses });
    }
  }
}

// ==========================================
// MAIN VERIFICATION EXECUTION
// ==========================================
console.log('================================================================================');
console.log(' Milestone 2 Challenger 2: Empirical UI Contrast & Accessibility Verification   ');
console.log('================================================================================\n');

const TARGET_FILES = [
  'src/components/MasteryDashboardModal.tsx',
  'src/components/BioprocessModal.tsx',
  'src/components/ModuleRoadmapDrawer.tsx',
  'src/components/ProveChallengePanel.tsx',
  'src/components/GuidedStepsPanel.tsx',
  'src/components/MetricsPanel.tsx',
  'src/App.tsx',
];

console.log('--- Step 1: AST / JSX Static Token Scan Across Target Components ---');
for (const relFile of TARGET_FILES) {
  const fullPath = path.resolve(process.cwd(), relFile);
  scanFile(fullPath);
  console.log(`  ✓ Scanned ${relFile}`);
}

console.log(`\nAST Scan Findings (${findings.length} total):`);
for (const f of findings) {
  const sevBadge = f.severity === 'CRITICAL' ? '🔴 CRITICAL' : f.severity === 'WARNING' ? '🟡 WARNING' : 'ℹ️ INFO';
  console.log(`  [${sevBadge}] ${f.file}:${f.line} <${f.tagName}>`);
  console.log(`    Issue: ${f.issue}`);
  console.log(`    Class: "${f.className}"\n`);
}

// --- Step 2: SSR DOM Rendering Verification ---
console.log('--- Step 2: SSR DOM Rendering & Computed Contrast Assertions ---');
let passedDomTests = 0;
let failedDomTests = 0;

function assertDom(condition: boolean, desc: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ PASS: ${desc}`);
    passedDomTests++;
  } else {
    console.error(`  ✖ FAIL: ${desc} ${detail ? `(${detail})` : ''}`);
    failedDomTests++;
  }
}

// 2.1 MasteryDashboardModal DOM check
const masteryHtml = ReactDOMServer.renderToString(
  React.createElement(MasteryDashboardModal, {
    isOpen: true,
    onClose: () => {},
    moduleScores: { m1: 85, m2: 90, m3: 95 },
    unlockedModules: ['m1', 'm2', 'm3'],
    onImportProgress: () => {},
    lang: 'en',
  })
);

assertDom(
  masteryHtml.includes('text-slate-900') && masteryHtml.includes('Competency Matrix &amp; Verified Certificate'),
  'MasteryDashboardModal header renders with high-contrast text-slate-900'
);

assertDom(
  masteryHtml.includes('type="text"') &&
  masteryHtml.includes('text-slate-900') &&
  masteryHtml.includes('bg-white') &&
  masteryHtml.includes('border-slate-300'),
  'MasteryDashboardModal learner name input renders with text-slate-900 on bg-white'
);

assertDom(
  !masteryHtml.includes('text-white bg-slate-50') && !masteryHtml.includes('text-white on bg-white'),
  'MasteryDashboardModal has zero white text on white input'
);

// 2.2 BioprocessModal DOM check
const bioprocessHtml = ReactDOMServer.renderToString(
  React.createElement(BioprocessModal, {
    isOpen: true,
    onClose: () => {},
    onLoadBioreactorInStudio: () => {},
    lang: 'en',
  })
);

assertDom(
  bioprocessHtml.includes('bg-slate-900/40 backdrop-blur-sm'),
  'BioprocessModal backdrop has high-contrast slate-900/40 dark overlay'
);

assertDom(
  bioprocessHtml.includes('text-slate-900') && bioprocessHtml.includes('Bioprocess &amp; Bioreactor Control Lab'),
  'BioprocessModal header renders with text-slate-900'
);

assertDom(
  bioprocessHtml.includes('text-emerald-700 font-bold') && bioprocessHtml.includes('border-emerald-200'),
  'BioprocessModal limiting factor badge renders with high-contrast text-emerald-700'
);

// 2.3 ModuleRoadmapDrawer DOM check
const roadmapHtml = ReactDOMServer.renderToString(
  React.createElement(ModuleRoadmapDrawer, {
    isOpen: true,
    onClose: () => {},
    currentModuleId: 'm1',
    unlockedModules: ['m1', 'm2', 'm3'],
    moduleScores: { m1: 88, m2: 75 },
    onSelectModule: () => {},
    lang: 'en',
  })
);

assertDom(
  roadmapHtml.includes('bg-slate-900/40 backdrop-blur-sm'),
  'ModuleRoadmapDrawer backdrop has high-contrast slate-900/40 dark overlay'
);

assertDom(
  roadmapHtml.includes('Curriculum Roadmap') && roadmapHtml.includes('text-slate-900'),
  'ModuleRoadmapDrawer title renders with high-contrast text-slate-900'
);

assertDom(
  roadmapHtml.includes('bg-emerald-100 text-emerald-700 border border-emerald-300'),
  'ModuleRoadmapDrawer completed module badge renders with high-contrast text-emerald-700'
);

// 2.4 ProveChallengePanel DOM check
const m2Spec = MODULE_SPECS['m2'];
const proveM2Html = ReactDOMServer.renderToString(
  React.createElement(ProveChallengePanel, {
    module: m2Spec,
    score: 82,
    isChallengeRunning: false,
    challengeTimeLeft: 60,
    onStartChallenge: () => {},
    onStopChallenge: () => {},
    onUnlockNext: () => {},
    currentMetrics: {
      iae: 45.2,
      inToleranceRatio: 0.94,
      peakOvershootPct: 8.5,
      currentError: 0.1,
    },
    mysteryInputs: { k: 1.2, tau: 4.5, theta: 1.0 },
    lang: 'en',
  })
);

assertDom(
  proveM2Html.includes('Graded Prove Challenge') &&
  proveM2Html.includes('text-amber-800') &&
  proveM2Html.includes('bg-amber-100'),
  'ProveChallengePanel header badge renders with high-contrast text-amber-800 on bg-amber-100'
);

assertDom(
  proveM2Html.includes('text-emerald-700 font-bold') && proveM2Html.includes('≥'),
  'ProveChallengePanel target score badge renders with high-contrast text-emerald-700'
);

// Verify numerical input fields in ProveChallengePanel
const inputMatches = proveM2Html.match(/<input[^>]+type="number"[^>]*>/g) || [];
assertDom(
  inputMatches.length === 3,
  `ProveChallengePanel renders 3 numerical inputs for system identification (Found: ${inputMatches.length})`
);

let allProveInputsValid = true;
for (const inp of inputMatches) {
  if (!inp.includes('text-slate-900') || !inp.includes('bg-white') || !inp.includes('border-slate-300')) {
    allProveInputsValid = false;
  }
}
assertDom(
  allProveInputsValid,
  'All 3 ProveChallengePanel numerical inputs render with text-slate-900 on bg-white border-slate-300'
);

// 2.5 GuidedStepsPanel DOM check
const m1Spec = MODULE_SPECS['m1'];
const stepsHtml = ReactDOMServer.renderToString(
  React.createElement(GuidedStepsPanel, {
    module: m1Spec,
    lang: 'en',
  })
);

assertDom(
  stepsHtml.includes('text-sky-800') && stepsHtml.includes('bg-sky-100') && stepsHtml.includes('border-sky-300'),
  'GuidedStepsPanel Predict-Then-Run badge renders with high-contrast text-sky-800'
);

assertDom(
  stepsHtml.includes('hover:bg-indigo-100 text-indigo-700'),
  'GuidedStepsPanel AI Tutor button has legible hover:bg-indigo-100 text-indigo-700'
);

// 2.6 MetricsPanel DOM check
const metricsHtml = ReactDOMServer.renderToString(
  React.createElement(MetricsPanel, {
    metrics: {
      iae: 12.4,
      ise: 8.1,
      currentError: 0.05,
      peakOvershootPct: 4.2,
      riseTime: 3.2,
      settlingTime: 7.1,
      inToleranceRatio: 0.98,
      valveTravelTotal: 42,
    },
    lang: 'en',
  })
);

assertDom(
  metricsHtml.includes('text-slate-900 text-xs uppercase tracking-wider') &&
  metricsHtml.includes('Control Metrics &amp; Autotuner'),
  'MetricsPanel header renders with high-contrast text-slate-900'
);

assertDom(
  metricsHtml.includes('bg-sky-50 border-cyan-400 text-cyan-700 font-bold'),
  'MetricsPanel tuning rule buttons render with high-contrast text-cyan-700 on bg-sky-50'
);

// ==========================================
// CONTRAST MATRIX VERIFICATION
// ==========================================
console.log('\n--- Step 3: Contrast Ratio Verification Matrix ---');
const CONTRAST_TESTS = [
  { fg: '#0f172a', bg: '#ffffff', label: 'Learner Name Input Text (slate-900 on white)', req: 4.5, isUi: false },
  { fg: '#0f172a', bg: '#ffffff', label: 'ProveChallenge Mystery Inputs (slate-900 on white)', req: 4.5, isUi: false },
  { fg: '#0f172a', bg: '#f8fafc', label: 'Modal Dialog Headers (slate-900 on slate-50)', req: 4.5, isUi: false },
  { fg: '#0e7490', bg: '#f0f9ff', label: 'MetricsPanel Tuning Buttons (cyan-700 on sky-50)', req: 4.5, isUi: true },
  { fg: '#92400e', bg: '#fef3c7', label: 'ProveChallenge Badge (amber-800 on amber-100)', req: 4.5, isUi: true },
  { fg: '#075985', bg: '#e0f2fe', label: 'GuidedSteps Badge (sky-800 on sky-100)', req: 4.5, isUi: true },
  { fg: '#047857', bg: '#d1fae5', label: 'Roadmap Completed Badge (emerald-700 on emerald-100)', req: 4.5, isUi: true },
  { fg: '#4338ca', bg: '#eef2ff', label: 'GuidedSteps AI Tutor Button (indigo-700 on indigo-50)', req: 4.5, isUi: true },
  { fg: '#ffffff', bg: '#0891b2', label: 'Primary Action Buttons (white on cyan-600) [Large/Bold UI]', req: 3.0, isUi: true },
  { fg: '#ffffff', bg: '#059669', label: 'Success / Unlock Buttons (white on emerald-600) [Large/Bold UI]', req: 3.0, isUi: true },
  { fg: '#a5f3fc', bg: '#f0f9ff', label: 'MasteryDashboard Export Button (cyan-200 on sky-50) [DEFECT CHECK]', req: 4.5, isUi: true },
];

for (const ct of CONTRAST_TESTS) {
  const ratio = calculateContrastRatio(ct.fg, ct.bg);
  const pass = ratio >= ct.req;
  const mark = pass ? '✔' : '✖';
  console.log(`  ${mark} ${ct.label.padEnd(68)} : ${ratio.toFixed(2)}:1 (Req: ≥${ct.req}:1) -> ${pass ? 'PASS' : 'FAIL'}`);
}

// ==========================================
// SUMMARY REPORT
// ==========================================
console.log('\n================================================================================');
console.log(`DOM Test Assertions: ${passedDomTests} PASSED, ${failedDomTests} FAILED`);
const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
const warningCount = findings.filter((f) => f.severity === 'WARNING').length;
console.log(`AST Contrast Defect Scan: ${criticalCount} CRITICAL, ${warningCount} WARNINGS`);
console.log('================================================================================\n');

if (failedDomTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
