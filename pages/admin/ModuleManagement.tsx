import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { AppModule, Permission } from '../../types';
import { Plus, Edit, Trash2, Loader2, Package } from 'lucide-react';
import Button from '../../components/ui/Button';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Modal from '../../components/ui/Modal';
import Toast from '../../components/ui/Toast';
import ModuleFormModal from '../../components/admin/ModuleFormModal';
import GridSkeleton from '../../components/skeletons/GridSkeleton';

const ModuleManagement: React.FC = () => {
  const [modules, setModules] = useState<AppModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState<AppModule | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await api.getModules();
        setModules(data);
      } catch (e) {
        setToast({ message: 'Failed to load modules.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async (moduleData: AppModule) => {
    const newModules = [...modules];
    const index = newModules.findIndex(m => m.id === moduleData.id);
    if (index > -1) {
      newModules[index] = moduleData;
    } else {
      newModules.push(moduleData);
    }
    
    try {
      await api.saveModules(newModules);
      setModules(newModules.sort((a,b) => a.name.localeCompare(b.name)));
      setToast({ message: `Module '${moduleData.name}' saved.`, type: 'success' });
      setIsFormOpen(false);
    } catch (e) {
      setToast({ message: 'Failed to save module.', type: 'error' });
    }
  };
  
  const handleDelete = async () => {
    if (!currentModule) return;
    const newModules = modules.filter(m => m.id !== currentModule.id);
    try {
      await api.saveModules(newModules);
      setModules(newModules);
      setToast({ message: `Module '${currentModule.name}' deleted.`, type: 'success' });
      setIsDeleteModalOpen(false);
    } catch (e) {
      setToast({ message: 'Failed to delete module.', type: 'error' });
    }
  };

  return (
    <div className="p-4 md:bg-card md:p-6 md:rounded-xl md:shadow-card">
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      <ModuleFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSave} initialData={currentModule} />
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDelete} title="Confirm Deletion">
        Are you sure you want to delete the module "{currentModule?.name}"?
      </Modal>

      <AdminPageHeader title="Module Management">
        <Button onClick={() => { setCurrentModule(null); setIsFormOpen(true); }}><Plus className="mr-2 h-4"/> Add Module</Button>
      </AdminPageHeader>

      {isLoading ? (
        <GridSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map(module => (
            <div key={module.id} className="bg-page p-4 rounded-lg border border-border flex flex-col">
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="h-5 w-5 text-accent"/>
                  <h4 className="font-bold text-primary-text">{module.name}</h4>
                </div>
                <p className="text-sm text-muted mb-3">{module.description}</p>
                <p className="text-xs font-semibold text-muted">{module.permissions.length} permissions</p>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-end gap-2">
                <Button variant="icon" size="sm" onClick={() => { setCurrentModule(module); setIsFormOpen(true); }} title={`Edit ${module.name}`}><Edit className="h-4 w-4"/></Button>
                <Button variant="icon" size="sm" onClick={() => { setCurrentModule(module); setIsDeleteModalOpen(true); }} title={`Delete ${module.name}`}><Trash2 className="h-4 w-4 text-red-500"/></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModuleManagement;