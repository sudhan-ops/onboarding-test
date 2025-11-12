import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import { Hourglass, LogOut } from 'lucide-react';
import Logo from '../components/ui/Logo';

const PendingApproval: React.FC = () => {
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/auth/login', { replace: true });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-page p-4">
            <div className="text-center p-8 bg-card rounded-2xl shadow-card w-full max-w-md mx-auto">
                <Logo className="h-10 mx-auto mb-6" />
                <Hourglass className="h-16 w-16 text-accent mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-primary-text mb-2">Account Pending Approval</h2>
                <p className="text-muted mb-6">
                    Welcome, {user?.name || 'user'}! Your account has been created successfully and is awaiting administrator approval. You will receive an email once your account is activated.
                </p>
                <div className="flex justify-center">
                    <Button onClick={handleLogout} variant="secondary">
                        <LogOut className="mr-2 h-4 w-4" />
                        Log Out
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;