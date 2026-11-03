/**
 * Deterministic Fixed-Step Simulation Engine (bigp Milestone 0, 1 & 2)
 * Time step: dt = 0.05 seconds
 * Features:
 * - Standard ISA PID form with live term export (uP, uI, uD)
 * - Industrial Fixes: Anti-Windup back-calculation, Derivative on Measurement,
 *   Setpoint Weighting (beta), Auto/Manual Bumpless Transfer
 * - Actuator Saturation & Valve Wear Accumulator
 * - Relay Feedback Autotuner (Ziegler-Nichols, Cohen-Coon, IMC)
 * - Advanced Metrics Evaluator (IAE, ISE, Rise Time, Settling Time, Chatter)
 */

import {
  BlockNode,
  BlockState,
  CircuitGraph,
  ScopeDataPoint,
  SimulationResult,
  BodeAnalysis,
  BodeDataPoint,
  RootLocusAnalysis,
  RootLocusPole,
  RgaAnalysis,
} from '../types/engine';

export const DT = 0.05; // 50ms fixed time step

// Gaussian noise generator using Box-Muller transform
function generateGaussianNoise(sigma: number): number {
  if (sigma <= 0) return 0;
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function computeBodeAnalysis(
  kc: number = 1.0,
  ti: number = 0,
  td: number = 0,
  k: number = 1.0,
  tau: number = 3.0,
  theta: number = 1.0
): BodeAnalysis {
  const points: BodeDataPoint[] = [];
  const minOmega = 0.02;
  const maxOmega = 30.0;
  const numPoints = 60;
  const logStep = (Math.log10(maxOmega) - Math.log10(minOmega)) / (numPoints - 1);

  let omega180: number | undefined = undefined;
  let omegaC: number | undefined = undefined;
  let magAt180: number | undefined = undefined;
  let phaseAtC: number | undefined = undefined;

  for (let i = 0; i < numPoints; i++) {
    const omega = Math.pow(10, Math.log10(minOmega) + i * logStep);

    // Controller Gc(j*omega)
    let gcReal = kc;
    let gcImag = 0;
    if (ti > 0.001) {
      gcImag -= kc / (ti * omega);
    }
    if (td > 0) {
      gcImag += kc * (td * omega);
    }
    const gcMag = Math.sqrt(gcReal * gcReal + gcImag * gcImag);
    const gcPhase = Math.atan2(gcImag, gcReal);

    // Process Gp(j*omega) = K / (1 + j*omega*tau) * e^(-j*omega*theta)
    const gpMag = Math.abs(k) / Math.sqrt(1 + Math.pow(omega * tau, 2));
    const gpPhase = -Math.atan2(omega * tau, 1);
    const delayPhase = -omega * theta;

    const totalMag = gcMag * gpMag;
    const magDb = +(20 * Math.log10(Math.max(1e-6, totalMag))).toFixed(2);

    let phaseDeg = +((gcPhase + gpPhase + delayPhase) * (180 / Math.PI)).toFixed(2);
    while (phaseDeg > 0) phaseDeg -= 360;

    points.push({
      omega: +omega.toFixed(3),
      magDb,
      phaseDeg,
    });

    if (i > 0) {
      const prev = points[i - 1];
      if (prev.phaseDeg >= -180 && phaseDeg < -180 && omega180 === undefined) {
        const frac = (-180 - prev.phaseDeg) / (phaseDeg - prev.phaseDeg);
        omega180 = +(prev.omega + frac * (omega - prev.omega)).toFixed(3);
        magAt180 = +(prev.magDb + frac * (magDb - prev.magDb)).toFixed(2);
      }
      if (prev.magDb >= 0 && magDb < 0 && omegaC === undefined) {
        const frac = (0 - prev.magDb) / (magDb - prev.magDb);
        omegaC = +(prev.omega + frac * (omega - prev.omega)).toFixed(3);
        phaseAtC = +(prev.phaseDeg + frac * (phaseDeg - prev.phaseDeg)).toFixed(2);
      }
    }
  }

  const lastPt = points[points.length - 1];
  if (omega180 === undefined && lastPt.phaseDeg <= -180) {
    omega180 = lastPt.omega;
    magAt180 = lastPt.magDb;
  }

  const gainMarginDb = magAt180 !== undefined ? +(-magAt180).toFixed(2) : undefined;
  const phaseMarginDeg = phaseAtC !== undefined ? +(180 + phaseAtC).toFixed(2) : undefined;

  const ultimateGain = gainMarginDb !== undefined && gainMarginDb !== 0
    ? +(kc * Math.pow(10, gainMarginDb / 20)).toFixed(2)
    : undefined;
  const ultimatePeriod = omega180 ? +( (2 * Math.PI) / omega180 ).toFixed(2) : undefined;

  const isStable = (gainMarginDb === undefined || gainMarginDb > 0) &&
                   (phaseMarginDeg === undefined || phaseMarginDeg > 0);

  return {
    points,
    omega180,
    omegaC,
    gainMarginDb,
    phaseMarginDeg,
    ultimateGain,
    ultimatePeriod,
    isStable,
  };
}

export function computeRootLocusAnalysis(
  kc: number = 1.0,
  k: number = 1.0,
  tau: number = 3.0,
  theta: number = 1.0
): RootLocusAnalysis {
  const th = Math.max(0.1, theta);
  const t = Math.max(0.1, tau);
  const loopGain = Math.max(0.01, k * kc);

  const a = (t * th) / 2;
  const b = t + th / 2 - loopGain * (th / 2);
  const c = 1 + loopGain;

  const disc = b * b - 4 * a * c;
  const poles: RootLocusPole[] = [];

  if (disc >= 0) {
    const s1 = (-b + Math.sqrt(disc)) / (2 * a);
    const s2 = (-b - Math.sqrt(disc)) / (2 * a);
    poles.push({ real: +s1.toFixed(3), imag: 0 });
    poles.push({ real: +s2.toFixed(3), imag: 0 });
  } else {
    const realPart = -b / (2 * a);
    const imagPart = Math.sqrt(-disc) / (2 * a);
    poles.push({ real: +realPart.toFixed(3), imag: +imagPart.toFixed(3) });
    poles.push({ real: +realPart.toFixed(3), imag: +(-imagPart).toFixed(3) });
  }

  const zeroPade: RootLocusPole = { real: +(2 / th).toFixed(3), imag: 0 };
  const maxReal = Math.max(...poles.map((p) => p.real));

  let stability: 'stable' | 'marginal' | 'unstable' = 'stable';
  if (maxReal > 0.05) {
    stability = 'unstable';
  } else if (Math.abs(maxReal) <= 0.05) {
    stability = 'marginal';
  } else {
    stability = 'stable';
  }

  const dampingRatio = +(b / (2 * Math.sqrt(Math.max(1e-4, a * c)))).toFixed(2);
  const naturalFrequency = +(Math.sqrt(Math.max(1e-4, c / a))).toFixed(2);

  return {
    poles,
    zeros: [zeroPade],
    stability,
    dampingRatio,
    naturalFrequency,
  };
}

export function computeRgaAnalysis(
  k11: number = 1.0,
  k12: number = 0.5,
  k21: number = 0.4,
  k22: number = 1.0
): RgaAnalysis {
  const denom = k11 * k22;
  let lambda11 = 1.0;
  if (Math.abs(denom) > 1e-6) {
    const ratio = (k12 * k21) / denom;
    if (Math.abs(1 - ratio) > 1e-6) {
      lambda11 = 1 / (1 - ratio);
    }
  }

  const lambda12 = 1 - lambda11;
  const lambda21 = 1 - lambda11;
  const lambda22 = lambda11;

  let recommendedPairing: 'straight' | 'cross' = 'straight';
  let pairingWarning: string | undefined = undefined;
  let pairingWarningAr: string | undefined = undefined;

  if (lambda11 >= 0.5 && lambda11 <= 2.0) {
    recommendedPairing = 'straight';
  } else if (lambda11 > 0 && lambda11 < 0.5) {
    recommendedPairing = 'cross';
    pairingWarning = 'Pairing u1->y2 and u2->y1 recommended to avoid fighting loops.';
    pairingWarningAr = 'يوصى بربط u1->y2 و u2->y1 لتجنب تعارض الحلقات.';
  } else if (lambda11 < 0) {
    recommendedPairing = 'cross';
    pairingWarning = 'Negative RGA (lambda11 < 0): System will destabilize if the other loop is put in manual!';
    pairingWarningAr = 'قيمة سالبة في RGA: ستفقد المنظومة استقرارها إذا تحولت الحلقة الأخرى إلى الوضع اليدوي!';
  } else {
    recommendedPairing = 'straight';
  }

  return {
    lambda11: +lambda11.toFixed(3),
    lambda12: +lambda12.toFixed(3),
    lambda21: +lambda21.toFixed(3),
    lambda22: +lambda22.toFixed(3),
    recommendedPairing,
    pairingWarning,
    pairingWarningAr,
  };
}

export interface EngineInstance {
  graph: CircuitGraph;
  time: number;
  states: Record<string, BlockState>;
  outputs: Record<string, number>;
  history: ScopeDataPoint[];
  metrics: SimulationResult['metrics'];
  step: (externalDisturbances?: Record<string, number>) => SimulationResult;
  reset: () => void;
  setGraph: (newGraph: CircuitGraph) => void;
  updateBlockConfig: (blockId: string, partialConfig: any) => void;
  runMultipleSteps: (stepCount: number) => SimulationResult;
  startAutotune: (blockId?: string) => void;
  stopAutotune: (blockId?: string) => void;
}

export function createSimulationEngine(initialGraph: CircuitGraph): EngineInstance {
  let graph = JSON.parse(JSON.stringify(initialGraph)) as CircuitGraph;
  let time = 0;
  let states: Record<string, BlockState> = {};
  let outputs: Record<string, number> = {};
  let history: ScopeDataPoint[] = [];

  // Metrics trackers
  let iae = 0;
  let ise = 0;
  let stepsInTolerance = 0;
  let totalSteps = 0;
  let peakValue = -Infinity;
  let settledTime: number | undefined = undefined;
  let riseTime10: number | undefined = undefined;
  let riseTime90: number | undefined = undefined;
  let calculatedRiseTime: number | undefined = undefined;
  let cumulativeValveTravel = 0;
  let lastRecordedValveU: number | null = null;
  let initialSP = 0;

  function initStates() {
    states = {};
    outputs = {};
    time = 0;
    history = [];
    iae = 0;
    ise = 0;
    stepsInTolerance = 0;
    totalSteps = 0;
    peakValue = -Infinity;
    settledTime = undefined;
    riseTime10 = undefined;
    riseTime90 = undefined;
    calculatedRiseTime = undefined;
    cumulativeValveTravel = 0;
    lastRecordedValveU = null;

    for (const node of graph.nodes) {
      const cfg = node.config || {};
      const st: BlockState = {};

      switch (node.type) {
        case 'Step':
          outputs[node.id] = cfg.initialValue ?? 0;
          initialSP = cfg.stepValue ?? 50;
          break;

        case 'Constant':
          outputs[node.id] = cfg.value ?? 0;
          initialSP = cfg.value ?? 50;
          break;

        case 'Tank':
          st.level = cfg.initialLevel ?? 0;
          outputs[node.id] = st.level;
          break;

        case 'FirstOrder':
          st.y = cfg.initialOutput ?? 0;
          outputs[node.id] = st.y;
          break;

        case 'DeadTime': {
          const delay = Math.max(0, cfg.deadTime ?? 1.0);
          const bufSize = Math.max(1, Math.round(delay / DT));
          const initialVal = cfg.initialBufferValue ?? 0;
          st.ringBuffer = new Array(bufSize).fill(initialVal);
          st.ringIndex = 0;
          outputs[node.id] = initialVal;
          break;
        }

        case 'HeatedVessel':
          st.temp = cfg.ambientTemp ?? 20;
          st.ringBuffer = new Array(Math.max(1, Math.round((cfg.transportDelay ?? 1.0) / DT))).fill(st.temp);
          st.ringIndex = 0;
          outputs[node.id] = st.temp;
          break;

        case 'Bioreactor':
          st.biomass = cfg.biomassInitial ?? 0.5;
          st.substrate = cfg.substrateInitial ?? 15.0;
          st.dissolvedOxygen = cfg.doInitial ?? 100.0;
          st.temp = cfg.tempInitial ?? 37.0;
          outputs[node.id] = st.dissolvedOxygen;
          break;

        case 'OnOff':
          st.onOffState = false;
          outputs[node.id] = cfg.offValue ?? 0;
          break;

        case 'P':
        case 'PI':
        case 'PID':
          st.integral = 0;
          st.lastError = 0;
          st.lastDerivative = 0;
          st.lastPv = 0;
          st.up = 0;
          st.ui = 0;
          st.ud = 0;
          st.rawU = cfg.bias ?? 0;
          st.isSaturated = false;
          outputs[node.id] = cfg.bias ?? 0;
          break;

        case 'Autotune':
          st.autotune = {
            active: false,
            step: 'idle',
            relaySign: 1,
            peaks: [],
            valleys: [],
          };
          outputs[node.id] = 0;
          break;

        case 'LeadLag':
          st.y = cfg.initialOutput ?? 0;
          st.lastLeadLagIn = 0;
          outputs[node.id] = st.y;
          break;

        case 'FeedForward':
          outputs[node.id] = 0;
          break;

        case 'Ratio':
          outputs[node.id] = 0;
          break;

        case 'SplitRange':
          st.coolValve = 0;
          st.heatValve = 0;
          outputs[node.id] = 0;
          break;

        case 'Selector':
          st.activeChannel = 1;
          outputs[node.id] = 0;
          break;

        case 'MIMOPlant':
          st.y1 = 0;
          st.y2 = 0;
          st.y11 = 0;
          st.y12 = 0;
          st.y21 = 0;
          st.y22 = 0;
          outputs[node.id] = 0;
          break;

        case 'Decoupler':
          st.y1 = 0;
          st.y2 = 0;
          outputs[node.id] = 0;
          break;

        case 'CSTRPlant':
          st.reactorTemp = cfg.feedTemp ?? 350.0;
          st.jacketTemp = 320.0;
          outputs[node.id] = st.reactorTemp;
          break;

        case 'HeatExchangerPlant':
          st.hexOutletTemp = 65.0;
          st.hexDeadTimeBuffer = new Array(Math.max(1, Math.round(2.0 / DT))).fill(65.0);
          outputs[node.id] = st.hexOutletTemp;
          break;

        case 'DistillationColumnPlant':
          st.distillatePurity = 98.0;
          st.bottomsPurity = 2.0;
          outputs[node.id] = st.distillatePurity;
          break;

        case 'BoilerDrumPlant':
          st.boilerLevel = 50.0;
          st.boilerSwellState = 0.0;
          st.boilerIntLevel = 50.0;
          outputs[node.id] = st.boilerLevel;
          break;
        case 'Cascade':
          st.innerU = cfg.bias ?? 0;
          st.outerSP = 50;
          st.integral = 0;
          outputs[node.id] = cfg.bias ?? 0;
          break;

        case 'BodeViewer':
        case 'RootLocusViewer':
        case 'RGACalculator':
          outputs[node.id] = 0;
          break;

        default:
          outputs[node.id] = 0;
          break;
      }

      states[node.id] = st;
    }
  }

  initStates();

  function getInputSignal(nodeId: string, portIndex = 0, defaultVal = 0): number {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node || !node.inputs[portIndex]) return defaultVal;
    const targetPortId = node.inputs[portIndex].id;

    const wire = graph.wires.find(
      (w) => w.toBlockId === nodeId && w.toPortId === targetPortId
    );
    if (!wire) return defaultVal;

    return outputs[wire.fromBlockId] ?? defaultVal;
  }

  function step(externalDisturbances: Record<string, number> = {}): SimulationResult {
    // 1. Process sources & external time-dependent signals
    for (const node of graph.nodes) {
      const cfg = node.config || {};
      if (node.type === 'Step') {
        const stepTime = cfg.stepTime ?? 2.0;
        const initVal = cfg.initialValue ?? 0;
        const stepVal = cfg.stepValue ?? 50;
        outputs[node.id] = time >= stepTime ? stepVal : initVal;
      } else if (node.type === 'Constant') {
        outputs[node.id] = cfg.value ?? 0;
      }
    }

    // Capture primary SP and PV for controller reference
    let currentSP = 0;
    let currentPV = 0;
    const spNode = graph.nodes.find((n) => n.type === 'Step' || n.type === 'Constant');
    if (spNode) currentSP = outputs[spNode.id] ?? 0;

    const plantNode = graph.nodes.find((n) =>
      ['Tank', 'FirstOrder', 'HeatedVessel', 'Bioreactor', 'CSTRPlant', 'HeatExchangerPlant', 'DistillationColumnPlant', 'BoilerDrumPlant'].includes(n.type)
    );
    if (plantNode) currentPV = states[plantNode.id]?.reactorTemp ?? states[plantNode.id]?.hexOutletTemp ?? states[plantNode.id]?.distillatePurity ?? states[plantNode.id]?.boilerLevel ?? states[plantNode.id]?.level ?? states[plantNode.id]?.y ?? states[plantNode.id]?.temp ?? outputs[plantNode.id] ?? 0;

    // 2. Algebraic loop iteration (multi-pass to resolve feeds, sums, controllers, and valves)
    for (let pass = 0; pass < 3; pass++) {
      for (const node of graph.nodes) {
        const cfg = node.config || {};
        const st = states[node.id];

        switch (node.type) {
          case 'Sum': {
            const signs = cfg.signs ?? ['+', '-'];
            let sumVal = 0;
            for (let i = 0; i < node.inputs.length; i++) {
              const sig = getInputSignal(node.id, i, 0);
              const sign = signs[i] ?? '+';
              sumVal += sign === '+' ? sig : -sig;
            }
            outputs[node.id] = sumVal;
            break;
          }

          case 'Gain': {
            const inSig = getInputSignal(node.id, 0, 0);
            outputs[node.id] = inSig * (cfg.value ?? 1.0);
            break;
          }

          case 'OnOff': {
            const err = getInputSignal(node.id, 0, 0);
            const deadband = cfg.deadband ?? 2.0;
            const onVal = cfg.onValue ?? 100;
            const offVal = cfg.offValue ?? 0;

            if (err > deadband / 2) {
              st.onOffState = true;
            } else if (err < -deadband / 2) {
              st.onOffState = false;
            }
            outputs[node.id] = st.onOffState ? onVal : offVal;
            break;
          }

          case 'P': {
            const err = getInputSignal(node.id, 0, 0);
            const kc = cfg.kc ?? 2.0;
            const bias = cfg.bias ?? 0;
            const action = cfg.action ?? 'reverse';
            const effectiveError = action === 'reverse' ? err : -err;
            const u = bias + kc * effectiveError;
            const min = cfg.outputMin ?? 0;
            const max = cfg.outputMax ?? 100;
            st.up = kc * effectiveError;
            st.ui = 0;
            st.ud = 0;
            st.rawU = u;
            st.isSaturated = u < min || u > max;
            outputs[node.id] = Math.min(max, Math.max(min, u));
            break;
          }

          case 'PI':
          case 'PID': {
            // Standard Industrial ISA PID Implementation
            const err = getInputSignal(node.id, 0, 0);
            const kc = cfg.kc ?? 2.0;
            const ti = Math.max(0.01, cfg.ti ?? 8.0);
            const td = cfg.td ?? 0.0;
            const N = cfg.derivativeFilterN ?? 10;
            const bias = cfg.bias ?? 0;
            const action = cfg.action ?? 'reverse';
            const beta = cfg.setpointWeighting ?? 1.0; // Setpoint weighting
            const isManual = cfg.mode === 'MANUAL';
            const manualU = cfg.manualOutput ?? 50;
            const min = cfg.outputMin ?? 0;
            const max = cfg.outputMax ?? 100;

            // 1. Proportional term with Setpoint Weighting beta:
            // e_P = beta * SP - PV
            let effectiveError = action === 'reverse' ? err : -err;
            if (cfg.setpointWeighting !== undefined && spNode) {
              const spVal = outputs[spNode.id] ?? 0;
              const pvVal = currentPV;
              const weightedErr = beta * spVal - pvVal;
              effectiveError = action === 'reverse' ? weightedErr : -weightedErr;
            }
            const uP = kc * effectiveError;

            // 2. Derivative term: Standard or Derivative on Measurement
            let uD = 0;
            let dSlope = 0;
            if (node.type === 'PID' && td > 0) {
              if (cfg.derivativeOnMeasurement) {
                // Derivative on Measurement: -dPV/dt
                const pvVal = currentPV;
                const lastPv = st.lastPv ?? pvVal;
                dSlope = -(pvVal - lastPv) / DT;
                st.lastPv = pvVal;
              } else {
                // Derivative on Error: de/dt
                const lastErr = st.lastError ?? effectiveError;
                dSlope = (effectiveError - lastErr) / DT;
              }

              // Low-pass filtered derivative: D_f = D_f + alpha * (Kc * Td * dSlope - D_f)
              const alpha = DT / ((td / N) + DT);
              const targetD = kc * td * dSlope;
              const newD = (st.lastDerivative ?? 0) + alpha * (targetD - (st.lastDerivative ?? 0));
              st.lastDerivative = newD;
              uD = newD;
            }
            st.lastError = effectiveError;

            // 3. Integral term & Bumpless Transfer / Anti-Windup
            if (isManual) {
              // BUMPLESS TRANSFER: In manual mode, tracking integral ensures zero jump on auto switch
              // u_manual = bias + uP + uI + uD  =>  uI = u_manual - bias - uP - uD
              st.integral = manualU - bias - uP - uD;
              const uI = st.integral;
              st.up = uP;
              st.ui = uI;
              st.ud = uD;
              st.rawU = manualU;
              st.isSaturated = manualU <= min || manualU >= max;
              outputs[node.id] = manualU;
            } else {
              // AUTO mode calculation
              const currentIntegral = st.integral ?? 0;
              const uI = currentIntegral;
              const uRaw = bias + uP + uI + uD;
              const uClamped = Math.min(max, Math.max(min, uRaw));
              const isSat = uRaw > max || uRaw < min;

              // Back-Calculation Anti-Windup:
              if (cfg.antiWindup) {
                // Tracking back-calculation: e_sat = u_clamped - u_raw
                const eSat = uClamped - uRaw;
                const Tt = Math.max(0.1, ti); // Tracking time constant
                const dIntegral = ((kc / ti) * effectiveError + (1 / Tt) * eSat) * DT;
                st.integral = currentIntegral + dIntegral;
              } else {
                // Textbook PID (No Anti-Windup): integral continues accumulating indefinitely!
                st.integral = currentIntegral + ((kc / ti) * effectiveError) * DT;
              }

              st.up = uP;
              st.ui = uI;
              st.ud = uD;
              st.rawU = uRaw;
              st.isSaturated = isSat;
              outputs[node.id] = uClamped;
            }
            break;
          }

          case 'Valve': {
            const inSig = getInputSignal(node.id, 0, 0);
            const scale = cfg.scalingFactor ?? 1.0;
            const min = cfg.outputMin ?? 0;
            const max = cfg.outputMax ?? 100;
            const clamped = Math.min(max, Math.max(min, inSig * scale));

            // Accumulate valve chatter / travel
            if (lastRecordedValveU !== null) {
              cumulativeValveTravel += Math.abs(clamped - lastRecordedValveU);
            }
            lastRecordedValveU = clamped;

            outputs[node.id] = clamped;
            break;
          }

          case 'Sensor': {
            const inSig = getInputSignal(node.id, 0, 0);
            const scale = cfg.scalingFactor ?? 1.0;
            outputs[node.id] = inSig * scale;
            break;
          }

          case 'Saturation': {
            const inSig = getInputSignal(node.id, 0, 0);
            const min = cfg.min ?? 0;
            const max = cfg.max ?? 100;
            const clamped = Math.min(max, Math.max(min, inSig));
            st.isSaturated = inSig < min || inSig > max;
            outputs[node.id] = clamped;
            break;
          }

          case 'Noise': {
            const inSig = getInputSignal(node.id, 0, 0);
            const sigma = cfg.noiseAmp ?? 0.5;
            const jitter = generateGaussianNoise(sigma);
            outputs[node.id] = inSig + jitter;
            break;
          }

          case 'Autotune': {
            // Åström–Hägglund Relay Feedback Autotuner
            const sp = getInputSignal(node.id, 0, currentSP);
            const pv = getInputSignal(node.id, 1, currentPV);
            const d = cfg.relayAmplitude ?? 15.0; // Relay height
            const at = st.autotune;

            if (at && at.active) {
              const err = sp - pv;
              // Relay switching:
              if (err > 0.5) at.relaySign = 1;
              else if (err < -0.5) at.relaySign = -1;

              const relayU = 50 + at.relaySign * d;
              outputs[node.id] = Math.min(100, Math.max(0, relayU));

              // Peak / valley detection for period and amplitude
              if (history.length > 2) {
                const prevPv = history[history.length - 1].pv;
                const prevPrevPv = history[history.length - 2].pv;
                // Local peak
                if (prevPv > prevPrevPv && prevPv > pv && prevPv > sp + 1) {
                  at.peaks.push({ time, val: prevPv });
                }
                // Local valley
                if (prevPv < prevPrevPv && prevPv < pv && prevPv < sp - 1) {
                  at.valleys.push({ time, val: prevPv });
                }
              }

              // After 3 full oscillation cycles, compute Pu and Ku
              if (at.peaks.length >= 3 && at.valleys.length >= 3) {
                const p1 = at.peaks[at.peaks.length - 2];
                const p2 = at.peaks[at.peaks.length - 1];
                const Pu = p2.time - p1.time;
                const avgAmp = (p2.val - at.valleys[at.valleys.length - 1].val) / 2;
                const Ku = (4 * d) / (Math.PI * Math.max(0.1, avgAmp));

                at.pu = +Pu.toFixed(2);
                at.ku = +Ku.toFixed(2);
                at.step = 'done';
                at.active = false;

                // Populate tuning rules
                at.suggestedParams = {
                  kc: +(0.6 * Ku).toFixed(2),
                  ti: +(0.5 * Pu).toFixed(2),
                  td: +(0.125 * Pu).toFixed(2),
                };
              }
            } else {
              outputs[node.id] = 0;
            }
            break;
          }

          case 'DeadTime': {
            if (st.ringBuffer && st.ringBuffer.length > 0) {
              outputs[node.id] = st.ringBuffer[st.ringIndex ?? 0];
            }
            break;
          }

          case 'Tank':
            outputs[node.id] = st.level ?? 0;
            break;

          case 'FirstOrder':
            outputs[node.id] = st.y ?? 0;
            break;

          case 'HeatedVessel':
            outputs[node.id] = st.temp ?? 20;
            break;

          case 'Bioreactor':
            outputs[node.id] = st.dissolvedOxygen ?? 100;
            break;

          case 'Ratio': {
            const wildFlow = getInputSignal(node.id, 0, 0);
            const ratio = cfg.ratioTarget ?? 1.0;
            outputs[node.id] = +(wildFlow * ratio).toFixed(2);
            break;
          }

          case 'LeadLag':
          case 'FeedForward': {
            // Evaluated dynamically in state updates; algebraic pass provides current value
            outputs[node.id] = st.y ?? (node.type === 'FeedForward' ? (cfg.ffGain ?? -1.0) * getInputSignal(node.id, 0, 0) : getInputSignal(node.id, 0, 0));
            break;
          }

          case 'SplitRange': {
            const u = getInputSignal(node.id, 0, 50);
            const split = cfg.splitPoint ?? 50;
            const db = 2.0;

            // Heating Valve (0 to 100%): active below split
            let heat = 0;
            if (u < split - db / 2) {
              heat = ((split - db / 2 - u) / Math.max(1, split - db / 2)) * 100;
            }

            // Cooling Valve (0 to 100%): active above split
            let cool = 0;
            if (u > split + db / 2) {
              cool = ((u - (split + db / 2)) / Math.max(1, 100 - (split + db / 2))) * 100;
            }

            st.heatValve = +Math.min(100, Math.max(0, heat)).toFixed(1);
            st.coolValve = +Math.min(100, Math.max(0, cool)).toFixed(1);
            outputs[node.id] = st.heatValve; // primary output
            break;
          }

          case 'Selector': {
            const u1 = getInputSignal(node.id, 0, 0);
            const u2 = getInputSignal(node.id, 1, 0);
            const type = cfg.selectorType ?? 'min';

            if (type === 'min') {
              st.activeChannel = u1 <= u2 ? 1 : 2;
              outputs[node.id] = Math.min(u1, u2);
            } else {
              st.activeChannel = u1 >= u2 ? 1 : 2;
              outputs[node.id] = Math.max(u1, u2);
            }
            break;
          }

          case 'Decoupler': {
            const u1 = getInputSignal(node.id, 0, 0);
            const u2 = getInputSignal(node.id, 1, 0);
            const k11 = cfg.k11 ?? 12.8;
            const k12 = cfg.k12 ?? -18.9;
            const k21 = cfg.k21 ?? 6.6;
            const k22 = cfg.k22 ?? -19.4;

            const d12 = -k12 / (k11 || 1);
            const d21 = -k21 / (k22 || 1);

            st.y1 = +(u1 + d12 * u2).toFixed(2);
            st.y2 = +(u2 + d21 * u1).toFixed(2);
            outputs[node.id] = st.y1;
            break;
          }

          case 'CSTRPlant': {
            outputs[node.id] = st.reactorTemp ?? 350.0;
            break;
          }

          case 'HeatExchangerPlant': {
            outputs[node.id] = st.hexOutletTemp ?? 65.0;
            break;
          }

          case 'DistillationColumnPlant': {
            outputs[node.id] = st.distillatePurity ?? 98.0;
            break;
          }

          case 'BoilerDrumPlant': {
            outputs[node.id] = st.boilerLevel ?? 50.0;
            break;
          }
          case 'MIMOPlant': {
            outputs[node.id] = st.y1 ?? 0;
            break;
          }
        }
      }
    }

    // 3. State update integration step for dynamic/integrating blocks
    for (const node of graph.nodes) {
      const cfg = node.config || {};
      const st = states[node.id];

      if (node.type === 'Tank') {
        const qin = getInputSignal(node.id, 0, 0);
        const externalDrain = externalDisturbances[node.id] ?? cfg.drainDisturbance ?? 0;
        const qdist = getInputSignal(node.id, 1, 0) + externalDrain;
        const area = Math.max(0.1, cfg.area ?? 1.5);
        const h = st.level ?? 0;

        let qout = qdist;
        if (!cfg.isPureIntegrator) {
          const Cv = cfg.gravityCoefficient ?? 1.2;
          qout += Cv * Math.sqrt(Math.max(0, h));
        }

        const dh_dt = (qin - qout) / area;
        const maxLevel = cfg.maxLevel ?? 100;
        const newLevel = Math.min(maxLevel, Math.max(0, h + dh_dt * DT));
        st.level = newLevel;
        outputs[node.id] = newLevel;
      } else if (node.type === 'FirstOrder') {
        const u = getInputSignal(node.id, 0, 0);
        const K = cfg.gain ?? 1.5;
        const tau = Math.max(0.01, cfg.timeConstant ?? 5.0);
        const y = st.y ?? 0;
        const alpha = Math.exp(-DT / tau);
        const yNew = y * alpha + K * u * (1 - alpha);
        st.y = yNew;
        outputs[node.id] = yNew;
      } else if (node.type === 'DeadTime') {
        const u = getInputSignal(node.id, 0, 0);
        if (st.ringBuffer && st.ringBuffer.length > 0) {
          const delay = Math.max(0, cfg.deadTime ?? 1.0);
          const requiredLen = Math.max(1, Math.round(delay / DT));
          if (st.ringBuffer.length !== requiredLen) {
            const oldVal = st.ringBuffer[st.ringIndex ?? 0];
            st.ringBuffer = new Array(requiredLen).fill(oldVal);
            st.ringIndex = 0;
          }
          const idx = st.ringIndex ?? 0;
          outputs[node.id] = st.ringBuffer[idx];
          st.ringBuffer[idx] = u;
          st.ringIndex = (idx + 1) % st.ringBuffer.length;
        } else {
          outputs[node.id] = u;
        }
      } else if (node.type === 'HeatedVessel') {
        const heatDuty = getInputSignal(node.id, 0, 0);
        const coldFeed = getInputSignal(node.id, 1, 0);
        const ambient = cfg.ambientTemp ?? 20;
        const Kheat = cfg.heatGain ?? 0.8;
        const tau = Math.max(0.1, cfg.thermalTau ?? 8.0);
        const T = st.temp ?? ambient;

        const targetT = ambient + Kheat * heatDuty - 0.2 * coldFeed;
        const alpha = Math.exp(-DT / tau);
        st.temp = T * alpha + targetT * (1 - alpha);
        outputs[node.id] = st.temp;
      } else if (node.type === 'Bioreactor') {
        const stirrerSpeedOrO2 = getInputSignal(node.id, 0, 50);
        const feedSubstrate = getInputSignal(node.id, 1, 0);

        const X = st.biomass ?? 0.5;
        const S = st.substrate ?? 15.0;
        const DO = st.dissolvedOxygen ?? 100.0;

        const muMax = 0.08;
        const Ks = 0.5;
        const Yxs = 0.5;
        const klaCoeff = 0.04 * (stirrerSpeedOrO2 / 50);
        const qO2 = 0.05;

        const mu = muMax * (S / (Ks + S)) * Math.min(1.0, DO / 20);
        const dX = mu * X * DT;
        const dS = (- (1 / Yxs) * mu * X + 0.1 * feedSubstrate) * DT;
        const dDO = (klaCoeff * (100 - DO) - qO2 * X * (DO / 100) * 10) * DT;

        st.biomass = Math.max(0.01, X + dX);
        st.substrate = Math.max(0, S + dS);
        st.dissolvedOxygen = Math.min(100, Math.max(0, DO + dDO));
        outputs[node.id] = st.dissolvedOxygen;
      } else if (node.type === 'LeadLag' || node.type === 'FeedForward') {
        const inSig = getInputSignal(node.id, 0, 0);
        const lastIn = st.lastLeadLagIn ?? inSig;
        const dIn_dt = (inSig - lastIn) / DT;
        st.lastLeadLagIn = inSig;

        const tauLead = cfg.tauLead ?? 0;
        const tauLag = Math.max(0.02, cfg.tauLag ?? 0.1);
        const currentY = st.leadLagOut ?? inSig;

        // tau_lag * dy/dt + y = inSig + tau_lead * dIn/dt
        const target = inSig + tauLead * dIn_dt;
        const alpha = Math.exp(-DT / tauLag);
        const newY = currentY * alpha + target * (1 - alpha);
        st.leadLagOut = newY;
        st.y = newY;
        if (node.type === 'FeedForward') {
          const gain = cfg.ffGain ?? -1.0;
          outputs[node.id] = +(gain * newY).toFixed(2);
        } else {
          outputs[node.id] = +newY.toFixed(2);
        }
      } else if (node.type === 'CSTRPlant') {
        const u_cw = getInputSignal(node.id, 0, 40);
        const externalDist = externalDisturbances[node.id] ?? 0;
        const T_feed = getInputSignal(node.id, 1, cfg.feedTemp ?? 350.0) + externalDist;

        let Tr = st.reactorTemp ?? 350.0;
        let Tj = st.jacketTemp ?? 320.0;

        const deltaTr = Tr - 350.0;
        const Q_gen = 28.0 * (1.0 + 0.08 * deltaTr + 0.003 * deltaTr * deltaTr);
        const UA = 1.4;
        const Q_rem = UA * (Tr - Tj);

        const T_cw_in = 295.0;
        const F_cw = Math.max(0, u_cw) * 0.05;
        const dTj = ((F_cw * (T_cw_in - Tj) + Q_rem * 0.8) / 2.5) * DT;
        Tj = Math.max(280.0, Math.min(380.0, Tj + dTj));

        const dTr = (0.04 * (T_feed - Tr) + (Q_gen - Q_rem) * 0.35) * DT;
        Tr = Math.max(250.0, Math.min(450.0, Tr + dTr));

        st.reactorTemp = +Tr.toFixed(2);
        st.jacketTemp = +Tj.toFixed(2);
        outputs[node.id] = st.reactorTemp;
      } else if (node.type === 'HeatExchangerPlant') {
        const u_steam = Math.min(100, Math.max(0, getInputSignal(node.id, 0, 50)));
        const externalDist = externalDisturbances[node.id] ?? 0;
        const F_proc = Math.max(10, getInputSignal(node.id, 1, cfg.processFluidFlow ?? 50.0) + externalDist);

        let Tout = st.hexOutletTemp ?? 65.0;
        const heatTransfer = (u_steam * 1.2) * (50.0 / F_proc);
        const steadyTarget = 25.0 + heatTransfer;

        const effectiveDeadTime = Math.max(0.5, (50.0 / F_proc) * 2.0);
        const effectiveTau = Math.max(1.0, (50.0 / F_proc) * 4.0);

        const alpha = Math.exp(-DT / effectiveTau);
        Tout = Tout * alpha + steadyTarget * (1 - alpha);

        if (!st.hexDeadTimeBuffer) {
          st.hexDeadTimeBuffer = new Array(Math.max(1, Math.round(effectiveDeadTime / DT))).fill(Tout);
        }
        st.hexDeadTimeBuffer.push(Tout);
        const delaySteps = Math.max(1, Math.round(effectiveDeadTime / DT));
        while (st.hexDeadTimeBuffer.length > delaySteps) {
          st.hexOutletTemp = st.hexDeadTimeBuffer.shift();
        }

        outputs[node.id] = +(st.hexOutletTemp ?? Tout).toFixed(2);
      } else if (node.type === 'DistillationColumnPlant') {
        const L = getInputSignal(node.id, 0, 50);
        const V = getInputSignal(node.id, 1, 50);
        const externalDist = externalDisturbances[node.id] ?? 0;
        const F_dist = getInputSignal(node.id, 2, 0) + externalDist;

        let xD = st.distillatePurity ?? 98.0;
        let xB = st.bottomsPurity ?? 2.0;

        const targetXD = 98.0 + 0.12 * (L - 50) - 0.08 * (V - 50) - 0.06 * F_dist;
        const targetXB = 2.0 - 0.09 * (L - 50) + 0.14 * (V - 50) + 0.04 * F_dist;

        const tauCol = 12.0;
        const alpha = Math.exp(-DT / tauCol);
        xD = xD * alpha + targetXD * (1 - alpha);
        xB = xB * alpha + targetXB * (1 - alpha);

        st.distillatePurity = +Math.max(80.0, Math.min(99.9, xD)).toFixed(2);
        st.bottomsPurity = +Math.max(0.1, Math.min(20.0, xB)).toFixed(2);
        outputs[node.id] = st.distillatePurity;
      } else if (node.type === 'BoilerDrumPlant') {
        const F_fw = getInputSignal(node.id, 0, 50);
        const externalDist = externalDisturbances[node.id] ?? 0;
        const F_steam = getInputSignal(node.id, 1, 50) + externalDist;

        let levelInt = st.boilerIntLevel ?? 50.0;
        let swellState = st.boilerSwellState ?? 0.0;

        const dMass = (F_fw - F_steam) * 0.04;
        levelInt += dMass * DT;

        const tauP = 4.0;
        const deltaDemand = (F_steam - 50) - (F_fw - 50);
        const alphaP = Math.exp(-DT / tauP);
        swellState = swellState * alphaP + deltaDemand * 0.35 * (1 - alphaP);

        const apparentLevel = levelInt + swellState;

        st.boilerIntLevel = Math.max(5.0, Math.min(95.0, levelInt));
        st.boilerSwellState = swellState;
        st.boilerLevel = +Math.max(0.0, Math.min(100.0, apparentLevel)).toFixed(2);
        outputs[node.id] = st.boilerLevel;
      } else if (node.type === 'MIMOPlant') {
        const u1Raw = getInputSignal(node.id, 0, 0);
        const u2Raw = getInputSignal(node.id, 1, 0);

        const k11 = cfg.k11 ?? 12.8;
        const k12 = cfg.k12 ?? -18.9;
        const k21 = cfg.k21 ?? 6.6;
        const k22 = cfg.k22 ?? -19.4;

        const tau11 = Math.max(0.1, cfg.tau11 ?? 16.7);
        const tau12 = Math.max(0.1, cfg.tau12 ?? 21.0);
        const tau21 = Math.max(0.1, cfg.tau21 ?? 10.9);
        const tau22 = Math.max(0.1, cfg.tau22 ?? 14.4);

        let u1 = u1Raw;
        let u2 = u2Raw;
        if (cfg.decouplerEnabled) {
          const d12 = -k12 / (k11 || 1);
          const d21 = -k21 / (k22 || 1);
          u1 = u1Raw + d12 * u2Raw;
          u2 = u2Raw + d21 * u1Raw;
        }

        const y11 = (st.y11 ?? 0) * Math.exp(-DT / tau11) + (k11 * u1 / 100) * (1 - Math.exp(-DT / tau11));
        const y12 = (st.y12 ?? 0) * Math.exp(-DT / tau12) + (k12 * u2 / 100) * (1 - Math.exp(-DT / tau12));
        const y21 = (st.y21 ?? 0) * Math.exp(-DT / tau21) + (k21 * u1 / 100) * (1 - Math.exp(-DT / tau21));
        const y22 = (st.y22 ?? 0) * Math.exp(-DT / tau22) + (k22 * u2 / 100) * (1 - Math.exp(-DT / tau22));

        st.y11 = y11;
        st.y12 = y12;
        st.y21 = y21;
        st.y22 = y22;

        const y1 = y11 + y12;
        const y2 = y21 + y22;
        st.y1 = +y1.toFixed(2);
        st.y2 = +y2.toFixed(2);
        outputs[node.id] = st.y1;
      }
    }

    // 4. Capture Scope signals & metrics
    let spVal = currentSP;
    let pvVal = currentPV;
    let uVal = 0;
    let errVal = 0;
    let rawUVal: number | undefined = undefined;
    let upVal = 0;
    let uiVal = 0;
    let udVal = 0;
    let isSaturated = false;

    const ctrlNode = graph.nodes.find((n) =>
      ['P', 'PI', 'PID', 'OnOff'].includes(n.type)
    );
    if (ctrlNode) {
      uVal = outputs[ctrlNode.id] ?? 0;
      const cSt = states[ctrlNode.id];
      if (cSt) {
        upVal = cSt.up ?? 0;
        uiVal = cSt.ui ?? 0;
        udVal = cSt.ud ?? 0;
        rawUVal = cSt.rawU;
        isSaturated = !!cSt.isSaturated;
      }
    }

    const sumNode = graph.nodes.find((n) => n.type === 'Sum');
    if (sumNode) {
      errVal = outputs[sumNode.id] ?? 0;
    } else {
      errVal = spVal - pvVal;
    }

    // Metrics updates
    const absErr = Math.abs(errVal);
    iae += absErr * DT;
    ise += errVal * errVal * DT;
    totalSteps++;

    // Rise time measurement (10% to 90% of target step)
    const deltaSP = Math.abs(spVal);
    if (deltaSP > 0) {
      const pctCurrent = (pvVal / spVal) * 100;
      if (pctCurrent >= 10 && riseTime10 === undefined) {
        riseTime10 = time;
      }
      if (pctCurrent >= 90 && riseTime90 === undefined) {
        riseTime90 = time;
        if (riseTime10 !== undefined) {
          calculatedRiseTime = +(riseTime90 - riseTime10).toFixed(2);
        }
      }
    }

    // Settling time measurement (+/- 2% tolerance band)
    const settleTolerance = Math.max(0.5, Math.abs(spVal) * 0.02);
    if (absErr <= settleTolerance) {
      stepsInTolerance++;
      if (settledTime === undefined && time > 1.5) {
        settledTime = time;
      }
    } else {
      settledTime = undefined;
    }

    if (pvVal > peakValue) peakValue = pvVal;
    const peakOvershootPct = spVal > 0 ? Math.max(0, ((peakValue - spVal) / spVal) * 100) : 0;
    const steadyStateOffsetPct = spVal > 0 ? (absErr / spVal) * 100 : 0;

    time = +(time + DT).toFixed(3);

    // Compute derivative slope for Module 6 overlay
    let derivativeSlope = 0;
    if (history.length > 0) {
      const prev = history[history.length - 1];
      derivativeSlope = +((pvVal - prev.pv) / DT).toFixed(2);
    }

    // Milestone 3 secondary traces
    const mimoNode = graph.nodes.find((n) => n.type === 'MIMOPlant');
    const distNode = graph.nodes.find((n) => n.type === 'DistillationColumnPlant');
    const cstrNode = graph.nodes.find((n) => n.type === 'CSTRPlant');
    const boilerNode = graph.nodes.find((n) => n.type === 'BoilerDrumPlant');
    const splitNode = graph.nodes.find((n) => n.type === 'SplitRange');
    const selectorNode = graph.nodes.find((n) => n.type === 'Selector');
    const ffNode = graph.nodes.find((n) => n.type === 'FeedForward');
    const cascadeNode = graph.nodes.find((n) => n.type === 'Cascade');

    let sp2: number | undefined = undefined;
    let pv2: number | undefined = undefined;
    let u2: number | undefined = undefined;
    let uFF: number | undefined = undefined;
    let coolValve: number | undefined = undefined;
    let heatValve: number | undefined = undefined;
    let selectedChannel: string | undefined = undefined;

    if (distNode && states[distNode.id]) {
      pv2 = states[distNode.id].bottomsPurity;
      sp2 = 2.0;
    } else if (cstrNode && states[cstrNode.id]) {
      pv2 = states[cstrNode.id].jacketTemp;
      sp2 = 320.0;
    } else if (boilerNode && states[boilerNode.id]) {
      pv2 = states[boilerNode.id].boilerIntLevel;
      sp2 = 50.0;
    } else if (mimoNode && states[mimoNode.id]) {
      pv2 = states[mimoNode.id].y2;
      sp2 = 50;
      u2 = outputs[mimoNode.id];
    }

    if (splitNode && states[splitNode.id]) {
      coolValve = states[splitNode.id].coolValve;
      heatValve = states[splitNode.id].heatValve;
    }

    if (selectorNode && states[selectorNode.id]) {
      selectedChannel = states[selectorNode.id].activeChannel === 1 ? 'Ch 1' : 'Ch 2';
    }

    if (ffNode) {
      uFF = outputs[ffNode.id];
    }

    const dataPoint: ScopeDataPoint = {
      time,
      sp: +spVal.toFixed(2),
      pv: +pvVal.toFixed(2),
      u: +uVal.toFixed(2),
      error: +errVal.toFixed(2),
      rawU: rawUVal !== undefined ? +rawUVal.toFixed(2) : undefined,
      up: +upVal.toFixed(2),
      ui: +uiVal.toFixed(2),
      ud: +udVal.toFixed(2),
      derivativeSlope,
      isSaturated,
      valveChatter: +cumulativeValveTravel.toFixed(1),
      disturbance: Object.values(externalDisturbances)[0] ?? 0,
      sp2,
      pv2,
      u2,
      uFF,
      coolValve,
      heatValve,
      selectedChannel,
    };

    history.push(dataPoint);
    if (history.length > 1400) {
      history.shift();
    }

    const activeSignals: Record<string, number> = {};
    for (const wire of graph.wires) {
      activeSignals[wire.id] = outputs[wire.fromBlockId] ?? 0;
    }

    // Milestone 3 analytical calculations
    const activeKc = ctrlNode?.config?.kc ?? 1.5;
    const activeTi = ctrlNode?.config?.ti ?? 5.0;
    const activeTd = ctrlNode?.config?.td ?? 0.0;

    const targetPlantNode = graph.nodes.find((n) => ['FirstOrder', 'Tank', 'HeatedVessel'].includes(n.type));
    const deadNode = graph.nodes.find((n) => n.type === 'DeadTime');

    const pK = targetPlantNode?.config?.gain ?? 1.0;
    const pTau = targetPlantNode?.config?.timeConstant ?? 3.0;
    const pTheta = deadNode?.config?.deadTime ?? 1.0;

    const bode = computeBodeAnalysis(activeKc, activeTi, activeTd, pK, pTau, pTheta);
    const rootLocus = computeRootLocusAnalysis(activeKc, pK, pTau, pTheta);

    let rga: RgaAnalysis | undefined = undefined;
    const rgaTarget = mimoNode ?? graph.nodes.find((n) => n.type === 'RGACalculator');
    if (rgaTarget) {
      const cfg = rgaTarget.config || {};
      rga = computeRgaAnalysis(cfg.k11 ?? 1.0, cfg.k12 ?? 0.6, cfg.k21 ?? 0.4, cfg.k22 ?? 1.0);
    }

    let cascadeSpeedRatio: number | undefined = undefined;
    if (cascadeNode) {
      const cCfg = cascadeNode.config || {};
      const outerTi = cCfg.outerTi ?? 12.0;
      const innerTi = cCfg.innerTi ?? 2.0;
      cascadeSpeedRatio = +(outerTi / Math.max(0.1, innerTi)).toFixed(1);
    }

    return {
      time,
      history,
      blockOutputs: { ...outputs },
      activeSignals,
      metrics: {
        iae: +iae.toFixed(2),
        ise: +ise.toFixed(2),
        currentError: +errVal.toFixed(2),
        peakOvershootPct: +peakOvershootPct.toFixed(1),
        riseTime: calculatedRiseTime,
        settlingTime: settledTime,
        steadyStateOffsetPct: +steadyStateOffsetPct.toFixed(1),
        inToleranceRatio: totalSteps > 0 ? +(stepsInTolerance / totalSteps).toFixed(3) : 0,
        valveTravelTotal: +cumulativeValveTravel.toFixed(1),
        isCurrentlySaturated: isSaturated,
        termBreakdown: { up: upVal, ui: uiVal, ud: udVal, rawU: rawUVal ?? uVal },
        bodeAnalysis: bode,
        rootLocusAnalysis: rootLocus,
        rgaAnalysis: rga,
        cascadeSpeedRatio,
      },
    };
  }

  function runMultipleSteps(stepCount: number): SimulationResult {
    let lastRes: any = null;
    for (let i = 0; i < stepCount; i++) {
      lastRes = step();
    }
    return lastRes;
  }

  function setGraph(newGraph: CircuitGraph) {
    graph = JSON.parse(JSON.stringify(newGraph));
    initStates();
  }

  function updateBlockConfig(blockId: string, partialConfig: any) {
    const node = graph.nodes.find((n) => n.id === blockId);
    if (node) {
      node.config = { ...node.config, ...partialConfig };
    }
  }

  function startAutotune(blockId?: string) {
    const targetNode = blockId
      ? graph.nodes.find((n) => n.id === blockId)
      : graph.nodes.find((n) => n.type === 'Autotune');
    if (targetNode && states[targetNode.id]?.autotune) {
      states[targetNode.id].autotune!.active = true;
      states[targetNode.id].autotune!.step = 'tracking';
      states[targetNode.id].autotune!.peaks = [];
      states[targetNode.id].autotune!.valleys = [];
    }
  }

  function stopAutotune(blockId?: string) {
    const targetNode = blockId
      ? graph.nodes.find((n) => n.id === blockId)
      : graph.nodes.find((n) => n.type === 'Autotune');
    if (targetNode && states[targetNode.id]?.autotune) {
      states[targetNode.id].autotune!.active = false;
      states[targetNode.id].autotune!.step = 'idle';
    }
  }

  return {
    get graph() {
      return graph;
    },
    get time() {
      return time;
    },
    get states() {
      return states;
    },
    get outputs() {
      return outputs;
    },
    get history() {
      return history;
    },
    get metrics() {
      return {
        iae: +iae.toFixed(2),
        ise: +ise.toFixed(2),
        currentError: history.length > 0 ? history[history.length - 1].error : 0,
        peakOvershootPct: +peakValue.toFixed(1),
        riseTime: calculatedRiseTime,
        settlingTime: settledTime,
        steadyStateOffsetPct: 0,
        inToleranceRatio: totalSteps > 0 ? +(stepsInTolerance / totalSteps).toFixed(3) : 0,
        valveTravelTotal: +cumulativeValveTravel.toFixed(1),
      };
    },
    step,
    reset: initStates,
    setGraph,
    updateBlockConfig,
    runMultipleSteps,
    startAutotune,
    stopAutotune,
  };
}
