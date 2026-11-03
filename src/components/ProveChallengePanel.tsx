/**
 * Prove Challenge Panel (bigp Spec Pillar 4)
 * High-stakes automated evaluation dashboard with real-time performance gauges,
 * progressive indicators, and tactile commissioning actions.
 */

import React, { useState } from 'react';
import { ModuleSpec } from '../types/curriculum';
import { Trophy, Play, CheckCircle, AlertTriangle, ArrowRight, RotateCcw, Target, Award, Layers } from 'lucide-react';

interface ProveChallengePanelProps {
  module: ModuleSpec;
  score: number;
  isChallengeRunning: boolean;
  challengeTimeLeft: number;
  onStartChallenge: () => void;
  onStopChallenge: () => void;
  onUnlockNext: () => void;
  currentMetrics: {
    iae: number;
    inToleranceRatio: number;
    peakOvershootPct: number;
    currentError: number;
    valveTravelTotal?: number;
  };
  mysteryInputs?: { k: number; tau: number; theta: number };
  onUpdateMysteryInputs?: (inputs: { k: number; tau: number; theta: number }) => void;
  onSubmitMysteryGuesses?: () => void;
  mysteryScoreResult?: { score: number; passed: boolean; feedback: string } | null;
  activeGauntletPlantIndex?: number;
  onSelectGauntletPlant?: (index: number) => void;
  gauntletScores?: number[];
  lang: 'en' | 'ar';
}

