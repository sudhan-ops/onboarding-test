import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
// Fix: Use inline type import for SubmitHandler
import { useForm, Controller, type SubmitHandler, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useOnboardingStore } from '../../store/onboardingStore';
import FormHeader from '../../components/onboarding/FormHeader';
import UploadDocument from '../../components/UploadDocument';
import type { UploadedFile, Fingerprints, BiometricsData } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// Fix: Removed generic type arguments from yup calls
const validationSchema = yup.object({
  signatureImage: yup.mixed().required('A signature image is mandatory.').nullable(),
  fingerprints: yup.object().shape({
    // Fingerprints are optional, so no specific validation rules are needed here.
    // We just define the shape to match the type.
    leftThumb: yup.mixed().optional().nullable(),
    leftIndex: yup.mixed().optional().nullable(),
    leftMiddle: yup.mixed().optional().nullable(),
    leftRing: yup.mixed().optional().nullable(),
    leftLittle: yup.mixed().optional().nullable(),
    rightThumb: yup.mixed().optional().nullable(),
    rightIndex: yup.mixed().optional().nullable(),
    rightMiddle: yup.mixed().optional().nullable(),
    rightRing: yup.mixed().optional().nullable(),
    rightLittle: yup.mixed().optional().nullable(),
  })
}).defined();

const FINGER_MAP: { hand: 'Left' | 'Right'; key: keyof Fingerprints; name: string }[] = [
    { hand: 'Left', key: 'leftThumb', name: 'Thumb' },
    { hand: 'Left', key: 'leftIndex', name: 'Index' },
    { hand: 'Left', key: 'leftMiddle', name: 'Middle' },
    { hand: 'Left', key: 'leftRing', name: 'Ring' },
    { hand: 'Left', key: 'leftLittle', name: 'Little' },
    { hand: 'Right', key: 'rightThumb', name: 'Thumb' },
    { hand: 'Right', key: 'rightIndex', name: 'Index' },
    { hand: 'Right', key: 'rightMiddle', name: 'Middle' },
    { hand: 'Right', key: 'rightRing', name: 'Ring' },
    { hand: 'Right', key: 'rightLittle', name: 'Little' },
];

const Biometrics = () => {
    const { onValidated } = useOutletContext<{ onValidated: () => Promise<void> }>();
    const { data, updateBiometrics } = useOnboardingStore();
    const { user } = useAuthStore();
    const isMobile = useMediaQuery('(max-width: 767px)');

    const { control, handleSubmit, formState: { errors }, reset, watch } = useForm<BiometricsData>({
        // FIX: Cast resolver to resolve type incompatibility between yup and react-hook-form.
        resolver: yupResolver(validationSchema) as unknown as Resolver<BiometricsData>,
        defaultValues: data.biometrics,
    });

    useEffect(() => {
        reset(data.biometrics);
    }, [data.biometrics, reset]);

    useEffect(() => {
        const subscription = watch((value) => {
            updateBiometrics(value as BiometricsData);
        });
        return () => subscription.unsubscribe();
    }, [watch, updateBiometrics]);

    const handleFingerprintVerification = async (base64: string, mimeType: string): Promise<{ success: boolean; reason: string }> => {
        try {
            const result = await api.verifyFingerprintImage(base64, mimeType);
            if (!result.containsFingerprints) {
                return { success: false, reason: result.reason || 'Image does not appear to contain fingerprints. Please upload a clear scan.' };
            }
            return { success: true, reason: '' };
        } catch (error: any) {
            return { success: false, reason: error.message || 'AI verification failed.' };
        }
    };

    const onSubmit: SubmitHandler<BiometricsData> = async (formData) => {
        updateBiometrics(formData);
        await onValidated();
    };

    const renderFingerprintUploaders = (hand: 'Left' | 'Right') => {
        return FINGER_MAP
            .filter(f => f.hand === hand)
            .map(finger => (
                <Controller
                    key={finger.key}
                    name={`fingerprints.${finger.key}`}
                    control={control}
                    render={({ field }) => (
                        <UploadDocument
                            label={`${hand} ${finger.name}`}
                            file={field.value}
                            onFileChange={field.onChange}
                            onVerification={handleFingerprintVerification}
                            allowCapture
                        />
                    )}
                />
            ));
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} id="biometrics-form">
            {!isMobile && <FormHeader title="Biometrics" subtitle="Please provide fingerprint scans and a mandatory signature." />}
            
            <div className="space-y-8">
                <div>
                    <h4 className={`text-lg font-semibold text-center mb-4 ${isMobile ? 'form-header-title' : 'text-primary-text'}`}>
                        Signature <span className="text-red-500">*</span>
                    </h4>
                    <div className="max-w-md mx-auto">
                        <Controller
                            name="signatureImage"
                            control={control}
                            render={({ field, fieldState }) => (
                                <UploadDocument
                                    label="Upload or capture a signature"
                                    file={field.value}
                                    onFileChange={field.onChange}
                                    allowCapture
                                    error={fieldState.error?.message}
                                />
                            )}
                        />
                    </div>
                </div>

                <div className={isMobile ? '' : 'my-8 border-t border-border'}></div>

                <div>
                    <h4 className={`text-lg font-semibold text-center mb-4 ${isMobile ? 'form-header-title' : 'text-primary-text'}`}>Fingerprints (Optional)</h4>
                    <p className={`text-center mb-6 ${isMobile ? 'text-gray-400' : 'text-muted'}`}>Upload scans for all 10 fingerprints, one image per finger.</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {renderFingerprintUploaders('Left')}
                        {renderFingerprintUploaders('Right')}
                    </div>
                </div>
            </div>
        </form>
    );
};

export default Biometrics;