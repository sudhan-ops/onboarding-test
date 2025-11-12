import React, { useEffect } from 'react';
// Fix: Use inline type import for SubmitHandler
import { useForm, Controller, type SubmitHandler, type Resolver } from 'react-hook-form';
import { useOutletContext } from 'react-router-dom';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useOnboardingStore } from '../../store/onboardingStore';
import type { PersonalDetails, UploadedFile } from '../../types';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { AvatarUpload } from '../../components/onboarding/AvatarUpload';
import FormHeader from '../../components/onboarding/FormHeader';
import DatePicker from '../../components/ui/DatePicker';
import VerifiedInput from '../../components/ui/VerifiedInput';

// Fix: Removed generic type arguments from yup calls
const validationSchema = yup.object({
    employeeId: yup.string().required(),
    firstName: yup.string().required('First name is required'),
    middleName: yup.string().optional(),
    lastName: yup.string().required('Last name is required'),
    preferredName: yup.string().optional(),
    dob: yup.string().required('Date of birth is required'),
    gender: yup.string().oneOf(['Male', 'Female', 'Other', '']).required('Gender is required'),
    maritalStatus: yup.string().oneOf(['Single', 'Married', 'Divorced', 'Widowed', '']).required('Marital status is required'),
    bloodGroup: yup.string().oneOf(['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).required('Blood group is required'),
    mobile: yup.string().required('Mobile number is required').matches(/^[6-9][0-9]{9}$/, 'Must be a valid 10-digit Indian mobile number'),
    alternateMobile: yup.string().optional().nullable(),
    email: yup.string().email('Must be a valid email').required('Email is required'),
    idProofType: yup.string().oneOf(['Aadhaar', 'PAN', 'Voter ID', '']).optional(),
    idProofNumber: yup.string().optional(),
    photo: yup.mixed().optional().nullable(),
    idProofFront: yup.mixed().optional().nullable(),
    idProofBack: yup.mixed().optional().nullable(),
    emergencyContactName: yup.string().required('Emergency contact name is required'),
    emergencyContactNumber: yup.string().required('Emergency contact number is required').matches(/^[6-9][0-9]{9}$/, 'Must be a valid 10-digit number'),
    relationship: yup.string().oneOf(['Spouse', 'Child', 'Father', 'Mother', 'Sibling', 'Other', '']).required('Relationship is required'),
    salary: yup.number().typeError('Salary must be a number').min(0).required('Salary is required').nullable(),
    verifiedStatus: yup.object().optional(),
}).defined();


interface OutletContext {
    onValidated: () => Promise<void>;
}

const PersonalDetails = () => {
    const { onValidated } = useOutletContext<OutletContext>();
    const { data, updatePersonal, addOrUpdateEmergencyContactAsFamilyMember, setPersonalVerifiedStatus } = useOnboardingStore();
    const { register, handleSubmit, formState: { errors }, control, reset, watch } = useForm<PersonalDetails>({
        // FIX: Cast resolver to resolve type incompatibility between yup and react-hook-form.
        resolver: yupResolver(validationSchema) as unknown as Resolver<PersonalDetails>,
        defaultValues: data.personal,
    });
    
    const personalData = watch();

    useEffect(() => {
        reset(data.personal);
    }, [data.personal, reset]);

    // This effect syncs the form state back to the Zustand store on change, with a debounce.
    useEffect(() => {
        let debounceTimer: number;
        const subscription = watch((value) => {
            clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                updatePersonal(value as PersonalDetails);
            }, 500);
        });
        return () => {
            subscription.unsubscribe();
            clearTimeout(debounceTimer);
        };
    }, [watch, updatePersonal]);

    const onSubmit: SubmitHandler<PersonalDetails> = async (formData) => {
        updatePersonal(formData); // Final sync before processing
        addOrUpdateEmergencyContactAsFamilyMember();
        await onValidated();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} id="personal-form">
            <div className="text-left">
                <FormHeader title="Personal Details" subtitle="Please provide your personal information as per your official documents." />
            </div>
            
            <div className="flex flex-col md:flex-row gap-8 md:items-start">
                <div className="flex-shrink-0 mx-auto md:mx-0">
                     <Controller
                        name="photo"
                        control={control}
                        render={({ field }) => (
                            <AvatarUpload
                                file={field.value}
                                onFileChange={(file) => field.onChange(file)}
                             />
                        )}
                    />
                </div>

                <div className="w-full flex-grow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="md:col-span-3">
                        <Input label="Employee ID" id="employeeId" registration={register('employeeId')} error={errors.employeeId?.message} readOnly className="bg-gray-100" />
                    </div>
                    <VerifiedInput label="First Name" id="firstName" registration={register('firstName')} error={errors.firstName?.message} isVerified={data.personal.verifiedStatus?.name === true} hasValue={!!personalData.firstName} onManualInput={() => setPersonalVerifiedStatus({ name: false })} />
                    <Input label="Middle Name (Optional)" id="middleName" registration={register('middleName')} />
                    <VerifiedInput label="Last Name" id="lastName" registration={register('lastName')} error={errors.lastName?.message} isVerified={data.personal.verifiedStatus?.name === true} hasValue={!!personalData.lastName} onManualInput={() => setPersonalVerifiedStatus({ name: false })} />
                    <Input label="Preferred Name (Optional)" id="preferredName" registration={register('preferredName')} />
                    <Controller
                        name="dob"
                        control={control}
                        render={({ field }) => (                           
                            <DatePicker
                                label="Date of Birth"
                                id="dob"
                                error={errors.dob?.message}
                                value={field.value}
                                onChange={(val) => {
                                    field.onChange(val);
                                    setPersonalVerifiedStatus({ dob: false });
                                }}
                                maxDate={new Date()}
                            />
                        )}
                    />
                    <Select label="Gender" id="gender" registration={register('gender')} error={errors.gender?.message}>
                        <option value="">Select Gender</option><option>Male</option><option>Female</option><option>Other</option>
                    </Select>
                    <Select label="Marital Status" id="maritalStatus" registration={register('maritalStatus')} error={errors.maritalStatus?.message}>
                        <option value="">Select Status</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                    </Select>
                    <Select label="Blood Group" id="bloodGroup" registration={register('bloodGroup')} error={errors.bloodGroup?.message}>
                        <option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                    </Select>
                    <Input label="Mobile Number" id="mobile" type="tel" registration={register('mobile')} error={errors.mobile?.message} />
                    <Input label="Alternate Mobile (Optional)" id="alternateMobile" type="tel" registration={register('alternateMobile')} />
                    <Input label="Email Address" id="email" type="email" registration={register('email')} error={errors.email?.message} />
                    <Input label="Monthly Salary (Gross)" id="salary" type="number" registration={register('salary')} error={errors.salary?.message} />

                    <div className="md:col-span-3 pt-4 border-t">
                         <h4 className="text-md font-semibold text-primary-text mb-4">Emergency Contact</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <Input label="Contact Name" id="emergencyContactName" registration={register('emergencyContactName')} error={errors.emergencyContactName?.message} />
                            <Input label="Contact Number" id="emergencyContactNumber" type="tel" registration={register('emergencyContactNumber')} error={errors.emergencyContactNumber?.message} />
                            <Select label="Relationship" id="relationship" registration={register('relationship')} error={errors.relationship?.message}>
                                <option value="">Select Relationship</option>
                                <option>Spouse</option><option>Child</option><option>Father</option><option>Mother</option><option>Sibling</option><option>Other</option>
                            </Select>
                         </div>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default PersonalDetails;