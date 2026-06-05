import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { carouselSlides, type CarouselSlide, type BoxColor } from '@/i18n/landingCopy';

interface AnnotationCarouselProps {
  slides?: CarouselSlide[];
  intervalMs?: number;
  autoPlay?: boolean;
}

const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
};

const boxBorder: Record<BoxColor, string> = {
  red: 'border-cipher-red',
  green: 'border-emerald-800',
  sepia: 'border-sepia-600',
};
const boxLabel: Record<BoxColor, string> = {
  red: 'bg-cipher-red',
  green: 'bg-emerald-800',
  sepia: 'bg-sepia-600',
};

const PlaceholderCanvas: React.FC<{ slide: CarouselSlide }> = ({ slide }) => (
  <div className="absolute inset-0 p-5 font-mono text-base sm:text-lg leading-loose tracking-[0.3em] text-sepia-800/80 select-none overflow-hidden">
    {(slide.glyphs ?? []).map((row, i) => (
      <div key={i}>{row}</div>
    ))}
    {(slide.boxes ?? []).map((b, i) => (
      <div
        key={i}
        className={`absolute border-2 rounded-sm ${boxBorder[b.color]}`}
        style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.width}%`, height: `${b.height}%` }}
      >
        <span
          className={`absolute -top-2 -left-0.5 px-1 text-[10px] font-sans text-parchment-50 rounded-sm ${boxLabel[b.color]}`}
        >
          {b.value}
        </span>
      </div>
    ))}
  </div>
);

export const AnnotationCarousel: React.FC<AnnotationCarouselProps> = ({
  slides = carouselSlides,
  intervalMs = 4000,
  autoPlay = true,
}) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const count = slides.length;

  const goTo = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (!autoPlay || paused || reducedMotion || count <= 1) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      intervalMs,
    );
    return () => window.clearInterval(id);
  }, [autoPlay, paused, reducedMotion, count, intervalMs]);

  const active = slides[index];

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Annotation preview"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="rounded-xl overflow-hidden border border-sepia-600/40 bg-parchment-50 shadow-2xl shadow-sepia-900/20">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-parchment-100 border-b border-sepia-600/30">
          <span className="w-3 h-3 rounded-full bg-cipher-red/70" />
          <span className="w-3 h-3 rounded-full bg-sepia-400" />
          <span className="w-3 h-3 rounded-full bg-sepia-600/60" />
          <span className="ml-2 font-mono text-xs text-sepia-700 truncate">
            {active.filename}
          </span>
        </div>
        <div className="relative aspect-[1857/1062] bg-parchment-dark">
          {active.src ? (
            <img
              src={active.src}
              alt={active.caption ?? active.filename}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <PlaceholderCanvas slide={active} />
          )}
          {active.caption && (
            <div className="absolute bottom-0 inset-x-0 px-4 py-2 bg-gradient-to-t from-ink-900/70 to-transparent">
              <span className="font-sans text-xs text-parchment-50/90">
                {active.caption}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Slide ${index + 1} of ${count}: ${active.caption ?? active.filename}`}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous slide"
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink-900/85 text-parchment-50 flex items-center justify-center shadow-lg hover:bg-ink-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
            className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink-900/85 text-parchment-50 flex items-center justify-center shadow-lg hover:bg-ink-900 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex justify-center gap-2 mt-4">
            {slides.map((s, i) => (
              <button
                key={s.filename}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? true : undefined}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-sepia-700' : 'w-2 bg-sepia-600/40 hover:bg-sepia-600/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AnnotationCarousel;
