
import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import type { Organization, SiteUniformDetailsConfig, UniformItem, SiteStaffDesignation } from '../../types';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Toast from '../ui/Toast';
import { Plus, Trash2, Save, Loader2, ChevronDown, Shirt, Eye, ArrowLeft, Search } from 'lucide-react';

// --- Main Views ---

const DetailView: React.FC<{
    site: Organization;
    initialConfig: SiteUniformDetailsConfig;
    siteStaffDesignations: SiteStaffDesignation[];
    onSave: (siteId: string, config: SiteUniformDetailsConfig) => Promise<void>;
    onBack: () => void;
}> = ({ site, initialConfig, siteStaffDesignations, onSave, onBack }) => {
    const [isSaving, setIsSaving] = useState(false);
    const { control, handleSubmit, reset } = useForm<SiteUniformDetailsConfig>({ defaultValues: initialConfig });
    const { fields: departments, append: appendDepartment, remove: removeDepartment } = useFieldArray({ control, name: "departments" });

    useEffect(() => {
        reset(initialConfig);
    }, [initialConfig, reset]);
    
    const handleSaveSubmit = async (data: SiteUniformDetailsConfig) => {
        setIsSaving(true);
        await onSave(site.id, data);
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit(handleSaveSubmit)}>
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                    <Button type="button" onClick={onBack} variant="outline" size="sm" className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                    <h3 className="text-xl font-semibold text-primary-text">Managing Uniform Details for: {site.shortName}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" onClick={() => appendDepartment({ id: `dept_${Date.now()}`, department: '', designations: [] })}><Plus className="mr-2 h-4 w-4" /> Add Department</Button>
                    <Button type="submit" isLoading={isSaving}><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
                </div>
            </div>

            <div className="space-y-6">
                {departments.map((department, deptIndex) => (
                    <DepartmentAccordion key={department.id} control={control} deptIndex={deptIndex} removeDepartment={removeDepartment} siteStaffDesignations={siteStaffDesignations} />
                ))}
                {departments.length === 0 && <p className="text-center text-muted p-8">No departments added. Click "Add Department" to start.</p>}
            </div>
        </form>
    );
};

