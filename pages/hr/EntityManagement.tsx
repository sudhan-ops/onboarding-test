import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { api } from '../../services/api';
import type { OrganizationGroup, Entity, Company, RegistrationType, Organization, SiteConfiguration, UploadedFile } from '../../types';
import { Plus, Save, Edit, Trash2, Building, ChevronRight, Upload, Download, Eye, CheckCircle, AlertCircle, Search, ClipboardList, Settings, Calculator, Users, Badge, HeartPulse, Archive, Wrench, Shirt, FileText, CalendarDays, BarChart, Mail, Sun, UserX, IndianRupee, ChevronLeft, HelpCircle, Loader2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import EntityForm from '../../components/hr/EntityForm';
// FIX: Changed to a named import as SiteConfigurationForm is not a default export.
import { SiteConfigurationForm } from '../../components/hr/SiteConfigurationForm';
import Modal from '../../components/ui/Modal';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useUiSettingsStore } from '../../store/uiSettingsStore';
import TemplateInstructionsModal from '../../components/hr/TemplateInstructionsModal';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import PlaceholderView from '../../components/ui/PlaceholderView';

// Import all the new placeholder components
import CostingResourceConfig from '../../components/hr/CostingResourceConfig';
import BackofficeHeadsConfig from '../../components/hr/BackofficeHeadsConfig';
import StaffDesignationConfig from '../../components/hr/StaffDesignationConfig';
import { GmcPolicyConfig } from '../../components/hr/GmcPolicyConfig';
import AssetConfig from '../../components/hr/AssetConfig';
import ToolsListConfig from '../../components/hr/ToolsListConfig';
import AttendanceFormatConfig from '../../components/hr/AttendanceFormatConfig';
import AttendanceOverviewConfig from '../../components/hr/AttendanceOverviewConfig';
import DailyAttendanceConfig from '../../components/hr/DailyAttendanceConfig';
import NotificationTemplateConfig from '../../components/hr/NotificationTemplateConfig';
import OnboardRejectReasonConfig from '../../components/hr/OnboardRejectReasonConfig';
import SalaryTemplateConfig from '../../components/hr/SalaryTemplateConfig';
import SalaryLineItemConfig from '../../components/hr/SalaryLineItemConfig';


// Helper to convert array of objects to CSV string
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

// Helper to parse CSV string into array of objects
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


const entityCsvColumns = [
    'GroupId', 'GroupName', 'CompanyId', 'CompanyName', 'EntityId', 'EntityName', 'organizationId', 'Location', 'RegisteredAddress', 
    'RegistrationType', 'RegistrationNumber', 'GSTNumber', 'PANNumber', 'Email', 'EShramNumber', 
    'ShopAndEstablishmentCode', 'EPFOCode', 'ESICCode', 'PSARALicenseNumber', 'PSARAValidTill'
];

const siteConfigCsvColumns = [
    'organizationId', 'organizationName', 'location', 'entityId', 'billingName', 'registeredAddress', 
    'gstNumber', 'panNumber', 'email1', 'email2', 'email3', 'eShramNumber', 'shopAndEstablishmentCode', 
    'keyAccountManager', 'siteAreaSqFt', 'projectType', 'apartmentCount', 'agreementDetails', 'siteOperations'
];

const triggerDownload = (data: BlobPart, fileName: string) => {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const NameInputModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  title: string;
  label: string;
  initialName?: string;
}> = ({ isOpen, onClose, onSave, title, label, initialName = '' }) => {
    const [name, setName] = useState(initialName);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) setName(initialName);
    }, [isOpen, initialName]);

    const handleSave = () => {
        if (!name.trim()) {
            setError('Name cannot be empty.');
            return;
        }
        onSave(name);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold">{title}</h3>
                <div className="mt-4">
                    <Input label={label} id="name-input" value={name} onChange={e => { setName(e.target.value); setError(''); }} error={error} />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </div>
            </div>
        </div>
    );
};

