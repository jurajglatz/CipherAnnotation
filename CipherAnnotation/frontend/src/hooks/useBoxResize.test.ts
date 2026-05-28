import { describe, it, expect } from 'vitest';
import { computeResizedBox, type ResizeState } from './useBoxResize';

const state = (handleIndex: number, originalBox = { x: 30, y: 30, width: 40, height: 40 }): ResizeState => ({
  isResizing: true,
  boxId: 'id',
  handleIndex,
  originalBox,
  startX: 100,
  startY: 100,
});

describe('computeResizedBox', () => {
  const W = 200, H = 200;

  it('SE handle (idx 4) grows width and height with positive delta', () => {
    const out = computeResizedBox(state(4), 110, 120, W, H);
    expect(out).toEqual({ x: 30, y: 30, width: 50, height: 60 });
  });

  it('NW handle (idx 0) shifts x/y and shrinks width/height', () => {
    const out = computeResizedBox(state(0), 105, 105, W, H);
    expect(out).toEqual({ x: 35, y: 35, width: 35, height: 35 });
  });

  it('E handle (idx 3) only affects width', () => {
    const out = computeResizedBox(state(3), 115, 999, W, H);
    expect(out.x).toBe(30);
    expect(out.y).toBe(30);
    expect(out.width).toBe(55);
    expect(out.height).toBe(40);
  });

  it('S handle (idx 5) only affects height', () => {
    const out = computeResizedBox(state(5), 999, 115, W, H);
    expect(out.width).toBe(40);
    expect(out.height).toBe(55);
  });

  it('clamps width and height to a minimum of 20', () => {
    const out = computeResizedBox(state(4), -500, -500, W, H);
    expect(out.width).toBe(20);
    expect(out.height).toBe(20);
  });

  it('N handle clamps moved position within the bottom edge', () => {
    // N handle (idx 1) moves y down and shrinks height. Dragging far past the
    // bottom collapses height to the 20px min and pins y so y+height <= H.
    // (SE-style growth past the right/bottom edge is NOT clamped — only
    // position is clamped, not size. So we test a position-moving handle here.)
    const out = computeResizedBox(state(1), 100, 10_000, W, H);
    expect(out.height).toBe(20);
    expect(out.y + out.height).toBeLessThanOrEqual(H);
  });

  it('NW handle clamps x>=0 when dragging past the top-left', () => {
    // Box at origin; drag NW handle up-left (cur 50,50 vs start 100,100 → delta -50,-50).
    // nb.x = 0 + (-50) = -50, nb.width = 40 - (-50) = 90; x then clamps to >= 0.
    const out = computeResizedBox(state(0, { x: 0, y: 0, width: 40, height: 40 }), 50, 50, W, H);
    expect(out.x).toBeGreaterThanOrEqual(0);
    expect(out.y).toBeGreaterThanOrEqual(0);
    expect(out.width).toBeGreaterThanOrEqual(20);
  });
});
