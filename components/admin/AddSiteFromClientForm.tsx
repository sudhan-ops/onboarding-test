import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { OrganizationGroup, Company, Entity } from '../../types';
import { api } from '../../services/api';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Loader2 } from 'lucide-react';

interface AddSiteFromClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Entity, manpowerCount: number) => void;
}

const schema = yup.object({
  groupId: yup.string().required('Please select a group'),
  companyId: yup.string().required('Please select a company'),
  clientId: yup.string().required('Please select a client'),
  manpowerCount: yup.number().typeError('Must be a number').min(0, 'Cannot be negative').required('Manpower count is required'),
}).defined();

type FormInputs = {
    groupId: string;
    companyId: string;
    clientId: string;
    manpowerCount: number;
};

const AddSiteFromClientForm: React.FC<AddSiteFromClientFormProps> = ({ isOpen, onClose, onSave }) => {
    const [groups, setGroups] = useState<OrganizationGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [clientSearch, setClientSearch] = useState('');
    const [isClientListOpen, setIsClientListOpen] = useState(false);
    const clientSearchRef = useRef<HTMLDivElement>(null);
    
    const { register, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm<FormInputs>({
        resolver: yupResolver(schema) as Resolver<FormInputs>,
    });

    const selectedGroupId = watch('groupId');
    const selectedCompanyId = watch('companyId');

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            api.getOrganizationStructure()
                .then(setGroups)
                .finally(() => setIsLoading(false));
            reset();
            setClientSearch('');
        }
    }, [isOpen, reset]);

    useEffect(() => {
        setValue('companyId', '');
        setValue('clientId', '');
        setClientSearch('');
    }, [selectedGroupId, setValue]);
    
    useEffect(() => {
        setValue('clientId', '');
        setClientSearch('');
    }, [selectedCompanyId, setValue]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
                setIsClientListOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const companies = useMemo(() => groups.find((g: OrganizationGroup) => g.id === selectedGroupId)?.companies || [], [groups, selectedGroupId]);
    const clients = useMemo(() => companies.find((c: Company) => c.id === selectedCompanyId)?.entities || [], [companies, selectedCompanyId]);
    
    const filteredClients = useMemo(() => {
        if (!clientSearch) return clients;
        return clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
    }, [clients, clientSearch]);

    const onSubmit: SubmitHandler<FormInputs> = (data: FormInputs) => {
        const client = clients.find((e: Entity) => e.id === data.clientId);
        if (client) {
            onSave(client, data.manpowerCount);
        }
    };

    const handleClientSelect = (client: Entity) => {
        setValue('clientId', client.id, { shouldValidate: true });
        setClientSearch(client.name);
        setIsClientListOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-lg m-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <h3 className="text-lg font-bold text-primary-text mb-4">Add Site from Existing Client</h3>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted"/></div>
                    ) : (
                        <div className="space-y-4">
                            <Select label="Group" id="groupId" registration={register('groupId')} error={errors.groupId?.message}>
                                <option value="">Select a Group</option>
                                {groups.map((g: OrganizationGroup) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </Select>
                            <Select label="Company" id="companyId" registration={register('companyId')} error={errors.companyId?.message} disabled={!selectedGroupId}>
                                <option value="">Select a Company</option>
                                {companies.map((c: Company) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                            <div className="relative" ref={clientSearchRef}>
                                <Input 
                                    label="Client" 
                                    id="clientSearch" 
                                    value={clientSearch}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setClientSearch(e.target.value); setIsClientListOpen(true); setValue('clientId', ''); }}
                                    onFocus={() => setIsClientListOpen(true)}
                                    disabled={!selectedCompanyId}
                                    error={errors.clientId?.message}
                                    autoComplete="off"
                                />
                                {isClientListOpen && filteredClients.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-card border border-border rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                                        {filteredClients.map((client: Entity) => (
                                            <li key={client.id} onClick={() => handleClientSelect(client)} className="px-3 py-2 text-sm cursor-pointer hover:bg-page">
                                                {client.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <Input label="Approved Manpower Count" id="manpowerCount" type="number" registration={register('manpowerCount')} error={errors.manpowerCount?.message} />
                        </div>
                    )}
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
                        <Button type="submit" disabled={isLoading}>Add Site</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddSiteFromClientForm;