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
import { Sliders, Activity, Compass, Layers, CheckCircle2, RefreshCw, Zap, Waves, Crosshair, Network, ArrowRightLeft } from 'lucide-react';

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

  // Drawers and Modals
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isBioprocessOpen, setIsBioprocessOpen] = useState(false);

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
    setSweepCurves([]);
    setMysteryResult(null);
    setRightTab('steps');
    setActiveGauntletPlantIndex(0);
    setGauntletScores([]);
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
        setChallengeTimeLeft((prev) => {
          const next = prev - DT * simSpeed;
          if (next <= 0) {
            finalizeChallenge(result.metrics);
            return 0;
          }
          return next;
        });

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
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isRunning, simSpeed, currentDisturbances, isChallengeRunning, currentModule, graph, activeGauntletPlantIndex]);

  // Finalize challenge evaluation
  const finalizeChallenge = (metrics: any) => {
    setIsChallengeRunning(false);
    const finalScore = Math.round(challengeScore);

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
  const latestPt = history.length > 0 ? history[history.length - 1] : { sp: 60, pv: 25, u: 30 };
  const plantDrain = Object.values(currentDisturbances)[0] ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
        onResetProgress={handleResetProgress}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
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
          /* Academy Mode: 4-Part Pedagogical Workflow (Mental Model, See the Math, Play, Prove) */
          <div className="space-y-5">
            {/* Pillar 1: Mental Model Banner */}
            <MentalModelBanner module={currentModule} lang={lang} />

            {/* Pillar 2: See the Math Interactive Equation Card */}
            <SeeTheMathCard
              module={currentModule}
              lang={lang}
              activeFeature={activeFeature}
              onHoverFeature={setActiveFeature}
            />

            {/* Pillar 3 & 4: Play Center + Right Guided Steps & Prove Challenges */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left/Center (Cols 1 to 8): Live Animated Equipment + Block Canvas + Scope */}
              <div className="lg:col-span-8 space-y-4">
                {/* Visual Equipment & Diagram Split View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EquipmentVisualizer
                    type={currentModule.play.equipmentType}
                    levelPct={latestPt.pv}
                    targetSP={latestPt.sp}
                    valveOpeningPct={latestPt.u}
                    disturbanceFlow={plantDrain}
                    activeFeature={activeFeature}
                    lang={lang}
                  />

                  {/* Interactive Block Diagram */}
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

                {/* Exposed Controls Sliders Bar (Play Pillar) */}
                <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      {isAr ? 'عناصر التحكم المتاحة لهذا الدرس:' : 'Lesson Interactive Controls:'}
                    </span>

                    {/* Module 4 Sweep Kc button */}
                    {currentModule.play.allowSweepKc && (
                      <button
                        onClick={handleSweepKc}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 font-semibold text-xs transition-colors shadow-sm"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{isAr ? 'مسح استجابات Kc المتعددة' : 'Sweep Kc Family of Curves'}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {currentModule.play.controlsExposed.map((ctrl) => {
                      const node = graph.nodes.find((n) => n.id === ctrl.blockId);
                      const currentVal = (node?.config as Record<string, any> | undefined)?.[ctrl.property] ?? ctrl.min;

                      if (ctrl.controlType === 'toggle') {
                        const isChecked = !!currentVal;
                        return (
                          <div key={ctrl.id} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
                            <span className="text-slate-300 font-medium">
                              {isAr ? ctrl.labelAr : ctrl.labelEn}
                            </span>
                            <button
                              onClick={() => handleUpdateControl(ctrl, !isChecked)}
                              className={`px-3 py-1 rounded-lg font-mono font-bold text-[11px] border transition-colors ${
                                isChecked
                                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow'
                                  : 'bg-slate-900 border-slate-700 text-slate-400'
                              }`}
                            >
                              {isChecked ? (isAr ? 'مُفعّل' : 'ON') : (isAr ? 'معطّل' : 'OFF')}
                            </button>
                          </div>
                        );
                      }

                      if (ctrl.controlType === 'select' && ctrl.options) {
                        return (
                          <div key={ctrl.id} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                            <span className="text-slate-300 font-medium block">
                              {isAr ? ctrl.labelAr : ctrl.labelEn}
                            </span>
                            <div className="flex gap-1.5">
                              {ctrl.options.map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => handleUpdateControl(ctrl, opt.value)}
                                  className={`flex-1 py-1 rounded font-mono text-[10px] font-bold border transition-colors ${
                                    currentVal === opt.value
                                      ? 'bg-cyan-600 border-cyan-400 text-white'
                                      : 'bg-slate-900 border-slate-700 text-slate-400'
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
                        <div key={ctrl.id} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-slate-300 font-medium">
                              {isAr ? ctrl.labelAr : ctrl.labelEn}
                            </span>
                            <span className="font-mono font-bold text-cyan-300 text-[11px]">
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

                {/* Scope Chart */}
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

                {/* Metrics Panel for Module 8 */}
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
                  <div className="space-y-4">
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
                )}

                {/* Module 12 Multivariable Bristol RGA & Decoupling Analyzer */}
                {currentModule.id === 'm12' && (
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
                )}
              </div>

              {/* Right Panel (Cols 9 to 12): Guided Steps & Prove Challenges */}
              <div className="lg:col-span-4 space-y-3">
                {/* Tab Switcher */}
                <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
                  <button
                    onClick={() => setRightTab('steps')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      rightTab === 'steps' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isAr ? 'الخطوات والإرشاد' : '1. Guided Steps'}
                  </button>
                  <button
                    onClick={() => setRightTab('prove')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      rightTab === 'prove'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{isAr ? '2. تحدي الإثبات' : '2. Prove Challenge'}</span>
                    {(moduleScores[currentModuleId] || 0) >= 70 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>
                  <button
                    onClick={() => setRightTab('metrics')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      rightTab === 'metrics'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{isAr ? 'المقاييس' : 'Metrics'}</span>
                  </button>
                </div>

                {rightTab === 'steps' && (
                  <GuidedStepsPanel module={currentModule} lang={lang} />
                )}

                {rightTab === 'prove' && (
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

                {rightTab === 'metrics' && (
                  <MetricsPanel
                    metrics={challengeMetrics}
                    autotuneState={autotuneStatus}
                    onStartAutotune={() => engineRef.current?.startAutotune()}
                    onStopAutotune={() => engineRef.current?.stopAutotune()}
                    onApplyTuning={handleApplyTuning}
                    lang={lang}
                  />
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
    </div>
  );
}
