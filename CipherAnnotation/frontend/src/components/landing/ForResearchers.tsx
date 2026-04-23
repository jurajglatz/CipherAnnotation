import React from 'react';
import { GraduationCap, Quote } from 'lucide-react';
import { copy } from '@/i18n/landingCopy';

export const ForResearchers: React.FC = () => {
  const t = copy;

  return (
    <section id="about" className="relative bg-parchment-100 border-y border-sepia-600/20 py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-sepia-700 mb-4">
              <GraduationCap className="w-5 h-5" />
              <span className="text-xs font-bold tracking-wider uppercase">FEI STU · Bratislava</span>
            </div>
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-ink-900 leading-tight">
              {t.research.title}
            </h2>
            <p className="mt-6 text-ink-900/75 text-lg leading-relaxed">{t.research.body}</p>
          </div>

          <div className="relative">
            <div className="absolute -top-4 -left-4 w-16 h-16 bg-ink-900 rounded-full flex items-center justify-center shadow-lg">
              <Quote className="w-7 h-7 text-parchment-50" />
            </div>
            <blockquote className="relative bg-parchment-50 p-8 sm:p-10 border-l-4 border-sepia-700 rounded-r-lg shadow-lg">
              <p className="text-xs font-bold tracking-wider uppercase text-sepia-700 mb-4">
                {t.research.quoteTitle}
              </p>
              <p className="font-serif text-xl sm:text-2xl text-ink-900 leading-relaxed italic">
                {t.research.quote}
              </p>
              <footer className="mt-6 text-sm text-sepia-700 font-medium">
                {t.research.quoteAuthor}
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForResearchers;
