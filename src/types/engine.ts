/**
 * Engine Types for bigp: Deterministic Fixed-Step Simulation Engine
 * Milestones 0, 1, 2 & 3 Complete Architecture
 */

export type BlockType =
  | 'Step'
  | 'Tank'
  | 'FirstOrder'
  | 'DeadTime'
  | 'HeatedVessel'
  | 'Bioreactor'
  | 'Sum'
  | 'OnOff'
  | 'P'
  | 'PI'
  | 'PID'
  | 'Valve'
  | 'Sensor'
  | 'Saturation'
  | 'Noise'
  | 'Scope'
  | 'Constant'
  | 'Gain'
  | 'Autotune'
  | 'AutoManualSwitch'
  // Milestone 3 New Blocks
  | 'BodeViewer'
  | 'RootLocusViewer'
  | 'FeedForward'
  | 'LeadLag'
  | 'Ratio'
  | 'Cascade'
  | 'SplitRange'
  | 'Selector'
  | 'MIMOPlant'
  | 'RGACalculator'
  | 'Decoupler'
  // Milestone 4 Industrial Plant Blocks
  | 'CSTRPlant'
  | 'HeatExchangerPlant'
  | 'DistillationColumnPlant'
  | 'BoilerDrumPlant';

export interface PortDefinition {
  id: string;
  name: string;
  type: 'input' | 'output';
  unit?: string;
  dataType?: 'number' | 'boolean';
}

export interface BlockConfig {
  // Step
  initialValue?: number;
  stepValue?: number;
  stepTime?: number;

  // Tank
  area?: number;
  initialLevel?: number;
  maxLevel?: number;
  gravityCoefficient?: number;
  isPureIntegrator?: boolean;
  drainDisturbance?: number;

  // FirstOrder
  gain?: number;
  timeConstant?: number;
  initialOutput?: number;

  // DeadTime
  deadTime?: number;
  initialBufferValue?: number;

  // HeatedVessel
  ambientTemp?: number;
  heatGain?: number;
  thermalTau?: number;
  transportDelay?: number;

  // Bioreactor
  biomassInitial?: number;
  substrateInitial?: number;
  doInitial?: number;
  tempInitial?: number;
  kla?: number;
  targetDO?: number;

  // Sum
  signs?: ('+' | '-')[];

  // OnOff
  onValue?: number;
  offValue?: number;
  deadband?: number;

  // P / PI / PID Industrial Features
  kc?: number;
  ti?: number;
  td?: number;
  derivativeFilterN?: number;
  bias?: number;
  action?: 'reverse' | 'direct';
  outputMin?: number;
  outputMax?: number;
  antiWindup?: boolean;
  derivativeOnMeasurement?: boolean;
  setpointWeighting?: number;
  mode?: 'AUTO' | 'MANUAL';
  manualOutput?: number;

  // Valve / Sensor
  scalingFactor?: number;
  timeLag?: number;
  isStuck?: boolean;

  // Saturation
  min?: number;
  max?: number;
  isSaturated?: boolean;

  // Noise
  noiseAmp?: number;
  noiseType?: 'uniform' | 'gaussian';

  // Constant / Gain
  value?: number;

  // Autotune Block
  relayAmplitude?: number;
  autotuneActive?: boolean;
  tuningMethod?: 'ziegler-nichols' | 'cohen-coon' | 'imc';
  lambda?: number;

  // Milestone 3: Feedforward & LeadLag
  ffGain?: number;             // -Kd / Kp
  tauLead?: number;           // Lead time constant
  tauLag?: number;            // Lag time constant
  deadTimeDisturbance?: number;// theta_d
  deadTimeProcess?: number;    // theta_p

  // Milestone 3: Ratio
  ratioTarget?: number;       // R_sp = F2 / F1

  // Milestone 3: Cascade
  outerTi?: number;
  innerTi?: number;
  primaryKc?: number;
  secondaryKc?: number;

  // Milestone 3: SplitRange
  splitPoint?: number;        // e.g. 50%
  coolValveMin?: number;
  coolValveMax?: number;
  heatValveMin?: number;
  heatValveMax?: number;

  // Milestone 3: Selector (Override)
  selectorType?: 'min' | 'max'; // Low-Select (LS) or High-Select (HS)

  // Milestone 3: MIMO 2x2 Plant
  k11?: number;
  k12?: number;
  k21?: number;
  k22?: number;
  tau11?: number;
  tau12?: number;
  tau21?: number;
  tau22?: number;
  mimoPairing?: 'straight' | 'cross'; // straight: u1->y1, u2->y2; cross: u1->y2, u2->y1
  decouplerEnabled?: boolean;

  // Milestone 4: Industrial Plant Blocks
  feedTemp?: number;
  coolJacketFlow?: number;
  processFluidFlow?: number;
  steamPressure?: number;
  refluxFlow?: number;
  steamBoilupDuty?: number;
  feedComp?: number;
  steamHeaderDemand?: number;
  feedwaterFlow?: number;
  drumLevel?: number;
  inverseTauZ?: number;
}

