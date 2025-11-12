import React, { useEffect } from 'react';
import { useForm, Controller, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { Insurance, InsuranceType } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';

const schema = yup.object({
    type: yup.string<InsuranceType>().oneOf(['GMC', 'GPA', 'WCA', 'Other']).required('Type is required'),
    provider: yup.string().required('Provider is required'),
    policyNumber: yup.string().required('Policy number is required'),
    validTill: yup.string().required('Valid till date is required'),
}).defined();

interface InsuranceFormProps {
  onSave: (data: Omit<Insurance, 'id'>) => void;
  onClose: () => void;
  initialData?: Insurance | null;
}

const InsuranceForm: React.FC<InsuranceFormProps> = ({ onSave, onClose, initialData }) => {
    const { register, handleSubmit, control, formState: { errors }, reset } = useForm<Omit<Insurance, 'id'>>({
        resolver: yupResolver(schema) as Resolver<Omit<Insurance, 'id'>>,
    });

    useEffect(() => {
        reset(initialData || { type: 'GMC', provider: '', policyNumber: '', validTill: '' });
    }, [initialData, reset]);

    const onSubmit: SubmitHandler<Omit<Insurance, 'id'>> = (data) => {
        onSave(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <h3 className="text-lg font-bold mb-4">{initialData ? 'Edit' : 'Add'} Insurance</h3>
                    <div className="space-y-4">
                        <Select label="Insurance Type" id="type" registration={register('type')} error={errors.type?.message}>
                            <option>GMC</option><option>GPA</option><option>WCA</option><option>Other</option>
                        </Select>
                        <Input label="Provider" id="provider" registration={register('provider')} error={errors.provider?.message} />
                        <Input label="Policy Number" id="policyNumber" registration={register('policyNumber')} error={errors.policyNumber?.message} />
                        <Controller
                            name="validTill"
                            control={control}
                            render={({ field }) => (
                                <DatePicker label="Valid Till" id="validTill" value={field.value} onChange={field.onChange} error={errors.validTill?.message} />
                            )}
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Insurance</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InsuranceForm;