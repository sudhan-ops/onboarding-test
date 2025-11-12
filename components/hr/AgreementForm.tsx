import React, { useEffect } from 'react';
import { useForm, Controller, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { Agreement, UploadedFile } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import UploadDocument from '../UploadDocument';

const schema = yup.object({
    id: yup.string().required(),
    name: yup.string().required('Agreement name is required'),
    fromDate: yup.string().optional().nullable(),
    toDate: yup.string().optional().nullable().test('is-after-from', 'To Date must be after From Date', function (value) {
        const { fromDate } = this.parent;
        if (!fromDate || !value) return true;
        return new Date(value.replace(/-/g, '/')) >= new Date(fromDate.replace(/-/g, '/'));
    }),
    renewalIntervalDays: yup.number().typeError('Must be a number').nullable().optional().min(0, 'Cannot be negative'),
    softCopy: yup.mixed<UploadedFile | null>().nullable().optional(),
    scannedCopy: yup.mixed<UploadedFile | null>().nullable().optional(),
    agreementDate: yup.string().optional().nullable(),
    addendum1Date: yup.string().optional().nullable(),
    addendum2Date: yup.string().optional().nullable(),
}).defined();

interface AgreementFormProps {
  onSave: (data: Omit<Agreement, 'id'>) => void;
  onClose: () => void;
  initialData?: Agreement | null;
}

const AgreementForm: React.FC<AgreementFormProps> = ({ onSave, onClose, initialData }) => {
    const { register, handleSubmit, control, formState: { errors }, reset } = useForm<Agreement>({
        resolver: yupResolver(schema) as Resolver<Agreement>,
    });

    useEffect(() => {
        reset(initialData || { id: '', name: '', fromDate: '', toDate: '', renewalIntervalDays: null, agreementDate: '' });
    }, [initialData, reset]);

    const onSubmit: SubmitHandler<Agreement> = (data) => {
        const { id, ...saveData } = data;
        onSave(saveData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-3xl m-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <h3 className="text-lg font-bold mb-4">{initialData ? 'Edit' : 'Add'} Agreement</h3>
                    <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6">
                        <Input label="Agreement Name / Title" id="name" registration={register('name')} error={errors.name?.message} />

                        <fieldset className="border p-4 rounded-lg">
                            <legend className="text-md font-semibold px-2">Existing Agreement Period</legend>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                <Controller name="fromDate" control={control} render={({ field }) => ( <DatePicker label="From Date" id="fromDate" value={field.value} onChange={field.onChange} error={errors.fromDate?.message} /> )} />
                                <Controller name="toDate" control={control} render={({ field }) => ( <DatePicker label="To Date" id="toDate" value={field.value} onChange={field.onChange} error={errors.toDate?.message} /> )} />
                                <Input label="Renewal Interval (Days)" id="renewalIntervalDays" type="number" registration={register('renewalIntervalDays')} error={errors.renewalIntervalDays?.message} />
                            </div>
                        </fieldset>

                        <fieldset className="border p-4 rounded-lg">
                            <legend className="text-md font-semibold px-2">Attachments</legend>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <Controller name="softCopy" control={control} render={({ field }) => ( <UploadDocument label="Soft Copy in Word Document" file={field.value} onFileChange={field.onChange} /> )} />
                                <Controller name="scannedCopy" control={control} render={({ field }) => ( <UploadDocument label="Scanned Copy of Signed Document" file={field.value} onFileChange={field.onChange} /> )} />
                             </div>
                        </fieldset>

                        <fieldset className="border p-4 rounded-lg">
                            <legend className="text-md font-semibold px-2">Agreement Main Details</legend>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                <Controller name="agreementDate" control={control} render={({ field }) => ( <DatePicker label="Agreement Dated" id="agreementDate" value={field.value} onChange={field.onChange} error={errors.agreementDate?.message} /> )} />
                                <Controller name="addendum1Date" control={control} render={({ field }) => ( <DatePicker label="Addendum 1 Dated" id="addendum1Date" value={field.value} onChange={field.onChange} error={errors.addendum1Date?.message} /> )} />
                                <Controller name="addendum2Date" control={control} render={({ field }) => ( <DatePicker label="Addendum 2 Dated" id="addendum2Date" value={field.value} onChange={field.onChange} error={errors.addendum2Date?.message} /> )} />
                             </div>
                        </fieldset>
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Agreement</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgreementForm;