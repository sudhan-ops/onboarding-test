import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api';
import type { Organization, SiteConfiguration, Entity, ManpowerDetail, SiteStaffDesignation } from '../../types';
import Button from '../../components/ui/Button';
import { Plus, Edit, Trash2, Eye, Loader2, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import AddSiteFromClientForm from '../../components/admin/AddSiteFromClientForm';
import Modal from '../../components/ui/Modal';
import Toast from '../../components/ui/Toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
// FIX: Changed to a named import as SiteConfigurationForm is not a default export.
import { SiteConfigurationForm } from '../../components/hr/SiteConfigurationForm';
import ManpowerDetailsModal from '../../components/admin/ManpowerDetailsModal';
import TableSkeleton from '../../components/skeletons/TableSkeleton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useSettingsStore } from '../../store/settingsStore';
import { differenceInDays } from 'date-fns';
import Input from '../../components/ui/Input';

const siteCsvColumns = ['id', 'shortName', 'fullName', 'address', 'manpowerApprovedCount'];

const toCSV = (data: Record<string, any>[], columns: string[]): string => {
    const header = columns.join(',');
    const rows = data.map(row => 
        columns.map(col => {
            const val = row[col] === null || row[col] === undefined ? '' : String(row[col]);
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(',')
    );
    return [header, ...rows].join('\n');
};

const fromCSV = (csvText: string): Record<string, string>[] => {
    const lines = csvText.trim().replace(/\r/g, '').split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const row: Record<string, string> = {};
        // Regex for CSV parsing, handles quoted fields containing commas.
        const values = lines[i].match(/(?<=,|^)(?:"(?:[^"]|"")*"|[^,]*)/g) || [];
        
        headers.forEach((header, index) => {
            let value = (values[index] || '').trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1).replace(/""/g, '"');
            }
            row[header] = value;
        });
        rows.push(row);
    }
    return rows;
};

const QuickAddSiteModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (name: string) => void; }> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSave = () => {
        if (!name.trim()) {
            setError('Site name cannot be empty.');
            return;
        }
        onSave(name);
        setName('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleSave}
            title="Quick Add Provisional Site"
            confirmButtonText="Add Site"
            confirmButtonVariant="primary"
        >
            <p className="mb-4 text-sm">This will create a new site with a 90-day grace period to complete the full configuration.</p>
            <Input 
                label="New Site Name"
                id="quick-add-site-name"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                error={error}
                autoFocus
            />
        </Modal>
    );
};


