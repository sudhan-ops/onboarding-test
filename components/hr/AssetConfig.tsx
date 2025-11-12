
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import type { Organization, Asset, UploadedFile, PhoneAsset, SimAsset, ComputerAsset, IdCardAsset, PetrocardAsset, VehicleAsset, ToolsAsset, OtherAsset, ToolAssetItem } from '../../types';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DatePicker from '../ui/DatePicker';
import UploadDocument from '../UploadDocument';
import Toast from '../ui/Toast';
import { Plus, Trash2, Save, Loader2, ChevronDown, Smartphone, Car, Laptop, HardHat, CreditCard, Cpu, CircleUserRound, Package, Eye, ArrowLeft, Search } from 'lucide-react';

type AssetType = Asset['type'];

// --- Reusable Asset Form Components ---

const assetTypeOptions: { key: AssetType, label: string, icon: React.ElementType }[] = [
    { key: 'Phone', label: 'Phone', icon: Smartphone },
    { key: 'Computer', label: 'Computer / Laptop', icon: Laptop },
    { key: 'Vehicle', label: 'Vehicle', icon: Car },
    { key: 'Sim', label: 'SIM Card', icon: Cpu },
    { key: 'IdCard', label: 'Identity Card', icon: CircleUserRound },
    { key: 'Petrocard', label: 'Petrocard', icon: CreditCard },
    { key: 'Tools', label: 'Tools', icon: HardHat },
    { key: 'Other', label: 'Other Asset', icon: Package },
];

const AssetFormRenderer: React.FC<{ assetType: AssetType, index: number, control: any, errors: any }> = ({ assetType, ...props }) => {
    switch (assetType) {
        case 'Phone': return <PhoneAssetForm {...props} />;
        case 'Computer': return <ComputerAssetForm {...props} />;
        case 'Vehicle': return <VehicleAssetForm {...props} />;
        case 'Sim': return <SimAssetForm {...props} />;
        case 'IdCard': return <IdCardAssetForm {...props} />;
        case 'Petrocard': return <PetrocardAssetForm {...props} />;
        case 'Tools': return <ToolsAssetForm {...props} />;
        case 'Other': return <OtherAssetForm {...props} />;
        default: return null;
    }
};

const PhoneAssetForm: React.FC<{ index: number; control: any }> = ({ index, control }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
        <Controller name={`assets.${index}.brand`} control={control} render={({ field }) => <Input label="Brand" {...field} />} />
        <Controller name={`assets.${index}.imei`} control={control} render={({ field }) => <Input label="IMEI Number" {...field} />} />
        <Controller name={`assets.${index}.color`} control={control} render={({ field }) => <Input label="Colour" {...field} />} />
        <Controller name={`assets.${index}.condition`} control={control} render={({ field }) => (
            <Select label="New / Used" {...field}><option value="">Select</option><option>New</option><option>Used</option></Select>
        )} />
        <Controller name={`assets.${index}.chargerStatus`} control={control} render={({ field }) => (
            <Select label="Charger" {...field}><option value="">Select</option><option>With Charger</option><option>Without Charger</option></Select>
        )} />
        <Controller name={`assets.${index}.displayStatus`} control={control} render={({ field }) => (
            <Select label="Display Condition" {...field}><option value="">Select</option><option>With Damages</option><option>Without Damages</option></Select>
        )} />
        <Controller name={`assets.${index}.bodyStatus`} control={control} render={({ field }) => (
            <Select label="Body Condition" {...field}><option value="">Select</option><option>With Damages</option><option>Without Damages</option></Select>
        )} />
         <Controller name={`assets.${index}.picture`} control={control} render={({ field }) => <UploadDocument label="Picture" file={field.value} onFileChange={field.onChange} />} />
    </div>
);

const SimAssetForm: React.FC<{ index: number; control: any }> = ({ index, control }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <Controller name={`assets.${index}.number`} control={control} render={({ field }) => <Input label="SIM Number" {...field} />} />
    </div>
);

