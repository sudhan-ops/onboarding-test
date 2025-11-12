import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller, SubmitHandler, Resolver, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { SupportTicket, User, UploadedFile } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import UploadDocument from '../UploadDocument';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ArrowLeft } from 'lucide-react';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTicket: SupportTicket) => void;
}

const schema = yup.object({
  title: yup.string().required('Title is required'),
  description: yup.string().required('Description is required'),
  category: yup.string().oneOf(['Software Developer', 'Admin', 'Operational', 'HR Query', 'Other']).required('Category is required'),
  priority: yup.string().oneOf(['Low', 'Medium', 'High', 'Urgent']).required('Priority is required'),
  assignedToId: yup.string().optional().nullable(),
  attachment: yup.mixed<UploadedFile | null>().optional().nullable(),
}).defined();

type FormData = Pick<SupportTicket, 'title' | 'description' | 'category' | 'priority' | 'assignedToId'> & { attachment?: UploadedFile | null };

const NewTicketModal: React.FC<NewTicketModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(schema) as Resolver<FormData>,
    defaultValues: { category: 'Software Developer', priority: 'Medium', assignedToId: null, attachment: null }
  });

  const watchedCategory = useWatch({ control, name: 'category' });

  useEffect(() => {
    if (isOpen) {
      api.getUsers().then(setUsers);
    }
  }, [isOpen]);

  const assignableUsers = useMemo(() => {
    if (!users) return [];
    switch (watchedCategory) {
        case 'Software Developer':
            return users.filter(u => u.role === 'developer');
        case 'Admin':
            return users.filter(u => u.role === 'admin');
        case 'HR Query':
            return users.filter(u => u.role === 'hr');
        case 'Operational':
            return users.filter(u => ['operation_manager', 'site_manager'].includes(u.role));
        default: // 'Other' or unselected
            const allAssignableRoles = ['admin', 'hr', 'developer', 'operation_manager', 'site_manager'];
            return users.filter(u => allAssignableRoles.includes(u.role));
    }
  }, [users, watchedCategory]);


  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const assignedUser = users.find(u => u.id === data.assignedToId);
      const newTicket = await api.createSupportTicket({
        ...data,
        attachment: data.attachment,
        status: 'Open',
        raisedById: user.id,
        raisedByName: user.name,
        assignedToId: data.assignedToId || null,
        assignedToName: assignedUser?.name || null,
        resolvedAt: null,
        closedAt: null,
        rating: null,
        feedback: null
      });
      onSuccess(newTicket);
      reset();
    } catch (error) {
      // Parent component will show toast
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  
  const formId = "new-ticket-form";

  // Mobile Full-Screen View
  if (isMobile) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0f1f0f] text-white animate-fade-in-scale">
            <header className="p-4 flex-shrink-0 flex items-center gap-4 border-b border-[#374151]">
                <Button variant="icon" onClick={onClose} aria-label="Close form"><ArrowLeft className="h-6 w-6" /></Button>
                <h3 className="text-lg font-semibold">Create New Post</h3>
            </header>
            
            <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 space-y-4">
                <Input placeholder="Title / Subject" {...register('title')} error={errors.title?.message} className="form-input" />
                <textarea placeholder="Description" {...register('description')} rows={5} className={`form-input ${errors.description ? 'form-input--error' : ''}`} />
                
                <Controller name="category" control={control} render={({ field }) => (
                    <Select {...field} error={errors.category?.message} className="pro-select pro-select-arrow">
                        <option>Software Developer</option>
                        <option>Admin</option>
                        <option>Operational</option>
                        <option>HR Query</option>
                        <option>Other</option>
                    </Select>
                )} />
                <Controller name="priority" control={control} render={({ field }) => (
                    <Select {...field} error={errors.priority?.message} className="pro-select pro-select-arrow">
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Urgent</option>
                    </Select>
                )} />
                <Controller name="assignedToId" control={control} render={({ field }) => (
                    <Select {...field} value={field.value ?? ''} error={errors.assignedToId?.message} className="pro-select pro-select-arrow">
                        <option value="">Unassigned</option>
                        {assignableUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, ' ')})</option>
                        ))}
                    </Select>
                )} />
                <Controller
                  name="attachment"
                  control={control}
                  render={({ field, fieldState }) => (
                      <UploadDocument
                          label="Attach Screenshot or Document (Image only)"
                          file={field.value}
                          onFileChange={field.onChange}
                          allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
                          error={fieldState.error?.message}
                      />
                  )}
                />
            </form>

            <footer className="p-4 flex-shrink-0 flex items-center justify-end gap-3 border-t border-[#374151]">
                <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
                <Button type="submit" form={formId} isLoading={isSubmitting}>Create Post</Button>
            </footer>
        </div>
    );
  }

  // Desktop Modal View
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card w-full max-w-lg m-4 animate-fade-in-scale flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex-shrink-0">
          <h3 className="text-lg font-bold text-primary-text">Create New Post</h3>
        </div>
        
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-4">
            <Input label="Title / Subject" {...register('title')} error={errors.title?.message} />
            <div>
              <label className="block text-sm font-medium text-muted">Description</label>
              <textarea {...register('description')} rows={5} className={`mt-1 form-input ${errors.description ? 'form-input--error' : ''}`} />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Controller name="category" control={control} render={({ field }) => (
                <Select label="Category" {...field} error={errors.category?.message}>
                  <option>Software Developer</option>
                  <option>Admin</option>
                  <option>Operational</option>
                  <option>HR Query</option>
                  <option>Other</option>
                </Select>
              )} />
              <Controller name="priority" control={control} render={({ field }) => (
                <Select label="Priority" {...field} error={errors.priority?.message}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </Select>
              )} />
            </div>
             <Controller name="assignedToId" control={control} render={({ field }) => (
                <Select label="Assigned To (Optional)" {...field} value={field.value ?? ''} error={errors.assignedToId?.message}>
                    <option value="">Unassigned</option>
                    {assignableUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, ' ')})</option>
                    ))}
                </Select>
            )} />
            <Controller
              name="attachment"
              control={control}
              render={({ field, fieldState }) => (
                  <UploadDocument
                      label="Attach Screenshot or Document (Image only)"
                      file={field.value}
                      onFileChange={field.onChange}
                      allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
                      error={fieldState.error?.message}
                  />
              )}
            />
          </div>
        </form>
        
        <div className="p-6 mt-auto border-t flex-shrink-0 flex justify-end space-x-3">
          <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
          <Button type="submit" form={formId} isLoading={isSubmitting}>Create Post</Button>
        </div>
      </div>
    </div>
  );
};

export default NewTicketModal;