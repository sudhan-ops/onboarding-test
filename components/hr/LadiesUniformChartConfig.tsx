import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import type { Organization, MasterLadiesUniforms, SiteLadiesUniformConfig, LadiesUniformDepartmentConfig, LadiesUniformDesignationConfig, LadiesPantsSize, LadiesShirtSize, SiteStaffDesignation } from '../../types';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Toast from '../ui/Toast';
import { Plus, Trash2, Save, Loader2, ChevronDown, Shirt, Eye, ArrowLeft, Search } from 'lucide-react';

// --- Reusable Components ---

interface UniformSizeTableProps<T extends (LadiesPantsSize | LadiesShirtSize)> {
    title: string;
    sizes: T[];
    headers: { key: string, label: string }[];
    control: any;
    nestingIndex: { department: number; designation: number };
    quantityType: 'pantsQuantities' | 'shirtsQuantities';
}

const UniformTable = <T extends (LadiesPantsSize | LadiesShirtSize)>({ 
    title, 
    sizes, 
    headers, 
    control, 
    nestingIndex, 
    quantityType 
}: UniformSizeTableProps<T>) => {
    const fits = ['Slim Fit', 'Regular Fit', 'Comfort Fit'];
    const sizeGroups = sizes.reduce((acc, size) => {
        acc[size.size] = acc[size.size] || [];
        acc[size.size].push(size);
        return acc;
    }, {} as Record<string, T[]>);

    return (
        <div className="overflow-x-auto border rounded-lg">
            <h4 className="p-3 font-semibold bg-page border-b">{title}</h4>
            <table className="min-w-full text-sm">
                <thead className="bg-page">
                    <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted">Size</th>
                        {headers.map(h => <th key={String(h.key)} className="px-3 py-2 text-left font-medium text-muted">{h.label}</th>)}
                        <th className="px-3 py-2 text-left font-medium text-muted w-24">Quantity</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {Object.keys(sizeGroups).map(size => (
                        <React.Fragment key={size}>
                            {fits.map((fit, fitIndex) => {
                                const sizeForFit = sizeGroups[size].find(s => s.fit === fit);
                                if (!sizeForFit) return null;
                                return (
                                    <tr key={sizeForFit.id}>
                                        {fitIndex === 0 && <td rowSpan={fits.filter(f => sizeGroups[size].some(s=>s.fit===f)).length} className="px-3 py-2 align-middle font-semibold border-r">{size}</td>}
                                        {headers.map(h => <td key={String(h.key)} className="px-3 py-2">{sizeForFit[h.key as keyof T] as React.ReactNode}</td>)}
                                        <td className="px-3 py-2">
                                            <Controller
                                                name={`departments.${nestingIndex.department}.designations.${nestingIndex.designation}.${quantityType}.${sizeForFit.id}`}
                                                control={control}
                                                render={({ field }) => <Input type="number" {...field} value={field.value || ''} className="!py-1.5" />}
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- Main Views ---

const DetailView: React.FC<{
    site: Organization;
    initialConfig: SiteLadiesUniformConfig;
    masterUniforms: MasterLadiesUniforms;
    siteStaffDesignations: SiteStaffDesignation[];
    onSave: (siteId: string, config: SiteLadiesUniformConfig) => Promise<void>;
    onBack: () => void;
}> = ({ site, initialConfig, masterUniforms, siteStaffDesignations, onSave, onBack }) => {
    const [isSaving, setIsSaving] = useState(false);
    const { control, handleSubmit, reset } = useForm<SiteLadiesUniformConfig>({ defaultValues: initialConfig });
    const { fields: departments, append: appendDepartment, remove: removeDepartment } = useFieldArray({ control, name: "departments" });

    useEffect(() => {
        reset(initialConfig);
    }, [initialConfig, reset]);
    
    const handleSaveSubmit = async (data: SiteLadiesUniformConfig) => {
        setIsSaving(true);
        await onSave(site.id, data);
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit(handleSaveSubmit)}>
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                    <Button type="button" onClick={onBack} variant="outline" size="sm" className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                    <h3 className="text-xl font-semibold text-primary-text">Managing Ladies' Uniforms for: {site.shortName}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" onClick={() => appendDepartment({ id: `dept_${Date.now()}`, department: '', designations: [] })}><Plus className="mr-2 h-4 w-4" /> Add Department</Button>
                    <Button type="submit" isLoading={isSaving}><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
                </div>
            </div>

            <div className="space-y-6">
                {departments.map((department, deptIndex) => (
                    <DepartmentAccordion key={department.id} control={control} deptIndex={deptIndex} removeDepartment={removeDepartment} masterUniforms={masterUniforms} siteStaffDesignations={siteStaffDesignations} />
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
    masterUniforms: MasterLadiesUniforms;
    siteStaffDesignations: SiteStaffDesignation[];
}> = ({ control, deptIndex, removeDepartment, masterUniforms, siteStaffDesignations }) => {
    const [isOpen, setIsOpen] = useState(true);
    const { fields: designations, append: appendDesignation, remove: removeDesignation } = useFieldArray({ control, name: `departments.${deptIndex}.designations` });
    
    const departmentDesignationMap = useMemo(() => {
        return siteStaffDesignations.reduce((acc, item) => {
            if (!acc[item.department]) {
                acc[item.department] = [];
            }
            if (!acc[item.department].includes(item.designation)) {
                acc[item.department].push(item.designation);
            }
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
                     {designations.map((designation, desigIndex) => {
                        const designationOptions = useMemo(() => {
                             return departmentValue ? (departmentDesignationMap[departmentValue] || []).sort() : [];
                        }, [departmentValue, departmentDesignationMap]);

                        return (
                            <div key={designation.id} className="p-4 border rounded-lg bg-page/50 space-y-4 relative">
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
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    <UniformTable title="Pants" sizes={masterUniforms.pants} headers={[{key:'length',label:'L'},{key:'waist',label:'W'},{key:'hip',label:'H'},{key:'fit',label:'Fit'}]} control={control} nestingIndex={{department: deptIndex, designation: desigIndex}} quantityType="pantsQuantities" />
                                    <UniformTable title="Shirts" sizes={masterUniforms.shirts} headers={[{key:'length',label:'L'},{key:'sleeves',label:'S'},{key:'bust',label:'B'},{key:'shoulder',label:'Sh'},{key:'fit',label:'Fit'}]} control={control} nestingIndex={{department: deptIndex, designation: desigIndex}} quantityType="shirtsQuantities" />
                                </div>
                            </div>
                        )
                    })}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendDesignation({ id: `desig_${Date.now()}`, designation: '', pantsQuantities: {}, shirtsQuantities: {} })}>
                        <Plus className="mr-2 h-4 w-4"/> Add Designation
                    </Button>
                </div>
            )}
        </div>
    );
};

const ListView: React.FC<{
    sites: Organization[];
    siteConfigs: Record<string, SiteLadiesUniformConfig>;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onViewDetails: (siteId: string) => void;
}> = ({ sites, siteConfigs, searchTerm, setSearchTerm, onViewDetails }) => {

    const generateSummary = (config?: SiteLadiesUniformConfig): string => {
        if (!config || config.departments.length === 0) return 'No configuration.';
        const total = config.departments.reduce((sum, dept) => sum + dept.designations.length, 0);
        return `${total} designation${total > 1 ? 's' : ''} configured across ${config.departments.length} department${config.departments.length > 1 ? 's' : ''}.`;
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-semibold text-primary-text">Ladies' Uniform Site Overview</h3>
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

const LadiesUniformChartConfig: React.FC = () => {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    
    const [allSites, setAllSites] = useState<Organization[]>([]);
    const [siteConfigs, setSiteConfigs] = useState<Record<string, SiteLadiesUniformConfig>>({});
    const [masterUniforms, setMasterUniforms] = useState<MasterLadiesUniforms>({ pants: [], shirts: [] });
    const [siteStaffDesignations, setSiteStaffDesignations] = useState<SiteStaffDesignation[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            api.getOrganizations(), 
            api.getAllSiteLadiesUniforms(), 
            api.getMasterLadiesUniforms(),
            api.getSiteStaffDesignations()
        ])
            .then(([sites, configs, master, staffDesignations]) => {
                setAllSites(sites.sort((a,b) => a.shortName.localeCompare(b.shortName)));
                setSiteConfigs(configs);
                setMasterUniforms(master);
                setSiteStaffDesignations(staffDesignations);
            })
            .catch(() => setToast({ message: 'Failed to load initial data.', type: 'error' }))
            .finally(() => setIsLoading(false));
    }, []);

    const handleSave = async (siteId: string, config: SiteLadiesUniformConfig) => {
        try {
            await api.updateSiteLadiesUniforms(siteId, config);
            setSiteConfigs(prev => ({ ...prev, [siteId]: config }));
            setToast({ message: 'Uniform configuration saved successfully.', type: 'success' });
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
                    masterUniforms={masterUniforms}
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

export default LadiesUniformChartConfig;