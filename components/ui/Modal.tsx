import React from 'react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmButtonVariant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'icon';
  confirmButtonText?: string;
  isConfirming?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, title, children, confirmButtonVariant = 'danger', confirmButtonText = 'Confirm', isConfirming = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" aria-modal="true" role="dialog">
      <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-md m-4 animate-fade-in-scale">
        <h3 className="text-lg font-bold text-primary-text">{title}</h3>
        <div className="mt-2 text-sm text-muted">
          {children}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            onClick={onClose}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant={confirmButtonVariant}
            isLoading={isConfirming}
          >
            {confirmButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Modal;