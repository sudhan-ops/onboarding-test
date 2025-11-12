import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useForm, Controller, useFormContext } from 'react-hook-form';
import { useOnboardingStore } from '../../store/onboardingStore';
import FormHeader from '../../components/onboarding/FormHeader';
import UploadDocument from '../../components/UploadDocument';
import type { OnboardingData } from '../../types';
import { Type } from "@google/genai";
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const formatNameToTitleCase = (value: string | undefined) => {
    if (!value) return '';
    return value.toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase());
}

interface OutletContext {
  onValidated: () => Promise<void>;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

const Documents: React.FC = () => {
    const { onValidated, setToast } = useOutletContext<OutletContext>();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { data, updatePersonal, updateBank, addEducationRecord, updateFamilyMember, updateEducationRecord, updateUan, updateEsi, updateGmc } = useOnboardingStore();
    const isMobile = useMediaQuery('(max-width: 767px)');
    
    const handlePersonalIdOcr = (extractedData: any) => {
        const update: Partial<OnboardingData['personal']> = {};
         if (extractedData.name) {
            const nameParts = extractedData.name.split(' ');
            update.firstName = formatNameToTitleCase(nameParts.shift() || '');
            update.lastName = formatNameToTitleCase(nameParts.pop() || '');
            update.middleName = formatNameToTitleCase(nameParts.join(' '));
        }
        if (extractedData.dob) {
            try {
                const date = new Date(extractedData.dob);
                if(!isNaN(date.getTime())) update.dob = format(date, 'yyyy-MM-dd');
            } catch(e) {}
        }
        if (extractedData.aadhaarNumber) {
            update.idProofNumber = extractedData.aadhaarNumber.replace(/\s/g, '');
            update.idProofType = 'Aadhaar';
        }
        updatePersonal(update);
    };

    const handleBankOcr = (extractedData: any) => {
        const update: Partial<OnboardingData['bank']> = {};
         if (extractedData.accountHolderName) {
            update.accountHolderName = formatNameToTitleCase(extractedData.accountHolderName);
        }
        if (extractedData.accountNumber) {
            const acNum = extractedData.accountNumber.replace(/\D/g, '');
            update.accountNumber = acNum;
            update.confirmAccountNumber = acNum;
        }
        if (extractedData.ifscCode) {
            update.ifscCode = extractedData.ifscCode.toUpperCase().replace(/\s/g, '');
        }
        updateBank(update);
    };
    
    const handleUanOcr = (extractedData: any) => {
        const update: Partial<OnboardingData['uan']> = {};
        if(extractedData.uanNumber) {
            update.uanNumber = extractedData.uanNumber.replace(/\D/g, '');
            update.hasPreviousPf = true;
        }
        updateUan(update);
    };
    
    const handleEsiOcr = (extractedData: any) => {
        const update: Partial<OnboardingData['esi']> = {};
        if(extractedData.esiNumber) {
            update.esiNumber = extractedData.esiNumber.replace(/\D/g, '');
            update.hasEsi = true;
        }
        updateEsi(update);
    };

    const handleFamilyOcr = (id: string) => (extractedData: any) => {
        const update: Partial<OnboardingData['family'][0]> = {};
        if (extractedData.name) {
            update.name = formatNameToTitleCase(extractedData.name);
        }
        if (extractedData.dob) {
           try {
                const date = new Date(extractedData.dob);
                if(!isNaN(date.getTime())) update.dob = format(date, 'yyyy-MM-dd');
            } catch(e) {}
        }
        updateFamilyMember(id, update);
    };
    
    const handleEducationOcr = (id: string) => (extractedData: any) => {
         const update: Partial<OnboardingData['education'][0]> = {};
         if (extractedData.degree) update.degree = extractedData.degree;
         if (extractedData.institution) update.institution = extractedData.institution;
         if (extractedData.endYear) update.endYear = extractedData.endYear.toString();
         updateEducationRecord(id, update);
    };

    const idProofSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, dob: { type: Type.STRING }, aadhaarNumber: { type: Type.STRING } } };
    const bankProofSchema = { type: Type.OBJECT, properties: { accountHolderName: { type: Type.STRING }, accountNumber: { type: Type.STRING }, ifscCode: { type: Type.STRING } } };
    const salarySlipSchema = { type: Type.OBJECT, properties: { uanNumber: { type: Type.STRING, description: "The 12-digit Universal Account Number (UAN)." }, pfNumber: { type: Type.STRING, description: "The Provident Fund (PF) account number." }, esiNumber: { type: Type.STRING, description: "The 10 or 17-digit ESI number." } } };
    const uanSchema = { type: Type.OBJECT, properties: { uanNumber: { type: Type.STRING } } };
    const esiSchema = { type: Type.OBJECT, properties: { esiNumber: { type: Type.STRING } } };
    const educationSchema = { type: Type.OBJECT, properties: { degree: { type: Type.STRING }, institution: { type: Type.STRING }, endYear: { type: Type.STRING } } };


    if (isMobile) {
        return (
            <form onSubmit={async (e) => { e.preventDefault(); await onValidated(); }} id="documents-form">
                <p className="text-sm text-gray-400 mb-6">Upload supporting documents. You can also do this within each relevant section.</p>
                <div className="space-y-4">
                    <UploadDocument label="ID Proof (Front Side)" file={data.personal.idProofFront} onFileChange={(file) => updatePersonal({ idProofFront: file })} onOcrComplete={handlePersonalIdOcr} ocrSchema={idProofSchema} setToast={setToast} allowCapture docType={data.personal.idProofType || 'Aadhaar'} />
                    <UploadDocument label="ID Proof (Back Side)" file={data.personal.idProofBack} onFileChange={(file) => updatePersonal({ idProofBack: file })} onOcrComplete={handlePersonalIdOcr} ocrSchema={idProofSchema} setToast={setToast} allowCapture docType={data.personal.idProofType || 'Aadhaar'} />
                    <UploadDocument label="Profile Photo" file={data.personal.photo} onFileChange={(file) => updatePersonal({ photo: file })} allowCapture allowedTypes={['image/jpeg', 'image/png', 'image/webp']} />
                    <UploadDocument label="Bank Proof" file={data.bank.bankProof} onFileChange={(file) => updateBank({ bankProof: file })} onOcrComplete={handleBankOcr} ocrSchema={bankProofSchema} setToast={setToast} allowCapture docType="Bank" />
                    <UploadDocument label="Latest Salary Slip (Optional, for UAN/ESI)" file={data.uan.salarySlip} onFileChange={(file) => updateUan({ salarySlip: file })} onOcrComplete={(d) => { handleUanOcr(d); handleEsiOcr(d); }} ocrSchema={salarySlipSchema} setToast={setToast} allowCapture docType="Salary" />
                    {data.uan.hasPreviousPf && <UploadDocument label="UAN Document" file={data.uan.document} onFileChange={(file) => updateUan({ document: file })} onOcrComplete={handleUanOcr} ocrSchema={uanSchema} setToast={setToast} allowCapture docType="UAN" />}
                    {data.esi.hasEsi && <UploadDocument label="ESI Document" file={data.esi.document} onFileChange={(file) => updateEsi({ document: file })} onOcrComplete={handleEsiOcr} ocrSchema={esiSchema} setToast={setToast} allowCapture />}
                    {data.gmc.isOptedIn === false && <UploadDocument label="GMC Policy Copy" file={data.gmc.gmcPolicyCopy} onFileChange={(file) => updateGmc({ gmcPolicyCopy: file })} allowCapture />}
                    
                    <div className="mt-6 pt-6 border-t border-[#374151]">
                        <h4 className="form-header-title mb-4">Education Certificates</h4>
                        <div className="space-y-4">
                             {data.education.map(record => (
                                 <UploadDocument key={record.id} label={`Certificate for ${record.degree || 'Qualification'}`} file={record.document} onFileChange={(file) => updateEducationRecord(record.id, { document: file })} onOcrComplete={handleEducationOcr(record.id)} ocrSchema={educationSchema} setToast={setToast} allowCapture />
                            ))}
                            <Button type="button" onClick={() => navigate('/onboarding/add/education')} variant="secondary" className="w-full flex items-center justify-center">
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Add / Edit Qualifications</span>
                            </Button>
                        </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-[#374151]">
                        <h4 className="form-header-title mb-4">Family Member Documents</h4>
                         <div className="space-y-4">
                            {data.family.map(member => (
                                <UploadDocument key={member.id} label={`ID Proof for ${member.name || 'Family Member'}`} file={member.idProof} onFileChange={(file) => updateFamilyMember(member.id, { idProof: file })} onOcrComplete={handleFamilyOcr(member.id)} ocrSchema={idProofSchema} setToast={setToast} allowCapture docType="Aadhaar" />
                            ))}
                            {data.family.length === 0 && <p className="text-sm text-gray-400">No family members added.</p>}
                            <Button type="button" onClick={() => navigate('/onboarding/add/family')} variant="secondary" className="w-full flex items-center justify-center">
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Add/Edit on Family Page</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        );
    }

    return (
        <form onSubmit={async (e) => { e.preventDefault(); await onValidated(); }} id="documents-form">
            <FormHeader title="Document Collection" subtitle="Upload supporting documents. You can also do this within each relevant section." />

            <div className="space-y-6">
                <section>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <UploadDocument
                            label="Employee ID Proof (Aadhaar/PAN) - Front Side"
                            file={data.personal.idProofFront}
                            onFileChange={(file) => updatePersonal({ idProofFront: file })}
                            onOcrComplete={handlePersonalIdOcr}
                            ocrSchema={idProofSchema}
                            setToast={setToast}
                            docType={data.personal.idProofType || 'Aadhaar'}
                        />
                         <UploadDocument
                            label="Employee ID Proof (Aadhaar/PAN) - Back Side"
                            file={data.personal.idProofBack}
                            onFileChange={(file) => updatePersonal({ idProofBack: file })}
                            onOcrComplete={handlePersonalIdOcr}
                            ocrSchema={idProofSchema}
                            setToast={setToast}
                            docType={data.personal.idProofType || 'Aadhaar'}
                        />
                        <UploadDocument
                            label="Bank Proof (Passbook/Cancelled Cheque)"
                            file={data.bank.bankProof}
                            onFileChange={(file) => updateBank({ bankProof: file })}
                            onOcrComplete={handleBankOcr}
                            ocrSchema={bankProofSchema}
                            setToast={setToast}
                            docType="Bank"
                        />
                        <UploadDocument
                            label="Latest Salary Slip (Optional, for UAN/ESI)"
                            file={data.uan.salarySlip}
                            onFileChange={(file) => updateUan({ salarySlip: file })}
                            onOcrComplete={(d) => { handleUanOcr(d); handleEsiOcr(d); }}
                            ocrSchema={salarySlipSchema}
                            setToast={setToast}
                            docType="Salary"
                         />
                    </div>
                </section>
                
                 <section>
                    <h4 className="text-md font-semibold text-primary-text mb-4 border-b pb-2">Education Certificates</h4>
                    <div className="space-y-4">
                        {data.education.map((record) => (
                            <UploadDocument
                                key={record.id}
                                label={`Certificate for ${record.degree || 'New Qualification'}`}
                                file={record.document}
                                onFileChange={(file) => updateEducationRecord(record.id, { document: file })}
                                onOcrComplete={handleEducationOcr(record.id)}
                                ocrSchema={educationSchema}
                                setToast={setToast}
                            />
                        ))}
                        <Button type="button" variant="outline" onClick={() => addEducationRecord()}>
                            <Plus className="mr-2 h-4 w-4" /> Add Qualification
                        </Button>
                    </div>
                </section>

                <section>
                    <h4 className="text-md font-semibold text-primary-text mb-4 border-b pb-2">Family Member Documents</h4>
                    <div className="space-y-4">
                        {data.family.map((member) => (
                            <UploadDocument
                                key={member.id}
                                label={`ID Proof for ${member.name || `(${member.relation})`}`}
                                file={member.idProof}
                                onFileChange={(file) => updateFamilyMember(member.id, { idProof: file })}
                                onOcrComplete={handleFamilyOcr(member.id)}
                                ocrSchema={idProofSchema}
                                setToast={setToast}
                                docType="Aadhaar"
                            />
                        ))}
                        {data.family.length === 0 && <p className="text-sm text-muted">No family members added yet.</p>}
                        <Button type="button" variant="outline" onClick={() => navigate('/onboarding/add/family')}>
                            <Plus className="mr-2 h-4 w-4" /> Go to Family Page to Add/Edit
                        </Button>
                    </div>
                </section>
            </div>
        </form>
    );
};

export default Documents;