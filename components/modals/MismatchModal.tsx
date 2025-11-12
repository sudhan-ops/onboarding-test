import React from 'react';
import Button from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

interface MismatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOverride: () => void;
  employeeName: string;
  bankName: string;
  reason?: string;
}

const MismatchModal: React.FC<MismatchModalProps> = ({ isOpen, onClose, onOverride, employeeName, bankName, reason }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-modal="true" role="dialog">
            <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-lg m-4 animate-fade-in-scale">
                <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4 flex-1">
                        <h3 className="text-lg font-bold text-primary-text">Verification Alert: Name Mismatch Found</h3>
                        <div className="mt-2 text-sm text-muted space-y-2">
                           <p><strong>Name on ID:</strong> "{employeeName}"</p>
                           <p><strong>Name on Bank Proof:</strong> "{bankName}"</p>
                           {reason && <p className="mt-2 p-2 bg-page rounded-md"><strong>AI Analysis:</strong> <em>{reason}</em></p>}
                           <p className="mt-2">Please upload the correct documents. If the names are different for a valid reason (e.g., maiden name), you can override this warning, but it will require manual verification by an administrator.</p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                    <Button onClick={onOverride} variant="danger">
                        Override & Proceed
                    </Button>
                    <Button onClick={onClose} variant="secondary">
                        Re-upload Documents
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MismatchModal;