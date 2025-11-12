import React from 'react';
import { X } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full h-full flex items-center justify-center" 
        onClick={e => e.stopPropagation()}
      >
        <img src={imageUrl} alt="Document Preview" className="max-w-full max-h-full object-contain rounded-lg" />
        <button 
          onClick={onClose} 
          className="absolute top-0 right-0 m-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/80 transition-colors"
          aria-label="Close image preview"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
