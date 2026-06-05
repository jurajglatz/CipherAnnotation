import React from 'react';
import { Upload, Wand2, PenTool, Download } from 'lucide-react';
import { copy } from '@/i18n/landingCopy';

const icons = [Upload, Wand2, PenTool, Download];

export const HowItWorks: React.FC = () => {
  const t = copy;

  return (
    <section className="relative bg-parchment-100 border-y border-sepia-600/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-2xl mb-16">
          <span className="font-mono text-xs tracking-widest uppercase text-sepia-700">
            {t.how.subtitle}
          </span>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl font-semibold text-ink-900">
            {t.how.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-sepia-600/20 border border-sepia-600/20 rounded-xl overflow-hidden">
          {t.how.steps.map((step, i) => {
            const Icon = icons[i];
            return (
              <div
                key={i}
                className="group relative bg-parchment-50 p-7 hover:bg-parchment-50/60 transition-colors"
              >
                <div className="flex items-baseline justify-between mb-5">
                  <span className="font-serif text-5xl font-semibold text-sepia-700/30 leading-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Icon
                    className="w-6 h-6 text-sepia-700 group-hover:-translate-y-0.5 transition-transform"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="font-serif text-xl font-semibold text-ink-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-ink-900/70 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
