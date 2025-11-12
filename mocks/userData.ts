// mocks/userData.ts

import type { User } from '../types';

export const mockUsers: User[] = [
  {
    id: 'user_admin_1',
    name: 'Paradigm Admin',
    email: 'admin@paradigmfms.com',
    role: 'admin',
  },
  {
    id: 'user_hr_1',
    name: 'Priya HR',
    email: 'hr@paradigmfms.com',
    role: 'hr',
    phone: '+91 9008885355',
    photoUrl: 'https://i.pravatar.cc/150?u=hr@paradigmfms.com',
  },
  {
    id: 'user_dev_1',
    name: 'Dev Team',
    email: 'dev@paradigmfms.com',
    role: 'developer',
    phone: '9876543212',
  },
  {
    id: 'user_ops_1',
    name: 'Rajesh Operations',
    email: 'ops@paradigmfms.com',
    role: 'operation_manager',
    phone: '9876543213',
    reportingManagerId: 'user_admin_1',
  },
  {
    id: 'user_site_1',
    name: 'Anjali Site Manager',
    email: 'site@paradigmfms.com',
    role: 'site_manager',
    organizationId: 'org_2', // Brigade Gateway
    organizationName: 'Brigade Gateway',
    phone: '9876543214',
    reportingManagerId: 'user_ops_1',
  },
  {
    id: 'user_fo_1',
    name: 'Field Officer Kumar',
    email: 'field@paradigmfms.com',
    role: 'field_officer',
    phone: '9876543215',
    reportingManagerId: 'user_site_1',
    photoUrl: 'https://i.pravatar.cc/150?u=field@paradigmfms.com',
  },
    {
    id: 'user_fo_2',
    name: 'Field Officer Singh',
    email: 'field2@paradigmfms.com',
    role: 'field_officer',
    phone: '9876543216',
    reportingManagerId: 'user_site_1',
    photoUrl: 'https://i.pravatar.cc/150?u=field2@paradigmfms.com',
  },
  {
    id: 'user_fo_3',
    name: 'Field Officer Patel',
    email: 'field3@paradigmfms.com',
    role: 'field_officer',
    phone: '9876543217',
    reportingManagerId: 'user_site_1',
    photoUrl: 'https://i.pravatar.cc/150?u=field3@paradigmfms.com',
  },
  {
    id: 'user_fo_4',
    name: 'Field Officer Joshi',
    email: 'field4@paradigmfms.com',
    role: 'field_officer',
    phone: '9876543218',
    reportingManagerId: 'user_site_1',
    photoUrl: 'https://i.pravatar.cc/150?u=field4@paradigmfms.com',
  },
];