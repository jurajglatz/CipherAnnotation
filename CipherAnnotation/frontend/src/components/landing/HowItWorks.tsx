import React from 'react';
import { Upload, Wand2, PenTool, Download } from 'lucide-react';
import { copy } from '@/i18n/landingCopy';

const icons = [Upload, Wand2, PenTool, Download];

export const HowItWorks: React.FC = () => {
  const t = copy;

  return (
    <section className="relative bg-parchment-100 border-y border-sepia-600/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-ink-900">
            {t.how.title}
          </h2>
          <p className="mt-4 text-ink-900/70 text-lg">{t.how.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
          {t.how.steps.map((step, i) => {
            const Icon = icons[i];
            return (
              <div key={i} className="relative group">
                {/* Connector line to next step */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(50%+2.5rem)] right-[-50%] h-px">
                    <svg className="w-full h-4" preserveAspectRatio="none" viewBox="0 0 100 10">
                      <path
                        d="M 0 5 Q 25 0, 50 5 T 100 5"
                        stroke="#8b6f47"
                        strokeWidth="1.5"
                        fill="none"
                        strokeDasharray="3 3"
                      />
                    </svg>
                  </div>
                )}

                <div className="relative flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className="w-20 h-20 rounded-full bg-parchment-50 border-2 border-sepia-600 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:-translate-y-1 transition-all">
                      <Icon className="w-8 h-8 text-sepia-700" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-ink-900 text-parchment-50 font-serif text-sm font-bold flex items-center justify-center shadow-md">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-ink-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-ink-900/70 leading-relaxed max-w-[220px]">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
