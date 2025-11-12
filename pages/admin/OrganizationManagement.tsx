

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


export const SiteManagement: React.FC = () => {
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
                api.getOrganizations().catch(e => { console.error("Failed to fetch organizations:", e); return []; }),
                api.getOrganizationStructure().catch(e => { console.error("Failed to fetch organization structure:", e); return []; }),
                api.getSiteConfigurations().catch(e => { console.error("Failed to fetch site configurations:", e); return []; }),
                api.getSiteStaffDesignations().catch(e => {
                    console.error("Failed to fetch site staff designations:", e);
                    setToast({ message: 'Could not load designation list. Manpower editing may be affected.', type: 'error' });
                    return [];
                }),
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
             // This block will now only catch truly unexpected errors, not single API call failures.
            setToast({ message: 'An unexpected error occurred while fetching data.', type: 'error' });
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
                     <Button variant="outline