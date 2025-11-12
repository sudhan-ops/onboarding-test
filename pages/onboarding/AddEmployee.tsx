import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams, Outlet } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import Stepper from '../../components/Stepper';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import { api } from '../../services/api';
import type { OnboardingStep } from '../../types';
import type { Step } from '../../types/stepper';
import { Loader2, User, MapPin, Building, Users, GraduationCap, IndianRupee, BadgeCheck, ShieldPlus, HeartPulse, Files, FileCheck, Trash2, CheckCircle, X, ArrowLeft, Shirt, Fingerprint, Home } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useEnrollmentRulesStore } from '../../store/enrollmentRulesStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const stepDefinitions: Omit<Step, 'status'>[] = [
  { key: 'personal', label: 'Personal', icon: User },
  { key: 'address', label: 'Address', icon: MapPin },
  { key: 'organization', label: 'Organization', icon: Building },
  { key: 'family', label: 'Family', icon: Users },
  { key: 'education', label: 'Education', icon: GraduationCap },
  { key: 'bank', label: 'Bank', icon: IndianRupee },
  { key: 'uan', label: 'UAN/PF', icon: BadgeCheck },
  { key: 'esi', label: 'ESI', icon: ShieldPlus },
  { key: 'gmc', label: 'GMC', icon: HeartPulse },
  { key: 'uniform', label: 'Uniform', icon: Shirt },
  { key: 'documents', label: 'Documents', icon: Files },
  { key: 'biometrics', label: 'Biometrics', icon: Fingerprint },
  { key: 'review', label: 'Review', icon: FileCheck },
];

const stepKeys = stepDefinitions.map(s => s.key as OnboardingStep);

interface OutletContext {
  onValidated: () => Promise<void>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

const AddEmployee: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { data, reset, setData } = useOnboardingStore();
    const { user } = useAuthStore();
    const { salaryThreshold } = useEnrollmentRulesStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [searchParams] = useSearchParams();
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    
    const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
    const debounceTimeoutRef = useRef<number | null>(null);
    
    const isMobile = useMediaQuery('(max-width: 767px)');

    const navigationTargetRef = useRef<OnboardingStep | null>(null);
    const currentStepKey = location.pathname.split('/').pop() as OnboardingStep;
    const currentStepIndex = useMemo(() => stepKeys.indexOf(currentStepKey), [currentStepKey]);
    const [highestStepReached, setHighestStepReached] = useState(0);

    useEffect(() => {
        // If the loaded data is a submitted form (not a draft), unlock all steps for review.
        // Also unlock for the pre-filled "Ravi Kumar" demo data for seamless demoing.
        const isPreFilledDemo = data.personal.firstName === 'Ravi' && data.status === 'draft';
        if (data.status !== 'draft' || isPreFilledDemo) {
            setHighestStepReached(stepKeys.length - 1);
            return; // Exit early, don't use session storage logic.
        }
        
        // For new, empty drafts, track progress as before.
        const saved = sessionStorage.getItem(`onboarding_progress_${data.id}`);
        const savedStep = saved ? parseInt(saved, 10) : 0;
        const highest = Math.max(savedStep, currentStepIndex);
        setHighestStepReached(highest);

        if (currentStepIndex > savedStep) {
            sessionStorage.setItem(`onboarding_progress_${data.id}`, String(currentStepIndex));
        }
    }, [data, currentStepIndex]);


    const steps = useMemo((): Step[] => {
      return stepDefinitions.map((step, index) => ({
          ...step,
          status: index < currentStepIndex ? 'complete' : index === currentStepIndex ? 'current' : 'upcoming',
      }));
    }, [currentStepIndex]);

    useEffect(() => {
        const submissionId = searchParams.get('id');
        const fetchAndSetData = async (id: string) => {
            setIsLoadingData(true);
            try {
                const submissionData = await api.getOnboardingDataById(id);
                if (submissionData) {
                    setData(submissionData);
                    setSaveStatus('saved'); // Data is loaded and saved
                } else {
                    setToast({ message: "Could not find submission data.", type: 'error' });
                    reset();
                }
            } catch (error) {
                console.error("Failed to fetch submission data", error);
                setToast({ message: "Failed to load submission data.", type: 'error' });
                reset();
            } finally {
                setIsLoadingData(false);
            }
        };

        if (submissionId) {
            fetchAndSetData(submissionId);
        } else {
            setIsLoadingData(false);
        }
    }, [searchParams, setData, reset]);

    const handleSaveDraft = useCallback(async () => {
        setSaveStatus('saving');
        try {
            const { draftId } = await api.saveDraft(data);
            if (draftId !== data.id) {
                setData({ ...data, id: draftId }); 
            }
            setSaveStatus('saved');
        } catch (error) {
            setToast({ message: 'Auto-save failed. Check your connection.', type: 'error' });
            setSaveStatus('dirty');
        }
    }, [data, setData]);
    
    useEffect(() => {
        const isDraft = !data.id || data.id.startsWith('draft_') || data.status === 'draft';
        if (isDraft && !isLoadingData) {
            if (saveStatus !== 'saving') {
                setSaveStatus('dirty');
            }

            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            debounceTimeoutRef.current = window.setTimeout(() => {
                handleSaveDraft();
            }, 2000); // 2 second debounce
        }

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [data, isLoadingData, handleSaveDraft, saveStatus]);


    const onValidated = async () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        await handleSaveDraft();

        const targetStep = navigationTargetRef.current;
        navigationTargetRef.current = null; // Reset after use

        if (targetStep) {
            navigate(`/onboarding/add/${targetStep}`);
        } else {
            if (currentStepIndex < stepKeys.length - 1) {
                let nextStepIndex = currentStepIndex + 1;
                
                if (currentStepKey === 'esi' && stepKeys[nextStepIndex] === 'gmc') {
                    const isGmcApplicable = data.personal.salary != null && data.personal.salary > salaryThreshold;
                    if (!isGmcApplicable) {
                        // User is eligible for ESI, so GMC is not applicable. Skip it.
                        nextStepIndex++;
                    }
                }

                if (nextStepIndex < stepKeys.length) {
                    navigate(`/onboarding/add/${stepKeys[nextStepIndex]}`);
                }
            }
        }
    };

    const handleStepClick = (targetIndex: number) => {
        if (targetIndex <= highestStepReached) {
            navigate(`/onboarding/add/${stepKeys[targetIndex]}`);
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            let prevStepIndex = currentStepIndex - 1;

            if (currentStepKey === 'uniform' && stepKeys[prevStepIndex] === 'gmc') {
                const isGmcApplicable = data.personal.salary != null && data.personal.salary > salaryThreshold;
                if (!isGmcApplicable) {
                    // User was not eligible for GMC, so skip it when going back.
                    prevStepIndex--;
                }
            }

            if (prevStepIndex >= 0) {
                navigate(`/onboarding/add/${stepKeys[prevStepIndex]}`);
            } else {
                 navigate('/onboarding/select-organization');
            }

        } else {
            navigate('/onboarding/select-organization');
        }
    };
    
    const handleSubmit = async () => {
        setIsSubmitting(true);
        const submissionData = { ...data, status: 'pending' as const };
        try {
            const isExistingRecord = !!data.id && !data.id.startsWith('draft_');
            if (isExistingRecord) {
                await api.updateOnboarding(submissionData);
                setToast({ message: 'Application updated successfully!', type: 'success' });
            } else {
                await api.submitOnboarding(submissionData);
                setToast({ message: 'Application submitted successfully!', type: 'success' });
            }
            
            setTimeout(() => {
                reset();
                if (user?.role === 'site_manager') {
                    navigate('/site/dashboard');
                } else {
                    navigate('/onboarding');
                }
            }, 2000);
        } catch (error) {
            setToast({ message: 'Failed to submit application.', type: 'error' });
            setIsSubmitting(false);
        }
    };

    const handleClearForm = () => {
        setIsClearModalOpen(true);
    };

    const handleConfirmClear = () => {
        sessionStorage.removeItem(`onboarding_progress_${data.id}`);
        reset();
        setIsClearModalOpen(false);
        navigate('/onboarding/add/personal', { replace: true });
        setToast({ message: 'Form has been cleared.', type: 'success' });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Enter') return;

        const target = e.target as HTMLElement;
        if (e.key === 'Enter' && target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON') {
            e.preventDefault();
        }
        
        if (e.key === 'Enter' && target.tagName === 'BUTTON') {
            return;
        }

        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && (target.tagName === 'TEXTAREA' || (target as HTMLInputElement).type === 'number')) {
            return;
        }
        
