import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../services/api';
import type { OnboardingData, Organization } from '../../types';
import StatusChip from '../../components/ui/StatusChip';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Search, Eye, FileText, UserPlus } from 'lucide-react';
import PortalSyncStatusChip from '../../components/ui/PortalSyncStatusChip';
import Toast from '../../components/ui/Toast';
import Select from '../../components/ui/Select';

const SiteDashboard: React.FC = () => {
    const [submissions, setSubmissions] = useState<OnboardingData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(user?.organizationId);
    
    const canSelectOrg = user && user.role === 'admin';

    useEffect(() => {
        if (canSelectOrg) {
            api.getOrganizations().then(orgs => {
                setOrganizations(orgs);
                if (orgs.length > 0 && !selectedOrgId) {
                    setSelectedOrgId(orgs[0].id);
                }
            });
        }
    }, [canSelectOrg, selectedOrgId]);

    const fetchSubmissions = useCallback(async () => {
        if (!selectedOrgId) {
            if (user?.organizationId) setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await api.getVerificationSubmissions(
                statusFilter === 'all' ? undefined : statusFilter,
                selectedOrgId
            );
            setSubmissions(data);
        } catch (error) {
            console.error("Failed to fetch submissions", error);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, selectedOrgId, user?.organizationId]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    const filteredSubmissions = useMemo(() => {
        return submissions.filter(s =>
            (s.personal.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.personal.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.personal.employeeId.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [submissions, searchTerm]);
    
    const currentOrgName = organizations.find(o => o.id === selectedOrgId)?.shortName || user?.organizationName;
    const filterTabs = ['all', 'pending', 'verified', 'rejected'];

    return (
        <div className="p-4 md:bg-card md:p-6 md:rounded-xl md:shadow-card">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-primary-text">Site Dashboard</h2>
                     <p className="text-muted">Viewing submissions for site: <span className="font-semibold text-accent-dark">{currentOrgName || 'N/A'}</span></p>
                </div>
                <div className="flex items-center gap-4">
                    {canSelectOrg && (
                        <div className="w-full sm:w-56">
                            <Select label="" id="org-selector" value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)}>
                                <option value="">Select a Site</option>
                                {organizations.map(o => <option key={o.id} value={o.id}>{o.shortName}</option>)}
                            </Select>
                        </div>
                    )}
                    <Button onClick={() => navigate('/onboarding/select-organization')}><UserPlus className="mr-2 h-4 w-4" />New Enrollment</Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center my-6 gap-4">
                <div className="w-full sm:w-auto border-b border-border">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {filterTabs.map(tab => (
                             <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
                                className={`${
                                statusFilter === tab
                                    ? 'border-accent text-accent-dark'
                                    : 'border-transparent text-muted hover:text-primary-text hover:border-gray-300'
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
                        placeholder="Search by name or ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full responsive-table">
                    <thead className="bg-page">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Employee</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Portal Sync</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={4} className="text-center py-10 text-muted">Loading submissions...</td></tr>
                        ) : !selectedOrgId ? (
                            <tr><td colSpan={4} className="text-center py-10 text-muted">Please select a site to view submissions.</td></tr>
                        ) : filteredSubmissions.length === 0 ? (
                             <tr><td colSpan={4} className="text-center py-10 text-muted">No submissions found for this site.</td></tr>
                        ) : (
                            filteredSubmissions.map((s) => (
                                <tr key={s.id}>
                                    <td data-label="Employee" className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-primary-text">{s.personal.firstName} {s.personal.lastName}</div>
                                        <div className="text-sm text-muted">{s.personal.employeeId}</div>
                                    </td>
                                    <td data-label="Status" className="px-6 py-4 whitespace-nowrap">
                                        <StatusChip status={s.status} />
                                    </td>
                                     <td data-label="Portal Sync" className="px-6 py-4 whitespace-nowrap">
                                        <PortalSyncStatusChip status={s.portalSyncStatus} />
                                    </td>
                                    <td data-label="Actions" className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2 md:justify-start justify-end">
                                            <Button variant="icon" size="sm" onClick={() => navigate(`/onboarding/add/personal?id=${s.id}`)} title="View/Edit Details"><Eye className="h-4 w-4" /></Button>
                                            <Button variant="icon" size="sm" onClick={() => navigate(`/onboarding/pdf/${s.id}`)} title="Download Forms"><FileText className="h-4 w-4" /></Button>
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
export default SiteDashboard;
