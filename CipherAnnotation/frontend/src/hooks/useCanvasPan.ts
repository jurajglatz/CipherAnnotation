import { RefObject, useEffect, useRef, useState } from 'react';

interface Args {
  containerRef: RefObject<HTMLDivElement>;
}

export function useCanvasPan({ containerRef }: Args) {
  const panningRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [modifierHeld, setModifierHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) setModifierHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) setModifierHeld(false);
    };
    const onBlur = () => setModifierHeld(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const startPan = (e: React.MouseEvent, onIdleUp?: () => void): boolean => {
    if (!containerRef.current) return false;
    const container = containerRef.current;
    panningRef.current = {
      active: false,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
    const PAN_THRESHOLD = 3;
    const onMove = (me: MouseEvent) => {
      const p = panningRef.current;
      if (!p) return;
      const dx = me.clientX - p.startX;
      const dy = me.clientY - p.startY;
      if (!p.active && Math.hypot(dx, dy) > PAN_THRESHOLD) {
        p.active = true;
        setIsPanning(true);
      }
      if (p.active) {
        container.scrollLeft = p.scrollLeft - dx;
        container.scrollTop = p.scrollTop - dy;
      }
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const wasActive = panningRef.current?.active ?? false;
      panningRef.current = null;
      setIsPanning(false);
      if (wasActive) {
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          window.removeEventListener('click', swallow, true);
        };
        window.addEventListener('click', swallow, true);
      } else if (onIdleUp) {
        onIdleUp();
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return true;
  };

  return { isPanning, modifierHeld, startPan };
}
