/**
 * Module Roadmap Drawer (bigp 14-Module Curriculum Navigation)
 * Shows Part A through Part E, completion scores, lock/unlock badges,
 * and quick-switch access.
 */

import React from 'react';
import { CURRICULUM_PARTS, ROADMAP_MODULES_METADATA } from '../curriculum/modulesData';
import { X, Lock, CheckCircle2, ChevronRight, BookOpen, Award, Sparkles } from 'lucide-react';

interface ModuleRoadmapDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentModuleId: string;
  unlockedModules: string[];
  moduleScores: Record<string, number>;
  onSelectModule: (moduleId: string) => void;
  lang: 'en' | 'ar';
}

export const ModuleRoadmapDrawer: React.FC<ModuleRoadmapDrawerProps> = ({
  isOpen,
  onClose,
  currentModuleId,
  unlockedModules,
  moduleScores,
  onSelectModule,
  lang,
}) => {
  const isAr = lang === 'ar';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative z-10 w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isAr ? 'خارطة طريق المنهج (14 وحدة)' : 'Curriculum Roadmap'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'من الصفر إلى الاحتراف في هندسة التحكم' : 'Process Control from Zero to Expert'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roadmap Parts and Modules List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {CURRICULUM_PARTS.map((part) => (
            <div key={part.id} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  {isAr ? part.titleAr : part.titleEn}
                </h4>
              </div>

              <div className="space-y-2">
                {part.modules.map((mId) => {
                  const meta = ROADMAP_MODULES_METADATA[mId];
                  if (!meta) return null;

                  const isUnlocked = unlockedModules.includes(mId);
                  const isCurrent = currentModuleId === mId;
                  const score = moduleScores[mId] || 0;
                  const isPassed = score >= 70;

                  return (
                    <div
                      key={mId}
                      onClick={() => {
                        if (isUnlocked && meta.isPlayable) {
                          onSelectModule(mId);
                          onClose();
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-cyan-950/60 border-cyan-500/80 shadow-md shadow-cyan-950'
                          : isUnlocked && meta.isPlayable
                          ? 'bg-slate-950/70 border-slate-800 hover:border-slate-600 hover:bg-slate-850 cursor-pointer'
                          : 'bg-slate-950/30 border-slate-900 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Number badge or Lock */}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                            isCurrent
                              ? 'bg-cyan-500 text-slate-950'
                              : isPassed
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : isUnlocked && meta.isPlayable
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          {!isUnlocked ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            meta.number
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {isAr ? meta.titleAr : meta.titleEn}
                            </span>
                            {meta.isPlayable && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-sky-950 text-sky-400 font-mono border border-sky-800/40">
                                {isAr ? 'متاح للعب' : 'Playable'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {isAr ? meta.subtitleAr : meta.subtitleEn}
                          </p>
                        </div>
                      </div>

                      {/* Right: Score badge or locked icon */}
                      <div className="shrink-0 flex items-center gap-2">
                        {score > 0 && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                              isPassed
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {Math.round(score)}%
                          </span>
                        )}
                        {isUnlocked && meta.isPlayable && (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400 flex items-center justify-between">
          <span>{isAr ? 'احصل على 70% في التحدي لفتح الوحدة التالية' : 'Score ≥70% on Prove Challenge to unlock'}</span>
          <Award className="w-4 h-4 text-amber-400" />
        </div>
      </div>
    </div>
  );
};
