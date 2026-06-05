import React from 'react';
import { Key, Github } from 'lucide-react';
import { copy } from '@/i18n/landingCopy';

export const LandingFooter: React.FC = () => {
  const t = copy;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-parchment-50 border-t border-sepia-600/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-ink-900 text-parchment-50 flex items-center justify-center">
                <Key className="w-4 h-4" />
              </div>
              <span className="font-serif text-lg font-semibold text-ink-900">CipherAnnotation</span>
            </div>
            <p className="text-sm text-ink-900/70 leading-relaxed">{t.footer.tagline}</p>
            <p className="mt-3 text-xs text-sepia-700 font-medium">{t.footer.madeAt}</p>
          </div>

          <div className="flex flex-wrap gap-6 items-center">
            <a
              href="https://github.com/jurajglatz/CipherAnnotation"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-ink-900/70 hover:text-ink-900 transition-colors"
            >
              <Github className="w-4 h-4" />
              {t.footer.links.github}
            </a>
            <a
              href="mailto:glatz.juraj@gmail.com"
              className="text-sm text-ink-900/70 hover:text-ink-900 transition-colors"
            >
              {t.footer.links.contact}
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-sepia-600/20 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-sepia-700">
            © {year} CipherAnnotation. {t.footer.rights}
          </p>
          <p className="font-mono text-[10px] text-sepia-700/60 tracking-widest">
            ∴ ⊕ ◇ ☽ ✦ ⬡
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
