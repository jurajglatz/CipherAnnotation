import { Annotation, BoundingBox } from '@/types';

// A candidate counts as a "container" when at least this fraction of the
// inner box's area lies inside it. Lets users be slightly sloppy at the
// boundary without accidentally promoting a child to top-level.
const CONTAINMENT_THRESHOLD = 0.85;

export function overlapRatio(outer: BoundingBox, inner: BoundingBox): number {
  const ix = Math.max(
    0,
    Math.min(outer.x + outer.width, inner.x + inner.width) - Math.max(outer.x, inner.x),
  );
  const iy = Math.max(
    0,
    Math.min(outer.y + outer.height, inner.y + inner.height) - Math.max(outer.y, inner.y),
  );
  const innerArea = inner.width * inner.height;
  if (innerArea <= 0) return 0;
  return (ix * iy) / innerArea;
}

export function findDeepestContainer(
  all: Annotation[],
  inner: BoundingBox,
): Annotation | null {
  const containers = all.filter(
    (a) => overlapRatio(a.boundingBox, inner) >= CONTAINMENT_THRESHOLD,
  );
  if (containers.length === 0) return null;
  return containers.reduce((best, cur) =>
    cur.boundingBox.width * cur.boundingBox.height <
    best.boundingBox.width * best.boundingBox.height
      ? cur
      : best,
  );
}

export function isDescendantOf(
  all: Annotation[],
  candidateId: string,
  ancestorId: string,
): boolean {
  const byId = new Map(all.map((a) => [a.id, a]));
  let cur: string | null = candidateId;
  while (cur) {
    if (cur === ancestorId) return true;
    cur = byId.get(cur)?.parentId ?? null;
  }
  return false;
}
