/**
 * Prove Challenge Panel (bigp Spec Pillar 4 - Milestones 1 & 2)
 * Automated, time-boxed scored challenge evaluator:
 * Calculates IAE, settling time, overshoot %, offset %, and in-tolerance score.
 * Handles Module 1–4 and Module 5–8 (I-control offset, D-noise tradeoff, Anti-Windup, Tuning Gauntlet).
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
  // Mystery Plant inputs for Module 2
  mysteryInputs?: { k: number; tau: number; theta: number };
  onUpdateMysteryInputs?: (inputs: { k: number; tau: number; theta: number }) => void;
  onSubmitMysteryGuesses?: () => void;
  mysteryScoreResult?: { score: number; passed: boolean; feedback: string } | null;
  // Module 8 Tuning Gauntlet
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
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-lg flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                {isAr ? 'تحدي الإثبات والاختبار' : 'Prove Challenge (Graded)'}
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">
                {isAr ? challenge.titleAr : challenge.titleEn}
              </h3>
            </div>
          </div>

          {/* Target Passing Mark Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">{isAr ? 'النجاح:' : 'Pass:'}</span>
            <span className="text-emerald-400 font-bold">≥{challenge.passingScore}%</span>
          </div>
        </div>

        {/* Instructions */}
        <p className="mt-3 text-xs text-slate-300 leading-relaxed">
          {isAr ? challenge.instructionsAr : challenge.instructionsEn}
        </p>

        {/* Module 8: 3-Plant Tuning Gauntlet Selector */}
        {challenge.challengeType === 'tuningGauntlet' && challenge.tuningGauntletPlants && (
          <div className="mt-3 p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
            <span className="font-bold text-cyan-300 block">
              {isAr ? 'اختر المنظومة الصناعية للاختبار (3 جولات):' : 'Select Industrial Plant to Test (3 Rounds):'}
            </span>
            <div className="space-y-1.5">
              {challenge.tuningGauntletPlants.map((plant, idx) => {
                const isSelected = activeGauntletPlantIndex === idx;
                const pScore = gauntletScores[idx];

                return (
                  <button
                    key={idx}
                    onClick={() => onSelectGauntletPlant && onSelectGauntletPlant(idx)}
                    className={`w-full p-2 rounded-lg border text-left font-mono flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{isAr ? plant.nameAr : plant.nameEn}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">
                        τ={plant.tau}s, θ={plant.theta}s
                      </span>
                      {pScore !== undefined && (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${pScore >= 70 ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>
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

        {/* M2 Specific Interactive Callipers Input Form */}
        {challenge.challengeType === 'systemIdentification' && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-cyan-300 flex items-center justify-between">
              <span>{isAr ? 'أدخل تقديراتك الهندسية:' : 'Enter Your Parameter Estimates:'}</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {isAr ? '(±10% للدقة المطلوبة)' : '(Within ±10% to pass)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 font-mono block">Gain K:</label>
                <input
                  type="number"
                  step="0.1"
                  value={mysteryInputs?.k ?? 1.0}
                  onChange={(e) =>
                    onUpdateMysteryInputs &&
                    mysteryInputs &&
                    onUpdateMysteryInputs({ ...mysteryInputs, k: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-mono block">Tau τ (s):</label>
                <input
                  type="number"
                  step="0.5"
                  value={mysteryInputs?.tau ?? 3.0}
                  onChange={(e) =>
                    onUpdateMysteryInputs &&
                    mysteryInputs &&
                    onUpdateMysteryInputs({ ...mysteryInputs, tau: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-mono block">Theta θ (s):</label>
                <input
                  type="number"
                  step="0.2"
                  value={mysteryInputs?.theta ?? 1.0}
                  onChange={(e) =>
                    onUpdateMysteryInputs &&
                    mysteryInputs &&
                    onUpdateMysteryInputs({ ...mysteryInputs, theta: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                />
              </div>
            </div>

            <button
              onClick={onSubmitMysteryGuesses}
              className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-950"
            >
              {isAr ? 'تحقق من التقديرات وتقييم الدرجة' : 'Validate Estimates & Grade'}
            </button>

            {mysteryScoreResult && (
              <div
                className={`p-2.5 rounded-lg border text-xs font-mono ${
                  mysteryScoreResult.passed
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                }`}
              >
                {mysteryScoreResult.feedback}
              </div>
            )}
          </div>
        )}

        {/* Live Scorecard & Meter (For real-time simulation challenges) */}
        {challenge.challengeType !== 'systemIdentification' && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">
                {isAr ? 'الدرجة الحالية:' : 'Live Score:'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black text-white">
                  {Math.round(score)}%
                </span>
                {passed ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {isAr ? 'ناجح' : 'Passed'}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                    {isAr ? 'قيد التقييم' : 'Evaluating'}
                  </span>
                )}
              </div>
            </div>

            {/* Progress Gauge */}
            <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  passed
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
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

            {/* Metrics breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono text-slate-400 text-center">
              <div className="p-1 rounded bg-slate-900 border border-slate-800">
                <span className="block text-slate-500">{isAr ? 'داخل النطاق' : 'In Tolerance'}</span>
                <span className="text-white font-bold">
                  {(currentMetrics.inToleranceRatio * 100).toFixed(0)}%
                </span>
              </div>
              <div className="p-1 rounded bg-slate-900 border border-slate-800">
                <span className="block text-slate-500">{isAr ? 'تراكم IAE' : 'IAE'}</span>
                <span className="text-white font-bold">{currentMetrics.iae.toFixed(0)}</span>
              </div>
              <div className="p-1 rounded bg-slate-900 border border-slate-800">
                <span className="block text-slate-500">{isAr ? 'الوقت المتبقي' : 'Time Left'}</span>
                <span className="text-cyan-300 font-bold">{challengeTimeLeft.toFixed(0)}s</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action / Trigger Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
        {challenge.challengeType !== 'systemIdentification' && (
          <button
            onClick={isChallengeRunning ? onStopChallenge : onStartChallenge}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
              isChallengeRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold shadow-amber-950/40'
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
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 animate-pulse-glow"
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>{isAr ? 'ممتاز! افتح الوحدة التالية الآن' : 'Passed! Unlock Next Module'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
