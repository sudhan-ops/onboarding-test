import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import type { Organization, MasterGentsUniforms, GentsPantsSize, GentsShirtSize, MasterLadiesUniforms, LadiesPantsSize, LadiesShirtSize, UniformRequest, UniformRequestItem, EmployeeUniformSelection } from '../../types';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Toast from '../../components/ui/Toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { Loader2, Plus, Shirt, Edit, Trash2, X, Save, ArrowLeft, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';

type UniformFormData = {
    siteId: string;
    gender: 'Gents' | 'Ladies';
    pantsQuantities: Record<string, number | null>;
    shirtsQuantities: Record<string, number | null>;
};

const UniformStatusChip: React.FC<{ status: UniformRequest['status'] }> = ({ status }) => {
    const darkStyles: Record<UniformRequest['status'], string> = {
      'Pending': 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/50',
      'Approved': 'bg-blue-900/50 text-blue-300 border border-blue-500/50',
      'Issued': 'bg-green-900/50 text-green-300 border border-green-500/50',
      'Rejected': 'bg-red-900/50 text-red-300 border border-red-500/50',
    };
    return <span className={`fo-status-badge ${darkStyles[status]}`}>{status}</span>;
};

const UniformSizeTable: React.FC<{
    title: string;
    sizes: (GentsPantsSize | GentsShirtSize | LadiesPantsSize | LadiesShirtSize)[];
    headers: { key: string, label: string }[];
    control: any;
    quantityType: 'pantsQuantities' | 'shirtsQuantities';
}> = ({ title, sizes, headers, control, quantityType }) => {
    const fits = Array.from(new Set(sizes.map(s => s.fit)));
    const sizeKeys = Array.from(new Set(sizes.map(s => s.size))).sort((a,b) => {
        const numA = parseInt(String(a));
        const numB = parseInt(String(b));
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        return String(a).localeCompare(String(b));
    });

    return (
        <div className="border border-border rounded-lg">
            <h4 className="p-3 font-semibold bg-accent text-white border-b border-accent">{title}</h4>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-page">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted">Size</th>
                            {headers.map(h => <th key={String(h.key)} className="px-3 py-2 text-left font-medium text-muted">{h.label}</th>)}
                            <th className="px-3 py-2 text-left font-medium text-muted w-24">Quantity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sizeKeys.map(size => (
                            <React.Fragment key={size}>
                                {fits.map((fit, fitIndex) => {
                                    const sizeForFit = sizes.find(s => s.size === size && s.fit === fit);
                                    if (!sizeForFit) return null;
                                    return (
                                        <tr key={sizeForFit.id}>
                                            {fitIndex === 0 && <td rowSpan={fits.filter(f => sizes.some(s => s.size === size && s.fit === f)).length} className="px-3 py-2 align-middle font-semibold border-r">{size}</td>}
                                            {headers.map(h => <td key={String(h.key)} className="px-3 py-2">{(sizeForFit as any)[h.key]}</td>)}
                                            <td className="px-3 py-2">
                                                <Controller
                                                    name={`${quantityType}.${sizeForFit.id}`}
                                                    control={control}
                                                    render={({ field }) => <Input aria-label={`Quantity for ${title} size ${size} ${fit}`} type="number" {...field} value={field.value || ''} onChange={e => field.onChange(parseInt(e.target.value) || null)} className="!py-1.5" />}
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
        </div>
    );
};

const UniformRequestForm: React.FC<{
    onSave: (data: UniformRequest) => void,
    onCancel: () => void,
    sites: Organization[],
    masterUniforms: { gents: MasterGentsUniforms, ladies: MasterLadiesUniforms },
    initialData?: UniformRequest | null,
}> = ({ onSave, onCancel, sites, masterUniforms, initialData }) => {
    const { register, control, handleSubmit, watch, reset } = useForm<UniformFormData>({
        defaultValues: { siteId: '', gender: 'Gents', pantsQuantities: {}, shirtsQuantities: {} }
    });
    
    const { data: onboardingData } = useOnboardingStore();
    const { user } = useAuthStore();

    const gender = watch('gender');
    const siteId = watch('siteId');

    useEffect(() => {
        if (initialData) {
            const pantsQuantities: Record<string, number | null> = {};
            const shirtsQuantities: Record<string, number | null> = {};
            initialData.items.forEach(item => {
                if (item.category === 'Pants') {
                    pantsQuantities[item.sizeId] = item.quantity;
                } else {
                    shirtsQuantities[item.sizeId] = item.quantity;
                }
            });
            reset({
                siteId: initialData.siteId,
                gender: initialData.gender,
                pantsQuantities,
                shirtsQuantities
            });
        } else {
            // This is a new request, pre-populate from the onboarding store
            const defaultSiteId = onboardingData.organization.organizationId || '';
            const employeeGender = onboardingData.personal.gender;
            const defaultUniformGender = employeeGender === 'Female' ? 'Ladies' : 'Gents';

            reset({
                siteId: defaultSiteId,
                gender: defaultUniformGender,
                pantsQuantities: {},
                shirtsQuantities: {}
            });
        }
    }, [initialData, reset, onboardingData]);

    const onSubmit = (data: UniformFormData) => {
        const site = sites.find(s => s.id === data.siteId);
        if (!site || !user) return;

        const allSizes = gender === 'Gents' 
            ? [...masterUniforms.gents.pants, ...masterUniforms.gents.shirts]
            : [...masterUniforms.ladies.pants, ...masterUniforms.ladies.shirts];

        const items: UniformRequestItem[] = [];
        
        for (const [sizeId, quantity] of Object.entries(data.pantsQuantities)) {
            if (quantity && quantity > 0) {
                const sizeInfo = allSizes.find(s => s.id === sizeId);
                if (sizeInfo) items.push({ sizeId, quantity, category: 'Pants', sizeLabel: sizeInfo.size, fit: sizeInfo.fit });
            }
        }
        for (const [sizeId, quantity] of Object.entries(data.shirtsQuantities)) {
            if (quantity && quantity > 0) {
                const sizeInfo = allSizes.find(s => s.id === sizeId);
                if (sizeInfo) items.push({ sizeId, quantity, category: 'Shirts', sizeLabel: sizeInfo.size, fit: sizeInfo.fit });
            }
        }

        const request: UniformRequest = {
            id: initialData?.id || `new_${Date.now()}`,
            siteId: data.siteId,
            siteName: site.shortName,
            gender: data.gender,
            requestedDate: initialData?.requestedDate || new Date().toISOString(),
            status: initialData?.status || 'Pending',
            items: items,
            source: 'Individual', // This request comes from a single employee's onboarding
            requestedById: user.id,
            requestedByName: user.name,
            employeeDetails: [{
              employeeName: `${onboardingData.personal.firstName} ${onboardingData.personal.lastName}`,
              employeeId: onboardingData.personal.employeeId,
              items: items.map(i => ({ itemName: i.category, sizeLabel: i.sizeLabel, fit: i.fit, quantity: i.quantity }))
            }]
        };
        onSave(request);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select label="Select Site" value={siteId} {...register('siteId')} required disabled>
                        <option value="">-- Select a Site --</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.shortName}</option>)}
                    </Select>
                    <Select label="Select Uniform Type" value={gender} {...register('gender')} disabled>
                        <option>Gents</option>
                        <option>Ladies</option>
                    </Select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {gender === 'Gents' ? (
                        <>
                            <UniformSizeTable title="Gents' Pants" sizes={masterUniforms.gents.pants} headers={[{key:'length',label:'L'},{key:'waist',label:'W'},{key:'hip',label:'H'},{key:'fit',label:'Fit'}]} control={control} quantityType="pantsQuantities" />
                            <UniformSizeTable title="Gents' Shirts" sizes={masterUniforms.gents.shirts} headers={[{key:'length',label:'L'},{key:'sleeves',label:'S'},{key:'chest',label:'C'},{key:'fit',label:'Fit'}]} control={control} quantityType="shirtsQuantities" />
                        </>
                    ) : (
                         <>
                            <UniformSizeTable title="Ladies' Pants" sizes={masterUniforms.ladies.pants} headers={[{key:'length',label:'L'},{key:'waist',label:'W'},{key:'hip',label:'H'},{key:'fit',label:'Fit'}]} control={control} quantityType="pantsQuantities" />
                            <UniformSizeTable title="Ladies' Shirts" sizes={masterUniforms.ladies.shirts} headers={[{key:'length',label:'L'},{key:'sleeves',label:'S'},{key:'bust',label:'B'},{key:'shoulder',label:'Sh'},{key:'fit',label:'Fit'}]} control={control} quantityType="shirtsQuantities" />
                        </>
                    )}
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[#374151]">
                    <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button type="submit"><Save className="mr-2 h-4 w-4" /> Save Request</Button>
                </div>
            </div>
        </form>
    );
};

const UniformRequests: React.FC = () => {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [requests, setRequests] = useState<UniformRequest[]>([]);
    const [sites, setSites] = useState<Organization[]>([]);
    const [masterUniforms, setMasterUniforms] = useState<{ gents: MasterGentsUniforms, ladies: MasterLadiesUniforms } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [editingRequest, setEditingRequest] = useState<UniformRequest | null>(null);
    const [deletingRequest, setDeletingRequest] = useState<UniformRequest | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { updateUniforms } = useOnboardingStore();

    const cameFromOnboarding = searchParams.get('from') === 'onboarding';

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [reqs, sitesData, gentsData, ladiesData] = await Promise.all([
                api.getUniformRequests(),
                api.getOrganizations(),
                api.getMasterGentsUniforms(),
                api.getMasterLadiesUniforms(),
            ]);
            setRequests(reqs.sort((a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime()));
            setSites(sitesData);
            setMasterUniforms({ gents: gentsData, ladies: ladiesData });
        } catch (e) {
            setToast({ message: 'Failed to load uniform data.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (cameFromOnboarding) {
            setView('form');
            setEditingRequest(null);
        }
    }, [cameFromOnboarding]);

    const handleNewRequest = () => {
        setEditingRequest(null);
        setView('form');
    };

    const handleEdit = (request: UniformRequest) => {
        setEditingRequest(request);
        setView('form');
    };
    
    const handleSave = async (requestData: UniformRequest) => {
        if (cameFromOnboarding && masterUniforms) {
            const masterSizes = requestData.gender === 'Ladies' 
                ? [...masterUniforms.ladies.pants, ...masterUniforms.ladies.shirts]
                : [...masterUniforms.gents.pants, ...masterUniforms.gents.shirts];
            
            const selections: EmployeeUniformSelection[] = requestData.items.map(item => {
                const sizeInfo = masterSizes.find(s => s.id === item.sizeId);
                const itemName = item.category === 'Pants' ? `${requestData.gender}' Pants` : `${requestData.gender}' Shirts`;
                const itemId = `generic_${requestData.gender.toLowerCase()}_${item.category === 'Pants' ? 'pants' : 'shirts'}`;
                
                return {
                    itemId: itemId,
                    itemName: itemName,
                    sizeId: item.sizeId,
                    sizeLabel: sizeInfo?.size || '',
                    fit: sizeInfo?.fit || '',
                    quantity: item.quantity
                };
            });
    
            updateUniforms(selections);
             // Also submit the individual request to the main list
            await api.submitUniformRequest(requestData);
            navigate(-1); // Go back to UniformDetails page
            return;
        }

        try {
            if (requestData.id.startsWith('new_')) {
                await api.submitUniformRequest(requestData);
                setToast({ message: 'New request submitted.', type: 'success' });
            } else {
                await api.updateUniformRequest(requestData);
                setToast({ message: 'Request updated.', type: 'success' });
            }
            setView('list');
            fetchData();
        } catch (e) {
             setToast({ message: 'Failed to save request.', type: 'error' });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingRequest) return;
        try {
            await api.deleteUniformRequest(deletingRequest.id);
            setToast({ message: 'Request deleted.', type: 'success' });
            setDeletingRequest(null);
            fetchData();
        } catch (e) {
            setToast({ message: 'Failed to delete request.', type: 'error' });
        }
    };
    
    const totalItems = (items: UniformRequestItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);

    if (isLoading || !masterUniforms) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted" /></div>;
    }

    if (view === 'form') {
        const handleCancel = () => {
            if (cameFromOnboarding) {
                navigate(-1);
            } else {
                setView('list');
            }
        };

        return (
            <div className="h-full flex flex-col">
                 <header className="p-4 flex-shrink-0 flex items-center gap-4 fo-mobile-header">
                    <button onClick={handleCancel} aria-label="Go back">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1>{editingRequest ? 'Edit' : 'New'} Request</h1>
                </header>
                <main className="flex-1 overflow-y-auto p-4">
                    <UniformRequestForm
                        onSave={handleSave}
                        onCancel={handleCancel}
                        sites={sites}
                        masterUniforms={masterUniforms}
                        initialData={editingRequest}
                    />
                </main>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            <Modal isOpen={!!deletingRequest} onClose={() => setDeletingRequest(null)} onConfirm={handleConfirmDelete} title="Confirm Deletion">
                Are you sure you want to delete this uniform request? This cannot be undone.
            </Modal>

            <header className="p-4 flex-shrink-0 flex items-center justify-between fo-mobile-header">
                <h1 className="text-lg font-semibold">Uniform Requests</h1>
                <button onClick={handleNewRequest} aria-label="New Uniform Request">
                    <UserPlus className="h-6 w-6" />
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-3">
                {requests.length > 0 ? (
                    requests.map(req => (
                        <div key={req.id} className="bg-[#243524] p-3 rounded-xl border border-[#374151]">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-white">{req.siteName}</p>
                                    <p className="text-xs text-gray-400">{format(new Date(req.requestedDate), 'dd MMM, yyyy')}</p>
                                </div>
                                <UniformStatusChip status={req.status} />
                            </div>
                            <div className="mt-3 flex justify-between items-end">
                                <div className="text-sm text-gray-300">
                                    <p>{req.gender} Uniforms</p>
                                    <p className="font-semibold">{totalItems(req.items)} Items</p>
                                </div>
                                {req.status === 'Pending' && (
                                    <div className="flex items-center gap-2">
                                        <Button variant="icon" size="sm" onClick={() => handleEdit(req)}><Edit className="h-4 w-4 text-gray-400" /></Button>
                                        <Button variant="icon" size="sm" onClick={() => setDeletingRequest(req)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-muted pt-16">
                        <Shirt className="h-12 w-12 mx-auto mb-4" />
                        <p>No uniform requests found.</p>
                        <Button onClick={handleNewRequest} className="mt-4">
                            <Plus className="mr-2 h-4 w-4" /> Create First Request
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default UniformRequests;