const ComputerAssetForm: React.FC<{ index: number; control: any }> = ({ index, control }) => (
    <div className="space-y-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Controller name={`assets.${index}.computerType`} control={control} render={({ field }) => (
                <Select label="Type" {...field}><option value="">Select</option><option>Laptop</option><option>Desktop</option><option>Tab</option></Select>
            )} />
            <Controller name={`assets.${index}.brand`} control={control} render={({ field }) => <Input label="Brand" {...field} />} />
            <Controller name={`assets.${index}.serialNumber`} control={control} render={({ field }) => <Input label="Serial Number" {...field} />} />
            <Controller name={`assets.${index}.windowsKey`} control={control} render={({ field }) => <Input label="Windows Key" {...field} />} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <Controller name={`assets.${index}.condition`} control={control} render={({ field }) => (
                <Select label="New / Used" {...field}><option value="">Select</option><option>New</option><option>Used</option></Select>
            )} />
            <Controller name={`assets.${index}.chargerStatus`} control={control} render={({ field }) => (
                <Select label="Charger" {...field}><option value="">Select</option><option>With Charger</option><option>Without Charger</option></Select>
            )} />
            <Controller name={`assets.${index}.bagStatus`} control={control} render={({ field }) => (
                <Select label="Bag" {...field}><option value="">Select</option><option>With Bag</option><option>Without Bag</option></Select>
            )} />
            <Controller name={`assets.${index}.mouseStatus`} control={control} render={({ field }) => (
                <Select label="Mouse" {...field}><option value="">Select</option><option>With Mouse</option><option>Without Mouse</option></Select>
            )} />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <Controller name={`assets.${index}.displayStatus`} control={control} render={({ field }) => (
                <Select label="Display Condition" {...field}><option value="">Select</option><option>With Damages</option><option>Without Damages</option></Select>
            )} />
             <Controller name={`assets.${index}.bodyStatus`} control={control} render={({ field }) => (
                <Select label="Body Condition" {...field}><option value="">Select</option><option>With Damages</option><option>Without Damages</option></Select>
            )} />
            <Controller name={`assets.${index}.officeStatus`} control={control} render={({ field }) => (
                <Select label="MS Office" {...field}><option value="">Select</option><option>With Office</option><option>Without Office</option></Select>
            )} />
            <Controller name={`assets.${index}.antivirusStatus`} control={control} render={({ field }) => (
                <Select label="Antivirus" {...field}><option value="">Select</option><option>With Antivirus</option><option>Without Antivirus</option></Select>
            )} />
        </div>
        <Controller name={`assets.${index}.picture`} control={control} render={({ field }) => <UploadDocument label="Picture" file={field.value} onFileChange={field.onChange} />} />
    </div>
);

const IdCardAssetForm: React.FC<{ index: number; control: any }> = ({ index, control }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <Controller name={`assets.${index}.issueDate`} control={control} render={({ field }) => <DatePicker label="Date Issued" id={field.name} value={field.value} onChange={field.onChange} />} />
    </div>
);

const PetrocardAssetForm: React.FC<{ index: number; control: any }> = ({ index, control }) => (
     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <Controller name={`assets.${index}.number`} control={control} render={({ field }) => <Input label="Petrocard Number" {...field} />} />
    </div>
);

