
import React, { useState, useEffect } from 'react';
import { useForm, Controller, type SubmitHandler, type Resolver } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import DatePicker from '../ui/DatePicker';
import { format } from 'date-fns';

interface ClaimExtraWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const schema = yup.object({
  workDate: yup.string().required('Date of work is required.'),
  workType: yup.string().oneOf(['Holiday', 'Week Off', 'Night Shift']).required('Work type is required.'),
  claimType: yup.string().oneOf(['OT', 'Comp Off']).required('Claim type is required.'),
  hoursWorked: yup.number().when('claimType', {
    is: 'OT',
    then: (schema) => schema.required('Hours are required for OT claims.').min(0.5, 'Minimum 0.5 hours.').typeError('Must be a number.'),
    otherwise: (schema) => schema.optional().nullable(),
  }),
  reason: yup.string().required('A reason is required.').min(10, 'Please provide more details.'),
}).defined();

type FormData = {
    workDate: string;
    workType: 'Holiday' | 'Week Off' | 'Night Shift';
    claimType: 'OT' | 'Comp Off';
    hoursWorked?: number | null;
    reason: string;
}

const ClaimExtraWorkModal: React.FC<ClaimExtraWorkModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { register, handleSubmit, control, watch, formState: { errors }, reset } = useForm<FormData>({
        resolver: yupResolver(schema) as unknown as Resolver<FormData>,
        defaultValues: {
            workDate: format(new Date(), 'yyyy-MM-dd'),
            workType: 'Week Off',
            claimType: 'OT',
        }
    });
    
    const claimType = watch('claimType');

    useEffect(() => {
        if (!isOpen) {
            reset();
        }
    }, [isOpen, reset]);

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await api.submitExtraWorkClaim({
                ...data,
                userId: user.id,
                userName: user.name,
            });
            onSuccess();
        } catch (error) {
            console.error("Failed to submit claim", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-lg m-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <h3 className="text-lg font-bold text-primary-text mb-4">Claim Overtime / Comp-off</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Controller
                                name="workDate"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker 
                                        label="Date of Work"
                                        id="workDate"
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.workDate?.message}
                                        maxDate={new Date()}
                                    />
                                )}
                            />
                             <Controller
                                name="workType"
                                control={control}
                                render={({ field }) => (
                                    <Select label="Type of Work" {...field} error={errors.workType?.message}>
                                        <option>Week Off</option>
                                        <option>Holiday</option>
                                        <option>Night Shift</option>
                                    </Select>
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted mb-2">Claim As</label>
                            <div className="flex gap-4">
                               <Controller name="claimType" control={control} render={({ field }) => (
                                   <>
                                        <label className="flex items-center gap-2 p-3 border rounded-lg flex-1 cursor-pointer hover:bg-page">
                                            <input type="radio" {...field} value="OT" checked={field.value === 'OT'} className="h-4 w-4 text-accent focus:ring-accent" />
                                            Overtime (OT)
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-lg flex-1 cursor-pointer hover:bg-page">
                                            <input type="radio" {...field} value="Comp Off" checked={field.value === 'Comp Off'} className="h-4 w-4 text-accent focus:ring-accent" />
                                            Compensatory Off
                                        </label>
                                   </>
                               )} />
                            </div>
                        </div>
                        {claimType === 'OT' && (
                            <Input label="Hours Worked" id="hoursWorked" type="number" step="0.5" {...register('hoursWorked')} error={errors.hoursWorked?.message} />
                        )}
                        <Input label="Reason / Description of Work" id="reason" {...register('reason')} error={errors.reason?.message} />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Submit Claim</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClaimExtraWorkModal;
