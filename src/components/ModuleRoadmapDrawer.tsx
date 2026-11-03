/**
 * Module Roadmap Drawer (bigp 14-Module Curriculum Navigation)
 * High-end aerospace flight map design with part grouping, scores, and lock badges.
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative z-10 w-full max-w-md h-full bg-slate-50 border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isAr ? 'خارطة طريق المنهج (14 وحدة)' : 'Curriculum Roadmap'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'من الصفر إلى الاحتراف في هندسة التحكم' : 'Process Control from Zero to Expert'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {CURRICULUM_PARTS.map((part) => (
            <div key={part.id} className="space-y-2.5">
              <div className="text-[11px] font-bold tracking-wider uppercase text-cyan-800 font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
                <span>{isAr ? part.titleAr : part.titleEn}</span>
              </div>

              <div className="space-y-2">
                {part.modules.map((modId) => {
                  const meta = ROADMAP_MODULES_METADATA[modId];
                  if (!meta) return null;

                  const isUnlocked = unlockedModules.includes(modId);
                  const isCurrent = currentModuleId === modId;
                  const score = moduleScores[modId];
                  const isCompleted = score !== undefined && score >= 70;

                  return (
                    <button
                      key={modId}
                      disabled={!isUnlocked}
                      onClick={() => {
                        onSelectModule(modId);
                        onClose();
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-sky-50/60 border-cyan-400 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/30'
                          : isUnlocked
                          ? 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300 text-slate-700'
                          : 'bg-slate-50/40 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : isCurrent
                              ? 'bg-cyan-500/20 text-sky-700 border border-cyan-500/40'
                              : isUnlocked
                              ? 'bg-slate-100 text-slate-500 border border-slate-300'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {meta.number}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs truncate text-slate-900">
                              {isAr ? meta.titleAr : meta.titleEn}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {isAr ? meta.subtitleAr : meta.subtitleEn}
                          </p>
                        </div>
                      </div>

                      {/* Right status icon */}
                      <div className="shrink-0 flex items-center gap-2 font-mono">
                        {isCompleted ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{score}%</span>
                          </div>
                        ) : !isUnlocked ? (
                          <Lock className="w-4 h-4 text-slate-600" />
                        ) : (
                          <ChevronRight className={`w-4 h-4 ${isCurrent ? 'text-cyan-700' : 'text-slate-500'}`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>{unlockedModules.length} / 14 Unlocked</span>
          <span className="text-cyan-700 font-bold">bigp v2.0</span>
        </div>
      </div>
    </div>
  );
};
