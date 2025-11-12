
import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Logo from '../ui/Logo';
import { useAuthLayoutStore } from '../../store/authLayoutStore';

const AuthLayout: React.FC = () => {
  const { backgroundImages } = useAuthLayoutStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // Only run the interval if there's more than one image to cycle through
    if (backgroundImages.length > 1) {
        const timer = setInterval(() => {
            setCurrentImageIndex(prevIndex => (prevIndex + 1) % backgroundImages.length);
        }, 5000); // Change image every 5 seconds
        return () => clearInterval(timer);
    }
  }, [backgroundImages.length]);

  const properties = useMemo(() => {
      if (backgroundImages && backgroundImages.length > 0) {
          return backgroundImages;
      }
      // Provide a default fallback if the store is empty for some reason
      return ['https://picsum.photos/seed/default_fallback_1/1200/900'];
  }, [backgroundImages]);

  const pageInfo = useMemo(() => {
      if (location.pathname.includes('signup')) {
          return { title: 'Create an Account', subtitle: 'Join our platform to get started.' };
      }
      if (location.pathname.includes('forgot-password')) {
          return { title: 'Forgot Password?', subtitle: 'No worries, we\'ll send you reset instructions.' };
      }
       if (location.pathname.includes('update-password')) {
          return { title: 'Set a New Password', subtitle: 'Please enter your new password.' };
      }
      // Default to login
      return { title: 'Sign In', subtitle: 'Enter your credentials to access your account.' };
  }, [location.pathname]);


  return (
    <div className="min-h-screen font-sans flex items-center justify-center bg-page relative overflow-hidden">
        {/* Full-screen background carousel */}
        <div className="absolute inset-0 w-full h-full">
            {properties.map((imageUrl, index) => (
            <div
                key={index}
                className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ backgroundImage: `url(${imageUrl})` }}
            />
            ))}
            <div className="absolute inset-0 bg-black/30"></div> {/* Dark overlay */}
        </div>

        {/* Centered content container */}
        <div className="relative w-full max-w-5xl p-4">
             <div className="w-full grid md:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md bg-black/40 border border-white/10">
                {/* Left Visual Column */}
                <div className="hidden md:flex flex-col justify-between p-16 bg-gradient-to-br from-black/40 to-black/70">
                    <div>
                        <Logo className="h-14" />
                        <h1 className="text-4xl font-bold text-white mt-8 leading-tight drop-shadow-lg">
                            Welcome to the Future of Onboarding.
                        </h1>
                        <p className="text-white/80 mt-4 max-w-md drop-shadow-lg">
                            Streamlining the journey for every new member of the Paradigm family.
                        </p>
                    </div>
                    
                    <div>
                        <p className="text-white/50 text-xs mt-4">© {new Date().getFullYear()} Paradigm Services. All rights reserved.</p>
                    </div>
                </div>

                {/* Right Form Column with Glassmorphism effect */}
                <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-black/40 backdrop-blur-xl border-l border-white/10">
                    <div className="w-full max-w-md mx-auto">
                        {/* Mobile-only Logo */}
                        <div className="md:hidden flex justify-center mb-6">
                            <Logo className="h-10" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">{pageInfo.title}</h2>
                        <p className="text-gray-300 mb-8">{pageInfo.subtitle}</p>
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AuthLayout;