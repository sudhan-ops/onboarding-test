import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import type { LeaveBalance, LeaveRequest, LeaveType, LeaveRequestStatus, UploadedFile, CompOffLog } from '../../types';
import { Loader2, Plus, ArrowLeft, AlertTriangle, Briefcase, HeartPulse, Plane, CalendarClock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import Select from '../../components/ui/Select';
import { useForm, Controller, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { format, differenceInCalendarDays, isSameDay } from 'date-fns';
import DatePicker from '../../components/ui/DatePicker';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useSettingsStore } from '../../store/settingsStore';
import UploadDocument from '../../components/UploadDocument';

// --- Reusable Components ---

const LeaveBalanceCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-card p-4 rounded-xl flex items-center gap-4 border border-border">
        <div className="bg-accent-light p-3 rounded-full">
            <Icon className="h-6 w-6 text-accent-dark" />
        </div>
        <div>
            <p className="text-sm text-muted">{title}</p>
            <p className="text-2xl font-bold text-primary-text">{value}</p>
        </div>
    </div>
);

const LeaveStatusChip: React.FC<{ status: LeaveRequestStatus }> = ({ status }) => {
    const statusClasses: Record<LeaveRequestStatus, string> = {
        pending_manager_approval: 'leave-status-chip--pending_manager_approval',
        pending_hr_confirmation: 'leave-status-chip--pending_hr_confirmation',
        approved: 'leave-status-chip--approved',
        rejected: 'leave-status-chip--rejected'
    };
    const text = status.replace(/_/g, ' ');
    return <span className={`leave-status-chip ${statusClasses[status]}`}>{text}</span>;
};


// --- Leave Request Form ---
type LeaveRequestFormData = {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    dayOption?: 'full' | 'half';
    doctorCertificate?: UploadedFile | null;
};

const getLeaveValidationSchema = (threshold: number) => yup.object({
    leaveType: yup.string<LeaveType>().oneOf(['Earned', 'Sick', 'Floating', 'Comp Off']).required('Leave type is required'),
    startDate: yup.string().required('Start date is required'),
    endDate: yup.string().required('End date is required')
        .test('is-after-start', 'End date must be on or after start date', function(value) {
            const { startDate } = this.parent;
            if (!startDate || !value) return true;
            return new Date(value.replace(/-/g, '/')) >= new Date(startDate.replace(/-/g, '/'));
        }),
    reason: yup.string().required('A reason for the leave is required').min(10, 'Please provide a more detailed reason.'),
    dayOption: yup.string().oneOf(['full', 'half']).optional(),
    doctorCertificate: yup.mixed<UploadedFile | null>().when(['leaveType', 'startDate', 'endDate'], {
        is: (leaveType: string, startDate: string, endDate: string) => {
            if (leaveType !== 'Sick' || !startDate || !endDate) return false;
            const duration = differenceInCalendarDays(new Date(endDate.replace(/-/g, '/')), new Date(startDate.replace(/-/g, '/'))) + 1;
            return duration > threshold;
        },
        then: schema => schema.required(`A doctor's certificate is required for sick leave longer than ${threshold} days.`),
        otherwise: schema => schema.nullable().optional(),
    })
});

const LeaveRequestForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: { id: string, name: string };
    isMobile: boolean;
    setToast: (toast: { message: string, type: 'success' | 'error'} | null) => void;
}> = ({ isOpen, onClose, onSuccess, user, isMobile, setToast }) => {
    const { attendance: { office: { sickLeaveCertificateThreshold } } } = useSettingsStore(); // Assuming office rules for now, needs context
    const validationSchema = useMemo(() => getLeaveValidationSchema(sickLeaveCertificateThreshold), [sickLeaveCertificateThreshold]);

    const { register, control, handleSubmit, watch, formState: { errors }, reset } = useForm<LeaveRequestFormData>({
        resolver: yupResolver(validationSchema) as Resolver<LeaveRequestFormData>,
        defaultValues: { leaveType: 'Earned', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), dayOption: 'full' }
    });

    const watchStartDate = watch('startDate');
    const watchEndDate = watch('endDate');
    const watchLeaveType = watch('leaveType');

    const isSingleDay = useMemo(() => {
        if (!watchStartDate || !watchEndDate) return false;
        return isSameDay(new Date(watchStartDate.replace(/-/g, '/')), new Date(watchEndDate.replace(/-/g, '/')));
    }, [watchStartDate, watchEndDate]);
    
    const showHalfDayOption = isSingleDay && watchLeaveType === 'Earned';
    const showDoctorCertUpload = useMemo(() => {
        if (watchLeaveType !== 'Sick' || !watchStartDate || !watchEndDate) return false;
        const duration = differenceInCalendarDays(new Date(watchEndDate.replace(/-/g, '/')), new Date(watchEndDate.replace(/-/g, '/'))) + 1;
        return duration > sickLeaveCertificateThreshold;
    }, [watchLeaveType, watchStartDate, watchEndDate, sickLeaveCertificateThreshold]);


    const onSubmit: SubmitHandler<LeaveRequestFormData> = async (formData) => {
        try {
            await api.submitLeaveRequest({ ...formData, userId: user.id, userName: user.name });
            onSuccess();
        } catch(err) {
            setToast({ message: 'Failed to submit leave request.', type: 'error' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-40 bg-card ${isMobile ? 'flex flex-col' : 'flex items-center justify-center bg-black/50 p-4'}`}>
            <div className={`w-full ${isMobile ? 'flex flex-col h-full' : 'max-w-2xl bg-card rounded-xl shadow-lg'}`}>
                <header className={`p-4 flex-shrink-0 flex items-center gap-4 ${isMobile ? 'fo-mobile-header' : 'border-b'}`}>
                    <Button variant="icon" onClick={onClose} aria-label="Go back"><ArrowLeft className="h-6 w-6"/></Button>
                    <h1 className="text-lg font-semibold">{isMobile ? 'New Leave Request' : 'Submit a New Leave Request'}</h1>
                </header>
                <form id="leave-form" onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto p-4 space-y-4">
                    <Controller name="leaveType" control={control} render={({ field }) => (
                        <Select label="Leave Type" {...field} error={errors.leaveType?.message} className={isMobile ? 'pro-select pro-select-arrow' : ''}>
                            <option>Earned</option><option>Sick</option><option>Floating</option><option>Comp Off</option>
                        </Select>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <Controller name="startDate" control={control} render={({ field }) => (
                            <DatePicker label="Start Date" id="startDate" value={field.value} onChange={field.onChange} error={errors.startDate?.message} />
                        )}/>
                        <Controller name="endDate" control={control} render={({ field }) => (
                            <DatePicker label="End Date" id="endDate" value={field.value} onChange={field.onChange} error={errors.endDate?.message} />
                        )}/>
                    </div>
                    {showHalfDayOption && (
                        <Controller name="dayOption" control={control} render={({ field }) => (
                            <Select label="Day Option" {...field} className={isMobile ? 'pro-select pro-select-arrow' : ''}>
                                <option value="full">Full Day</option><option value="half">Half Day</option>
                            </Select>
                        )} />
                    )}
                     <div>
                        <label className="block text-sm font-medium text-muted">Reason</label>
                        <textarea {...register('reason')} rows={4} className={`mt-1 form-input ${errors.reason ? 'form-input--error' : ''}`}/>
                        {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
                    </div>
                    {showDoctorCertUpload && (
                        <Controller name="doctorCertificate" control={control} render={({ field, fieldState }) => (
                            <UploadDocument label={`Doctor's Certificate (Required)`} file={field.value} onFileChange={field.onChange} error={fieldState.error?.message} allowCapture/>
                        )}/>
                    )}
                </form>
                <footer className={`p-4 flex-shrink-0 flex items-center justify-end gap-2 ${isMobile ? '' : 'border-t'}`}>
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="leave-form">Submit Request</Button>
                </footer>
            </div>
        </div>
    );
};