        const form = e.currentTarget;
        const focusable = Array.from(
            form.querySelectorAll('input:not([type="hidden"]):not([readonly]), select, textarea, button')
        ).filter(
            (el: Element) =>
                !(el as HTMLElement).hasAttribute('disabled') &&
                (el as HTMLElement).offsetParent !== null
        ) as HTMLElement[];

        const index = focusable.indexOf(document.activeElement as HTMLElement);
        if (index === -1) return;

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
        }

        let nextIndex = index;
        if (e.key === 'ArrowUp') {
            nextIndex = index - 1;
        } else { // ArrowDown or Enter
            nextIndex = index + 1;
        }

        if (nextIndex >= 0 && nextIndex < focusable.length) {
            focusable[nextIndex].focus();
        } else if (e.key === 'Enter' && nextIndex >= focusable.length) {
            const nextButton = document.getElementById('save-and-next-button');
            if (nextButton) {
                nextButton.click();
            }
        }
    };

    if (isLoadingData) {
        return (
            <div className="flex justify-center items-center h-full text-muted">
                <Loader2 className="h-8 w-8 animate-spin mr-4" />
                <p>Loading application data...</p>
            </div>
        );
    }
    
    const isReviewStep = stepKeys[currentStepIndex] === 'review';
    
    if (isMobile) {
        return (
            <div className="h-full flex flex-col">
                {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
                
                <Stepper steps={steps} currentStepIndex={currentStepIndex} onStepClick={handleStepClick} highestStepReached={highestStepReached} isMobileOptimized={true} />
                
                <main className="flex-1 overflow-y-auto p-4 pb-28" onKeyDown={handleKeyDown}>
                     <div className="bg-card p-6 rounded-2xl">
                        <Outlet context={{ onValidated, onSubmit: handleSubmit, isSubmitting, setToast } satisfies OutletContext} />
                    </div>
                </main>

                <footer className="fixed bottom-0 left-0 right-0 p-4 flex items-center justify-between gap-2 bg-card border-t border-[#123820] z-10">
                    <Button type="button" onClick={handleBack} variant="secondary">Back</Button>
                    <Button
                        type="button"
                        onClick={() => navigate('/onboarding')}
                        variant="secondary"
                        className="!p-3 !rounded-full"
                        aria-label="Go to Home"
                    >
                        <Home className="h-5 w-5" />
                    </Button>
                     <Button id="save-and-next-button" type="submit" form={`${stepKeys[currentStepIndex]}-form`}>
                       {isReviewStep ? 'Submit' : 'Next'}
                   </Button>
                </footer>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-0">
            <div className={`transition-opacity duration-300 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                 {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
                 <Modal
                    isOpen={isClearModalOpen}
                    onClose={() => setIsClearModalOpen(false)}
                    onConfirm={handleConfirmClear}
                    title="Confirm Clear Form"
                >
                    Are you sure you want to clear all data entered in this form? This action cannot be undone.
                </Modal>
                <Stepper steps={steps} currentStepIndex={currentStepIndex} onStepClick={handleStepClick} highestStepReached={highestStepReached} isMobileOptimized={isMobile} />
                
                <div className="mt-8 bg-card p-6 sm:p-8 rounded-xl shadow-card" onKeyDown={handleKeyDown}>
                     <Outlet context={{ onValidated, onSubmit: handleSubmit, isSubmitting, setToast } satisfies OutletContext} />
                </div>

                <div className="mt-8 flex justify-between items-center">
                    <Button onClick={handleBack} disabled={currentStepIndex === 0} variant="secondary">
                        Back
                    </Button>
                    <div className="flex flex-wrap gap-4 justify-end items-center">
                         <div className="flex items-center gap-2 text-sm text-muted italic transition-opacity duration-300 min-h-[20px]">
                            {saveStatus === 'saving' && (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            )}
                            {saveStatus === 'saved' && (
                                <>
                                    <CheckCircle className="h-4 w-4 text-accent" />
                                    <span>Draft saved</span>
                                </>
                            )}
                            {saveStatus === 'dirty' && (
                                <span className="text-gray-500">Unsaved changes</span>
                            )}
                        </div>
                         {!isReviewStep && (
                           <Button id="save-and-next-button" type="submit" form={`${stepKeys[currentStepIndex]}-form`}>
                               Save & Next
                           </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddEmployee;