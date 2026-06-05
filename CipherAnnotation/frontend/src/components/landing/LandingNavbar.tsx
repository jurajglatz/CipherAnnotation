import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Key, Menu, X } from 'lucide-react';
import { copy } from '@/i18n/landingCopy';

export const LandingNavbar: React.FC = () => {
  const t = copy;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: t.nav.features },
    { href: '#about', label: t.nav.about },
  ];

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-parchment-50/90 backdrop-blur-md border-b border-sepia-600/20 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full bg-ink-900 text-parchment-50 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Key className="w-5 h-5" />
            </div>
            <span className="font-serif text-xl font-semibold text-ink-900 tracking-tight">
              CipherAnnotation
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-mono text-xs uppercase tracking-widest text-ink-900/70 hover:text-ink-900 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-ink-900 hover:text-primary-700 transition-colors"
            >
              {t.nav.login}
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-semibold bg-ink-900 text-parchment-50 hover:bg-primary-700 rounded-md transition-colors shadow-sm"
            >
              {t.nav.signup}
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-ink-900"
            aria-label="Menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-4 border-t border-sepia-600/20 bg-parchment-50/95 -mx-4 px-4">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-3 text-ink-900/80 font-medium"
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-3 border-t border-sepia-600/20 mt-2">
              <Link
                to="/login"
                className="flex-1 px-3 py-2 text-sm text-center border border-ink-900/30 rounded-md"
              >
                {t.nav.login}
              </Link>
              <Link
                to="/register"
                className="flex-1 px-3 py-2 text-sm text-center bg-ink-900 text-parchment-50 rounded-md"
              >
                {t.nav.signup}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default LandingNavbar;
