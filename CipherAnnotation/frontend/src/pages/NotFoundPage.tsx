/**
 * NotFoundPage Component
 * 404 error page
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowRight } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-parchment text-ink-900 overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 cipher-symbols-bg opacity-[0.18] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-parchment-100/50 pointer-events-none" />

      <div className="relative text-center max-w-xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ink-900/5 border border-sepia-600/30 text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-8">
          Lost in translation
        </div>

        <h1 className="font-serif text-8xl sm:text-9xl font-semibold text-ink-900 leading-none tracking-tight">
          4<em className="italic font-normal text-sepia-700">0</em>4
        </h1>
        <p className="mt-6 font-serif text-3xl text-ink-900">
          Page <span className="ink-underline">not found</span>
        </p>
        <p className="mt-4 text-ink-900/70 leading-relaxed">
          The page you're looking for doesn't exist. It may have been moved, renamed, or deleted —
          like a cipher whose key has been lost to time.
        </p>

        <Link
          to="/"
          className="group inline-flex items-center gap-2 mt-10 px-7 py-3.5 bg-ink-900 hover:bg-primary-700 text-parchment-50 font-semibold rounded-md shadow-lg shadow-ink-900/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
        >
          <Home className="w-4 h-4" />
          Go Home
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
