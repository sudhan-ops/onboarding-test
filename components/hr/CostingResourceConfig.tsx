import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Plus, Trash2, Save, Loader2, Download, Upload } from 'lucide-react';
import { api } from '../../services/api';
import type { Organization } from '../../types';
import Toast from '../ui/Toast';


// Updated type
type CostingResource = {
    id: string;
    siteId: string;
    designation: string;
    quantity: number | null;
    billingRate: number | null;
    billingModel: string;
    holidayBillingPolicy: string;
    holidayPaymentPolicy: string;
    uniformDeduction: string;
};

type FormData = {
    resources: CostingResource[];
    serviceChargePercentage: number;
};

const CSV_HEADERS = ['Site Name', 'Designation', 'Quantity', 'Billing Rate', 'Billing Model', 'Holiday Billing Policy', 'Holiday Payment Policy', 'Uniform Deduction'];

const toCSV = (data: Record<string, any>[]): string => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const val = String(row[header] ?? '');
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(',')
        )
    ];
    return csvRows.join('\n');
};

const fromCSV = (csvText: string): Record<string, string>[] => {
    const lines = csvText.trim().replace(/\r/g, '').split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const row: Record<string, string> = {};
        const values = lines[i].match(/(?<=,|^)(?:"(?:[^"]|"")*"|[^,]*)/g) || [];
        
        headers.forEach((header, index) => {
            let value = (values[index] || '').trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1).replace(/""/g, '""');
            }
            row[header] = value;
        });
        rows.push(row);
    }
    return rows;
};


