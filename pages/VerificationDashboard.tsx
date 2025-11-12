import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/services/api';
import type { OnboardingData } from '@/types';
import StatusChip from '@/components/ui/StatusChip';
import Button from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, FileText, Send, RefreshCw, AlertTriangle, Loader2, CheckSquare, XSquare, Square } from 'lucide-react';
import Toast from '@/components/ui/Toast';

const VerificationChecks: React.FC<{ submission: OnboardingData; isSyncing: boolean }> = ({ submission, isSyncing }) => {
    if (submission.status !== 'verified' || !submission.portalSyncStatus) {
        return <span className="text-sm font-medium text-muted">-</span>;
    }

    if (isSyncing) {
        return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Syncing...</div>;
    }
    
    const isUanApplicable = submission.uan?.hasPreviousPf;
    
    const checks = [
        { label: 'Aadhaar', verified: submission.personal?.verifiedStatus?.idProofNumber },
        { label: 'Bank', verified: submission.bank?.verifiedStatus?.accountNumber },
        ...(isUanApplicable ? [{ label: 'UAN', verified: submission.uan?.verifiedStatus?.uanNumber }] : [])
    ];
    
    const hasSyncedOrFailed = submission.portalSyncStatus === 'synced' || submission.portalSyncStatus === 'failed';

    const CheckItem: React.FC<{label: string, status: boolean | null | undefined}> = ({label, status}) => {
        const isChecked = hasSyncedOrFailed && status === true;
        const isFailed = hasSyncedOrFailed && status === false;

        const Icon = isChecked ? CheckSquare : (isFailed ? XSquare : Square);
        const color = isChecked ? 'text-green-600' : (isFailed ? 'text-red-600' : 'text-muted');
        const title = isChecked ? 'Verified' : (isFailed ? 'Failed' : 'Pending Verification');
        
        return (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`} title={title}>
                <Icon className="h-4 w-4" />
                <span>{label}</span>
            </div>
        );
    };

    return (
        <div className="flex flex-row gap-3 items-center">
            {checks.map(check => (
                 <CheckItem key={check.label} label={check.label} status={check.verified} />
            ))}
        </div>
    );
};


const VerificationDashboard: React.FC = () => {
    const [submissions, setSubmissions] = useState<OnboardingData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const navigate = useNavigate();

    const fetchSubmissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getVerificationSubmissions(statusFilter === 'all' ? undefined : statusFilter);
            setSubmissions(data);
        } catch (error) {
            console.error("Failed to fetch submissions", error);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    const filteredSubmissions = useMemo(() => {
        return submissions.filter(s =>
            (s.personal.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.personal.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.personal.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [submissions, searchTerm]);
    
    const handleAction = async (action: 'approve' | 'reject', id: string) => {
        const originalSubmissions = [...submissions];
        
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: action === 'approve' ? 'verified' : 'rejected', portalSyncStatus: action === 'approve' ? 'pending_sync' : undefined } : s));

        try {
            if (action === 'approve') {
                await api.verifySubmission(id);
            } else {
                await api.requestChanges(id, 'Changes requested by admin.');
            }
        } catch (error) {
            console.error(`Failed to ${action} submission`, error);
            setSubmissions(originalSubmissions);
        }
    };

    const handleSync = async (id: string) => {
        setSyncingId(id);
        try {
            const updatedSubmission = await api.syncPortals(id);
            setSubmissions(prev => prev.map(s => s.id === id ? updatedSubmission : s));
            if (updatedSubmission.portalSyncStatus === 'synced') {
                 setToast({ message: 'Portals synced successfully!', type: 'success' });
            } else {
                 setToast({ message: 'Portal sync failed. Check details.', type: 'error' });
            }
        } catch (error) {
             setToast({ message: 'An error occurred during sync.', type: 'error' });
        } finally {
            setSyncingId(null);
        }
    };

    const filterTabs = ['all', 'pending', 'verified', 'rejected'];
    const colSpan = statusFilter === 'verified' ? 4 : 5;

    return (
        <div className="p-4 md:bg-card md:p-6 md:rounded-xl md:shadow-card">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            <h2 className="text-2xl font-semibold text-primary-text mb-6">Onboarding Forms</h2>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full sm:w-auto border-b border-border">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {filterTabs.map(tab => (
                             <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
                                className={`${
                                statusFilter === tab
                                    ? 'border-accent text-accent-dark'
                                    : 'border-transparent text-muted hover:text-accent-dark hover:border-accent'
                                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm capitalize`}
                             >
                                {tab}
                             </button>
                        ))}
                    </nav>
                </div>
                <div className="relative w-full sm:w-auto sm:max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name, ID, site..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="form-input block w-full pl-10 pr-3 py-2 border-border rounded-lg leading-5 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border responsive-table">
                    <thead className="bg-page">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Employee</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Site</th>
                            {statusFilter !== 'verified' && (
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                            )}
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Portal Verification</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card md:divide-y-0">
                        {isLoading ? (
                            <tr><td colSpan={colSpan} className="text-center py-10 text-muted">Loading submissions...</td></tr>
                        ) : filteredSubmissions.length === 0 ? (
                             <tr><td colSpan={colSpan} className="text-center py-10 text-muted">No submissions found.</td></tr>
                        ) : (
                            filteredSubmissions.map((s) => (
                                <tr key={s.id} className={s.requiresManualVerification ? 'bg-orange-50' : ''}>
                                    <td data-label="Employee" className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {s.requiresManualVerification && (
                                                <span title="Manual verification required due to data mismatch.">
                                                    <AlertTriangle className="h-4 w-4 text-orange-500 mr-2 flex-shrink-0" />
                                                </span>
                                            )}
                                            <div>
                                                <div className="text-sm font-medium text-primary-text">{s.personal.firstName} {s.personal.lastName}</div>
                                                <div className="text-sm text-muted">{s.personal.employeeId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Site" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-text">{s.organizationName}</td>
                                    {statusFilter !== 'verified' && (
                                        <td data-label="Status" className="px-6 py-4 whitespace-nowrap">
                                            <StatusChip status={s.status} />
                                        </td>
                                    )}
                                    <td data-label="Portal Verification" className="px-6 py-4 whitespace-nowrap">
                                        <VerificationChecks submission={s} isSyncing={syncingId === s.id} />
                                    </td>
                                    <td data-label="Actions" className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <Button variant="icon" size="sm" onClick={() => navigate(`/onboarding/add/personal?id=${s.id}`)} title="View Details" aria-label={`View details for ${s.personal.firstName}`}><Eye className="h-4 w-4" /></Button>
                                            <Button variant="icon" size="sm" onClick={() => navigate(`/onboarding/pdf/${s.id}`)} title="Download Forms" aria-label={`Download forms for ${s.personal.firstName}`}><FileText className="h-4 w-4" /></Button>
                                            {s.status === 'pending' && (
                                                <>
                                                 <Button variant="icon" size="sm" onClick={() => handleAction('approve', s.id!)} title="Verify" aria-label={`Verify submission for ${s.personal.firstName}`}><CheckSquare className="h-4 w-4 text-green-600"/></Button>
                                                 <Button variant="icon" size="sm" onClick={() => handleAction('reject', s.id!)} title="Request Changes" aria-label={`Request changes for ${s.personal.firstName}`}><XSquare className="h-4 w-4 text-red-600"/></Button>
                                                </>
                                            )}
                                            {s.status === 'verified' && (s.portalSyncStatus === 'pending_sync' || s.portalSyncStatus === 'failed') && (
                                                 <Button variant="outline" size="sm" onClick={() => handleSync(s.id!)} isLoading={syncingId === s.id} title="Push data to government portals">
                                                    {syncingId !== s.id && <Send className="h-4 w-4 mr-1"/>}
                                                    Sync Portals
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VerificationDashboard;