// --- Main Dashboard ---
const LeaveDashboard: React.FC = () => {
    const { user } = useAuthStore();
    const [balance, setBalance] = useState<LeaveBalance | null>(null);
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [compOffLogs, setCompOffLogs] = useState<CompOffLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCompOffHistoryDisabled, setIsCompOffHistoryDisabled] = useState(false);
    const [filter, setFilter] = useState<LeaveRequestStatus | 'all'>('all');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const isMobile = useMediaQuery('(max-width: 767px)');
    const [isFormOpen, setIsFormOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setIsCompOffHistoryDisabled(false);
        try {
            const [balanceData, requestsData, compOffData] = await Promise.all([
                api.getLeaveBalancesForUser(user.id),
                api.getLeaveRequests({ 
                    userId: user.id,
                    status: filter === 'all' ? undefined : filter
                }),
                api.getCompOffLogs(user.id).catch(error => {
                    if (error && error.message && (error.message.includes('comp_off_logs') || error.message.includes("relation \"public.comp_off_logs\" does not exist"))) {
                        setIsCompOffHistoryDisabled(true);
                        return []; // Return empty array to not break Promise.all
                    }
                    throw error; // Re-throw other errors
                })
            ]);
            setBalance(balanceData);
            setRequests(requestsData);
            setCompOffLogs(compOffData);
        } catch (error: any) {
            let message = 'Failed to load leave data.';
            if (error && typeof error.message === 'string') {
                if (error.message.includes('relation "leave_requests" does not exist')) {
                    message = 'Database setup error: The "leave_requests" table is missing.';
                }
            }
            console.error("Failed to load leave data", error);
            if (!isCompOffHistoryDisabled) { // Avoid double-toast if comp-off is the only issue
                setToast({ message, type: 'error' });
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, filter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleFormSuccess = () => {
        setToast({ message: 'Leave request submitted successfully!', type: 'success' });
        setIsFormOpen(false);
        fetchData();
    };

    const formatTabName = (tab: string) => tab.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const filterTabs: Array<LeaveRequestStatus | 'all'> = ['all', 'pending_manager_approval', 'pending_hr_confirmation', 'approved', 'rejected'];
    
    const balanceCards = balance ? [
        { title: 'Earned Leave', value: `${balance.earnedTotal - balance.earnedUsed} / ${balance.earnedTotal}`, icon: Briefcase },
        { title: 'Sick Leave', value: `${balance.sickTotal - balance.sickUsed} / ${balance.sickTotal}`, icon: HeartPulse },
        { title: 'Floating Holiday', value: `${balance.floatingTotal - balance.floatingUsed} / ${balance.floatingTotal}`, icon: Plane },
        { title: 'Compensatory Off', value: `${balance.compOffTotal - balance.compOffUsed} / ${balance.compOffTotal}`, icon: CalendarClock },
    ] : [];

    return (
        <div className="p-4 space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            {user && <LeaveRequestForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSuccess={handleFormSuccess} user={user} isMobile={isMobile} setToast={setToast} />}
            
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-primary-text">My Leave Requests</h2>
                {!isMobile && (
                    <Button onClick={() => setIsFormOpen(true)}><Plus className="mr-2 h-4"/> New Request</Button>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {balanceCards.map(b => <LeaveBalanceCard key={b.title} {...b} />)}
            </div>

            {isMobile && (
                <div className="my-4">
                    <Button onClick={() => setIsFormOpen(true)} size="lg" className="w-full justify-center">
                        <Plus className="mr-2 h-5"/> New Request
                    </Button>
                </div>
            )}

            <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card">
                 <div className="mb-6">
                     <div className="w-full sm:w-auto md:border-b border-border">
                        <nav className="flex flex-col md:flex-row md:space-x-6 md:overflow-x-auto space-y-1 md:space-y-0" aria-label="Tabs">
                            {filterTabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setFilter(tab)}
                                    className={`whitespace-nowrap font-medium text-sm rounded-lg md:rounded-none w-full md:w-auto text-left md:text-center px-4 py-3 md:px-1 md:py-3 md:bg-transparent md:border-b-2
                                    ${filter === tab
                                        ? 'bg-accent-light text-accent-dark md:border-accent'
                                        : 'text-muted hover:bg-accent-light hover:text-accent-dark md:border-transparent md:hover:border-accent'
                                    }`}
                                >
                                    {formatTabName(tab)}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full responsive-table">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Dates</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Reason</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border md:bg-card md:divide-y-0">
                             {isLoading ? (
                                <tr><td colSpan={4} className="text-center py-10 text-muted">Loading...</td></tr>
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-10 text-muted">No requests found.</td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id}>
                                        <td data-label="Type" className="px-4 py-3 font-medium">{req.leaveType} {req.dayOption && `(${req.dayOption})`}</td>
                                        <td data-label="Dates" className="px-4 py-3 text-muted">{format(new Date(req.startDate.replace(/-/g, '/')), 'dd MMM')} - {format(new Date(req.endDate.replace(/-/g, '/')), 'dd MMM')}</td>
                                        <td data-label="Reason" className="px-4 py-3 text-muted max-w-xs truncate">{req.reason}</td>
                                        <td data-label="Status" className="px-4 py-3"><LeaveStatusChip status={req.status} /></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card">
                <h3 className="text-lg font-semibold mb-4 text-primary-text">Compensatory Off Tracker</h3>
                {isCompOffHistoryDisabled ? (
                    <div className="text-center py-10 text-muted bg-page rounded-lg">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                        <p className="font-semibold">Feature Unavailable</p>
                        <p className="text-sm">The Compensatory Off feature is disabled because the required 'comp_off_logs' table is missing in the database.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full responsive-table">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Date Earned</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Reason for Comp-Off</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Granted By</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border md:bg-card md:divide-y-0">
                                {isLoading ? (
                                    <tr><td colSpan={4} className="text-center py-10 text-muted">Loading...</td></tr>
                                ) : compOffLogs.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-10 text-muted">No comp-off history found.</td></tr>
                                ) : (
                                    compOffLogs.map(log => (
                                        <tr key={log.id}>
                                            <td data-label="Date Earned" className="px-4 py-3 font-medium">{format(new Date(log.dateEarned.replace(/-/g, '/')), 'dd MMM, yyyy')}</td>
                                            <td data-label="Reason" className="px-4 py-3 text-muted">{log.reason}</td>
                                            <td data-label="Granted By" className="px-4 py-3 text-muted">{log.grantedByName || '-'}</td>
                                            <td data-label="Status" className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${log.status === 'earned' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaveDashboard;