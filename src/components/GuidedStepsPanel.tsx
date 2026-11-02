/**
 * Guided Steps & AI Tutor Panel (bigp Spec Pillar 3 Helper)
 * Predict-Then-Run micro-prompts paired with contextual AI Control Tutor guidance.
 */

import React, { useState } from 'react';
import { ModuleSpec } from '../types/curriculum';
import { HelpCircle, CheckCircle, AlertCircle, Bot, Sparkles, ChevronRight } from 'lucide-react';

interface GuidedStepsPanelProps {
  module: ModuleSpec;
  lang: 'en' | 'ar';
}

export const GuidedStepsPanel: React.FC<GuidedStepsPanelProps> = ({ module, lang }) => {
  const isAr = lang === 'ar';
  const prompts = module.play.predictPrompts || [];
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, boolean>>({});
  const [showTutor, setShowTutor] = useState(false);

  const handleSelectOption = (promptId: string, idx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [promptId]: idx }));
  };

  const handleSubmit = (promptId: string) => {
    setSubmittedAnswers((prev) => ({ ...prev, [promptId]: true }));
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                {isAr ? 'توقع ثم جرّب (Predict-Then-Run)' : 'Predict-Then-Run'}
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">
                {isAr ? 'تحدي التفكير الاستباقي' : 'Active Prediction Check'}
              </h3>
            </div>
          </div>

          {/* AI Control Tutor Trigger */}
          <button
            onClick={() => setShowTutor(!showTutor)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/50 text-xs font-medium transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isAr ? 'اسأل المعلم الذكي' : 'Ask Tutor'}</span>
          </button>
        </div>

        {/* Predict-Then-Run Questions */}
        <div className="mt-3.5 space-y-4">
          {prompts.map((p) => {
            const selected = selectedAnswers[p.id];
            const isSubmitted = submittedAnswers[p.id];
            const isCorrect = selected === p.correctIndex;
            const options = isAr ? p.optionsAr : p.optionsEn;

            return (
              <div key={p.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <p className="text-xs font-semibold text-white leading-relaxed">
                  {isAr ? p.promptAr : p.promptEn}
                </p>

                {/* Options list */}
                <div className="space-y-1.5">
                  {options.map((opt, idx) => {
                    const isPicked = selected === idx;
                    let btnStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';

                    if (isSubmitted) {
                      if (idx === p.correctIndex) {
                        btnStyle = 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200 font-semibold';
                      } else if (isPicked) {
                        btnStyle = 'bg-rose-950/70 border-rose-500/70 text-rose-200';
                      }
                    } else if (isPicked) {
                      btnStyle = 'bg-cyan-950/70 border-cyan-500/70 text-cyan-200 font-semibold';
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => !isSubmitted && handleSelectOption(p.id, idx)}
                        className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {isSubmitted && idx === p.correctIndex && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
                        )}
                        {isSubmitted && isPicked && idx !== p.correctIndex && (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Submit button */}
                {!isSubmitted && (
                  <button
                    disabled={selected === undefined}
                    onClick={() => handleSubmit(p.id)}
                    className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white font-bold text-xs transition-colors"
                  >
                    {isAr ? 'تأكيد التوقع وفحص النتيجة' : 'Check My Prediction'}
                  </button>
                )}

                {/* Explanation feedback */}
                {isSubmitted && (
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-1.5 animate-fadeIn ${
                      isCorrect
                        ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                        : 'bg-amber-950/40 border-amber-800/40 text-amber-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isCorrect ? (isAr ? 'توقعك صحيح تماماً!' : 'Spot on!') : (isAr ? 'ليس تماماً — إليك السبب الفيزيائي:' : 'Not quite — here is the physical reason:')}</span>
                    </div>
                    <p className="leading-relaxed text-slate-300">
                      {isAr ? p.explanationAr : p.explanationEn}
                    </p>
                    <div className="mt-1 pt-1 border-t border-slate-700/50 text-[11px] font-mono text-cyan-300">
                      👉 {isAr ? p.actionInstructionAr : p.actionInstructionEn}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Control Tutor Drawer */}
        {showTutor && (
          <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/70 to-slate-950 border border-indigo-800/50 space-y-2.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
              <Bot className="w-4 h-4 text-indigo-400" />
              <span>{isAr ? 'إرشادات المعلم الذكي' : 'AI Control Tutor Guidance'}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr ? module.tutorContext.contextNotesAr : module.tutorContext.contextNotesEn}
            </p>
            <div className="pt-2 border-t border-indigo-900/60">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
                {isAr ? 'مفاهيم خاطئة شائعة يجب الحذر منها:' : 'Common Misconceptions:'}
              </span>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                {(isAr
                  ? module.tutorContext.commonMisconceptionsAr
                  : module.tutorContext.commonMisconceptionsEn
                ).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
