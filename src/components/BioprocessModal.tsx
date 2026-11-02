/**
 * Bioprocess & Science Lab Modal
 * Integrates science skill data (PubChem chemical compounds, Monod microbial kinetics,
 * dissolved oxygen mass transfer) with real-world biochemical process control loops.
 */

import React, { useState } from 'react';
import { BIOPROCESS_COMPOUNDS, calculateMonodGrowthRate } from '../services/bioprocessService';
import { X, FlaskConical, Atom, Dna, Activity, ExternalLink, ArrowRight, Check } from 'lucide-react';

interface BioprocessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadBioreactorInStudio: () => void;
  lang: 'en' | 'ar';
}

export const BioprocessModal: React.FC<BioprocessModalProps> = ({
  isOpen,
  onClose,
  onLoadBioreactorInStudio,
  lang,
}) => {
  const isAr = lang === 'ar';

  const [glucoseLevel, setGlucoseLevel] = useState<number>(15); // g/L
  const [doSat, setDoSat] = useState<number>(60); // %
  const [temperature, setTemperature] = useState<number>(37.0); // °C

  if (!isOpen) return null;

  const kinetics = calculateMonodGrowthRate(glucoseLevel, doSat, temperature);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-800/60">
                  {isAr ? 'العلوم الحيوية وهندسة التحكم' : 'Bioscience & Control'}
                </span>
                <span className="text-xs text-slate-400 font-mono">Monod Kinetics & PubChem</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isAr ? 'مختبر المفاعلات الحيوية والتحكم الخلوي' : 'Bioprocess & Bioreactor Control Lab'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Scientific Concept Banner */}
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs sm:text-sm text-slate-300 space-y-1.5">
            <h4 className="font-bold text-emerald-300 flex items-center gap-2">
              <Dna className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'لماذا يعد التحكم بالعمليات الحيوية أصعب وأهم مجالات الهندسة؟' : 'Why Bioprocess Control is Critical:'}</span>
            </h4>
            <p className="leading-relaxed text-slate-300">
              {isAr
                ? 'في المفاعلات الحيوية الصيدلانية، يتم إنتاج الأنسولين والأجسام المضادة العلاجية بواسطة كائنات دقيقة حية (مثل بكتيريا E. coli أو خلايا CHO). أي انحراف بسيط في الأكسجين الذائب (DO) أو الحرارة يسبب إجهاداً خلويّا أو موتاً فورياً للمزرعة!'
                : 'In pharmaceutical manufacturing, living cells (E. coli, CHO) produce life-saving insulin and monoclonal antibodies. Uncontrolled oxygen starvation (hypoxia) or temperature spikes lead to immediate metabolic crash or toxic lactic acid accumulation.'}
            </p>
          </div>

          {/* PubChem Chemical Compounds */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Atom className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? 'المواد الكيميائية في وسط النمو (بيانات PubChem الرسمية):' : 'Chemical Substrates & Metabolites (PubChem Official Records):'}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(BIOPROCESS_COMPOUNDS).map(([k, comp]) => (
                <div key={k} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{comp.name}</span>
                    <a
                      href={`https://pubchem.ncbi.nlm.nih.gov/compound/${comp.cid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                      title="Open in PubChem"
                    >
                      <span>CID:{comp.cid}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="font-mono text-[11px] text-cyan-300">
                    {comp.formula} • {comp.molecularWeight} g/mol
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {comp.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Monod Kinetics Calculator */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'حاسبة معدل النمو الخلوي التفاعلية (Monod Model):' : 'Interactive Cell Growth Rate Evaluator (Monod Kinetics):'}</span>
              </h4>
              <span className="text-emerald-400 font-mono text-xs font-bold">
                μ = {kinetics.mu} h⁻¹
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Glucose S: {glucoseLevel} g/L</label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={glucoseLevel}
                  onChange={(e) => setGlucoseLevel(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Dissolved O₂: {doSat}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={doSat}
                  onChange={(e) => setDoSat(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Temp T: {temperature}°C</label>
                <input
                  type="range"
                  min="25"
                  max="45"
                  step="0.5"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400">{isAr ? 'العامل الحرج المحدد للنمو:' : 'Current Growth Limiting Factor:'}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                {kinetics.limitingFactor}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
          <button
            onClick={() => {
              onLoadBioreactorInStudio();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all"
          >
            <span>{isAr ? 'تحميل حلقة المفاعل الحيوي في الاستوديو' : 'Load Bioreactor Loop into Studio'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
