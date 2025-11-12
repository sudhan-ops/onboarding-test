import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller, SubmitHandler, useFieldArray, Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useEnrollmentRulesStore } from '../../store/enrollmentRulesStore';
import type { UploadedFile, PersonalDetails, BankDetails, UanDetails, EsiDetails, FamilyMember, DocumentRules, EducationRecord } from '../../types';
import FormHeader from '../../components/onboarding/FormHeader';
import UploadDocument from '../../components/UploadDocument';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import Select from '../../components/ui/Select';
import { api } from '../../services/api';
import { Type } from "@google/genai";
import { format } from 'date-fns';
import { Plus, Trash2, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import MismatchModal from '../../components/modals/MismatchModal';
import { useAuthStore } from '../../store/authStore';
import Input from '../../components/ui/Input';

const defaultDesignationRules = {
    documents: {
        aadhaar: true,
        pan: true,
        bankProof: true,
        educationCertificate: true,
        salarySlip: true,
        uanProof: true,
        familyAadhaar: true,
    },
    verifications: {
        requireBengaluruAddress: true,
        requireDobVerification: true,
    }
};

const getValidationSchema = (rules: { documents: DocumentRules }) => {
    const familyMemberUploadSchema = yup.object({
        id: yup.string().required(),
        relation: yup.string<FamilyMember['relation']>().oneOf(['Spouse', 'Child', 'Father', 'Mother', '']).required("Relation is required"),
        phone: yup.string()
            .when('relation', {
                is: 'Child',
                then: (schema) => schema.optional().nullable().matches(/^[6-9][0-9]{9}$/, { message: 'Must be a valid 10-digit number', excludeEmptyString: true }),
                otherwise: (schema) => schema.required("Phone number is required").matches(/^[6-9][0-9]{9}$/, 'Must be a valid 10-digit Indian number'),
            }),
        idProof: rules.documents.familyAadhaar
            ? yup.mixed<UploadedFile | null>().nonNullable("Aadhaar proof is required for each family member.")
            : yup.mixed<UploadedFile | null>().optional().nullable(),
    });
    
    const educationRecordUploadSchema = yup.object({
        id: yup.string().required(),
        document: rules.documents.educationCertificate
            ? yup.mixed<UploadedFile | null>().nonNullable("Education certificate is required.")
            : yup.mixed<UploadedFile | null>().optional().nullable(),
    });

    return yup.object({
        photo: yup.mixed<UploadedFile | null>().optional().nullable(),
        aadhaarLinkedMobile: yup.string().required('Aadhaar-linked mobile number is required.').matches(/^[6-9][0-9]{9}$/, 'Must be a valid 10-digit number'),
        alternateMobile: yup.string().optional().nullable().matches(/^[6-9][0-9]{9}$/, { message: 'Must be a valid 10-digit number', excludeEmptyString: true }),
        idProofType: yup.string().oneOf(['Aadhaar', 'PAN', 'Voter ID', '']).required(),
        
        idProofFront: yup.mixed<UploadedFile | null>().nonNullable("Aadhaar (Front) is required."),
        idProofBack: yup.mixed<UploadedFile | null>().nonNullable("Aadhaar (Back) is required."),
        bankProof: yup.mixed<UploadedFile | null>().nonNullable("Bank proof document is required."),
        uanProof: yup.mixed<UploadedFile | null>().nonNullable("UAN proof document is required."),
        
        salarySlip: rules.documents.salarySlip
            ? yup.mixed<UploadedFile | null>().nonNullable("Salary slip is required.")
            : yup.mixed<UploadedFile | null>().optional().nullable(),
            
        family: yup.array().of(familyMemberUploadSchema).optional(),
        education: yup.array().of(educationRecordUploadSchema).optional(),
    }).defined();
};


type PreUploadFormData = {
    photo: UploadedFile | null;
    aadhaarLinkedMobile: string;
    alternateMobile?: string | null;
    idProofType: 'Aadhaar' | 'PAN' | 'Voter ID' | '';
    idProofFront: UploadedFile | null;
    idProofBack: UploadedFile | null;
    bankProof: UploadedFile | null;
    salarySlip: UploadedFile | null;
    uanProof: UploadedFile | null;
    family: { id: string; relation: FamilyMember['relation']; idProof: UploadedFile | null; phone: string; }[];
    education: { id: string; document: UploadedFile | null }[];
};

const fileToBase64 = (file: File): Promise<{ base64: string; type: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ base64: (reader.result as string).split(',')[1], type: file.type });
        reader.onerror = error => reject(error);
    });
};

