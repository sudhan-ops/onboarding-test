import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, Crosshair, ChevronDown, Menu, X, ArrowLeft, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePermissionsStore } from '../../store/permissionsStore';
import Logo from '../ui/Logo';
import NotificationBell from '../notifications/NotificationBell';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface HeaderProps {
    setIsMobileMenuOpen: (isOpen: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setIsMobileMenuOpen }) => {
    const { user, logout } = useAuthStore();
    const { permissions } = usePermissionsStore();
    const navigate = useNavigate();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery('(max-width: 767px)');
    const location = useLocation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getRoleName = (role: string) => {
        return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    const handleLogoutClick = () => {
        setIsMobileMenuOpen(false);
        setIsUserMenuOpen(false);
        setIsLogoutModalOpen(true);
    };

    const handleConfirmLogout = async () => {
        setIsLogoutModalOpen(false);
        await logout();
        navigate('/auth/login', { replace: true });
    };

    const handleMobileExit = () => {
        navigate('/profile');
    };

    return (
        <>
            <Modal
              isOpen={isLogoutModalOpen}
              onClose={() => setIsLogoutModalOpen(false)}
              onConfirm={handleConfirmLogout}
              title="Confirm Log Out"
            >
              Are you sure you want to log out?
            </Modal>
            <header className="bg-card border-b border-border z-30 flex-shrink-0">
                <div className="px-4 sm:px-6 lg:px-8">
                     <div className="flex items-center h-16">
                        <div className="flex-none md:hidden w-10">
                            <button onClick={handleMobileExit} className="inline-flex items-center justify-center p-2 rounded-md text-muted hover:bg-page focus:outline-none" aria-label="Go to profile page">
                                <span className="sr-only">Go to profile</span>
                                <ArrowLeft className="block h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="flex-1 flex justify-center md:justify-start min-w-0 px-2">
                           {/* Logo removed for mobile view to create a cleaner header */}
                        </div>

                        <div className="flex-none flex justify-end w-auto min-w-10">
                            <div className="flex items-center gap-1 sm:gap-2">
                                <NotificationBell />
                                {!isMobile && user && (
                                    <div className="relative" ref={userMenuRef}>
                                        <button
                                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-page transition-colors"
                                            aria-expanded={isUserMenuOpen}
                                            aria-haspopup="true"
                                        >
                                            <div className="h-8 w-8 rounded-full bg-accent-light flex items-center justify-center">
                                                <User className="h-5 w-5 text-accent-dark" />
                                            </div>
                                            <div className="text-left hidden sm:block">
                                                <span className="text-sm font-semibold">{user.name}</span>
                                                <span className="text-xs text-muted block">{getRoleName(user.role)}</span>
                                            </div>
                                            <ChevronDown className="h-4 w-4 text-muted" />
                                        </button>

                                        {isUserMenuOpen && (
                                            <div className="absolute right-0 mt-2 w-48 bg-card rounded-xl shadow-card border border-border py-1 z-40 animate-fade-in-down" role="menu">
                                                <Link
                                                    to="/profile"
                                                    onClick={() => setIsUserMenuOpen(false)}
                                                    className="flex items-center px-4 py-2 text-sm text-primary-text hover:bg-page"
                                                    role="menuitem"
                                                >
                                                    <User className="mr-2 h-4 w-4" />
                                                    Profile
                                                </Link>
                                                {user && permissions[user.role]?.includes('apply_for_leave') && (
                                                    <Link
                                                        to="/leaves/dashboard"
                                                        onClick={() => setIsUserMenuOpen(false)}
                                                        className="flex items-center px-4 py-2 text-sm text-primary-text hover:bg-page"
                                                        role="menuitem"
                                                    >
                                                        <Crosshair className="mr-2 h-4 w-4" />
                                                        Tracker
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={handleLogoutClick}
                                                    className="flex items-center w-full text-left px-4 py-2 text-sm text-primary-text hover:bg-page"
                                                    role="menuitem"
                                                >
                                                    <LogOut className="mr-2 h-4 w-4" />
                                                    Log Out
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;