const DepartmentAccordion: React.FC<{
    control: any;
    deptIndex: number;
    removeDepartment: (index: number) => void;
    siteStaffDesignations: SiteStaffDesignation[];
}> = ({ control, deptIndex, removeDepartment, siteStaffDesignations }) => {
    const [isOpen, setIsOpen] = useState(true);
    const { fields: designations, append: appendDesignation, remove: removeDesignation } = useFieldArray({ control, name: `departments.${deptIndex}.designations` });
    
    const departmentDesignationMap = useMemo(() => {
        return siteStaffDesignations.reduce((acc, item) => {
            if (!acc[item.department]) acc[item.department] = [];
            if (!acc[item.department].includes(item.designation)) acc[item.department].push(item.designation);
            return acc;
        }, {} as Record<string, string[]>);
    }, [siteStaffDesignations]);

    const departmentValue = useWatch({ control, name: `departments.${deptIndex}.department` });
    const departmentOptions = useMemo(() => Object.keys(departmentDesignationMap).sort(), [departmentDesignationMap]);

    return (
        <div className="border border-border rounded-xl bg-card">
            <div className="flex items-center p-3">
                 <Controller
                    name={`departments.${deptIndex}.department`}
                    control={control}
                    render={({ field }) => (
                        <Select {...field} className="font-semibold !border-0 !ring-0 !shadow-none !p-2 flex-grow">
                            <option value="">Select Department</option>
                            {departmentOptions.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                        </Select>
                    )}
                />
                <Button type="button" variant="icon" size="sm" onClick={() => removeDepartment(deptIndex)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                <Button type="button" variant="icon" size="sm" onClick={() => setIsOpen(!isOpen)}><ChevronDown className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} /></Button>
            </div>
            {isOpen && (
                <div className="p-4 border-t border-border space-y-4">
                     {designations.map((designation, desigIndex) => (
                        <DesignationSubForm key={designation.id} control={control} deptIndex={deptIndex} desigIndex={desigIndex} removeDesignation={removeDesignation} departmentValue={departmentValue} departmentDesignationMap={departmentDesignationMap} />
                     ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendDesignation({ id: `desig_${Date.now()}`, designation: '', items: [] })}>
                        <Plus className="mr-2 h-4 w-4"/> Add Designation
                    </Button>
                </div>
            )}
        </div>
    );
};

const DesignationSubForm: React.FC<{
    control: any;
    deptIndex: number;
    desigIndex: number;
    removeDesignation: (index: number) => void;
    departmentValue: string;
    departmentDesignationMap: Record<string, string[]>;
}> = ({ control, deptIndex, desigIndex, removeDesignation, departmentValue, departmentDesignationMap }) => {
    const { fields: items, append: appendItem, remove: removeItem } = useFieldArray({ control, name: `departments.${deptIndex}.designations.${desigIndex}.items` });
    
    const designationOptions = useMemo(() => {
        return departmentValue ? (departmentDesignationMap[departmentValue] || []).sort() : [];
    }, [departmentValue, departmentDesignationMap]);

    return (
        <div className="p-4 border rounded-lg bg-page/50 space-y-4 relative">
            <Button type="button" variant="icon" size="sm" className="!absolute top-2 right-2" onClick={() => removeDesignation(desigIndex)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            <Controller
                name={`departments.${deptIndex}.designations.${desigIndex}.designation`}
                control={control}
                render={({ field }) => (
                    <Select label="Designation" {...field} disabled={!departmentValue}>
                        <option value="">Select Designation</option>
                        {designationOptions.map(desig => <option key={desig} value={desig}>{desig}</option>)}
                    </Select>
                )}
            />
            <div>
                <label className="block text-sm font-medium text-muted mb-2">Uniform Items</label>
                <div className="space-y-2">
                {items.map((item, itemIndex) => (
                    <div key={item.id} className="flex items-center gap-2">
                         <Controller
                            name={`departments.${deptIndex}.designations.${desigIndex}.items.${itemIndex}.name`}
                            control={control}
                            render={({ field }) => <Input {...field} placeholder="e.g., Gray Full Sleeve Shirt" className="flex-grow" />}
                        />
                        <Button type="button" variant="icon" size="sm" onClick={() => removeItem(itemIndex)}><Trash2 className="h-4 w-4 text-muted hover:text-red-500"/></Button>
                    </div>
                ))}
                </div>
                 <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendItem({ id: `item_${Date.now()}`, name: '' })}>
                    <Plus className="mr-1 h-4"/> Add Item
                </Button>
            </div>
        </div>
    );
};


const ListView: React.FC<{
    sites: Organization[];
    siteConfigs: Record<string, SiteUniformDetailsConfig>;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onViewDetails: (siteId: string) => void;
}> = ({ sites, siteConfigs, searchTerm, setSearchTerm, onViewDetails }) => {

    const generateSummary = (config?: SiteUniformDetailsConfig): string => {
        if (!config || config.departments.length === 0) return 'No configuration.';
        const totalDesignations = config.departments.reduce((sum, dept) => sum + dept.designations.length, 0);
        return `${totalDesignations} designation${totalDesignations !== 1 ? 's' : ''} configured across ${config.departments.length} department${config.departments.length !== 1 ? 's' : ''}.`;
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-semibold text-primary-text">Uniform Details Site Overview</h3>
                <div className="relative flex-1 md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                    <Input id="site-search" placeholder="Search sites..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>
            <div className="overflow-x-auto border border-border rounded-lg">
                <table className="min-w-full text-sm">
                    <thead className="bg-page">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-muted">Site Name</th>
                            <th className="px-4 py-3 text-left font-medium text-muted">Configuration Summary</th>
                            <th className="px-4 py-3 text-left font-medium text-muted">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sites.map(site => (
                            <tr key={site.id}>
                                <td className="px-4 py-3 font-medium">{site.shortName}</td>
                                <td className="px-4 py-3 text-muted">{generateSummary(siteConfigs[site.id])}</td>
                                <td className="px-4 py-3">
                                    <Button variant="icon" size="sm" onClick={() => onViewDetails(site.id)} title="View Details">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sites.length === 0 && <p className="text-center p-8 text-muted">No sites match your search.</p>}
            </div>
        </div>
    );
};

const UniformDetailsConfig: React.FC = () => {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    
    const [allSites, setAllSites] = useState<Organization[]>([]);
    const [siteConfigs, setSiteConfigs] = useState<Record<string, SiteUniformDetailsConfig>>({});
    const [siteStaffDesignations, setSiteStaffDesignations] = useState<SiteStaffDesignation[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            api.getOrganizations(), 
            api.getAllSiteUniformDetails(), 
            api.getSiteStaffDesignations()
        ])
            .then(([sites, configs, staffDesignations]) => {
                setAllSites(sites.sort((a,b) => a.shortName.localeCompare(b.shortName)));
                setSiteConfigs(configs);
                setSiteStaffDesignations(staffDesignations);
            })
            .catch(() => setToast({ message: 'Failed to load initial data.', type: 'error' }))
            .finally(() => setIsLoading(false));
    }, []);

    const handleSave = async (siteId: string, config: SiteUniformDetailsConfig) => {
        try {
            await api.updateSiteUniformDetails(siteId, config);
            setSiteConfigs(prev => ({ ...prev, [siteId]: config }));
            setToast({ message: 'Uniform details saved successfully.', type: 'success' });
        } catch (error) {
            setToast({ message: 'Failed to save configuration.', type: 'error' });
            throw error;
        }
    };

    const handleViewDetails = (siteId: string) => {
        setSelectedSiteId(siteId);
        setView('detail');
    };
    
    const filteredSites = useMemo(() => {
        if (!searchTerm) return allSites;
        return allSites.filter(site => site.shortName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allSites, searchTerm]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
    }

    return (
         <div>
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            {view === 'detail' && selectedSiteId ? (
                <DetailView
                    site={allSites.find(s => s.id === selectedSiteId)!}
                    initialConfig={siteConfigs[selectedSiteId] || { organizationId: selectedSiteId, departments: [] }}
                    siteStaffDesignations={siteStaffDesignations}
                    onSave={handleSave}
                    onBack={() => setView('list')}
                />
            ) : (
                <ListView
                    sites={filteredSites}
                    siteConfigs={siteConfigs}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    onViewDetails={handleViewDetails}
                />
            )}
        </div>
    );
};

export default UniformDetailsConfig;