import React from 'react';
import { Annotation, BoundingBox } from '@/types';
import { captionColor } from './utils/captionColor';
import { HANDLE_POSITIONS, HANDLE_CURSORS, RESIZE_HANDLE_SIZE } from '@/hooks/useBoxResize';

interface Props {
  annotation: Annotation;
  pageWidth: number;
  pageHeight: number;
  displayBox: BoundingBox;
  orientation: number;
  selected: boolean;
  primary: boolean;
  showHandles: boolean;
  activeHandleIndex: number | null;
  dashed: boolean;
  onHandleMouseDown: (handleIndex: number, e: React.MouseEvent) => void;
}

export const AnnotationShape: React.FC<Props> = ({
  annotation,
  pageWidth,
  pageHeight,
  displayBox,
  orientation,
  selected,
  primary,
  showHandles,
  activeHandleIndex,
  dashed,
  onHandleMouseDown,
}) => {
  const { x, y, width, height } = displayBox;
  const color = captionColor(annotation.captionName);
  const cx = x + width / 2;
  const cy = y + height / 2;
  const groupTransform = orientation ? `rotate(${orientation} ${cx} ${cy})` : undefined;
  const scale = pageWidth / 512;

  return (
    <g transform={groupTransform}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={selected ? 0.33 : 0.06}
        stroke={color}
        strokeOpacity={selected ? 1 : 0.6}
        strokeWidth={selected ? 5 : 3}
        strokeDasharray={dashed ? '4,4' : ''}
        pointerEvents="none"
      />

      {showHandles && HANDLE_POSITIONS.map((pos, idx) => {
        const isActive = activeHandleIndex === idx;
        return (
          <rect
            key={`handle-${idx}`}
            x={x + width * pos.x - (RESIZE_HANDLE_SIZE / 2) * (pageWidth / 512)}
            y={y + height * pos.y - (RESIZE_HANDLE_SIZE / 2) * (pageHeight / 512)}
            width={RESIZE_HANDLE_SIZE * (pageWidth / 512)}
            height={RESIZE_HANDLE_SIZE * (pageHeight / 512)}
            rx={1.5 * (pageWidth / 512)}
            ry={1.5 * (pageHeight / 512)}
            fill={isActive ? color : 'white'}
            stroke={color}
            strokeWidth={1.25}
            shapeRendering="geometricPrecision"
            style={{ cursor: HANDLE_CURSORS[idx] }}
            pointerEvents="auto"
            onMouseDown={(e) => onHandleMouseDown(idx, e)}
          />
        );
      })}

      {/* Caption label / corner badge */}
      {(() => {
        if (selected) {
          const labelText = `${annotation.captionName} ${annotation.captionNumber}`;
          const fontSize = 5 * scale;
          const padX = 2 * scale;
          const padY = 1 * scale;
          const charW = fontSize * 0.6;
          const labelW = labelText.length * charW + padX * 2;
          const labelH = fontSize + padY * 2;
          const aboveY = y - labelH - 2 * (pageHeight / 512);
          const placeAbove = aboveY > 0;
          const lx = x;
          const ly = placeAbove ? aboveY : y + 2 * (pageHeight / 512);
          return (
            <g pointerEvents="none">
              <rect
                x={lx}
                y={ly}
                width={labelW}
                height={labelH}
                rx={2 * scale}
                ry={2 * scale}
                fill={color}
                fillOpacity={0.95}
              />
              <text
                x={lx + padX}
                y={ly + padY + fontSize * 0.85}
                fontSize={fontSize}
                fill="white"
                fontWeight={700}
              >
                {labelText}
              </text>
            </g>
          );
        }
        const initial = (annotation.captionName || '?').charAt(0).toUpperCase();
        const badgeText = `${initial}${annotation.captionNumber}`;
        const fontSize = 3.5 * scale;
        const padX = 1.2 * scale;
        const padY = 0.6 * scale;
        const charW = fontSize * 0.6;
        const badgeW = badgeText.length * charW + padX * 2;
        const badgeH = fontSize + padY * 2;
        if (width < badgeW + 2 * scale || height < badgeH + 2 * scale) return null;
        const bx = x + 1.5 * scale;
        const by = y + 1.5 * scale;
        return (
          <g pointerEvents="none" opacity={0.85}>
            <rect
              x={bx}
              y={by}
              width={badgeW}
              height={badgeH}
              rx={1.5 * scale}
              ry={1.5 * scale}
              fill={color}
              fillOpacity={0.75}
            />
            <text
              x={bx + padX}
              y={by + padY + fontSize * 0.85}
              fontSize={fontSize}
              fill="white"
              fontWeight={700}
            >
              {badgeText}
            </text>
          </g>
        );
      })()}
    </g>
  );
};
