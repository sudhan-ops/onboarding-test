import React, { useEffect, useState } from 'react';
import { useForm, Controller, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { Entity, RegistrationType, Policy, Insurance } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { api } from '../../services/api';
import { Loader2 } from 'lucide-react';

interface EntityFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Entity) => void;
  initialData: Entity | null;
  companyName: string;
}

const entitySchema = yup.object({
  id: yup.string().required(),
  name: yup.string().required('Client name is required'),
  organizationId: yup.string().optional(),
  location: yup.string().optional(),
  registeredAddress: yup.string().optional(),
  registrationType: yup.string<RegistrationType>().oneOf(['CIN', 'ROC', 'ROF', 'Society', 'Trust', '']).optional(),
  registrationNumber: yup.string().optional(),
  gstNumber: yup.string().optional().nullable().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST Number format').optional(),
  panNumber: yup.string().transform(v => v?.toUpperCase() || '').matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format').optional(),
  email: yup.string().email('Invalid email format').optional(),
  eShramNumber: yup.string().optional(),
  shopAndEstablishmentCode: yup.string().optional(),
  epfoCode: yup.string().optional(),
  esicCode: yup.string().optional(),
  psaraLicenseNumber: yup.string().optional(),
  psaraValidTill: yup.string().optional().nullable(),
  insuranceIds: yup.array().of(yup.string().required()).optional(),
  policyIds: yup.array().of(yup.string().required()).optional(),
}).defined();

type Tab = 'General' | 'Registration' | 'Compliance' | 'Policies & Insurance';

const EntityForm: React.FC<EntityFormProps> = ({ isOpen, onClose, onSave, initialData, companyName }) => {
  const [activeTab, setActiveTab] = useState<Tab>('General');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<Entity>({
    resolver: yupResolver(entitySchema) as Resolver<Entity>,
  });

  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) {
        setIsLoading(true);
        Promise.all([api.getPolicies(), api.getInsurances()]).then(([p, i]) => {
            setPolicies(p);
            setInsurances(i);
            setIsLoading(false);
        });

        if (initialData) {
            reset(initialData);
        } else {
            reset({ id: `new_${Date.now()}`, name: '', location: '', registeredAddress: '', registrationType: '', registrationNumber: '', gstNumber: '', panNumber: '', email: '', eShramNumber: '', shopAndEstablishmentCode: '', epfoCode: '', esicCode: '', psaraLicenseNumber: '', psaraValidTill: '', insuranceIds: [], policyIds: [] });
        }
    }
  }, [initialData, reset, isOpen]);

  const onSubmit: SubmitHandler<Entity> = (data) => {
    onSave(data);
  };

  if (!isOpen) return null;

  const TabButton: React.FC<{ tabName: Tab }> = ({ tabName }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${activeTab === tabName ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-primary-text'}`}
    >
      {tabName}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-3xl my-8 mx-auto animate-fade-in-scale" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-primary-text">{isEditing ? 'Edit Client' : 'Add New Client'}</h3>
            <p className="text-sm text-muted">for {companyName}</p>
          </div>
          
          <div className="border-b border-border mb-6">
            <nav className="-mb-px flex space-x-4">
                <TabButton tabName="General" />
                <TabButton tabName="Registration" />
                <TabButton tabName="Compliance" />
                <TabButton tabName="Policies & Insurance" />
            </nav>
          </div>
          
          <div className="space-y-6 min-h-[300px]">
            {activeTab === 'General' && (
                <div className="space-y-4">
                    <Input label="Client Name (as per document)" id="name" registration={register('name')} error={errors.name?.message} />
                    <Input label="Location / City" id="location" registration={register('location')} error={errors.location?.message} />
                    <Input label="Registered Address" id="registeredAddress" registration={register('registeredAddress')} error={errors.registeredAddress?.message} />
                </div>
            )}
            {activeTab === 'Registration' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Select label="Registration Type" id="registrationType" registration={register('registrationType')} error={errors.registrationType?.message}>
                        <option value="">Select Type</option><option value="CIN">CIN</option><option value="ROC">ROC</option><option value="ROF">ROF</option><option value="Society">Society</option><option value="Trust">Trust</option>
                    </Select>
                    <Input label="Registration Number" id="registrationNumber" registration={register('registrationNumber')} error={errors.registrationNumber?.message} />
                    <Input label="GST Number" id="gstNumber" registration={register('gstNumber')} error={errors.gstNumber?.message} />
                    <Input label="PAN Number" id="panNumber" registration={register('panNumber')} error={errors.panNumber?.message} />
                    <Input label="Email Address" id="email" type="email" registration={register('email')} error={errors.email?.message} />
                 </div>
            )}
            {activeTab === 'Compliance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Input label="E-Shram Number" id="eShramNumber" registration={register('eShramNumber')} error={errors.eShramNumber?.message} />
                    <Input label="Shop & Establishment Code" id="shopAndEstablishmentCode" registration={register('shopAndEstablishmentCode')} error={errors.shopAndEstablishmentCode?.message} />
                    <Input label="EPFO Code" id="epfoCode" registration={register('epfoCode')} error={errors.epfoCode?.message} />
                    <Input label="ESIC Code" id="esicCode" registration={register('esicCode')} error={errors.esicCode?.message} />
                    <Input label="PSARA License Number" id="psaraLicenseNumber" registration={register('psaraLicenseNumber')} error={errors.psaraLicenseNumber?.message} />
                    <Controller name="psaraValidTill" control={control} render={({ field }) => (
                        <DatePicker label="PSARA Valid Till" id="psaraValidTill" value={field.value} onChange={field.onChange} error={errors.psaraValidTill?.message} />
                    )} />
                 </div>
            )}
            {activeTab === 'Policies & Insurance' && (
                isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted" /> :
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Controller
                      name="policyIds"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <h4 className="font-semibold mb-2">Policies</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto p-3 border rounded-lg bg-page">
                            {policies.map(policy => (
                              <label key={policy.id} className="flex items-center p-2 rounded-md hover:bg-card transition-colors">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent"
                                  checked={field.value?.includes(policy.id)}
                                  onChange={e => {
                                    const newValues = e.target.checked
                                      ? [...(field.value || []), policy.id]
                                      : (field.value || []).filter(id => id !== policy.id);
                                    field.onChange(newValues);
                                  }}
                                />
                                <span className="ml-3 text-sm">{policy.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    />
                     <Controller
                      name="insuranceIds"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <h4 className="font-semibold mb-2">Insurance</h4>
                           <div className="space-y-2 max-h-48 overflow-y-auto p-3 border rounded-lg bg-page">
                            {insurances.map(ins => (
                              <label key={ins.id} className="flex items-center p-2 rounded-md hover:bg-card transition-colors">
                                <input
                                  type="checkbox"
                                   className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent"
                                  checked={field.value?.includes(ins.id)}
                                  onChange={e => {
                                    const newValues = e.target.checked
                                      ? [...(field.value || []), ins.id]
                                      : (field.value || []).filter(id => id !== ins.id);
                                    field.onChange(newValues);
                                  }}
                                />
                                <span className="ml-3 text-sm">{ins.type} - {ins.provider}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    />
                </div>
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-border flex justify-end space-x-3">
            <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
            <Button type="submit">{isEditing ? 'Save Changes' : 'Add Client'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntityForm;