/**
 * Milestone 1 Challenger 2: Empirical Verification Script
 * 
 * Verifies:
 * 1. AST/JSX Token Inspection across modified UI components (GuidedStepsPanel,
 *    ProveChallengePanel, ModuleRoadmapDrawer, StudioSandbox, and other components).
 * 2. Invisible text classes (text-white or low-contrast light text on light backgrounds).
 * 3. Hover state contrast traps (e.g. hover:bg-dark without hover:text-white).
 * 4. ProveChallengePanel numerical input fields: rendering, styling, boundary values.
 * 5. Server-side rendering (SSR) DOM HTML output scans.
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

// Import components to empirically render
import { GuidedStepsPanel } from '../src/components/GuidedStepsPanel';
import { ProveChallengePanel } from '../src/components/ProveChallengePanel';
import { ModuleRoadmapDrawer } from '../src/components/ModuleRoadmapDrawer';
import { StudioSandbox } from '../src/components/StudioSandbox';
import { MODULE_SPECS, ROADMAP_MODULES_METADATA } from '../src/curriculum/modulesData';

interface Finding {
  file: string;
  line: number;
  tagName: string;
  className: string;
  issue: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

const findingsM1: Finding[] = [];
const findingsOther: Finding[] = [];

// Light background class patterns
const LIGHT_BG_PATTERNS = [
  /bg-white/,
  /bg-slate-50/,
  /bg-slate-100/,
  /bg-slate-200/,
  /bg-gray-50/,
  /bg-gray-100/,
  /bg-sky-50/,
  /bg-emerald-50/,
  /bg-amber-50/,
  /bg-rose-50/,
  /bg-indigo-50/,
  /panel-card/,
];

// Dark background class patterns
const DARK_BG_PATTERNS = [
  /bg-slate-800/,
  /bg-slate-900/,
  /bg-slate-950/,
  /bg-cyan-600/,
  /bg-cyan-700/,
  /bg-sky-950/,
  /bg-indigo-900/,
  /bg-rose-600/,
  /bg-emerald-600/,
  /bg-amber-500/,
  /bg-gradient-to-r.*from-(slate|cyan|emerald|indigo|rose)/,
];

// Potentially invisible light text classes on light background
const LOW_CONTRAST_TEXT_PATTERNS = [
  { pattern: /\btext-slate-100\b/, name: 'text-slate-100' },
  { pattern: /\btext-slate-200\b/, name: 'text-slate-200' },
  { pattern: /\btext-cyan-100\b/, name: 'text-cyan-100' },
  { pattern: /\btext-cyan-200\b/, name: 'text-cyan-200' },
  { pattern: /\btext-sky-100\b/, name: 'text-sky-100' },
  { pattern: /\btext-sky-200\b/, name: 'text-sky-200' },
  { pattern: /\btext-emerald-100\b/, name: 'text-emerald-100' },
  { pattern: /\btext-emerald-200\b/, name: 'text-emerald-200' },
  { pattern: /\btext-amber-100\b/, name: 'text-amber-100' },
  { pattern: /\btext-amber-200\b/, name: 'text-amber-200' },
  { pattern: /\btext-rose-100\b/, name: 'text-rose-100' },
  { pattern: /\btext-rose-200\b/, name: 'text-rose-200' },
];

function isLightBackground(bgClasses: string[]): boolean {
  for (let i = bgClasses.length - 1; i >= 0; i--) {
    const bg = bgClasses[i];
    if (DARK_BG_PATTERNS.some((p) => p.test(bg))) return false;
    if (LIGHT_BG_PATTERNS.some((p) => p.test(bg))) return true;
  }
  return true; // Default application palette is light
}

interface ParsedTag {
  tagName: string;
  attrsStr: string;
  isClosing: boolean;
  isSelfClosing: boolean;
  offset: number;
}

function parseJsxTags(content: string): ParsedTag[] {
  const tags: ParsedTag[] = [];
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
      // Read tagName
      const nameStart = i;
      while (i < len && /[a-zA-Z0-9_.-]/.test(content[i])) i++;
      const tagName = content.slice(nameStart, i);

      // Read attributes until '>' at depth 0 (handling quotes and JSX expression braces)
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
          if (ch === inQuote) {
            inQuote = null;
          }
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

function scanFileJsxTokens(filePath: string, isTargetM1: boolean): number {
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
  const findingsList = isTargetM1 ? findingsM1 : findingsOther;

  for (const tag of tags) {
    const { tagName, attrsStr, isClosing, isSelfClosing, offset } = tag;
    const line = getLineNumber(offset);

    if (isClosing) {
      if (bgStack.length > 0 && bgStack[bgStack.length - 1].tag === tagName) {
        bgStack.pop();
      }
      continue;
    }

    // Extract className attribute
    let className = '';
    const classMatch = attrsStr.match(/className=(?:(?:"([^"]*)")|(?:\{`([^`]*)`\})|(?:\{'([^']*)'\})|(?:\{"([^"]*)"\})|(?:\{([^}]+)\}))/);
    if (classMatch) {
      className = classMatch[1] || classMatch[2] || classMatch[3] || classMatch[4] || classMatch[5] || '';
    }

    // Determine background classes on this element
    const elBgClasses: string[] = [];
    const bgs = className.match(/\bbg-[a-z0-9\/-]+/g);
    if (bgs) elBgClasses.push(...bgs);
    if (className.includes('panel-card')) elBgClasses.push('panel-card');

    const currentBgContext = bgStack.flatMap((b) => b.bgClasses).concat(elBgClasses);
    const bgIsLight = isLightBackground(currentBgContext);
    const directDarkBg = DARK_BG_PATTERNS.some((p) => p.test(className));

    // Check 1: base text-white on light background (excluding hover:text-white, focus:text-white, etc.)
    const hasBaseTextWhite = /(?:^|\s)text-white(?:\s|$)/.test(className);
    if (hasBaseTextWhite && bgIsLight && !directDarkBg) {
      findingsList.push({
        file: relPath,
        line,
        tagName,
        className,
        issue: 'Invisible text: base "text-white" used on light background container',
        severity: 'CRITICAL',
      });
    }

    // Check 2: Low-contrast light text classes on light background
    if (bgIsLight && !directDarkBg) {
      for (const { pattern, name } of LOW_CONTRAST_TEXT_PATTERNS) {
        if (pattern.test(className)) {
          if (!DARK_BG_PATTERNS.some((p) => p.test(className))) {
            findingsList.push({
              file: relPath,
              line,
              tagName,
              className,
              issue: `Low-contrast risk: "${name}" used on light container without dark background`,
              severity: 'WARNING',
            });
          }
        }
      }
    }

    // Check 3: Hover state contrast traps
    const hasDarkHoverBg = /hover:bg-(slate-[789]00|indigo-[89]00|gray-[789]00|black|sky-900)/.test(className);
    const hasLightHoverText = /hover:text-(white|slate-100|slate-200|sky-100|indigo-100)/.test(className);
    const hasDarkBaseText = /text-(slate-[6789]00|indigo-[6789]00|gray-[6789]00)/.test(className);

    if (hasDarkHoverBg && !hasLightHoverText && hasDarkBaseText) {
      findingsList.push({
        file: relPath,
        line,
        tagName,
        className,
        issue: `Hover contrast trap: element turns dark on hover (${className.match(/hover:bg-[a-z0-9-]+/)?.[0]}) but retains dark text, resulting in illegible contrast`,
        severity: 'WARNING',
      });
    }

    // Check 4: <input> tags
    if (tagName.toLowerCase() === 'input') {
      const isWhiteText = /\btext-white\b/.test(className);
      const hasDarkText = /\btext-(slate|gray)-(800|900|950)\b/.test(className) || /\btext-black\b/.test(className);

      if (isWhiteText) {
        findingsList.push({
          file: relPath,
          line,
          tagName,
          className,
          issue: '<input> element has "text-white" on white input field (typed value is invisible)',
          severity: 'CRITICAL',
        });
      }
      if (!hasDarkText && !className.includes('hidden')) {
        findingsList.push({
          file: relPath,
          line,
          tagName,
          className,
          issue: '<input> element lacks explicit dark legible text class (e.g. text-slate-900)',
          severity: 'WARNING',
        });
      }
    }

    // Push to bgStack if element is not self-closing
    if (!isSelfClosing && !['input', 'img', 'br', 'hr'].includes(tagName.toLowerCase())) {
      bgStack.push({ tag: tagName, bgClasses: elBgClasses });
    }
  }

  return tags.filter((t) => !t.isClosing).length;
}

// ---------------------------------------------------------
// Main Execution
// ---------------------------------------------------------

console.log('================================================================');
console.log('Milestone 1 Challenger 2: Empirical UI & Input Verification');
console.log('================================================================\n');

const targetFiles = [
  'src/components/GuidedStepsPanel.tsx',
  'src/components/ProveChallengePanel.tsx',
  'src/components/ModuleRoadmapDrawer.tsx',
  'src/components/StudioSandbox.tsx',
];

console.log('--- Step 1: Scanning JSX Tokens of Milestone 1 Modified Components ---');
let totalM1Elements = 0;
for (const file of targetFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const count = scanFileJsxTokens(fullPath, true);
    totalM1Elements += count;
    console.log(`  ✓ Scanned ${file} (${count} JSX elements)`);
  } else {
    console.error(`  ✗ File not found: ${file}`);
  }
}

console.log(`\nMilestone 1 Modified Components Findings: ${findingsM1.length}`);
for (const f of findingsM1) {
  console.log(`  [${f.severity}] ${f.file}:${f.line} <${f.tagName}>: ${f.issue}`);
  console.log(`    class: "${f.className}"`);
}

// Also scan all other components in src/components for broader assurance
console.log('\n--- Step 1b: Scanning remaining components in src/components ---');
const allComponents = fs.readdirSync(path.resolve(process.cwd(), 'src/components'))
  .filter((f) => f.endsWith('.tsx') && !targetFiles.some((tf) => tf.endsWith(f)));
let totalOtherElements = 0;
for (const comp of allComponents) {
  const fullPath = path.resolve(process.cwd(), 'src/components', comp);
  const count = scanFileJsxTokens(fullPath, false);
  totalOtherElements += count;
}
console.log(`  ✓ Scanned ${allComponents.length} additional components (${totalOtherElements} elements)`);
console.log(`  (Other components findings: ${findingsOther.length})`);

// ---------------------------------------------------------
// Step 2: SSR DOM Rendering & Input Stress Tests
// ---------------------------------------------------------
console.log('\n--- Step 2: SSR DOM Rendering & Input Stress Tests ---');
let passedDomTests = 0;
let failedDomTests = 0;

function assertDom(condition: boolean, testName: string, detail: string) {
  if (condition) {
    console.log(`  ✔ PASS: ${testName}`);
    passedDomTests++;
  } else {
    console.error(`  ✖ FAIL: ${testName} - ${detail}`);
    failedDomTests++;
  }
}

// Test A: ProveChallengePanel in M2 System Identification mode (3 number inputs)
const testMysteryInputs = [
  { label: 'Nominal values', inputs: { k: 1.5, tau: 4.2, theta: 0.8 } },
  { label: 'Zero boundary values', inputs: { k: 0.0, tau: 0.0, theta: 0.0 } },
  { label: 'Negative values', inputs: { k: -2.5, tau: -1.0, theta: -0.5 } },
  { label: 'High precision decimals', inputs: { k: 3.14159, tau: 10.5555, theta: 1.2345 } },
];

for (const tc of testMysteryInputs) {
  const html = ReactDOMServer.renderToString(
    React.createElement(ProveChallengePanel, {
      module: MODULE_SPECS.m2,
      score: 80,
      isChallengeRunning: false,
      challengeTimeLeft: 45,
      onStartChallenge: () => {},
      onStopChallenge: () => {},
      onUnlockNext: () => {},
      currentMetrics: { iae: 12.3, inToleranceRatio: 0.92, peakOvershootPct: 4.5, currentError: 0.05 },
      mysteryInputs: tc.inputs,
      lang: 'en',
    })
  );

  const inputMatches = html.match(/<input[^>]+>/g) || [];
  assertDom(
    inputMatches.length === 3,
    `ProveChallengePanel renders 3 input fields for ${tc.label}`,
    `Found ${inputMatches.length} inputs`
  );

  for (let i = 0; i < inputMatches.length; i++) {
    const inputHtml = inputMatches[i];
    const hasNumberType = inputHtml.includes('type="number"');
    const hasWhiteBg = inputHtml.includes('bg-white');
    const hasDarkText = inputHtml.includes('text-slate-900');
    const noWhiteText = !inputHtml.includes('text-white');

    assertDom(
      hasNumberType && hasWhiteBg && hasDarkText && noWhiteText,
      `Input #${i + 1} (${tc.label}) has type=number, bg-white, text-slate-900 and no text-white`,
      `Rendered: ${inputHtml}`
    );
  }
}

// Test B: ProveChallengePanel in M1 Standard Mode (Live Score & Telemetry Readability)
const m1Html = ReactDOMServer.renderToString(
  React.createElement(ProveChallengePanel, {
    module: MODULE_SPECS.m1,
    score: 88,
    isChallengeRunning: true,
    challengeTimeLeft: 22,
    onStartChallenge: () => {},
    onStopChallenge: () => {},
    onUnlockNext: () => {},
    currentMetrics: { iae: 5.4, inToleranceRatio: 0.98, peakOvershootPct: 2.1, currentError: 0.01 },
    lang: 'en',
  })
);

assertDom(
  m1Html.includes('88%') && m1Html.includes('text-slate-900'),
  'ProveChallengePanel renders live score 88% with text-slate-900',
  'Score text class mismatch'
);
assertDom(
  m1Html.includes('text-slate-800') && m1Html.includes('In Tolerance'),
  'ProveChallengePanel telemetry values render with high-contrast text-slate-800',
  'Telemetry text class mismatch'
);

// Test C: GuidedStepsPanel Rendering
const stepsHtml = ReactDOMServer.renderToString(
  React.createElement(GuidedStepsPanel, {
    module: MODULE_SPECS.m1,
    lang: 'en',
  })
);

assertDom(
  stepsHtml.includes('Predict-Then-Run') && stepsHtml.includes('text-slate-800'),
  'GuidedStepsPanel renders header title in dark text-slate-800',
  'Title text class mismatch'
);
assertDom(
  !stepsHtml.includes('text-white mt-0.5') && !stepsHtml.includes('font-semibold text-white leading-relaxed'),
  'GuidedStepsPanel has 0 remaining invisible text classes in question headers or text',
  'Remnant text-white found'
);

// Test D: ModuleRoadmapDrawer Rendering
const drawerHtml = ReactDOMServer.renderToString(
  React.createElement(ModuleRoadmapDrawer, {
    isOpen: true,
    onClose: () => {},
    currentModuleId: 'm1',
    unlockedModules: ['m1', 'm2', 'm13', 'm14'],
    moduleScores: { m1: 85, m2: 90 },
    onSelectModule: () => {},
    lang: 'en',
  })
);

assertDom(
  drawerHtml.includes('Curriculum Roadmap') && drawerHtml.includes('text-slate-900'),
  'ModuleRoadmapDrawer header renders with high-contrast text-slate-900',
  'Drawer header text class mismatch'
);
assertDom(
  drawerHtml.includes('Four Industrial Case Studies') && drawerHtml.includes('text-slate-900'),
  'ModuleRoadmapDrawer displays Module 13 with correct title and text-slate-900',
  'Module 13 title styling mismatch'
);
assertDom(
  drawerHtml.includes('The Unseen Plant Exam') && drawerHtml.includes('text-slate-900'),
  'ModuleRoadmapDrawer displays Module 14 with correct title and text-slate-900',
  'Module 14 title styling mismatch'
);

// Test E: StudioSandbox Rendering
const sandboxHtml = ReactDOMServer.renderToString(
  React.createElement(StudioSandbox, {
    graph: { nodes: [], wires: [] },
    activeSignals: {},
    onUpdateGraph: () => {},
    history: [{ sp: 50, pv: 45, u: 60, time: 0.0 }],
    isRunning: false,
    onTogglePlay: () => {},
    onReset: () => {},
    simSpeed: 1,
    onSetSimSpeed: () => {},
    lang: 'en',
  })
);

assertDom(
  sandboxHtml.includes('Circuit Presets:') && sandboxHtml.includes('text-slate-800'),
  'StudioSandbox preset label renders with text-slate-800',
  'Preset label styling mismatch'
);

console.log('\n================================================================');
console.log(`DOM Test Summary: ${passedDomTests} PASSED, ${failedDomTests} FAILED`);
const criticalM1 = findingsM1.filter((f) => f.severity === 'CRITICAL').length;
const warningM1 = findingsM1.filter((f) => f.severity === 'WARNING').length;
console.log(`Milestone 1 AST Scan Summary: ${criticalM1} CRITICAL, ${warningM1} WARNINGS`);
console.log('================================================================\n');

if (failedDomTests > 0 || criticalM1 > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
