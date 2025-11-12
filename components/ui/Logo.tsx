import React from 'react';
import { useLogoStore } from '../../store/logoStore';

const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
    const logo = useLogoStore((state) => state.currentLogo);
    return (
        <img
            src={logo}
            alt="Paradigm Logo"
            className={`w-auto object-contain ${!className.includes('h-') && 'h-10'} ${className}`}
        />
    );
};

export default Logo;
