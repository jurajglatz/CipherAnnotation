/**
 * Modal Component
 * Reusable modal dialog with overlay
 */

import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${sizeClasses[size]} bg-parchment-50 border border-sepia-600/30 rounded-lg shadow-2xl shadow-ink-900/30 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-sepia-600/20">
            <h2 className="font-serif text-2xl font-semibold text-ink-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-sepia-700 hover:text-ink-900 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-sepia-700 hover:text-ink-900 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
