import React, { useEffect, useState } from 'react';
// Fix: Use inline type import for SubmitHandler
import { useForm, Controller, type SubmitHandler, type Resolver } from 'react-hook-form';
// The named import from react-router-dom is correct. No changes were needed.
import { useOutletContext } from 'react-router-dom';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useOnboardingStore } from '../../store/onboardingStore';
import type { BankDetails, UploadedFile } from '../../types';
import FormHeader from '../../components/onboarding/FormHeader';
import UploadDocument from '../../components/UploadDocument';
import { Type } from '@google/genai';
import VerifiedInput from '../../components/ui/VerifiedInput';
import { useAuthStore } from '../../store/authStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const formatNameToTitleCase = (value: string | undefined) => {
    if (!value) return '';
    return value.toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase());
}

const nameValidation = yup.string().matches(/^[a-zA-Z\s.'-]*$/, 'Name can only contain letters and spaces').transform(formatNameToTitleCase);

// Fix: Removed generic type argument from yup.object and yup.mixed
export const bankDetailsSchema = yup.object({
    accountHolderName: nameValidation.required('Account holder name is required'),
    accountNumber: yup.string().required('Account number is required').matches(/^[0-9]+$/, "Must be only digits"),
    confirmAccountNumber: yup.string()
        .oneOf([yup.ref('accountNumber')], 'Account numbers must match')
        .required('Please confirm your account number'),
    ifscCode: yup.string().required('IFSC code is required').transform(v => v.toUpperCase()).matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g., SBIN0123456)'),
    bankName: yup.string().required('Bank name is required'),
    branchName: yup.string().required('Branch name is required'),
    bankProof: yup.mixed().optional().nullable(),
    verifiedStatus: yup.object().optional(),
}).defined();

interface OutletContext {
  onValidated: () => Promise<void>;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

const BankDetails = () => {
    const { onValidated, setToast } = useOutletContext<OutletContext>();
    const { user } = useAuthStore();
    const { data, updateBank, setBankVerifiedStatus } = useOnboardingStore();
    const isMobile = useMediaQuery('(max-width: 767px)');

    const { register, handleSubmit, formState: { errors }, control, setValue, watch, reset } = useForm<BankDetails>({
        // FIX: Cast resolver to resolve type incompatibility between yup and react-hook-form.
        resolver: yupResolver(bankDetailsSchema) as unknown as Resolver<BankDetails>,
        defaultValues: data.bank,
    });
    
    useEffect(() => {
        // Sync form with global store data, which might have been pre-filled
        reset(data.bank);
    }, [data.bank, reset]);
    
    // This effect syncs the form state back to the Zustand store on change, with a debounce.
    useEffect(() => {
        let debounceTimer: number;
        const subscription = watch((value) => {
            clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                updateBank(value as BankDetails);
            }, 500);
        });
        return () => {
            subscription.unsubscribe();
            clearTimeout(debounceTimer);
        };
    }, [watch, updateBank]);
    
    const bankData = watch();

    const onSubmit: SubmitHandler<BankDetails> = async (formData) => {
        updateBank(formData);
        await onValidated();
    };
    
    const handleNameBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setValue('accountHolderName', formatNameToTitleCase(value), { shouldValidate: true });
    };

     const handleManualInput = (fieldsToUnverify: Array<keyof BankDetails['verifiedStatus']>) => {
        const statusUpdate: Partial<BankDetails['verifiedStatus']> = {};
        fieldsToUnverify.forEach(field => {
            statusUpdate[field] = false;
        });
        setBankVerifiedStatus(statusUpdate);
    };

    const handleOcrComplete = (extractedData: any) => {
        const bankUpdate: Partial<BankDetails> = {};
        const newVerifiedStatus: Partial<BankDetails['verifiedStatus']> = {};

        if (extractedData.accountHolderName) {
            const formattedName = formatNameToTitleCase(extractedData.accountHolderName);
            setValue('accountHolderName', formattedName, { shouldValidate: true });
            bankUpdate.accountHolderName = formattedName;
            newVerifiedStatus.accountHolderName = true;
        }
        if (extractedData.accountNumber) {
            const acNum = extractedData.accountNumber.replace(/\D/g, '');
            setValue('accountNumber', acNum, { shouldValidate: true });
            setValue('confirmAccountNumber', acNum, { shouldValidate: true });
            bankUpdate.accountNumber = acNum;
            bankUpdate.confirmAccountNumber = acNum;
            newVerifiedStatus.accountNumber = true;
        }
        if (extractedData.ifscCode) {
            const ifsc = extractedData.ifscCode.toUpperCase().replace(/\s/g, '');
            setValue('ifscCode', ifsc, { shouldValidate: true });
            bankUpdate.ifscCode = ifsc;
            newVerifiedStatus.ifscCode = true;
        }
        if (extractedData.bankName) {
            setValue('bankName', extractedData.bankName, { shouldValidate: true });
            bankUpdate.bankName = extractedData.bankName;
        }
        if (extractedData.branchName) {
            setValue('branchName', extractedData.branchName, { shouldValidate: true });
            bankUpdate.branchName = extractedData.branchName;
        }

        if (Object.keys(bankUpdate).length > 0) {
            updateBank(bankUpdate);
        }
        setBankVerifiedStatus(newVerifiedStatus);
        setToast({ message: 'Bank details extracted. Please review.', type: 'success' });
    };

    const bankProofSchema = {
        type: Type.OBJECT,
        properties: {
            accountHolderName: { type: Type.STRING, description: "The account holder's full name." },
            accountNumber: { type: Type.STRING, description: "The full bank account number." },
            ifscCode: { type: Type.STRING, description: "The bank's IFSC code." },
            bankName: { type: Type.STRING, description: "The name of the bank (e.g., 'State Bank of India')." },
            branchName: { type: Type.STRING, description: "The name of the bank branch (e.g., 'Koramangala Branch')." },
        },
        required: ["accountHolderName", "accountNumber", "ifscCode", "bankName", "branchName"],
    };
    
    if (isMobile) {
        return (
            <form onSubmit={handleSubmit(onSubmit)} id="bank-form">
                <p className="text-sm text-gray-400 mb-6">Your salary will be credited to this account.</p>
                <div className="space-y-4">
                    <input placeholder="Account Holder Name" {...register('accountHolderName')} onBlur={handleNameBlur} className="form-input"/>
                    <input placeholder="Bank Name" {...register('bankName')} className="form-input"/>
                    <input placeholder="Account Number" {...register('accountNumber')} className="form-input"/>
                    <input placeholder="Confirm Account Number" {...register('confirmAccountNumber')} className="form-input"/>
                    <input placeholder="IFSC Code" {...register('ifscCode')} className="form-input"/>
                    <input placeholder="Branch Name" {...register('branchName')} className="form-input"/>
                    <Controller name="bankProof" control={control} render={({ field }) => (
                        <UploadDocument label="Upload Bank Proof (Optional)" file={field.value} onFileChange={field.onChange} allowCapture/>
                    )}/>
                </div>
            </form>
        );
    }


    return (
        <form onSubmit={handleSubmit(onSubmit)} id="bank-form">
            <FormHeader title="Bank Details" subtitle="Your salary will be credited to this account." />
            
            <div className="space-y-6">
                <Controller name="bankProof" control={control} render={({ field }) => (
                    <UploadDocument
                        label="Upload Bank Proof (Cancelled Cheque/Passbook)"
                        file={field.value}
                        onFileChange={field.onChange}
                        onOcrComplete={handleOcrComplete}
                        ocrSchema={bankProofSchema}
                        setToast={setToast}
                    />
                )}/>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t">
                    <VerifiedInput 
                        label="Account Holder Name" 
                        id="accountHolderName" 
                        hasValue={!!bankData.accountHolderName}
                        isVerified={data.bank.verifiedStatus?.accountHolderName === true}
                        onManualInput={() => handleManualInput(['accountHolderName'])}
                        error={errors.accountHolderName?.message} 
                        registration={register('accountHolderName')} 
                        onBlur={handleNameBlur}
                    />
                    <VerifiedInput label="Bank Name" id="bankName" hasValue={!!bankData.bankName} isVerified={false} error={errors.bankName?.message} registration={register('bankName')} />
                    <VerifiedInput label="Account Number" id="accountNumber" hasValue={!!bankData.accountNumber} isVerified={data.bank.verifiedStatus?.accountNumber === true} onManualInput={() => handleManualInput(['accountNumber'])} error={errors.accountNumber?.message} registration={register('accountNumber')} />
                    <VerifiedInput label="Confirm Account Number" id="confirmAccountNumber" hasValue={!!bankData.confirmAccountNumber} isVerified={data.bank.verifiedStatus?.accountNumber === true} onManualInput={() => handleManualInput(['accountNumber'])} error={errors.confirmAccountNumber?.message} registration={register('confirmAccountNumber')} />
                    <VerifiedInput label="IFSC Code" id="ifscCode" hasValue={!!bankData.ifscCode} isVerified={data.bank.verifiedStatus?.ifscCode === true} onManualInput={() => handleManualInput(['ifscCode'])} error={errors.ifscCode?.message} registration={register('ifscCode')} />
                    <VerifiedInput label="Branch Name" id="branchName" hasValue={!!bankData.branchName} isVerified={false} error={errors.branchName?.message} registration={register('branchName')} />
                </div>
            </div>
        </form>
    );
};

export default BankDetails;