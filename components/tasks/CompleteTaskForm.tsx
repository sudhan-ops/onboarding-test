import React from 'react';
import { useForm, Controller, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { Task, UploadedFile } from '../../types';
import { useTaskStore } from '../../store/taskStore';
import Button from '../ui/Button';
import UploadDocument from '../UploadDocument';

interface CompleteTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  setToast: (toast: { message: string; type: 'success' | 'error' }) => void;
}

const validationSchema = yup.object({
  completionNotes: yup.string().required('Completion notes are required').min(10, 'Please provide more detail.'),
  completionPhoto: yup.mixed<UploadedFile | null>().required('A photo proof of completion is required.').nullable(),
}).defined();

type CompleteTaskFormInputs = {
    completionNotes: string;
    completionPhoto: UploadedFile | null;
}

const CompleteTaskForm: React.FC<CompleteTaskFormProps> = ({ isOpen, onClose, task, setToast }) => {
  const { updateTask } = useTaskStore();
  const [isSaving, setIsSaving] = React.useState(false);

  const { handleSubmit, formState: { errors }, reset, control } = useForm<CompleteTaskFormInputs>({
    resolver: yupResolver(validationSchema) as Resolver<CompleteTaskFormInputs>,
    defaultValues: { completionNotes: '', completionPhoto: null }
  });

  const onSubmit: SubmitHandler<CompleteTaskFormInputs> = async (data) => {
    setIsSaving(true);
    try {
        await updateTask(task.id, {
            ...data,
            status: 'Done'
        });
        setToast({ message: 'Task completed successfully!', type: 'success' });
        onClose();
    } catch (error) {
        setToast({ message: 'Failed to complete task.', type: 'error' });
    } finally {
        setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-lg m-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <h3 className="text-lg font-bold text-primary-text">Complete Task: {task.name}</h3>
          <p className="text-sm text-muted mb-4">Provide a summary and photo proof of your work.</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="completionNotes" className="block text-sm font-medium text-muted">Completion Notes</label>
              <textarea
                id="completionNotes"
                rows={4}
                {...control.register('completionNotes')}
                className={`mt-1 bg-card border ${errors.completionNotes ? 'border-red-500' : 'border-border'} rounded-lg px-3 py-2.5 w-full sm:text-sm focus:ring-1 focus:ring-accent`}
              />
              {errors.completionNotes && <p className="mt-1 text-xs text-red-600">{errors.completionNotes.message}</p>}
            </div>
             <Controller
                name="completionPhoto"
                control={control}
                render={({ field }) => (
                    <UploadDocument
                        label="Upload Photo Proof"
                        file={field.value}
                        onFileChange={field.onChange}
                        allowedTypes={['image/jpeg', 'image/png']}
                    />
                )}
            />
            {errors.completionPhoto && <p className="mt-1 text-xs text-red-600">{errors.completionPhoto.message as string}</p>}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
            <Button type="submit" isLoading={isSaving}>Mark as Done</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteTaskForm;