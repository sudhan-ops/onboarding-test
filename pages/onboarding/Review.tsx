import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useSettingsStore } from '../../store/settingsStore';
import Button from '../../components/ui/Button';
import FormHeader from '../../components/onboarding/FormHeader';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import { api } from '../../services/api';
import type { VerificationResult, EducationRecord, UploadedFile } from '../../types';
import { useAuthStore } from '../../store/authStore';

const DetailItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-muted">{label}</dt>
        <dd className="mt-1 text-sm text-primary-text">{value || '-'}</dd>
    </div>
);

const DetailItemWithStatus: React.FC<{ label: string; value?: string | number | null; status: boolean | null; isVerifying: boolean }> = ({ label, value, status, isVerifying }) => (
    <div>
        <dt className="text-sm font-medium text-muted flex items-center">
            {label}
            {isVerifying && <Loader2 className="h-4 w-4 text-muted animate-spin ml-2" />}
            {!isVerifying && status === true && <span title="Verified from document" className="ml-2"><CheckCircle className="h-4 w-4 text-green-500" /></span>}
            {!isVerifying && status === false && <span title="Verification Failed" className="ml-2"><XCircle className="h-4 w-4 text-red-500" /></span>}
        </dt>
        <dd className="mt-1 text-sm text-primary-text">{value || '-'}</dd>
    </div>
);

const MobileDetailItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
    <div className="flex justify-between items-start py-2">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm text-white font-medium text-right max-w-[60%]">{value || '-'}</span>
    </div>
);


