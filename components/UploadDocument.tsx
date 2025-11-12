import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { UploadedFile } from '../types';
import { UploadCloud, File as FileIcon, X, RefreshCw, Camera, Loader2, AlertTriangle, CheckCircle, Eye, Trash2, BadgeInfo, CreditCard, User as UserIcon, FileText, FileSignature, IndianRupee, GraduationCap, Fingerprint, XCircle } from 'lucide-react';
import { api } from '../services/api';
import Button from './ui/Button';
import CameraCaptureModal from './CameraCaptureModal';
import { useAuthStore } from '../store/authStore';
import ImagePreviewModal from './modals/ImagePreviewModal';
import { useOnboardingStore } from '../store/onboardingStore';

interface UploadDocumentProps {
  label: string;
  file: UploadedFile | undefined | null;
  onFileChange: (file: UploadedFile | null) => void;
  allowedTypes?: string[];
  error?: string;
  allowCapture?: boolean;
  costingItemName?: string;
  verificationStatus?: boolean | null;
  // Fix: Add missing props for OCR and verification functionality
  onOcrComplete?: (data: any) => void;
  ocrSchema?: any;
  setToast?: (toast: { message: string; type: 'success' | 'error' } | null) => void;
  docType?: string;
  onVerification?: (base64: string, mimeType: string) => Promise<{ success: boolean; reason: string }>;
}

