import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { copy } from '@/i18n/landingCopy';
import { useAuth } from '@/hooks';
import AnnotationCarousel from './AnnotationCarousel';

export const Hero: React.FC = () => {
  const t = copy;
  const { isAuthenticated } = useAuth();

  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative bg-parchment overflow-hidden">
      <div className="absolute inset-0 cipher-symbols-bg opacity-[0.10] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-parchment-100/50 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ink-900/5 border border-sepia-600/30 text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-7">
              <Sparkles className="w-3.5 h-3.5" />
              {t.hero.eyebrow}
            </div>

            <h1 className="font-serif text-5xl sm:text-6xl lg:text-[4.25rem] leading-[1.04] font-semibold text-ink-900 tracking-tight">
              {t.hero.titleA}
              <br />
              <span className="ink-underline">{t.hero.titleB}</span>{' '}
              <em className="italic font-normal text-sepia-700">{t.hero.titleC}</em>
            </h1>

            <p className="mt-7 text-lg text-ink-900/70 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t.hero.subtitle}
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Link
                to={isAuthenticated ? '/documents' : '/register'}
                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-ink-900 hover:bg-primary-700 text-parchment-50 font-semibold rounded-md shadow-lg shadow-ink-900/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                {isAuthenticated ? 'Go to app' : t.hero.ctaPrimary}
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

            <p className="mt-9 text-xs sm:text-sm text-sepia-700 font-medium tracking-wide">
              {t.hero.trust}
            </p>
          </div>

          <div className="w-full max-w-xl mx-auto lg:mx-0">
            <AnnotationCarousel />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
