import React, { useState, useMemo, useEffect } from 'react';
// The named import from react-router-dom is correct. No changes were needed.
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
// Fix: Use inline type import for SubmitHandler
import { useForm, useFieldArray, Controller, type SubmitHandler, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { EducationRecord, UploadedFile } from '../../types';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Plus, Trash2 } from 'lucide-react';
import FormHeader from '../../components/onboarding/FormHeader';
import UploadDocument from '../../components/UploadDocument';
import { Type } from '@google/genai';
import { useAuthStore } from '../../store/authStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface OutletContext {
  onValidated: () => Promise<void>;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

const EducationDetails = () => {
    const { onValidated, setToast } = useOutletContext<OutletContext>();
    const { user } = useAuthStore();
    const { data: onboardingData, updateEducation, updateEducationRecord } = useOnboardingStore();
    const isMobile = useMediaQuery('(max-width: 767px)');

    const isAdminOrManager = useMemo(() => /manager|admin|head/i.test(onboardingData.organization.designation), [onboardingData.organization.designation]);

    // Fix: Removed generic type argument from yup.mixed
    const educationRecordSchema = useMemo(() => yup.object({
      id: yup.string().required(),
      degree: yup.string().required('Degree is required'),
      institution: yup.string().required('Institution is required'),
      startYear: yup.string().required('Start year is required').matches(/^\d{4}$/, 'Must be a 4-digit year'),
      endYear: yup.string().required('End year is required').matches(/^\d{4}$/, 'Must be a 4-digit year')
        .test('is-after-start-year', 'End year must be on or after start year', function(value) {
          const { startYear } = this.parent;
          return !startYear || !value || parseInt(value) >= parseInt(startYear);
        }),
      percentage: yup.number().nullable().min(0).max(100).optional(),
      grade: yup.string().optional(),
      document: yup.mixed<UploadedFile | null>().nullable()
        .when([], {
          is: () => isAdminOrManager,
          then: schema => schema.required("Certificate is mandatory for this role.").nullable(),
          otherwise: schema => schema.optional().nullable(),
        }),
    }).defined(), [isAdminOrManager]);

    // Fix: Removed generic type argument from yup.object
    const educationDetailsSchema = yup.object({
      education: yup.array().of(educationRecordSchema).required()
    });

    const { control, handleSubmit, formState: { errors }, setValue, reset, watch } = useForm<{ education: EducationRecord[] }>({
        resolver: yupResolver(educationDetailsSchema) as unknown as Resolver<{ education: EducationRecord[] }>,
        context: { isAdminOrManager },
        mode: 'onBlur',
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'education' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recordToRemove, setRecordToRemove] = useState<number | null>(null);

    useEffect(() => {
        // Sync form with global store data, which might have been pre-filled
        reset({ education: onboardingData.education });
    }, [onboardingData.education, reset]);

    // This effect syncs the form state back to the Zustand store on change, with a debounce.
    useEffect(() => {
        let debounceTimer: number;
        const subscription = watch((value) => {
            clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                updateEducation((value as { education: EducationRecord[] }).education);
            }, 500);
        });
        return () => {
            subscription.unsubscribe();
            clearTimeout(debounceTimer);
        };
    }, [watch, updateEducation]);


    const handleAddRecord = () => {
        append({ id: `edu_${Date.now()}`, degree: '', institution: '', startYear: '', endYear: '' });
    };

    const handleRemoveClick = (index: number) => {
        setRecordToRemove(index);
        setIsModalOpen(true);
    };

    const handleConfirmRemove = () => {
        if (recordToRemove !== null) {
            remove(recordToRemove);
            setIsModalOpen(false);
            setRecordToRemove(null);
        }
    };
    
    const onSubmit: SubmitHandler<{ education: EducationRecord[] }> = async (formData) => {
        updateEducation(formData.education);
        await onValidated();
    };

    const handleOcrComplete = (index: number) => (extractedData: any) => {
        const recordId = fields[index].id;
        const update: Partial<EducationRecord> = {};
    
        if (extractedData.degree) {
            setValue(`education.${index}.degree`, extractedData.degree, { shouldValidate: true });
            update.degree = extractedData.degree;
        }
        if (extractedData.institution) {
            setValue(`education.${index}.institution`, extractedData.institution, { shouldValidate: true });
            update.institution = extractedData.institution;
        }
        if (extractedData.endYear) {
            const year = extractedData.endYear.toString();
            setValue(`education.${index}.endYear`, year, { shouldValidate: true });
            update.endYear = year;
        }
    
        if (Object.keys(update).length > 0) {
            updateEducationRecord(recordId, update);
            setToast({ message: 'Education details auto-filled.', type: 'success' });
        }
    };

    const educationSchema = {
        type: Type.OBJECT,
        properties: {
            degree: { type: Type.STRING, description: "The name of the degree, diploma, or certificate." },
            institution: { type: Type.STRING, description: "The name of the university, college, or institution." },
            endYear: { type: Type.STRING, description: "The year of completion or graduation as a 4-digit number." },
        },
        required: ["degree", "institution", "endYear"],
    };
    
    if (isMobile) {
        return (
            <form onSubmit={handleSubmit(onSubmit)} id="education-form">
                <p className="text-sm text-gray-400 mb-6">List educational qualifications, starting with the most recent.</p>
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border border-border rounded-xl relative space-y-4">
                            <button type="button" onClick={() => handleRemoveClick(index)} className="absolute top-2 right-2 p-1 text-red-500 rounded-full z-10" aria-label="Remove qualification">
                                <Trash2 className="h-5 w-5" />
                            </button>
                            <Controller name={`education.${index}.degree`} control={control} render={({ field }) => <input placeholder="Degree / Certificate" {...field} className="form-input"/>} />
                            <Controller name={`education.${index}.institution`} control={control} render={({ field }) => <input placeholder="Institution / University" {...field} className="form-input"/>} />
                            <Controller name={`education.${index}.endYear`} control={control} render={({ field }) => <input placeholder="Year of Completion" type="text" maxLength={4} {...field} className="form-input"/>} />
                            <Controller name={`education.${index}.document`} control={control} render={({ field, fieldState }) => (
                                <UploadDocument label={`Certificate ${isAdminOrManager ? '(Mandatory)' : '(Optional)'}`} file={field.value} onFileChange={field.onChange} error={fieldState.error?.message} allowCapture />
                            )} />
                        </div>
                    ))}
                </div>
                 <Button type="button" onClick={handleAddRecord} variant="secondary" className="mt-6 w-full flex items-center justify-center">
                    <Plus className="mr-2 h-4 w-4" /> Add Qualification
                </Button>
            </form>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} id="education-form">
            <Modal 
              isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleConfirmRemove}
              title="Confirm Deletion"
            >
              Are you sure you want to remove this education record? This action cannot be undone.
            </Modal>
            
            <FormHeader title="Education Details" subtitle="List your educational qualifications, starting with the most recent." />
            
            <div className="space-y-6">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border border-border rounded-xl relative">
                        <button type="button" onClick={() => handleRemoveClick(index)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 rounded-full" aria-label={`Remove ${field.degree}`}>
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Controller name={`education.${index}.degree`} control={control} render={({ field }) => <Input label="Degree / Certificate" id={field.name} error={errors.education?.[index]?.degree?.message} {...field}/>} />
                            <Controller name={`education.${index}.institution`} control={control} render={({ field }) => <Input label="Institution / University" id={field.name} error={errors.education?.[index]?.institution?.message} {...field}/>} />
                            <Controller name={`education.${index}.startYear`} control={control} render={({ field }) => <Input label="Start Year" id={field.name} type="text" maxLength={4} error={errors.education?.[index]?.startYear?.message} {...field}/>} />
                            <Controller name={`education.${index}.endYear`} control={control} render={({ field }) => <Input label="End Year" id={field.name} type="text" maxLength={4} error={errors.education?.[index]?.endYear?.message} {...field}/>} />
                            <Controller name={`education.${index}.percentage`} control={control} render={({ field }) => <Input label="Percentage (Optional)" id={field.name} type="number" error={errors.education?.[index]?.percentage?.message} {...field} value={field.value ?? ''} />} />
                            <Controller name={`education.${index}.grade`} control={control} render={({ field }) => <Input label="Grade (Optional)" id={field.name} type="text" error={errors.education?.[index]?.grade?.message} {...field} value={field.value ?? ''} />} />
                           <div className="sm:col-span-2">
                             <Controller name={`education.${index}.document`} control={control} render={({ field, fieldState }) => (
                                <UploadDocument
                                    label={`Upload Certificate ${isAdminOrManager ? '(Mandatory)' : '(Optional)'}`}
                                    file={field.value}
                                    onFileChange={field.onChange}
                                    onOcrComplete={handleOcrComplete(index)}
                                    ocrSchema={educationSchema}
                                    setToast={setToast}
                                    error={fieldState.error?.message as string}
                                />
                             )} />
                           </div>
                        </div>
                    </div>
                ))}
            </div>

            <Button type="button" onClick={handleAddRecord} variant="outline" className="mt-6">
                <Plus className="mr-2 h-4 w-4" /> Add Qualification
            </Button>
        </form>
    );
};

export default EducationDetails;