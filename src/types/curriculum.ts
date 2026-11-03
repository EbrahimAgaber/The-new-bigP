/**
 * Curriculum & Module Specification Types (bigp Spec)
 * Fully declarative module architecture (Milestones 0, 1 & 2)
 */

import { BlockType, CircuitGraph } from './engine';

export type CurriculumPartId = 'part-a' | 'part-b' | 'part-c' | 'part-d' | 'part-e';

export interface CurriculumPart {
  id: CurriculumPartId;
  titleEn: string;
  titleAr: string;
  modules: string[]; // module IDs
}

export type VisualFeatureId =
  | 'errorBracket'
  | 'spLine'
  | 'pvLine'
  | 'uLine'
  | 'tauCrosshair'
  | 'thetaBracket'
  | 'offsetGap'
  | 'tankLevel'
  | 'inflowValve'
  | 'outflowValve'
  | 'controllerBlock'
  | 'areaUnderCurve'
  | 'tangentSlope'
  | 'integralArea'
  | 'derivativeSlope'
  | 'windupGhostTrace'
  | 'metricsCallipers'
  | 'valveChatter'
  | 'bumplessTransfer'
  | 'bioreactorAgitator'
  | 'bioreactorDO'
  | 'bodeMargins'
  | 'rootLocusPoles'
  | 'feedforwardCancelWave'
  | 'cascadeSpeedBadge'
  | 'splitRangeSplit'
  | 'rgaMatrix'
  | 'decouplerMatrix';

export interface MathSymbolSpec {
  symbol: string;
  plainNameEn: string;
  plainNameAr: string;
  techTermEn: string;
  techTermAr: string;
  descriptionEn: string;
  descriptionAr: string;
  linkedFeature: VisualFeatureId;
}

export interface MathEquationSpec {
  id: string;
  labelEn: string;
  labelAr: string;
  displayMath: string;
  symbols: MathSymbolSpec[];
  notesEn?: string;
  notesAr?: string;
}

export interface ExposedControlSpec {
  id: string;
  labelEn: string;
  labelAr: string;
  blockId: string;
  property: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  badge?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  controlType?: 'slider' | 'toggle' | 'select';
  options?: Array<{ labelEn: string; labelAr: string; value: any }>;
}

export interface PredictPromptSpec {
  id: string;
  promptEn: string;
  promptAr: string;
  optionsEn: string[];
  optionsAr: string[];
  correctIndex: number;
  explanationEn: string;
  explanationAr: string;
  actionInstructionEn: string;
  actionInstructionAr: string;
}

export interface DisturbanceEvent {
  time: number;
  drainRate?: number;
  stepValue?: number;
  labelEn: string;
  labelAr: string;
}

export interface ProveChallengeSpec {
  id: string;
  titleEn: string;
  titleAr: string;
  instructionsEn: string;
  instructionsAr: string;
  challengeType:
    | 'manualLevelControl'
    | 'systemIdentification'
    | 'loopWiringAndAction'
    | 'tuneProportionalGain'
    | 'integralOffsetElimination'
    | 'derivativeNoiseTradeoff'
    | 'antiWindupAndBumpless'
    | 'tuningGauntlet'
    | 'bioprocessBatch'
    | 'stabilityPrediction'
    | 'feedforwardIAEReduction'
    | 'cascadeTuningSequence'
    | 'mimoDecoupling'
    | 'cstrExothermicRunaway'
    | 'heatExchangerFeedforward'
    | 'distillationPurityMimo'
    | 'boilerDrumShrinkSwell'
    | 'unseenPlantCapstone';
  targetSP: number;
  toleranceBandPct: number; // e.g. 5 for +/- 5%
  durationSeconds: number;
  passingScore: number;    // default 70
  disturbances: DisturbanceEvent[];
  // For M2 Mystery Plant
  systemIdentificationPlant?: {
    k: number;
    tau: number;
    theta: number;
  };
  // For M3 Loop Wiring / Diagnostics
  wiringGoal?: {
    requiredConnections: Array<{ fromType: BlockType; toType: BlockType }>;
    faultyBlockId?: string;
    correctSignAction?: 'reverse' | 'direct';
  };
  // For M4 P Tuning
  pTuningGoal?: {
    maxOffsetPct: number;
    maxOvershootPct: number;
    maxSettlingTime: number;
  };
  // For M5 I control
  iControlGoal?: {
    maxOffsetPct: number;
    maxOvershootPct: number;
  };
  // For M6 D control
  dControlGoal?: {
    maxOvershootPct: number;
    maxValveChatter: number;
  };
  // For M7 Industrial PID
  industrialGoal?: {
    requireAntiWindup: boolean;
    requireDerivOnMeasurement: boolean;
    maxTransientBumpPct: number;
  };
  // For M8 Tuning Gauntlet
  tuningGauntletPlants?: Array<{
    nameEn: string;
    nameAr: string;
    k: number;
    tau: number;
    theta: number;
    targetSP: number;
    benchmarkIAE: number;
  }>;
  // For M9 Stability Prediction
  stabilityGoal?: {
    targetKu: number;
    minGainMarginDb: number;
    minPhaseMarginDeg: number;
  };
  // For M10 Feedforward Challenge
  feedforwardGoal?: {
    benchmarkFeedbackIAE: number;
    requiredMaxIAE: number;
    requireLeadLag: boolean;
  };
  // For M11 Cascade Challenge
  cascadeGoal?: {
    requireInnerTunedFirst: boolean;
    minSpeedRatio: number; // tau_outer / tau_inner >= 3
    maxSettlingTime: number;
  };
  // For M12 MIMO Challenge
  caseStudyGoal?: {
    caseIndex: 1 | 2 | 3 | 4;
    maxTempK?: number;
    targetTempK?: number;
    outletTempTol?: number;
    minIAEReductionPct?: number;
    minPurityPct?: number;
    minDrumLevel?: number;
    maxDrumLevel?: number;
  };
  capstoneGoal?: {
    unseenSeed?: number;
    minPassingScore: number;
  };
  mimoGoal?: {
    correctPairing: '11_22' | '12_21';
    requireDecoupler: boolean;
    maxCrossIAE: number;
  };
}

export interface ModuleSpec {
  id: string;
  number: number;
  partId: CurriculumPartId;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  estimatedMinutes: number;
  mentalModel: {
    sentenceEn: string;
    sentenceAr: string;
    keyAnalogyEn: string;
    keyAnalogyAr: string;
  };
  seeTheMath: {
    equations: MathEquationSpec[];
  };
  play: {
    equipmentType: 'tank' | 'heatedVessel' | 'bioreactor' | 'generic';
    unlockedBlocks: BlockType[];
    controlsExposed: ExposedControlSpec[];
    predictPrompts: PredictPromptSpec[];
    defaultCircuit: CircuitGraph;
    allowSweepKc?: boolean;
    showTermMeter?: boolean;
    showAutotuneControls?: boolean;
  };
  prove: ProveChallengeSpec;
  tutorContext: {
    contextNotesEn: string;
    contextNotesAr: string;
    commonMisconceptionsEn: string[];
    commonMisconceptionsAr: string[];
  };
}
