
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import type { Organization, IssuedTool, MasterToolsList, MasterTool } from '../../types';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import UploadDocument from '../UploadDocument';
import Toast from '../ui/Toast';
import { Plus, Trash2, Save, Loader2, ChevronDown, Wrench, Eye, ArrowLeft, Search } from 'lucide-react';

// --- Reusable Tool Form Components ---

const ToolAccordionItem: React.FC<{
    control: any;
    index: number;
    remove: (index: number) => void;
    masterTools: MasterToolsList;
}> = ({ control, index, remove, masterTools }) => {
    const [isOpen, setIsOpen] = useState(true);
    
    const departmentValue = useWatch({ control, name: `tools.${index}.department` });
    const toolNameValue = useWatch({ control, name: `tools.${index}.name` });
    
    const toolOptions: MasterTool[] = departmentValue ? masterTools[departmentValue] || [] : [];
    const accordionTitle = toolNameValue || "New Tool";
    const accordionSubtitle = departmentValue || "Select a department";

    return (
        <div className="border border-border rounded-xl bg-card">
            <div className="flex items-center p-3">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 flex-grow text-left">
                    <Wrench className="h-5 w-5 text-muted flex-shrink-0" />
                    <div>
                        <span className="font-semibold text-primary-text">{accordionTitle}</span>
                        <p className="text-sm text-muted">{accordionSubtitle}</p>
                    </div>
                </button>
                <Button type="button" variant="icon" size="sm" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                <Button type="button" variant="icon" size="sm" onClick={() => setIsOpen(!isOpen)}><ChevronDown className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} /></Button>
            </div>
            {isOpen && (
                <div className="p-4 border-t border-border space-y-4 animate-fade-in-down">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Controller name={`tools.${index}.department`} control={control} render={({ field }) => (
                            <Select label="Department" {...field}>
                                <option value="">Select Department</option>
                                {Object.keys(masterTools).map(dept => <option key={dept} value={dept}>{dept}</option>)}
                            </Select>
                        )} />
                        <Controller name={`tools.${index}.name`} control={control} render={({ field }) => (
                            <Select label="Tool Name" {...field} disabled={!departmentValue}>
                                <option value="">Select Tool</option>
                                {toolOptions.map(tool => <option key={tool.id} value={tool.name}>{tool.name}</option>)}
                            </Select>
                        )} />
                        <Controller name={`tools.${index}.quantity`} control={control} render={({ field }) => <Input label="Quantity" type="number" {...field} />} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Controller name={`tools.${index}.picture`} control={control} render={({ field }) => <UploadDocument label="Picture of Tool" file={field.value} onFileChange={field.onChange} />} />
                        <Controller name={`tools.${index}.inwardDcCopy`} control={control} render={({ field }) => <UploadDocument label="Inward DC Copy" file={field.value} onFileChange={field.onChange} />} />
                        <Controller name={`tools.${index}.deliveryCopy`} control={control} render={({ field }) => <UploadDocument label="Delivery Copy" file={field.value} onFileChange={field.onChange} />} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <Controller name={`tools.${index}.invoiceCopy`} control={control} render={({ field }) => <UploadDocument label="Invoice" file={field.value} onFileChange={field.onChange} />} />
                        <Controller name={`tools.${index}.signedReceipt`} control={control} render={({ field }) => <UploadDocument label="Signed Receipt" file={field.value} onFileChange={field.onChange} />} />
                        <Controller name={`tools.${index}.receiverName`} control={control} render={({ field }) => <Input label="Receiver's Name" {...field} />} />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Views ---

const ToolDetailView: React.FC<{
    site: Organization;
    initialTools: IssuedTool[];
    masterTools: MasterToolsList;
    onSave: (siteId: string, tools: IssuedTool[]) => Promise<void>;
    onBack: () => void;
}> = ({ site, initialTools, masterTools, onSave, onBack }) => {
    const [isSaving, setIsSaving] = useState(false);
    const { control, handleSubmit, reset } = useForm<{ tools: IssuedTool[] }>();
    const { fields, append, remove } = useFieldArray({ control, name: "tools" });
    
    useEffect(() => {
        reset({ tools: initialTools });
    }, [initialTools, reset]);

    const handleAddTool = () => {
        append({ id: `new_tool_${Date.now()}`, department: '', name: '', quantity: 1 });
    };

    const handleSaveSubmit = async (data: { tools: IssuedTool[] }) => {
        setIsSaving(true);
        try {
            await onSave(site.id, data.tools);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(handleSaveSubmit)}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                    <Button type="button" onClick={onBack} variant="outline" size="sm" className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                    <h3 className="text-xl font-semibold text-primary-text">Managing Tools for: {site.shortName}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" onClick={handleAddTool}><Plus className="mr-2 h-4 w-4" /> Add Tool</Button>
                    <Button type="submit" isLoading={isSaving}><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
                </div>
            </div>
            <div className="space-y-4">
                {fields.length > 0 ? (
                    fields.map((field, index) => <ToolAccordionItem key={field.id} control={control} index={index} remove={remove} masterTools={masterTools} />)
                ) : (
                    <div className="text-center p-8 text-muted bg-page rounded-lg">No tools found for this site. Click "Add Tool" to begin.</div>
                )}
            </div>
        </form>
    );
};

const ToolListView: React.FC<{
    sites: Organization[];
    allIssuedTools: Record<string, IssuedTool[]>;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onViewDetails: (siteId: string) => void;
}> = ({ sites, allIssuedTools, searchTerm, setSearchTerm, onViewDetails }) => {

    const generateToolSummary = (tools: IssuedTool[] = []): string => {
        if (!tools || tools.length === 0) return 'No tools issued.';
        const totalQuantity = tools.reduce((sum, tool) => sum + (tool.quantity || 0), 0);
        const departmentCount = new Set(tools.map(t => t.department)).size;
        return `${totalQuantity} tools issued across ${departmentCount} department${departmentCount > 1 ? 's' : ''}.`;
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-semibold text-primary-text">Site Tools Overview</h3>
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
                            <th className="px-4 py-3 text-left font-medium text-muted">Tools Summary</th>
                            <th className="px-4 py-3 text-left font-medium text-muted">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sites.map(site => (
                            <tr key={site.id}>
                                <td className="px-4 py-3 font-medium">{site.shortName}</td>
                                <td className="px-4 py-3 text-muted">{generateToolSummary(allIssuedTools[site.id])}</td>
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

const ToolsListConfig: React.FC = () => {
    const [viewingSiteId, setViewingSiteId] = useState<string | null>(null);
    const [allSites, setAllSites] = useState<Organization[]>([]);
    const [allIssuedTools, setAllIssuedTools] = useState<Record<string, IssuedTool[]>>({});
    const [masterTools, setMasterTools] = useState<MasterToolsList>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([api.getOrganizations(), api.getAllSiteIssuedTools(), api.getToolsList()])
            .then(([sitesData, issuedToolsData, masterToolsData]) => {
                setAllSites(sitesData.sort((a,b) => a.shortName.localeCompare(b.shortName)));
                setAllIssuedTools(issuedToolsData);
                setMasterTools(masterToolsData);
            })
            .catch(() => setToast({ message: 'Failed to load initial configuration.', type: 'error' }))
            .finally(() => setIsLoading(false));
    }, []);

    const handleSave = async (siteId: string, tools: IssuedTool[]) => {
        try {
            await api.updateSiteIssuedTools(siteId, tools);
            setAllIssuedTools(prev => ({ ...prev, [siteId]: tools }));
            setToast({ message: 'Tools list saved successfully.', type: 'success' });
        } catch (error) {
            setToast({ message: 'Failed to save tools list.', type: 'error' });
            throw error;
        }
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
            {viewingSiteId ? (
                <ToolDetailView 
                    site={allSites.find(s => s.id === viewingSiteId)!}
                    initialTools={allIssuedTools[viewingSiteId] || []}
                    masterTools={masterTools}
                    onSave={handleSave}
                    onBack={() => setViewingSiteId(null)}
                />
            ) : (
                <ToolListView
                    sites={filteredSites}
                    allIssuedTools={allIssuedTools}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    onViewDetails={setViewingSiteId}
                />
            )}
        </div>
    );
};

export default ToolsListConfig;