const formatNameToTitleCase = (value: string | undefined) => {
    if (!value) return '';
    return value.toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase());
};

const PreUpload = () => {
    const navigate = useNavigate();
    const store = useOnboardingStore();
    const { user } = useAuthStore();
    const { rulesByDesignation } = useEnrollmentRulesStore();
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [mismatchModalState, setMismatchModalState] = useState({ isOpen: false, employeeName: '', bankName: '', reason: '' });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    const designation = store.data.organization.designation;
    const currentRules = useMemo(() => 
        (designation && rulesByDesignation[designation]) 
        ? rulesByDesignation[designation] 
        : defaultDesignationRules,
    [designation, rulesByDesignation]);

    const validationSchema = useMemo(() => getValidationSchema(currentRules), [currentRules]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const isMobileView = user?.role === 'field_officer' && isMobile;

    const { control, handleSubmit, formState: { errors }, getValues, watch } = useForm<PreUploadFormData>({
        resolver: yupResolver(validationSchema) as Resolver<PreUploadFormData>,
        defaultValues: { aadhaarLinkedMobile: '', alternateMobile: '', photo: null, idProofType: 'Aadhaar', idProofFront: null, idProofBack: null, bankProof: null, salarySlip: null, uanProof: null, family: [], education: [] },
    });
    
    const { fields: familyFields, append: appendFamily, remove: removeFamily } = useFieldArray({ control, name: "family" });
    const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({ control, name: "education" });
    const idProofType = watch('idProofType');
    const familyValues = watch('family');

    const processAndNavigate = async (formData: PreUploadFormData, isOverridden = false) => {
        setIsProcessing(true);
        store.setRequiresManualVerification(isOverridden);
        
        try {
            // Schemas
            const idFrontSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING, description: "The person's full name as written on the card." }, dob: { type: Type.STRING, description: "The person's date of birth in YYYY-MM-DD format. If only year available, return YYYY-01-01." }, gender: { type: Type.STRING, description: "Gender: 'Male', 'Female', or 'Other'." }, aadhaarNumber: { type: Type.STRING, description: "The 12-digit Aadhaar number, if present." }, panNumber: { type: Type.STRING, description: "The 10-character PAN number, if present." }, voterIdNumber: { type: Type.STRING, description: "The Voter ID number, also known as EPIC number." } } };
            const addressSchema = { type: Type.OBJECT, properties: { address: { type: Type.OBJECT, description: "The full address on the back of an Aadhaar card, parsed into components.", properties: { line1: { type: Type.STRING, description: "Full address line(s) excluding city, state, pincode. e.g., 'S/O: John Doe, 123 Maple Street, Anytown'" }, city: { type: Type.STRING }, state: { type: Type.STRING }, pincode: { type: Type.STRING } } } } };
            const bankProofSchema = { type: Type.OBJECT, properties: { accountHolderName: { type: Type.STRING, description: "The account holder's full name." }, accountNumber: { type: Type.STRING, description: "The full bank account number." }, ifscCode: { type: Type.STRING, description: "The bank's IFSC code." }, bankName: { type: Type.STRING, description: "The name of the bank (e.g., 'State Bank of India')." }, branchName: { type: Type.STRING, description: "The name of the bank branch (e.g., 'Koramangala Branch')." } } };
            const salarySlipSchema = { type: Type.OBJECT, properties: { uanNumber: { type: Type.STRING, description: "The 12-digit Universal Account Number (UAN)." }, pfNumber: { type: Type.STRING, description: "The Provident Fund (PF) account number." }, esiNumber: { type: Type.STRING, description: "The 10 or 17-digit ESI number." } } };
            const uanProofSchema = { type: Type.OBJECT, properties: { uanNumber: { type: Type.STRING } } };
            const familyAadhaarSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, dob: { type: Type.STRING } } };
            const educationSchema = { type: Type.OBJECT, properties: { degree: { type: Type.STRING }, institution: { type: Type.STRING }, endYear: { type: Type.STRING } } };
            
            // File Conversions
             const filePromises = [
                formData.idProofFront ? fileToBase64(formData.idProofFront.file) : Promise.resolve(null),
                (formData.idProofType === 'Aadhaar' || formData.idProofType === 'Voter ID') && formData.idProofBack ? fileToBase64(formData.idProofBack.file) : Promise.resolve(null),
                formData.bankProof ? fileToBase64(formData.bankProof.file) : Promise.resolve(null),
                formData.salarySlip ? fileToBase64(formData.salarySlip.file) : Promise.resolve(null),
                formData.uanProof ? fileToBase64(formData.uanProof.file) : Promise.resolve(null),
                ...formData.family.map((f) => f.idProof ? fileToBase64(f.idProof.file) : Promise.resolve(null)),
                ...formData.education.map((e) => e.document ? fileToBase64(e.document.file) : Promise.resolve(null))
            ];
            const [idFrontFileData, idBackFileData, bankFileData, salaryFileData, uanFileData, ...otherFilesData] = await Promise.all(filePromises);
            const familyFilesData = otherFilesData.slice(0, formData.family.length);
            const educationFilesData = otherFilesData.slice(formData.family.length);

            // OCR Calls
            const idFrontOcrPromise = idFrontFileData ? api.extractDataFromImage(idFrontFileData.base64, idFrontFileData.type, idFrontSchema, formData.idProofType as 'Aadhaar' | 'PAN' | 'Voter ID') : Promise.resolve({});
            const idBackOcrPromise = (idBackFileData && formData.idProofType === 'Aadhaar') ? api.extractDataFromImage(idBackFileData.base64, idBackFileData.type, addressSchema, 'Aadhaar') : Promise.resolve({});
            const bankOcrPromise = bankFileData ? api.extractDataFromImage(bankFileData.base64, bankFileData.type, bankProofSchema, 'Bank') : Promise.resolve({});
            const salaryOcrPromise = salaryFileData ? api.extractDataFromImage(salaryFileData.base64, salaryFileData.type, salarySlipSchema, 'Salary') : Promise.resolve(null);
            const uanOcrPromise = uanFileData ? api.extractDataFromImage(uanFileData.base64, uanFileData.type, uanProofSchema, 'UAN') : Promise.resolve(null);
            const familyOcrPromises = familyFilesData.map(fData => fData ? api.extractDataFromImage(fData.base64, fData.type, familyAadhaarSchema, 'Aadhaar') : Promise.resolve({}));
            const educationOcrPromises = educationFilesData.map(eData => eData ? api.extractDataFromImage(eData.base64, eData.type, educationSchema) : Promise.resolve({}));
            
            const [idFrontData, idBackData, bankData, salaryData, uanData, ...ocrResults] = await Promise.all([idFrontOcrPromise, idBackOcrPromise, bankOcrPromise, salaryOcrPromise, uanOcrPromise, ...familyOcrPromises, ...educationOcrPromises]);
            const familyOcrData = ocrResults.slice(0, familyFilesData.length);
            const educationOcrData = ocrResults.slice(familyFilesData.length);
            const idData = { ...idFrontData, ...idBackData };

            // Verification
            const nameOnId = idData.name || '';
            const nameOnBank = bankData.accountHolderName || '';
            
            if (!isOverridden && nameOnId && nameOnBank) {
                const { isMatch, reason } = await api.crossVerifyNames(nameOnId, nameOnBank);
                if (!isMatch) {
                    setMismatchModalState({ isOpen: true, employeeName: nameOnId, bankName: nameOnBank, reason });
                    setIsProcessing(false);
                    return;
                }
            }

            // Populate Store
            const personalUpdate: Partial<PersonalDetails> = { 
                idProofType: formData.idProofType, 
                idProofFront: formData.idProofFront, 
                idProofBack: formData.idProofBack,
                photo: formData.photo,
                mobile: formData.aadhaarLinkedMobile,
                alternateMobile: formData.alternateMobile,
            };
            const personalVerified: Partial<PersonalDetails['verifiedStatus']> = {};
            if (idData.name) {
                const nameParts = idData.name.split(' ');
                personalUpdate.firstName = formatNameToTitleCase(nameParts.shift() || '');
                personalUpdate.lastName = formatNameToTitleCase(nameParts.pop() || '');
                personalUpdate.middleName = formatNameToTitleCase(nameParts.join(' '));
                personalUpdate.preferredName = personalUpdate.firstName;
                personalVerified.name = true;
            }
            if (idData.dob) { try { personalUpdate.dob = format(new Date(idData.dob.replace(/[-./]/g, '/')), 'yyyy-MM-dd'); personalVerified.dob = true; } catch(e){} }
            if (idData.gender) {
                const genderLower = idData.gender.toLowerCase().trim();
                if (genderLower.includes('male') || genderLower.includes('purush') || genderLower === 'm') {
                    personalUpdate.gender = 'Male';
                } else if (genderLower.includes('female') || genderLower.includes('mahila') || genderLower === 'f') {
                    personalUpdate.gender = 'Female';
                } else if (genderLower.includes('transgender')) {
                    personalUpdate.gender = 'Other';
                }
            }
            if (idData.aadhaarNumber || idData.panNumber || idData.voterIdNumber) {
                personalUpdate.idProofNumber = (idData.aadhaarNumber || idData.panNumber || idData.voterIdNumber).replace(/\s/g, '');
                personalVerified.idProofNumber = true;
            }

            const bankUpdate: Partial<BankDetails> = { bankProof: formData.bankProof };
            const bankVerified: Partial<BankDetails['verifiedStatus']> = {};
            if(bankData.accountHolderName) { bankUpdate.accountHolderName = formatNameToTitleCase(bankData.accountHolderName); bankVerified.accountHolderName = true; }
            if(bankData.accountNumber) { const acNum = bankData.accountNumber.replace(/\D/g, ''); bankUpdate.accountNumber = acNum; bankUpdate.confirmAccountNumber = acNum; bankVerified.accountNumber = true; }
            if(bankData.ifscCode) { bankUpdate.ifscCode = bankData.ifscCode.toUpperCase().replace(/\s/g, ''); bankVerified.ifscCode = true; }
            if(bankData.bankName) { bankUpdate.bankName = bankData.bankName; }
            if(bankData.branchName) { bankUpdate.branchName = bankData.branchName; }

            const uanUpdate: Partial<UanDetails> = { salarySlip: formData.salarySlip, document: formData.uanProof };
            const esiUpdate: Partial<EsiDetails> = {};
            const uanVerified: Partial<UanDetails['verifiedStatus']> = {};
            const esiVerified: Partial<EsiDetails['verifiedStatus']> = {};
            const combinedUan = uanData?.uanNumber || salaryData?.uanNumber;
            if (combinedUan) { const uan = combinedUan.replace(/\D/g, ''); if (uan.length === 12) { uanUpdate.uanNumber = uan; uanUpdate.hasPreviousPf = true; uanVerified.uanNumber = true; } }
            if (salaryData?.pfNumber) { uanUpdate.pfNumber = salaryData.pfNumber; uanUpdate.hasPreviousPf = true; }
            if (salaryData?.esiNumber) { const esi = salaryData.esiNumber.replace(/\D/g, ''); if (esi.length === 10 || esi.length === 17) { esiUpdate.esiNumber = esi; esiUpdate.hasEsi = true; esiVerified.esiNumber = true; } }

            const newFamilyMembers: FamilyMember[] = familyOcrData.map((memberData, index) => {
                const formFam = formData.family[index];
                let dobString = '';
                if (memberData.dob) { try { dobString = format(new Date(memberData.dob.replace(/[-./]/g, '/')), 'yyyy-MM-dd'); } catch (e) {} }
                return { id: `fam_preupload_${Date.now()}_${index}`, relation: formFam.relation, name: formatNameToTitleCase(memberData.name) || '', dob: dobString, gender: '', occupation: '', dependent: false, idProof: formFam.idProof, phone: formFam.phone };
            });
            
            const newEducationRecords: EducationRecord[] = educationOcrData.map((eduData, index) => {
                const formEdu = formData.education[index];
                return { id: `edu_preupload_${Date.now()}_${index}`, degree: eduData.degree || '', institution: eduData.institution || '', startYear: '', endYear: eduData.endYear || '', document: formEdu.document };
            });

            if (idData.address) { store.updateAddress({ present: { ...idData.address, country: 'India', verifiedStatus: { line1: true, city: true, state: true, pincode: true, country: true } }, permanent: { ...idData.address, country: 'India' }, sameAsPresent: true }); }
            store.updateBank(bankUpdate);
            store.setBankVerifiedStatus(bankVerified);
            store.updateUan(uanUpdate);
            store.setUanVerifiedStatus(uanVerified);
            store.updateEsi(esiUpdate);
            store.setEsiVerifiedStatus(esiVerified);
            store.updateFamily(newFamilyMembers);
            store.updateEducation(newEducationRecords);
            store.updatePersonal(personalUpdate);
            store.setPersonalVerifiedStatus(personalVerified);
            
            setToast({ message: 'Application auto-filled! Please review.', type: 'success' });
            navigate('/onboarding/add/personal');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
            console.error("Document processing failed:", error);
            setToast({ message: `Document processing failed: ${errorMessage}`, type: 'error' });
            setIsProcessing(false);
        }
    };

    const handleFormSubmit: SubmitHandler<PreUploadFormData> = (data) => {
        setMismatchModalState({ isOpen: false, employeeName: '', bankName: '', reason: '' });
        processAndNavigate(data, false);
    };
    
    const handleOverride = () => {
        setMismatchModalState({ isOpen: false, employeeName: '', bankName: '', reason: '' });
        processAndNavigate(getValues(), true);
    };

    return (
        <div className="relative">
             {isProcessing && (
                <div className="absolute inset-0 bg-page/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl animate-fade-in-scale">
                    <Loader2 className="h-12 w-12 animate-spin text-accent" />
                    <p className="mt-4 text-lg font-semibold text-primary-text">Processing Documents...</p>
                    <p className="text-muted text-center max-w-xs">Our AI is analyzing your files. This may take a moment.</p>
                </div>
            )}
            <div className={`bg-card p-8 rounded-xl shadow-card max-w-4xl mx-auto transition-all ${isProcessing ? 'blur-sm pointer-events-none' : ''}`}>
                <MismatchModal {...mismatchModalState} onClose={() => setMismatchModalState({ isOpen: false, employeeName: '', bankName: '', reason: '' })} onOverride={handleOverride} />
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <FormHeader title="Document Collection" subtitle="Upload documents to auto-fill the application." />
                    
                    <div className="space-y-8 mt-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                             <Controller name="photo" control={control} render={({ field }) => <UploadDocument label="Profile Photo" file={field.value} onFileChange={field.onChange} allowCapture allowedTypes={['image/jpeg', 'image/png', 'image/webp']} /> } />
                             <div className="space-y-6">
                                <Controller name="aadhaarLinkedMobile" control={control} render={({ field, fieldState }) => ( <Input label="Aadhaar Linked Mobile Number" type="tel" {...field} error={fieldState.error?.message} /> )} />
                                <Controller name="alternateMobile" control={control} render={({ field, fieldState }) => ( <Input label="Alternative Mobile Number (Optional)" type="tel" {...field} error={fieldState.error?.message} /> )} />
                             </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <Controller name="idProofFront" control={control} render={({ field }) => <UploadDocument label="Aadhaar (Front Side)" file={field.value} onFileChange={field.onChange} error={errors.idProofFront?.message as string} allowCapture verificationStatus={store.data.personal.verifiedStatus?.idProofNumber} /> } />
                            <Controller name="idProofBack" control={control} render={({ field }) => <UploadDocument label="Aadhaar (Back Side)" file={field.value} onFileChange={field.onChange} error={errors.idProofBack?.message as string} allowCapture verificationStatus={store.data.personal.verifiedStatus?.idProofNumber} /> } />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <Controller name="bankProof" control={control} render={({ field }) => <UploadDocument label="Bank Proof (Passbook/Cancelled Cheque)" file={field.value} onFileChange={field.onChange} error={errors.bankProof?.message as string} allowCapture verificationStatus={store.data.bank.verifiedStatus?.accountNumber} /> } />
                            <Controller name="uanProof" control={control} render={({ field }) => <UploadDocument label="UAN Proof Document" file={field.value} onFileChange={field.onChange} error={errors.uanProof?.message as string} allowCapture verificationStatus={store.data.uan.verifiedStatus?.uanNumber} /> } />
                        </div>

                        {currentRules.documents.salarySlip && <Controller name="salarySlip" control={control} render={({ field }) => <UploadDocument label={`Latest Salary Slip`} file={field.value} onFileChange={field.onChange} error={errors.salarySlip?.message as string} allowCapture /> } />}

                        {currentRules.documents.educationCertificate && (
                             <div className="pt-6 border-t">
                                <h4 className="text-md font-semibold text-primary-text mb-4">Education Certificates</h4>
                                <div className="space-y-4">
                                    {educationFields.map((field, index) => (
                                        <div key={field.id} className="p-4 border rounded-lg bg-page/50 relative">
                                            <Controller name={`education.${index}.document`} control={control} render={({ field: controllerField, fieldState }) => ( <UploadDocument label="Certificate" file={controllerField.value} onFileChange={controllerField.onChange} error={fieldState.error?.message} allowCapture /> )} />
                                            <Button type="button" variant="icon" size="sm" onClick={() => removeEducation(index)} className="!absolute top-2 right-2"><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" onClick={() => appendEducation({ id: `edu_upload_${Date.now()}`, document: null })}><Plus className="mr-2 h-4 w-4"/> Add Certificate</Button>
                                </div>
                            </div>
                        )}

                        {currentRules.documents.familyAadhaar && (
                             <div className="pt-6 border-t">
                                <h4 className="text-md font-semibold text-primary-text mb-4">Family Member Documents</h4>
                                <div className="space-y-4">
                                    {familyFields.map((field, index) => {
                                        const relation = familyValues?.[index]?.relation;
                                        const isChild = relation === 'Child';
                                        return (
                                        <div key={field.id} className="p-4 border rounded-lg bg-page/50 grid grid-cols-1 md:grid-cols-3 gap-4 items-start relative">
                                            <Controller name={`family.${index}.relation`} control={control} render={({ field, fieldState }) => ( <Select label="Relation" error={fieldState.error?.message} {...field}> <option value="">Select</option><option>Spouse</option><option>Child</option><option>Father</option><option>Mother</option> </Select> )} />
                                            <Controller name={`family.${index}.phone`} control={control} render={({ field, fieldState }) => ( <Input label={`Phone Number${isChild ? ' (Optional)' : ''}`} type="tel" {...field} error={fieldState.error?.message} /> )} />
                                            <div className="md:col-start-1 md:col-span-3">
                                                <Controller name={`family.${index}.idProof`} control={control} render={({ field, fieldState }) => ( <UploadDocument label={`Aadhaar Card`} file={field.value} onFileChange={field.onChange} error={fieldState.error?.message} allowCapture /> )} />
                                            </div>
                                            <Button type="button" variant="icon" size="sm" onClick={() => removeFamily(index)} className="!absolute top-2 right-2"><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                        </div>
                                    )})}
                                    <Button type="button" variant="outline" onClick={() => appendFamily({ id: `fam_upload_${Date.now()}`, relation: '', idProof: null, phone: '' })}>
                                        <Plus className="mr-2 h-4 w-4"/> Add Family Member
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t flex justify-between items-center gap-4">
                         <Button type="button" variant="secondary" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
                        <Button type="submit" isLoading={isProcessing}>Process</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PreUpload;