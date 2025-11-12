import React, { useState } from 'react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Server, Download, ShieldCheck, Settings, Mail, Image, Phone, Building } from 'lucide-react';
import { api } from '../../services/api';
import Toast from '../../components/ui/Toast';
import { useSettingsStore } from '../../store/settingsStore';
import Checkbox from '../../components/ui/Checkbox';
import PageInterfaceSettingsModal from '../../components/developer/PageInterfaceSettingsModal';

const SettingsCard: React.FC<{ title: string; icon: React.ElementType, children: React.ReactNode, className?: string }> = ({ title, icon: Icon, children, className }) => (
    <div className={`md:bg-card md:p-6 md:rounded-xl md:shadow-card ${className || ''}`}>
        <div className="flex items-center mb-6">
            <div className="p-3 rounded-full bg-accent-light mr-4">
                <Icon className="h-6 w-6 text-accent-dark" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-primary-text">{title}</h3>
            </div>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);


export const ApiSettings: React.FC = () => {
    const store = useSettingsStore();
    
    const [isExporting, setIsExporting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isInterfaceModalOpen, setIsInterfaceModalOpen] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        setToast(null);
        try {
            const data = await api.exportAllData();
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `paradigm_backup_${new Date().toISOString()}.json`;
            link.click();
            setToast({ message: 'Data exported successfully!', type: 'success'});
        } catch (error) {
            setToast({ message: 'Failed to export data.', type: 'error'});
        } finally {
            setIsExporting(false);
        }
    };

  return (
    <div className="space-y-8 p-4 md:p-0">
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
        <PageInterfaceSettingsModal isOpen={isInterfaceModalOpen} onClose={() => setIsInterfaceModalOpen(false)} />
        
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-primary-text">System Settings</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* --- COLUMN 1: INTERFACE & INTEGRATIONS --- */}
            <div className="space-y-8">
                 <SettingsCard title="Page Interface" icon={Image}>
                    <p className="text-sm text-muted -mt-2">Customize the application's branding, login screen, and user interaction settings.</p>
                    <div className="pt-4">
                        <Button type="button" onClick={() => setIsInterfaceModalOpen(true)}>Open Interface Settings</Button>
                    </div>
                </SettingsCard>
                
                 <SettingsCard title="Verification APIs" icon={ShieldCheck}>
                    <p className="text-sm text-muted -mt-2">Configure third-party services for employee verification.</p>
                    <div className="space-y-6 pt-4">
                        {/* Gemini API */}
                        <div className="p-4 border border-border rounded-lg api-setting-item-bg">
                            <Checkbox 
                                id="gemini-enabled" 
                                label="Enable Gemini API OCR Verification" 
                                description="Use Google's Gemini API for document data extraction. This is a powerful fallback or primary OCR. API key must be configured on the backend."
                                checked={store.geminiApi.enabled} 
                                onChange={val => store.updateGeminiApiSettings({ enabled: val })} 
                            />
                        </div>
                        {/* Perfios API */}
                        <div className="p-4 border border-border rounded-lg api-setting-item-bg">
                            <Checkbox 
                                id="perfios-enabled" 
                                label="Enable Perfios API Verification" 
                                description="Use Perfios for Bank, Aadhaar, and UAN verification."
                                checked={store.perfiosApi.enabled} 
                                onChange={val => store.updatePerfiosApiSettings({ enabled: val })} 
                            />
                            <div className={`mt-4 space-y-4 transition-opacity ${store.perfiosApi.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <Input label="Perfios Client ID" value={store.perfiosApi.clientId} onChange={e => store.updatePerfiosApiSettings({ clientId: e.target.value })} />
                                <Input label="Perfios Client Secret" type="password" value={store.perfiosApi.clientSecret} onChange={e => store.updatePerfiosApiSettings({ clientSecret: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </SettingsCard>

                 <SettingsCard title="Authentication Settings" icon={Phone}>
                    <p className="text-sm text-muted -mt-2">Manage how users sign in to the application.</p>
                    <div className="space-y-6 pt-4">
                        <Checkbox
                            id="otp-enabled"
                            label="Enable OTP Phone Sign-In"
                            description="Allow users to sign in using a one-time password sent via SMS."
                            checked={store.otp.enabled}
                            onChange={val => store.updateOtpSettings({ enabled: val })}
                        />
                    </div>
                </SettingsCard>
            </div>

            {/* --- COLUMN 2: SYSTEM & DATA --- */}
            <div className="space-y-8">
                 <SettingsCard title="Client & Site Management" icon={Building}>
                    <p className="text-sm text-muted -mt-2">Control workflows for site creation and management.</p>
                     <div className="space-y-6 pt-4">
                         <Checkbox 
                            id="enable-provisional-sites" 
                            label="Enable Provisional Site Creation" 
                            description="Allows HR/Admins to create a site with just a name, providing a 90-day grace period to complete the full configuration for easier onboarding."
                            checked={store.siteManagement.enableProvisionalSites} 
                            onChange={val => store.updateSiteManagementSettings({ enableProvisionalSites: val })} 
                        />
                     </div>
                </SettingsCard>
                <SettingsCard title="System & Data" icon={Settings}>
                    <p className="text-sm text-muted -mt-2">Manage core system settings and data operations.</p>
                     <div className="space-y-6 pt-4">
                         <Checkbox id="pincode-verification" label="Enable Pincode API Verification" description="Auto-fill City/State from pincode during onboarding." checked={store.address.enablePincodeVerification} onChange={val => store.updateAddressSettings({ enablePincodeVerification: val })} />
                         
                         <div className="pt-4 border-t">
                            <h4 className="font-semibold text-primary-text mb-2">Backup & Export</h4>
                            <p className="text-sm text-muted mb-4">Download all data from the active data source (Mock Data).</p>
                            <Button variant="outline" onClick={handleExport} isLoading={isExporting}>
                                <Download className="mr-2 h-4 w-4" /> Export All Data
                            </Button>
                        </div>
                     </div>
                </SettingsCard>

                <SettingsCard title="Notification Settings" icon={Mail}>
                    <p className="text-sm text-muted -mt-2">Configure how the system sends notifications.</p>
                    <div className="space-y-6 pt-4">
                        <Checkbox
                            id="email-notif-enabled"
                            label="Enable Email Notifications"
                            description="Send emails for important events like task assignments. SMTP must be configured on the backend."
                            checked={store.notifications.email.enabled}
                            onChange={val => store.updateNotificationSettings({ email: { enabled: val } })}
                        />
                    </div>
                </SettingsCard>
            </div>
        </div>
    </div>
  );
};