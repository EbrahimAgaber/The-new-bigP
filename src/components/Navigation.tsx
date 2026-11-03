/**
 * Top Navigation Bar for bigp: Process Control from Zero to Expert
 * Clean, high-contrast engineering light theme.
 */

import React from 'react';
import {
  Compass,
  Layers,
  FlaskConical,
  BookOpen,
  Languages,
  Award,
  Sparkles,
  RotateCcw,
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
  onOpenMasteryModal?: () => void;
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
  onOpenMasteryModal,
  onResetProgress,
}) => {
  const isAr = lang === 'ar';
  const completedCount = Object.keys(moduleScores).filter((k) => (moduleScores[k] || 0) >= 70).length;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={onOpenRoadmap}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-600 p-[1.5px] shadow-sm group-hover:shadow-md transition-all duration-300">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <span className="font-mono font-black text-xl text-cyan-700">
                  p
                </span>
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                big<span className="text-cyan-600 font-mono">p</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
                {isAr ? 'أكاديمية التحكم' : 'Process Control'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden md:block">
              {isAr ? 'من الصفر إلى الاحتراف — معمل المحاكاة التفاعلي' : 'Zero to Expert — Interactive Simulation Suite'}
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher (Segmented Pill) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onModeChange('academy')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              mode === 'academy'
                ? 'bg-white text-cyan-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-cyan-600" />
            <span>{isAr ? 'منهج الأكاديمية' : 'Academy'}</span>
          </button>
          <button
            onClick={() => onModeChange('studio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              mode === 'studio'
                ? 'bg-white text-cyan-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-600" />
            <span>{isAr ? 'استوديو سيمولينك' : 'Studio'}</span>
          </button>
        </div>

        {/* Right Tools & Actions */}
        <div className="flex items-center gap-2">
          {/* Roadmap Trigger */}
          <button
            onClick={onOpenRoadmap}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold transition-all shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
            <span className="hidden sm:inline">{isAr ? 'المنهج' : 'Roadmap'}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-mono text-[10px] font-bold">
              {completedCount}/14
            </span>
          </button>

          {/* Mastery Dashboard & Certificate */}
          {onOpenMasteryModal && (
            <button
              onClick={onOpenMasteryModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-all shadow-xs"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">{isAr ? 'الشهادة' : 'Mastery'}</span>
            </button>
          )}

          {/* Bioprocess Modal */}
          <button
            onClick={onOpenBioprocessModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold transition-all hidden lg:flex"
            title={isAr ? 'مختبر التكنولوجيا الحيوية' : 'Bioprocess Lab'}
          >
            <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? 'العمليات الحيوية' : 'Bioprocess'}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => onLangChange(lang === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold transition-all"
            title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <Languages className="w-3.5 h-3.5 text-sky-600" />
            <span>{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Reset progress */}
          <button
            onClick={() => {
              if (window.confirm(isAr ? 'هل تريد إعادة ضبط درجات التحديات وفتح الوحدات؟' : 'Reset module completion and scores?')) {
                onResetProgress();
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
            title={isAr ? 'إعادة تعيين التقدم' : 'Reset Progress'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