const VehicleAssetForm: React.FC<{ index: number; control: any }> = ({ index, control }) => (
    <div className="space-y-4 pt-4">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Controller name={`assets.${index}.vehicleType`} control={control} render={({ field }) => (
                <Select label="Vehicle Type" {...field}><option value="">Select</option><option>Bicycle</option><option>Two Wheeler</option><option>Three Wheeler</option><option>Four Wheeler</option></Select>
            )} />
            <Controller name={`assets.${index}.brand`} control={control} render={({ field }) => <Input label="Brand" {...field} />} />
            <Controller name={`assets.${index}.vehicleNumber`} control={control} render={({ field }) => <Input label="Vehicle Number" {...field} />} />
            <Controller name={`assets.${index}.chassisNumber`} control={control} render={({ field }) => <Input label="Chassis Number" {...field} />} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Controller name={`assets.${index}.dlNumber`} control={control} render={({ field }) => <Input label="DL Number of User" {...field} />} />
            <Controller name={`assets.${index}.kmsAtIssue`} control={control} render={({ field }) => <Input label="Kms at issue" type="number" {...field} />} />
            <Controller name={`assets.${index}.condition`} control={control} render={({ field }) => (
                <Select label="New / Used" {...field}><option value="">Select</option><option>New</option><option>Used</option></Select>
            )} />
            <Controller name={`assets.${index}.finesStatus`} control={control} render={({ field }) => (
                <Select label="Violations / Fines" {...field}><option value="">Select</option><option>Existing</option><option>Nil</option></Select>
            )} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Controller name={`assets.${index}.insuranceValidity`} control={control} render={({ field }) => <DatePicker label="Insurance Validity" id={field.name} value={field.value} onChange={field.onChange} />} />
            <Controller name={`assets.${index}.pollutionCertValidity`} control={control} render={({ field }) => <DatePicker label="Pollution Cert. Validity" id={field.name} value={field.value} onChange={field.onChange} />} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Controller name={`assets.${index}.dlFrontPic`} control={control} render={({ field }) => <UploadDocument label="Picture of DL (Front)" file={field.value} onFileChange={field.onChange} />} />
            <Controller name={`assets.${index}.dlBackPic`} control={control} render={({ field }) => <UploadDocument label="Picture of DL (Back)" file={field.value} onFileChange={field.onChange} />} />
            <Controller name={`assets.${index}.picture`} control={control} render={({ field }) => <UploadDocument label="Picture of Vehicle" file={field.value} onFileChange={field.onChange} />} />
        </div>
    </div>
);

const ToolsAssetForm: React.FC<{ index: number; control: any }> = ({ index, control }) => {
    const { fields, append, remove } = useFieldArray({ control, name: `assets.${index}.toolList` });
    return (
      <div className="space-y-4 pt-4">
        {fields.map((item, k) => (
             <div key={item.id} className="flex items-end gap-2">
                <div className="flex-1"><Controller name={`assets.${index}.toolList.${k}.name`} control={control} render={({ field }) => <Input label="Tool Name" {...field} />} /></div>
                <div className="flex-1"><Controller name={`assets.${index}.toolList.${k}.description`} control={control} render={({ field }) => <Input label="Description" {...field} />} /></div>
                <div><Controller name={`assets.${index}.toolList.${k}.quantity`} control={control} render={({ field }) => <Input label="Quantity" type="number" {...field} />} /></div>
                <Button type="button" variant="icon" size="sm" onClick={() => remove(k)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `tool_${Date.now()}`, name: '', description: '', quantity: 1 })}>
            <Plus className="mr-1 h-4 w-4" /> Add Tool
        </Button>
         <Controller name={`assets.${index}.picture`} control={control} render={({ field }) => <UploadDocument label="Picture of Tools" file={field.value} onFileChange={field.onChange} />} />
      </div>
    );
};

const OtherAssetForm: React.FC<{ index: number; control: any }> = ({ index, control }) => (
    <div className="space-y-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Controller name={`assets.${index}.name`} control={control} render={({ field }) => <Input label="Asset Name" placeholder="e.g. Printer" {...field} />} />
            <Controller name={`assets.${index}.brand`} control={control} render={({ field }) => <Input label="Brand" {...field} />} />
            <Controller name={`assets.${index}.model`} control={control} render={({ field }) => <Input label="Model No." {...field} />} />
            <Controller name={`assets.${index}.serialNumber`} control={control} render={({ field }) => <Input label="Serial Number" {...field} />} />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller name={`assets.${index}.condition`} control={control} render={({ field }) => (
                <Select label="New / Used" {...field}><option value="">Select</option><option>New</option><option>Used</option></Select>
            )} />
            <Controller name={`assets.${index}.issueCondition`} control={control} render={({ field }) => <Input label="Condition at time of issue" {...field} />} />
        </div>
        <div>
             <Controller name={`assets.${index}.accessories`} control={control} render={({ field }) => (
                 <>
                    <label className="block text-sm font-medium text-muted">Accessories List</label>
                    <textarea {...field} rows={3} className="form-input mt-1" />
                 </>
             )} />
        </div>
         <Controller name={`assets.${index}.picture`} control={control} render={({ field }) => <UploadDocument label="Picture of Asset" file={field.value} onFileChange={field.onChange} />} />
    </div>
);


const AssetAccordionItem: React.FC<{
    item: Asset;
    index: number;
    control: any;
    errors: any;
    remove: (index: number) => void;
}> = ({ item, index, control, errors, remove }) => {
    const [isOpen, setIsOpen] = useState(() => item.id.startsWith('new_'));
    const typeInfo = assetTypeOptions.find(opt => opt.key === item.type);
    const Icon = typeInfo?.icon || Package;

    const getAssetTitle = (asset: Asset): string => {
        if ('brand' in asset && asset.brand) return `${asset.brand} ${asset.type}`;
        if ('number' in asset && asset.number) return `${asset.type} - ${asset.number}`;
        if ('name' in asset && asset.name) return asset.name;
        if ('vehicleNumber' in asset && asset.vehicleNumber) return asset.vehicleNumber;
        return typeInfo?.label || 'Asset';
    };
    
    const title = getAssetTitle(item);

    return (
        <div className="border border-border rounded-xl bg-card">
            <div className="flex items-center p-3">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 flex-grow text-left">
                    <Icon className="h-5 w-5 text-muted flex-shrink-0" />
                    <span className="font-semibold text-primary-text">{title}</span>
                </button>
                <Button type="button" variant="icon" size="sm" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                <Button type="button" variant="icon" size="sm" onClick={() => setIsOpen(!isOpen)}><ChevronDown className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} /></Button>
            </div>
            {isOpen && (
                <div className="p-4 border-t border-border">
                    <AssetFormRenderer assetType={item.type} index={index} control={control} errors={errors} />
                </div>
            )}
        </div>
    );
};


