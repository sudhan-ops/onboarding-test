import React from 'react';
// Fix: Changed `import type` to inline `import { type ... }` for UseFormRegisterReturn to fix namespace-as-type error.
import { type UseFormRegisterReturn } from 'react-hook-form';
import Input from './Input';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface VerifiedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  isVerified: boolean;
  hasValue: boolean;
  error?: string;
  registration?: UseFormRegisterReturn;
  onManualInput?: () => void;
}

const VerifiedInput: React.FC<VerifiedInputProps> = ({ label, isVerified, hasValue, error, registration, onManualInput, ...props }) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const handleInput = async (e: any) => {
    if (onManualInput) {
        onManualInput();
    }
    if (registration?.onChange) {
      await registration.onChange(e);
    }
  };

  const formRegistration = registration ? { ...registration, onChange: handleInput } : undefined;

  return (
    <div>
        <div className="flex items-center mb-1">
             <label htmlFor={props.id} className="block text-sm font-medium text-muted">
                {label}
            </label>
            {hasValue && (
                isVerified ? (
                    <span className={`ml-2 flex items-center ${isDark ? 'text-green-400' : 'text-green-600'}`} title="Verified from document">
                        <CheckCircle className="h-4 w-4" />
                    </span>
                ) : (
                    <span className={`ml-2 flex items-center ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} title="Manually entered. Please verify.">
                        <AlertTriangle className="h-4 w-4" />
                    </span>
                )
            )}
        </div>
        <Input
            id={props.id}
            error={error}
            registration={formRegistration}
            label="" // Label is handled above
            {...props}
        />
    </div>
  );
};

export default VerifiedInput;