import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useOnboardingStore } from '../../store/onboardingStore';
import { api } from '../../services/api';
import type { SiteUniformDetailsConfig, MasterGentsUniforms, MasterLadiesUniforms, EmployeeUniformSelection } from '../../types';
import FormHeader from '../../components/onboarding/FormHeader';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { Loader2, Shirt, Plus, Edit } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface OutletContext {
  onValidated: () => Promise<void>;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

type FormData = {
    uniforms: {
        itemId: string;
        itemName: string;
        category: 'Pants' | 'Shirts';
        sizeId: string;
        quantity: number;
    }[];
};

const UniformDetails = () => {
    const { onValidated, setToast } = useOutletContext<OutletContext>();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { data: onboardingData, updateUniforms } = useOnboardingStore();
    const isMobile = useMediaQuery('(max-width: 767px)');
    
    const [isLoading, setIsLoading] = useState(true);
    const [configs, setConfigs] = useState<{
        details: Record<string, SiteUniformDetailsConfig>;
        gents: MasterGentsUniforms;
        ladies: MasterLadiesUniforms;
    } | null>(null);

    const { gender } = onboardingData.personal;
    const { organizationId, department, designation } = onboardingData.organization;

    const { control, handleSubmit, reset, watch } = useForm<FormData>();
    const { fields, replace } = useFieldArray({ control, name: "uniforms" });
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [details, gents, ladies] = await Promise.all([
                    api.getAllSiteUniformDetails(),
                    api.getMasterGentsUniforms(),
                    api.getMasterLadiesUniforms(),
                ]);
                setConfigs({ details, gents, ladies });
            } catch (error) {
                setToast({ message: 'Failed to load uniform configuration.', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [setToast]);

    const requiredItems = useMemo(() => {
        if (!configs || !organizationId || !department || !designation) return [];
        
        const siteConfig = configs.details[organizationId];
        if (!siteConfig) return [];

        const deptConfig = siteConfig.departments.find(d => d.department === department);
        if (!deptConfig) return [];

        const desigConfig = deptConfig.designations.find(d => d.designation === designation);
        return desigConfig?.items || [];
    }, [configs, organizationId, department, designation]);

    useEffect(() => {
        const itemsToRender = requiredItems.map(item => {
            const existing = onboardingData.uniforms.find(u => u.itemId === item.id);
            const category: 'Pants' | 'Shirts' = item.name.toLowerCase().includes('pant') ? 'Pants' : 'Shirts';
            return {
                itemId: item.id,
                itemName: item.name,
                category: category,
                sizeId: existing?.sizeId || '',
                quantity: existing?.quantity || 1,
            };
        });
        replace(itemsToRender);
    }, [requiredItems, onboardingData.uniforms, replace]);

    // This effect syncs the form state back to the Zustand store on change, with a debounce.
    useEffect(() => {
        let debounceTimer: number;
        const subscription = watch((value) => {
            clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                const formData = value as FormData;
                const masterSizes = gender === 'Female' 
                    ? [...(configs?.ladies.pants || []), ...(configs?.ladies.shirts || [])]
                    : [...(configs?.gents.pants || []), ...(configs?.gents.shirts || [])];
                const selections: EmployeeUniformSelection[] = (formData.uniforms || [])
                    .filter(u => u.sizeId && u.quantity > 0)
                    .map(uniform => {
                        const sizeInfo = masterSizes.find(s => s.id === uniform.sizeId);
                        return {
                            itemId: uniform.itemId,
                            itemName: uniform.itemName,
                            sizeId: uniform.sizeId,
                            sizeLabel: sizeInfo?.size || '',
                            fit: sizeInfo?.fit || '',
                            quantity: uniform.quantity,
                        };
                    });
                updateUniforms(selections);
            }, 500);
        });
        return () => {
            subscription.unsubscribe();
            clearTimeout(debounceTimer);
        };
    }, [watch, updateUniforms, gender, configs]);


    const onSubmit = async (formData: FormData) => {
        const masterSizes = gender === 'Female' 
            ? [...(configs?.ladies.pants || []), ...(configs?.ladies.shirts || [])]
            : [...(configs?.gents.pants || []), ...(configs?.gents.shirts || [])];
            
        const selections: EmployeeUniformSelection[] = formData.uniforms
            .filter(u => u.sizeId && u.quantity > 0)
            .map(uniform => {
                const sizeInfo = masterSizes.find(s => s.id === uniform.sizeId);
                return {
                    itemId: uniform.itemId,
                    itemName: uniform.itemName,
                    sizeId: uniform.sizeId,
                    sizeLabel: sizeInfo?.size || '',
                    fit: sizeInfo?.fit || '',
                    quantity: uniform.quantity,
                };
            });

        updateUniforms(selections);
        await onValidated();
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
    }
    
    // State 3: No predefined items, but items have been selected via the request page
    if (requiredItems.length === 0 && onboardingData.uniforms.length > 0) {
        return (
            <form onSubmit={async (e) => { e.preventDefault(); await onValidated(); }} id="uniform-form">
                {!isMobile && <FormHeader title="Uniform Details" subtitle="The following items have been selected for this employee." />}
                <div className="space-y-4">
                    {onboardingData.uniforms.map(item => (
                        <div key={item.itemId + item.sizeId} className={`p-4 border rounded-lg flex justify-between items-center ${isMobile ? 'bg-[#243524] border-border' : 'bg-page'}`}>
                            <div>
                                <p className={`font-semibold ${isMobile ? 'text-white' : 'text-primary-text'}`}>{item.itemName}</p>
                                <p className={`text-sm ${isMobile ? 'text-gray-400' : 'text-muted'}`}>Size: {item.sizeLabel}, Fit: {item.fit}, Quantity: {item.quantity}</p>
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => navigate('/onboarding/uniforms?from=onboarding')}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Uniform Selection
                    </Button>
                </div>
            </form>
        );
    }


    if (!gender || requiredItems.length === 0) {
        const message = !gender 
            ? "Please select a gender in 'Personal Details' to view uniform options."
            : "No uniform requirements found for the selected site, department, and designation.";

        const canCreateRequest = gender && requiredItems.length === 0;

        return (
            <form onSubmit={async (e) => { e.preventDefault(); await onValidated(); }} id="uniform-form">
                {!isMobile && <FormHeader title="Uniform Details" subtitle="Provide uniform measurements for the employee." />}
                <div className={`text-center p-8 rounded-lg ${isMobile ? '' : 'bg-page'}`}>
                    <Shirt className={`h-12 w-12 mx-auto ${isMobile ? 'text-gray-500' : 'text-muted'}`} />
                    <p className={`mt-4 ${isMobile ? 'text-gray-400' : 'text-muted'}`}>{message}</p>
                     {canCreateRequest && (
                        <div className="mt-6">
                            <p className={`text-sm mb-4 ${isMobile ? 'text-gray-500' : 'text-muted'}`}>You can proceed to the next step, or create a new site-level request if uniforms are needed.</p>
                            <Button type="button" onClick={() => navigate('/onboarding/uniforms?from=onboarding')}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Site Uniform Request
                            </Button>
                        </div>
                    )}
                </div>
            </form>
        );
    }
    
    const masterSizes = gender === 'Female' ? configs?.ladies : configs?.gents;

    if (isMobile) {
        return (
            <form onSubmit={handleSubmit(onSubmit)} id="uniform-form">
                <p className="text-sm text-gray-400 mb-6">Provide uniform measurements for the employee.</p>
                <div className="space-y-4">
                    {fields.map((field, index) => {
                        const sizeOptions = field.category === 'Pants' ? masterSizes?.pants : masterSizes?.shirts;
                        return (
                             <div key={field.id} className="p-4 border border-border rounded-xl space-y-4">
                                <h4 className="font-semibold text-primary-text">{field.itemName}</h4>
                                <Controller name={`uniforms.${index}.sizeId`} control={control} render={({ field: controllerField }) => (
                                    <select {...controllerField} className="pro-select pro-select-arrow">
                                        <option value="">-- Select Size --</option>
                                        {sizeOptions?.map(size => (
                                            <option key={size.id} value={size.id}>Size: {size.size} - {size.fit}</option>
                                        ))}
                                    </select>
                                )} />
                                 <Controller name={`uniforms.${index}.quantity`} control={control} render={({ field: controllerField }) => (
                                    <input type="number" min="1" {...controllerField} className="form-input"/>
                                )} />
                            </div>
                        );
                    })}
                </div>
            </form>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} id="uniform-form">
            <FormHeader title="Uniform Details" subtitle="Provide uniform measurements for the employee." />
            <div className="space-y-6">
                {fields.map((field, index) => {
                    const sizeOptions = field.category === 'Pants' ? masterSizes?.pants : masterSizes?.shirts;
                    return (
                        <div key={field.id} className="p-4 border border-border rounded-xl bg-page/50">
                            <h4 className="font-semibold text-primary-text mb-2">{field.itemName}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Controller
                                    name={`uniforms.${index}.sizeId`}
                                    control={control}
                                    rules={{ required: 'Please select a size' }}
                                    render={({ field: controllerField, fieldState }) => (
                                        <Select label="Size & Fit" error={fieldState.error?.message} {...controllerField}>
                                            <option value="">-- Select Size --</option>
                                            {sizeOptions?.map(size => (
                                                <option key={size.id} value={size.id}>
                                                    Size: {size.size} - {size.fit}
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                />
                                <Controller
                                    name={`uniforms.${index}.quantity`}
                                    control={control}
                                    rules={{ required: true, min: 1 }}
                                    render={({ field: controllerField }) => (
                                        <Input label="Quantity" type="number" min="1" {...controllerField} />
                                    )}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </form>
    );
};

export default UniformDetails;