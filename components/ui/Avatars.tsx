import React from 'react';

const DefaultAvatar: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 144 144" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="72" cy="72" r="72" fill="#F0EBE3"/>
        <path d="M109.5 144H34.5C34.5 119.464 51.18 99 72 99C92.82 99 109.5 119.464 109.5 144Z" fill="white"/>
        <path d="M84 99C84 105.627 78.6274 111 72 111C65.3726 111 60 105.627 60 99H84Z" fill="#E1C699"/>
        <path d="M96 87C96 70.4315 85.3726 57 72 57C58.6274 57 48 70.4315 48 87H96Z" fill="#4A4A4A"/>
        <rect x="62" y="77" width="5" height="2" rx="1" fill="#2D2D2D"/>
        <rect x="77" y="77" width="5" height="2" rx="1" fill="#2D2D2D"/>
    </svg>
);

export const Avatars = [DefaultAvatar];
