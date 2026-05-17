import React from 'react';
import { Annotation } from '@/types';
import { captionColor } from './utils/captionColor';
import { findDeepestContainer } from './utils/geometry';
import { DrawingState } from '@/hooks/useAnnotationDrawing';

interface Props {
  drawing: DrawingState;
  annotations: Annotation[];
  captions?: { id: string; name: string; createdAt: string }[];
}

// Predicts the colour of the about-to-be-created annotation using the same
// depth→caption mapping the server uses (PickDefaultCaption: depth 0/1/2/≥3
// → caption #1/#2/#3/#4 by createdAt).
export const DrawingPreview: React.FC<Props> = ({ drawing, annotations, captions }) => {
  if (!drawing.isDrawing) return null;

  const previewBox = {
    x: Math.min(drawing.startX, drawing.currentX),
    y: Math.min(drawing.startY, drawing.currentY),
    width: Math.abs(drawing.currentX - drawing.startX),
    height: Math.abs(drawing.currentY - drawing.startY),
  };
  const parent = findDeepestContainer(annotations, previewBox);
  let depth = 0;
  let cur: string | null = parent?.id ?? null;
  const byId = new Map(annotations.map((a) => [a.id, a]));
  while (cur) {
    depth++;
    cur = byId.get(cur)?.parentId ?? null;
    if (depth > 64) break;
  }
  const orderedCaptions = (captions ?? []).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const previewCaption = orderedCaptions[depth];
  const color = previewCaption
    ? captionColor(previewCaption.name)
    : captionColor(`Annotation lvl ${depth + 1}`);

  return (
    <rect
      x={previewBox.x}
      y={previewBox.y}
      width={previewBox.width}
      height={previewBox.height}
      fill={color}
      fillOpacity={0.13}
      stroke={color}
      strokeWidth={2}
      strokeDasharray="4,4"
      pointerEvents="none"
    />
  );
};
