



import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Trash2, Plus, Settings, Calendar, Clock, LifeBuoy, Bell, Save } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker';
import Toast from '../../components/ui/Toast';
import Checkbox from '../../components/ui/Checkbox';
import type { StaffAttendanceRules, AttendanceSettings } from '../../types';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { api } from '../../services/api';

const AttendanceSettings: React.FC = () => {
    const { attendance, officeHolidays, fieldHolidays, addHoliday, removeHoliday, updateAttendanceSettings: updateStore } = useSettingsStore();
    
    const [localAttendance, setLocalAttendance] = useState<AttendanceSettings>(attendance);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [activeTab, setActiveTab] = useState<'office' | 'field'>('office');
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setLocalAttendance(attendance);
    }, [attendance]);
    
    useEffect(() => {
        setIsDirty(JSON.stringify(localAttendance) !== JSON.stringify(attendance));
    }, [localAttendance, attendance]);
    
    const currentRules = localAttendance[activeTab];
    const currentHolidays = activeTab === 'office' ? officeHolidays : fieldHolidays;

    const handleAddHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newHolidayName && newHolidayDate) {
            if (currentHolidays.some(h => h.date === newHolidayDate)) {
                setToast({ message: 'A holiday for this date already exists.', type: 'error' });
                return;
            }
            try {
                await addHoliday(activeTab, { name: newHolidayName, date: newHolidayDate });
                setNewHolidayName('');
                setNewHolidayDate('');
                setToast({ message: 'Holiday added successfully.', type: 'success' });
            } catch (error) {
                setToast({ message: 'Failed to add holiday.', type: 'error' });
            }
        } else {
            setToast({ message: 'Please provide both a name and a date.', type: 'error' });
        }
    };
    
    const handleSettingChange = (setting: keyof StaffAttendanceRules, value: string | number | boolean) => {
        setLocalAttendance(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                [setting]: value
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.saveAttendanceSettings(localAttendance);
            updateStore(localAttendance);
            setToast({ message: 'Attendance rules saved successfully!', type: 'success' });
        } catch (error) {
            setToast({ message: 'Failed to save attendance rules.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 md:bg-card md:p-6 md:rounded-xl md:shadow-card max-w-4xl mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            
            <AdminPageHeader title="Attendance & Leave Rules">
                <Button onClick={handleSave} isLoading={isSaving} disabled={!isDirty}>
                    <Save className="mr-2 h-4 w-4" /> Save Rules
                </Button>
            </AdminPageHeader>
            <p className="text-muted -mt-4 mb-6">Set company-wide rules for attendance and leave calculation.</p>
            

            <div className="mb-6 border-b border-border">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('office')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'office' ? 'border-accent text-accent-dark' : 'border-transparent text-muted hover:text-accent-dark hover:border-accent'}`}>
                        Office Staff
                    </button>
                    <button onClick={() => setActiveTab('field')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'field' ? 'border-accent text-accent-dark' : 'border-transparent text-muted hover:text-accent-dark hover:border-accent'}`}>
                        Field Staff
                    </button>
                </nav>
            </div>
            
            {activeTab === 'office' && <p className="text-sm text-muted -mt-4 mb-4">These rules apply to Admin, HR, and Finance roles.</p>}
            {activeTab === 'field' && <p className="text-sm text-muted -mt-4 mb-4">These rules apply to all other roles (e.g., Field Officers, Managers).</p>}


            <div className="space-y-6">
                <section>
                    <h3 className="text-lg font-semibold text-primary-text mb-4 flex items-center"><Clock className="mr-2 h-5 w-5 text-muted"/>Work Hours</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                         <Input
                            label="Minimum Hours for Full Day"
                            id="minHoursFull"
                            type="number"
                            value={currentRules.minimumHoursFullDay}
                            onChange={(e) => handleSettingChange('minimumHoursFullDay', parseFloat(e.target.value) || 0)}
                        />
                         <Input
                            label="Minimum Hours for Half Day"
                            id="minHoursHalf"
                            type="number"
                            value={currentRules.minimumHoursHalfDay}
                            onChange={(e) => handleSettingChange('minimumHoursHalfDay', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                </section>

                <section className="pt-6 border-t border-border">
                    <h3 className="text-lg font-semibold text-primary-text mb-4 flex items-center"><LifeBuoy className="mr-2 h-5 w-5 text-muted"/>Leave Allocation</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                         <Input
                            label="Annual Earned Leaves"
                            id="annualEarnedLeaves"
                            type="number"
                            value={currentRules.annualEarnedLeaves}
                            onChange={(e) => handleSettingChange('annualEarnedLeaves', parseInt(e.target.value, 10) || 0)}
                        />
                         <Input
                            label="Annual Sick Leaves"
                            id="annualSickLeaves"
                            type="number"
                            value={currentRules.annualSickLeaves}
                            onChange={(e) => handleSettingChange('annualSickLeaves', parseInt(e.target.value, 10) || 0)}
                        />
                        <Input
                            label="Monthly Floating Holidays"
                            id="monthlyFloatingLeaves"
                            type="number"
                            value={currentRules.monthlyFloatingLeaves}
                            onChange={(e) => handleSettingChange('monthlyFloatingLeaves', parseInt(e.target.value, 10) || 0)}
                        />
                         <Input
                            label="Annual Compensatory Off"
                            id="annualCompOffLeaves"
                            type="number"
                            value={currentRules.annualCompOffLeaves}
                            onChange={(e) => handleSettingChange('annualCompOffLeaves', parseInt(e.target.value, 10) || 0)}
                        />
                        <Input
                            label="Sick Leave Cert. After (Days)"
                            id="sickLeaveCertThreshold"
                            type="number"
                            value={currentRules.sickLeaveCertificateThreshold}
                            onChange={(e) => handleSettingChange('sickLeaveCertificateThreshold', parseInt(e.target.value, 10) || 0)}
                            title="Require a doctor's certificate if total sick leave taken exceeds this number of days."
                        />
                    </div>
                </section>

                 <section className="pt-6 border-t border-border">
                    <h3 className="text-lg font-semibold text-primary-text mb-4 flex items-center"><Bell className="mr-2 h-5 w-5 text-muted"/>Notifications</h3>
                    <Checkbox
                        id="attendance-notifications"
                        label="Enable Check-in/Check-out Notifications"
                        description="Send a notification to Site Managers, Ops Managers, and HR when a Field Officer checks in or out."
                        checked={currentRules.enableAttendanceNotifications}
                        onChange={(checked) => handleSettingChange('enableAttendanceNotifications', checked)}
                    />
                </section>
                
                <section className="pt-6 border-t border-border">
                     <h3 className="text-lg font-semibold text-primary-text mb-4 flex items-center"><Calendar className="mr-2 h-5 w-5 text-muted"/>Holiday List</h3>
                    <div className="p-4 bg-page rounded-lg">
                        <h4 className="font-semibold mb-2">Add New Holiday</h4>
                        <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                            <Input label="Holiday Name" id="holidayName" value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} />
                            <DatePicker label="Date" id="holidayDate" value={newHolidayDate} onChange={setNewHolidayDate} />
                            <Button type="submit" className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Add</Button>
                        </form>
                    </div>
                    <div className="mt-4 space-y-2">
                         {currentHolidays.length > 0 ? (
                            currentHolidays.map(holiday => (
                                <div key={holiday.id} className="flex justify-between items-center p-3 border border-border rounded-lg">
                                    <div>
                                        <p className="font-medium">{holiday.name}</p>
                                        <p className="text-sm text-muted">{new Date(holiday.date.replace(/-/g, '/')).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                    <Button variant="icon" size="sm" onClick={() => removeHoliday(activeTab, holiday.id)} aria-label={`Remove ${holiday.name}`}>
                                        <Trash2 className="h-4 w-4 text-red-500"/>
                                    </Button>
                                </div>
                            ))
                         ) : (
                            <p className="text-center text-muted py-4">No holidays added yet for {activeTab} staff.</p>
                         )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AttendanceSettings;