const UploadDocument: React.FC<UploadDocumentProps> = ({ 
    label,
    file,
    onFileChange,
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
    error,
    allowCapture = false,
    costingItemName,
    verificationStatus,
    onOcrComplete,
    ocrSchema,
    setToast,
    docType,
    onVerification,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const { logVerificationUsage } = useOnboardingStore.getState();

    const captureGuidance = useMemo(() => {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('photo')) return 'profile';
        if (['proof', 'document', 'card', 'slip', 'passbook', 'cheque', 'certificate'].some(keyword => lowerLabel.includes(keyword))) {
            return 'document';
        }
        return 'none';
    }, [label]);
    
    const handleFileSelect = useCallback(async (selectedFile: File) => {
        if (!allowedTypes.includes(selectedFile.type)) {
            setUploadError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}.`);
            return;
        }
        if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
            setUploadError('File size must be less than 5MB.');
            return;
        }

        setUploadError('');
        setIsLoading(true);

        const preview = URL.createObjectURL(selectedFile);
        let fileData: UploadedFile = {
            name: selectedFile.name, type: selectedFile.type, size: selectedFile.size,
            preview, file: selectedFile,
        };
        onFileChange(fileData);

        if (costingItemName) {
            logVerificationUsage(costingItemName);
        }
        
        try {
            const reader = new FileReader();
            reader.readAsDataURL(selectedFile);
            reader.onloadend = async () => {
                try {
                    const base64 = (reader.result as string).split(',')[1];
                    
                    if (onVerification) {
                        const verificationResult = await onVerification(base64, selectedFile.type);
                        if (!verificationResult.success) {
                            setUploadError(verificationResult.reason);
                            setIsLoading(false);
                            return; 
                        }
                    }
        
                    if (onOcrComplete && ocrSchema && setToast) {
                        try {
                            const extractedData = await api.extractDataFromImage(base64, selectedFile.type, ocrSchema, docType);
                            onOcrComplete(extractedData);
                        } catch (ocrError: any) {
                            console.error("OCR failed:", ocrError);
                            setToast({ message: `AI extraction failed. Please check the document.`, type: 'error' });
                        }
                    }
                } catch (e: any) {
                    setUploadError(e.message || "Processing failed.");
                } finally {
                    setIsLoading(false);
                }
            };
            reader.onerror = () => {
                throw new Error("Could not read file for processing.");
            };
        } catch (e: any) {
            setUploadError(e.message || "Processing failed.");
            setIsLoading(false);
        }

    }, [allowedTypes, onFileChange, costingItemName, logVerificationUsage, onOcrComplete, ocrSchema, setToast, docType, onVerification]);

    const handleCapture = useCallback(async (base64Image: string, mimeType: string) => {
        const blob = await (await fetch(`data:${mimeType};base64,${base64Image}`)).blob();
        const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: mimeType });
        handleFileSelect(capturedFile);
    }, [handleFileSelect]);

    const handleRemove = () => {
        if(file) URL.revokeObjectURL(file.preview);
        onFileChange(null);
        setUploadError('');
    };

    const inputId = `file-upload-${label.replace(/\s+/g, '-')}`;
    const displayError = error || uploadError;

    const getIconForLabel = (label: string): React.ElementType => {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('profile photo')) return UserIcon;
        if (lowerLabel.includes('id proof') || lowerLabel.includes('aadhaar') || lowerLabel.includes('pan') || lowerLabel.includes('voter')) return CreditCard;
        if (lowerLabel.includes('bank proof')) return IndianRupee;
        if (lowerLabel.includes('signature')) return FileSignature;
        if (lowerLabel.includes('fingerprint')) return Fingerprint;
        if (lowerLabel.includes('certificate')) return GraduationCap;
        return FileText;
    };

    const Icon = getIconForLabel(label);

    return (
        <div className="w-full">
            <ImagePreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} imageUrl={file?.preview || ''} />
            {isCameraOpen && <CameraCaptureModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleCapture} captureGuidance={captureGuidance} />}

            <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-muted" htmlFor={inputId}>{label}</label>
                {verificationStatus === true && <span title="Verified"><CheckCircle className="h-4 w-4 text-green-400" /></span>}
                {verificationStatus === false && <span title="Verification Failed"><XCircle className="h-4 w-4 text-red-400" /></span>}
            </div>

            <div className={`w-full text-center transition-all duration-300`}>
                {file ? (
                     <div className="w-full flex flex-col h-full bg-page p-2 border border-border rounded-lg relative pro-dark-theme:bg-[#0d2c18] pro-dark-theme:border-[#123820]">
                        <div className="flex-grow w-full rounded-md overflow-hidden group relative bg-black/10 flex items-center justify-center min-h-[100px]">
                            {isLoading ? (
                                <div className="flex flex-col items-center text-muted">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <span className="text-xs mt-2">Processing...</span>
                                </div>
                            ) : file.type.startsWith('image/') ? (
                                 <img src={file.preview} alt="preview" className="max-w-full max-h-28 object-contain" />
                            ) : (
                                <div className="text-muted p-2">
                                    <FileIcon className="h-10 w-10 mx-auto" />
                                    <span className="text-xs mt-1 block break-all">{file.name}</span>
                                </div>
                            )}
                            <label htmlFor={inputId} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md cursor-pointer">
                                <RefreshCw className="h-6 w-6 text-white" />
                            </label>
                        </div>
                        <div className="mt-2 flex items-center justify-center gap-2 flex-shrink-0">
                            {file.type.startsWith('image/') && (
                                 <button type="button" onClick={() => setIsPreviewOpen(true)} className="text-xs font-medium text-accent hover:underline flex items-center gap-1 p-1">
                                    <Eye className="h-3 w-3" /> View
                                </button>
                            )}
                            <button type="button" onClick={handleRemove} className="text-xs font-medium text-red-500 hover:underline flex items-center gap-1 p-1">
                                <Trash2 className="h-3 w-3" /> Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <label htmlFor={inputId} className={`
                        cursor-pointer flex flex-col items-center justify-center
                        p-6 border-2 border-dashed rounded-lg transition-colors
                        border-border hover:border-accent hover:bg-accent-light
                        pro-dark-theme:border-gray-600 pro-dark-theme:hover:border-accent pro-dark-theme:hover:bg-accent-light
                        ${displayError ? '!border-red-500' : ''}
                    `}>
                        <div className="p-3 bg-accent-light rounded-full text-accent-dark pro-dark-theme:bg-accent/20 pro-dark-theme:text-accent">
                            <Icon className="h-8 w-8" />
                        </div>
                        <p className="font-semibold text-primary-text mt-2">Click to upload</p>
                        <p className="text-xs text-muted mt-1">or drag & drop</p>
                        
                        {allowCapture && (
                            <>
                                <span className="text-xs text-muted my-2">OR</span>
                                <Button type="button" onClick={(e) => { e.preventDefault(); setIsCameraOpen(true); }} variant="secondary" size="sm">
                                    <Camera className="h-4 w-4 mr-2" />
                                    Capture with Camera
                                </Button>
                            </>
                        )}
                    </label>
                )}
            </div>
            
            <input id={inputId} type="file" className="sr-only" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} accept={allowedTypes.join(',')}/>
            
            <div className="text-center mt-1 min-h-[16px]">
                {displayError && <p className="text-xs text-red-500">{displayError}</p>}
            </div>
        </div>
    );
};

export default UploadDocument;