
import React from 'react';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { ShieldAlert } from 'lucide-react';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PROMPT_TIMEOUT = 60 * 1000; // 60 seconds

export const IdleTimeoutManager: React.FC = () => {
    const { logout } = useAuthStore();
    const navigate = useNavigate();

    const handleIdle = () => {
        logout();
        navigate('/auth/login', { replace: true });
    };

    const { isIdle, countdown, reset } = useIdleTimer({ 
        onIdle: handleIdle, 
        idleTimeout: IDLE_TIMEOUT, 
        promptTimeout: PROMPT_TIMEOUT 
    });

    if (!isIdle) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm" aria-modal="true" role="dialog">
            <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-md m-4 text-center animate-fade-in-scale">
                <ShieldAlert className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-primary-text">Are you still there?</h3>
                <p className="mt-2 text-muted">
                    For your security, you will be logged out due to inactivity.
                </p>
                <div className="my-6 text-4xl font-bold text-accent">
                    {Math.ceil(countdown / 1000)}
                </div>
                <p className="text-sm text-muted mb-6">
                    Click the button below to stay logged in.
                </p>
                <div className="flex justify-center gap-4">
                    <Button onClick={reset} variant="primary" size="lg">Stay Logged In</Button>
                </div>
            </div>
        </div>
    );
};
