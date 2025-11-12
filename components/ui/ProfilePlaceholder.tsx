
import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Avatars } from './Avatars';

interface ProfilePlaceholderProps {
    className?: string;
    photoUrl?: string | null;
    seed?: string;
}

export const ProfilePlaceholder: React.FC<ProfilePlaceholderProps> = ({ className, photoUrl, seed }) => {
    const { user } = useAuthStore();
    
    if (photoUrl) {
        return <img src={photoUrl} alt="Profile" className={`w-full h-full object-cover ${className || ''}`} />;
    }

    const effectiveSeed = seed || user?.id;

    if (!effectiveSeed) {
        const FallbackAvatar = Avatars[0];
        return <FallbackAvatar className={`w-full h-full text-muted/60 ${className || ''}`} />;
    }

    const avatarIndex = effectiveSeed.charCodeAt(effectiveSeed.length - 1) % Avatars.length;
    const SelectedAvatar = Avatars[avatarIndex];
    
    return <SelectedAvatar className={`w-full h-full ${className || ''}`} />;
};