export const ProveChallengePanel: React.FC<ProveChallengePanelProps> = ({
  module,
  score,
  isChallengeRunning,
  challengeTimeLeft,
  onStartChallenge,
  onStopChallenge,
  onUnlockNext,
  currentMetrics,
  mysteryInputs,
  onUpdateMysteryInputs,
  onSubmitMysteryGuesses,
  mysteryScoreResult,
  activeGauntletPlantIndex = 0,
  onSelectGauntletPlant,
  gauntletScores = [],
  lang,
}) => {
  const isAr = lang === 'ar';
  const challenge = module.prove;
  const passed = score >= challenge.passingScore || (mysteryScoreResult && mysteryScoreResult.passed);

  return (
    <div className="panel-card p-5 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-sm shadow-amber-950/10">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                {isAr ? 'تحدي الإثبات الهندسي' : 'Graded Prove Challenge'}
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">
                {isAr ? challenge.titleAr : challenge.titleEn}
              </h3>
            </div>
          </div>

          {/* Target Passing Mark */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs">
            <Target className="w-3.5 h-3.5 text-cyan-700" />
            <span className="text-slate-600 font-medium">{isAr ? 'النجاح:' : 'Pass:'}</span>
            <span className="text-emerald-700 font-bold">≥{challenge.passingScore}%</span>
          </div>
        </div>

        {/* Instructions */}
        <p className="mt-3 text-xs text-slate-600 leading-relaxed">
          {isAr ? challenge.instructionsAr : challenge.instructionsEn}
        </p>

        {/* Tuning Gauntlet Selector for M8 */}
        {challenge.challengeType === 'tuningGauntlet' && challenge.tuningGauntletPlants && (
          <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-sky-700 block">
              {isAr ? 'اختر المنظومة الصناعية للاختبار (3 جولات):' : 'Select Industrial Plant (3 Rounds):'}
            </span>
            <div className="space-y-1.5">
              {challenge.tuningGauntletPlants.map((plant, idx) => {
                const isSelected = activeGauntletPlantIndex === idx;
                const pScore = gauntletScores[idx];

                return (
                  <button
                    key={idx}
                    onClick={() => onSelectGauntletPlant && onSelectGauntletPlant(idx)}
                    className={`w-full p-2.5 rounded-xl border text-left font-mono flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-sky-50 border-cyan-400 text-sky-900 font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>{isAr ? plant.nameAr : plant.nameEn}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">
                        τ={plant.tau}s, θ={plant.theta}s
                      </span>
                      {pScore !== undefined && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${pScore >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                          {pScore}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* M2 Mystery Plant Identification Form */}
        {challenge.challengeType === 'systemIdentification' && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-sky-700 flex items-center justify-between">
              <span>{isAr ? 'أدخل تقديراتك الهندسية:' : 'Enter Identified Parameters:'}</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {isAr ? '(±10% للدقة المطلوبة)' : '(Within ±10% to pass)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-500 font-mono block mb-1">Gain K:</label>
                <input
                  type="number"
                  step="0.1"
                  value={mysteryInputs?.k ?? 1.0}
                  onChange={(e) =>
                    onUpdateMysteryInputs &&
                    mysteryInputs &&
                    onUpdateMysteryInputs({ ...mysteryInputs, k: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold font-mono text-xs focus:border-cyan-400 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-mono block mb-1">Tau τ (s):</label>
                <input
                  type="number"
                  step="0.5"
                  value={mysteryInputs?.tau ?? 3.0}
                  onChange={(e) =>
                    onUpdateMysteryInputs &&
                    mysteryInputs &&
                    onUpdateMysteryInputs({ ...mysteryInputs, tau: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold font-mono text-xs focus:border-cyan-400 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-mono block mb-1">Theta θ (s):</label>
                <input
                  type="number"
                  step="0.2"
                  value={mysteryInputs?.theta ?? 1.0}
                  onChange={(e) =>
                    onUpdateMysteryInputs &&
                    mysteryInputs &&
                    onUpdateMysteryInputs({ ...mysteryInputs, theta: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold font-mono text-xs focus:border-cyan-400 outline-none"
                />
              </div>
            </div>

            <button
              onClick={onSubmitMysteryGuesses}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-950"
            >
              {isAr ? 'تحقق من التقديرات وتقييم الدرجة' : 'Validate Estimates & Grade'}
            </button>

            {mysteryScoreResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono ${
                  mysteryScoreResult.passed
                    ? 'bg-emerald-50/60 border-emerald-500/60 text-emerald-700'
                    : 'bg-rose-50/60 border-rose-500/60 text-rose-700'
                }`}
              >
                {mysteryScoreResult.feedback}
              </div>
            )}
          </div>
        )}

        {/* Real-time Performance Gauge & Scorecard */}
        {challenge.challengeType !== 'systemIdentification' && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono font-bold">
                {isAr ? 'الدرجة الحالية:' : 'Live Score:'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-black text-slate-900">
                  {Math.round(score)}%
                </span>
                {passed ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {isAr ? 'ناجح' : 'Passed'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px]">
                    {isAr ? 'قيد التقييم' : 'Evaluating'}
                  </span>
                )}
              </div>
            </div>

            {/* Score progress bar */}
            <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  passed
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-md shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-amber-500 to-sky-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow"
                style={{ left: `${challenge.passingScore}%` }}
                title="70% Passing Threshold"
              />
            </div>

            {/* Live engineering telemetry */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-slate-500 text-center">
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <span className="block text-[10px] text-slate-500">{isAr ? 'داخل النطاق' : 'In Tolerance'}</span>
                <span className="text-slate-800 font-bold">
                  {(currentMetrics.inToleranceRatio * 100).toFixed(0)}%
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <span className="block text-[10px] text-slate-500">{isAr ? 'تراكم IAE' : 'IAE Metric'}</span>
                <span className="text-slate-800 font-bold">{currentMetrics.iae.toFixed(0)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <span className="block text-[10px] text-slate-500">{isAr ? 'الوقت المتبقي' : 'Time Left'}</span>
                <span className="text-sky-700 font-bold">{challengeTimeLeft.toFixed(0)}s</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trigger Buttons */}
      <div className="pt-3 border-t border-slate-200 space-y-2">
        {challenge.challengeType !== 'systemIdentification' && (
          <button
            onClick={isChallengeRunning ? onStopChallenge : onStartChallenge}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
              isChallengeRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black shadow-amber-950/40 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isChallengeRunning ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>{isAr ? 'إلغاء وإعادة المحاولة' : 'Abort & Reset Challenge'}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{isAr ? 'بدء التحدي المقيم الآن' : 'Start Scored Challenge'}</span>
              </>
            )}
          </button>
        )}

        {passed && (
          <button
            onClick={onUnlockNext}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 animate-pulse-glow"
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>{isAr ? 'ممتاز! افتح الوحدة التالية' : 'Passed! Unlock Next Module'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
