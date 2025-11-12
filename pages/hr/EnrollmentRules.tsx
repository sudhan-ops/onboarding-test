import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { useEnrollmentRulesStore } from '../../store/enrollmentRulesStore';
import type { EnrollmentRules, DocumentRules, VerificationRules, SiteStaffDesignation } from '../../types';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Checkbox from '../../components/ui/Checkbox';
import Toast from '../../components/ui/Toast';
import { Save, IndianRupee, Users, Edit, UserCheck, FileText, MapPin } from 'lucide-react';
import { api } from '../../services/api';

const defaultDesignationRules = {
    documents: {
        aadhaar: false, pan: false, bankProof: false, educationCertificate: false,
        salarySlip: false, uanProof: false, familyAadhaar: false,
    },
    verifications: {
        requireBengaluruAddress: false, requireDobVerification: false,
    }
};

const EnrollmentRules: React.FC = () => {
    const store = useEnrollmentRulesStore();
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [designations, setDesignations] = useState<SiteStaffDesignation[]>([]);
    const [selectedDesignation, setSelectedDesignation] = useState('Administrator');

    useEffect(() => {
        api.getSiteStaffDesignations().then(data => {
            const uniqueDesignations = [...new Set(data.map(d => d.designation))];
            if (!uniqueDesignations.includes('Administrator')) {
                uniqueDesignations.unshift('Administrator');
            }
            // A bit of a hack to get a unique list of objects for the component key
            setDesignations(uniqueDesignations.map((d, i) => ({ id: `${i}`, designation: d, department: '', permanentId: '', temporaryId: '' })));
        });
    }, []);

    const { register, handleSubmit, control, formState: { isDirty }, watch, reset, setValue } = useForm<EnrollmentRules>({
        defaultValues: store,
    });
    
    useEffect(() => {
        reset(store);
    }, [store, reset]);
    
    useEffect(() => {
        // When a new designation is selected, check if rules exist.
        // If not, initialize them in the form state to make the form dirty and savable.
        const rulesForDesignation = store.rulesByDesignation?.[selectedDesignation];
        if (!rulesForDesignation) {
            // This designation has no rules yet. Default all to true to match the UI.
            Object.keys(defaultDesignationRules.documents).forEach(key => {
                setValue(`rulesByDesignation.${selectedDesignation}.documents.${key as keyof DocumentRules}`, true, { shouldDirty: true });
            });
            Object.keys(defaultDesignationRules.verifications).forEach(key => {
                setValue(`rulesByDesignation.${selectedDesignation}.verifications.${key as keyof VerificationRules}`, true, { shouldDirty: true });
            });
        }
    }, [selectedDesignation, store.rulesByDesignation, setValue]);

    const isEnforceLimitEnabled = watch('enforceManpowerLimit');
    const isEsiRuleEnabled = watch('enableEsiRule');
    const isGmcRuleEnabled = watch('enableGmcRule');

    const onSubmit: SubmitHandler<EnrollmentRules> = (data) => {
        store.updateRules(data);
        setToast({ message: 'Enrollment rules saved successfully!', type: 'success' });
        // After saving, the form is no longer dirty relative to the new store state
        reset(data); 
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-8 max-w-4xl mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            <AdminPageHeader title="Enrollment Rules">
                <Button type="submit" disabled={!isDirty}><Save className="mr-2 h-4 w-4" /> Save Rules</Button>
            </AdminPageHeader>

            <div className="md:bg-card md:p-8 md:rounded-xl md:shadow-card">
                <div className="flex items-start mb-6">
                    <div className="p-3 rounded-full bg-accent-light mr-4"><FileText className="h-6 w-6 text-accent-dark" /></div>
                    <div className="flex-grow">
                        <h2 className="text-xl font-bold">Designation-Specific Rules</h2>
                        <p className="text-muted">Set mandatory documents and verifications for specific roles.</p>
                    </div>
                </div>
                <div className="mb-4">
                    <Select label="Configure rules for designation" value={selectedDesignation} onChange={e => setSelectedDesignation(e.target.value)}>
                        {designations.map(d => <option key={d.id} value={d.designation}>{d.designation}</option>)}
                    </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section>
                        <h3 className="font-semibold mb-2">Mandatory Documents</h3>
                        <div className="space-y-3">
                            {Object.keys(defaultDesignationRules.documents).map(key => (
                                <Controller
                                    key={key}
                                    name={`rulesByDesignation.${selectedDesignation}.documents.${key as keyof DocumentRules}`}
                                    control={control}
                                    defaultValue={true}
                                    render={({ field }) => <Checkbox id={`${selectedDesignation}-${key}`} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} checked={field.value} onChange={field.onChange} />}
                                />
                            ))}
                        </div>
                    </section>
                    <section>
                        <h3 className="font-semibold mb-2">Data Verifications</h3>
                        <div className="space-y-3">
                            {Object.keys(defaultDesignationRules.verifications).map(key => (
                                <Controller
                                    key={key}
                                    name={`rulesByDesignation.${selectedDesignation}.verifications.${key as keyof VerificationRules}`}
                                    control={control}
                                    defaultValue={true}
                                    render={({ field }) => <Checkbox id={`${selectedDesignation}-${key}`} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} checked={field.value} onChange={field.onChange} />}
                                />
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            <div className="md:bg-card md:p-8 md:rounded-xl md:shadow-card">
                <div className="flex items-start mb-6">
                    <div className="p-3 rounded-full bg-accent-light mr-4"><IndianRupee className="h-6 w-6 text-accent-dark" /></div>
                    <div className="flex-grow"><h2 className="text-xl font-bold">ESI Eligibility</h2><p className="text-muted">Define salary threshold for statutory insurance.</p></div>
                    <Controller name="enableEsiRule" control={control} render={({ field }) => <Checkbox id="enableEsiRule" label="Enable Rule" checked={field.value} onChange={field.onChange} />} />
                </div>
                <div className={`transition-opacity ${isEsiRuleEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}><div className="max-w-sm"><Input label="ESI Eligibility Gross Salary Threshold" id="esiCtcThreshold" type="number" registration={register('esiCtcThreshold', { valueAsNumber: true })} disabled={!isEsiRuleEnabled} /><p className="text-xs text-muted mt-2">Employees at or below this amount are eligible for ESI. Those above are eligible for GMC.</p></div></div>
            </div>
            
            <div className="md:bg-card md:p-8 md:rounded-xl md:shadow-card">
                <div className="flex items-start mb-6">
                    <div className="p-3 rounded-full bg-accent-light mr-4"><IndianRupee className="h-6 w-6 text-accent-dark" /></div>
                    <div className="flex-grow"><h2 className="text-xl font-bold">GMC/Insurance Policy Rules</h2><p className="text-muted">Set default GMC policies.</p></div>
                    <Controller name="enableGmcRule" control={control} render={({ field }) => <Checkbox id="enableGmcRule" label="Enable Rule" checked={field.value} onChange={field.onChange} />} />
                </div>
                <div className={`transition-opacity ${isGmcRuleEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <Input label="GMC Salary Threshold" id="salaryThreshold" type="number" registration={register('salaryThreshold', { valueAsNumber: true })} disabled={!isGmcRuleEnabled} />
                        <Controller name="defaultPolicySingle" control={control} render={({ field }) => <Select label="Policy (Single)" {...field} disabled={!isGmcRuleEnabled}><option value="1L">1 Lakh</option><option value="2L">2 Lakh</option></Select>} />
                        <Controller name="defaultPolicyMarried" control={control} render={({ field }) => <Select label="Policy (Married)" {...field} disabled={!isGmcRuleEnabled}><option value="1L">1 Lakh</option><option value="2L">2 Lakh</option></Select>} />
                    </div><p className="text-xs text-muted mt-2">Employees with a salary *above* this threshold will be eligible for GMC.</p>
                </div>
            </div>

            <div className="md:bg-card md:p-8 md:rounded-xl md:shadow-card">
                <div className="flex items-start mb-6"><div className="p-3 rounded-full bg-accent-light mr-4"><Users className="h-6 w-6 text-accent-dark" /></div><div><h2 className="text-xl font-bold">Manpower Allocation</h2><p className="text-muted">Set rules for enrolling based on approved manpower.</p></div></div>
                <div className="space-y-4">
                    <Controller name="enforceManpowerLimit" control={control} render={({ field }) => <Checkbox id="enforceManpowerLimit" label="Enforce Manpower Allocation Limits" description="Check new enrollments against the approved manpower count for the site." checked={field.value} onChange={field.onChange} />} />
                    <div className={`max-w-sm transition-opacity ${isEnforceLimitEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <Select label="Action When Limit is Reached" id="manpowerLimitRule" registration={register('manpowerLimitRule')} disabled={!isEnforceLimitEnabled}>
                            <option value="warn">Warn field officer but allow enrollment</option><option value="block">Block enrollment and require approval</option>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="md:bg-card md:p-8 md:rounded-xl md:shadow-card">
                <div className="flex items-start mb-6"><div className="p-3 rounded-full bg-accent-light mr-4"><Edit className="h-6 w-6 text-accent-dark" /></div><div><h2 className="text-xl font-bold">Field Officer Permissions</h2><p className="text-muted">Control what field officers can do during enrollment.</p></div></div>
                <div className="space-y-4"><Controller name="allowSalaryEdit" control={control} render={({ field }) => <Checkbox id="allowSalaryEdit" label="Allow Salary Editing" description="Permit field officers to edit default salary, triggering an approval workflow." checked={field.value ?? false} onChange={field.onChange} />} /></div>
            </div>

            <div className="md:bg-card md:p-8 md:rounded-xl md:shadow-card">
                <div className="flex items-start mb-6"><div className="p-3 rounded-full bg-accent-light mr-4"><UserCheck className="h-6 w-6 text-accent-dark" /></div><div><h2 className="text-xl font-bold">Family Details Validation</h2><p className="text-muted">Set rules for validating family member details.</p></div></div>
                <div className="space-y-4"><Controller name="enforceFamilyValidation" control={control} render={({ field }) => <Checkbox id="enforceFamilyValidation" label="Enforce Strict Family Validation" description="Enable checks for duplicates, age, and gender based on relationship." checked={field.value ?? false} onChange={field.onChange} />} /></div>
            </div>
        </form>
    );
};
export default EnrollmentRules;