import React, { useEffect, useState } from 'react';
// Fix: Use inline type import for SubmitHandler
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import type { SiteStaff, SiteStaffDesignation } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { api } from '../../services/api';

interface SiteStaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<SiteStaff, 'id' | 'siteId'>) => void;
  initialData: Partial<SiteStaff> | null;
}

const validationSchema = yup.object({
  name: yup.string().required('Name is required'),
  employeeCode: yup.string().required('Employee code is required'),
  designation: yup.string().required('Designation is required'),
}).defined();

type FormInputs = Pick<SiteStaff, 'name' | 'employeeCode' | 'designation'>;

const SiteStaffFormModal: React.FC<SiteStaffFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [designations, setDesignations] = useState<SiteStaffDesignation[]>([]);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormInputs>({
    // FIX: Cast resolver to resolve type incompatibility between yup and react-hook-form.
    resolver: yupResolver(validationSchema) as unknown as Resolver<FormInputs>,
  });
  
  const isEditing = !!initialData?.id;

  useEffect(() => {
    if (isOpen) {
      api.getSiteStaffDesignations().then(data => {
        const uniqueDesignations = [...new Map(data.map(item => [item['designation'], item])).values()];
        setDesignations(uniqueDesignations);
      });
      reset(initialData || { name: '', employeeCode: '', designation: '' });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit: SubmitHandler<FormInputs> = (data) => {
    onSave(data);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-lg m-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <h3 className="text-lg font-bold mb-4">{isEditing ? 'Edit' : 'Add'} Staff Member</h3>
          <div className="space-y-4">
            <Input label="Staff Name" id="name" {...register('name')} error={errors.name?.message} />
            <Input label="Employee Code" id="employeeCode" {...register('employeeCode')} error={errors.employeeCode?.message} />
            <Select label="Designation" id="designation" {...register('designation')} error={errors.designation?.message}>
              <option value="">-- Select Designation --</option>
              {designations.map(d => <option key={d.id} value={d.designation}>{d.designation}</option>)}
            </Select>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SiteStaffFormModal;