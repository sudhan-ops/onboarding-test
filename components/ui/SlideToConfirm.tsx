import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

interface SlideToConfirmProps {
  onConfirm: () => void;
  isActionInProgress: boolean;
  text: string;
  confirmText: string;
  slideDirection: 'left' | 'right';
  className?: string;
  thumbClassName?: string;
}

const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  onConfirm,
  isActionInProgress,
  text,
  confirmText,
  slideDirection,
  className = '',
  thumbClassName = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const snapBack = useCallback(() => {
    if (thumbRef.current) {
      thumbRef.current.style.transition = 'transform 0.3s ease';
      thumbRef.current.style.transform = 'translateX(0px)';
    }
    setPosition(0);
  }, []);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (isActionInProgress || isConfirmed) return;
    setIsDragging(true);
    startXRef.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
    if (thumbRef.current) {
      thumbRef.current.style.transition = 'none';
    }
  };

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !sliderRef.current || !thumbRef.current) return;
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const thumbRect = thumbRef.current.getBoundingClientRect();
    
    const deltaX = clientX - startXRef.current;
    
    let newPosition;
    if (slideDirection === 'right') {
        newPosition = Math.max(0, Math.min(deltaX, sliderRect.width - thumbRect.width - 8)); // 8 for padding
    } else { // 'left'
        newPosition = Math.min(0, Math.max(deltaX, -(sliderRect.width - thumbRect.width - 8)));
    }
    
    setPosition(newPosition);
    thumbRef.current.style.transform = `translateX(${newPosition}px)`;
  }, [isDragging, slideDirection]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !sliderRef.current || !thumbRef.current) return;
    setIsDragging(false);
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const thumbRect = thumbRef.current.getBoundingClientRect();
    const threshold = (sliderRect.width - thumbRect.width) * 0.75;
    
    let confirmed = false;
    if (slideDirection === 'right' && position > threshold) {
        confirmed = true;
    } else if (slideDirection === 'left' && position < -threshold) {
        confirmed = true;
    }

    if (confirmed) {
        setIsConfirmed(true);
        onConfirm();
    } else {
        snapBack();
    }
  }, [isDragging, position, onConfirm, slideDirection, snapBack]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientX);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchEnd = () => handleDragEnd();

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);
  
  useEffect(() => {
    if(!isActionInProgress && isConfirmed) {
      setIsConfirmed(false);
      snapBack();
    }
  }, [isActionInProgress, isConfirmed, snapBack]);
  
  const showSuccess = isConfirmed && !isActionInProgress;

  return (
    <div
      ref={sliderRef}
      className={`fo-slider ${className} ${showSuccess ? 'success' : ''}`}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      <div
        ref={thumbRef}
        className={`fo-slider-thumb ${thumbClassName}`}
      >
        {isActionInProgress && isConfirmed ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : slideDirection === 'right' ? (
          <ChevronRight className="h-6 w-6" />
        ) : (
          <ChevronLeft className="h-6 w-6" />
        )}
      </div>
      <span className={`fo-slider-text ${position !== 0 || (isActionInProgress && isConfirmed) ? 'opacity-0' : 'opacity-100'}`}>{text}</span>
      <span className={`fo-slider-text absolute transition-opacity duration-300 ${isActionInProgress && isConfirmed ? 'opacity-100' : 'opacity-0'}`}>{confirmText}</span>
    </div>
  );
};

export default SlideToConfirm;