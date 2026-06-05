import React from 'react';
import { GraduationCap } from 'lucide-react';
import { copy } from '@/i18n/landingCopy';

export const ForResearchers: React.FC = () => {
  const t = copy;

  return (
    <section
      id="about"
      className="relative bg-parchment-100 border-y border-sepia-600/20 py-20 sm:py-28"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-sepia-700 mb-4">
              <GraduationCap className="w-5 h-5" />
              <span className="font-mono text-xs font-bold tracking-wider uppercase">
                FEI STU · Bratislava
              </span>
            </div>
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-ink-900 leading-tight">
              {t.research.title}
            </h2>
            <p className="mt-6 text-ink-900/75 text-lg leading-relaxed">
              {t.research.body}
            </p>
          </div>

          <div className="rounded-xl border border-sepia-600/30 bg-parchment-50 p-8 shadow-sm">
            <p className="font-mono text-xs font-bold tracking-widest uppercase text-sepia-700 mb-6">
              {t.research.statLabel}
            </p>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-7xl sm:text-8xl font-semibold text-ink-900 leading-none">
                {t.research.statValue}
              </span>
              <span className="font-serif text-2xl text-sepia-700 italic">
                {t.research.statUnit}
              </span>
            </div>
            <p className="mt-6 text-ink-900/75 text-lg leading-relaxed">
              {t.research.statBody}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForResearchers;
