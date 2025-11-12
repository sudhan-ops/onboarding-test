import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import type { Insurance } from '../../types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Modal from '../../components/ui/Modal';
import InsuranceForm from '../../components/hr/InsuranceForm';

const InsuranceManagement: React.FC = () => {
    const [insurances, setInsurances] = useState<Insurance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentInsurance, setCurrentInsurance] = useState<Insurance | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const fetchInsurances = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getInsurances();
            setInsurances(data);
        } catch (error) {
            setToast({ message: 'Failed to fetch insurance policies.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInsurances();
    }, [fetchInsurances]);
    
    const handleSave = async (data: Omit<Insurance, 'id'>) => {
        try {
            if (currentInsurance) {
                // Mock update
            } else {
                await api.createInsurance(data);
                setToast({ message: 'Insurance created.', type: 'success' });
            }
            setIsFormOpen(false);
            fetchInsurances();
        } catch (error) {
             setToast({ message: 'Failed to save insurance.', type: 'error' });
        }
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            {isFormOpen && <InsuranceForm onSave={handleSave} onClose={() => setIsFormOpen(false)} initialData={currentInsurance} />}
            
            <AdminPageHeader title="Insurance Management">
                 <Button onClick={() => { setCurrentInsurance(null); setIsFormOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Insurance</Button>
            </AdminPageHeader>

            <div className="overflow-x-auto">
                <table className="min-w-full responsive-table">
                    <thead className="bg-page">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Provider</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Policy Number</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Valid Till</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="md:bg-card divide-y divide-border md:divide-y-0">
                        {isLoading ? (
                            <tr><td colSpan={5} data-label="Status" className="text-center py-10 text-muted">Loading...</td></tr>
                        ) : insurances.map((ins) => (
                            <tr key={ins.id}>
                                <td data-label="Type" className="px-6 py-4 font-medium">{ins.type}</td>
                                <td data-label="Provider" className="px-6 py-4 text-sm text-muted">{ins.provider}</td>
                                <td data-label="Policy Number" className="px-6 py-4 text-sm text-muted">{ins.policyNumber}</td>
                                <td data-label="Valid Till" className="px-6 py-4 text-sm text-muted">{ins.validTill}</td>
                                <td data-label="Actions" className="px-6 py-4">
                                    <div className="flex items-center gap-2 md:justify-start justify-end">
                                        <Button variant="icon" size="sm" onClick={() => { setCurrentInsurance(ins); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InsuranceManagement;