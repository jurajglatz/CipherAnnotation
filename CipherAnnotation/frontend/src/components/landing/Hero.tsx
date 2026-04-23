import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { copy } from '@/i18n/landingCopy';

export const Hero: React.FC = () => {
  const t = copy;

  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative bg-parchment overflow-hidden">
      <div className="absolute inset-0 cipher-symbols-bg opacity-[0.18] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-parchment-100/50 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-24 sm:pt-44 sm:pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ink-900/5 border border-sepia-600/30 text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            {t.hero.eyebrow}
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl leading-[1.05] font-semibold text-ink-900 tracking-tight">
            {t.hero.titleA}
            <br />
            <span className="ink-underline">{t.hero.titleB}</span>{' '}
            <em className="italic font-normal text-sepia-700">{t.hero.titleC}</em>
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-ink-900/70 max-w-2xl mx-auto leading-relaxed">
            {t.hero.subtitle}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 px-7 py-3.5 bg-ink-900 hover:bg-primary-700 text-parchment-50 font-semibold rounded-md shadow-lg shadow-ink-900/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              {t.hero.ctaPrimary}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              onClick={scrollToFeatures}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-transparent border-2 border-ink-900/20 hover:border-ink-900/60 text-ink-900 font-semibold rounded-md transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              {t.hero.ctaSecondary}
            </a>
          </div>

          <p className="mt-10 text-xs sm:text-sm text-sepia-700 font-medium tracking-wide">
            {t.hero.trust}
          </p>
        </div>

        <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 opacity-40">
          <svg width="80" height="200" viewBox="0 0 80 200" fill="none">
            <g stroke="#6b5436" strokeWidth="2" fill="none">
              <circle cx="40" cy="30" r="14" />
              <path d="M20 70 l20 -20 l20 20 l-20 20 z" />
              <path d="M40 120 l0 30 M25 135 l30 0" />
              <circle cx="40" cy="170" r="8" fill="#6b5436" />
            </g>
          </svg>
        </div>
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 opacity-40">
          <svg width="80" height="200" viewBox="0 0 80 200" fill="none">
            <g stroke="#6b5436" strokeWidth="2" fill="none">
              <path d="M20 30 q20 -25 40 0 q-20 25 -40 0" />
              <path d="M20 80 l40 40 M20 120 l40 -40" />
              <circle cx="40" cy="155" r="12" />
              <circle cx="40" cy="155" r="4" fill="#6b5436" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
};

export default Hero;