// --- Main Views ---

const AssetDetailView: React.FC<{
    site: Organization;
    initialAssets: Asset[];
    onSave: (siteId: string, assets: Asset[]) => Promise<void>;
    onBack: () => void;
    setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}> = ({ site, initialAssets, onSave, onBack, setToast }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);
    const { control, handleSubmit, reset, formState: { errors } } = useForm<{ assets: Asset[] }>();
    const { fields, append, remove } = useFieldArray({ control, name: "assets" });

    useEffect(() => {
        reset({ assets: initialAssets });
    }, [initialAssets, reset]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
                setIsAddMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddAsset = (type: AssetType) => {
        const newAssetBase = { id: `new_${type}_${Date.now()}`, type };
        let newAsset: Asset;
        switch (type) {
            case 'Phone': newAsset = { ...newAssetBase, type: 'Phone', brand: '', condition: '', chargerStatus: '', displayStatus: '', bodyStatus: '', imei: '', color: '' }; break;
            case 'Sim': newAsset = { ...newAssetBase, type: 'Sim', number: '' }; break;
            case 'Computer': newAsset = { ...newAssetBase, type: 'Computer', computerType: '', brand: '', condition: '', bagStatus: '', mouseStatus: '', chargerStatus: '', displayStatus: '', bodyStatus: '', serialNumber: '', windowsKey: '', officeStatus: '', antivirusStatus: '' }; break;
            case 'IdCard': newAsset = { ...newAssetBase, type: 'IdCard', issueDate: '' }; break;
            case 'Petrocard': newAsset = { ...newAssetBase, type: 'Petrocard', number: '' }; break;
            case 'Vehicle': newAsset = { ...newAssetBase, type: 'Vehicle', vehicleType: '', brand: '', dlNumber: '', condition: '', kmsAtIssue: null, vehicleNumber: '', chassisNumber: '', insuranceValidity: '', pollutionCertValidity: '', finesStatus: '' }; break;
            case 'Tools': newAsset = { ...newAssetBase, type: 'Tools', toolList: [] }; break;
            case 'Other': newAsset = { ...newAssetBase, type: 'Other', name: '', brand: '', model: '', serialNumber: '', condition: '', issueCondition: '', accessories: '' }; break;
            default: return;
        }
        append(newAsset);
        setIsAddMenuOpen(false);
    };

    const handleSaveSubmit = async (data: { assets: Asset[] }) => {
        setIsSaving(true);
        try {
            await onSave(site.id, data.assets);
        } catch (error) {
            // Toast is shown by parent
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit(handleSaveSubmit)}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                    <Button type="button" onClick={onBack} variant="outline" size="sm" className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                    <h3 className="text-xl font-semibold text-primary-text">Managing Assets for: {site.shortName}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={addMenuRef}>
                        <Button type="button" onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}><Plus className="mr-2 h-4 w-4" /> Add Asset</Button>
                        {isAddMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-card border rounded-lg shadow-lg z-10">
                                {assetTypeOptions.map(opt => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-page flex items-center gap-3"
                                        onClick={() => handleAddAsset(opt.key)}
                                    >
                                        <opt.icon className="h-4 w-4 text-muted" />
                                        <span>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <Button type="submit" isLoading={isSaving}><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
                </div>
            </div>
            <div className="space-y-4">
                {fields.length > 0 ? (
                    fields.map((field, index) => <AssetAccordionItem key={field.id} item={field as Asset} index={index} control={control} errors={errors} remove={remove} />)
                ) : (
                    <div className="text-center p-8 text-muted bg-page rounded-lg">No assets found for this site. Click "Add Asset" to begin.</div>
                )}
            </div>
        </form>
    );
};

const AssetListView: React.FC<{
    sites: Organization[];
    allAssets: Record<string, Asset[]>;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onViewDetails: (siteId: string) => void;
}> = ({ sites, allAssets, searchTerm, setSearchTerm, onViewDetails }) => {
    const generateAssetSummary = (assets: Asset[] = []): string => {
        if (!assets || assets.length === 0) return 'No assets assigned.';
        const countByType = assets.reduce((acc, asset) => {
            acc[asset.type] = (acc[asset.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(countByType).map(([type, count]) => `${count} ${type}(s)`).join(', ');
    };
    return (
         <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-semibold text-primary-text">Asset Overview</h3>
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
                            <th className="px-4 py-3 text-left font-medium text-muted">Asset Summary</th>
                            <th className="px-4 py-3 text-left font-medium text-muted">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sites.map(site => (
                            <tr key={site.id}>
                                <td className="px-4 py-3 font-medium">{site.shortName}</td>
                                <td className="px-4 py-3 text-muted">{generateAssetSummary(allAssets[site.id])}</td>
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

const AssetConfig: React.FC = () => {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const [allSites, setAllSites] = useState<Organization[]>([]);
    const [allAssets, setAllAssets] = useState<Record<string, Asset[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    useEffect(() => {
        setIsLoading(true);
        Promise.all([api.getOrganizations(), api.getAllSiteAssets()])
            .then(([sitesData, assetsData]) => {
                setAllSites(sitesData.sort((a,b) => a.shortName.localeCompare(b.shortName)));
                setAllAssets(assetsData);
            })
            .catch(() => setToast({ message: 'Failed to load asset configuration.', type: 'error' }))
            .finally(() => setIsLoading(false));
    }, []);
    
    const handleSave = async (siteId: string, assets: Asset[]) => {
        try {
            await api.updateSiteAssets(siteId, assets);
            setAllAssets(prev => ({...prev, [siteId]: assets}));
            setToast({ message: 'Assets saved successfully.', type: 'success' });
        } catch (error) {
            setToast({ message: 'Failed to save assets.', type: 'error' });
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
                <AssetDetailView 
                    site={allSites.find(s => s.id === selectedSiteId)!}
                    initialAssets={allAssets[selectedSiteId] || []}
                    onSave={handleSave}
                    onBack={() => setView('list')}
                    setToast={setToast}
                />
            ) : (
                 <AssetListView
                    sites={filteredSites}
                    allAssets={allAssets}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    onViewDetails={handleViewDetails}
                />
            )}
        </div>
    );
};

export default AssetConfig;
