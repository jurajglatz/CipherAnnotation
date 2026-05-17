import { RefObject, useEffect, useMemo, useState } from 'react';

interface Args {
  containerRef: RefObject<HTMLDivElement>;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
}

export function useCanvasZoom({ containerRef, pageWidth, pageHeight, zoom }: Args) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const fitFactor = useMemo(() => {
    if (!containerSize.width || !containerSize.height || !pageWidth || !pageHeight) return 1;
    const padding = 32;
    const wf = (containerSize.width - padding) / pageWidth;
    const hf = (containerSize.height - padding) / pageHeight;
    return Math.max(0.001, Math.min(wf, hf));
  }, [containerSize, pageWidth, pageHeight]);

  const displayWidth = pageWidth * (zoom / 100) * fitFactor;
  const displayHeight = pageHeight * (zoom / 100) * fitFactor;

  return { displayWidth, displayHeight, fitFactor };
}
