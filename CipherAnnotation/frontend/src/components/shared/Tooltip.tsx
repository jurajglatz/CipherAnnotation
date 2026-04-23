import React from 'react';

interface TooltipProps {
  label: string;
  position?: 'bottom' | 'top' | 'left' | 'right';
  children: React.ReactNode;
}

const positionClasses: Record<NonNullable<TooltipProps['position']>, string> = {
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export const Tooltip: React.FC<TooltipProps> = ({
  label,
  position = 'bottom',
  children,
}) => {
  return (
    <div className="relative inline-flex group/tooltip">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity delay-150 ${positionClasses[position]}`}
      >
        {label}
      </span>
    </div>
  );
};

export default Tooltip;
