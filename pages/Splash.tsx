import React from 'react';
import Logo from '../components/ui/Logo';

const Splash: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
            <div className="splash-logo">
                <Logo className="h-16 mb-8" />
            </div>
        </div>
    );
};

export default Splash;
