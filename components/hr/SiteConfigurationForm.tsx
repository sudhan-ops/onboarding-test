import React, { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { SiteConfiguration, Organization, Entity, UploadedFile } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import UploadDocument from '../UploadDocument';
import DatePicker from '../ui/DatePicker';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const projectTypes = ['Apartment', 'Villa', 'Vilament', 'Rowhouse', 'Combined', 'Commercial Office', 'Commercial Retail', 'Commercial', 'Public', ''];

const siteConfigSchema = yup.object({
  organizationId: yup.string().required(),
  location: yup.string().optional().nullable(),
  entityId: yup.string().optional(),
  billingName: yup.string().optional().nullable(),
  registeredAddress: yup.string().optional().nullable(),
  gstNumber: yup.string().optional().nullable().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, { message: 'Invalid GST Number format', excludeEmptyString: true }),
  panNumber: yup.string().optional().nullable().transform(v => v?.toUpperCase() || '').matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN format', excludeEmptyString: true }),
  email1: yup.string().email('Invalid email format').optional().nullable(),
  email2: yup.string().email('Invalid email format').optional().nullable(),
  email3: yup.string().email('Invalid email format').optional().nullable(),
  eShramNumber: yup.string().optional().nullable(),
  shopAndEstablishmentCode: yup.string().optional().nullable(),
  keyAccountManager: yup.string().optional(),
  siteAreaSqFt: yup.number().typeError('Must be a number').nullable().optional(),
  projectType: yup.string().oneOf(projectTypes).optional(),
  apartmentCount: yup.number().typeError('Must be a number').nullable().optional(),
  agreementDetails: yup.object({
    fromDate: yup.string().optional().nullable(),
    toDate: yup.string().optional().nullable().test('is-after-from', 'To Date must be after From Date', function(value) {
      const { fromDate } = this.parent;
      if (!fromDate || !value) return true;
      return new Date(value.replace(/-/g, '/')) >= new Date(fromDate.replace(/-/g, '/'));
    }),
    renewalIntervalDays: yup.number().typeError('Must be a number').nullable().optional().min(0, 'Cannot be negative'),
    softCopy: yup.mixed<UploadedFile | null>().nullable().optional(),
    scannedCopy: yup.mixed<UploadedFile | null>().nullable().optional(),
    agreementDate: yup.string().optional().nullable(),
    addendum1Date: yup.string().optional().nullable(),
    addendum2Date: yup.string().optional().nullable(),
  }).optional(),
  siteOperations: yup.object({
    form6Applicable: yup.boolean().default(false),
    form6RenewalTaskCreation: yup.boolean().optional(),
    form6ValidityFrom: yup.string().nullable().when('form6Applicable', { is: true, then: schema => schema.required('From Date is required') }),
    form6ValidityTo: yup.string().nullable().when('form6Applicable', { is: true, then: schema => schema.required('To Date is required') }),
    form6Document: yup.mixed<UploadedFile | null>().nullable().when('form6Applicable', { is: true, then: schema => schema.required('Document is required') }),
    minWageRevisionApplicable: yup.boolean().default(false),
    minWageRevisionTaskCreation: yup.boolean().optional(),
    minWageRevisionValidityFrom: yup.string().nullable().when('minWageRevisionApplicable', { is: true, then: schema => schema.required('From Date is required') }),
    minWageRevisionValidityTo: yup.string().nullable().when('minWageRevisionApplicable', { is: true, then: schema => schema.required('To Date is required') }),
    minWageRevisionDocument: yup.mixed<UploadedFile | null>().nullable().when('minWageRevisionApplicable', { is: true, then: schema => schema.required('Document is required') }),
    holidays: yup.object({
      numberOfDays: yup.number().nullable().min(0),
      list: yup.array().of(yup.object({ id: yup.string(), date: yup.string().required(), description: yup.string().required() })),
      salaryPayment: yup.string().oneOf(['Full Payment', 'Duty Payment', 'Nil Payment', '']),
      billing: yup.string().oneOf(['Full Payment', 'Duty Payment', 'Nil Payment', '']),
    }).optional(),
    costingSheetLink: yup.string().url('Must be a valid URL').nullable().optional(),
    tools: yup.object({
      dcCopy1: yup.mixed<UploadedFile | null>().nullable().optional(),
      dcCopy2: yup.mixed<UploadedFile | null>().nullable().optional(),
      list: yup.array().of(yup.object({ id: yup.string(), name: yup.string().required(), brand: yup.string().optional(), size: yup.string().optional(), quantity: yup.number().nullable().min(0), issueDate: yup.string().required(), picture: yup.mixed<UploadedFile | null>().nullable().optional() })),
    }).optional(),
    sims: yup.object({
      issuedCount: yup.number().nullable().min(0),
      details: yup.array().of(yup.object({ id: yup.string(), mobileNumber: yup.string().required().matches(/^[6-9][0-9]{9}$/, 'Must be a valid 10-digit number'), allocatedTo: yup.string().optional(), plan: yup.string().optional(), ownerName: yup.string().optional() })),
    }).optional(),
    equipment: yup.object({
      issued: yup.array().of(yup.object({ id: yup.string(), name: yup.string().required(), brand: yup.string().optional(), modelNumber: yup.string().optional(), serialNumber: yup.string().optional(), accessories: yup.string().optional(), condition: yup.string().oneOf(['New', 'Old', '']), issueDate: yup.string().required(), picture: yup.mixed<UploadedFile | null>().nullable().optional() })),
      intermittent: yup.object({
        billing: yup.string().oneOf(['To Be Billed', 'Not to be Billed', '']),
        frequency: yup.string().oneOf(['Monthly', 'Bi-Monthly', 'Quarterly', 'Half Yearly', 'Yearly', '']),
        taskCreation: yup.boolean().default(false),
        durationDays: yup.number().nullable().min(0)
      }).optional(),
    }).optional(),
    billingCycleFrom: yup.string().nullable().optional(),
    uniformDeductions: yup.boolean().default(false),
  }).optional(),
  insuranceStatus: yup.object({
    isCompliant: yup.boolean().required(),
  }).optional().nullable(),
  assets: yup.array().optional(),
  issuedTools: yup.array().optional(),
}).defined();

