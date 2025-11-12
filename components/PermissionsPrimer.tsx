
import React from 'react';
import { Camera, MapPin, ShieldCheck } from 'lucide-react';
import Button from './ui/Button';
import Logo from './ui/Logo';

interface PermissionsPrimerProps {
  onAllow: () => void;
  onSkip: () => void;
}

const PermissionsPrimer: React.FC<PermissionsPrimerProps> = ({ onAllow, onSkip }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-page animate-fade-in-scale">
      <div className="w-full max-w-md p-8 text-center">
        <Logo className="h-12 mx-auto mb-8" />
        <h2 className="text-2xl font-bold text-primary-text">A few things before we start...</h2>
        <p className="mt-4 text-muted">
          To provide the best experience for features like attendance and document uploads, we need access to your device's camera and location.
        </p>
        
        <div className="space-y-6 text-left my-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-accent-light">
              <Camera className="h-6 w-6 text-accent-dark" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-text">Camera Access</h3>
              <p className="text-sm text-muted">Used for capturing your profile picture and document photos easily during onboarding.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-accent-light">
              <MapPin className="h-6 w-6 text-accent-dark" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-text">Location Access</h3>
              <p className="text-sm text-muted">Used to verify your location for clocking in and out, ensuring accurate attendance records.</p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg text-left">
           <ShieldCheck className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
           <div>
               <h4 className="font-semibold text-blue-800">Your Privacy is Important</h4>
               <p className="text-sm text-blue-700">We only access this data when you use these specific features. Your information is secure and is not used for any other purpose.</p>
           </div>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <Button onClick={onAllow} size="lg" className="w-full">Allow Access</Button>
          <Button onClick={onSkip} variant="secondary" className="w-full">Skip for now</Button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsPrimer;