export interface BlockNode {
  id: string;
  type: BlockType;
  title: string;
  titleAr?: string;
  x: number;
  y: number;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  config: BlockConfig;
  customLabel?: string;
}

export interface WireConnection {
  id: string;
  fromBlockId: string;
  fromPortId: string;
  toBlockId: string;
  toPortId: string;
}

export interface BlockState {
  y?: number;
  integral?: number;
  lastError?: number;
  lastDerivative?: number;
  lastPv?: number;
  lastSp?: number;
  ringBuffer?: number[];
  ringIndex?: number;
  level?: number;
  onOffState?: boolean;

  // Industrial Plants State (Milestone 4)
  reactorTemp?: number;
  jacketTemp?: number;
  hexOutletTemp?: number;
  hexDeadTimeBuffer?: number[];
  distillatePurity?: number;
  bottomsPurity?: number;
  boilerLevel?: number;
  boilerSwellState?: number;
  boilerIntLevel?: number;

  // Industrial PID term breakdowns
  up?: number;
  ui?: number;
  ud?: number;
  rawU?: number;
  isSaturated?: boolean;

  // Valve wear tracker
  lastValveU?: number;
  cumulativeValveTravel?: number;

  // LeadLag filter memory
  lastLeadLagIn?: number;
  leadLagOut?: number;

  // Cascade states
  innerU?: number;
  outerSP?: number;

  // Split-Range outputs
  coolValve?: number;
  heatValve?: number;

  // Selector active channel
  activeChannel?: number;

  // MIMO 2x2 dynamic states
  y1?: number;
  y2?: number;
  y11?: number;
  y12?: number;
  y21?: number;
  y22?: number;

  // Relay Autotune State Machine
  autotune?: {
    active: boolean;
    step: 'idle' | 'tracking' | 'done';
    relaySign: number;
    peaks: Array<{ time: number; val: number }>;
    valleys: Array<{ time: number; val: number }>;
    pu?: number;
    ku?: number;
    suggestedParams?: {
      kc: number;
      ti: number;
      td: number;
    };
  };

  // Bioreactor dynamic states
  biomass?: number;
  substrate?: number;
  dissolvedOxygen?: number;
  temp?: number;
}

export interface ScopeDataPoint {
  time: number;
  sp: number;
  pv: number;
  u: number;
  error: number;
  rawU?: number;
  up?: number;
  ui?: number;
  ud?: number;
  derivativeSlope?: number;
  isSaturated?: boolean;
  valveChatter?: number;
  disturbance?: number;

  // Milestone 3 secondary traces
  sp2?: number;
  pv2?: number;
  u2?: number;
  uFF?: number;
  uFB?: number;
  coolValve?: number;
  heatValve?: number;
  selectedChannel?: string;

  custom1?: number;
  custom2?: number;
}

export interface BodeDataPoint {
  omega: number;              // rad/s
  magDb: number;              // 20*log10(|L|)
  phaseDeg: number;           // angle L in deg
}

export interface BodeAnalysis {
  points: BodeDataPoint[];
  omega180?: number;          // Phase crossover frequency
  omegaC?: number;            // Gain crossover frequency
  gainMarginDb?: number;      // GM in dB
  phaseMarginDeg?: number;    // PM in deg
  ultimateGain?: number;      // Ku
  ultimatePeriod?: number;    // Pu = 2*pi / omega180
  isStable: boolean;
}

export interface RootLocusPole {
  real: number;
  imag: number;
}

export interface RootLocusAnalysis {
  poles: RootLocusPole[];
  zeros: RootLocusPole[];
  stability: 'stable' | 'marginal' | 'unstable';
  dampingRatio?: number;
  naturalFrequency?: number;
}

export interface RgaAnalysis {
  lambda11: number;
  lambda12: number;
  lambda21: number;
  lambda22: number;
  recommendedPairing: 'straight' | 'cross';
  pairingWarning?: string;
  pairingWarningAr?: string;
}

export interface SimulationResult {
  time: number;
  history: ScopeDataPoint[];
  blockOutputs: Record<string, number>;
  activeSignals: Record<string, number>;
  metrics: {
    iae: number;
    ise: number;
    currentError: number;
    peakOvershootPct: number;
    riseTime?: number;
    settlingTime?: number;
    steadyStateOffsetPct?: number;
    inToleranceRatio: number;
    valveTravelTotal: number;
    isCurrentlySaturated?: boolean;
    termBreakdown?: { up: number; ui: number; ud: number; rawU: number };

    // Milestone 3 metrics
    bodeAnalysis?: BodeAnalysis;
    rootLocusAnalysis?: RootLocusAnalysis;
    rgaAnalysis?: RgaAnalysis;
    cascadeSpeedRatio?: number; // tau_outer / tau_inner
    disturbanceRejectionRatio?: number; // IAE reduction %
    mimoCrossTalkPct?: number; // % disturbance on loop 2 caused by loop 1
  };
}

export interface CircuitGraph {
  nodes: BlockNode[];
  wires: WireConnection[];
}