const SiteManagement: React.FC = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [siteConfigs, setSiteConfigs] = useState<SiteConfiguration[]>([]);
    const [allClients, setAllClients] = useState<(Entity & { companyName: string })[]>([]);
    const [siteStaffDesignations, setSiteStaffDesignations] = useState<SiteStaffDesignation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [isSiteConfigFormOpen, setIsSiteConfigFormOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    
    const [editingOrgForConfig, setEditingOrgForConfig] = useState<Organization | null>(null);
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [manpowerDetails, setManpowerDetails] = useState<ManpowerDetail[]>([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    const importRef = useRef<HTMLInputElement>(null);
    const isMobile = useMediaQuery('(max-width: 767px)');
    const { siteManagement } = useSettingsStore();


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [orgsResult, structureResult, sitesResult, designationsResult] = await Promise.all([
                api.getOrganizations(),
                api.getOrganizationStructure(),
                api.getSiteConfigurations(),
                api.getSiteStaffDesignations(),
            ]);
            setOrganizations(orgsResult);
            setSiteConfigs(sitesResult);
            setSiteStaffDesignations(designationsResult);
            const clients = structureResult.flatMap(group => 
                group.companies.flatMap(company => 
                    company.entities.map(entity => ({...entity, companyName: company.name}))
                )
            );
            setAllClients(clients);
        } catch (error) {
            setToast({ message: 'Failed to fetch data.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEdit = (org: Organization) => {
        setEditingOrgForConfig(org);
        setIsSiteConfigFormOpen(true);
    };

    const handleDelete = (org: Organization) => {
        setCurrentOrg(org);
        setIsDeleteModalOpen(true);
    };

    const handleQuickAddSite = async (name: string) => {
        const newSite: Organization = {
            id: `SITE-${name.toUpperCase().replace(/\s/g, '').substring(0, 4)}-${Date.now() % 1000}`,
            shortName: name,
            fullName: name,
            address: 'To be configured',
            provisionalCreationDate: new Date().toISOString(),
        };
        try {
            await api.createOrganization(newSite);
            setToast({ message: `Provisional site '${name}' created.`, type: 'success' });
            fetchData();
        } catch (e) {
            setToast({ message: 'Failed to create site.', type: 'error' });
        }
    };
    
    const handleAddSite = (client: Entity, manpowerCount: number) => {
        if (organizations.some(org => org.id === client.organizationId)) {
            setToast({ message: 'A site for this client already exists.', type: 'error' });
            return;
        }
        
        const newSite: Organization = {
            id: client.organizationId || `site_${Date.now()}`,
            shortName: client.name,
            fullName: client.name,
            address: client.location || client.registeredAddress || '',
            manpowerApprovedCount: manpowerCount,
        };
    
        setOrganizations(prev => [newSite, ...prev].sort((a, b) => a.shortName.localeCompare(b.shortName)));
        setIsAddSiteModalOpen(false);
        setToast({ message: 'Site added successfully. You can now configure it.', type: 'success' });
    };
    
    const handleSaveSiteConfig = (orgId: string, configData: SiteConfiguration) => {
        setSiteConfigs(prev => {
            const newConfigs = [...prev];
            const index = newConfigs.findIndex(c => c.organizationId === orgId);
            if (index > -1) newConfigs[index] = configData;
            else newConfigs.push(configData);
            return newConfigs;
        });
        setToast({ message: 'Site configuration saved.', type: 'success' });
        setIsSiteConfigFormOpen(false);
    };

    const handleConfirmDelete = async () => {
        if (currentOrg) {
            setOrganizations(prev => prev.filter(o => o.id !== currentOrg.id));
            setSiteConfigs(prev => prev.filter(sc => sc.organizationId !== currentOrg.id));
            setToast({ message: 'Site deleted.', type: 'success' });
            setIsDeleteModalOpen(false);
        }
    };
    
    const handleViewDetails = async (org: Organization) => {
        setCurrentOrg(org);
        setIsDetailsLoading(true);
        setIsDetailsModalOpen(true);
        try {
            const details = await api.getManpowerDetails(org.id);
            setManpowerDetails(details);
        } catch (e) {
            setToast({ message: 'Could not load manpower details.', type: 'error' });
        } finally {
            setIsDetailsLoading(false);
        }
    };

    const handleSaveManpowerDetails = async (details: ManpowerDetail[]) => {
        if (!currentOrg) return;
        try {
            await api.updateManpowerDetails(currentOrg.id, details);
            
            const newTotal = details.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
            setOrganizations(prevOrgs => 
                prevOrgs.map(org => 
                    org.id === currentOrg.id ? { ...org, manpowerApprovedCount: newTotal } : org
                )
            );

            setIsDetailsModalOpen(false);
            setToast({ message: 'Manpower details updated successfully.', type: 'success' });
        } catch (error) {
            setToast({ message: 'Failed to save manpower details.', type: 'error' });
        }
    };

    const handleExport = () => {
        const csvData = toCSV(organizations, siteCsvColumns);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'sites_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setToast({ message: 'Sites exported successfully.', type: 'success' });
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                if (!text) throw new Error("File is empty or could not be read.");

                const parsedData = fromCSV(text);
                if (parsedData.length === 0) throw new Error("No data rows found in the CSV file.");

                const fileHeaders = Object.keys(parsedData[0]);
                const hasAllHeaders = siteCsvColumns.every(h => fileHeaders.includes(h));
                if (!hasAllHeaders) {
                    throw new Error(`CSV is missing headers. Required: ${siteCsvColumns.join(', ')}`);
                }

                const newOrgs: Organization[] = parsedData.map(row => ({
                    id: row.id,
                    shortName: row.shortName,
                    fullName: row.fullName,
                    address: row.address,
                    manpowerApprovedCount: parseFloat(row.manpowerApprovedCount) || 0,
                }));

                const { count } = await api.bulkUploadOrganizations(newOrgs);
                setToast({ message: `${count} sites imported/updated successfully.`, type: 'success' });
                fetchData();

            } catch (error: any) {
                setToast({ message: error.message || 'Failed to import CSV.', type: 'error' });
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-4 md:p-8">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            
            <input type="file" ref={importRef} className="hidden" accept=".csv" onChange={handleImport} />

            <AddSiteFromClientForm 
                isOpen={isAddSiteModalOpen}
                onClose={() => setIsAddSiteModalOpen(false)}
                onSave={handleAddSite}
            />
            <QuickAddSiteModal 
                isOpen={isQuickAddOpen}
                onClose={() => setIsQuickAddOpen(false)}
                onSave={handleQuickAddSite}
            />
            
            {isSiteConfigFormOpen && editingOrgForConfig && (
                <SiteConfigurationForm 
                    isOpen={isSiteConfigFormOpen}
                    onClose={() => setIsSiteConfigFormOpen(false)}
                    onSave={handleSaveSiteConfig}
                    organization={editingOrgForConfig}
                    allClients={allClients}
                    initialData={siteConfigs.find(c => c.organizationId === editingOrgForConfig.id)}
                />
            )}

            {currentOrg && (
                <ManpowerDetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    siteName={currentOrg.shortName}
                    details={manpowerDetails}
                    isLoading={isDetailsLoading}
                    onSave={handleSaveManpowerDetails}
                    designations={siteStaffDesignations}
                />
            )}

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirm Deletion"
            >
                Are you sure you want to delete the site "{currentOrg?.shortName}"? This action cannot be undone.
            </Modal>

            <div className="bg-card p-4 rounded-2xl mb-4">
                <AdminPageHeader title="Site Management">
                     <Button variant="outline" onClick={() => importRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Import Sites</Button>
                     <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export Sites</Button>
                     {siteManagement.enableProvisionalSites ? (
                        <Button onClick={() => setIsQuickAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Quick Add Site</Button>
                     ) : (
                        <Button onClick={() => setIsAddSiteModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Site</Button>
                     )}
                </AdminPageHeader>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full responsive-table">
                    <thead className="bg-page">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Short Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Site ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Manpower Count</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border md:bg-card md:divide-y-0">
                        {isLoading ? (
                            isMobile
                                ? <tr><td colSpan={5}><TableSkeleton rows={3} cols={5} isMobile /></td></tr>
                                : <TableSkeleton rows={5} cols={5} />
                        ) : organizations.map((org) => {
                            const config = siteConfigs.find(c => c.organizationId === org.id);
                            
                            let statusElement;
                            if (org.provisionalCreationDate) {
                                const creationDate = new Date(org.provisionalCreationDate);
                                const daysLeft = 90 - differenceInDays(new Date(), creationDate);
                                if (daysLeft < 0) {
                                    statusElement = <span className="flex items-center text-red-600 text-xs font-semibold"><AlertCircle className="h-4 w-4 mr-1"/> Expired ({Math.abs(daysLeft)} days ago)</span>;
                                } else {
                                    statusElement = <span className="flex items-center text-yellow-600 text-xs font-semibold"><AlertCircle className="h-4 w-4 mr-1"/> Provisional ({daysLeft} days left)</span>;
                                }
                            } else {
                                const isConfigured = !!config && (!!config.billingName || !!config.keyAccountManager);
                                if (isConfigured) {
                                    statusElement = <span className="flex items-center text-green-600 text-xs font-semibold"><CheckCircle className="h-4 w-4 mr-1"/> Complete</span>;
                                } else {
                                    statusElement = <span className="flex items-center text-orange-500 text-xs font-semibold"><AlertCircle className="h-4 w-4 mr-1"/> Incomplete</span>
                                }
                            }
                            
                            return (
                                <tr key={org.id}>
                                    <td data-label="Short Name" className="px-6 py-4 font-medium">{org.shortName}</td>
                                    <td data-label="Status" className="px-6 py-4 text-sm">{statusElement}</td>
                                    <td data-label="Site ID" className="px-6 py-4 text-sm text-muted">{org.id}</td>
                                    <td data-label="Manpower Count" className="px-6 py-4 text-sm text-muted">{org.manpowerApprovedCount || 'N/A'}</td>
                                    <td data-label="Actions" className="px-6 py-4">
                                        <div className="flex items-center gap-2 flex-wrap md:justify-start justify-end">
                                            <Button size="sm" variant="outline" onClick={() => handleViewDetails(org)}>
                                                Manpower
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleEdit(org)}>
                                                Configure
                                            </Button>
                                            <Button variant="icon" size="sm" onClick={() => handleDelete(org)} title="Delete Site">
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SiteManagement;