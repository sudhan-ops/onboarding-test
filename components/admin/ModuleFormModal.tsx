import React, { useEffect } from 'react';
import { useForm, Controller, Resolver } from 'react-hook-form';
import * as yup from 'yup';
// Fix: Import StringSchema type from yup
import type { StringSchema } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import type { AppModule, Permission } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';
import { allPermissions } from '../../pages/admin/RoleManagement';

interface ModuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (module: AppModule) => void;
  initialData: AppModule | null;
}

const validationSchema = yup.object({
  id: yup.string().required(),
  name: yup.string().required('Module name is required'),
  description: yup.string().required('Description is required'),
  // Fix: Cast using imported StringSchema type
  permissions: yup.array().of(yup.string().required() as StringSchema<Permission>).min(1, 'At least one permission must be selected'),
}).defined();

const ModuleFormModal: React.FC<ModuleFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<AppModule>({
    resolver: yupResolver(validationSchema) as Resolver<AppModule>
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset(initialData);
      } else {
        reset({ id: `mod_${Date.now()}`, name: '', description: '', permissions: [] });
      }
    }
  }, [isOpen, initialData, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card w-full max-w-2xl my-8 animate-fade-in-scale flex flex-col" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit(onSave)}>
          <div className="p-4 border-b">
            <h3 className="text-xl font-bold">{initialData ? 'Edit' : 'Add'} Module</h3>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <Input label="Module Name" {...register('name')} error={errors.name?.message} />
            <Input label="Description" {...register('description')} error={errors.description?.message} />
            
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Permissions</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 p-4 border rounded-lg h-64 overflow-y-auto bg-page">
                <Controller
                  name="permissions"
                  control={control}
                  render={({ field }) => (
                    <>
                      {allPermissions.map(p => (
                        <Checkbox
                          key={p.key}
                          id={`perm-${p.key}`}
                          label={p.name}
                          checked={field.value?.includes(p.key) || false}
                          onChange={(checked) => {
                            const newValue = checked
                              ? [...(field.value || []), p.key]
                              : (field.value || []).filter(v => v !== p.key);
                            field.onChange(newValue);
                          }}
                        />
                      ))}
                    </>
                  )}
                />
              </div>
              {errors.permissions && <p className="mt-1 text-xs text-red-600">{Array.isArray(errors.permissions) ? errors.permissions[0]?.message : errors.permissions.message}</p>}
            </div>
          </div>
          <div className="p-4 border-t flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Module</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModuleFormModal;