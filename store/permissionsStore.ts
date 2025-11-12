


import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserRole, Permission, Role } from '../types';
import { api } from '../services/api';

interface PermissionsState {
  permissions: Record<UserRole, Permission[]>;
  setRolePermissions: (role: UserRole, permissions: Permission[]) => void;
  initRoles: (roles: Role[]) => void;
  addRolePermissionEntry: (role: Role) => void;
  removeRolePermissionEntry: (roleId: string) => void;
  renameRolePermissionEntry: (oldId: string, newId: string) => void;
}

const defaultPermissions: Record<UserRole, Permission[]> = {
  admin: [
    'view_all_submissions', 'manage_users', 'manage_sites', 'view_entity_management',
    'view_developer_settings', 'view_operations_dashboard', 'view_site_dashboard',
    'create_enrollment', 'manage_roles_and_permissions', 'manage_attendance_rules',
    'view_all_attendance', 'view_own_attendance', 'apply_for_leave', 'manage_leave_requests',
    'manage_approval_workflow', 'download_attendance_report', 'manage_tasks',
    'manage_policies', 'manage_insurance', 'manage_enrollment_rules',
    'manage_uniforms', 'view_invoice_summary', 'view_verification_costing',
    'view_field_officer_tracking', 'manage_modules', 'access_support_desk',
  ],
  hr: [
    'view_all_submissions', 'manage_users', 'manage_sites', 'view_entity_management',
    'manage_attendance_rules', 'view_all_attendance', 'view_own_attendance',
    'apply_for_leave', 'manage_leave_requests', 'download_attendance_report',
    'manage_policies', 'manage_insurance', 'manage_enrollment_rules',
    'manage_uniforms', 'view_invoice_summary', 'view_verification_costing', 'access_support_desk',
  ],
  finance: [
    'view_invoice_summary', 
    'view_verification_costing', 
    'view_own_attendance', 
    'apply_for_leave'
  ],
  developer: ['view_developer_settings'],
  operation_manager: ['view_operations_dashboard', 'view_all_attendance', 'apply_for_leave', 'manage_leave_requests', 'manage_tasks', 'access_support_desk'],
  site_manager: ['view_site_dashboard', 'create_enrollment', 'view_own_attendance', 'apply_for_leave', 'access_support_desk'],
  field_officer: ['create_enrollment', 'view_own_attendance', 'apply_for_leave', 'access_support_desk'],
};

export const usePermissionsStore = create(
  persist<PermissionsState>(
    (set, get) => ({
      permissions: defaultPermissions,
      
      initRoles: (roles) => {
        if (!roles) return;
        const currentPermissions = get().permissions;
        const newPermissions = { ...currentPermissions };
        let hasChanged = false;

        roles.forEach(role => {
          if (!newPermissions[role.id]) {
            newPermissions[role.id] = [];
            hasChanged = true;
          }
        });

        if (hasChanged) {
          set({ permissions: newPermissions });
        }
      },

      addRolePermissionEntry: (role) => {
        set((state) => ({
          permissions: {
            ...state.permissions,
            [role.id]: [],
          },
        }));
      },

      removeRolePermissionEntry: (roleId) => {
        set((state) => {
          const newPermissions = { ...state.permissions };
          delete newPermissions[roleId];
          return { permissions: newPermissions };
        });
      },

      renameRolePermissionEntry: (oldId, newId) => {
        set((state) => {
            const newPermissions = { ...state.permissions };
            if (newPermissions[oldId]) {
                newPermissions[newId] = newPermissions[oldId];
                delete newPermissions[oldId];
            }
            return { permissions: newPermissions };
        });
      },

      setRolePermissions: (role, newPermissions) => {
        set((state) => ({
          permissions: {
            ...state.permissions,
            [role]: newPermissions,
          },
        }));
      },
    }),
    {
      name: 'paradigm_app_permissions',
      storage: createJSONStorage(() => localStorage),
    }
  )
);