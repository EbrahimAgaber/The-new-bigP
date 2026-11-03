# Project: bigP Process Control Academy & Simulation Studio

## Architecture
- **Framework & Runtime**: React 19, TypeScript, Vite 8, Tailwind CSS 4, Motion 12, Lucide-React.
- **Pedagogical Layout Architecture (freeCodeCamp Pattern)**:
  - Global Header: Branding, 14-Module Selector dropdown, Progress/Mastery status, Bioprocess modal trigger, Language toggle, Reset.
  - Side-by-Side Split Workspace:
    - **Left Pane (Study Journey & Guidance)**:
      - 1. Module Title & Progression Badge
      - 2. Compact Mental Model & Real-World Analogy
      - 3. "See the Math" Formula Card (LaTeX equations with interactive symbol chips linked to chart/schematic)
      - 4. Step-by-Step Guided Instructions (Predict-Then-Run prompts with interactive checks and AI Tutor tips)
      - 5. Graded Prove Challenge Console (Objective, live scoring gauge, Commissioning Run button, Next Module unlock)
    - **Right Pane (Consolidated Simulation Studio Workbench)**:
      - 1. Studio Workbench Toolbar (Play/Pause, Reset, Speed $0.5\times-5\times$, Timer, Status)
      - 2. Tabbed Visualizer Deck:
        - Tab A: Flowsheet & Schematic (Adaptive equipment: Liquid Surge Tank, Heated Vessel, Bioreactor, or Industrial Plant P&ID + ISA Block Diagram)
        - Tab B: Digital Scope Chart (Multi-trace PV, SP, Error, CV with setpoint corridor)
        - Tab C: Specialized Analyzers (Bode & Root Locus for M9, RGA Matrix for M12, Industrial P&ID for M13/M14)
      - 3. Docked Consolidated Control Surface:
        - Loop Parameters (SP, Manual Output $u$, Drain/Disturbance)
        - Controller Tuning ($K_c, \tau_I, \tau_D$, Anti-Windup, Bumpless Transfer, Autotune Trigger)
        - Process Telemetry HUD (IAE, Overshoot, Chatter, Loop Status)
- **Engine Core**: Deterministic fixed-step ODE solver ($dt = 0.05\,\text{s}$) in `src/engine/simulationEngine.ts` with 20 block types, 4 industrial PID fixes, Arrhenius CSTR, and boiler swell inverse dynamics.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | FreeCodeCamp Split Layout | Unified side-by-side desktop layout pairing Study Journey (left) with Simulation Studio (right) without scattered containers | M2 | ORIGINAL_REQUEST §R1 |
| 2 | Elimination of Viewport Scroll Sprawl | Keep entire learning journey and interactive studio visible simultaneously on standard desktop viewports | M2 | ORIGINAL_REQUEST §R1 |
| 3 | Visual Contrast & Theme Remediation | Fix remnant dark-mode CSS classes (`text-white`) rendering text and input values invisible on white cards | M1 | Survey Findings |
| 4 | 14-Module Curriculum Metadata Sync | Correct `ROADMAP_MODULES_METADATA` so modules 1-14 have matching titles and all are marked `isPlayable: true` | M1 | ORIGINAL_REQUEST §R2 |
| 5 | Module 1: Why Control? | Tank liquid level drift vs manual valve throttling, mass balance, $e(t) = SP(t) - PV(t)$ | M1 | ORIGINAL_REQUEST §R2 |
| 6 | Module 2: How Processes Behave | FOPDT characterization ($K, \tau, \theta$), step testing, 63.2% rule | M1 | ORIGINAL_REQUEST §R2 |
| 7 | Module 3: The Feedback Loop | Sensor-comparator-controller topology, Direct vs Reverse action, signal wiring | M1 | ORIGINAL_REQUEST §R2 |
| 8 | Module 4: P Control | Proportional gain $K_c$, proportional band, steady-state offset gap | M1 | ORIGINAL_REQUEST §R2 |
| 9 | Module 5: I Control & Reset Action | Integral accumulation, zero steady-state offset, reset windup vulnerability | M1 | ORIGINAL_REQUEST §R2 |
| 10 | Module 6: D Control & Noise Dilemma | Rate anticipation, phase lead, noise differentiation, valve chatter index | M1 | ORIGINAL_REQUEST §R2 |
| 11 | Module 7: PID in Practice | 4 Industrial Fixes: Anti-windup, derivative-on-measurement, $\beta$ setpoint weighting, bumpless transfer | M1 | ORIGINAL_REQUEST §R2 |
| 12 | Module 8: PID Tuning & Relay Autotune | Åström–Hägglund relay autotuner, critical gain $K_u$, critical period $P_u$, ZN/Cohen-Coon/IMC | M1 | ORIGINAL_REQUEST §R2 |
| 13 | Module 9: Stability & Frequency Domain | Open-loop Bode response, Gain Margin, Phase Margin, Padé root locus s-plane migration | M1 | ORIGINAL_REQUEST §R2 |
| 14 | Module 10: Disturbance Rejection & Feedforward | Dynamic Lead-Lag compensation, wild-stream ratio control, pre-emptive rejection | M1 | ORIGINAL_REQUEST §R2 |
| 15 | Module 11: Advanced Architectures | Cascade control (master/slave speed separation), split-range valves, high/low override selectors | M1 | ORIGINAL_REQUEST §R2 |
| 16 | Module 12: Multivariable & RGA Decoupling | Bristol Relative Gain Array ($2 \times 2$ Wood-Berry distillation), loop pairing rules, dynamic decoupling | M1 | ORIGINAL_REQUEST §R2 |
| 17 | Module 13: Four Industrial Case Studies | Exothermic CSTR thermal runaway, heat exchanger delay, binary distillation purity, boiler drum swell | M1 | ORIGINAL_REQUEST §R2 |
| 18 | Module 14: Capstone Exam | End-to-end commissioning exam on unseen plant with unknown parameters and stress disturbances | M1 | ORIGINAL_REQUEST §R2 |
| 19 | Tabbed Visualizer Deck | Consolidate Flowsheet, Equipment, Scope, and Specialized Analyzers into accessible selectable workbench tabs | M3 | ORIGINAL_REQUEST §R3 |
| 20 | Docked Consolidated Control Surface | Cohesive panel grouping process setpoints, manual valve outputs, controller tuning, and disturbances | M3 | ORIGINAL_REQUEST §R3 |
| 21 | Adaptive Equipment Schematics | Dynamically render Surge Tank, Heated Vessel, Bioreactor, or Industrial P&ID schematic matching the active module | M3 | ORIGINAL_REQUEST §R3 |
| 22 | Animation RAF Performance Optimization | Replace high-frequency React state RAF loops in EquipmentVisualizer & BlockDiagramCanvas with CSS animations | M3 | Survey Findings |
| 23 | Evaluator Stale Closure Elimination | Fix live scoring closure over `latestPt` in `App.tsx` by consuming latest history point | M3 | Survey Findings |
| 24 | E2E Opaque-Box Test Suite | Comprehensive automated test suite covering all 14 modules (Tiers 1-4) verifying requirements independently | M4 | Acceptance Criteria |
| 25 | Adversarial Coverage Hardening | Tier 5 adversarial stress testing on simulation boundary conditions and edge cases | M4 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Curriculum Metadata & Data Alignment | Sync `ROADMAP_MODULES_METADATA` for all 14 modules (`isPlayable: true`, accurate titles), verify all 14 module specs, fix UI text contrast / `text-white` bugs | none | DONE (Gate PASS: 14 modules playable, contrast fixed, 36/36 unit/stress tests pass, clean audit) |
| M2 | FreeCodeCamp Split Study Journey Layout | Restructure `App.tsx` into unified two-pane side-by-side architecture (Left: Guided Journey; Right: Studio Container), eliminate scroll sprawl & scattered divs | M1 | DONE (Gate PASS Iteration 2: Stale closure resolved with `challengeScoreRef`, high-contrast headers/buttons WCAG AA compliant, canvas layout clipping eliminated) |
| M3 | Studio Workbench & Control Surface Consolidation | Implement tabbed visualizer deck (Flowsheet, Scope, Analyzers), docked consolidated control surface, adaptive schematics, RAF CSS animation fix, and stale closure fix | M1 | DONE (Gate PASS: RAF replaced by CSS keyframes, docked control rack synchronized with activeCaseStudyIndex, M13 4-case dynamic challenge scoring) |
| M4 | Final Integration, 100% E2E Test Suite & Adversarial Hardening | E2E test suite execution across Tiers 1-5, pass 100% of test cases (168/168 tests pass), build exits 0 with zero errors | M2, M3 | DONE (Gate PASS: 168/168 E2E tests passing across Tiers 1-5, 39/39 unit/stress tests passing, production bundle verified clean) |

## Interface Contracts
### Study Journey ↔ Simulation Studio (`App.tsx`)
- `activeModuleId: string` ('m1' through 'm14'): Selected curriculum module.
- `simulationState: SimulationResult`: Latest tick history, live values ($PV, SP, u, e$).
- `onParameterChange(param: string, value: number)`: Updates tuning parameters ($K_c, \tau_I, \tau_D$, etc.) or manual outputs.
- `onStartChallenge()`: Initiates graded 30s-120s commissioning run with deterministic disturbances.
- `challengeProgress: { isRunning: boolean, score: number, timeRemaining: number, passed: boolean }`: Telemetry fed back to Study Journey gauge.
- `activeHighlightSymbol: string | null`: Symbol hovered in "See the Math" formula, triggering visual pulse in equipment schematic or flowsheet.

### Code Layout
- `src/curriculum/`: Module specifications, roadmap metadata, pedagogical content (`modulesData.ts`).
- `src/components/`: Visualizer components (`EquipmentVisualizer.tsx`, `BlockDiagramCanvas.tsx`, `ScopeChart.tsx`, `IndustrialPidVisualizer.tsx`, `BodeViewer.tsx`, etc.).
- `src/components/journey/`: FreeCodeCamp study journey components (`MentalModelBanner.tsx`, `SeeTheMathCard.tsx`, `GuidedStepsPanel.tsx`, `ProveChallengePanel.tsx`).
- `src/components/studio/`: Consolidated studio workbench (`StudioToolbar.tsx`, `StudioVisualizerDeck.tsx`, `StudioControlSurface.tsx`).
- `src/engine/`: Physics simulation engine, ODE solvers, and industrial plant models.
- `tests/e2e/`: Requirement-driven opaque-box E2E test runner and test cases (Tiers 1-4).