const subcategories = [
    { key: 'client_structure', label: 'Client Structure', icon: ClipboardList },
    { key: 'site_configuration', label: 'Site Configuration', icon: Settings },
    { key: 'costing_resource', label: 'Costing & Resource', icon: Calculator },
    { key: 'backoffice_heads', label: 'Back Office & ID Series', icon: Users },
    { key: 'staff_designation', label: 'Staff Designation', icon: Badge },
    { key: 'gmc_policy', label: 'GMC Policy', icon: HeartPulse },
    { key: 'asset', label: 'Asset Management', icon: Archive },
    { key: 'tools_list', label: 'Tools List', icon: Wrench },
    { key: 'attendance_format', label: 'Attendance Format', icon: CalendarDays },
    { key: 'attendance_overview', label: 'Attendance Overview', icon: BarChart },
    { key: 'notification_template', label: 'Notification & Mail', icon: Mail },
    { key: 'onboard_reject_reason', label: 'Onboarding Rejection Reasons', icon: UserX },
    { key: 'salary_template', label: 'Salary Breakup', icon: IndianRupee },
    { key: 'salary_line_item', label: 'Salary Line Item', icon: IndianRupee },
];

const EntityManagement: React.FC = () => {
    const [groups, setGroups] = useState<OrganizationGroup[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [siteConfigs, setSiteConfigs] = useState<SiteConfiguration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [activeSubcategory, setActiveSubcategory] = useState<string>('client_structure');
    const importRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingClients, setViewingClients] = useState<{ companyName: string; clients: Entity[] } | null>(null);
    const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 767px)');

    // Modals state
    const [entityFormState, setEntityFormState] = useState<{ isOpen: boolean; initialData: Entity | null; companyName: string }>({ isOpen: false, initialData: null, companyName: '' });
    const [nameModalState, setNameModalState] = useState<{ 
      isOpen: boolean; 
      mode: 'add' | 'edit';
      type: 'group' | 'company'; 
      id?: string; 
      groupId?: string; 
      initialName?: string; 
      title: string; 
      label: string 
    }>({ isOpen: false, mode: 'add', type: 'group', title: '', label: '' });
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; type: 'group' | 'company' | 'client'; id: string; name: string }>({ isOpen: false, type: 'group', id: '', name: '' });
    const [siteConfigForm, setSiteConfigForm] = useState<{ isOpen: boolean; org: Organization | null }>({ isOpen: false, org: null });
    
    const allClients = useMemo(() => {
        return groups.flatMap(g => g.companies.flatMap(c => c.entities.map(e => ({...e, companyName: c.name}))));
    }, [groups]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [structure, orgs, configs] = await Promise.all([
                    api.getOrganizationStructure(),
                    api.getOrganizations(),
                    api.getSiteConfigurations()
                ]);
                setGroups(structure);
                setOrganizations(orgs);
                setSiteConfigs(configs);
            } catch (error) {
                setToast({ message: "Failed to load data.", type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredGroups = useMemo(() => {
        if (!searchTerm.trim()) {
            return groups;
        }
        const lower = searchTerm.toLowerCase();

        return groups.map(group => {
            if (group.name.toLowerCase().includes(lower)) {
                return group; // Group name matches, include whole group
            }

            const matchingCompanies = group.companies.map(company => {
                if (company.name.toLowerCase().includes(lower)) {
                    return company; // Company name matches, include whole company
                }

                const matchingEntities = company.entities.filter(entity =>
                    entity.name.toLowerCase().includes(lower)
                );

                if (matchingEntities.length > 0) {
                    return { ...company, entities: matchingEntities };
                }
                return null;
            }).filter(Boolean) as Company[];

            if (matchingCompanies.length > 0) {
                return { ...group, companies: matchingCompanies };
            }
            return null;
        }).filter(Boolean) as OrganizationGroup[];
    }, [groups, searchTerm]);

    const filteredOrganizations = useMemo(() => {
        if (!searchTerm.trim()) {
            return organizations;
        }
        const lower = searchTerm.toLowerCase();
        return organizations.filter(org => org.shortName.toLowerCase().includes(lower));
    }, [organizations, searchTerm]);


    const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const handleSaveAll = () => {
        // In a real app, this would be a single API call. Here we just show a success message.
        setToast({ message: 'All changes saved successfully (mocked).', type: 'success' });
    };

    // Client/Entity handlers
    const handleAddClient = (companyName: string) => setEntityFormState({ isOpen: true, initialData: null, companyName });
    const handleEditClient = (entity: Entity, companyName: string) => setEntityFormState({ isOpen: true, initialData: entity, companyName });
    const handleSaveClient = (clientData: Entity) => {
        // Logic to find the correct company and add/update the client
        setToast({ message: clientData.id.startsWith('new_') ? 'Client added.' : 'Client updated.', type: 'success' });
        setEntityFormState({ isOpen: false, initialData: null, companyName: '' });
    };

    const handleDeleteClick = (type: 'group' | 'company' | 'client', id: string, name: string) => setDeleteModalState({ isOpen: true, type, id, name });
    
    const handleConfirmDelete = () => {
        const { type, id, name } = deleteModalState;
        if (type === 'group') {
            setGroups(prev => prev.filter(g => g.id !== id));
        } else if (type === 'company') {
            setGroups(prev => prev.map(group => ({
                ...group,
                companies: group.companies.filter(c => c.id !== id)
            })));
        } else if (type === 'client') {
            setGroups(prev => prev.map(group => ({
                ...group,
                companies: group.companies.map(company => ({
                    ...company,
                    entities: company.entities.filter(e => e.id !== id)
                }))
            })));
        }
        setToast({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} '${name}' deleted.`, type: 'success' });
        setDeleteModalState({ isOpen: false, type: 'group', id: '', name: '' });
    };

    const handleSaveName = (name: string) => {
        const { mode, type, id, groupId } = nameModalState;
        if (mode === 'add') {
            if (type === 'group') {
                const newGroup: OrganizationGroup = { id: `group_${Date.now()}`, name, locations: [], companies: [] };
                setGroups(prev => [...prev, newGroup]);
                setToast({ message: `Group '${name}' added.`, type: 'success' });
            } else if (type === 'company' && groupId) {
                const newCompany: Company = { id: `comp_${Date.now()}`, name, entities: [] };
                setGroups(prev => prev.map(g => g.id === groupId ? { ...g, companies: [...g.companies, newCompany] } : g));
                setToast({ message: `Company '${name}' added.`, type: 'success' });
            }
        } else { // mode === 'edit'
            if (type === 'group' && id) {
                setGroups(prev => prev.map(g => g.id === id ? { ...g, name } : g));
                setToast({ message: 'Group updated.', type: 'success' });
            } else if (type === 'company' && id && groupId) {
                setGroups(prev => prev.map(g => 
                    g.id === groupId 
                    ? { ...g, companies: g.companies.map(c => c.id === id ? { ...c, name } : c) } 
                    : g
                ));
                setToast({ message: 'Company updated.', type: 'success' });
            }
        }
        setNameModalState({ isOpen: false, mode: 'add', type: 'group', title: '', label: '' }); // Reset and close
    };


    const handleExport = () => {
        let csvData: string;
        let fileName: string;
        let columns: string[];

        if (activeSubcategory === 'client_structure') {
            columns = entityCsvColumns;
            const flatData = groups.flatMap(group =>
                group.companies.flatMap(company =>
                    company.entities.map(entity => ({
                        GroupId: group.id,
                        GroupName: group.name,
                        CompanyId: company.id,
                        CompanyName: company.name,
                        EntityId: entity.id,
                        EntityName: entity.name,
                        organizationId: entity.organizationId || '',
                        Location: entity.location || '',
                        RegisteredAddress: entity.registeredAddress || '',
                        RegistrationType: entity.registrationType || '',
                        RegistrationNumber: entity.registrationNumber || '',
                        GSTNumber: entity.gstNumber || '',
                        PANNumber: entity.panNumber || '',
                        Email: entity.email || '',
                        EShramNumber: entity.eShramNumber || '',
                        ShopAndEstablishmentCode: entity.shopAndEstablishmentCode || '',
                        EPFOCode: entity.epfoCode || '',
                        ESICCode: entity.esicCode || '',
                        PSARALicenseNumber: entity.psaraLicenseNumber || '',
                        PSARAValidTill: entity.psaraValidTill || '',
                    }))
                )
            );
            csvData = toCSV(flatData, columns);
            fileName = 'client_structure_export.csv';
        } else if (activeSubcategory === 'site_configuration') {
            columns = siteConfigCsvColumns;
            const dataToExport = organizations.map(org => {
                const config = siteConfigs.find(c => c.organizationId === org.id);
                return {
                    organizationId: org.id,
                    organizationName: org.shortName,
                    ...(config || {}),
                    agreementDetails: JSON.stringify(config?.agreementDetails || {}),
                    siteOperations: JSON.stringify(config?.siteOperations || {}),
                };
            });
            csvData = toCSV(dataToExport, columns);
            fileName = 'site_configuration_export.csv';
        } else {
            setToast({ message: `Export not implemented for this view.`, type: 'error' });
            return;
        }

        triggerDownload(csvData, fileName);
        setToast({ message: 'Data exported successfully.', type: 'success' });
    };
    
    const handleDownloadTemplate = () => {
        let columns: string[];
        let fileName: string;

        if (activeSubcategory === 'client_structure') {
            columns = entityCsvColumns;
            fileName = 'client_structure_template.csv';
        } else if (activeSubcategory === 'site_configuration') {
            columns = siteConfigCsvColumns;
            fileName = 'site_configuration_template.csv';
        } else {
            setToast({ message: `Template not available for this view.`, type: 'error' });
            return;
        }
        triggerDownload(columns.join(','), fileName);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                if (!text) throw new Error("File is empty.");

                const lines = text.trim().replace(/\r/g, '').split('\n');
                if (lines.length < 1) throw new Error("CSV file is empty.");
                const fileHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                
                if (activeSubcategory === 'client_structure') {
                    if (fileHeaders.join(',') !== entityCsvColumns.join(',')) {
                        throw new Error(`Header mismatch. Please use the downloaded template.`);
                    }
                    
                    const parsedData = fromCSV(text);
                    if (parsedData.length === 0) throw new Error("No data rows found.");
    
                    const newGroupsMap = new Map<string, { group: OrganizationGroup, companiesMap: Map<string, Company> }>();
    
                    for (const row of parsedData) {
                        if (!newGroupsMap.has(row.GroupId)) {
                            newGroupsMap.set(row.GroupId, {
                                group: { id: row.GroupId, name: row.GroupName, locations: [], companies: [] },
                                companiesMap: new Map<string, Company>()
                            });
                        }
    
                        const groupData = newGroupsMap.get(row.GroupId)!;
    
                        if (!groupData.companiesMap.has(row.CompanyId)) {
                            groupData.companiesMap.set(row.CompanyId, { id: row.CompanyId, name: row.CompanyName, entities: [] });
                        }
                        
                        const companyData = groupData.companiesMap.get(row.CompanyId)!;
    
                        const entity: Entity = {
                            id: row.EntityId,
                            name: row.EntityName,
                            organizationId: row.organizationId,
                            location: row.Location,
                            registeredAddress: row.RegisteredAddress,
                            registrationType: row.RegistrationType as RegistrationType || '',
                            registrationNumber: row.RegistrationNumber,
                            gstNumber: row.GSTNumber,
                            panNumber: row.PANNumber,
                            email: row.Email,
                            eShramNumber: row.EShramNumber,
                            shopAndEstablishmentCode: row.ShopAndEstablishmentCode,
                            epfoCode: row.EPFOCode,
                            esicCode: row.ESICCode,
                            psaraLicenseNumber: row.PSARALicenseNumber,
                            psaraValidTill: row.PSARAValidTill,
                        };
    
                        companyData.entities.push(entity);
                    }
    
                    const newGroups: OrganizationGroup[] = Array.from(newGroupsMap.values()).map(gData => {
                        gData.group.companies = Array.from(gData.companiesMap.values());
                        return gData.group;
                    });
                    
                    setGroups(newGroups);
                    setToast({ message: `Successfully imported ${parsedData.length} client records.`, type: 'success' });

                } else if (activeSubcategory === 'site_configuration') {
                    if (fileHeaders.join(',') !== siteConfigCsvColumns.join(',')) {
                         throw new Error(`Header mismatch. Please use the downloaded template.`);
                    }

                    const parsedData = fromCSV(text);
                    if (parsedData.length === 0) throw new Error("No data rows found.");

                    const newSiteConfigs = parsedData.map(row => {
                        const config: Partial<SiteConfiguration> = {};
                        for (const key of Object.keys(row)) {
                            if (key === 'agreementDetails' || key === 'siteOperations') {
                                try {
                                    (config as any)[key] = JSON.parse(row[key]);
                                } catch (e) {
                                    console.warn(`Could not parse JSON for ${key} in row for site ${row.organizationId}`);
                                    (config as any)[key] = {};
                                }
                            } else {
                                (config as any)[key] = row[key];
                            }
                        }
                        return config as SiteConfiguration;
                    });
                    
                    setSiteConfigs(prev => {
                        const updated = [...prev];
                        newSiteConfigs.forEach(newConfig => {
                            const index = updated.findIndex(c => c.organizationId === newConfig.organizationId);
                            if (index > -1) updated[index] = newConfig;
                            else updated.push(newConfig);
                        });
                        return updated;
                    });
                    setToast({ message: `Successfully imported ${newSiteConfigs.length} site configurations.`, type: 'success' });
                } else {
                    setToast({ message: `Import not implemented for this view.`, type: 'error' });
                }
            } catch (error: any) {
                setToast({ message: error.message || 'Failed to import CSV.', type: 'error' });
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
      };


    const renderContent = () => {
        switch (activeSubcategory) {
            case 'client_structure':
                return (
                    <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                            <Button onClick={() => setNameModalState({ isOpen: true, mode: 'add', type: 'group', title: 'Add New Group', label: 'Group Name' })}><Plus className="mr-2 h-4" />Add Group</Button>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button type="button" variant="outline" onClick={handleDownloadTemplate}><FileText className="mr-2 h-4 w-4" /> Template</Button>
                                <Button type="button" variant="outline" onClick={() => importRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Import</Button>
                                <Button type="button" variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {filteredGroups.map(group => (
                                <div key={group.id} className="border-b border-border">
                                    <div className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleExpand(group.id)}><ChevronRight className={`h-5 w-5 transition-transform ${expanded[group.id] ? 'rotate-90' : ''}`} /></button>
                                            <Building className="h-5 w-5 text-muted" />
                                            <span className="font-semibold">{group.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" className="!p-1.5" onClick={() => setNameModalState({ isOpen: true, mode: 'add', type: 'company', groupId: group.id, title: `Add Company to ${group.name}`, label: 'Company Name' })} title="Add Company">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                            <Button variant="icon" size="sm" onClick={() => setNameModalState({ isOpen: true, mode: 'edit', type: 'group', id: group.id, initialName: group.name, title: 'Edit Group Name', label: 'Group Name' })} title="Edit group name"><Edit className="h-4 w-4" /></Button>
                                            <Button variant="icon" size="sm" onClick={() => handleDeleteClick('group', group.id, group.name)} title="Delete group"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                        </div>
                                    </div>
                                    {expanded[group.id] && (
                                        <div className="pl-6 pr-3 pb-3 space-y-2">
                                            {group.companies.map(company => (
                                                <div key={company.id} className="border border-border rounded-lg">
                                                    <div className="p-2 flex items-center justify-between bg-card">
                                                        <div className="flex items-center gap-2">
                                                             <button onClick={() => toggleExpand(company.id)}><ChevronRight className={`h-5 w-5 transition-transform ${expanded[company.id] ? 'rotate-90' : ''}`} /></button>
                                                             <span>{company.name} ({company.entities.length} clients)</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button variant="icon" size="sm" title={`View ${company.entities.length} clients`} onClick={() => setViewingClients({ companyName: company.name, clients: company.entities })}><Eye className="h-4 w-4"/></Button>
                                                            <Button variant="icon" size="sm" onClick={() => handleAddClient(company.name)} title="Add client"><Plus className="h-4 w-4"/></Button>
                                                            <Button variant="icon" size="sm" onClick={() => setNameModalState({ isOpen: true, mode: 'edit', type: 'company', id: company.id, groupId: group.id, initialName: company.name, title: 'Edit Company Name', label: 'Company Name' })} title="Edit company name"><Edit className="h-4 w-4" /></Button>
                                                            <Button variant="icon" size="sm" onClick={() => handleDeleteClick('company', company.id, company.name)} title="Delete company"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                        </div>
                                                    </div>
                                                    {expanded[company.id] && (
                                                        <div className="p-2">
                                                            {company.entities.map(client => (
                                                                <div key={client.id} className="p-2 flex items-center justify-between hover:bg-page rounded">
                                                                    <span>{client.name}</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <Button variant="icon" size="sm" onClick={() => handleEditClient(client, company.name)}><Edit className="h-4 w-4"/></Button>
                                                                        <Button variant="icon" size="sm" onClick={() => handleDeleteClick('client', client.id, client.name)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'site_configuration':
                return (
                     <div className="md:bg-card md:p-6 md:rounded-xl md:shadow-card">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                            <h4 className="text-lg font-semibold text-primary-text">Sites Configuration</h4>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button type="button" variant="outline" onClick={handleDownloadTemplate}><FileText className="mr-2 h-4 w-4" /> Template</Button>
                                <Button type="button" variant="outline" onClick={() => importRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Import</Button>
                                <Button type="button" variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border responsive-table">
                                <thead className="bg-page">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Site Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Configuration Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border md:bg-card md:divide-y-0">
                                    {filteredOrganizations.map(org => {
                                        const config = siteConfigs.find(c => c.organizationId === org.id);
                                        const isConfigured = !!config && (!!config.billingName || !!config.keyAccountManager);
                                        return (
                                            <tr key={org.id}>
                                                <td data-label="Site Name" className="px-4 py-3 font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <Building className="h-5 w-5 text-muted" />
                                                        <span>{org.shortName}</span>
                                                    </div>
                                                </td>
                                                <td data-label="Status" className="px-4 py-3">
                                                    {isConfigured ? 
                                                        <span className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1"/> Complete</span> : 
                                                        <span className="flex items-center text-yellow-600"><AlertCircle className="h-4 w-4 mr-1"/> Incomplete</span>
                                                    }
                                                </td>
                                                <td data-label="Actions" className="px-4 py-3">
                                                    <Button size="sm" variant="outline" onClick={() => setSiteConfigForm({ isOpen: true, org })}>
                                                        <Eye className="mr-2 h-4 w-4"/> View / Edit
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'costing_resource': return <CostingResourceConfig />;
            case 'backoffice_heads': return <BackofficeHeadsConfig />;
            case 'staff_designation': return <StaffDesignationConfig />;
            case 'gmc_policy': return <GmcPolicyConfig />;
            case 'asset': return <AssetConfig />;
            case 'tools_list': return <ToolsListConfig />;
            case 'attendance_format': return <AttendanceFormatConfig />;
            case 'attendance_overview': return <AttendanceOverviewConfig />;
            case 'daily_attendance': return <DailyAttendanceConfig />;
            case 'notification_template': return <NotificationTemplateConfig />;
            case 'onboard_reject_reason': return <OnboardRejectReasonConfig />;
            case 'salary_template': return <SalaryTemplateConfig />;
            case 'salary_line_item': return <SalaryLineItemConfig />;
            default:
                 const activeItem = subcategories.find(sc => sc.key === activeSubcategory);
                return <PlaceholderView title={activeItem?.label || 'Configuration'} />;
        }
    };


    return (
        <div className="p-4 space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            <TemplateInstructionsModal isOpen={isInstructionsOpen} onClose={() => setIsInstructionsOpen(false)} />
            {entityFormState.isOpen && <EntityForm {...entityFormState} onClose={() => setEntityFormState(p => ({ ...p, isOpen: false }))} onSave={handleSaveClient} />}
            <NameInputModal 
                isOpen={nameModalState.isOpen}
                onClose={() => setNameModalState({ isOpen: false, mode: 'add', type: 'group', title: '', label: '' })} 
                onSave={handleSaveName}
                title={nameModalState.title}
                label={nameModalState.label}
                initialName={nameModalState.initialName}
            />
            <Modal isOpen={deleteModalState.isOpen} onClose={() => setDeleteModalState(p => ({ ...p, isOpen: false }))} onConfirm={handleConfirmDelete} title="Confirm Deletion">
                Are you sure you want to delete the {deleteModalState.type} "{deleteModalState.name}"? This action cannot be undone.
            </Modal>
            {siteConfigForm.isOpen && siteConfigForm.org && <SiteConfigurationForm isOpen={siteConfigForm.isOpen} onClose={() => setSiteConfigForm({ isOpen: false, org: null })} onSave={() => {}} organization={siteConfigForm.org} allClients={allClients} initialData={siteConfigs.find(c => c.organizationId === siteConfigForm.org?.id)} />}
            {viewingClients && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={() => setViewingClients(null)}>
                    <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-md m-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-primary-text mb-4">Clients in {viewingClients.companyName}</h3>
                        {viewingClients.clients.length > 0 ? (
                            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {viewingClients.clients.map(client => (
                                    <li key={client.id} className="text-sm p-2 bg-page rounded-md">{client.name}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted text-center py-4">No clients found for this company.</p>
                        )}
                        <div className="mt-6 text-right">
                            <Button onClick={() => setViewingClients(null)} variant="secondary">Close</Button>
                        </div>
                    </div>
                </div>
            )}


             <AdminPageHeader title="Client Management">
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => setIsInstructionsOpen(true)}><HelpCircle className="mr-2 h-4 w-4" /> Help</Button>
                    <input type="file" ref={importRef} className="hidden" accept=".csv" onChange={handleImport} />
                    <Button onClick={handleSaveAll}><Save className="mr-2 h-4 w-4" /> Save All Changes</Button>
                </div>
            </AdminPageHeader>
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <input
                    type="text"
                    placeholder="Search across all clients and sites..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="form-input pl-10 w-full"
                />
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <nav className="md:col-span-1">
                    {isMobile ? (
                        <Select
                            label="Configuration Section"
                            id="hr-config-select"
                            value={activeSubcategory}
                            onChange={e => setActiveSubcategory(e.target.value)}
                        >
                            {subcategories.map(sc => <option key={sc.key} value={sc.key}>{sc.label}</option>)}
                        </Select>
                    ) : (
                        <div className="space-y-1">
                            {subcategories.map(sc => (
                                <button
                                    key={sc.key}
                                    onClick={() => setActiveSubcategory(sc.key)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                                        activeSubcategory === sc.key 
                                            ? 'bg-accent text-white' 
                                            : 'text-muted hover:bg-accent-light hover:text-accent-dark'
                                    }`}
                                >
                                    <sc.icon className="h-5 w-5" />
                                    <span>{sc.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </nav>
                <main className="md:col-span-3">
                    {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mt-16" /> : renderContent()}
                </main>
            </div>
        </div>
    );
};

export default EntityManagement;