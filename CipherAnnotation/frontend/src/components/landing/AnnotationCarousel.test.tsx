import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AnnotationCarousel from './AnnotationCarousel';
import type { CarouselSlide } from '@/i18n/landingCopy';

const slides: CarouselSlide[] = [
  { filename: 'one.png', glyphs: ['⚿ ◈'] },
  { filename: 'two.png', glyphs: ['✶ ⟁'] },
  { filename: 'three.png', glyphs: ['◇ ⊗'] },
];

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('AnnotationCarousel', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders the first slide filename', () => {
    render(<AnnotationCarousel slides={slides} intervalMs={1000} />);
    expect(screen.getByText('one.png')).toBeInTheDocument();
  });

  it('auto-advances to the next slide after the interval', () => {
    render(<AnnotationCarousel slides={slides} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('two.png')).toBeInTheDocument();
  });

  it('wraps from the last slide back to the first', () => {
    render(<AnnotationCarousel slides={slides} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText('one.png')).toBeInTheDocument();
  });

  it('advances when the next arrow is clicked', () => {
    render(<AnnotationCarousel slides={slides} intervalMs={100000} />);
    fireEvent.click(screen.getByLabelText('Next slide'));
    expect(screen.getByText('two.png')).toBeInTheDocument();
  });

  it('wraps to the last slide when prev is clicked on the first', () => {
    render(<AnnotationCarousel slides={slides} intervalMs={100000} />);
    fireEvent.click(screen.getByLabelText('Previous slide'));
    expect(screen.getByText('three.png')).toBeInTheDocument();
  });

  it('jumps to a slide when its dot is clicked', () => {
    render(<AnnotationCarousel slides={slides} intervalMs={100000} />);
    fireEvent.click(screen.getByLabelText('Go to slide 3'));
    expect(screen.getByText('three.png')).toBeInTheDocument();
  });

  it('pauses auto-advance while hovered', () => {
    render(<AnnotationCarousel slides={slides} intervalMs={1000} />);
    fireEvent.mouseEnter(screen.getByRole('region'));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText('one.png')).toBeInTheDocument();
  });

  it('does not auto-advance when reduced motion is preferred', () => {
    mockMatchMedia(true);
    render(<AnnotationCarousel slides={slides} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('one.png')).toBeInTheDocument();
  });

  it('does not auto-advance when autoPlay is false', () => {
    render(<AnnotationCarousel slides={slides} intervalMs={1000} autoPlay={false} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('one.png')).toBeInTheDocument();
  });

  it('renders an image with alt text when a slide has src', () => {
    const imgSlides: CarouselSlide[] = [
      { filename: 'real.png', caption: 'A real screenshot', src: '/landing/real.png' },
    ];
    render(<AnnotationCarousel slides={imgSlides} intervalMs={100000} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('/landing/real.png');
    expect(img.getAttribute('alt')).toBe('A real screenshot');
  });

  it('falls back to the filename for alt text when no caption is given', () => {
    const imgSlides: CarouselSlide[] = [
      { filename: 'no-caption.png', src: '/landing/no-caption.png' },
    ];
    render(<AnnotationCarousel slides={imgSlides} intervalMs={100000} />);
    expect(screen.getByRole('img').getAttribute('alt')).toBe('no-caption.png');
  });

  it('shows the caption overlay when a slide has a caption', () => {
    const captioned: CarouselSlide[] = [
      { filename: 'c.png', caption: 'Annotating the cipher', glyphs: ['◇'] },
    ];
    render(<AnnotationCarousel slides={captioned} intervalMs={100000} />);
    expect(screen.getByText('Annotating the cipher')).toBeInTheDocument();
  });
});
