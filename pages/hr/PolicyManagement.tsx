import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import type { Policy } from '../../types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Modal from '../../components/ui/Modal';

// A simple form for Policy can be inlined or a separate component.
// For simplicity, we'll inline it.
const PolicyForm: React.FC<{
  onSave: (data: Omit<Policy, 'id'>) => void,
  onClose: () => void,
  initialData?: Policy | null
}> = ({ onSave, onClose, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description });
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <h3 className="text-lg font-bold mb-4">{initialData ? 'Edit' : 'Add'} Policy</h3>
          <div className="space-y-4">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Policy Name (e.g., POSH)" className="form-input" required />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="form-input" rows={3}></textarea>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Policy</Button>
          </div>
        </form>
      </div>
    </div>
  );
};


const PolicyManagement: React.FC = () => {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentPolicy, setCurrentPolicy] = useState<Policy | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const fetchPolicies = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getPolicies();
            setPolicies(data);
        } catch (error) {
            setToast({ message: 'Failed to fetch policies.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPolicies();
    }, [fetchPolicies]);
    
    const handleSave = async (data: Omit<Policy, 'id'>) => {
        try {
            if (currentPolicy) {
                // Mock update: find and replace
            } else {
                await api.createPolicy(data);
                setToast({ message: 'Policy created.', type: 'success' });
            }
            setIsFormOpen(false);
            fetchPolicies();
        } catch (error) {
             setToast({ message: 'Failed to save policy.', type: 'error' });
        }
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            {isFormOpen && <PolicyForm onSave={handleSave} onClose={() => setIsFormOpen(false)} initialData={currentPolicy} />}
            
            <AdminPageHeader title="Policy Management">
                 <Button onClick={() => { setCurrentPolicy(null); setIsFormOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Policy</Button>
            </AdminPageHeader>

            <div className="overflow-x-auto">
                <table className="min-w-full responsive-table">
                    <thead className="bg-page">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Policy Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="md:bg-card divide-y divide-border md:divide-y-0">
                        {isLoading ? (
                            <tr><td colSpan={3} data-label="Status" className="text-center py-10 text-muted">Loading...</td></tr>
                        ) : policies.map((policy) => (
                            <tr key={policy.id}>
                                <td data-label="Policy Name" className="px-6 py-4 font-medium">{policy.name}</td>
                                <td data-label="Description" className="px-6 py-4 text-sm text-muted">{policy.description}</td>
                                <td data-label="Actions" className="px-6 py-4">
                                    <div className="flex items-center gap-2 md:justify-start justify-end">
                                        <Button variant="icon" size="sm" onClick={() => { setCurrentPolicy(policy); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
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

export default PolicyManagement;