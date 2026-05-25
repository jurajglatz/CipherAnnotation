import { describe, it, expect } from 'vitest';
import { captionColor } from './captionColor';

const PALETTE = [
  '#e11d48', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#a855f7', '#f43f5e',
];

describe('captionColor', () => {
  it('returns a value from the palette', () => {
    expect(PALETTE).toContain(captionColor('Section'));
  });

  it('is stable for the same input', () => {
    expect(captionColor('Element')).toBe(captionColor('Element'));
  });

  it('produces different colors for at least some different inputs', () => {
    const colors = new Set(['A', 'B', 'C', 'D', 'E', 'F'].map(captionColor));
    expect(colors.size).toBeGreaterThan(1);
  });

  it('handles the empty string without throwing', () => {
    expect(() => captionColor('')).not.toThrow();
    expect(PALETTE).toContain(captionColor(''));
  });

  it('handles unicode/emoji input', () => {
    expect(PALETTE).toContain(captionColor('🜲 alchemy ☉'));
  });
});
