import React, { useState } from 'react';
import { HelpCircle, ChevronRight, CheckCircle2, Play, Activity, TrendingUp, Sliders, ArrowRight } from 'lucide-react';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHighlightElement?: (elementId: string | null) => void;
  lang: 'en' | 'ar';
}

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  onHighlightElement,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      titleEn: '1. What is the Interactive P&ID Flowsheet?',
      titleAr: '1. ما هو مخطط الأنابيب والأجهزة التفاعلي (P&ID)؟',
      tagEn: 'ISA-5.1 Instrumentation',
      tagAr: 'معيار القياسات الصناعية ISA',
      contentEn:
        'A P&ID (Piping and Instrumentation Diagram) represents how fluids, sensors, and control signals interconnect in an industrial plant. Here, each block is an actual process element: Setpoint (SP), Comparator (Sum), Controller (PID/Valve), and Tank Process Vessel.',
      contentAr:
        'مخطط P&ID يوضح كيفية ترابط خطوط الأنابيب، الحساسات، وإشارات التحكم في المصنع. كل كتلة هنا تمثل عنصراً حقيقياً: نقطة الضبط (SP)، مقارن الإشارات (Sum)، صمام التحكم (Valve/PID)، ووعاء العملية (Tank).',
      highlight: 'flowsheet',
      exampleEn:
        'Example: Water flows through the Inflow Valve into the Gravity Tank. The Level Sensor measures the fluid height and sends a feedback signal back to the comparator.',
      exampleAr:
        'مثال توضيحي: يتدفق السائل عبر صمام التغذية إلى الخزان. يقوم حساس المستوى بقياس الارتفاع وإرسال إشارة التغذية الراجعة إلى المقارن لمقارنتها بالهدف.',
      icon: Activity,
    },
    {
      titleEn: '2. How to Read and Interpret the Strip Chart Scope',
      titleAr: '2. كيفية قراءة راسم الإشارات الرقمي (Scope)',
      tagEn: 'Real-time Signal Tracing',
      tagAr: 'تتبع الإشارات اللحظي',
      contentEn:
        'The Oscilloscope displays live process trends over time (horizontal axis in seconds). Three core color-coded lines govern control engineering:',
      contentAr:
        'يعرض راسم الإشارات المنحنيات الحية مع مرور الوقت (المحور الأفقي بالثواني). ثلاثة خطوط أساسية ملونة تحكم هندسة التحكم:',
      highlight: 'scope',
      points: [
        {
          labelEn: 'Amber Line (SP - Setpoint):',
          labelAr: 'الخط الكهرماني (SP - نقطة الضبط):',
          descEn: 'The desired target level you want the process to maintain (e.g. 60%).',
          descAr: 'القيمة المستهدفة المطلوبة التي تريد تثبيت العملية عندها (مثلاً 60%).',
          color: 'text-amber-700 bg-amber-50 border-amber-200',
        },
        {
          labelEn: 'Sky Blue Line (PV - Process Variable):',
          labelAr: 'الخط السماوي (PV - متغير العملية):',
          descEn: 'The actual measured physical tank level right now. If PV is below SP, there is a positive error gap.',
          descAr: 'القيمة المقاسة الفعلية لمستوى السائل حالياً. إذا كان PV أقل من SP، توجد فجوة خطأ موجبة.',
          color: 'text-sky-700 bg-sky-50 border-sky-200',
        },
        {
          labelEn: 'Purple Line (u - Controller Output):',
          labelAr: 'الخط الأرجواني (u - إشارة الخرج/الصمام):',
          descEn: 'The valve opening % (0 to 100%) commanded to inject liquid and eliminate the error.',
          descAr: 'نسبة فتح الصمام (0 إلى 100%) التي يرسلها المتحكم لضخ السائل وتصفير الخطأ.',
          color: 'text-purple-700 bg-purple-50 border-purple-200',
        },
      ],
      icon: TrendingUp,
    },
    {
      titleEn: '3. The Study Workflow: Predict, Play & Prove',
      titleAr: '3. منهجية الدراسة: توقّع، جرّب، ثم أثبت مهارتك',
      tagEn: 'Mastery Learning Cycle',
      tagAr: 'دورة التعلم الإتقاني',
      contentEn:
        'To master control engineering from zero to expert, follow the 3 guided stages in every module:',
      contentAr:
        'لإتقان هندسة التحكم من الصفر إلى الاحتراف، اتبع المراحل الثلاث الموجهة في كل وحدة:',
      highlight: 'workflow',
      steps: [
        {
          stepEn: '1. Concept & Math:',
          stepAr: '1. المفهوم والرياضيات:',
          descEn: 'Understand the physical intuition and hover equations to see symbols traced.',
          descAr: 'استوعب النموذج الذهني الفيزيائي ومرر على المعادلات لترى دلالة الرموز.',
        },
        {
          stepEn: '2. Guided Steps & Interactive Simulation:',
          stepAr: '2. الخطوات الموجهة والتطبيق العملي:',
          descEn: 'Answer the prediction challenge, adjust valve handwheels, and trigger load shocks.',
          descAr: 'أجب عن التحدي التنبؤي، اضبط الصمام، واختبر استجابة المنظومة للاضطراب المفاجئ.',
        },
        {
          stepEn: '3. Prove Challenge:',
          stepAr: '3. تحدي الإثبات الهندسي:',
          descEn: 'Run the timed test, maintain stability within tolerance, and unlock the next module certificate!',
          descAr: 'شغّل الاختبار الموقوت، حافظ على الاستقرار ضمن حدود التفاوت، وافتح شهادة الوحدة التالية!',
        },
      ],
      icon: Sliders,
    },
  ];

  const currentStep = steps[activeStep];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
      if (onHighlightElement) onHighlightElement(steps[activeStep + 1].highlight);
    } else {
      if (onHighlightElement) onHighlightElement(null);
      onClose();
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      if (onHighlightElement) onHighlightElement(steps[activeStep - 1].highlight);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-sm">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-bold text-[10px] uppercase tracking-wider border border-cyan-200">
                  {isAr ? currentStep.tagAr : currentStep.tagEn}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {isAr ? `خطوة ${activeStep + 1} من ${steps.length}` : `Step ${activeStep + 1} of ${steps.length}`}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {isAr ? currentStep.titleAr : currentStep.titleEn}
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              if (onHighlightElement) onHighlightElement(null);
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-slate-700 leading-relaxed">
            {isAr ? currentStep.contentAr : currentStep.contentEn}
          </p>

          {/* Example Box if present */}
          {currentStep.exampleEn && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <span>💡 {isAr ? 'مثال تطبيقي مباشر:' : 'Hands-on Example:'}</span>
              </div>
              <p className="leading-relaxed">
                {isAr ? currentStep.exampleAr : currentStep.exampleEn}
              </p>
            </div>
          )}

          {/* Detailed Points */}
          {currentStep.points && (
            <div className="space-y-2 pt-1">
              {currentStep.points.map((pt, i) => (
                <div key={i} className={`p-3 rounded-xl border text-xs ${pt.color}`}>
                  <span className="font-bold block mb-0.5">{isAr ? pt.labelAr : pt.labelEn}</span>
                  <p className="text-slate-700">{isAr ? pt.descAr : pt.descEn}</p>
                </div>
              ))}
            </div>
          )}

          {/* Guided Steps Breakdown */}
          {currentStep.steps && (
            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {currentStep.steps.map((st, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block mb-0.5">{isAr ? st.stepAr : st.stepEn}</span>
                    <p className="text-slate-600">{isAr ? st.descAr : st.descEn}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={activeStep === 0}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {isAr ? 'السابق' : 'Previous'}
          </button>

          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  activeStep === i ? 'bg-cyan-600 w-6' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span>{activeStep === steps.length - 1 ? (isAr ? 'ابدأ الآن' : 'Got it, let’s start!') : (isAr ? 'التالي' : 'Next')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
