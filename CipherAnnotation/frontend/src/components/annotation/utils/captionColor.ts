/**
 * Map a caption name to a stable, visually distinct color. We hash the name
 * and pick from a curated palette of well-separated hues so two captions
 * (e.g. "Section" / "Element") never collide on similar greens.
 */
const PALETTE = [
  '#e11d48', // rose
  '#f97316', // orange
  '#eab308', // amber
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#84cc16', // lime
  '#a855f7', // purple
  '#f43f5e', // crimson
];

export function captionColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
