import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePermissionsStore } from '../../store/permissionsStore';
import type { UserRole, Permission, AppModule, Role } from '../../types';
import { ShieldCheck, Check, X, Loader2, Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { api } from '../../services/api';
import RoleNameModal from '../../components/admin/RoleNameModal';
import Modal from '../../components/ui/Modal';
import Toast from '../../components/ui/Toast';
import TableSkeleton from '../../components/skeletons/TableSkeleton';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export const allPermissions: { key: Permission; name: string; description: string }[] = [...[
    { key: 'apply_for_leave', name: 'Apply for Leave', description: 'Allows users to request time off.' },
    { key: 'create_enrollment', name: 'Create Enrollment', description: 'Access the multi-step form to onboard new employees.' },
    { key: 'view_developer_settings', name: 'Developer Settings', description: 'Access API settings and other developer tools.' },
    { key: 'download_attendance_report', name: 'Download Attendance Report', description: 'Generate and download attendance reports in CSV format.' },
    { key: 'manage_approval_workflow', name: 'Manage Approval Workflow', description: 'Set up reporting managers for leave approvals.' },
    { key: 'manage_attendance_rules', name: 'Manage Attendance Rules', description: 'Set work hours, holidays, and leave allocations.' },
    { key: 'manage_enrollment_rules', name: 'Manage Enrollment Rules', description: 'Set rules for ESI/GMC, manpower limits, and documents.' },
    { key: 'manage_insurance', name: 'Manage Insurance', description: 'Create and manage company insurance plans.' },
    { key: 'manage_leave_requests', name: 'Manage Leave Requests', description: 'Approve or reject leave requests for employees.' },
    { key: 'manage_modules', name: 'Manage Modules', description: 'Create, edit, and group permissions into modules.' },
    { key: 'manage_policies', name: 'Manage Policies', description: 'Create and manage company policies.' },
    { key: 'manage_roles_and_permissions', name: 'Manage Roles & Permissions', description: 'Access this page to edit role permissions.' },
    { key: 'manage_sites', name: 'Manage Sites', description: 'Create, edit, and delete organizations/sites.' },
    { key: 'manage_tasks', name: 'Manage Tasks', description: 'Create, assign, and manage all organizational tasks, including escalations.' },
    { key: 'manage_uniforms', name: 'Manage Uniforms', description: 'Manage uniform requests and site configurations.' },
    { key: 'manage_users', name: 'Manage Users', description: 'Create, edit, and delete user accounts.' },
    { key: 'view_operations_dashboard', name: 'Operations Dashboard', description: 'View the operations management dashboard.' },
    { key: 'view_site_dashboard', name: 'Site Dashboard', description: 'View the dashboard for a specific site/organization.' },
    { key: 'view_all_attendance', name: 'View All Attendance', description: 'Allows users to see attendance records for all employees.' },
    { key: 'view_all_submissions', name: 'View All Submissions', description: 'Access the main dashboard to view all employee submissions.' },
    { key: 'view_entity_management', name: 'View Entity Management', description: 'Access the HR dashboard for managing company entities.' },
    { key: 'view_field_officer_tracking', name: 'View Field Officer Tracking', description: 'Track user check-in/out locations and activity on a map.' },
    { key: 'view_invoice_summary', name: 'View Invoice Summary', description: 'View and generate monthly invoices for sites.' },
    { key: 'view_own_attendance', name: 'View Own Attendance', description: 'Allows users to see their own attendance records.' },
    { key: 'view_verification_costing', name: 'View Verification Costing', description: 'Analyze costs associated with third-party document verifications.' },
] as const].sort((a,b) => a.name.localeCompare(b.name));

const RoleManagement: React.FC = () => {
    const { permissions, setRolePermissions, addRolePermissionEntry, removeRolePermissionEntry, renameRolePermissionEntry } = usePermissionsStore();
    const [roles, setRoles] = useState<Role[]>([]);
    const [modules, setModules] = useState<AppModule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentRole, setCurrentRole] = useState<Role | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery('(max-width: 767px)');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [fetchedRoles, fetchedModules] = await Promise.all([api.getRoles(), api.getModules()]);
                setRoles(fetchedRoles);
                setModules(fetchedModules.sort((a, b) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Failed to load data", error);
                setToast({ message: "Failed to load page data.", type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const handlePermissionChange = (role: UserRole, permission: Permission, checked: boolean) => {
        const currentPermissions = permissions[role] || [];
        const newPermissions = checked
            ? [...currentPermissions, permission]
            : currentPermissions.filter(p => p !== permission);
        setRolePermissions(role, newPermissions);
    };

    const handleSaveRoleName = async (newName: string) => {
        const newId = newName.toLowerCase().replace(/\s+/g, '_');

        if (isEditing && currentRole) {
            if (currentRole.id === 'admin') {
                setToast({ message: "The Admin role cannot be renamed.", type: 'error' });
                return;
            }
            if (roles.some(r => r.id === newId && r.id !== currentRole.id)) {
                setToast({ message: `A role with ID '${newId}' already exists.`, type: 'error' });
                return;
            }
            const updatedRoles = roles.map(r => r.id === currentRole.id ? { ...r, displayName: newName, id: newId } : r);
            await api.saveRoles(updatedRoles);
            setRoles(updatedRoles);
            renameRolePermissionEntry(currentRole.id, newId);
            setToast({ message: "Role renamed.", type: 'success' });
        } else {
             if (roles.some(r => r.id === newId)) {
                setToast({ message: `A role with ID '${newId}' already exists.`, type: 'error' });
                return;
            }
            const newRole: Role = { id: newId, displayName: newName };
            const updatedRoles = [...roles, newRole];
            await api.saveRoles(updatedRoles);
            setRoles(updatedRoles);
            addRolePermissionEntry(newRole);
            setToast({ message: "Role added successfully.", type: 'success' });
        }
    };
    
    const handleDeleteRole = async () => {
        if (!currentRole || currentRole.id === 'admin') {
             setToast({ message: "This role cannot be deleted.", type: 'error' });
            setIsDeleteModalOpen(false);
            return;
        }
        const updatedRoles = roles.filter(r => r.id !== currentRole.id);
        await api.saveRoles(updatedRoles);
        setRoles(updatedRoles);
        removeRolePermissionEntry(currentRole.id);
        setToast({ message: `Role '${currentRole.displayName}' deleted.`, type: 'success' });
        setIsDeleteModalOpen(false);
    };

    const allPermissionDetailsMap = useMemo(() => new Map(allPermissions.map(p => [p.key, p])), []);
    const unassignedPermissions = useMemo(() => {
        const assigned = new Set(modules.flatMap(m => m.permissions));
        return allPermissions.filter(p => !assigned.has(p.key));
    }, [modules]);
    
    const renderPermissionRow = (permInfo: { key: Permission; name: string; description: string; }) => (
        <tr key={permInfo.key}>
            <td data-label="Permission" className="px-4 py-4">
                <div className="flex flex-col items-end text-right md:items-start md:text-left">
                    <div className="font-semibold text-primary-text">{permInfo.name}</div>
                    <div className="text-xs text-muted">{permInfo.description}</div>
                </div>
            </td>
            {roles.map(role => {
                const isChecked = permissions[role.id]?.includes(permInfo.key);
                const isDisabled = role.id === 'admin';
                const title = isDisabled ? "Admin role has all permissions by default and cannot be changed." : "";
                return (
                    <td key={role.id} data-label={role.displayName} className="px-4 py-4 text-center align-middle">
                        <div className="flex justify-center">
                            <label className={`relative flex items-center justify-center w-5 h-5 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input type="checkbox" className="sr-only peer" checked={isChecked} onChange={(e) => handlePermissionChange(role.id, permInfo.key, e.target.checked)} disabled={isDisabled} title={title} />
                                <span className={`w-5 h-5 bg-white border border-gray-300 rounded flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-accent-dark peer-checked:border-accent ${isDisabled ? 'opacity-50' : ''}`}>
                                    {isChecked ? <Check className="w-4 h-4 text-accent" /> : <X className="w-4 h-4 text-red-500" />}
                                </span>
                            </label>
                        </div>
                    </td>
                );
            })}
        </tr>
    );

    return (
        <div className="p-4 md:bg-card md:p-6 md:rounded-xl md:shadow-card">
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            <RoleNameModal
                isOpen={isNameModalOpen}
                onClose={() => setIsNameModalOpen(false)}
                onSave={handleSaveRoleName}
                title={isEditing ? 'Rename Role' : 'Add New Role'}
                initialName={isEditing ? currentRole?.displayName : ''}
            />
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteRole}
                title="Confirm Deletion"
            >
                Are you sure you want to delete the role "{currentRole?.displayName}"? This action cannot be undone.
            </Modal>

            <AdminPageHeader title="Role & Permission Management">
                <button onClick={() => { setIsEditing(false); setCurrentRole(null); setIsNameModalOpen(true); }} className="btn btn-primary btn-md">
                    <Plus className="mr-2 h-4 w-4" /> Add Role
                </button>
            </AdminPageHeader>
            <p className="text-muted text-sm -mt-4 mb-6">
                Assign permissions to user roles. Changes are saved automatically.
            </p>
            
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm responsive-table">
                    <thead className="bg-page">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left font-bold text-primary-text">Permission</th>
                            {roles.map(role => (
                                <th key={role.id} scope="col" className="px-4 py-3 text-center font-bold text-primary-text w-40">
                                    <div className="flex items-center justify-center gap-1">
                                        <span>{role.displayName}</span>
                                        {role.id !== 'admin' && (
                                            <div className="relative">
                                                <button onClick={() => setActiveDropdown(role.id === activeDropdown ? null : role.id)}>
                                                    <MoreVertical className="h-4 w-4 text-muted" />
                                                </button>
                                                {activeDropdown === role.id && (
                                                    <div ref={dropdownRef} className="absolute right-0 mt-2 w-32 bg-card border rounded-md shadow-lg z-10">
                                                        <button onClick={() => { setIsEditing(true); setCurrentRole(role); setIsNameModalOpen(true); setActiveDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-page flex items-center"><Edit className="mr-2 h-4 w-4"/>Rename</button>
                                                        <button onClick={() => { setCurrentRole(role); setIsDeleteModalOpen(true); setActiveDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-page flex items-center text-red-600"><Trash2 className="mr-2 h-4 w-4"/>Delete</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    {isLoading ? (
                        <tbody>
                            {isMobile
                                ? <tr><td colSpan={roles.length + 1 || 2}><TableSkeleton rows={3} cols={2} isMobile /></td></tr>
                                : <TableSkeleton rows={10} cols={roles.length + 1 || 5} />
                            }
                        </tbody>
                    ) : (
                        <>
                            {modules.map(module => (
                                <tbody key={module.id} className="divide-y divide-border">
                                    <tr className="bg-page/50">
                                      <td colSpan={roles.length + 1} className="p-2 font-bold text-primary-text">{module.name}</td>
                                    </tr>
                                    {module.permissions.map(permKey => {
                                      const permInfo = allPermissionDetailsMap.get(permKey);
                                      return permInfo ? renderPermissionRow(permInfo) : null;
                                    })}
                                </tbody>
                              ))}
                              {unassignedPermissions.length > 0 && (
                                <tbody className="divide-y divide-border">
                                    <tr className="bg-page/50">
                                      <td colSpan={roles.length + 1} className="p-2 font-bold text-primary-text">Uncategorized</td>
                                    </tr>
                                    {unassignedPermissions.map(renderPermissionRow)}
                                </tbody>
                              )}
                        </>
                    )}
                </table>
            </div>
        </div>
    );
};

export default RoleManagement;