/**
 * ConfirmDialog Component
 * Confirmation dialog using Modal component
 */

import React from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isDangerous?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  isDangerous = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <p className="text-ink-900/80 leading-relaxed">{message}</p>

        <div className="flex justify-end gap-3 pt-4 border-t border-sepia-600/20">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-ink-900 bg-transparent border-2 border-ink-900/20 hover:border-ink-900/60 rounded-md transition-colors font-semibold disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md transition-colors font-semibold text-parchment-50 shadow-sm disabled:opacity-50 ${
              isDangerous
                ? 'bg-cipher-red hover:bg-red-800'
                : 'bg-ink-900 hover:bg-primary-700'
            }`}
          >
            {isLoading ? 'Loading...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
