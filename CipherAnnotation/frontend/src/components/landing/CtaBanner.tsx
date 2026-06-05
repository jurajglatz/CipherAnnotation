import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Github } from 'lucide-react';
import { copy } from '@/i18n/landingCopy';

export const CtaBanner: React.FC = () => {
  const t = copy;

  return (
    <section className="relative bg-ink-900 overflow-hidden">
      <div className="absolute inset-0 cipher-symbols-bg opacity-[0.06] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-sepia-700/10 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-parchment-50 leading-tight">
          {t.cta.title}
        </h2>
        <p className="mt-6 text-lg text-parchment-50/70 max-w-xl mx-auto">
          {t.cta.subtitle}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-parchment-50 text-ink-900 hover:bg-primary-700 hover:text-parchment-50 font-semibold rounded-md shadow-xl transition-all hover:-translate-y-0.5"
          >
            {t.cta.primary}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent border-2 border-parchment-50/30 hover:border-parchment-50 text-parchment-50 font-semibold rounded-md transition-colors"
          >
            <Github className="w-4 h-4" />
            {t.cta.secondary}
          </a>
        </div>
      </div>
    </section>
  );
};

export default CtaBanner;
