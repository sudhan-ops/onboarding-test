import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuthStore } from '../../store/authStore';
import { usePermissionsStore } from '../../store/permissionsStore';
import type { User, UploadedFile } from '../../types';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import { api } from '../../services/api';
import { User as UserIcon, Loader2, ClipboardList, LogOut, LogIn, Crosshair, CheckCircle } from 'lucide-react';
import { AvatarUpload } from '../../components/onboarding/AvatarUpload';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import SlideToConfirm from '../../components/ui/SlideToConfirm';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useThemeStore } from '../../store/themeStore';
import Checkbox from '../../components/ui/Checkbox';

// --- Profile Section ---
const profileValidationSchema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Must be a valid email').required('Email is required'),
  phone: yup.string().matches(/^[6-9][0-9]{9}$/, 'Must be a valid 10-digit Indian mobile number').optional().nullable(),
}).defined();

type ProfileFormData = Pick<User, 'name' | 'email' | 'phone'>;


// --- Main Component ---
const ProfilePage: React.FC = () => {
    const { user, updateUserProfile, isCheckedIn, isAttendanceLoading, toggleCheckInStatus, logout, lastCheckInTime, lastCheckOutTime, checkAttendanceStatus } = useAuthStore();
    const { permissions } = usePermissionsStore();
    const navigate = useNavigate();
    const { theme, setTheme, isAutomatic, setAutomatic } = useThemeStore();

    const [isSaving, setIsSaving] = useState(false);
    const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

    const isMobile = useMediaQuery('(max-width: 767px)');
    const isMobileView = isMobile; // Apply mobile view for all users on mobile
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState<'check-in' | 'check-out' | null>(null);

    useEffect(() => {
        const checkPermissions = async () => {
            if (!navigator.permissions?.query) {
                setPermissionStatus('prompt');
                return;
            }
            try {
                const cameraStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
                const locationStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    
                if (cameraStatus.state === 'granted' && locationStatus.state === 'granted') {
                    setPermissionStatus('granted');
                } else if (cameraStatus.state === 'denied' || locationStatus.state === 'denied') {
                    setPermissionStatus('denied');
                } else {
                    setPermissionStatus('prompt');
                }
    
                const updateStatus = () => checkPermissions();
                cameraStatus.onchange = updateStatus;
                locationStatus.onchange = updateStatus;
    
            } catch (e) {
                console.warn("Permissions API not fully supported. Defaulting to 'prompt'.", e);
                setPermissionStatus('prompt');
            }
        };
    
        checkPermissions();
    }, []);

    const requestPermissions = async () => {
        let cameraOk = false;
        let locationOk = false;
    
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            cameraOk = true;
        } catch (err) {
            console.error("Camera permission denied:", err);
        }
    
        try {
            await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });
            locationOk = true;
        } catch (err) {
            console.error("Location permission denied:", err);
        }
    
        if (cameraOk && locationOk) {
            setPermissionStatus('granted');
            setToast({ message: 'Camera and Location permissions granted!', type: 'success' });
        } else {
            setPermissionStatus('denied');
            let message = 'Permissions were not fully granted. ';
            if (!cameraOk) message += 'Camera access is needed. ';
            if (!locationOk) message += 'Location access is needed.';
            setToast({ message, type: 'error' });
        }
    };

    // Profile form
    const { register, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors, isDirty }, getValues, trigger, reset } = useForm<ProfileFormData>({
        resolver: yupResolver(profileValidationSchema) as Resolver<ProfileFormData>,
        defaultValues: { name: user?.name || '', email: user?.email || '', phone: user?.phone || '' },
    });

    // Effect to keep form synchronized with global user state
    useEffect(() => {
        if (user) {
            reset({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || ''
            });
        }
    }, [user, reset]);
    
    const handlePhotoChange = async (file: UploadedFile | null) => {
        if (!user) return;
        const originalPhotoUrl = user.photoUrl;
    
        // Optimistically update UI
        updateUserProfile({ photoUrl: file?.preview });
    
        try {
            let dataUrlForApi: string | null = null;
            if (file && file.file) {
                // Convert file to data URL for the API
                dataUrlForApi = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file.file);
                });
            }
            
            // Call API which handles upload to Supabase Storage and DB update
            const updatedUser = await api.updateUser(user.id, { photoUrl: dataUrlForApi });
            
            // Final update with permanent Supabase URL
            updateUserProfile(updatedUser);
            setToast({ message: `Profile photo ${dataUrlForApi ? 'updated' : 'removed'}.`, type: 'success' });
        } catch (e) {
            console.error(e);
            setToast({ message: 'Failed to save photo.', type: 'error' });
            updateUserProfile({ photoUrl: originalPhotoUrl }); // Revert on failure
        }
    };

    const onProfileSubmit: SubmitHandler<ProfileFormData> = async (formData) => {
        if (!user) return;
        setIsSaving(true);
        try {
            const updatedUser = await api.updateUser(user.id, formData);
            updateUserProfile(updatedUser);
            // Reset the form with the new data to clear the 'dirty' state
            reset(formData);
            setToast({ message: 'Profile updated successfully!', type: 'success' });
        } catch (error) {
            setToast({ message: 'Failed to update profile.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAttendanceAction = async () => {
        setIsSubmittingAttendance(true);
        const { success, message } = await toggleCheckInStatus();
        setToast({ message, type: success ? 'success' : 'error' });
        setIsSubmittingAttendance(false);
    };
    
    const handleSlideConfirm = () => {
        setConfirmationAction(isCheckedIn ? 'check-out' : 'check-in');
        setIsConfirmationModalOpen(true);
    };

    const handleConfirmAction = async () => {
        setIsConfirmationModalOpen(false);
        await handleAttendanceAction();
        setConfirmationAction(null);
    };

    const handleCancelAction = () => {
        setIsConfirmationModalOpen(false);
        setConfirmationAction(null);
    };

    const isActionInProgress = isSubmittingAttendance || isConfirmationModalOpen;

    const handleLogoutClick = () => {
        setIsLogoutModalOpen(true);
    };

    const handleConfirmLogout = async () => {
        setIsLogoutModalOpen(false);
        if (isDirty) {
            setIsSaving(true);
            setToast({ message: 'Saving profile changes...', type: 'success' });
            try {
                const isValid = await trigger();
                if (!isValid) {
                    setToast({ message: 'Profile data is invalid. Please fix errors before logging out.', type: 'error' });
                    setIsSaving(false);
                    return;
                }
                const formData = getValues();
                const updatedUser = await api.updateUser(user.id, formData);
                updateUserProfile(updatedUser);
                reset(formData); // Also reset here after saving on logout
            } catch (error) {
                setToast({ message: 'Failed to save profile. Logout aborted.', type: 'error' });
                setIsSaving(false);
                return;
            }
            setIsSaving(false);
        }
        await logout();
        navigate('/auth/login', { replace: true });
    };

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '--:--';
        return format(new Date(isoString), 'hh:mm a');
    };
    
    const canManageTasks = user && permissions[user.role]?.includes('manage_tasks');
    const tasksLink = canManageTasks ? '/tasks' : '/onboarding/tasks';
    const getRoleName = (role: string) => role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    if (!user) return <div>Loading user profile...</div>;
    
    const avatarFile: UploadedFile | null = user.photoUrl 
        ? { preview: user.photoUrl, name: 'Profile Photo', type: 'image/jpeg', size: 0 } 
        : null;
    
    if (isMobileView) {
        return (
            <div className="p-4 space-y-8">
                {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
                <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} title="Confirm Log Out">
                  Are you sure you want to log out?
                </Modal>
                <Modal
                  isOpen={isConfirmationModalOpen}
                  onClose={handleCancelAction}
                  onConfirm={handleConfirmAction}
                  title={`Confirm ${confirmationAction === 'check-in' ? 'Check In' : 'Check Out'}`}
                  confirmButtonVariant="primary"
                  confirmButtonText="Yes, Proceed"
                >
                  <p className="text-center">Are you sure you want to {confirmationAction?.replace('-', ' ')}?</p>
                </Modal>
                
                <div className="flex flex-col items-center text-center gap-4">
                    <AvatarUpload file={avatarFile} onFileChange={handlePhotoChange} />
                    <div>
                        <h2 className="text-2xl font-bold">{user.name}</h2>
                        <p className="text-muted">{user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <section>
                        <h3 className="fo-section-title mb-4">Profile Details</h3>
                        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                            <Input label="Full Name" id="name" error={profileErrors.name?.message} registration={register('name')} />
                            <Input label="Email Address" id="email" type="email" error={profileErrors.email?.message} registration={register('email')} readOnly className="!bg-gray-700/50" />
                            <Input label="Phone Number" id="phone" type="tel" error={profileErrors.phone?.message} registration={register('phone')} />
                            <div className="flex justify-end pt-2"><Button type="submit" isLoading={isSaving} disabled={!isDirty}>Save Changes</Button></div>
                        </form>
                    </section>

                    <section>
                        <h3 className="fo-section-title mb-4">Appearance</h3>
                        <div className="p-4 rounded-lg bg-[#243524] border border-[#374151] space-y-4">
                            <Checkbox
                                id="theme-automatic-mobile"
                                label="Automatic"
                                description="Switch themes based on screen size."
                                checked={isAutomatic}
                                onChange={(checked) => setAutomatic(checked)}
                            />
                            <Checkbox
                                id="theme-dark-mode-mobile"
                                label="Dark Mode"
                                description="Manually enable or disable dark mode."
                                checked={theme === 'dark'}
                                onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                                disabled={isAutomatic}
                            />
                        </div>
                    </section>

                    <section>
                         <h3 className="fo-section-title mb-4">Work Hours Tracking</h3>
                        <div className="fo-attendance-card space-y-4">
                            <div className="flex justify-around">
                                <div className="text-center">
                                    <p className="fo-attendance-time">Last Check In</p>
                                    <p className="fo-attendance-time"><strong>{formatTime(lastCheckInTime)}</strong></p>
                                </div>
                                <div className="text-center">
                                    <p className="fo-attendance-time">Last Check Out</p>
                                    <p className="fo-attendance-time"><strong>{formatTime(lastCheckOutTime)}</strong></p>
                                </div>
                            </div>
                            
                            {isAttendanceLoading ? (
                                <div className="flex items-center justify-center text-muted h-[56px]"><Loader2 className="h-6 w-6 animate-spin" /></div>
                            ) : isCheckedIn ? (
                                <SlideToConfirm onConfirm={handleSlideConfirm} isActionInProgress={isActionInProgress} text="Slide to Check Out" confirmText={isSubmittingAttendance ? "Checking Out..." : "Confirm..."} slideDirection="left" className="fo-slider--checkout" />
                            ) : (
                                <SlideToConfirm onConfirm={handleSlideConfirm} isActionInProgress={isActionInProgress} text="Slide to Check In" confirmText={isSubmittingAttendance ? "Checking In..." : "Confirm..."} slideDirection="right" className="fo-slider--checkin" />
                            )}
                        </div>
                    </section>

                    <section>
                        <h3 className="fo-section-title mb-4">Account Actions</h3>
                        <div className="space-y-4">
                            <Button onClick={() => navigate('/leaves/dashboard')} variant="secondary" className="w-full justify-center !py-3" title="View your leave history and balances"><Crosshair className="mr-2 h-5 w-5" /> Leave Tracker</Button>
                            <Button onClick={handleLogoutClick} variant="danger" className="w-full justify-center !py-3"><LogOut className="mr-2 h-5 w-5" /> Log Out</Button>
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            <Modal 
                isOpen={isLogoutModalOpen} 
                onClose={() => setIsLogoutModalOpen(false)} 
                onConfirm={handleConfirmLogout} 
                title="Confirm Log Out"
                isConfirming={isSaving}
            >
              Are you sure you want to log out? Any unsaved changes on this page will be automatically saved.
            </Modal>
             <Modal
              isOpen={isConfirmationModalOpen}
              onClose={handleCancelAction}
              onConfirm={handleConfirmAction}
              title={`Confirm ${confirmationAction === 'check-in' ? 'Check In' : 'Check Out'}`}
              confirmButtonVariant="primary"
              confirmButtonText="Yes, Proceed"
            >
              <p className="text-center">Are you sure you want to {confirmationAction?.replace('-', ' ')}?</p>
            </Modal>
            
            <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card flex flex-col md:flex-row items-center gap-6">
                <AvatarUpload file={avatarFile} onFileChange={handlePhotoChange} />
                <div className="text-center md:text-left">
                    <h2 className="text-3xl font-bold text-primary-text">{user.name}</h2>
                    <p className="text-muted">{getRoleName(user.role)}</p>
                    <p className="text-sm text-muted mt-1">{user.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card">
                        <h3 className="text-xl font-semibold mb-4 text-primary-text">Profile Details</h3>
                        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                            <Input label="Full Name" id="name" error={profileErrors.name?.message} registration={register('name')} />
                            <Input label="Email Address" id="email" type="email" error={profileErrors.email?.message} registration={register('email')} readOnly className="bg-page" />
                            <Input label="Phone Number" id="phone" type="tel" error={profileErrors.phone?.message} registration={register('phone')} />
                            <div className="flex justify-end pt-2"><Button type="submit" isLoading={isSaving} disabled={!isDirty}>Save Changes</Button></div>
                        </form>
                    </div>

                    <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card">
                        <h3 className="text-xl font-semibold mb-4 text-primary-text">Work Hours Tracking</h3>
                         <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center bg-page p-4 rounded-lg">
                                    <p className="text-sm text-muted">Last Check In</p>
                                    <p className="text-2xl font-bold">{formatTime(lastCheckInTime)}</p>
                                </div>
                                <div className="text-center bg-page p-4 rounded-lg">
                                    <p className="text-sm text-muted">Last Check Out</p>
                                    <p className="text-2xl font-bold">{formatTime(lastCheckOutTime)}</p>
                                </div>
                            </div>
                            
                            {isAttendanceLoading ? (
                                <div className="flex items-center justify-center h-[56px]"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
                            ) : isCheckedIn ? (
                                <Button onClick={handleAttendanceAction} variant="danger" className="w-full !py-3" isLoading={isActionInProgress}><LogOut className="mr-2 h-5 w-5" /> Check Out</Button>
                            ) : (
                                <Button onClick={handleAttendanceAction} variant="primary" className="w-full !py-3" isLoading={isActionInProgress}><LogIn className="mr-2 h-5 w-5" /> Check In</Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card">
                        <h3 className="text-xl font-semibold mb-4 text-primary-text">Appearance</h3>
                        <div className="space-y-4">
                            <Checkbox id="theme-automatic-desktop" label="Automatic" description="Switch themes based on screen size." checked={isAutomatic} onChange={setAutomatic}/>
                            <Checkbox id="theme-dark-mode-desktop" label="Dark Mode" description="Manually enable or disable dark mode." checked={theme === 'dark'} onChange={(checked) => setTheme(checked ? 'dark' : 'light')} disabled={isAutomatic} />
                        </div>
                    </div>
                    <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card">
                        <h3 className="text-xl font-semibold mb-4 text-primary-text">Account Actions</h3>
                        <div className="space-y-3">
                            <Button onClick={() => navigate('/leaves/dashboard')} variant="secondary" className="w-full justify-center" title="View your leave history and balances"><Crosshair className="mr-2 h-4 w-4" /> Leave Tracker</Button>
                            <Button onClick={handleLogoutClick} variant="danger" className="w-full justify-center" isLoading={isSaving}><LogOut className="mr-2 h-4 w-4" /> Log Out</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;