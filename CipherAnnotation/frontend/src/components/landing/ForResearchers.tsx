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

          <figure className="relative pl-8 border-l-2 border-sepia-700">
            <span className="absolute -left-3 -top-4 font-serif text-7xl text-sepia-700/30 leading-none select-none">
              &ldquo;
            </span>
            <p className="font-mono text-xs font-bold tracking-widest uppercase text-sepia-700 mb-4">
              {t.research.quoteTitle}
            </p>
            <blockquote className="font-serif text-2xl sm:text-[1.7rem] text-ink-900 leading-relaxed italic">
              {t.research.quote}
            </blockquote>
            <figcaption className="mt-6 text-sm text-sepia-700 font-medium">
              {t.research.quoteAuthor}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
};

export default ForResearchers;
