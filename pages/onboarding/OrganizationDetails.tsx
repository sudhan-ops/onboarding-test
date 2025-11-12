import React, { useState, useEffect } from 'react';
// Fix: Use inline type import for SubmitHandler
import { useForm, Controller, type SubmitHandler, type Resolver } from 'react-hook-form';
import { useOutletContext } from 'react-router-dom';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useOnboardingStore } from '../../store/onboardingStore';
import type { OrganizationDetails, Organization } from '../../types';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import FormHeader from '../../components/onboarding/FormHeader';
import DatePicker from '../../components/ui/DatePicker';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// Fix: Removed generic type argument from yup.object and yup.string
export const organizationDetailsSchema = yup.object({
    designation: yup.string().required('Designation is required'),
    department: yup.string().required('Department is required'),
    reportingManager: yup.string().optional(),
    organizationId: yup.string().required('Organization is required'),
    organizationName: yup.string().required(),
    joiningDate: yup.string().required('Joining date is required'),
    workType: yup.string().oneOf(['Full-time', 'Part-time', 'Contract', '']).required('Work type is required'),
    site: yup.string().optional(),
    defaultSalary: yup.number().nullable().optional(),
}).defined();

interface OutletContext {
  onValidated: () => Promise<void>;
}

const OrganizationDetails = () => {
    const { onValidated } = useOutletContext<OutletContext>();
    const { user } = useAuthStore();
    const { data, updateOrganization } = useOnboardingStore();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const isMobile = useMediaQuery('(max-width: 767px)');
    
    const { register, handleSubmit, formState: { errors }, control, watch, setValue, reset } = useForm<OrganizationDetails>({
        resolver: yupResolver(organizationDetailsSchema) as unknown as Resolver<OrganizationDetails>,
        defaultValues: data.organization,
    });
    
    const selectedOrgId = watch('organizationId');
    const designation = watch('designation');
    const isOrgPreselected = !!data.organization.organizationId;

    useEffect(() => {
        api.getOrganizations().then(setOrganizations);
    }, []);

    useEffect(() => {
        // Sync form with global store data, which might have been pre-filled
        reset(data.organization);
    }, [data.organization, reset]);

    // This effect syncs the form state back to the Zustand store on change, with a debounce.
    useEffect(() => {
        let debounceTimer: number;
        const subscription = watch((value) => {
            clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                updateOrganization(value as OrganizationDetails);
            }, 500);
        });
        return () => {
            subscription.unsubscribe();
            clearTimeout(debounceTimer);
        };
    }, [watch, updateOrganization]);


    useEffect(() => {
        const selectedOrg = organizations.find(o => o.id === selectedOrgId);
        if (selectedOrg) {
            setValue('organizationName', selectedOrg.shortName);
        }
    }, [selectedOrgId, organizations, setValue]);
    
    useEffect(() => {
        if (designation) {
            api.suggestDepartmentForDesignation(designation).then(suggestedDept => {
                if (suggestedDept) {
                    setValue('department', suggestedDept, { shouldValidate: true });
                }
            });
        }
    }, [designation, setValue]);


    const onSubmit: SubmitHandler<OrganizationDetails> = async (formData) => {
        updateOrganization(formData);
        await onValidated();
    };

    if (isMobile) {
        return (
            <form onSubmit={handleSubmit(onSubmit)} id="organization-form">
                 <div className="space-y-6">
                    <p className="text-sm text-gray-400">Provide the employment details for the new employee within the organization.</p>
                    <select {...register('organizationId')} className="pro-select pro-select-arrow" disabled={isOrgPreselected}>
                        <option value="">Select Organization</option>
                        {organizations.map(org => <option key={org.id} value={org.id}>{org.shortName}</option>)}
                    </select>
                    {errors.organizationId && <p className="mt-1 text-xs text-red-500">{errors.organizationId.message}</p>}

                    <input placeholder="Designation" {...register('designation')} className="form-input" />
                    <input placeholder="Department" {...register('department')} className="form-input" />
                    <input placeholder="Reporting Manager" {...register('reportingManager')} className="form-input" />

                    <Controller name="joiningDate" control={control} render={({ field }) => (
                         <input type="date" {...field} className="form-input" />
                    )} />
                    {errors.joiningDate && <p className="mt-1 text-xs text-red-500">{errors.joiningDate.message}</p>}

                    <select {...register('workType')} className="pro-select pro-select-arrow">
                        <option value="">Select Work Type</option>
                        <option>Full-time</option>
                        <option>Part-time</option>
                        <option>Contract</option>
                    </select>
                    {errors.workType && <p className="mt-1 text-xs text-red-500">{errors.workType.message}</p>}
                </div>
            </form>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} id="organization-form">
            <FormHeader title="Organization Details" subtitle="Your employment details within the organization." />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Select label="Organization / Client" id="organizationId" error={errors.organizationId?.message} registration={register('organizationId')} disabled={isOrgPreselected}>
                    <option value="">Select Organization</option>
                    {organizations.map(org => <option key={org.id} value={org.id}>{org.shortName}</option>)}
                </Select>
                <Input
                    label="Designation"
                    id="designation"
                    error={errors.designation?.message}
                    registration={register('designation')}
                />
                <Input
                    label="Department"
                    id="department"
                    error={errors.department?.message}
                    registration={register('department')}
                />
                <Input label="Reporting Manager" id="reportingManager" error={errors.reportingManager?.message} registration={register('reportingManager')} />
                <Controller name="joiningDate" control={control} render={({ field }) => (
                    <DatePicker label="Joining Date" id="joiningDate" error={errors.joiningDate?.message} value={field.value} onChange={field.onChange} />
                 )} />
                <Select label="Work Type" id="workType" error={errors.workType?.message} registration={register('workType')}>
                    <option value="">Select Work Type</option>
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                </Select>
            </div>
        </form>
    );
};

export default OrganizationDetails;