const CostingResourceConfig: React.FC = () => {
    const [sites, setSites] = useState<Organization[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(true);
    const [isLoadingManpower, setIsLoadingManpower] = useState(false);
    const [designationsBySite, setDesignationsBySite] = useState<Record<string, string[]>>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const importRef = useRef<HTMLInputElement>(null);

    const { register, control, handleSubmit, watch, setValue } = useForm<FormData>({
        defaultValues: {
            resources: [],
            serviceChargePercentage: 10,
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "resources",
    });

    useEffect(() => {
        api.getOrganizations()
            .then(setSites)
            .finally(() => setIsLoadingSites(false));
    }, []);

    const handleSiteChange = async (siteId: string) => {
        if (!siteId) {
            replace([]); // Clear if no site is selected
            return;
        }
        setIsLoadingManpower(true);
        try {
            const details = await api.getManpowerDetails(siteId);
            const newResources: CostingResource[] = details
                .filter(d => d.count > 0) // Only add resources with a count > 0
                .map(d => ({
                    id: `res_${d.designation.replace(/\s/g, '_')}_${Date.now()}`,
                    siteId: siteId,
                    designation: d.designation,
                    quantity: d.count,
                    billingRate: null,
                    billingModel: 'Per Month',
                    holidayBillingPolicy: '',
                    holidayPaymentPolicy: '',
                    uniformDeduction: 'Yes'
                }));

            if (!designationsBySite[siteId]) {
                const fetchedDesignations = details.map(d => d.designation);
                setDesignationsBySite(prev => ({...prev, [siteId]: fetchedDesignations}));
            }

            replace(newResources);
        } catch (e) {
            console.error("Failed to load manpower", e);
             setToast({ message: 'Failed to load manpower details.', type: 'error' });
        } finally {
            setIsLoadingManpower(false);
        }
    };
    
    const handleRowSiteChange = async (siteId: string, index: number) => {
        setValue(`resources.${index}.designation`, '');
        
        if (siteId && !designationsBySite[siteId]) {
            try {
                const details = await api.getManpowerDetails(siteId);
                const newDesignations = details.map(d => d.designation);
                setDesignationsBySite(prev => ({...prev, [siteId]: newDesignations}));
            } catch (e) {
                console.error(`Failed to load designations for site ${siteId}`, e);
            }
        }
    };

    const watchedResources = watch("resources");
    const watchedServiceCharge = watch("serviceChargePercentage");

    const handleAddResource = () => {
        append({
            id: `res_${Date.now()}`,
            siteId: '',
            designation: '',
            quantity: 1,
            billingRate: 0,
            billingModel: 'Per Month',
            holidayBillingPolicy: '',
            holidayPaymentPolicy: '',
            uniformDeduction: 'Yes',
        });
    };
    
    const { subTotal, serviceCharge, grandTotal } = React.useMemo(() => {
        const resources = Array.isArray(watchedResources) ? watchedResources : [];
        const subTotalCalc = resources.reduce((acc, resource) => {
            const quantity = Number(resource.quantity) || 0;
            const rate = Number(resource.billingRate) || 0;
            return acc + (quantity * rate);
        }, 0);
        const serviceChargePercentage = Number(watchedServiceCharge) || 0;
        const serviceChargeCalc = subTotalCalc * (serviceChargePercentage / 100);
        const grandTotalCalc = subTotalCalc + serviceChargeCalc;
        return { subTotal: subTotalCalc, serviceCharge: serviceChargeCalc, grandTotal: grandTotalCalc };
    }, [watchedResources, watchedServiceCharge]);
    
    const handleDownloadTemplate = () => {
        const templateData = [Object.fromEntries(CSV_HEADERS.map(h => [h, '']))];
        const csvString = toCSV(templateData);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'costing_resource_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                if (!text) throw new Error("File is empty.");

                const parsedData = fromCSV(text);
                if (parsedData.length === 0) throw new Error("No data rows found in CSV.");

                const fileHeaders = Object.keys(parsedData[0]);
                const hasAllHeaders = CSV_HEADERS.every(h => fileHeaders.includes(h));
                if (!hasAllHeaders) throw new Error('CSV file is missing required headers.');

                const siteNameToIdMap = new Map(sites.map(s => [s.shortName.toLowerCase(), s.id]));
                const uniqueSiteIdsInCSV = new Set<string>();

                for (const row of parsedData) {
                    const siteName = row['Site Name']?.trim().toLowerCase();
                    if (siteName) {
                        const siteId = siteNameToIdMap.get(siteName);
                        if (typeof siteId === 'string') {
                            uniqueSiteIdsInCSV.add(siteId);
                        }
                    }
                }

                const sitesToFetch = [...uniqueSiteIdsInCSV].filter(id => !designationsBySite[id]);
                if (sitesToFetch.length > 0) {
                    const designationPromises = sitesToFetch.map(id => api.getManpowerDetails(id).then(details => ({ siteId: id, designations: details.map(d => d.designation) })));
                    const results = await Promise.all(designationPromises);
                    setDesignationsBySite(prev => {
                        const newDesignations = { ...prev };
                        results.forEach(res => { newDesignations[res.siteId] = res.designations; });
                        return newDesignations;
                    });
                }
                
                const newResources: CostingResource[] = parsedData.map(row => {
                    const siteName = row['Site Name']?.trim().toLowerCase();
                    const siteId = siteName ? siteNameToIdMap.get(siteName) : undefined;
                    if (!siteId) return null;

                    return {
                        id: `res_imported_${Date.now()}_${Math.random()}`,
                        siteId: siteId,
                        designation: row['Designation'] || '',
                        quantity: parseFloat(row['Quantity']) || 0,
                        billingRate: parseFloat(row['Billing Rate']) || 0,
                        billingModel: row['Billing Model'] || 'Per Month',
                        holidayBillingPolicy: row['Holiday Billing Policy'] || '',
                        holidayPaymentPolicy: row['Holiday Payment Policy'] || '',
                        uniformDeduction: row['Uniform Deduction'] || 'Yes',
                    };
                }).filter((r): r is CostingResource => r !== null);
                
                replace(newResources);
                setToast({ message: `Successfully imported ${newResources.length} resources.`, type: 'success' });

            } catch (error: any) {
                setToast({ message: error.message || 'Failed to import CSV.', type: 'error' });
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const onSubmit = (data: FormData) => {
        console.log("Saving Costing & Resource Data:", data);
        setToast({ message: 'Configuration saved successfully (mocked).', type: 'success' });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
             <input type="file" ref={importRef} className="hidden" accept=".csv" onChange={handleFileImport} />
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h3 className="text-xl font-semibold text-primary-text">Costing & Resource Configuration</h3>
                <div className="relative flex-1 md:max-w-xs">
                     <Select label="Load Manpower from Site" id="site-selector" onChange={e => handleSiteChange(e.target.value)} disabled={isLoadingSites || isLoadingManpower}>
                        <option value="">-- Select a Site --</option>
                        {sites.map(site => <option key={site.id} value={site.id}>{site.shortName}</option>)}
                    </Select>
                    {isLoadingManpower && <Loader2 className="absolute right-3 top-9 h-5 w-5 animate-spin text-muted" />}
                </div>
            </div>
             <div className="grid grid-cols-4 gap-2 md:flex md:flex-wrap md:justify-end md:gap-2">
                <Button type="button" variant="outline" onClick={handleDownloadTemplate} className="!p-2 justify-center md:!px-4 md:!py-2" title="Download Template">
                    <Download className="h-5 w-5 md:mr-2" />
                    <span className="hidden md:inline">Template</span>
                </Button>
                <Button type="button" variant="outline" onClick={() => importRef.current?.click()} className="!p-2 justify-center md:!px-4 md:!py-2" title="Import">
                    <Upload className="h-5 w-5 md:mr-2" />
                    <span className="hidden md:inline">Import</span>
                </Button>
                <Button type="button" variant="outline" onClick={handleAddResource} className="!p-2 justify-center md:!px-4 md:!py-2" title="Add Resource">
                    <Plus className="h-5 w-5 md:mr-2" />
                    <span className="hidden md:inline">Add Resource</span>
                </Button>
                <Button type="submit" className="!p-2 justify-center md:!px-4 md:!py-2" title="Save">
                    <Save className="h-5 w-5 md:mr-2" />
                    <span className="hidden md:inline">Save</span>
                </Button>
            </div>

            <div className="space-y-4">
                {fields.map((field, index) => {
                    const selectedSiteForRow = watch(`resources.${index}.siteId`);
                    return (
                        <div key={field.id} className="p-4 border border-border rounded-xl relative bg-page/50">
                            <Button
                                type="button"
                                variant="icon"
                                size="sm"
                                onClick={() => remove(index)}
                                className="absolute top-2 right-2"
                                aria-label="Remove Resource"
                            >
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <Controller
                                    control={control}
                                    name={`resources.${index}.siteId`}
                                    render={({ field: controllerField }) => (
                                        <Select 
                                            label="Site" 
                                            id={`res-site-${index}`} 
                                            {...controllerField}
                                            onChange={e => {
                                                controllerField.onChange(e); // RHF internal update
                                                handleRowSiteChange(e.target.value, index);
                                            }}
                                        >
                                            <option value="">Select Site</option>
                                            {sites.map(site => <option key={site.id} value={site.id}>{site.shortName}</option>)}
                                        </Select>
                                    )}
                                />
                                <Select label="Designation" id={`res-desig-${index}`} {...register(`resources.${index}.designation`)} disabled={!selectedSiteForRow}>
                                    <option value="">Select Designation</option>
                                    {(designationsBySite[selectedSiteForRow] || []).map(d => <option key={d} value={d}>{d}</option>)}
                                </Select>
                                <Input label="Quantity" id={`res-qty-${index}`} type="number" step="0.01" {...register(`resources.${index}.quantity`)} />
                                <Input label="Billing Rate" id={`res-rate-${index}`} type="number" step="0.01" {...register(`resources.${index}.billingRate`)} />
                                <Select label="Billing Model" id={`res-billing-${index}`} {...register(`resources.${index}.billingModel`)}>
                                    <option>Per Month</option>
                                    <option>Per Day</option>
                                    <option>Per Hour</option>
                                    <option>Lumpsum</option>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div>
                                    <label htmlFor={`res-hol-bill-${index}`} className="block text-sm font-medium text-muted">Holiday Billing Policy</label>
                                    <textarea id={`res-hol-bill-${index}`} {...register(`resources.${index}.holidayBillingPolicy`)} rows={3} className="mt-1 form-input" />
                                </div>
                                <div>
                                    <label htmlFor={`res-hol-pay-${index}`} className="block text-sm font-medium text-muted">Holiday Payment Policy</label>
                                    <textarea id={`res-hol-pay-${index}`} {...register(`resources.${index}.holidayPaymentPolicy`)} rows={3} className="mt-1 form-input" />
                                </div>
                                <Select label="Uniform Deduction" id={`res-uniform-${index}`} {...register(`resources.${index}.uniformDeduction`)}>
                                    <option>Yes</option>
                                    <option>No</option>
                                </Select>
                            </div>
                        </div>
                    );
                })}
            </div>

            {fields.length > 0 && (
                <div className="flex justify-end pt-4 border-t border-border">
                    <div className="w-full max-w-sm space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted font-medium">Sub Total</span>
                            <span className="font-semibold text-primary-text">{subTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                             <div className="flex items-center gap-2">
                                <span className="text-muted font-medium">Service Charges</span>
                                <div className="w-20"><Input aria-label="Service charge percentage" id="service-charge-perc" type="number" {...register('serviceChargePercentage')} /></div>
                                <span className="text-muted font-medium">%</span>
                            </div>
                            <span className="font-semibold text-primary-text">{serviceCharge.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-primary-text">
                            <span className="font-bold text-lg">Grand Total</span>
                            <span className="font-bold text-lg">{grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                        </div>
                    </div>
                </div>
            )}
            
            {fields.length === 0 && (
                <div className="text-center p-8 text-muted bg-page rounded-lg">
                    {isLoadingSites ? <Loader2 className="h-5 w-5 animate-spin mx-auto"/> : 'Select a site to load manpower or click "Add Resource" to begin.'}
                </div>
            )}
        </form>
    );
};

export default CostingResourceConfig;