type Tab = 'General' | 'Compliance' | 'Agreement' | 'Site Operations';

interface SiteConfigurationFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (orgId: string, data: SiteConfiguration) => void;
    organization: Organization;
    allClients: (Entity & { companyName: string })[];
    initialData?: SiteConfiguration;
}

const AccordionItem: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-border rounded-lg bg-page">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 font-medium text-left text-primary-text">
                <span>{title}</span>
                <ChevronDown className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="p-4 border-t border-border bg-card">{children}</div>}
        </div>
    );
};

export const SiteConfigurationForm: React.FC<SiteConfigurationFormProps> = ({ isOpen, onClose, onSave, organization, allClients, initialData }) => {
    const [activeTab, setActiveTab] = useState<Tab>('General');
    const isMobile = useMediaQuery('(max-width: 767px)');
    const { register, handleSubmit, control, watch, setValue, formState: { errors }, reset } = useForm<SiteConfiguration>({
        resolver: yupResolver(siteConfigSchema) as unknown as Resolver<SiteConfiguration>,
        defaultValues: {
          siteOperations: {
            form6Applicable: false,
            minWageRevisionApplicable: false,
            uniformDeductions: false
          }
        }
    });

    const { fields: holidayFields, append: appendHoliday, remove: removeHoliday } = useFieldArray({ control, name: "siteOperations.holidays.list" });
    const { fields: toolFields, append: appendTool, remove: removeTool } = useFieldArray({ control, name: "siteOperations.tools.list" });
    const { fields: simFields, append: appendSim, remove: removeSim } = useFieldArray({ control, name: "siteOperations.sims.details" });
    const { fields: equipmentFields, append: appendEquipment, remove: removeEquipment } = useFieldArray({ control, name: "siteOperations.equipment.issued" });

    useEffect(() => {
        if (isOpen) {
            reset(initialData || { organizationId: organization.id });
        }
    }, [isOpen, initialData, organization.id, reset]);

    const selectedEntityId = watch('entityId');
    const form6Applicable = watch('siteOperations.form6Applicable');
    const minWageApplicable = watch('siteOperations.minWageRevisionApplicable');


    useEffect(() => {
        if (selectedEntityId) {
            const client = allClients.find(e => e.id === selectedEntityId);
            if (client) {
                setValue('registeredAddress', client.registeredAddress || '');
                setValue('gstNumber', client.gstNumber || '');
                setValue('panNumber', client.panNumber || '');
                setValue('email1', client.email || '');
                setValue('eShramNumber', client.eShramNumber || '');
                setValue('shopAndEstablishmentCode', client.shopAndEstablishmentCode || '');
            }
        }
    }, [selectedEntityId, allClients, setValue]);
    
    const onSubmit: SubmitHandler<SiteConfiguration> = (data) => {
        onSave(organization.id, data);
    };

    const TabButton: React.FC<{ tabName: Tab }> = ({ tabName }) => (
        <button type="button" onClick={() => setActiveTab(tabName)} className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${activeTab === tabName ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-primary-text'}`}>
            {tabName}
        </button>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 p-4 flex items-center justify-center" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-card w-full max-w-4xl my-8 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                    <h3 className="text-xl font-bold text-primary-text">Site Configuration</h3>
                    <p className="text-sm text-muted mb-4">For: {organization.shortName}</p>

                    <div className="mb-6">
                        {isMobile ? (
                            <Select
                                label="Configuration Section"
                                id="site-config-tabs"
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value as Tab)}
                                className="pro-select pro-select-arrow"
                            >
                                <option value="General">General</option>
                                <option value="Compliance">Compliance</option>
                                <option value="Agreement">Agreement</option>
                                <option value="Site Operations">Site Operations</option>
                            </Select>
                        ) : (
                            <div className="border-b border-border">
                                <nav className="-mb-px flex space-x-4">
                                    <TabButton tabName="General" />
                                    <TabButton tabName="Compliance" />
                                    <TabButton tabName="Agreement" />
                                    <TabButton tabName="Site Operations" />
                                </nav>
                            </div>
                        )}
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                        {activeTab === 'General' && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <Input label="Location" id="location" registration={register('location')} error={errors.location?.message} />
                                <Input label="Billing Name" id="billingName" registration={register('billingName')} error={errors.billingName?.message} />
                                <Input label="Key Account Manager" id="keyAccountManager" registration={register('keyAccountManager')} error={errors.keyAccountManager?.message} />
                                <Input label="Site Area (Sq.ft)" id="siteAreaSqFt" type="number" registration={register('siteAreaSqFt')} error={errors.siteAreaSqFt?.message} />
                                 <Select label="Type of Project" id="projectType" registration={register('projectType')} error={errors.projectType?.message}>
                                    <option value="">-- Select Type --</option>
                                    {projectTypes.filter(Boolean).map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                </Select>
                                <Input label="No of Apartments/Villas" id="apartmentCount" type="number" registration={register('apartmentCount')} error={errors.apartmentCount?.message} />
                             </div>
                        )}

                        {activeTab === 'Compliance' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div className="md:col-span-2">
                                <Controller name="entityId" control={control} render={({ field }) => (
                                    <Select label="Link to Client (Prefills data)" id="entityId" {...field} error={errors.entityId?.message}>
                                        <option value="">-- Select Client --</option>
                                        {allClients.map(e => <option key={e.id} value={e.id}>{e.name} ({e.companyName})</option>)}
                                    </Select>
                                )} />
                                </div>
                                <Input label="GST Number" id="gstNumber" registration={register('gstNumber')} error={errors.gstNumber?.message} />
                                <Input label="PAN Number" id="panNumber" registration={register('panNumber')} error={errors.panNumber?.message} />
                                <Input label="Email Address 1" id="email1" registration={register('email1')} error={errors.email1?.message} />
                                <Input label="Email Address 2" id="email2" registration={register('email2')} error={errors.email2?.message} />
                                <Input label="Email Address 3" id="email3" registration={register('email3')} error={errors.email3?.message} />
                                <Input label="E-Shram Number" id="eShramNumber" registration={register('eShramNumber')} error={errors.eShramNumber?.message} />
                                <Input label="Shop & Establishment Code" id="shopAndEstablishmentCode" registration={register('shopAndEstablishmentCode')} error={errors.shopAndEstablishmentCode?.message} />
                            </div>
                        )}

                        {activeTab === 'Agreement' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <Controller name="agreementDetails.fromDate" control={control} render={({ field }) => (<DatePicker label="From Date" id="agreementDetails.fromDate" value={field.value} onChange={field.onChange} error={errors.agreementDetails?.fromDate?.message} />)} />
                                <Controller name="agreementDetails.toDate" control={control} render={({ field }) => (<DatePicker label="To Date" id="agreementDetails.toDate" value={field.value} onChange={field.onChange} error={errors.agreementDetails?.toDate?.message} />)} />
                                <Input label="Renewal Interval (Days)" id="agreementDetails.renewalIntervalDays" type="number" registration={register('agreementDetails.renewalIntervalDays')} error={errors.agreementDetails?.renewalIntervalDays?.message} />
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Controller name="agreementDetails.softCopy" control={control} render={({ field }) => (<UploadDocument label="Soft Copy" file={field.value} onFileChange={field.onChange} />)} />
                                    <Controller name="agreementDetails.scannedCopy" control={control} render={({ field }) => (<UploadDocument label="Scanned Copy" file={field.value} onFileChange={field.onChange} />)} />
                                </div>
                                <Controller name="agreementDetails.agreementDate" control={control} render={({ field }) => (<DatePicker label="Agreement Dated" id="agreementDetails.agreementDate" value={field.value} onChange={field.onChange} error={errors.agreementDetails?.agreementDate?.message} />)} />
                                <Controller name="agreementDetails.addendum1Date" control={control} render={({ field }) => (<DatePicker label="Addendum 1 Dated" id="agreementDetails.addendum1Date" value={field.value} onChange={field.onChange} error={errors.agreementDetails?.addendum1Date?.message} />)} />
                                <Controller name="agreementDetails.addendum2Date" control={control} render={({ field }) => (<DatePicker label="Addendum 2 Dated" id="agreementDetails.addendum2Date" value={field.value} onChange={field.onChange} error={errors.agreementDetails?.addendum2Date?.message} />)} />
                            </div>
                        )}
                        
                        {activeTab === 'Site Operations' && (
                            <div className="space-y-4">
                                <AccordionItem title="Compliance Forms">
                                    <div className="space-y-4">
                                        <div>
                                            <Controller name="siteOperations.form6Applicable" control={control} render={({ field }) => ( <label className="flex items-center gap-2"><input type="checkbox" checked={field.value} onChange={field.onChange} /> Form 6 Applicable</label> )} />
                                            {form6Applicable && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pl-6">
                                                    <Controller name="siteOperations.form6ValidityFrom" control={control} render={({ field }) => <DatePicker label="Valid From" id="form6from" value={field.value} onChange={field.onChange} error={errors.siteOperations?.form6ValidityFrom?.message} />} />
                                                    <Controller name="siteOperations.form6ValidityTo" control={control} render={({ field }) => <DatePicker label="Valid To" id="form6to" value={field.value} onChange={field.onChange} error={errors.siteOperations?.form6ValidityTo?.message} />} />
                                                    <div className="md:col-span-2"><Controller name="siteOperations.form6Document" control={control} render={({ field }) => <UploadDocument label="Form 6 Document" file={field.value} onFileChange={field.onChange} error={errors.siteOperations?.form6Document?.message as string} />} /></div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <Controller name="siteOperations.minWageRevisionApplicable" control={control} render={({ field }) => ( <label className="flex items-center gap-2"><input type="checkbox" checked={field.value} onChange={field.onChange} /> Min. Wage Revision Applicable</label> )} />
                                            {minWageApplicable && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pl-6">
                                                     <Controller name="siteOperations.minWageRevisionValidityFrom" control={control} render={({ field }) => <DatePicker label="Valid From" id="minwagefrom" value={field.value} onChange={field.onChange} error={errors.siteOperations?.minWageRevisionValidityFrom?.message} />} />
                                                     <Controller name="siteOperations.minWageRevisionValidityTo" control={control} render={({ field }) => <DatePicker label="Valid To" id="minwageto" value={field.value} onChange={field.onChange} error={errors.siteOperations?.minWageRevisionValidityTo?.message} />} />
                                                     <div className="md:col-span-2"><Controller name="siteOperations.minWageRevisionDocument" control={control} render={({ field }) => <UploadDocument label="Min. Wage Document" file={field.value} onFileChange={field.onChange} error={errors.siteOperations?.minWageRevisionDocument?.message as string} />} /></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AccordionItem>
                                
                                <AccordionItem title="Holidays">
                                    <div className="space-y-4">
                                        <Input label="Number of National & Festival Holidays" id="holiday-count" type="number" registration={register('siteOperations.holidays.numberOfDays')} />
                                        <Select label="Salary Payment for Holiday" id="holiday-salary" registration={register('siteOperations.holidays.salaryPayment')}><option value="">Select</option><option>Full Payment</option><option>Duty Payment</option><option>Nil Payment</option></Select>
                                        <Select label="Billing for Holiday" id="holiday-billing" registration={register('siteOperations.holidays.billing')}><option value="">Select</option><option>Full Payment</option><option>Duty Payment</option><option>Nil Payment</option></Select>
                                        
                                        <h5 className="font-semibold pt-2 border-t">Holiday List</h5>
                                        {holidayFields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                                                <div className="col-span-6"><Input label="Description" id={`holiday-desc-${index}`} {...register(`siteOperations.holidays.list.${index}.description`)} /></div>
                                                <div className="col-span-5"><Controller name={`siteOperations.holidays.list.${index}.date`} control={control} render={({field: dateField}) => <DatePicker label="Date" id={`holiday-date-${index}`} value={dateField.value} onChange={dateField.onChange} />} /></div>
                                                <div className="col-span-1"><Button type="button" variant="icon" size="sm" onClick={() => removeHoliday(index)}><Trash2 className="h-4 text-red-500"/></Button></div>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => appendHoliday({ id: `hol_${Date.now()}`, date: '', description: '' })}><Plus className="h-4 mr-1"/> Add Holiday</Button>
                                    </div>
                                </AccordionItem>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-border flex justify-end space-x-3">
                        <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
                        <Button type="submit">Save Configuration</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
