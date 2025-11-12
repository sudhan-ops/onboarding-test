import React, { useEffect, useState } from 'react';
import { useForm, Controller, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { Task, TaskPriority, User } from '../../types';
import { useTaskStore } from '../../store/taskStore';
import { api } from '../../services/api';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { usePermissionsStore } from '../../store/permissionsStore';
import { useNotificationStore } from '../../store/notificationStore';

const validationSchema = yup.object({
  name: yup.string().required('Task name is required'),
  description: yup.string().required('Description is required'),
  dueDate: yup.string().required('A due date is required').nullable(),
  priority: yup.string<TaskPriority>().oneOf(['Low', 'Medium', 'High']).required('Priority is required'),
  assignedToId: yup.string().required('An assignee is required'),
  escalationLevel1UserId: yup.string().optional(),
  escalationLevel1DurationDays: yup.number().when('escalationLevel1UserId', {
    is: (val: string | undefined) => !!val,
    then: schema => schema.required('Duration is required').min(0).typeError('Must be a number'),
    otherwise: schema => schema.optional().nullable(),
  }),
  escalationLevel2UserId: yup.string().optional(),
  escalationLevel2DurationDays: yup.number().when('escalationLevel2UserId', {
    is: (val: string | undefined) => !!val,
    then: schema => schema.required('Duration is required').min(0).typeError('Must be a number'),
    otherwise: schema => schema.optional().nullable(),
  }),
  escalationEmail: yup.string().email('Must be a valid email address').optional(),
  escalationEmailDurationDays: yup.number().when('escalationEmail', {
      is: (val: string | undefined) => !!val,
      then: schema => schema.required('Duration is required').min(0).typeError('Must be a number'),
      otherwise: schema => schema.optional().nullable(),
  }),
}).defined();

type TaskFormInputs = Omit<Task, 'id' | 'createdAt' | 'status' | 'assignedToName' | 'completionNotes' | 'completionPhoto' | 'escalationStatus'>;

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Task | null;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, initialData, setToast }) => {
  const { createTask, updateTask } = useTaskStore();
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const { permissions } = usePermissionsStore();
  const { fetchNotifications } = useNotificationStore();

  const { register, handleSubmit, formState: { errors }, reset, control, watch } = useForm<TaskFormInputs>({
    resolver: yupResolver(validationSchema) as Resolver<TaskFormInputs>,
  });
  
  const isEditing = !!initialData;
  const watchEscalationL1User = watch("escalationLevel1UserId");
  const watchEscalationL2User = watch("escalationLevel2UserId");
  const watchEscalationEmail = watch("escalationEmail");

  useEffect(() => {
    if (isOpen) {
        api.getUsers().then(setUsers);
        if (initialData) {
          reset(initialData);
        } else {
          reset({ name: '', description: '', dueDate: null, priority: 'Medium', assignedToId: '' });
        }
    }
  }, [initialData, reset, isOpen]);

  const onSubmit: SubmitHandler<TaskFormInputs> = async (data) => {
    setIsSaving(true);
    try {
      const assignedUser = users.find(u => u.id === data.assignedToId);
      const taskData = { ...data, assignedToName: assignedUser?.name };
      
      if (isEditing) {
        await updateTask(initialData!.id, taskData);
        setToast({ message: 'Task updated successfully!', type: 'success' });
      } else {
        await createTask(taskData);
        setToast({ message: `Task created successfully.`, type: 'success' });
      }

      if (assignedUser && assignedUser.id !== initialData?.assignedToId) {
          const userPermissions = permissions[assignedUser.role] || [];
          const canManageTasks = userPermissions.includes('manage_tasks');
          const tasksLink = canManageTasks ? '/tasks' : '/onboarding/tasks';

          await api.createNotification({
              userId: assignedUser.id,
              type: 'task_assigned',
              message: `You have been assigned a new task: "${data.name}"`,
              linkTo: tasksLink,
          });
          fetchNotifications();
      }

      onClose();
    } catch (error) {
      setToast({ message: 'Failed to save task.', type: 'error' });
    } finally {
        setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-2xl m-4 animate-fade-in-scale overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <h3 className="text-lg font-bold text-primary-text mb-4">{isEditing ? 'Edit' : 'Add'} Task</h3>
          <div className="space-y-4">
            <Input label="Task Name" id="name" registration={register('name')} error={errors.name?.message} />
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-muted">Description</label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                className={`mt-1 bg-card border ${errors.description ? 'border-red-500' : 'border-border'} rounded-lg px-3 py-2.5 w-full sm:text-sm focus:ring-1 focus:ring-accent`}
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                name="dueDate"
                control={control}
                render={({ field }) => (
                  <DatePicker label="Due Date" id="dueDate" value={field.value} onChange={field.onChange} error={errors.dueDate?.message} minDate={new Date()} />
                )}
              />
              <Select label="Priority" id="priority" registration={register('priority')} error={errors.priority?.message}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
              </Select>
            </div>
             <Select label="Assign To" id="assignedToId" registration={register('assignedToId')} error={errors.assignedToId?.message}>
                <option value="">Select User</option>
                {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name} ({user.role.replace(/_/g, ' ')})</option>
                ))}
            </Select>

            <div className="pt-4 border-t">
                 <h4 className="text-md font-semibold text-primary-text mb-2">Escalation Matrix (Optional)</h4>
                 <p className="text-sm text-muted mb-4">Define who gets notified if this task becomes overdue and set the time gaps for each escalation.</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <Select label="Escalation Level 1" id="escalationLevel1UserId" registration={register('escalationLevel1UserId')} error={errors.escalationLevel1UserId?.message}>
                        <option value="">Select User</option>
                        {users.map(user => (<option key={user.id} value={user.id}>{user.name}</option>))}
                    </Select>
                     {watchEscalationL1User && (
                         <Input label="Days until L1 Escalation" id="escalationLevel1DurationDays" type="number" registration={register('escalationLevel1DurationDays')} error={errors.escalationLevel1DurationDays?.message} />
                     )}
                     <Select label="Escalation Level 2" id="escalationLevel2UserId" registration={register('escalationLevel2UserId')} error={errors.escalationLevel2UserId?.message}>
                        <option value="">Select User</option>
                        {users.map(user => (<option key={user.id} value={user.id}>{user.name}</option>))}
                    </Select>
                     {watchEscalationL2User && (
                         <Input label="Days until L2 Escalation" id="escalationLevel2DurationDays" type="number" registration={register('escalationLevel2DurationDays')} error={errors.escalationLevel2DurationDays?.message} />
                     )}
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <Input label="Final Escalation Email" id="escalationEmail" type="email" registration={register('escalationEmail')} error={errors.escalationEmail?.message} />
                    {watchEscalationEmail && (
                        <Input label="Days until Final Escalation" id="escalationEmailDurationDays" type="number" registration={register('escalationEmailDurationDays')} error={errors.escalationEmailDurationDays?.message} />
                    )}
                 </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
            <Button type="submit" isLoading={isSaving}>{isEditing ? 'Save Changes' : 'Create Task'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;