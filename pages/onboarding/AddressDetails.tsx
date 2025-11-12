import React, { useEffect, useState } from 'react';
import { useForm, useWatch, type SubmitHandler, type Resolver } from 'react-hook-form';
// The named import from react-router-dom is correct. No changes needed.
import { useOutletContext } from 'react-router-dom';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { AddressDetails, Address } from '../../types';
import Input from '../../components/ui/Input';
import FormHeader from '../../components/onboarding/FormHeader';
import { api } from '../../services/api';
import { Loader2 } from 'lucide-react';
import VerifiedInput from '../../components/ui/VerifiedInput';

// Fix: Removed generic type argument from yup.object
const addressSchema = yup.object({
    line1: yup.string().required('Address line 1 is required'),
    line2: yup.string().optional(),
    city: yup.string().required('City is required'),
    state: yup.string().required('State is required'),
    country: yup.string().required('Country is required'),
    pincode: yup.string().required('Pincode is required').matches(/^[1-9][0-9]{5}$/, 'Must be a valid 6-digit Indian pincode'),
    verifiedStatus: yup.object().optional(),
}).defined();

// Fix: Removed generic type argument from yup.object
export const addressDetailsSchema = yup.object({
    present: addressSchema.required(),
    permanent: addressSchema.required(),
    sameAsPresent: yup.boolean().required(),
}).defined();

interface OutletContext {
  onValidated: () => Promise<void>;
}

const AddressDetails = () => {
    const { onValidated } = useOutletContext<OutletContext>();
    const { data, updateAddress, setAddressVerifiedStatus } = useOnboardingStore();
    const { address: addressSettings } = useSettingsStore();
    const [isPincodeLoading, setIsPincodeLoading] = useState(false);
    const [pincodeError, setPincodeError] = useState('');

    const { register, handleSubmit, formState: { errors }, control, setValue, trigger, getValues, reset, watch } = useForm<AddressDetails>({
        resolver: yupResolver(addressDetailsSchema) as unknown as Resolver<AddressDetails>,
        defaultValues: data.address,
    });

    const sameAsPresent = useWatch({ control, name: 'sameAsPresent' });
    const presentAddress = useWatch({ control, name: 'present' });
    const permanentAddress = useWatch({ control, name: 'permanent' });

    useEffect(() => {
        // Sync form with global store data, which might have been pre-filled
        reset(data.address);
    }, [data.address, reset]);

    // This effect syncs the form state back to the Zustand store on change, with a debounce.
    useEffect(() => {
        let debounceTimer: number;
        const subscription = watch((value) => {
            clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                updateAddress(value as AddressDetails);
            }, 500);
        });
        return () => {
            subscription.unsubscribe();
            clearTimeout(debounceTimer);
        };
    }, [watch, updateAddress]);

    useEffect(() => {
        if (sameAsPresent) {
            setValue('permanent', presentAddress);
            trigger('permanent'); // re-validate to remove any errors
        }
    }, [sameAsPresent, presentAddress, setValue, trigger]);
    
    const handleManualInput = (type: 'present' | 'permanent', field: keyof NonNullable<Address['verifiedStatus']>) => {
        setAddressVerifiedStatus(type, { [field]: false });
    };

    const handlePincodeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const pincode = e.target.value;
        handleManualInput('present', 'pincode');
        if (addressSettings.enablePincodeVerification && /^[1-9][0-9]{5}$/.test(pincode)) {
            setIsPincodeLoading(true);
            setPincodeError('');
            try {
                const details = await api.getPincodeDetails(pincode);
                setValue('present.city', details.city, { shouldValidate: true });
                setValue('present.state', details.state, { shouldValidate: true });
                setAddressVerifiedStatus('present', { city: true, state: true, pincode: true });
            } catch (error) {
                setPincodeError('Invalid Pincode. Please check and try again.');
            } finally {
                setIsPincodeLoading(false);
            }
        }
    };

    const onSubmit: SubmitHandler<AddressDetails> = async (formData) => {
        updateAddress(formData);
        await onValidated();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} id="address-form">
            <FormHeader title="Address Details" subtitle="Your communication and permanent address." />
            
            <div className="space-y-8">
                <div>
                    <h4 className="text-md font-semibold text-primary-text mb-4">Present Address</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="sm:col-span-2">
                             <VerifiedInput label="Address Line 1" id="present.line1" 
                                isVerified={!!data.address.present.verifiedStatus?.line1} 
                                hasValue={!!presentAddress?.line1} 
                                onManualInput={() => handleManualInput('present', 'line1')}
                                error={errors.present?.line1?.message} registration={register('present.line1')} />
                        </div>
                        <div className="sm:col-span-2">
                             <Input label="Address Line 2 (Optional)" id="present.line2" registration={register('present.line2')} />
                        </div>
                        <VerifiedInput label="Country" id="present.country"
                            isVerified={!!data.address.present.verifiedStatus?.country}
                            hasValue={!!presentAddress?.country}
                            onManualInput={() => handleManualInput('present', 'country')}
                            error={errors.present?.country?.message} registration={register('present.country')}
                        />
                        <div className="relative">
                           <VerifiedInput label="Pincode" id="present.pincode" type="tel" 
                            isVerified={!!data.address.present.verifiedStatus?.pincode} 
                            hasValue={!!presentAddress?.pincode} 
                            error={errors.present?.pincode?.message || pincodeError} registration={register('present.pincode')} onBlur={handlePincodeBlur} />
                           {isPincodeLoading && <Loader2 className="absolute right-3 top-9 h-5 w-5 animate-spin text-muted" />}
                        </div>
                        <VerifiedInput label="City" id="present.city" 
                            isVerified={!!data.address.present.verifiedStatus?.city} 
                            hasValue={!!presentAddress?.city} 
                            onManualInput={() => handleManualInput('present', 'city')}
                            error={errors.present?.city?.message} registration={register('present.city')} />
                        <VerifiedInput label="State" id="present.state" 
                            isVerified={!!data.address.present.verifiedStatus?.state} 
                            hasValue={!!presentAddress?.state} 
                            onManualInput={() => handleManualInput('present', 'state')}
                            error={errors.present?.state?.message} registration={register('present.state')} />
                    </div>
                </div>

                <div>
                    <h4 className="text-md font-semibold text-primary-text mb-4">Permanent Address</h4>
                    <div className="flex items-center mb-4">
                        <input id="sameAsPresent" type="checkbox" {...register('sameAsPresent')} className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent" />
                        <label htmlFor="sameAsPresent" className="ml-2 block text-sm text-muted">Same as Present Address</label>
                    </div>

                    {!sameAsPresent && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in-down">
                            <div className="sm:col-span-2">
                                <VerifiedInput label="Address Line 1" id="permanent.line1" 
                                    isVerified={!!data.address.permanent.verifiedStatus?.line1} 
                                    hasValue={!!permanentAddress?.line1} 
                                    onManualInput={() => handleManualInput('permanent', 'line1')}
                                    error={errors.permanent?.line1?.message} registration={register('permanent.line1')} />
                            </div>
                            <div className="sm:col-span-2"><Input label="Address Line 2 (Optional)" id="permanent.line2" registration={register('permanent.line2')} /></div>
                            <VerifiedInput label="Country" id="permanent.country"
                                isVerified={!!data.address.permanent.verifiedStatus?.country}
                                hasValue={!!permanentAddress?.country}
                                onManualInput={() => handleManualInput('permanent', 'country')}
                                error={errors.permanent?.country?.message} registration={register('permanent.country')}
                            />
                            <VerifiedInput label="Pincode" id="permanent.pincode" type="tel" 
                                isVerified={!!data.address.permanent.verifiedStatus?.pincode} 
                                hasValue={!!permanentAddress?.pincode}
                                onManualInput={() => handleManualInput('permanent', 'pincode')}
                                error={errors.permanent?.pincode?.message} registration={register('permanent.pincode')} />
                            <VerifiedInput label="City" id="permanent.city" 
                                isVerified={!!data.address.permanent.verifiedStatus?.city} 
                                hasValue={!!permanentAddress?.city}
                                onManualInput={() => handleManualInput('permanent', 'city')}
                                error={errors.permanent?.city?.message} registration={register('permanent.city')} />
                            <VerifiedInput label="State" id="permanent.state" 
                                isVerified={!!data.address.permanent.verifiedStatus?.state} 
                                hasValue={!!permanentAddress?.state}
                                onManualInput={() => handleManualInput('permanent', 'state')}
                                error={errors.permanent?.state?.message} registration={register('permanent.state')} />
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
};

export default AddressDetails;