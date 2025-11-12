import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Step } from '../types/stepper';

interface StepperProps {
  steps: Step[];
  currentStepIndex: number;
  onStepClick: (index: number) => void;
  highestStepReached: number;
  isMobileOptimized?: boolean;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStepIndex, onStepClick, highestStepReached, isMobileOptimized = false }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;
  const totalPages = Math.ceil(steps.length / itemsPerPage);

  // This effect now correctly syncs the visible page with the current step index.
  useEffect(() => {
    if (isMobileOptimized) {
      const pageOfCurrentStep = Math.floor(currentStepIndex / itemsPerPage);
      setCurrentPage(pageOfCurrentStep);
    }
  }, [currentStepIndex, isMobileOptimized, itemsPerPage]);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  };
  
  const visibleStepIndices = useMemo(() => {
      if (!isMobileOptimized) return [];
      const start = currentPage * itemsPerPage;
      const end = start + itemsPerPage;
      return Array.from({ length: steps.length }, (_, i) => i).slice(start, end);
  }, [currentPage, itemsPerPage, steps.length, isMobileOptimized]);

  if (!isMobileOptimized) {
    const progressPercentage = currentStepIndex > 0 ? (currentStepIndex / (steps.length - 1)) * 100 : 0;
    const itemSlotPercent = 100 / steps.length;
    const marginPercent = itemSlotPercent / 2;
    return (
        <nav aria-label="Onboarding Progress" className="py-4">
            <div className="relative">
                <div className="absolute top-4 h-1" style={{ left: `${marginPercent}%`, right: `${marginPercent}%` }}>
                    <div className="w-full h-full bg-border rounded-full" />
                    <div className="absolute top-0 left-0 h-full bg-accent rounded-full transition-all duration-500 ease-in-out" style={{ width: `${progressPercentage}%` }} />
                </div>
                <ol role="list" className="relative flex items-center">
                    {steps.map((step, index) => {
                        const isComplete = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const canClick = index <= highestStepReached;

                        return (
                            <li key={step.key} className="flex-1">
                                <div className="relative flex flex-col items-center group">
                                    <button
                                        type="button"
                                        onClick={() => canClick && onStepClick(index)}
                                        disabled={!canClick}
                                        className="flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-dark rounded-full disabled:cursor-not-allowed"
                                        aria-current={isCurrent ? 'step' : undefined}
                                        title={step.label}
                                    >
                                        <div className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 border-2 z-10 ${isComplete ? 'bg-accent border-accent text-white' : ''} ${isCurrent ? 'bg-card border-accent text-accent scale-110' : ''} ${!isComplete && !isCurrent ? 'bg-card border-border text-muted' : ''} ${canClick ? 'group-hover:border-accent-dark' : ''}`}>
                                            {isComplete ? <Check className="w-5 h-5" /> : React.createElement(step.icon, { className: 'w-5 h-5' })}
                                        </div>
                                    </button>
                                    <span className={`hidden sm:block absolute top-12 w-24 text-center text-xs transition-colors duration-300 ${isCurrent ? 'text-accent font-bold' : 'text-muted'} ${canClick ? 'group-hover:text-primary-text' : ''}`}>{step.label}</span>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </nav>
    );
  }
  
  return (
    <nav aria-label="Onboarding Progress" className="bg-card rounded-2xl mx-4 my-2 p-2 flex items-center gap-1">
       <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPage === 0}
          className="p-2 rounded-full disabled:opacity-30 disabled:cursor-not-allowed text-white hover:bg-white/10"
          aria-label="Previous steps"
      >
          <ChevronLeft className="h-6 w-6" />
      </button>

      <div className="flex-1 overflow-hidden">
        <ol role="list" className="flex items-center justify-around">
            {visibleStepIndices.map(index => {
            const step = steps[index];
            const isComplete = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const canClick = index <= highestStepReached;

            return (
              <li key={step.key} className="flex-shrink-0">
                <div className="relative flex flex-col items-center group">
                  <button
                    type="button"
                    onClick={() => canClick && onStepClick(index)}
                    disabled={!canClick}
                    className="flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1f0f] focus-visible:ring-emerald-400 rounded-full disabled:cursor-not-allowed"
                    aria-current={isCurrent ? 'step' : undefined}
                    title={step.label}
                  >
                    <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 border-2 z-10
                      ${isComplete ? 'bg-green-600 border-green-600 text-white' : ''}
                      ${isCurrent ? 'bg-transparent border-green-500 text-white scale-110' : ''}
                      ${!isComplete && !isCurrent ? `bg-transparent ${canClick ? 'border-gray-500 text-gray-400 group-hover:border-emerald-400' : 'border-gray-700 text-gray-600 opacity-50'}` : ''}`}
                    >
                      {isComplete ? <Check className="w-6 h-6 text-white" /> : React.createElement(step.icon, { className: 'w-6 h-6' })}
                    </div>
                  </button>
                </div>
              </li>
            );
            })}
        </ol>
      </div>
      
      <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages - 1}
          className="p-2 rounded-full disabled:opacity-30 disabled:cursor-not-allowed text-white hover:bg-white/10"
          aria-label="Next steps"
      >
          <ChevronRight className="h-6 w-6" />
      </button>
    </nav>
  );
};

export default Stepper;
