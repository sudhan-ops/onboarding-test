

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { User, UserRole, Organization, Role } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { api } from '../../services/api';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<User>) => void;
  initialData?: User | null;
  isSaving: boolean;
}

const validationSchema = yup.object({
  id: yup.string().optional(),
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  role: yup.string<UserRole>().required('Role is required'),
  phone: yup.string().optional(),
  organizationId: yup.string().when('role', {
    is: 'site_manager' as UserRole,
    then: schema => schema.required('Site manager must be assigned to a site.'),
    otherwise: schema => schema.optional(),
  }),
  organizationName: yup.string().optional(),
  reportingManagerId: yup.string().optional(),
  photoUrl: yup.string().optional().nullable(),
}).defined();


const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, onSave, initialData, isSaving }) => {
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<Partial<User>>({
    resolver: yupResolver(validationSchema) as unknown as Resolver<Partial<User>>,
  });

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const isEditing = !!initialData;
  const role = watch('role');

  useEffect(() => {
    if (isOpen) {
      Promise.all([api.getOrganizations(), api.getRoles()]).then(([orgs, fetchedRoles]) => {
        setOrganizations(orgs);
        // Add unverified role if it's the user's current role but not in the main list
        if (initialData?.role === 'unverified' && !fetchedRoles.some(r => r.id === 'unverified')) {
            const allRoles = [{ id: 'unverified', displayName: 'Unverified' }, ...fetchedRoles];
            setRoles(allRoles);
        } else {
            setRoles(fetchedRoles);
        }
      });
      
      if (initialData) {
        reset(initialData);
      } else {
        reset({ name: '', email: '', role: 'field_officer' });
      }
    }
  }, [initialData, reset, isOpen]);
  
  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const orgId = e.target.value;
      const org = organizations.find(o => o.id === orgId);
      setValue('organizationId', orgId);
      setValue('organizationName', org?.shortName || '');
  };

  const onSubmit: SubmitHandler<Partial<User>> = (data) => {
    onSave(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-lg m-4 animate-fade-in-scale">
        <form onSubmit={handleSubmit(onSubmit)}>
          <h3 className="text-lg font-bold text-primary-text mb-4">{isEditing ? 'Edit' : 'Add'} User</h3>
          <div className="space-y-4">
            <Input label="Full Name" id="name" registration={register('name')} error={errors.name?.message} />
            <Input label="Email" id="email" type="email" registration={register('email')} error={errors.email?.message} />
            <Select label="Role" id="role" registration={register('role')} error={errors.role?.message}>
                {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.displayName}</option>
                ))}
            </Select>
            {role === 'site_manager' && (
              <Select label="Assigned Site" id="organizationId" {...register('organizationId')} error={errors.organizationId?.message} onChange={handleOrgChange}>
                  <option value="">Select a Site</option>
                  {organizations.map(org => <option key={org.id} value={org.id}>{org.shortName}</option>)}
              </Select>
            )}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
            <Button type="submit" isLoading={isSaving}>{isEditing ? 'Save Changes' : 'Create User'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
