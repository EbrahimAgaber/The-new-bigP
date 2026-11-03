# Test Infrastructure & Verification Methodology

**Project**: bigP Process Control Academy & Simulation Studio  
**Document Version**: 1.0.0  
**Target Environment**: Node.js 22+, `tsx`, `node:test`, `node:assert/strict`

---

## 1. Testing Philosophy & Architecture

The testing infrastructure for `bigP` is architected as an **opaque-box, requirement-driven automated verification system**. Rather than testing ephemeral UI layout details or relying on brittle DOM scrapers, the E2E verification suite directly exercises the underlying mathematical contracts, deterministic physics ODE engines, curriculum circuits, industrial control algorithms, and analytical frequency/MIMO solvers.

### 1.1 Key Principles
1. **Mathematical & Physics Determinism**: All simulation dynamics run on a fixed-step numerical integration engine ($\Delta t = 0.05\,\text{s}$). Tests execute deterministic time sequences and assert exact or tightly-bounded mathematical outcomes.
2. **Authoritative Output Derivation**: Expected outputs are derived directly from:
   - First-principles physics & ODE balance equations ($dh/dt$, $dT/dt$, Arrhenius kinetics, Monod equations, RHP zero swell dynamics).
   - Documented curriculum specifications in `specifications.md` and `PROJECT.md`.
   - Classical control theory benchmarks (FOPDT $63.2\%$ rule, Ziegler-Nichols, IMC $\lambda$ tuning, Bode stability margins, Bristol Relative Gain Array).
3. **No Facades or Mocks**: All tests execute real engine instances (`createSimulationEngine`), real circuit graphs (`CircuitGraph`), and real block node behaviors.
4. **Zero Flakiness**: Because time is stepped deterministically rather than wall-clock sampled, tests run in milliseconds without race conditions, sleep timers, or external network dependencies.

---

## 2. 4-Tier Verification Hierarchy

The test suite is structured into four distinct tiers:

```
+-----------------------------------------------------------------------------------+
|                            TIER 4: REAL-WORLD SCENARIOS                           |
|  - CSTR Thermal Runaway Prevention        - Boiler Drum Swell Surge Rejection     |
|  - Heat Exchanger Throughput Step         - 2x2 Wood-Berry Distillation Decoupling|
|  - Capstone Unseen Plant 2-Minute Stress Commissioning Run                        |
+-----------------------------------------------------------------------------------+
|                        TIER 3: CROSS-FEATURE COMBINATIONS                         |
|  - Anti-Windup + Setpoint Step Dynamics   - Cascade Master/Slave Speed Ratios     |
|  - Relay Autotune + Unknown Transport Lag - Dynamic Feedforward + Lead-Lag Filter |
|  - MIMO Bristol RGA Pairing & Decoupling  - Bumpless Auto/Manual Mode Transfer    |
+-----------------------------------------------------------------------------------+
|                         TIER 2: BOUNDARY & CORNER CASES                           |
|  - Saturation Limits (0% and 100%)        - Pure Integrator vs Heavy Delay        |
|  - Direct vs Reverse Action Sign Inversion- Extreme High/Low Controller Gain Kc   |
|  - Zero Integral Reset Time Limit         - Extreme Sensor Noise Differentiation  |
+-----------------------------------------------------------------------------------+
|                            TIER 1: FEATURE COVERAGE                               |
|  - Modules 1-14 Primary Equations         - FOPDT Step Responses (K, Tau, Theta)  |
|  - ISA-5.1 PID Parallel/Ideal Modes       - Frequency Domain Bode Margins         |
|  - Root Locus s-Plane Pole Migration      - Challenge Evaluator Scoring Logic     |
+-----------------------------------------------------------------------------------+
```

### 2.1 Tier 1: Feature Coverage (>= 70 tests, >= 5 per module)
Verifies the nominal behavior (happy path) of every feature across all 14 curriculum modules:
- **Module 1 (Why Control?)**: Tank mass balance, error calculation $e(t) = SP(t) - PV(t)$, steady-state inflow/outflow matching, manual valve throttling, level drift under net imbalance.
- **Module 2 (How Processes Behave)**: First-order plus dead time (FOPDT) dynamics, steady-state gain $K$, time constant $\tau$ ($63.2\%$ rise), transport delay $\theta$, 2-parameter and 3-parameter plant identification.
- **Module 3 (Feedback Loop)**: Sensor-comparator-controller topology, error sign inversion, reverse-acting vs direct-acting loop convergence, feedback closed loop stability.
- **Module 4 (P Control)**: Proportional gain $K_c$, proportional band, steady-state offset gap $\text{Offset} = SP / (1 + K_c K)$, gain sweeping response, offset reduction with increasing $K_c$.
- **Module 5 (I Control & Reset)**: Integral error accumulation $\int e(\tau)d\tau$, zero steady-state offset elimination, reset time $\tau_I$, phase lag introduction, overshoot trade-off.
- **Module 6 (D Control & Noise)**: Rate of change anticipation $\tau_D de/dt$, peak overshoot damping, derivative filter $N$, high-frequency sensor noise behavior, actuator chatter metric.
- **Module 7 (PID in Practice)**: Back-calculation anti-windup, derivative on measurement $-dPV/dt$ (preventing derivative kick), setpoint weighting $\beta$, bumpless auto/manual transfer.
- **Module 8 (PID Tuning & Autotune)**: Åström–Hägglund relay limit-cycle oscillations, ultimate gain $K_u = 4d / (\pi a)$, ultimate period $P_u$, Ziegler-Nichols, Cohen-Coon, and IMC tuning calculations.
- **Module 9 (Stability & Frequency)**: Open-loop Bode frequency response $L(j\omega)$, gain crossover frequency $\omega_c$, phase crossover frequency $\omega_{180}$, Gain Margin ($GM$), Phase Margin ($PM$), Root Locus $s$-plane pole stability.
- **Module 10 (Feedforward & Ratio)**: Static feedforward gain $-K_d / K_p$, dynamic lead-lag compensation $(\tau_{lead}s + 1)/(\tau_{lag}s + 1)$, wild stream ratio control, transient error suppression.
- **Module 11 (Advanced Architectures)**: Inner slave and outer master cascade loops, speed ratio $\tau_{outer}/\tau_{inner} \ge 3$, split-range heating and cooling valves, high/low override selectors.
- **Module 12 (Multivariable & RGA)**: $2 \times 2$ transfer function matrix, Bristol Relative Gain Array calculation $\lambda_{11}$, loop pairing determination, dynamic cross-talk decoupling.
- **Module 13 (Industrial Case Studies)**: Exothermic CSTR Arrhenius thermal dynamics, shell-and-tube heat exchanger variable delay, binary distillation purity, boiler drum swell inverse response.
- **Module 14 (Capstone Exam)**: Complete unseen plant identification, tuning under disturbance, composite 3-part grading rubric (40% stability + 35% IAE + 25% actuator health).

### 2.2 Tier 2: Boundary & Corner Cases (>= 70 tests, >= 5 per module)
Verifies resilience against extreme, pathological, or boundary inputs across all 14 modules:
- Valve saturation at $0\%$ (fully closed) and $100\%$ (fully open).
- Negative disturbance shocks and supply pressure drop.
- Zero dead time ($\theta = 0$) and extreme dead time ($\theta \gg \tau$).
- Pure integrator plants ($C_v = 0$) without natural self-regulation.
- Extreme controller gains ($K_c \to 0$ and $K_c \to 50$).
- Fast integral reset times ($\tau_I \to 0.1\,\text{s}$) causing resonance.
- Unfiltered sensor noise ($\sigma = 5\%$) inducing derivative blowup.
- Saturated integrator tracking without anti-windup vs with anti-windup.
- Phase margin boundary ($PM \to 0^\circ$ and $GM \to 0\,\text{dB}$).
- Decoupler inversion and singular RGA matrices ($\lambda \to \infty$ or $\lambda < 0$).
- CSTR runaway trip threshold ($T_r \ge 365\,\text{K}$).
- Boiler drum flood ($L > 80\%$) and dryout ($L < 20\%$) limits.

### 2.3 Tier 3: Cross-Feature Combinations (Pairwise & Multi-Loop)
Verifies interactions between multiple coexisting features:
- Anti-windup combined with severe setpoint step + disturbance load.
- Cascade control under simultaneous inner supply pressure shock and outer setpoint change.
- Relay autotune executed in the presence of measurement noise and asymmetric load.
- Dynamic feedforward lead-lag coupled with closed-loop feedback PID.
- $2 \times 2$ MIMO distillation with simultaneous setpoint adjustments on distillate and bottoms products.
- Bumpless transfer transitioning while actuator is deep in saturation.

### 2.4 Tier 4: Real-World Industrial Application Scenarios
Simulates full end-to-end industrial scenarios over continuous time:
- **Scenario A**: Exothermic CSTR Thermal Runaway Prevention — Cooling water failure shock at $t=8\,\text{s}$, verifying jacket temperature control clamps core temperature safely below $365\,\text{K}$.
- **Scenario B**: Boiler Drum Steam Header Demand Surge — Severe $+25\%$ steam flow surge inducing immediate bubble swell followed by inventory drop; 3-element feedwater control maintains drum water balance.
- **Scenario C**: Shell-and-Tube Heat Exchanger Throughput Step — Feed throughput doubles, cutting effective residence time in half; dynamic feedforward adjusts steam valve proactively to maintain outlet temperature within $\pm 1.5^\circ\text{C}$.
- **Scenario D**: Multivariable Wood-Berry Distillation Column Decoupling — $+4\%$ distillate step applied; dynamic decoupling prevents bottoms purity from violating specification.
- **Scenario E**: Capstone Unseen Plant Exam — Full 40-second simulation under load disturbance; verifies stability ($|e| < 15$), cumulative IAE performance, and actuator travel index.

---

## 3. Feature Inventory Coverage Matrix

| Feature ID | Feature Name | Mapped Modules | Tier 1 Tests | Tier 2 Tests | Tier 3 Tests | Tier 4 Tests |
|---|---|---|---|---|---|---|
| F-01 | FreeCodeCamp Split Layout Architecture | Global | T1-M01-01 | T2-M01-01 | T3-01 | T4-01 |
| F-02 | Viewport & Scroll Containment | Global | T1-M01-02 | T2-M01-02 | T3-01 | T4-01 |
| F-03 | Visual Contrast & Theme Consistency | Global | T1-M01-03 | T2-M01-03 | T3-02 | T4-02 |
| F-04 | 14-Module Curriculum Metadata | M1-M14 | T1-M01-04..T1-M14-04 | T2-M01-04..T2-M14-04 | T3-02 | T4-05 |
| F-05 | Module 1: Why Control? | M1 | T1-M01 (5 tests) | T2-M01 (5 tests) | T3-01 | T4-01 |
| F-06 | Module 2: How Processes Behave | M2 | T1-M02 (5 tests) | T2-M02 (5 tests) | T3-03 | T4-03 |
| F-07 | Module 3: Feedback Loop & Action | M3 | T1-M03 (5 tests) | T2-M03 (5 tests) | T3-01 | T4-01 |
| F-08 | Module 4: P Control & Offset | M4 | T1-M04 (5 tests) | T2-M04 (5 tests) | T3-01 | T4-01 |
| F-09 | Module 5: I Control & Offset Elimination | M5 | T1-M05 (5 tests) | T2-M05 (5 tests) | T3-01 | T4-01 |
| F-10 | Module 6: D Control & Noise Dilemma | M6 | T1-M06 (5 tests) | T2-M06 (5 tests) | T3-03 | T4-05 |
| F-11 | Module 7: Industrial PID 4 Fixes | M7 | T1-M07 (5 tests) | T2-M07 (5 tests) | T3-01, T3-06 | T4-05 |
| F-12 | Module 8: Relay Autotuner & Rules | M8 | T1-M08 (5 tests) | T2-M08 (5 tests) | T3-03 | T4-05 |
| F-13 | Module 9: Stability & Bode Margins | M9 | T1-M09 (5 tests) | T2-M09 (5 tests) | T3-02 | T4-01 |
| F-14 | Module 10: Dynamic Feedforward & Ratio | M10 | T1-M10 (5 tests) | T2-M10 (5 tests) | T3-04 | T4-03 |
| F-15 | Module 11: Cascade, Split, Override | M11 | T1-M11 (5 tests) | T2-M11 (5 tests) | T3-02 | T4-01 |
| F-16 | Module 12: MIMO 2x2 & RGA Decoupling | M12 | T1-M12 (5 tests) | T2-M12 (5 tests) | T3-05 | T4-04 |
| F-17 | Module 13: 4 Industrial Case Studies | M13 | T1-M13 (5 tests) | T2-M13 (5 tests) | T3-04 | T4-01..T4-04 |
| F-18 | Module 14: Capstone Unseen Plant Exam | M14 | T1-M14 (5 tests) | T2-M14 (5 tests) | T3-06 | T4-05 |
| F-19 | Tabbed Visualizer Deck | Studio | T1-M08-05, T1-M09-05 | T2-M09-05 | T3-05 | T4-04 |
| F-20 | Docked Control Surface | Studio | T1-M01-05..T1-M14-05 | T2-M01-05..T2-M14-05 | T3-01 | T4-05 |
| F-21 | Adaptive Equipment Schematics | Studio | T1-M01-01, T1-M06-01 | T2-M13-01 | T3-02 | T4-01 |
| F-22 | Animation RAF Optimization | Engine | T1-M01-02 | T2-M01-02 | T3-01 | T4-05 |
| F-23 | Evaluator Closure Elimination | Engine | T1-M13-05, T1-M14-05 | T2-M13-05 | T3-06 | T4-05 |
| F-24 | E2E Opaque-Box Test Suite | Infrastructure | Self-covered | Self-covered | Self-covered | Self-covered |
| F-25 | Adversarial Coverage Hardening | Engine | Self-covered in T2 & T4 | Self-covered in T2 & T4 | Self-covered | Self-covered |

---

## 4. Execution & Verification Commands

The test suite is executable via the unified test runner:
```powershell
npx tsx tests/e2e/runner.ts
```

Alternatively, individual tiers can be executed using Node's native test runner:
```powershell
npx tsx --test tests/e2e/tier1_feature_coverage.test.ts
npx tsx --test tests/e2e/tier2_boundary_corner.test.ts
npx tsx --test tests/e2e/tier3_cross_feature.test.ts
npx tsx --test tests/e2e/tier4_real_world.test.ts
```

### Expected Output Summary
- **Exit Code**: `0`
- **Tiers Executed**: 4
- **Total Tests**: $\ge 150$ tests
- **Duration**: $< 5000\,\text{ms}$
