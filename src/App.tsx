/**
 * bigp: Process Control from Zero to Expert
 * Lead Simulation Engine & Academy Application Architecture
 * Milestones 0, 1 & 2 Complete Implementation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MODULE_SPECS } from './curriculum/modulesData';
import { createSimulationEngine, DT } from './engine/simulationEngine';
import { VisualFeatureId } from './types/curriculum';
import { CircuitGraph, ScopeDataPoint } from './types/engine';
import { Navigation } from './components/Navigation';
import { MentalModelBanner } from './components/MentalModelBanner';
import { SeeTheMathCard } from './components/SeeTheMathCard';
import { EquipmentVisualizer } from './components/EquipmentVisualizer';
import { ScopeChart } from './components/ScopeChart';
import { BlockDiagramCanvas } from './components/BlockDiagramCanvas';
import { GuidedStepsPanel } from './components/GuidedStepsPanel';
import { ProveChallengePanel } from './components/ProveChallengePanel';
import { MetricsPanel } from './components/MetricsPanel';
import { ModuleRoadmapDrawer } from './components/ModuleRoadmapDrawer';
import { StudioSandbox } from './components/StudioSandbox';
import { BioprocessModal } from './components/BioprocessModal';
import { BodeViewer } from './components/BodeViewer';
import { RootLocusViewer } from './components/RootLocusViewer';
import { RgaMatrixViewer } from './components/RgaMatrixViewer';
import { IndustrialPidVisualizer } from './components/IndustrialPidVisualizer';
import { MasteryDashboardModal } from './components/MasteryDashboardModal';
import { InteractiveTutorialModal } from './components/InteractiveTutorialModal';
import {
  Sliders,
  Activity,
  Compass,
  Layers,
  CheckCircle2,
  RefreshCw,
  Zap,
  Waves,
  Crosshair,
  Network,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Trophy,
  ArrowRight,
  Cpu,
  Radio,
} from 'lucide-react';

export default function App() {
  // 1. Language & Global Mode State
  const [lang, setLang] = useState<'en' | 'ar'>(() => {
    return (localStorage.getItem('bigp_lang') as 'en' | 'ar') || 'en';
  });
  const [mode, setMode] = useState<'academy' | 'studio'>('academy');

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('bigp_lang', lang);
  }, [lang]);

  // 2. Curriculum & Progress State
  const [currentModuleId, setCurrentModuleId] = useState<string>('m1');
  const [unlockedModules, setUnlockedModules] = useState<string[]>(() => {
    const saved = localStorage.getItem('bigp_unlocked');
    return saved ? JSON.parse(saved) : ['m1'];
  });
  const [moduleScores, setModuleScores] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('bigp_scores');
    return saved ? JSON.parse(saved) : {};
  });

  const currentModule = MODULE_SPECS[currentModuleId] || MODULE_SPECS.m1;

  // Visual feature hover link
  const [activeFeature, setActiveFeature] = useState<VisualFeatureId | null>(null);

  // Right panel tab in Academy mode: 'steps' | 'prove' | 'metrics'
  const [rightTab, setRightTab] = useState<'steps' | 'prove' | 'metrics'>('steps');
  // FreeCodeCamp Study Journey tab: 'concept' | 'steps' | 'prove' | 'all'
  const [journeyTab, setJourneyTab] = useState<'concept' | 'steps' | 'prove' | 'all'>('concept');
  // Studio Workbench active display tab: 'overview' (P&ID + Scope stacked) | 'flowsheet' | 'scope' | 'schematic'
  const [studioDisplayTab, setStudioDisplayTab] = useState<'overview' | 'scope' | 'flowsheet'>('overview');

  // Drawers and Modals
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isBioprocessOpen, setIsBioprocessOpen] = useState(false);
  const [isMasteryOpen, setIsMasteryOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [highlightedUiArea, setHighlightedUiArea] = useState<string | null>(null);
  const [activeCaseStudyIndex, setActiveCaseStudyIndex] = useState<1 | 2 | 3 | 4>(1);

  // 3. Simulation Engine State
  const [graph, setGraph] = useState<CircuitGraph>(() => currentModule.play.defaultCircuit);
  const engineRef = useRef<ReturnType<typeof createSimulationEngine> | null>(null);

  useEffect(() => {
    engineRef.current = createSimulationEngine(graph);
  }, []);

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [history, setHistory] = useState<ScopeDataPoint[]>([]);
  const [activeSignals, setActiveSignals] = useState<Record<string, number>>({});
  const [currentDisturbances, setCurrentDisturbances] = useState<Record<string, number>>({});

  // 4. Challenge Evaluator State
  const [isChallengeRunning, setIsChallengeRunning] = useState<boolean>(false);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState<number>(currentModule.prove.durationSeconds);
  const [challengeScore, setChallengeScore] = useState<number>(0);
  const challengeScoreRef = useRef<number>(0);
  const [challengeMetrics, setChallengeMetrics] = useState({
    iae: 0,
    ise: 0,
    inToleranceRatio: 0,
    peakOvershootPct: 0,
    currentError: 0,
    valveTravelTotal: 0,
    riseTime: undefined as number | undefined,
    settlingTime: undefined as number | undefined,
    bodeAnalysis: undefined as any,
    rootLocusAnalysis: undefined as any,
    rgaAnalysis: undefined as any,
    cascadeSpeedRatio: undefined as number | undefined,
  });

  // Milestone 3 analyzer tabs
  const [m9ViewTab, setM9ViewTab] = useState<'bode' | 'rootLocus' | 'scope'>('bode');
  const [m12ViewTab, setM12ViewTab] = useState<'rga' | 'scope'>('rga');

  // M2 Mystery Plant guesses
  const [mysteryInputs, setMysteryInputs] = useState({ k: 1.0, tau: 3.0, theta: 1.0 });
  const [mysteryResult, setMysteryResult] = useState<{ score: number; passed: boolean; feedback: string } | null>(null);

  // M4 Sweep Kc curves
  const [sweepCurves, setSweepCurves] = useState<any[]>([]);

  // M8 Tuning Gauntlet plant state
  const [activeGauntletPlantIndex, setActiveGauntletPlantIndex] = useState<number>(0);
  const [gauntletScores, setGauntletScores] = useState<number[]>([]);

  // Autotune state extracted from engine
  const [autotuneStatus, setAutotuneStatus] = useState<any>(null);

  // When switching module, re-seed circuit and reset challenge state
  const handleSelectModule = (modId: string) => {
    const targetMod = MODULE_SPECS[modId];
    if (!targetMod) return;

    setCurrentModuleId(modId);
    setGraph(targetMod.play.defaultCircuit);
    if (engineRef.current) {
      engineRef.current.setGraph(targetMod.play.defaultCircuit);
      engineRef.current.reset();
    }
    setHistory([]);
    setActiveSignals({});
    setCurrentDisturbances({});
    setIsChallengeRunning(false);
    setChallengeTimeLeft(targetMod.prove.durationSeconds);
    setChallengeScore(moduleScores[modId] || 0);
    challengeScoreRef.current = moduleScores[modId] || 0;
    setSweepCurves([]);
    setMysteryResult(null);
    setRightTab('steps');
    setJourneyTab('concept');
    setActiveGauntletPlantIndex(0);
    setGauntletScores([]);
  };

  const handleTriggerManualDisturbance = () => {
    const currentVal = Object.values(currentDisturbances)[0] ?? 0;
    const newVal = currentVal > 0 ? 0 : 25;
    const tankNode = graph.nodes.find(
      (n) => n.type === 'Tank' || n.type === 'FirstOrder' || n.type === 'HeatedVessel' || n.type === 'Bioreactor' || n.type === 'CSTRPlant'
    );
    if (tankNode) {
      setCurrentDisturbances({ [tankNode.id]: newVal });
    } else {
      setCurrentDisturbances({ dist: newVal });
    }
  };

  // Switch plant in Module 8 Gauntlet
  const handleSelectGauntletPlant = (plantIndex: number) => {
    setActiveGauntletPlantIndex(plantIndex);
    const plantSpec = currentModule.prove.tuningGauntletPlants?.[plantIndex];
    if (!plantSpec) return;

    const newNodes = graph.nodes.map((n) => {
      if (n.type === 'FirstOrder') {
        return { ...n, config: { ...n.config, gain: plantSpec.k, timeConstant: plantSpec.tau } };
      }
      if (n.type === 'DeadTime') {
        return { ...n, config: { ...n.config, deadTime: plantSpec.theta } };
      }
      if (n.type === 'Constant') {
        return { ...n, config: { ...n.config, value: plantSpec.targetSP } };
      }
      return n;
    });

    const updated = { ...graph, nodes: newNodes };
    setGraph(updated);
    if (engineRef.current) {
      engineRef.current.setGraph(updated);
      engineRef.current.reset();
    }
    setHistory([]);
  };

  const handleToggleDecoupler = (enabled: boolean) => {
    const updatedNodes = graph.nodes.map((n) => {
      if (n.type === 'MIMOPlant' || n.type === 'Decoupler') {
        return { ...n, config: { ...n.config, decouplerEnabled: enabled } };
      }
      return n;
    });
    const updatedGraph = { ...graph, nodes: updatedNodes };
    setGraph(updatedGraph);
    if (engineRef.current) {
      engineRef.current.updateBlockConfig('mimo-node', { decouplerEnabled: enabled });
      engineRef.current.updateBlockConfig('decoupler-node', { decouplerEnabled: enabled });
    }
  };

  // 5. Fixed-Step Simulation Loop (dt = 0.05s)
  useEffect(() => {
    if (!isRunning) return;

    const intervalMs = Math.max(10, 50 / simSpeed);
    const interval = setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;

      const result = engine.step(currentDisturbances);
      setHistory([...result.history]);
      setActiveSignals({ ...result.activeSignals });

      // Check autotune state
      const atNode = graph.nodes.find((n) => n.type === 'Autotune');
      if (atNode && engine.states[atNode.id]?.autotune) {
        setAutotuneStatus({ ...engine.states[atNode.id].autotune });
      }

      setChallengeMetrics({
        iae: result.metrics.iae,
        ise: result.metrics.ise,
        inToleranceRatio: result.metrics.inToleranceRatio,
        peakOvershootPct: result.metrics.peakOvershootPct,
        currentError: result.metrics.currentError,
        valveTravelTotal: result.metrics.valveTravelTotal,
        riseTime: result.metrics.riseTime,
        settlingTime: result.metrics.settlingTime,
        bodeAnalysis: result.metrics.bodeAnalysis,
        rootLocusAnalysis: result.metrics.rootLocusAnalysis,
        rgaAnalysis: result.metrics.rgaAnalysis,
        cascadeSpeedRatio: result.metrics.cascadeSpeedRatio,
      });

      // Real-time challenge scoring
      if (isChallengeRunning) {
        // Trigger scheduled disturbances
        const simTime = engine.time;
        for (const dist of currentModule.prove.disturbances) {
          if (Math.abs(simTime - dist.time) < DT * 1.5) {
            const drain = dist.drainRate ?? 0;
            const tankNode = graph.nodes.find((n) => n.type === 'Tank');
            if (tankNode) {
              setCurrentDisturbances({ [tankNode.id]: drain });
            }
          }
        }

        // Live Challenge Scoring rules based on module challenge type
        let liveScore = 0;
        const target = currentModule.prove.targetSP;

        if (currentModule.prove.challengeType === 'integralOffsetElimination') {
          // Module 5: zero offset (< 0.5%) + low overshoot (< 15%)
          const steadyOffset = Math.abs(result.metrics.currentError);
          const offsetScore = Math.max(0, 50 - steadyOffset * 25);
          const overshootScore = Math.max(0, 30 - Math.max(0, result.metrics.peakOvershootPct - 10) * 2);
          const tolScore = result.metrics.inToleranceRatio * 20;
          liveScore = Math.min(100, Math.round(offsetScore + overshootScore + tolScore));
        } else if (currentModule.prove.challengeType === 'derivativeNoiseTradeoff') {
          // Module 6: overshoot < 10% + valve chatter < 120
          const overshootScore = Math.max(0, 50 - Math.max(0, result.metrics.peakOvershootPct - 5) * 4);
          const chatterScore = Math.max(0, 35 - Math.max(0, result.metrics.valveTravelTotal - 80) * 0.4);
          const tolScore = result.metrics.inToleranceRatio * 15;
          liveScore = Math.min(100, Math.round(overshootScore + chatterScore + tolScore));
        } else if (currentModule.prove.challengeType === 'antiWindupAndBumpless') {
          // Module 7: Anti-windup active + derivative on measurement + low overshoot
          const ctrlNode = graph.nodes.find((n) => n.id === 'ctrl-pid-ind');
          const hasAw = ctrlNode?.config.antiWindup ? 40 : 0;
          const hasDom = ctrlNode?.config.derivativeOnMeasurement ? 30 : 0;
          const lowOvershoot = result.metrics.peakOvershootPct < 10 ? 30 : Math.max(0, 30 - result.metrics.peakOvershootPct * 2);
          liveScore = Math.min(100, Math.round(hasAw + hasDom + lowOvershoot));
        } else if (currentModule.prove.challengeType === 'tuningGauntlet') {
          // Module 8: Tuning Gauntlet relative to benchmark
          const currentPlant = currentModule.prove.tuningGauntletPlants?.[activeGauntletPlantIndex];
          const bench = currentPlant?.benchmarkIAE ?? 200;
          const iaeRatio = result.metrics.iae / bench;
          const gauntletScore = Math.max(0, Math.min(100, Math.round(110 - iaeRatio * 35)));
          liveScore = gauntletScore;
        } else if (currentModule.prove.challengeType === 'stabilityPrediction') {
          // Module 9: Maintain GM >= 5 dB and PM >= 40 deg with in-tolerance level
          const gm = result.metrics.bodeAnalysis?.gainMarginDb ?? 0;
          const pm = result.metrics.bodeAnalysis?.phaseMarginDeg ?? 0;
          const gmScore = gm >= 5 ? 35 : Math.max(0, gm * 7);
          const pmScore = pm >= 40 ? 35 : Math.max(0, pm * 0.875);
          const tolScore = result.metrics.inToleranceRatio * 30;
          liveScore = Math.min(100, Math.round(gmScore + pmScore + tolScore));
        } else if (currentModule.prove.challengeType === 'feedforwardIAEReduction') {
          // Module 10: IAE reduction with Lead-Lag
          const requiredIAE = currentModule.prove.feedforwardGoal?.requiredMaxIAE ?? 80;
          const currentIAE = result.metrics.iae;
          const iaeScore = currentIAE <= requiredIAE
            ? 70 + Math.min(30, (requiredIAE - currentIAE) * 0.5)
            : Math.max(0, 70 - (currentIAE - requiredIAE) * 0.8);
          liveScore = Math.min(100, Math.round(iaeScore));
        } else if (currentModule.prove.challengeType === 'cascadeTuningSequence') {
          // Module 11: Speed ratio >= 3.0 + settling
          const ratio = result.metrics.cascadeSpeedRatio ?? 1.0;
          const ratioScore = ratio >= 3.0 ? 50 : Math.max(0, ratio * 16.6);
          const tolScore = result.metrics.inToleranceRatio * 50;
          liveScore = Math.min(100, Math.round(ratioScore + tolScore));
        } else if (currentModule.id === 'm13') {
          // Module 13: Four Industrial Case Studies
          const currentLatest = result.history[result.history.length - 1];
          if (activeCaseStudyIndex === 1) {
            // Case 1: Exothermic CSTR Runaway: Keep |Tr - 350| < 2.5 K, Trip limit 365 K
            const currentTr = currentLatest?.pv ?? 350.0;
            if (currentTr >= 365.0) {
              liveScore = 0; // Catastrophic trip
            } else {
              const tempDev = Math.abs(currentTr - 350.0);
              const devScore = tempDev <= 2.5 ? 60 : Math.max(0, 60 - (tempDev - 2.5) * 15);
              const tolScore = result.metrics.inToleranceRatio * 40;
              liveScore = Math.min(100, Math.round(devScore + tolScore));
            }
          } else if (activeCaseStudyIndex === 2) {
            // Case 2: Shell-Tube Exchanger: Outlet temp within +/- 1.5 C
            const currentT = currentLatest?.pv ?? 65.0;
            const tempDev = Math.abs(currentT - 65.0);
            const devScore = tempDev <= 1.5 ? 60 : Math.max(0, 60 - (tempDev - 1.5) * 20);
            const tolScore = result.metrics.inToleranceRatio * 40;
            liveScore = Math.min(100, Math.round(devScore + tolScore));
          } else if (activeCaseStudyIndex === 3) {
            // Case 3: Binary Distillation: xD >= 97.5%
            const currentXD = currentLatest?.pv ?? 98.0;
            const purityScore = currentXD >= 97.5 ? 60 : Math.max(0, 60 - (97.5 - currentXD) * 25);
            const tolScore = result.metrics.inToleranceRatio * 40;
            liveScore = Math.min(100, Math.round(purityScore + tolScore));
          } else {
            // Case 4: Boiler Drum: Lmin > 20%, Lmax < 80%
            const currentL = currentLatest?.pv ?? 50.0;
            if (currentL < 20.0 || currentL > 80.0) {
              liveScore = 0; // Boiler dryout or flood trip
            } else {
              const tolScore = result.metrics.inToleranceRatio * 60;
              const iaeScore = Math.max(0, 40 - result.metrics.iae * 0.1);
              liveScore = Math.min(100, Math.round(tolScore + iaeScore));
            }
          }
        } else if (currentModule.prove.challengeType === 'cstrExothermicRunaway') {
          // Module 13 Case 1 fallback: Keep |Tr - 350| < 2.5 K, Trip limit 365 K
          const currentLatest = result.history[result.history.length - 1];
          const currentTr = currentLatest?.pv ?? 350.0;
          if (currentTr >= 365.0) {
            liveScore = 0; // Catastrophic trip
          } else {
            const tempDev = Math.abs(currentTr - 350.0);
            const devScore = tempDev <= 2.5 ? 60 : Math.max(0, 60 - (tempDev - 2.5) * 15);
            const tolScore = result.metrics.inToleranceRatio * 40;
            liveScore = Math.min(100, Math.round(devScore + tolScore));
          }
        } else if (currentModule.prove.challengeType === 'heatExchangerFeedforward') {
          // Module 13 Case 2: Outlet temp within +/- 1.5 C
          const currentLatest = result.history[result.history.length - 1];
          const currentT = currentLatest?.pv ?? 65.0;
          const tempDev = Math.abs(currentT - 65.0);
          const devScore = tempDev <= 1.5 ? 60 : Math.max(0, 60 - (tempDev - 1.5) * 20);
          const tolScore = result.metrics.inToleranceRatio * 40;
          liveScore = Math.min(100, Math.round(devScore + tolScore));
        } else if (currentModule.prove.challengeType === 'distillationPurityMimo') {
          // Module 13 Case 3: xD >= 97.5%
          const currentLatest = result.history[result.history.length - 1];
          const currentXD = currentLatest?.pv ?? 98.0;
          const purityScore = currentXD >= 97.5 ? 60 : Math.max(0, 60 - (97.5 - currentXD) * 25);
          const tolScore = result.metrics.inToleranceRatio * 40;
          liveScore = Math.min(100, Math.round(purityScore + tolScore));
        } else if (currentModule.prove.challengeType === 'boilerDrumShrinkSwell') {
          // Module 13 Case 4: Lmin > 20%, Lmax < 80%
          const currentLatest = result.history[result.history.length - 1];
          const currentL = currentLatest?.pv ?? 50.0;
          if (currentL < 20.0 || currentL > 80.0) {
            liveScore = 0; // Boiler dryout or flood trip
          } else {
            const tolScore = result.metrics.inToleranceRatio * 60;
            const iaeScore = Math.max(0, 40 - result.metrics.iae * 0.1);
            liveScore = Math.min(100, Math.round(tolScore + iaeScore));
          }
        } else if (currentModule.prove.challengeType === 'unseenPlantCapstone') {
          // Module 14: 40% Stability + 35% IAE + 25% Actuator
          const isStable = Math.abs(result.metrics.currentError) < 15.0;
          const stabilityScore = isStable ? 40 : Math.max(0, 40 - Math.abs(result.metrics.currentError) * 2);
          const iaeBench = 180.0;
          const iaeRatio = result.metrics.iae / iaeBench;
          const iaeScore = Math.max(0, Math.min(35, Math.round(40 - iaeRatio * 15)));
          const chatter = result.metrics.valveTravelTotal;
          const actuatorScore = chatter < 150 ? 25 : Math.max(0, 25 - (chatter - 150) * 0.1);
          liveScore = Math.min(100, Math.round(stabilityScore + iaeScore + actuatorScore));
        } else if (currentModule.prove.challengeType === 'mimoDecoupling') {
          // Module 12: Decoupler enabled + cross-talk isolation
          const mimoNode = graph.nodes.find((n) => n.id === 'mimo-node' || n.type === 'MIMOPlant');
          const isDecoupled = !!mimoNode?.config.decouplerEnabled;
          const decouplerBonus = isDecoupled ? 50 : 0;
          const tolScore = result.metrics.inToleranceRatio * 50;
          liveScore = Math.min(100, Math.round(decouplerBonus + tolScore));
        } else {
          // Default: tolerance ratio and IAE
          const baseScore = result.metrics.inToleranceRatio * 100;
          const penalty = Math.min(25, (result.metrics.iae / (target * 10)) * 10);
          liveScore = Math.max(0, Math.min(100, Math.round(baseScore - penalty)));
        }

        setChallengeScore(liveScore);
        challengeScoreRef.current = liveScore;

        setChallengeTimeLeft((prev) => {
          const next = prev - DT * simSpeed;
          if (next <= 0) {
            finalizeChallenge(result.metrics);
            return 0;
          }
          return next;
        });
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isRunning, simSpeed, currentDisturbances, isChallengeRunning, currentModule, graph, activeGauntletPlantIndex, activeCaseStudyIndex]);

  // Finalize challenge evaluation
  const finalizeChallenge = (metrics: any) => {
    setIsChallengeRunning(false);
    const finalScore = Math.round(challengeScoreRef.current);

    if (currentModule.prove.challengeType === 'tuningGauntlet') {
      const updatedScores = [...gauntletScores];
      updatedScores[activeGauntletPlantIndex] = finalScore;
      setGauntletScores(updatedScores);

      const avgScore = Math.round(
        updatedScores.reduce((a, b) => a + b, 0) / Math.max(1, updatedScores.length)
      );

      setModuleScores((prev) => {
        const best = Math.max(prev[currentModuleId] || 0, avgScore);
        const updated = { ...prev, [currentModuleId]: best };
        localStorage.setItem('bigp_scores', JSON.stringify(updated));
        return updated;
      });

      if (avgScore >= currentModule.prove.passingScore) {
        unlockNextModule();
      }
    } else {
      setModuleScores((prev) => {
        const best = Math.max(prev[currentModuleId] || 0, finalScore);
        const updated = { ...prev, [currentModuleId]: best };
        localStorage.setItem('bigp_scores', JSON.stringify(updated));
        return updated;
      });

      if (finalScore >= currentModule.prove.passingScore) {
        unlockNextModule();
      }
    }
  };

  const unlockNextModule = () => {
    const modNumber = currentModule.number;
    const nextModKey = `m${modNumber + 1}`;
    if (MODULE_SPECS[nextModKey]) {
      setUnlockedModules((prev) => {
        if (!prev.includes(nextModKey)) {
          const updated = [...prev, nextModKey];
          localStorage.setItem('bigp_unlocked', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  };

  // M2 Mystery plant validation
  const handleValidateMysteryGuesses = () => {
    const truePlant = currentModule.prove.systemIdentificationPlant || { k: 1.8, tau: 4.5, theta: 2.5 };
    const errK = Math.abs((mysteryInputs.k - truePlant.k) / truePlant.k);
    const errTau = Math.abs((mysteryInputs.tau - truePlant.tau) / truePlant.tau);
    const errTheta = Math.abs((mysteryInputs.theta - truePlant.theta) / truePlant.theta);

    const isPass = errK <= 0.12 && errTau <= 0.12 && errTheta <= 0.12;
    const avgAccuracy = Math.max(0, 100 - (errK + errTau + errTheta) * 100);
    const calculatedScore = Math.round(isPass ? Math.max(75, avgAccuracy) : Math.min(65, avgAccuracy));

    const feedback = isPass
      ? (lang === 'ar'
          ? `ممتاز! تم فك شفرة المنظومة بنجاح (K=${truePlant.k}, τ=${truePlant.tau}s, θ=${truePlant.theta}s). النتيجة: ${calculatedScore}%`
          : `Brilliant! Parameters verified (K=${truePlant.k}, τ=${truePlant.tau}s, θ=${truePlant.theta}s). Score: ${calculatedScore}%`)
      : (lang === 'ar'
          ? `التقدير يحتاج ضبطاً: K خطأ ${(errK*100).toFixed(0)}%, τ خطأ ${(errTau*100).toFixed(0)}%, θ خطأ ${(errTheta*100).toFixed(0)}%. الدرجة: ${calculatedScore}%. أعد المحاولة!`
          : `Parameters out of tolerance: K error ${(errK*100).toFixed(0)}%, τ error ${(errTau*100).toFixed(0)}%, θ error ${(errTheta*100).toFixed(0)}%. Score: ${calculatedScore}%. Try again!`);

    setMysteryResult({ score: calculatedScore, passed: isPass, feedback });
    setChallengeScore(calculatedScore);
    challengeScoreRef.current = calculatedScore;

    if (isPass) {
      setModuleScores((prev) => {
        const best = Math.max(prev[currentModuleId] || 0, calculatedScore);
        const updated = { ...prev, [currentModuleId]: best };
        localStorage.setItem('bigp_scores', JSON.stringify(updated));
        return updated;
      });
      unlockNextModule();
    }
  };

  // M4 Sweep Kc family
  // Switch Case Study in Module 13
  const handleSelectCaseStudy = (caseIdx: 1 | 2 | 3 | 4) => {
    setActiveCaseStudyIndex(caseIdx);
    // Switch default graph depending on case study
    let newGraph = currentModule.play.defaultCircuit;
    if (caseIdx === 1) {
      // CSTR
      newGraph = {
        nodes: [
          { id: 'sp-node', type: 'Constant', title: 'Target Setpoint', titleAr: 'الهدف المطلوب', x: 40, y: 80, inputs: [], outputs: [{ id: 'sp-out', name: 'SP', type: 'output' }], config: { value: 350 } },
          { id: 'sum-node', type: 'Sum', title: 'Comparator', titleAr: 'مقارن الخطأ', x: 180, y: 80, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 's-out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'ctrl-primary', type: 'PID', title: 'Reactor Controller', titleAr: 'متحكم المفاعل', x: 320, y: 80, inputs: [{ id: 'c-in', name: 'e', type: 'input' }], outputs: [{ id: 'c-out', name: 'u', type: 'output' }], config: { kc: 3.5, ti: 8.0, td: 0.5, bias: 40, antiWindup: true } },
          { id: 'plant-cstr', type: 'CSTRPlant', title: 'Exothermic CSTR', titleAr: 'مفاعل CSTR الطارد', x: 520, y: 80, inputs: [{ id: 'p-u', name: 'u_cw', type: 'input' }, { id: 'p-dist', name: 'T_feed', type: 'input' }], outputs: [{ id: 'p-out', name: 'T_r', type: 'output' }], config: { feedTemp: 350.0 } },
        ],
        wires: [
          { id: 'w-sp', fromBlockId: 'sp-node', fromPortId: 'sp-out', toBlockId: 'sum-node', toPortId: 's-sp' },
          { id: 'w-err', fromBlockId: 'sum-node', fromPortId: 's-out', toBlockId: 'ctrl-primary', toPortId: 'c-in' },
          { id: 'w-ctrl', fromBlockId: 'ctrl-primary', fromPortId: 'c-out', toBlockId: 'plant-cstr', toPortId: 'p-u' },
          { id: 'w-fb', fromBlockId: 'plant-cstr', fromPortId: 'p-out', toBlockId: 'sum-node', toPortId: 's-pv' },
        ],
      };
    } else if (caseIdx === 2) {
      // Heat Exchanger with Feedforward
      newGraph = {
        nodes: [
          { id: 'sp-node', type: 'Constant', title: 'Target Temp', x: 40, y: 60, inputs: [], outputs: [{ id: 'sp-out', name: 'SP', type: 'output' }], config: { value: 65 } },
          { id: 'sum-err', type: 'Sum', title: 'Comparator', x: 180, y: 60, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 's-out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'ctrl-fb', type: 'PI', title: 'Feedback PI', x: 320, y: 60, inputs: [{ id: 'fb-in', name: 'e', type: 'input' }], outputs: [{ id: 'fb-out', name: 'u_fb', type: 'output' }], config: { kc: 2.2, ti: 5.0, bias: 50, antiWindup: true } },
          { id: 'ff-leadlag', type: 'FeedForward', title: 'Flow Lead-Lag', x: 320, y: 220, inputs: [{ id: 'ff-in', name: 'F_proc', type: 'input' }], outputs: [{ id: 'ff-out', name: 'u_ff', type: 'output' }], config: { ffGain: 0.8, tauLead: 4.0, tauLag: 2.0 } },
          { id: 'sum-u', type: 'Sum', title: 'Sum u', x: 470, y: 120, inputs: [{ id: 'u-fb', name: '+', type: 'input' }, { id: 'u-ff', name: '+', type: 'input' }], outputs: [{ id: 'u-out', name: 'u', type: 'output' }], config: { signs: ['+', '+'] } },
          { id: 'hex-plant', type: 'HeatExchangerPlant', title: 'Heat Exchanger', x: 620, y: 120, inputs: [{ id: 'h-u', name: 'u_steam', type: 'input' }, { id: 'h-f', name: 'F_proc', type: 'input' }], outputs: [{ id: 'h-out', name: 'Tout', type: 'output' }], config: { processFluidFlow: 50.0 } },
        ],
        wires: [
          { id: 'w1', fromBlockId: 'sp-node', fromPortId: 'sp-out', toBlockId: 'sum-err', toPortId: 's-sp' },
          { id: 'w2', fromBlockId: 'sum-err', fromPortId: 's-out', toBlockId: 'ctrl-fb', toPortId: 'fb-in' },
          { id: 'w3', fromBlockId: 'ctrl-fb', fromPortId: 'fb-out', toBlockId: 'sum-u', toPortId: 'u-fb' },
          { id: 'w4', fromBlockId: 'ff-leadlag', fromPortId: 'ff-out', toBlockId: 'sum-u', toPortId: 'u-ff' },
          { id: 'w5', fromBlockId: 'sum-u', fromPortId: 'u-out', toBlockId: 'hex-plant', toPortId: 'h-u' },
          { id: 'w6', fromBlockId: 'hex-plant', fromPortId: 'h-out', toBlockId: 'sum-err', toPortId: 's-pv' },
        ],
      };
    } else if (caseIdx === 3) {
      // Distillation
      newGraph = {
        nodes: [
          { id: 'sp-node', type: 'Constant', title: 'Target Purity (xD)', x: 40, y: 80, inputs: [], outputs: [{ id: 'sp-out', name: 'SP', type: 'output' }], config: { value: 98 } },
          { id: 'sum-node', type: 'Sum', title: 'Comparator', x: 180, y: 80, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 's-out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'ctrl-pid', type: 'PID', title: 'Reflux Controller', x: 320, y: 80, inputs: [{ id: 'c-in', name: 'e', type: 'input' }], outputs: [{ id: 'c-out', name: 'L', type: 'output' }], config: { kc: 2.0, ti: 10.0, bias: 50, antiWindup: true } },
          { id: 'dist-plant', type: 'DistillationColumnPlant', title: 'Binary Fractionator', x: 520, y: 80, inputs: [{ id: 'p-L', name: 'Reflux L', type: 'input' }, { id: 'p-V', name: 'Steam V', type: 'input' }, { id: 'p-dist', name: 'F_dist', type: 'input' }], outputs: [{ id: 'p-out', name: 'xD', type: 'output' }], config: { feedComp: 50.0 } },
        ],
        wires: [
          { id: 'w1', fromBlockId: 'sp-node', fromPortId: 'sp-out', toBlockId: 'sum-node', toPortId: 's-sp' },
          { id: 'w2', fromBlockId: 'sum-node', fromPortId: 's-out', toBlockId: 'ctrl-pid', toPortId: 'c-in' },
          { id: 'w3', fromBlockId: 'ctrl-pid', fromPortId: 'c-out', toBlockId: 'dist-plant', toPortId: 'p-L' },
          { id: 'w4', fromBlockId: 'dist-plant', fromPortId: 'p-out', toBlockId: 'sum-node', toPortId: 's-pv' },
        ],
      };
    } else {
      // Boiler Drum Swell
      newGraph = {
        nodes: [
          { id: 'sp-node', type: 'Constant', title: 'Target Level', x: 40, y: 80, inputs: [], outputs: [{ id: 'sp-out', name: 'SP', type: 'output' }], config: { value: 50 } },
          { id: 'sum-node', type: 'Sum', title: 'Comparator', x: 180, y: 80, inputs: [{ id: 's-sp', name: '+', type: 'input' }, { id: 's-pv', name: '-', type: 'input' }], outputs: [{ id: 's-out', name: 'e', type: 'output' }], config: { signs: ['+', '-'] } },
          { id: 'ctrl-pid', type: 'PID', title: '3-Element Level PID', x: 320, y: 80, inputs: [{ id: 'c-in', name: 'e', type: 'input' }], outputs: [{ id: 'c-out', name: 'u', type: 'output' }], config: { kc: 1.8, ti: 12.0, td: 1.0, bias: 50, antiWindup: true } },
          { id: 'boiler-plant', type: 'BoilerDrumPlant', title: 'Boiler Drum (Swell)', x: 520, y: 80, inputs: [{ id: 'b-fw', name: 'Feedwater', type: 'input' }, { id: 'b-steam', name: 'Steam Demand', type: 'input' }], outputs: [{ id: 'b-out', name: 'Drum Level', type: 'output' }], config: { inverseTauZ: 2.5 } },
        ],
        wires: [
          { id: 'w1', fromBlockId: 'sp-node', fromPortId: 'sp-out', toBlockId: 'sum-node', toPortId: 's-sp' },
          { id: 'w2', fromBlockId: 'sum-node', fromPortId: 's-out', toBlockId: 'ctrl-pid', toPortId: 'c-in' },
          { id: 'w3', fromBlockId: 'ctrl-pid', fromPortId: 'c-out', toBlockId: 'boiler-plant', toPortId: 'b-fw' },
          { id: 'w4', fromBlockId: 'boiler-plant', fromPortId: 'b-out', toBlockId: 'sum-node', toPortId: 's-pv' },
        ],
      };
    }
    setGraph(newGraph);
    if (engineRef.current) {
      engineRef.current.setGraph(newGraph);
      engineRef.current.reset();
    }
    setHistory([]);
  };

  const handleSweepKc = () => {
    const kcValues = [0.5, 2.0, 5.0, 15.0];
    const colors = ['#60a5fa', '#34d399', '#f59e0b', '#f43f5e'];
    const curves: any[] = [];

    kcValues.forEach((kcVal, i) => {
      const tempGraph = JSON.parse(JSON.stringify(graph));
      const pNode = tempGraph.nodes.find((n: any) => n.type === 'P');
      if (pNode) pNode.config.kc = kcVal;

      const tempEngine = createSimulationEngine(tempGraph);
      const res = tempEngine.runMultipleSteps(400);
      curves.push({
        label: `Kc = ${kcVal}`,
        kc: kcVal,
        data: res.history,
        color: colors[i],
      });
    });

    setSweepCurves(curves);
  };

  const handleStartChallenge = () => {
    if (engineRef.current) {
      engineRef.current.reset();
    }
    setHistory([]);
    setCurrentDisturbances({});
    setChallengeTimeLeft(currentModule.prove.durationSeconds);
    setChallengeScore(0);
    challengeScoreRef.current = 0;
    setIsChallengeRunning(true);
    setIsRunning(true);
  };

  const handleStopChallenge = () => {
    setIsChallengeRunning(false);
    if (engineRef.current) {
      engineRef.current.reset();
    }
    setHistory([]);
    setCurrentDisturbances({});
  };

  // Exposed control update in Play panel
  const handleUpdateControl = (ctrl: any, value: any) => {
    if (ctrl.id === 'case-selector') {
      handleSelectCaseStudy(value as 1 | 2 | 3 | 4);
      return;
    }
    const newNodes = graph.nodes.map((n) => {
      if (n.id === ctrl.blockId) {
        return {
          ...n,
          config: { ...n.config, [ctrl.property]: value },
        };
      }
      return n;
    });
    const updatedGraph = { ...graph, nodes: newNodes };
    setGraph(updatedGraph);
    if (engineRef.current) {
      engineRef.current.updateBlockConfig(ctrl.blockId, { [ctrl.property]: value });
    }
  };

  // Apply tuning parameters from Autotuner / MetricsPanel
  const handleApplyTuning = (params: { kc: number; ti: number; td: number }) => {
    const newNodes = graph.nodes.map((n) => {
      if (['P', 'PI', 'PID'].includes(n.type)) {
        return {
          ...n,
          config: { ...n.config, kc: params.kc, ti: params.ti, td: params.td },
        };
      }
      return n;
    });
    const updated = { ...graph, nodes: newNodes };
    setGraph(updated);
    if (engineRef.current) {
      engineRef.current.setGraph(updated);
      engineRef.current.reset();
    }
    setHistory([]);
  };

  const handleResetProgress = () => {
    localStorage.removeItem('bigp_unlocked');
    localStorage.removeItem('bigp_scores');
    setUnlockedModules(['m1']);
    setModuleScores({});
    setCurrentModuleId('m1');
    handleSelectModule('m1');
  };

  const isAr = lang === 'ar';
  const latestPt: ScopeDataPoint = history.length > 0 ? history[history.length - 1] : { time: 0, sp: 60, pv: 25, u: 30, error: 35, up: 30, ui: 0, ud: 0, derivativeSlope: 0, isSaturated: false, valveChatter: 0, disturbance: 0, pv2: undefined, sp2: undefined };
  const plantDrain = Object.values(currentDisturbances)[0] ?? 0;

  const prevModNum = currentModule.number - 1;
  const nextModNum = currentModule.number + 1;
  const prevModKey = `m${prevModNum}`;
  const nextModKey = `m${nextModNum}`;
  const canGoPrev = prevModNum >= 1;
  const canGoNext = nextModNum <= 14 && unlockedModules.includes(nextModKey);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 1. Top Navigation Bar */}
      <Navigation
        mode={mode}
        onModeChange={setMode}
        lang={lang}
        onLangChange={setLang}
        currentModuleId={currentModuleId}
        unlockedModules={unlockedModules}
        moduleScores={moduleScores}
        onOpenRoadmap={() => setIsRoadmapOpen(true)}
        onOpenBioprocessModal={() => setIsBioprocessOpen(true)}
        onOpenMasteryModal={() => setIsMasteryOpen(true)}
        onOpenTutorialModal={() => setIsTutorialOpen(true)}
        onResetProgress={handleResetProgress}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-4">
        {mode === 'studio' ? (
          /* Studio Mode: Full Freeform Simulink Sandbox */
          <div className="space-y-4">
            <StudioSandbox
              graph={graph}
              activeSignals={activeSignals}
              onUpdateGraph={(newG) => {
                setGraph(newG);
                if (engineRef.current) engineRef.current.setGraph(newG);
              }}
              history={history}
              isRunning={isRunning}
              onTogglePlay={() => setIsRunning(!isRunning)}
              onReset={() => {
                if (engineRef.current) engineRef.current.reset();
                setHistory([]);
              }}
              simSpeed={simSpeed}
              onSetSimSpeed={setSimSpeed}
              lang={lang}
            />
            {/* Live Metrics Panel in Studio */}
            <MetricsPanel
              metrics={challengeMetrics}
              autotuneState={autotuneStatus}
              onStartAutotune={() => engineRef.current?.startAutotune()}
              onStopAutotune={() => engineRef.current?.stopAutotune()}
              onApplyTuning={handleApplyTuning}
              lang={lang}
            />
          </div>
        ) : (
          /* Academy Mode: FreeCodeCamp-Style Split Study Journey Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT PANE (42% width / 5 cols on lg viewports): Complete Study Journey */}
            <div className="lg:col-span-5 space-y-4">
              {/* 1. Module Header Bar */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-sky-700 flex items-center justify-center text-white font-mono font-bold text-sm shadow-sm shrink-0">
                    {currentModule.number}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        {isAr ? `الوحدة ${currentModule.number} من 14` : `Module ${currentModule.number} of 14`}
                      </span>
                      {(moduleScores[currentModuleId] || 0) >= 70 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{moduleScores[currentModuleId]}%</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate mt-0.5">
                      {isAr ? currentModule.titleAr : currentModule.titleEn}
                    </h2>
                  </div>
                </div>

                {/* Previous / Next Module Navigation Arrows */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    disabled={!canGoPrev}
                    onClick={() => canGoPrev && handleSelectModule(prevModKey)}
                    title={isAr ? 'الوحدة السابقة' : 'Previous Module'}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={!canGoNext}
                    onClick={() => canGoNext && handleSelectModule(nextModKey)}
                    title={isAr ? 'الوحدة التالية' : 'Next Module'}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2. Study Journey Segmented Tab Switcher */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-inner">
                <button
                  onClick={() => setJourneyTab('concept')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    journeyTab === 'concept'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="hidden sm:inline">{isAr ? '1. المفهوم' : '1. Concept & Math'}</span>
                  <span className="sm:hidden">{isAr ? 'المفهوم' : 'Concept'}</span>
                </button>

                <button
                  onClick={() => setJourneyTab('steps')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    journeyTab === 'steps'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">{isAr ? '2. الخطوات' : '2. Guided Steps'}</span>
                  <span className="sm:hidden">{isAr ? 'الخطوات' : 'Steps'}</span>
                </button>

                <button
                  onClick={() => setJourneyTab('prove')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    journeyTab === 'prove'
                      ? 'bg-amber-100 text-amber-950 shadow-sm border border-amber-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">{isAr ? '3. الإثبات' : '3. Prove'}</span>
                  <span className="sm:hidden">{isAr ? 'الإثبات' : 'Prove'}</span>
                  {isChallengeRunning && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </button>

                <button
                  onClick={() => setJourneyTab('all')}
                  title={isAr ? 'عرض الرحلة الكاملة' : 'View Full Journey'}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    journeyTab === 'all'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-[11px]">{isAr ? 'الكل' : 'All'}</span>
                </button>
              </div>

              {/* 3. Study Journey Content Panels */}
              {(journeyTab === 'concept' || journeyTab === 'all') && (
                <div className="space-y-4">
                  <MentalModelBanner module={currentModule} lang={lang} />
                  <SeeTheMathCard
                    module={currentModule}
                    lang={lang}
                    activeFeature={activeFeature}
                    onHoverFeature={setActiveFeature}
                  />
                  {journeyTab === 'concept' && (
                    <button
                      onClick={() => setJourneyTab('steps')}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <span>{isAr ? 'الانتقال إلى خطوات التطبيق الموجهة' : 'Continue to Guided Steps'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {(journeyTab === 'steps' || journeyTab === 'all') && (
                <div className="space-y-4">
                  <GuidedStepsPanel module={currentModule} lang={lang} />
                  {journeyTab === 'steps' && (
                    <button
                      onClick={() => setJourneyTab('prove')}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>{isAr ? 'الانتقال إلى تحدي الإثبات الهندسي' : 'Proceed to Graded Challenge'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {(journeyTab === 'prove' || journeyTab === 'all') && (
                <ProveChallengePanel
                  module={currentModule}
                  score={challengeScore}
                  isChallengeRunning={isChallengeRunning}
                  challengeTimeLeft={challengeTimeLeft}
                  onStartChallenge={handleStartChallenge}
                  onStopChallenge={handleStopChallenge}
                  onUnlockNext={() => {
                    const nextModNum = currentModule.number + 1;
                    const nextModKey = `m${nextModNum}`;
                    if (MODULE_SPECS[nextModKey]) {
                      handleSelectModule(nextModKey);
                    }
                  }}
                  currentMetrics={challengeMetrics}
                  mysteryInputs={mysteryInputs}
                  onUpdateMysteryInputs={setMysteryInputs}
                  onSubmitMysteryGuesses={handleValidateMysteryGuesses}
                  mysteryScoreResult={mysteryResult}
                  activeGauntletPlantIndex={activeGauntletPlantIndex}
                  onSelectGauntletPlant={handleSelectGauntletPlant}
                  gauntletScores={gauntletScores}
                  lang={lang}
                />
              )}
            </div>

            {/* RIGHT PANE (58-60% width / 7 cols on lg viewports): Consolidated Studio Workspace */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
                {/* Studio Toolbar Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 font-bold">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {isAr ? 'مختبر المحاكاة ومعدات التحكم' : 'Simulation Studio Workspace'}
                        </h3>
                        {isChallengeRunning ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300 animate-pulse">
                            <Radio className="w-3 h-3 text-rose-600" />
                            <span>{isAr ? 'تحدي نشط:' : 'Scored Run:'} {challengeTimeLeft.toFixed(0)}s</span>
                          </span>
                        ) : isRunning ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>{isAr ? 'يعمل' : 'Live'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                            {isAr ? 'متوقف' : 'Paused'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transport Controls Toolbar */}
                  <div className="flex items-center gap-2">
                    {/* Speed Selector */}
                    <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-0.5 font-mono text-[10px]">
                      {[1, 2, 5].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => setSimSpeed(spd)}
                          className={`px-2 py-1 rounded-lg font-bold transition-all ${
                            simSpeed === spd
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>

                    {/* Play/Pause */}
                    <button
                      onClick={() => setIsRunning(!isRunning)}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm ${
                        isRunning
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20'
                      }`}
                      title={isRunning ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'تشغيل' : 'Run')}
                    >
                      {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span className="hidden sm:inline">{isRunning ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'تشغيل' : 'Run')}</span>
                    </button>

                    {/* Reset */}
                    <button
                      onClick={() => {
                        if (engineRef.current) engineRef.current.reset();
                        setHistory([]);
                        setCurrentDisturbances({});
                      }}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors shadow-sm"
                      title={isAr ? 'إعادة ضبط المنظومة' : 'Reset Simulation'}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Disturbance Shock */}
                    <button
                      onClick={handleTriggerManualDisturbance}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors shadow-sm flex items-center gap-1 ${
                        plantDrain > 0
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                      title={isAr ? 'تطبيق اضطراب مفاجئ لفحص قدرة المتحكم' : 'Trigger disturbance load shock'}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span className="hidden md:inline">{isAr ? 'اضطراب مفاجئ' : 'Load Shock'}</span>
                    </button>
                  </div>
                </div>

                {/* Studio Workbench View Switcher Tabs (Overview | Scoped Strip Chart | Full P&ID) */}
                <div className="flex items-center justify-between gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setStudioDisplayTab('overview')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        studioDisplayTab === 'overview'
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isAr ? 'العرض الموحد (Overview)' : 'Overview'}
                    </button>
                    <button
                      onClick={() => setStudioDisplayTab('scope')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                        studioDisplayTab === 'scope'
                          ? 'bg-white text-cyan-800 shadow-sm border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-cyan-600" />
                      <span>{isAr ? 'راسم الإشارات (Scope)' : 'Scope Traces'}</span>
                    </button>
                    <button
                      onClick={() => setStudioDisplayTab('flowsheet')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                        studioDisplayTab === 'flowsheet'
                          ? 'bg-white text-cyan-800 shadow-sm border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5 text-cyan-600" />
                      <span>{isAr ? 'مخطط P&ID' : 'P&ID Flowsheet'}</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-500 font-mono hidden md:inline px-2">
                    {isAr ? 'تحديث لحظي بمعدل 50ms' : '50ms real-time ODE loop'}
                  </span>
                </div>

                {/* Section 1: Equipment Schematic & P&ID Flowsheet Workbench */}
                {(studioDisplayTab === 'overview' || studioDisplayTab === 'flowsheet') && (
                  <div className="space-y-3">
                    {/* For Module 13 & 14: Show Industrial PID Visualizer */}
                    {(currentModule.id === 'm13' || currentModule.id === 'm14') ? (
                      <div className="space-y-2">
                        {currentModule.id === 'm13' && (
                          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
                            <span className="text-slate-500 px-2 text-[11px]">{isAr ? 'دراسة الحالة:' : 'Case Study:'}</span>
                            {[
                              { idx: 1, labelEn: '1. CSTR Runaway', labelAr: '1. مفاعل CSTR' },
                              { idx: 2, labelEn: '2. Heat Exchanger', labelAr: '2. المبادل' },
                              { idx: 3, labelEn: '3. Distillation', labelAr: '3. التقطير' },
                              { idx: 4, labelEn: '4. Boiler Swell', labelAr: '4. المرجل' },
                            ].map((c) => (
                              <button
                                key={c.idx}
                                onClick={() => handleSelectCaseStudy(c.idx as 1 | 2 | 3 | 4)}
                                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-colors ${
                                  activeCaseStudyIndex === c.idx
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {isAr ? c.labelAr : c.labelEn}
                              </button>
                            ))}
                          </div>
                        )}
                        <IndustrialPidVisualizer
                          caseIndex={currentModule.id === 'm14' ? 1 : activeCaseStudyIndex}
                          pv={latestPt.pv}
                          sp={latestPt.sp}
                          u={latestPt.u}
                          pv2={latestPt.pv2}
                          disturbance={plantDrain}
                          lang={lang}
                        />
                      </div>
                    ) : (
                      /* Modules 1 to 12: Dual Equipment Schematic & ISA-5.1 Flowsheet */
                      <div className="grid grid-cols-1 gap-3.5">
                        <EquipmentVisualizer
                          type={currentModule.play.equipmentType}
                          levelPct={latestPt.pv}
                          targetSP={latestPt.sp}
                          valveOpeningPct={latestPt.u}
                          disturbanceFlow={plantDrain}
                          activeFeature={activeFeature}
                          lang={lang}
                        />

                        <BlockDiagramCanvas
                          graph={graph}
                          activeSignals={activeSignals}
                          onUpdateGraph={(newG) => {
                            setGraph(newG);
                            if (engineRef.current) engineRef.current.setGraph(newG);
                          }}
                          activeFeature={activeFeature}
                          allowWiring={currentModule.id === 'm3'}
                          lang={lang}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Section 2: Docked Consolidated Control Surface */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-600" />
                      {isAr ? 'لوحة التحكم وضبط البارامترات:' : 'Consolidated Process Controls:'}
                    </span>

                    {currentModule.play.allowSweepKc && (
                      <button
                        onClick={handleSweepKc}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs transition-colors shadow-sm"
                      >
                        <RefreshCw className="w-3 h-3 text-indigo-600" />
                        <span>{isAr ? 'مسح استجابات Kc المتعددة' : 'Sweep Kc Curves'}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {currentModule.play.controlsExposed.map((ctrl) => {
                      const node = graph.nodes.find((n) => n.id === ctrl.blockId);
                      const currentVal = ctrl.id === 'case-selector' 
                        ? activeCaseStudyIndex 
                        : ((node?.config as Record<string, any> | undefined)?.[ctrl.property] ?? ctrl.min);

                      if (ctrl.controlType === 'toggle') {
                        const isChecked = !!currentVal;
                        return (
                          <div key={ctrl.id} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between shadow-xs">
                            <span className="text-slate-700 font-medium">
                              {isAr ? ctrl.labelAr : ctrl.labelEn}
                            </span>
                            <button
                              onClick={() => handleUpdateControl(ctrl, !isChecked)}
                              className={`px-3 py-1 rounded-lg font-mono font-bold text-[11px] border transition-colors ${
                                isChecked
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {isChecked ? (isAr ? 'مُفعّل' : 'ON') : (isAr ? 'معطّل' : 'OFF')}
                            </button>
                          </div>
                        );
                      }

                      if (ctrl.controlType === 'select' && ctrl.options) {
                        return (
                          <div key={ctrl.id} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-xs">
                            <span className="text-slate-700 font-medium block">
                              {isAr ? ctrl.labelAr : ctrl.labelEn}
                            </span>
                            <div className="flex gap-1.5">
                              {ctrl.options.map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => handleUpdateControl(ctrl, opt.value)}
                                  className={`flex-1 py-1 rounded font-mono text-[10px] font-bold border transition-colors ${
                                    currentVal === opt.value
                                      ? 'bg-cyan-600 border-cyan-500 text-white'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {isAr ? opt.labelAr : opt.labelEn}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={ctrl.id} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-700 font-medium">
                              {isAr ? ctrl.labelAr : ctrl.labelEn}
                            </span>
                            <span className="font-mono font-bold text-cyan-700 text-[11px]">
                              {typeof currentVal === 'number' ? currentVal.toFixed(1) : currentVal} {ctrl.unit}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={ctrl.min}
                            max={ctrl.max}
                            step={ctrl.step}
                            value={typeof currentVal === 'number' ? currentVal : 0}
                            onChange={(e) => handleUpdateControl(ctrl, parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Digital Oscilloscope Scope Chart */}
                {(studioDisplayTab === 'overview' || studioDisplayTab === 'scope') && (
                  <ScopeChart
                    history={history}
                    isRunning={isRunning}
                    onTogglePlay={() => setIsRunning(!isRunning)}
                    onReset={() => {
                      if (engineRef.current) engineRef.current.reset();
                      setHistory([]);
                    }}
                    activeFeature={activeFeature}
                    targetSP={latestPt.sp}
                    toleranceBandPct={currentModule.prove.toleranceBandPct}
                    sweepCurves={sweepCurves}
                    moduleId={currentModule.id}
                    lang={lang}
                    showTermMeter={currentModule.play.showTermMeter}
                    fopdtParams={
                      currentModule.id === 'm2'
                        ? {
                            k: graph.nodes.find((n) => n.type === 'FirstOrder')?.config.gain ?? 1.5,
                            tau: graph.nodes.find((n) => n.type === 'FirstOrder')?.config.timeConstant ?? 5.0,
                            theta: graph.nodes.find((n) => n.type === 'DeadTime')?.config.deadTime ?? 2.0,
                            stepTime: 3.0,
                            stepVal: 40,
                          }
                        : undefined
                    }
                  />
                )}

                {/* Section 4: Specialized Docked Analyzers */}
                {/* Module 8 Relay Autotuner & Metrics */}
                {currentModule.id === 'm8' && (
                  <MetricsPanel
                    metrics={challengeMetrics}
                    autotuneState={autotuneStatus}
                    onStartAutotune={() => engineRef.current?.startAutotune()}
                    onStopAutotune={() => engineRef.current?.stopAutotune()}
                    onApplyTuning={handleApplyTuning}
                    lang={lang}
                  />
                )}

                {/* Module 9 Stability & Frequency Domain Analyzers */}
                {currentModule.id === 'm9' && (
                  <div className="space-y-3.5 pt-1 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Compass className="w-4 h-4 text-cyan-600" />
                      <span>{isAr ? 'تحليلات الاستقرار والتردد المتقدمة (Frequency & Root Locus):' : 'Advanced Stability & S-Plane Analyzers:'}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <BodeViewer
                        analysis={challengeMetrics.bodeAnalysis}
                        activeFeature={activeFeature}
                        lang={lang}
                      />
                      <RootLocusViewer
                        analysis={challengeMetrics.rootLocusAnalysis}
                        activeFeature={activeFeature}
                        lang={lang}
                      />
                    </div>
                  </div>
                )}

                {/* Module 12 Multivariable Bristol RGA & Decoupling Analyzer */}
                {currentModule.id === 'm12' && (
                  <div className="space-y-3 pt-1 border-t border-slate-200">
                    <RgaMatrixViewer
                      analysis={challengeMetrics.rgaAnalysis}
                      gains={{
                        k11: graph.nodes.find((n) => n.type === 'MIMOPlant')?.config.k11 ?? 12.8,
                        k12: graph.nodes.find((n) => n.type === 'MIMOPlant')?.config.k12 ?? -18.9,
                        k21: graph.nodes.find((n) => n.type === 'MIMOPlant')?.config.k21 ?? 6.6,
                        k22: graph.nodes.find((n) => n.type === 'MIMOPlant')?.config.k22 ?? -19.4,
                      }}
                      decouplerEnabled={!!graph.nodes.find((n) => n.type === 'MIMOPlant')?.config.decouplerEnabled}
                      onToggleDecoupler={handleToggleDecoupler}
                      activeFeature={activeFeature}
                      lang={lang}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Curriculum Roadmap Drawer (14 Modules) */}
      <ModuleRoadmapDrawer
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
        currentModuleId={currentModuleId}
        unlockedModules={unlockedModules}
        moduleScores={moduleScores}
        onSelectModule={handleSelectModule}
        lang={lang}
      />

      {/* Mastery Dashboard & Certificate Generator Modal */}
      <MasteryDashboardModal
        isOpen={isMasteryOpen}
        onClose={() => setIsMasteryOpen(false)}
        moduleScores={moduleScores}
        unlockedModules={unlockedModules}
        onImportProgress={(newScores, newUnlocked) => {
          setModuleScores(newScores);
          setUnlockedModules(newUnlocked);
          localStorage.setItem('bigp_scores', JSON.stringify(newScores));
          localStorage.setItem('bigp_unlocked', JSON.stringify(newUnlocked));
        }}
        lang={lang}
      />
      {/* Bioscience & Science Lab Modal */}
      <BioprocessModal
        isOpen={isBioprocessOpen}
        onClose={() => setIsBioprocessOpen(false)}
        onLoadBioreactorInStudio={() => {
          setMode('studio');
          const bioreactorPreset = {
            nodes: [
              {
                id: 'sp-do',
                type: 'Constant' as const,
                title: 'DO Setpoint',
                x: 40,
                y: 60,
                inputs: [],
                outputs: [{ id: 'sp-out', name: 'SP', type: 'output' as const }],
                config: { value: 50 },
              },
              {
                id: 'sum-do',
                type: 'Sum' as const,
                title: 'Comparator',
                x: 180,
                y: 60,
                inputs: [
                  { id: 's1', name: '+', type: 'input' as const },
                  { id: 's2', name: '-', type: 'input' as const },
                ],
                outputs: [{ id: 'e-out', name: 'e', type: 'output' as const }],
                config: { signs: ['+', '-'] as ('+' | '-')[] },
              },
              {
                id: 'pi-do',
                type: 'PI' as const,
                title: 'PI Aeration Controller',
                x: 320,
                y: 60,
                inputs: [{ id: 'pi-in', name: 'e', type: 'input' as const }],
                outputs: [{ id: 'pi-out', name: 'u', type: 'output' as const }],
                config: { kc: 3.5, ti: 6.0, action: 'reverse' as const, bias: 30 },
              },
              {
                id: 'bioreactor-1',
                type: 'Bioreactor' as const,
                title: 'Cell Bioreactor',
                x: 520,
                y: 60,
                inputs: [
                  { id: 'b-rpm', name: 'Agitator/Air', type: 'input' as const },
                  { id: 'b-feed', name: 'Glucose', type: 'input' as const },
                ],
                outputs: [{ id: 'b-do', name: 'DO', type: 'output' as const }],
                config: { biomassInitial: 1.0, substrateInitial: 20.0, doInitial: 80.0 },
              },
            ],
            wires: [
              { id: 'w1', fromBlockId: 'sp-do', fromPortId: 'sp-out', toBlockId: 'sum-do', toPortId: 's1' },
              { id: 'w2', fromBlockId: 'sum-do', fromPortId: 'e-out', toBlockId: 'pi-do', toPortId: 'pi-in' },
              { id: 'w3', fromBlockId: 'pi-do', fromPortId: 'pi-out', toBlockId: 'bioreactor-1', toPortId: 'b-rpm' },
              { id: 'w4', fromBlockId: 'bioreactor-1', fromPortId: 'b-do', toBlockId: 'sum-do', toPortId: 's2' },
            ],
          };
          setGraph(bioreactorPreset);
          if (engineRef.current) {
            engineRef.current.setGraph(bioreactorPreset);
            engineRef.current.reset();
          }
          setHistory([]);
        }}
        lang={lang}
      />

      {/* Interactive Quick Guide & Tutorial Modal */}
      <InteractiveTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onHighlightElement={(elem) => setHighlightedUiArea(elem)}
        lang={lang}
      />
    </div>
  );
}
