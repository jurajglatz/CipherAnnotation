import React from 'react';
import { Wand2, BookMarked, FileStack, Users, Library, Download } from 'lucide-react';
import { copy } from '@/i18n/landingCopy';

const icons = [Wand2, BookMarked, FileStack, Users, Library, Download];

export const FeaturesGrid: React.FC = () => {
  const t = copy;

  return (
    <section id="features" className="relative bg-parchment py-20 sm:py-28">
      <div className="absolute inset-0 cipher-symbols-bg opacity-[0.06] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-mono text-xs tracking-widest uppercase text-sepia-700">
            {t.features.subtitle}
          </span>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl font-semibold text-ink-900">
            {t.features.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.features.items.map((item, i) => {
            const Icon = icons[i];
            return (
              <div
                key={i}
                className="group relative p-7 bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/30 rounded-lg hover:border-sepia-700 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-lg bg-ink-900/5 border border-sepia-600/30 flex items-center justify-center group-hover:bg-ink-900 group-hover:border-ink-900 transition-colors">
                    <Icon
                      className="w-5 h-5 text-sepia-700 group-hover:text-parchment-50 transition-colors"
                      strokeWidth={1.8}
                    />
                  </div>
                  <span className="font-mono text-xs text-sepia-700/60">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-semibold text-ink-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-ink-900/70 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
