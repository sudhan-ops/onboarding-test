import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useOnboardingStore } from '../store/onboardingStore';
import { FileSignature } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ProfilePlaceholder } from '../components/ui/ProfilePlaceholder';
import { useMediaQuery } from '../hooks/useMediaQuery';

const OnboardingHome: React.FC = () => {
  const navigate = useNavigate();
  const { data, reset } = useOnboardingStore();
  const { user } = useAuthStore();
  const hasDraft = data.personal.firstName || data.personal.lastName;

  const isMobile = useMediaQuery('(max-width: 767px)');

  const handleStart = () => {
    reset(); // Start fresh
    navigate('/onboarding/select-organization');
  };

  const handleContinue = () => {
    navigate('/onboarding/add/personal');
  };
  
  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center text-center relative min-h-[70vh]">
          <div className="p-8 max-w-sm w-full bg-transparent">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-black/20">
                <FileSignature className="h-10 w-10 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to Employee Onboarding</h1>
            <p className="text-gray-400 text-sm mb-8">
              We need to collect some information to get you set up. This should only take a few minutes.
            </p>
            
            <div className="flex flex-col gap-3">
                {hasDraft && (
                    <Button onClick={handleContinue} variant="secondary" className="w-full !py-3">
                        Continue Previous Application
                    </Button>
                )}
                <Button onClick={handleStart} variant="primary" className="w-full !py-3 !text-lg">
                    Start New Application
                </Button>
            </div>
          </div>
      </div>
    );
  }


  return (
    <div className="h-full flex items-center justify-center p-4">
        <div className="bg-card p-8 sm:p-12 rounded-2xl shadow-card max-w-2xl mx-auto text-center w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-accent-light p-4 rounded-full">
                <FileSignature className="h-12 w-12 text-accent-dark" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-primary-text mb-2">Welcome to Employee Onboarding</h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            We need to collect some information to get you set up. This should only take a few minutes.
          </p>
          
          <div className="mt-10 flex justify-center items-center gap-4 flex-wrap">
            {hasDraft && (
              <Button onClick={handleContinue} variant="secondary">
                Continue Draft
              </Button>
            )}
            <Button onClick={handleStart} variant="primary">
              {hasDraft ? 'Start Fresh' : 'Start New Application'}
            </Button>
          </div>
        </div>
    </div>
  );
};

export default OnboardingHome;