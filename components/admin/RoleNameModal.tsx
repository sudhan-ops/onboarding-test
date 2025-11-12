import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface RoleNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  title: string;
  initialName?: string;
}

const RoleNameModal: React.FC<RoleNameModalProps> = ({ isOpen, onClose, onSave, title, initialName = '' }) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setError('');
    }
  }, [isOpen, initialName]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Role name cannot be empty.');
      return;
    }
    onSave(name.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-sm m-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <h3 className="text-lg font-bold text-primary-text mb-4">{title}</h3>
            <Input 
                label="Role Display Name" 
                id="role-name" 
                value={name}
                onChange={e => setName(e.target.value)}
                error={error}
                autoFocus
            />
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
                <Button type="submit">Save</Button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default RoleNameModal;
