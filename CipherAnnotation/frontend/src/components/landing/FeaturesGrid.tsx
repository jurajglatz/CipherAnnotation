import React from 'react';
import { Wand2, BookMarked, FileStack, Users, Library, Download } from 'lucide-react';
import { copy } from '@/i18n/landingCopy';

const icons = [Wand2, BookMarked, FileStack, Users, Library, Download];

export const FeaturesGrid: React.FC = () => {
  const t = copy;

  return (
    <section id="features" className="relative bg-parchment py-20 sm:py-28">
      <div className="absolute inset-0 cipher-symbols-bg opacity-[0.08] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-ink-900">
            {t.features.title}
          </h2>
          <p className="mt-4 text-ink-900/70 text-lg">{t.features.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.features.items.map((item, i) => {
            const Icon = icons[i];
            return (
              <div
                key={i}
                className="group relative p-6 bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/30 rounded-lg hover:border-sepia-700 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary-600 to-sepia-700 opacity-0 group-hover:opacity-100 rounded-l-lg transition-opacity" />
                <div className="w-12 h-12 rounded-lg bg-ink-900/5 border border-sepia-600/30 flex items-center justify-center mb-4 group-hover:bg-ink-900 group-hover:border-ink-900 transition-colors">
                  <Icon className="w-5 h-5 text-sepia-700 group-hover:text-parchment-50 transition-colors" strokeWidth={1.8} />
                </div>
                <h3 className="font-serif text-xl font-semibold text-ink-900 mb-2">{item.title}</h3>
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
