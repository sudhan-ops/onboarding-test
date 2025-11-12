
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import type { User } from '../../types';
import { ShieldCheck, Plus, Edit, Trash2, Info, UserCheck } from 'lucide-react';
import Button from '../../components/ui/Button';
import UserForm from '../../components/admin/UserForm';
import Modal from '../../components/ui/Modal';
import Toast from '../../components/ui/Toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import TableSkeleton from '../../components/skeletons/TableSkeleton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import ApprovalModal from '../../components/admin/ApprovalModal';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const isMobile = useMediaQuery('(max-width: 767px)');
    
    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (error) {
            setToast({ message: 'Failed to fetch users.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleAdd = () => {
        setCurrentUser(null);
        setIsUserFormOpen(true);
    };

    const handleEdit = (user: User) => {
        setCurrentUser(user);
        setIsUserFormOpen(true);
    };

    const handleApprove = (user: User) => {
        setCurrentUser(user);
        setIsApprovalModalOpen(true);
    };

    const handleDelete = (user: User) => {
        setCurrentUser(user);
        setIsDeleteModalOpen(true);
    };

    const handleSaveUser = async (data: any) => {
        setIsSaving(true);
        try {
            if (currentUser) {
                // Editing an existing user
                await api.updateUser(currentUser.id, data);
                setToast({ message: 'User updated successfully!', type: 'success' });
            } else {
                // Creating a new user profile (requires manual login creation)
                await api.createUser(data);
                setToast({ message: 'User profile created. Now create their login in Supabase Auth.', type: 'success' });
            }
            setIsUserFormOpen(false);
            fetchUsers();
        } catch (error: any) {
            setToast({ message: error.message || 'Failed to save user.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleConfirmApproval = async (userId: string, newRole: string) => {
        setIsSaving(true);
        try {
            await api.updateUser(userId, { role: newRole });
            setToast({ message: 'User approved successfully!', type: 'success' });
            setIsApprovalModalOpen(false);
            fetchUsers();
        } catch (error) {
            setToast({ message: 'Failed to approve user.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleConfirmDelete = async () => {
        if (currentUser) {
            setIsSaving(true);
            try {
                await api.deleteUser(currentUser.id);
                setToast({ message: 'User deleted. Remember to also remove them from Supabase Auth.', type: 'success' });
                setIsDeleteModalOpen(false);
                fetchUsers();
            } catch (error) {
                setToast({ message: 'Failed to delete user.', type: 'error' });
            } finally {
                setIsSaving(false);
            }
        }
    };

    const getRoleName = (role: string) => {
        return role ? role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';
    }

    return (
        <div className="p-4 md:bg-card md:p-6 md:rounded-xl md:shadow-card">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            
            <UserForm
                isOpen={isUserFormOpen}
                onClose={() => setIsUserFormOpen(false)}
                onSave={handleSaveUser}
                initialData={currentUser}
                isSaving={isSaving}
            />

            <ApprovalModal
                isOpen={isApprovalModalOpen}
                onClose={() => setIsApprovalModalOpen(false)}
                onApprove={handleConfirmApproval}
                user={currentUser}
                isConfirming={isSaving}
            />

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirm Deletion"
                isConfirming={isSaving}
            >
                Are you sure you want to delete the user "{currentUser?.name}"? This action cannot be undone.
            </Modal>
            
            <AdminPageHeader title="User Management">
                 <Button onClick={handleAdd}><Plus className="mr-2 h-4 w-4" /> Add User</Button>
            </AdminPageHeader>

             <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm">
                <div className="flex items-start">
                    <Info className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold">Important: Two-Step User Creation</h4>
                        <p className="mt-1">
                            To add a new user who can log in, you must complete both steps:
                        </p>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                            <li><strong>Add User Here:</strong> Use the "Add User" button to define the user's role and details within this application.</li>
                            <li><strong>Create Login in Supabase Auth:</strong> Go to your Supabase project's Authentication console and create a new user with the <strong>exact same email address</strong> and a password.</li>
                        </ol>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full responsive-table">
                    <thead>
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Role</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border md:bg-card md:divide-y-0">
                        {isLoading ? (
                            isMobile
                                ? <tr><td colSpan={4}><TableSkeleton rows={3} cols={4} isMobile /></td></tr>
                                : <TableSkeleton rows={5} cols={4} />
                        ) : users.map((user) => (
                            <tr key={user.id}>
                                <td data-label="Name" className="px-6 py-4 font-medium">{user.name}</td>
                                <td data-label="Email" className="px-6 py-4 text-sm text-muted">{user.email}</td>
                                <td data-label="Role" className="px-6 py-4 text-sm text-muted">
                                    <div className="flex items-center md:justify-start justify-end"><ShieldCheck className="h-4 w-4 mr-2 text-accent" />{getRoleName(user.role)}</div>
                                    {user.role === 'unverified' && (
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 ml-2">Pending Approval</span>
                                    )}
                                </td>
                                <td data-label="Actions" className="px-6 py-4">
                                    <div className="flex items-center gap-2 md:justify-start justify-end">
                                        {user.role === 'unverified' && (
                                            <Button variant="outline" size="sm" onClick={() => handleApprove(user)} aria-label={`Approve user ${user.name}`} title={`Approve user ${user.name}`}><UserCheck className="h-4 w-4 mr-2" />Approve</Button>
                                        )}
                                        <Button variant="icon" size="sm" onClick={() => handleEdit(user)} aria-label={`Edit user ${user.name}`} title={`Edit user ${user.name}`}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="icon" size="sm" onClick={() => handleDelete(user)} aria-label={`Delete user ${user.name}`} title={`Delete user ${user.name}`}><Trash2 className="h-4 w-4 text-red-600" /></Button>
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

export default UserManagement;
