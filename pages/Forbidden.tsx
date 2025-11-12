import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ShieldAlert } from 'lucide-react';

const Forbidden: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-page p-4">
            <div className="text-center p-8 bg-card rounded-2xl shadow-card w-full max-w-md mx-auto">
                <div className="flex justify-center mb-4">
                    <ShieldAlert className="h-16 w-16 text-red-500" />
                </div>
                <h2 className="text-3xl font-bold text-primary-text mb-2">Access Denied</h2>
                <p className="text-muted mb-6">
                    You do not have the necessary permissions to view this page. If you believe this is an error, please contact your administrator.
                </p>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => navigate(-1)} variant="secondary">Go Back</Button>
                    <Button onClick={() => navigate('/auth/login')}>Login</Button>
                </div>
            </div>
        </div>
    );
};

export default Forbidden;
