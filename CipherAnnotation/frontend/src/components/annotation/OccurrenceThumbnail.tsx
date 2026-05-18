/**
 * OccurrenceThumbnail
 * Renders a fixed-height thumbnail showing only the bounding-box region of a
 * page image. Fetches the page image via the authenticated axios instance
 * (so the JWT is sent) and crops it via background-position / background-size.
 */

import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { BoundingBox } from '@/types';

interface OccurrenceThumbnailProps {
  documentId: string;
  pageId: string;
  bbox: BoundingBox;
  /** Side length of the square thumbnail in CSS pixels. */
  size?: number;
  className?: string;
}

export const OccurrenceThumbnail: React.FC<OccurrenceThumbnailProps> = ({
  documentId,
  pageId,
  bbox,
  size = 128,
  className,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    api
      .get(`/documents/${documentId}/pages/${pageId}/image`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        created = URL.createObjectURL(res.data);
        setBlobUrl(created);
        const img = new Image();
        img.onload = () => {
          if (!cancelled) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.src = created;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [documentId, pageId]);

  // Fit the bounding box inside a fixed square while keeping its aspect ratio.
  // Both axes use the same scale so the crop isn't distorted.
  const safeBboxW = Math.max(1, bbox.width);
  const safeBboxH = Math.max(1, bbox.height);
  const scale = Math.min(size / safeBboxW, size / safeBboxH);
  const offsetX = (size - safeBboxW * scale) / 2 - bbox.x * scale;
  const offsetY = (size - safeBboxH * scale) / 2 - bbox.y * scale;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        backgroundColor: '#fff',
        backgroundImage: blobUrl ? `url(${blobUrl})` : undefined,
        backgroundRepeat: 'no-repeat',
        backgroundSize: natural ? `${natural.w * scale}px ${natural.h * scale}px` : undefined,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
      }}
      aria-label="annotation crop"
    />
  );
};

export default OccurrenceThumbnail;
