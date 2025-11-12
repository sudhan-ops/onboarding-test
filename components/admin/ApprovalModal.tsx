import React, { useEffect, useState } from 'react';
import type { User, Role } from '../../types';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Modal from '../ui/Modal';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (userId: string, newRole: string) => void;
  user: User | null;
  isConfirming?: boolean;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ isOpen, onClose, onApprove, user, isConfirming }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      api.getRoles().then(fetchedRoles => {
        // Filter out 'unverified' and 'admin' as they shouldn't be assigned directly here.
        const assignableRoles = fetchedRoles.filter(r => r.id !== 'unverified' && r.id !== 'admin');
        setRoles(assignableRoles);
        if (assignableRoles.length > 0) {
          setSelectedRole(assignableRoles[0].id); // Default to the first available role
        }
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (user && selectedRole) {
      onApprove(user.id, selectedRole);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Approve User Account"
      confirmButtonText="Confirm Approval"
      confirmButtonVariant="primary"
      isConfirming={isConfirming}
    >
      <div className="space-y-4">
        <p>You are approving the account for <strong className="text-primary-text">{user.name}</strong> ({user.email}).</p>
        <p>Please assign a role to activate their account.</p>
        {isLoading ? (
          <p>Loading roles...</p>
        ) : (
          <Select
            label="Assign Role"
            id="approval-role"
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
          >
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.displayName}</option>
            ))}
          </Select>
        )}
      </div>
    </Modal>
  );
};

export default ApprovalModal;
