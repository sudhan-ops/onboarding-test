import React, { useState } from 'react';
import { Image, LayoutDashboard, MousePointerClick, X, Trash2 } from 'lucide-react';
import { useLogoStore } from '../../store/logoStore';
import { useAuthLayoutStore } from '../../store/authLayoutStore';
import { useUiSettingsStore } from '../../store/uiSettingsStore';
import type { UploadedFile } from '../../types';
import UploadDocument from '../UploadDocument';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import Toast from '../ui/Toast';

interface PageInterfaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsCard: React.FC<{ title: string; icon: React.ElementType, children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="bg-page p-4 rounded-lg">
        <div className="flex items-center mb-4">
            <Icon className="h-5 w-5 text-accent-dark mr-3" />
            <h4 className="font-semibold text-primary-text">{title}</h4>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const PageInterfaceSettingsModal: React.FC<PageInterfaceSettingsModalProps> = ({ isOpen, onClose }) => {
    const { 
        currentLogo, 
        defaultLogo, 
        setCurrentLogo, 
        setDefaultLogo,
        resetToDefault,
        resetToOriginal
    } = useLogoStore();
    const { backgroundImages, addBackgroundImage, removeBackgroundImage } = useAuthLayoutStore();
    const uiSettings = useUiSettingsStore();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleLogoUpload = (uploadedFile: UploadedFile | null) => {
        if (uploadedFile) {
            const reader = new FileReader();
            reader.readAsDataURL(uploadedFile.file);
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setCurrentLogo(base64String);
                setToast({ message: 'Active logo updated!', type: 'success' });
            };
            reader.onerror = () => {
                setToast({ message: 'Failed to read logo file.', type: 'error' });
            };
        }
    };
    
    const handleSetDefault = () => {
        setDefaultLogo();
        setToast({ message: 'Active logo has been set as the new default.', type: 'success' });
    }

    const handleResetToDefault = () => {
        resetToDefault();
        setToast({ message: 'Logo has been reset to your default.', type: 'success' });
    }

    const handleResetToOriginal = () => {
        resetToOriginal();
        setToast({ message: 'Logo has been reset to the system original.', type: 'success' });
    };
    
    const handleBgImageUpload = (uploadedFile: UploadedFile | null) => {
        // FIX: The UploadDocument component fires onFileChange twice.
        // The first time is an optimistic update with the local preview.
        // The second time includes a `url` property after the mock upload.
        // We only want to react to the FIRST event to avoid duplication.
        if (uploadedFile && !uploadedFile.url) {
            const reader = new FileReader();
            reader.readAsDataURL(uploadedFile.file);
            reader.onloadend = () => {
                const base64String = reader.result as string;
                const wasAdded = addBackgroundImage(base64String);
                if (wasAdded) {
                    setToast({ message: 'Background image added.', type: 'success' });
                } else {
                    setToast({ message: 'This image has already been added.', type: 'error' });
                }
            };
            reader.onerror = () => {
                setToast({ message: 'Failed to read image file.', type: 'error' });
            };
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4" onClick={onClose}>
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            <div className="bg-card rounded-xl shadow-card w-full max-w-4xl my-8 animate-fade-in-scale flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-primary-text">Page Interface Settings</h3>
                    <Button variant="icon" onClick={onClose}><X className="h-5 w-5"/></Button>
                </div>
                <div className="flex-grow overflow-y-auto p-6 space-y-6 max-h-[75vh]">
                    <SettingsCard title="Branding & Logo" icon={Image}>
                        <p className="text-sm text-muted -mt-2">Manage the active and default logos for your application.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 items-start">
                            {/* Active Logo Section */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-primary-text">Active Logo</h4>
                                <div className="p-4 border rounded-lg bg-page flex justify-center items-center min-h-[120px]">
                                    <img src={currentLogo} alt="Current Active Logo" className="max-h-24 w-auto" />
                                </div>
                                <UploadDocument
                                    label="Change Active Logo"
                                    file={null}
                                    onFileChange={handleLogoUpload}
                                    allowedTypes={['image/jpeg', 'image/png']}
                                />
                            </div>

                            {/* Default Logo Section */}
                            <div className="flex flex-col h-full">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-primary-text">Default Logo</h4>
                                    <div className="p-4 border rounded-lg bg-page flex justify-center items-center min-h-[120px]">
                                        <img src={defaultLogo} alt="Default Logo" className="max-h-24 w-auto" />
                                    </div>
                                </div>
                                
                                <div className="flex-grow" />
                                
                                <div className="space-y-2 mt-4">
                                    <Button type="button" className="w-full" onClick={handleSetDefault}>Set Active Logo as Default</Button>
                                    <Button type="button" className="w-full" variant="outline" onClick={handleResetToDefault}>Use Default Logo</Button>
                                    <div className="text-center pt-2">
                                        <button type="button" onClick={handleResetToOriginal} className="text-xs text-muted hover:text-primary-text underline">
                                            Reset to System Original
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SettingsCard>
                    
                    <SettingsCard title="Login Screen Background" icon={LayoutDashboard}>
                        <p className="text-sm text-muted -mt-2">Manage the background images for the login screen carousel.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {backgroundImages.map((img, index) => (
                                <div key={`${img.substring(0, 30)}-${index}`} className="relative group aspect-video bg-page rounded-md overflow-hidden">
                                    <img src={img} className="w-full h-full object-cover" alt={`Background ${index + 1}`} />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button variant="icon" onClick={() => removeBackgroundImage(index)} className="!rounded-full !bg-white/20 hover:!bg-white/40">
                                            <Trash2 className="h-5 w-5 text-white" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <UploadDocument
                                label="Add new background image"
                                file={null}
                                onFileChange={handleBgImageUpload}
                                allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
                            />
                        </div>
                    </SettingsCard>

                    <SettingsCard title="Interaction Settings" icon={MousePointerClick}>
                        <p className="text-sm text-muted -mt-2">Customize hover and auto-scroll behaviors for easier navigation.</p>
                        <div className="space-y-4 pt-4">
                            <Checkbox
                                id="auto-click-hover-modal"
                                label="Enable Auto-Click on Hover"
                                description="Automatically switch tabs or pages by hovering over them."
                                checked={uiSettings.autoClickOnHover}
                                onChange={uiSettings.setAutoClickOnHover}
                            />
                            <Checkbox
                                id="auto-scroll-hover-modal"
                                label="Enable Auto-Scroll on Hover"
                                description="Automatically scroll the page by hovering over the up/down arrows."
                                checked={uiSettings.autoScrollOnHover}
                                onChange={uiSettings.setAutoScrollOnHover}
                            />
                        </div>
                    </SettingsCard>
                </div>
                <div className="p-4 border-t flex justify-end">
                    <Button variant="primary" onClick={onClose}>Done</Button>
                </div>
            </div>
        </div>
    );
};

export default PageInterfaceSettingsModal;