const Review = () => {
    const { onSubmit, isSubmitting } = useOutletContext<{ onSubmit: () => Promise<void>; isSubmitting: boolean }>();
    const { user } = useAuthStore();
    const { data, logVerificationUsage, setPersonalVerifiedStatus, setBankVerifiedStatus, setUanVerifiedStatus } = useOnboardingStore();
    const { perfiosApi } = useSettingsStore();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const isMobileView = user?.role === 'field_officer' && isMobile;

    const [verificationState, setVerificationState] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
    const [verificationMessage, setVerificationMessage] = useState('');

    const uploadedFingerprints = useMemo(() => Object.entries(data.biometrics.fingerprints)
        .filter(([, value]) => value !== null)
        .map(([key]) => {
            // Convert camelCase key to a readable name like "Left Thumb"
            return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        }), [data.biometrics.fingerprints]);

    const handleVerification = async () => {
        setVerificationState('verifying');
        setVerificationMessage('');
        let allSuccess = true;
        const messages: string[] = [];

        try {
            // 1. Bank Verification
            logVerificationUsage('Bank AC Verification Advanced');
            // FIX: The object passed to verifyBankAccountWithPerfios was incorrect.
            // It has been updated to match the 'PerfiosVerificationData' type definition.
            const bankResult = await api.verifyBankAccountWithPerfios({
                name: data.bank.accountHolderName,
                dob: data.personal.dob,
                aadhaar: data.personal.idProofNumber || null,
                pan: null, // PAN not collected for this specific verification step
                bank: {
                    accountNumber: data.bank.accountNumber,
                    ifsc: data.bank.ifscCode,
                },
                uan: data.uan.uanNumber || null,
                esi: data.esi.esiNumber || null,
            });
            messages.push(`Bank: ${bankResult.message}`);
            setBankVerifiedStatus({
                accountNumber: bankResult.verifiedFields.accountNumber,
                accountHolderName: bankResult.verifiedFields.accountHolderName,
            });
            if (!bankResult.success) allSuccess = false;
            
            // 2. Aadhaar Verification
            if (data.personal.idProofType === 'Aadhaar' && data.personal.idProofNumber) {
                logVerificationUsage('Aadhaar Verification');
                const aadhaarResult = await api.verifyAadhaar(data.personal.idProofNumber);
                messages.push(`Aadhaar: ${aadhaarResult.message}`);
                setPersonalVerifiedStatus({ idProofNumber: aadhaarResult.success });
                if (!aadhaarResult.success) allSuccess = false;
            }

            // 3. UAN Verification
            if (data.uan.hasPreviousPf && data.uan.uanNumber) {
                logVerificationUsage('EPF UAN Lookup');
                const uanResult = await api.lookupUan(data.uan.uanNumber);
                messages.push(`UAN: ${uanResult.message}`);
                // Fix: The verifiedFields object from the API uses 'uan', not 'uanNumber'.
                setUanVerifiedStatus({ uanNumber: uanResult.verifiedFields.uan });
                if (!uanResult.success) allSuccess = false;
            }

            // Persist the updated statuses
            await api.updateOnboarding(useOnboardingStore.getState().data);

            setVerificationMessage(messages.join('\n'));
            setVerificationState(allSuccess ? 'success' : 'failed');

        } catch (error: any) {
            setVerificationState('failed');
            setVerificationMessage(error.message || 'An unexpected error occurred during verification.');
        }
    };

    const handleGenerateForms = () => {
        navigate(`/onboarding/pdf/${data.id || 'draft'}`);
    };

    const canSubmit = (verificationState === 'success' || !perfiosApi.enabled) && data.formsGenerated;
    
    if (isMobileView) {
        return (
             <form onSubmit={async (e) => { e.preventDefault(); await onSubmit(); }} id="review-form">
                <p className="text-sm text-gray-400 mb-6">Please review all your details carefully before submitting.</p>
                 <div className="space-y-6">
                    <section>
                        <h4 className="fo-section-title mb-2">Personal Details</h4>
                        <div className="divide-y divide-border">
                             <MobileDetailItem label="Full Name" value={`${data.personal.firstName} ${data.personal.lastName}`} />
                             <MobileDetailItem label="Email" value={data.personal.email} />
                             <MobileDetailItem label="Mobile" value={data.personal.mobile} />
                             <MobileDetailItem label="Date of Birth" value={data.personal.dob} />
                        </div>
                    </section>
                    <section>
                        <h4 className="fo-section-title mb-2">Organization Details</h4>
                        <div className="divide-y divide-border">
                             <MobileDetailItem label="Site" value={data.organization.organizationName} />
                             <MobileDetailItem label="Designation" value={data.organization.designation} />
                             <MobileDetailItem label="Department" value={data.organization.department} />
                        </div>
                    </section>
                    <section>
                        <h4 className="fo-section-title mb-2">Bank Details</h4>
                         <div className="divide-y divide-border">
                            <MobileDetailItem label="Account Holder" value={data.bank.accountHolderName} />
                            <MobileDetailItem label="Account Number" value={'*'.repeat(Math.max(0, data.bank.accountNumber.length - 4)) + data.bank.accountNumber.slice(-4)} />
                            <MobileDetailItem label="IFSC Code" value={data.bank.ifscCode} />
                         </div>
                    </section>
                    <section>
                        <h4 className="fo-section-title mb-2">Uniform Details</h4>
                        <div className="divide-y divide-border">
                             <MobileDetailItem label="Uniform Required" value={data.uniforms.length > 0 ? 'Yes' : 'No'} />
                             {data.uniforms.map(item => (
                                 <MobileDetailItem key={item.itemId} label={item.itemName} value={`${item.quantity} x Size ${item.sizeLabel} (${item.fit})`} />
                             ))}
                        </div>
                    </section>
                     <section>
                        <h4 className="fo-section-title mb-2">Biometrics</h4>
                        {data.biometrics.signatureImage && (
                            <div className="mb-4">
                                <h5 className="fo-section-title mb-2 text-base">Signature</h5>
                                <img src={data.biometrics.signatureImage.preview} alt="Signature" className="h-24 bg-white border rounded-md mx-auto" />
                            </div>
                        )}
                        {uploadedFingerprints.length > 0 && (
                            <div>
                                <h5 className="fo-section-title mb-2 text-base">Fingerprints</h5>
                                <ul className="text-sm text-center text-gray-400 list-disc list-inside">
                                    {uploadedFingerprints.map(finger => <li key={finger}>{finger}</li>)}
                                </ul>
                            </div>
                        )}
                    </section>
                </div>
            </form>
        );
    }

    return (
        <form onSubmit={async (e) => { e.preventDefault(); await onSubmit(); }} id="review-form">
            <FormHeader title="Review & Submit" subtitle="Please review all your details carefully before submitting." />
            
            <div className="space-y-8">
                <section>
                    <h4 className="text-md font-semibold text-primary-text mb-4 border-b pb-2">Personal Details</h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                        <DetailItemWithStatus label="Full Name" value={`${data.personal.firstName} ${data.personal.lastName}`} status={data.personal.verifiedStatus?.name} isVerifying={false} />
                        <DetailItem label="Email" value={data.personal.email} />
                        <DetailItem label="Mobile" value={data.personal.mobile} />
                        <DetailItemWithStatus label="Date of Birth" value={data.personal.dob} status={data.personal.verifiedStatus?.dob} isVerifying={false} />
                        <DetailItem label="Gender" value={data.personal.gender} />
                        <DetailItemWithStatus label="Aadhaar Number" value={data.personal.idProofNumber} status={data.personal.verifiedStatus?.idProofNumber} isVerifying={verificationState === 'verifying'} />
                    </dl>
                </section>

                <section>
                    <h4 className="text-md font-semibold text-primary-text mb-4 border-b pb-2">Organization Details</h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                        <DetailItem label="Site / Client" value={data.organization.organizationName} />
                        <DetailItem label="Designation" value={data.organization.designation} />
                        <DetailItem label="Department" value={data.organization.department} />
                        <DetailItem label="Joining Date" value={data.organization.joiningDate} />
                    </dl>
                </section>

                 <section>
                    <h4 className="text-md font-semibold text-primary-text mb-4 border-b pb-2">Bank & Statutory Details</h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                        <DetailItemWithStatus label="Account Holder" value={data.bank.accountHolderName} status={data.bank.verifiedStatus?.accountHolderName} isVerifying={verificationState === 'verifying'} />
                        <DetailItemWithStatus label="Account Number" value={'*'.repeat(Math.max(0, data.bank.accountNumber.length - 4)) + data.bank.accountNumber.slice(-4)} status={data.bank.verifiedStatus?.accountNumber} isVerifying={verificationState === 'verifying'} />
                        <DetailItemWithStatus label="IFSC Code" value={data.bank.ifscCode} status={data.bank.verifiedStatus?.ifscCode} isVerifying={verificationState === 'verifying'} />
                        <DetailItem label="Bank Name" value={data.bank.bankName} />
                        {data.uan.hasPreviousPf && <DetailItemWithStatus label="UAN" value={data.uan.uanNumber} status={data.uan.verifiedStatus?.uanNumber} isVerifying={verificationState === 'verifying'} />}
                        {data.esi.hasEsi && <DetailItemWithStatus label="ESI Number" value={data.esi.esiNumber} status={data.esi.verifiedStatus?.esiNumber} isVerifying={verificationState === 'verifying'} />}
                    </dl>
                </section>
                
                {data.uniforms.length > 0 && (
                  <section>
                    <h4 className="text-md font-semibold text-primary-text mb-4 border-b pb-2">Uniform Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {data.uniforms.map(item => (
                        <div key={item.itemId} className="bg-page p-3 rounded-md">
                          <p className="font-semibold text-sm">{item.itemName}</p>
                          <p className="text-xs text-muted">Size: {item.sizeLabel} ({item.fit})</p>
                          <p className="text-xs text-muted">Qty: {item.quantity}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {data.biometrics.signatureImage && (
                    <section>
                        <h4 className="text-md font-semibold text-primary-text mb-4 border-b pb-2">Biometrics</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <h5 className="font-semibold text-primary-text">Signature</h5>
                                <div className="mt-2 p-2 border rounded-lg inline-block bg-page">
                                    <img src={data.biometrics.signatureImage.preview} alt="Signature" className="h-24" />
                                </div>
                            </div>
                            {uploadedFingerprints.length > 0 && (
                                <div>
                                    <h5 className="font-semibold text-primary-text">Fingerprints Uploaded</h5>
                                    <ul className="mt-2 list-disc list-inside text-sm text-muted columns-2">
                                        {uploadedFingerprints.map(finger => <li key={finger}>{finger}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </div>
            
            {perfiosApi.enabled && (
                <div className="mt-8 pt-6 border-t">
                    <h3 className="text-lg font-semibold text-primary-text mb-4">Third-Party Verification</h3>
                    <div className="p-4 bg-page rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex-1">
                            <p className="font-medium">Run a background check against official records.</p>
                            <p className="text-sm text-muted">This step is required before you can submit the application.</p>
                            {verificationState === 'failed' && <p className="text-sm text-red-600 mt-2">{verificationMessage}</p>}
                            {verificationState === 'success' && <p className="text-sm text-green-600 mt-2">{verificationMessage}</p>}
                        </div>
                        <Button onClick={handleVerification} isLoading={verificationState === 'verifying'} disabled={verificationState === 'success'}>
                            {verificationState === 'idle' && <><ShieldCheck className="mr-2 h-4 w-4" /> Verify Details</>}
                            {verificationState === 'verifying' && 'Verifying...'}
                            {verificationState === 'failed' && 'Retry Verification'}
                            {verificationState === 'success' && <><CheckCircle className="mr-2 h-4 w-4" /> Verified</>}
                        </Button>
                    </div>
                </div>
            )}
            
            <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-semibold text-primary-text mb-4">Generate Official Forms</h3>
                 <div className="p-4 bg-page rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex-1">
                        <p className="font-medium">Generate and review the official PDF documents.</p>
                        <p className="text-sm text-muted">This step is mandatory before final submission.</p>
                    </div>
                    {data.formsGenerated ? (
                        <div className="flex items-center gap-2 font-semibold text-green-600">
                            <CheckCircle className="h-5 w-5"/>
                            <span>Forms Generated & Confirmed</span>
                        </div>
                    ) : (
                        <Button onClick={handleGenerateForms}>
                            <FileText className="mr-2 h-4 w-4" /> Generate & Review Forms
                        </Button>
                    )}
                </div>
            </div>

            <div className="mt-8 pt-6 border-t">
                <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input id="confirmation" name="confirmation" type="checkbox" required className="focus:ring-accent h-4 w-4 text-accent border-gray-300 rounded" disabled={!canSubmit} />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="confirmation" className={`font-medium ${!canSubmit ? 'text-gray-400' : 'text-gray-700'}`}>Declaration</label>
                        <p className={`${!canSubmit ? 'text-gray-400' : 'text-muted'}`}>I hereby declare that the information provided is true and correct to the best of my knowledge.</p>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default Review;