/**
 * Top Navigation Bar for bigp
 * Features: Brand logo, Academy vs Studio mode toggle, Module drawer trigger,
 * Bioprocess & Science Lab launcher, Language toggle (EN / AR)
 */

import React from 'react';
import {
  Compass,
  Layers,
  FlaskConical,
  RotateCcw,
  BookOpen,
  Languages,
  CheckCircle2,
} from 'lucide-react';

interface NavigationProps {
  mode: 'academy' | 'studio';
  onModeChange: (mode: 'academy' | 'studio') => void;
  lang: 'en' | 'ar';
  onLangChange: (lang: 'en' | 'ar') => void;
  currentModuleId: string;
  unlockedModules: string[];
  moduleScores: Record<string, number>;
  onOpenRoadmap: () => void;
  onOpenBioprocessModal: () => void;
  onResetProgress: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  mode,
  onModeChange,
  lang,
  onLangChange,
  currentModuleId,
  unlockedModules,
  moduleScores,
  onOpenRoadmap,
  onOpenBioprocessModal,
  onResetProgress,
}) => {
  const isAr = lang === 'ar';

  const completedCount = Object.keys(moduleScores).filter((k) => (moduleScores[k] || 0) >= 70).length;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 via-sky-500 to-emerald-400 p-[2px] shadow-lg shadow-cyan-950/50">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <span className="font-mono font-black text-lg bg-gradient-to-r from-cyan-400 to-emerald-300 bg-clip-text text-transparent">
                  p
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-lg">bigp</span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  {isAr ? 'أكاديمية التحكم' : 'Control Academy'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                {isAr ? 'هندسة التحكم من الصفر للاحتراف — د. إبراهيم' : 'Process Control from Zero to Expert'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher */}
        <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onModeChange('academy')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'academy'
                ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{isAr ? 'نمط الأكاديمية' : 'Academy Mode'}</span>
          </button>
          <button
            onClick={() => onModeChange('studio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'studio'
                ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isAr ? 'استوديو المحاكاة' : 'Studio Mode'}</span>
          </button>
        </div>

        {/* Right Tools & Toggles */}
        <div className="flex items-center gap-2">
          {/* Module Roadmap Trigger */}
          <button
            onClick={onOpenRoadmap}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 text-xs font-medium transition-colors"
            title={isAr ? 'خارطة المنهج (14 وحدة)' : 'Curriculum Roadmap (14 Modules)'}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">
              {isAr ? 'المنهج الدراسي' : 'Curriculum'}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono text-[10px] border border-cyan-800/50">
              {completedCount}/14
            </span>
          </button>

          {/* Bioscience & Bioprocess Lab */}
          <button
            onClick={onOpenBioprocessModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 text-xs font-medium transition-colors"
            title={isAr ? 'مختبر العمليات الحيوية والعلوم' : 'Bioprocess & Science Lab'}
          >
            <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">
              {isAr ? 'العمليات الحيوية' : 'Bioprocess Lab'}
            </span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => onLangChange(lang === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-xs font-bold transition-colors"
            title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <Languages className="w-3.5 h-3.5 text-sky-400" />
            <span>{isAr ? 'English' : 'عربي'}</span>
          </button>

          {/* Reset progress (small icon) */}
          <button
            onClick={() => {
              if (window.confirm(isAr ? 'هل تريد إعادة ضبط درجات التحديات وفتح الوحدات؟' : 'Reset module completion and scores?')) {
                onResetProgress();
              }
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 transition-colors"
            title={isAr ? 'إعادة ضبط التقدم' : 'Reset Progress'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
