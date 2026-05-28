import { describe, it, expect } from 'vitest';
import { overlapRatio, findDeepestContainer, isDescendantOf } from './geometry';
import type { Annotation, BoundingBox } from '@/types';

const bb = (x: number, y: number, width: number, height: number): BoundingBox =>
  ({ x, y, width, height });

const ann = (id: string, b: BoundingBox, parentId: string | null = null): Annotation =>
  ({ id, boundingBox: b, parentId } as unknown as Annotation);

describe('overlapRatio', () => {
  it('returns 1 when inner is fully inside outer', () => {
    expect(overlapRatio(bb(0, 0, 100, 100), bb(10, 10, 20, 20))).toBe(1);
  });

  it('returns 0 when boxes do not intersect', () => {
    expect(overlapRatio(bb(0, 0, 10, 10), bb(20, 20, 10, 10))).toBe(0);
  });

  it('returns 0 when inner has zero area', () => {
    expect(overlapRatio(bb(0, 0, 10, 10), bb(0, 0, 0, 0))).toBe(0);
  });

  it('returns the fraction of inner that overlaps', () => {
    // Inner is 10x10 at (5,0). Outer covers x:0..10 -> overlaps half the width.
    expect(overlapRatio(bb(0, 0, 10, 10), bb(5, 0, 10, 10))).toBeCloseTo(0.5, 5);
  });
});

describe('findDeepestContainer', () => {
  it('returns null when no candidate contains the inner box', () => {
    const all = [ann('a', bb(0, 0, 5, 5))];
    expect(findDeepestContainer(all, bb(100, 100, 10, 10))).toBeNull();
  });

  it('picks the smallest containing candidate', () => {
    const all = [
      ann('outer', bb(0, 0, 100, 100)),
      ann('inner', bb(0, 0, 50, 50)),
    ];
    const result = findDeepestContainer(all, bb(10, 10, 10, 10));
    expect(result?.id).toBe('inner');
  });

  it('respects the 0.85 containment threshold', () => {
    // Candidate covers only ~50% of the inner box → not a container.
    const candidate = ann('c', bb(0, 0, 10, 10));
    const inner = bb(5, 0, 10, 10); // 50% overlap
    expect(findDeepestContainer([candidate], inner)).toBeNull();
  });
});

describe('isDescendantOf', () => {
  const all = [
    ann('root', bb(0, 0, 100, 100)),
    ann('child', bb(0, 0, 50, 50), 'root'),
    ann('grand', bb(0, 0, 10, 10), 'child'),
    ann('other', bb(60, 60, 10, 10)),
  ];

  it('returns true for self', () => {
    expect(isDescendantOf(all, 'root', 'root')).toBe(true);
  });

  it('returns true through multiple parent links', () => {
    expect(isDescendantOf(all, 'grand', 'root')).toBe(true);
  });

  it('returns false for unrelated nodes', () => {
    expect(isDescendantOf(all, 'other', 'root')).toBe(false);
  });
});
