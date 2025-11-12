import React, { useState, useEffect } from 'react';
import { useForm, Controller, type SubmitHandler, type Resolver } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { api } from '../../services/api';
import type { User } from '../../types';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import DatePicker from '../ui/DatePicker';
import Modal from '../ui/Modal';
import { format } from 'date-fns';

interface GrantCompOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const schema = yup.object({
  userId: yup.string().required('Please select an employee.'),
  dateEarned: yup.string().required('Please select the date the comp-off was earned.'),
  reason: yup.string().required('A reason is required (e.g., Worked on Sunday, Holiday duty).').min(5, 'Reason is too short.'),
}).defined();

type FormData = {
    userId: string;
    dateEarned: string;
    reason: string;
}

const GrantCompOffModal: React.FC<GrantCompOffModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user: granter } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, handleSubmit, control, formState: { errors }, reset } = useForm<FormData>({
        resolver: yupResolver(schema) as Resolver<FormData>,
        defaultValues: {
            dateEarned: format(new Date(), 'yyyy-MM-dd')
        }
    });

    useEffect(() => {
        if (isOpen) {
            api.getUsers().then(setUsers);
        } else {
            reset({ userId: '', dateEarned: format(new Date(), 'yyyy-MM-dd'), reason: '' });
        }
    }, [isOpen, reset]);

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        if (!granter) return;
        setIsSubmitting(true);
        try {
            const selectedUser = users.find(u => u.id === data.userId);
            await api.addCompOffLog({
                ...data,
                userName: selectedUser?.name || '',
                status: 'earned',
                grantedById: granter.id,
                grantedByName: granter.name,
            });
            onSuccess();
        } catch (error) {
            console.error("Failed to grant comp-off", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleSubmit(onSubmit)}
            title="Grant Compensatory Off"
            confirmButtonText="Grant"
            confirmButtonVariant="primary"
            isConfirming={isSubmitting}
        >
            <div className="space-y-4">
                <Controller
                    name="userId"
                    control={control}
                    render={({ field }) => (
                        <Select label="Select Employee" {...field} error={errors.userId?.message}>
                            <option value="">-- Select an Employee --</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </Select>
                    )}
                />
                 <Controller
                    name="dateEarned"
                    control={control}
                    render={({ field }) => (
                        <DatePicker 
                            label="Date Worked / Earned"
                            id="dateEarned"
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.dateEarned?.message}
                            maxDate={new Date()}
                        />
                    )}
                />
                 <Input 
                    label="Reason for Comp-Off" 
                    id="reason" 
                    {...register('reason')} 
                    error={errors.reason?.message} 
                    placeholder="e.g., Worked on Sunday"
                />
            </div>
        </Modal>
    );
};

export default GrantCompOffModal;
