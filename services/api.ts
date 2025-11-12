import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseAnonKey } from './supabase';
import type { 
  OnboardingData, User, Organization, OrganizationGroup, AttendanceEvent, AttendanceSettings, Holiday,
  LeaveBalance, LeaveRequest, Task, Notification, SiteConfiguration, Entity, Policy, Insurance,
  ManpowerDetail, BackOfficeIdSeries, SiteStaffDesignation, Asset, MasterTool, MasterToolsList,
  SiteGentsUniformConfig, MasterGentsUniforms, SiteLadiesUniformConfig, MasterLadiesUniforms, UniformRequest,
  SiteUniformDetailsConfig, EnrollmentRules, InvoiceData, UserRole, UploadedFile, SalaryChangeRequest, SiteStaff,
  SubmissionCostBreakdown, AppModule, Role, SupportTicket, TicketPost, TicketComment, VerificationResult, CompOffLog,
  ExtraWorkLog, PerfiosVerificationData, HolidayListItem, UniformRequestItem
} from '../types';
// FIX: Add 'startOfMonth' and 'endOfMonth' to date-fns import to resolve errors.
import { differenceInCalendarDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { GoogleGenAI, Type, Modality } from '@google/genai';

const ONBOARDING_DOCS_BUCKET = 'onboarding-documents';
const AVATAR_BUCKET = 'avatars';
const SUPPORT_ATTACHMENTS_BUCKET = 'support-attachments';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});


// --- Helper Functions ---

const processUrlsForDisplay = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(processUrlsForDisplay);

    const newObj = { ...obj };
    // Check if the object looks like our UploadedFile structure with a path
    if (typeof newObj.name === 'string' && typeof newObj.path === 'string') {
        const bucket = newObj.path.startsWith('avatars/') ? AVATAR_BUCKET : ONBOARDING_DOCS_BUCKET;
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(newObj.path);
        newObj.preview = publicUrl;
        newObj.url = publicUrl;
    }

    // Recursively process nested objects
    for (const key in newObj) {
        newObj[key] = processUrlsForDisplay(newObj[key]);
    }
    return newObj;
};

const processFilesForUpload = async (obj: any, userId: string, submissionId: string): Promise<any> => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return Promise.all(obj.map(item => processFilesForUpload(item, userId, submissionId)));
    }

    const newObj = { ...obj };
    // If it's a file object from an input, upload it
    if (newObj.file instanceof File) {
        const file = newObj.file as File;
        const filePath = `${userId}/${submissionId}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage.from(ONBOARDING_DOCS_BUCKET).upload(filePath, file);
        if (uploadError) throw uploadError;
        
        return { name: newObj.name, type: newObj.type, size: newObj.size, path: filePath };
    } else if (typeof newObj.name === 'string' && newObj.path) {
        return { name: newObj.name, type: newObj.type, size: newObj.size, path: newObj.path };
    }

    for (const key in newObj) {
        newObj[key] = await processFilesForUpload(newObj[key], userId, submissionId);
    }
    return newObj;
};

const dataUrlToBlob = async (dataUrl: string) => {
    const res = await fetch(dataUrl);
    return await res.blob();
};

const toSnakeCase = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => toSnakeCase(item));
    }
    if (data !== null && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File)) {
        const snaked: Record<string, any> = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                snaked[snakeKey] = toSnakeCase(data[key]);
            }
        }
        return snaked;
    }
    return data;
};

const toCamelCase = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => toCamelCase(item));
    }
    if (data !== null && typeof data === 'object' && !(data instanceof Date)) {
        const camelCased: Record<string, any> = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
                camelCased[camelKey] = toCamelCase(data[key]);
            }
        }
        return processUrlsForDisplay(camelCased);
    }
    return data;
};

export const api = {
  // --- Initial Data Loading ---
  getInitialAppData: async (): Promise<{ settings: any; roles: Role[]; holidays: Holiday[] }> => {
    const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'singleton')
        .single();
    if (settingsError) throw new Error('Failed to fetch core application settings.');

    const { data: rolesData, error: rolesError } = await supabase.from('roles').select('*');
    if (rolesError) throw new Error('Failed to fetch user roles.');
    
    const { data: holidaysData, error: holidaysError } = await supabase.from('holidays').select('*');
    if (holidaysError) throw new Error('Failed to fetch holidays.');

    return {
        settings: toCamelCase(settingsData),
        roles: (rolesData || []).map(toCamelCase),
        holidays: (holidaysData || []).map(toCamelCase),
    };
  },

  // --- Onboarding & Verification ---
  getVerificationSubmissions: async (status?: string, organizationId?: string): Promise<OnboardingData[]> => {
    let query = supabase.from('onboarding_submissions').select('*');
    if (status) query = query.eq('status', status);
    if (organizationId) query = query.eq('organization_id', organizationId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamelCase);
  },

  getOnboardingDataById: async (id: string): Promise<OnboardingData | null> => {
      const { data, error } = await supabase.from('onboarding_submissions').select('*').eq('id', id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? toCamelCase(data) : null;
  },

  _saveSubmission: async (data: OnboardingData, asDraft: boolean): Promise<{ draftId: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("User not authenticated");

    const submissionId = (data.id && !data.id.startsWith('draft_')) ? data.id : crypto.randomUUID();
    const dataWithPaths = await processFilesForUpload(data, session.user.id, submissionId);
    
    const dbData = {
        ...toSnakeCase(dataWithPaths),
        id: submissionId,
        user_id: session.user.id,
        status: asDraft ? 'draft' : data.status,
    };
    
    delete dbData.file;
    delete dbData.confirm_account_number; 

    const { data: savedData, error } = await supabase.from('onboarding_submissions').upsert(dbData, { onConflict: 'id' }).select('id').single();
    if (error) throw error;
    return { draftId: savedData.id };
  },

  saveDraft: async (data: OnboardingData) => api._saveSubmission(data, true),
  
  submitOnboarding: async (data: OnboardingData) => {
      const { draftId } = await api._saveSubmission(data, false);
      const submittedData = await api.getOnboardingDataById(draftId);
      if (!submittedData) throw new Error("Failed to retrieve submitted data.");
      return submittedData;
  },

  updateOnboarding: async (data: OnboardingData) => {
      const { draftId } = await api._saveSubmission(data, data.status === 'draft');
      const updatedData = await api.getOnboardingDataById(draftId);
      if (!updatedData) throw new Error("Failed to retrieve updated data.");
      return updatedData;
  },

  verifySubmission: async (id: string): Promise<void> => {
      const { error } = await supabase.from('onboarding_submissions').update({ status: 'verified', portal_sync_status: 'pending_sync' }).eq('id', id);
      if (error) throw error;
  },

  requestChanges: async (id: string, reason: string): Promise<void> => {
      const { error } = await supabase.from('onboarding_submissions').update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
  },

  syncPortals: async (id: string): Promise<OnboardingData> => {
      const { data, error } = await supabase.functions.invoke('sync-portals', { body: { submissionId: id } });
      if (error) throw error;
      return toCamelCase(data);
  },
  
  deleteFile: async (filePath: string): Promise<void> => {
    const { error } = await supabase.storage.from(ONBOARDING_DOCS_BUCKET).remove([filePath]);
    if (error) throw error;
  },
  
  uploadDocument: async (file: File): Promise<{ url: string; path: string; }> => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'anonymous_user';
    const filePath = `${userId}/documents/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from(ONBOARDING_DOCS_BUCKET).upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(ONBOARDING_DOCS_BUCKET).getPublicUrl(filePath);
    if (!data.publicUrl) throw new Error('Could not get public URL for uploaded file.');
    return { url: data.publicUrl, path: filePath };
  },
  
  // --- Users & Orgs ---
  getUsers: async (): Promise<User[]> => {
      const { data, error } = await supabase.from('users').select('*, role_id');
      if (error) throw error;
      return (data || []).map(u => toCamelCase({ ...u, role: u.role_id }));
  },
  getUsersWithManagers: async (): Promise<(User & { managerName?: string })[]> => {
    const { data: users, error } = await supabase.from('users').select('*, reporting_manager_id, role_id');
    if (error) throw error;
    const camelUsers = (users || []).map(u => toCamelCase({ ...u, role: u.role_id }));
    const userMap = new Map(camelUsers.map(u => [u.id, u.name]));
    return camelUsers.map(u => ({ ...u, managerName: u.reportingManagerId ? userMap.get(u.reportingManagerId) : undefined }));
  },
  getFieldOfficers: async () => api.getUsers().then(users => users.filter(u => u.role === 'field_officer')),
  getNearbyUsers: async () => api.getUsers().then(users => users.filter(u => ['hr', 'operation_manager', 'admin', 'developer'].includes(u.role))),
  
  updateUser: async (id: string, updates: Partial<User>) => {
      const { role, ...rest } = updates;
      const dbUpdates: any = toSnakeCase(rest);
      if (role) dbUpdates.role_id = role;
      
      if ('photo_url' in dbUpdates) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) throw new Error("User not authenticated for photo upload");
          const userId = session.user.id;

          const { data: currentUserData } = await supabase.from('users').select('photo_url').eq('id', id).single();
          const oldPhotoUrl = currentUserData?.photo_url;
  
          const deleteOldAvatar = async (oldUrl: string | null | undefined) => {
              if (!oldUrl) return;
              try {
                  const urlObject = new URL(oldUrl);
                  const pathWithBucket = urlObject.pathname.split('/public/')[1];
                  if (pathWithBucket) {
                      const [bucketName, ...pathParts] = pathWithBucket.split('/');
                      const oldPath = pathParts.join('/');
                      if (oldPath) await supabase.storage.from(bucketName).remove([oldPath]);
                  }
              } catch (e) {
                  console.error("Failed to process old avatar URL for deletion:", e);
              }
          };

          if (dbUpdates.photo_url && dbUpdates.photo_url.startsWith('data:')) {
              await deleteOldAvatar(oldPhotoUrl);
              const blob = await dataUrlToBlob(dbUpdates.photo_url);
              const fileExt = dbUpdates.photo_url.split(';')[0].split('/')[1] || 'jpg';
              const filePath = `${userId}/${Date.now()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, blob, { upsert: false });
              if (uploadError) throw uploadError;
              const { data: { publicUrl } } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
              dbUpdates.photo_url = publicUrl;
          } else if (dbUpdates.photo_url === null) {
              await deleteOldAvatar(oldPhotoUrl);
          }
      }
  
      const { data, error } = await supabase.from('users').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return toCamelCase({ ...data, role: data.role_id });
  },

  createUser: async (userData: Partial<User>): Promise<User> => {
    const { role, ...rest } = userData;
    const dbData: any = toSnakeCase(rest);
    if (role) dbData.role_id = role;

    const { data, error } = await supabase.from('users').insert(dbData).select().single();
    if (error) throw error;
    return toCamelCase({ ...data, role: data.role_id });
  },

  deleteUser: async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
  },

  updateUserReportingManager: async (userId: string, managerId: string | null) => {
      const { error } = await supabase.from('users').update({ reporting_manager_id: managerId }).eq('id', userId);
      if (error) throw error;
  },
  
  getOrganizations: async (): Promise<Organization[]> => {
      const { data, error } = await supabase.from('organizations').select('*').order('short_name');
      if (error) throw error;
      return (data || []).map(toCamelCase);
  },
  createOrganization: async (org: Organization): Promise<Organization> => {
      const { data, error } = await supabase.from('organizations').insert(toSnakeCase(org)).select().single();
      if (error) throw error;
      return toCamelCase(data);
  },
  getOrganizationStructure: async (): Promise<OrganizationGroup[]> => {
      const { data: groups, error: groupsError } = await supabase.from('organization_groups').select('*');
      if (groupsError) throw groupsError;
      const { data: companies, error: companiesError } = await supabase.from('companies').select('*');
      if (companiesError) throw companiesError;
      const { data: entities, error: entitiesError } = await supabase.from('entities').select('*');
      if (entitiesError) throw entitiesError;

      const camelGroups: any[] = (groups || []).map(toCamelCase);
      const camelCompanies: any[] = (companies || []).map(toCamelCase);
      const camelEntities: any[] = (entities || []).map(toCamelCase);

      const companyMap = new Map<string, any[]>();
      camelCompanies.forEach(company => {
        const companyWithEntities = { ...company, entities: camelEntities.filter(e => e.companyId === company.id) };
        if (!companyMap.has(company.groupId)) companyMap.set(company.groupId, []);
        companyMap.get(company.groupId)!.push(companyWithEntities);
      });

      return camelGroups.map(group => ({ ...group, companies: companyMap.get(group.id) || [], locations: [] }));
  },
  getSiteConfigurations: async (): Promise<SiteConfiguration[]> => {
    const { data, error } = await supabase.from('site_configurations').select('*');
    if (error) throw error;
    return (data || []).map(toCamelCase);
  },
  bulkUploadOrganizations: async(orgs: Organization[]): Promise<{ count: number }> => {
    const { count, error } = await supabase.from('organizations').upsert(toSnakeCase(orgs), { onConflict: 'id' });
    if (error) throw error;
    return { count: count || 0 };
  },
  getModules: async (): Promise<AppModule[]> => {
      const { data, error } = await supabase.from('app_modules').select('*');
      if (error) throw error;
      return (data || []).map(toCamelCase);
  },
  saveModules: async (modules: AppModule[]): Promise<void> => {
    // A full replacement is complex, upsert is simplest for now.
    const { error } = await supabase.from('app_modules').upsert(toSnakeCase(modules));
    if (error) throw error;
  },
  getRoles: async (): Promise<Role[]> => {
      const { data, error } = await supabase.from('roles').select('*');
      if (error) throw error;
      return (data || []).map(toCamelCase);
  },
  saveRoles: async (roles: Role[]): Promise<void> => {
    const { error } = await supabase.from('roles').upsert(toSnakeCase(roles));
    if (error) throw error;
  },
  getHolidays: async (): Promise<Holiday[]> => {
    const { data, error } = await supabase.from('holidays').select('*');
    if (error) throw error;
    return (data || []).map(toCamelCase);
  },
  addHoliday: async (holiday: Omit<Holiday, 'id'>): Promise<Holiday> => {
    const { data, error } = await supabase.from('holidays').insert(toSnakeCase(holiday)).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },
  removeHoliday: async (id: string): Promise<void> => {
    const { error } = await supabase.from('holidays').delete().eq('id', id);
    if (error) throw error;
  },
  getAttendanceEvents: async (userId: string, start: string, end: string): Promise<AttendanceEvent[]> => {
    const { data, error } = await supabase.from('attendance_events').select('*').eq('user_id', userId).gte('timestamp', start).lte('timestamp', end);
    if (error) throw error;
    return (data || []).map(toCamelCase);
  },
  getAllAttendanceEvents: async(start: string, end: string): Promise<AttendanceEvent[]> => {
      const { data, error } = await supabase.from('attendance_events').select('*').gte('timestamp', start).lte('timestamp', end);
      if (error) throw error;
      return (data || []).map(toCamelCase);
  },
  getAttendanceDashboardData: async (startDate: Date, endDate: Date, currentDate: Date) => {
      const { data, error } = await supabase.rpc('get_attendance_dashboard_data', {
          start_date_iso: format(startDate, 'yyyy-MM-dd'),
          end_date_iso: format(endDate, 'yyyy-MM-dd'),
          current_date_iso: format(currentDate, 'yyyy-MM-dd')
      });
      if (error) throw new Error('Could not load attendance dashboard data from the database function.');
      return data;
  },
  addAttendanceEvent: async (event: Omit<AttendanceEvent, 'id'>): Promise<void> => {
    const { error } = await supabase.from('attendance_events').insert(toSnakeCase(event));
    if (error) throw error;
  },
  getAttendanceSettings: async (): Promise<AttendanceSettings> => {
      const { data, error } = await supabase.from('settings').select('attendance_settings').eq('id', 'singleton').single();
      if (error) throw error;
      if (!data?.attendance_settings) throw new Error('Attendance settings are not configured.');
      return toCamelCase(data.attendance_settings) as AttendanceSettings;
  },
  saveAttendanceSettings: async (settings: AttendanceSettings): Promise<void> => {
      const { error } = await supabase.from('settings').upsert({ id: 'singleton', attendance_settings: toSnakeCase(settings) }, { onConflict: 'id' });
      if (error) throw error;
  },
  createAssignment: async (officerId: string, siteId: string, date: string): Promise<void> => {
    const site = (await api.getOrganizations()).find(o => o.id === siteId);
    await api.createTask({
        name: `Visit ${site?.shortName || 'site'} for verification`,
        description: `Perform on-site duties and verification tasks for ${site?.shortName}.`,
        dueDate: date,
        priority: 'Medium',
        assignedToId: officerId,
    });
  },
  getLeaveBalancesForUser: async (userId: string): Promise<LeaveBalance> => {
    const getStaffType = (role: UserRole): 'office' | 'field' => (['hr', 'admin', 'finance'].includes(role) ? 'office' : 'field');
    const { data: settingsData, error: settingsError } = await supabase.from('settings').select('attendance_settings').eq('id', 'singleton').single();
    if (settingsError || !settingsData?.attendance_settings) throw new Error('Could not load attendance rules.');
    const { data: userData, error: userError } = await supabase.from('users').select('role_id').eq('id', userId).single();
    if (userError) throw userError;

    const staffType = getStaffType(userData.role_id);
    const rules = (toCamelCase(settingsData.attendance_settings) as AttendanceSettings)[staffType];

    const [
        { data: approvedLeaves, error: leavesError },
        { data: compOffData, error: compOffError },
        { data: otData, error: otError }
    ] = await Promise.all([
        supabase.from('leave_requests').select('leave_type, start_date, end_date, day_option').eq('user_id', userId).eq('status', 'approved'),
        supabase.from('comp_off_logs').select('*').eq('user_id', userId),
        supabase.from('extra_work_logs').select('hours_worked').eq('user_id', userId).eq('claim_type', 'OT').eq('status', 'Approved').gte('work_date', format(startOfMonth(new Date()), 'yyyy-MM-dd')).lte('work_date', format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    ]);
    
    if (leavesError || compOffError || otError) throw new Error("Failed to fetch all leave balance data.");

    const balance: LeaveBalance = {
        userId,
        earnedTotal: rules.annualEarnedLeaves || 0, earnedUsed: 0,
        sickTotal: rules.annualSickLeaves || 0, sickUsed: 0,
        floatingTotal: (rules.monthlyFloatingLeaves || 0) * 12, floatingUsed: 0,
        compOffTotal: (compOffData || []).length, compOffUsed: (compOffData || []).filter(log => log.status === 'used').length,
        otHoursThisMonth: (otData || []).reduce((sum, log) => sum + (log.hours_worked || 0), 0),
    };

    (approvedLeaves || []).forEach(leave => {
        const leaveAmount = leave.day_option === 'half' ? 0.5 : differenceInCalendarDays(new Date(leave.end_date), new Date(leave.start_date)) + 1;
        if (leave.leave_type === 'Earned') balance.earnedUsed += leaveAmount;
        if (leave.leave_type === 'Sick') balance.sickUsed += leaveAmount;
        if (leave.leave_type === 'Floating') balance.floatingUsed += leaveAmount;
    });

    return balance;
  },
  submitLeaveRequest: async(data: Omit<LeaveRequest, 'id' | 'status' | 'currentApproverId' | 'approvalHistory'>): Promise<LeaveRequest> => {
    const { data: userProfile, error: userError } = await supabase.from('users').select('reporting_manager_id').eq('id', data.userId).single();
    if (userError) throw userError;
    const { data: insertedData, error: insertError } = await supabase.from('leave_requests').insert({ ...toSnakeCase(data), status: 'pending_manager_approval', current_approver_id: userProfile.reporting_manager_id || null, approval_history: [] }).select('*').single();
    if (insertError) throw insertError;
    return toCamelCase(insertedData);
  },
  getLeaveRequests: async (filter?: { userId?: string, userIds?: string[], status?: string, forApproverId?: string, startDate?: string, endDate?: string }): Promise<LeaveRequest[]> => {
      let query = supabase.from('leave_requests').select('*');
      if (filter?.userId) query = query.eq('user_id', filter.userId);
      if (filter?.userIds) query = query.in('user_id', filter.userIds);
      if (filter?.status) query = query.eq('status', filter.status);
      if (filter?.forApproverId) query = query.eq('current_approver_id', filter.forApproverId);
      if (filter?.startDate && filter?.endDate) {
          query = query.lte('start_date', filter.endDate).gte('end_date', filter.startDate);
      }
      const { data, error } = await query.order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []).map(toCamelCase);
  },
  getTasks: async (): Promise<Task[]> => {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(toCamelCase);
  },
  createTask: async (taskData: Partial<Task>): Promise<Task> => {
    const { data, error } = await supabase.from('tasks').insert(toSnakeCase({ ...taskData, status: 'To Do', escalationStatus: 'None' })).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },
  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const { data, error } = await supabase.from('tasks').update(toSnakeCase(updates)).eq('id', id).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },
  deleteTask: async (id: string): Promise<void> => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },
  runAutomaticEscalations: async(): Promise<{ updatedTasks: Task[], newNotifications: Notification[] }> => {
    const { data, error } = await supabase.functions.invoke('run-escalations');
    if(error) throw error;
    return toCamelCase(data);
  },
  getNotifications: async(userId: string): Promise<Notification[]> => {
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(toCamelCase);
  },
  createNotification: async(data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> => {
    const { data: inserted, error } = await supabase.from('notifications').insert(toSnakeCase(data)).select().single();
    if (error) throw error;
    return toCamelCase(inserted);
  },
  markNotificationAsRead: async(id: string): Promise<void> => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },
  markAllNotificationsAsRead: async(userId: string): Promise<void> => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  },
  getPolicies: async(): Promise<Policy[]> => {
      const { data, error } = await supabase.from('policies').select('*');
      if (error) throw error;
      return (data || []).map(toCamelCase);
  },
  createPolicy: async(data: Omit<Policy, 'id'>): Promise<Policy> => {
    const { data: inserted, error } = await supabase.from('policies').insert(toSnakeCase(data)).select().single();
    if (error) throw error;
    return toCamelCase(inserted);
  },
  getInsurances: async(): Promise<Insurance[]> => {
      const { data, error } = await supabase.from('insurances').select('*');
      if (error) throw error;
      return (data || []).map(toCamelCase);
  },
  createInsurance: async(data: Omit<Insurance, 'id'>): Promise<Insurance> => {
    const { data: inserted, error } = await supabase.from('insurances').insert(toSnakeCase(data)).select().single();
    if (error) throw error;
    return toCamelCase(inserted);
  },
  getApprovalWorkflowSettings: async(): Promise<{finalConfirmationRole: UserRole}> => {
    const { data, error } = await supabase.from('settings').select('approval_workflow_settings').eq('id', 'singleton').single();
    if (error) throw error;
    if (!data?.approval_workflow_settings) throw new Error('Approval workflow settings are not configured.');
    return toCamelCase(data.approval_workflow_settings);
  },
  updateApprovalWorkflowSettings: async(role: UserRole): Promise<void> => {
    const { error } = await supabase.from('settings').update({ approval_workflow_settings: toSnakeCase({ finalConfirmationRole: role }) }).eq('id', 'singleton');
    if (error) throw error;
  },
  approveLeaveRequest: async (id: string, approverId: string): Promise<void> => {
    const { data: request, error: fetchError } = await supabase.from('leave_requests').select('approval_history').eq('id', id).single();
    if (fetchError) throw fetchError;
    const { finalConfirmationRole } = await api.getApprovalWorkflowSettings();
    const { data: finalApprover } = await supabase.from('users').select('id').eq('role_id', finalConfirmationRole).limit(1).single();
    const { data: approverData, error: nameError } = await supabase.from('users').select('name').eq('id', approverId).single();
    if (nameError) throw nameError;
    const newHistoryRecord = { approver_id: approverId, approver_name: approverData.name, status: 'approved', timestamp: new Date().toISOString() };
    const updatedHistory = [...((request.approval_history as any[]) || []), newHistoryRecord];
    const { error } = await supabase.from('leave_requests').update({ status: 'pending_hr_confirmation', current_approver_id: finalApprover?.id, approval_history: updatedHistory }).eq('id', id);
    if (error) throw error;
  },
  rejectLeaveRequest: async(id: string, approverId: string, reason = ''): Promise<void> => {
    const { data: request, error: fetchError } = await supabase.from('leave_requests').select('approval_history').eq('id', id).single();
    if (fetchError) throw fetchError;
    const { data: approverData, error: nameError } = await supabase.from('users').select('name').eq('id', approverId).single();
    if (nameError) throw nameError;
    const newHistoryRecord = { approver_id: approverId, approver_name: approverData.name, status: 'rejected', timestamp: new Date().toISOString(), comments: reason };
    const updatedHistory = [...((request.approval_history as any[]) || []), newHistoryRecord];
    const { error } = await supabase.from('leave_requests').update({ status: 'rejected', current_approver_id: null, approval_history: updatedHistory }).eq('id', id);
    if (error) throw error;
  },
  confirmLeaveByHR: async(id: string, hrId: string): Promise<void> => {
      const { data: request, error: fetchError } = await supabase.from('leave_requests').select('leave_type, user_id, approval_history').eq('id', id).single();
      if (fetchError) throw fetchError;
      const { data: approverData, error: nameError } = await supabase.from('users').select('name').eq('id', hrId).single();
      if (nameError) throw nameError;
      const newHistoryRecord = { approver_id: hrId, approver_name: approverData.name, status: 'approved', timestamp: new Date().toISOString(), comments: 'Final approval.' };
      const updatedHistory = [...((request.approval_history as any[]) || []), newHistoryRecord];
      const { error } = await supabase.from('leave_requests').update({ status: 'approved', current_approver_id: null, approval_history: updatedHistory }).eq('id', id);
      if (error) throw error;
      if (request.leave_type === 'Comp Off') {
          const { data: availableLog, error: logError } = await supabase.from('comp_off_logs').select('id').eq('user_id', request.user_id).eq('status', 'earned').limit(1).single();
          if (logError && logError.code !== 'PGRST116') throw logError;
          if (availableLog) await supabase.from('comp_off_logs').update({ status: 'used', leave_request_id: id }).eq('id', availableLog.id);
      }
  },
  submitExtraWorkClaim: async (claimData: Omit<ExtraWorkLog, 'id' | 'createdAt' | 'status'>): Promise<void> => {
    const { error } = await supabase.from('extra_work_logs').insert(toSnakeCase({ ...claimData, status: 'Pending' }));
    if (error) throw error;
  },
  getExtraWorkLogs: async (userId?: string): Promise<ExtraWorkLog[]> => {
    let query = supabase.from('extra_work_logs').select('*');
    if (userId) query = query.eq('user_id', userId);
    else query = query.eq('status', 'Pending');
    const { data, error } = await query.order('work_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamelCase);
  },
  approveExtraWorkClaim: async (claimId: string, approverId: string): Promise<void> => {
    const { data: approverData, error: nameError } = await supabase.from('users').select('name').eq('id', approverId).single();
    if (nameError) throw nameError;
    const { data: claim, error: fetchError } = await supabase.from('extra_work_logs').select('*').eq('id', claimId).single();
    if (fetchError) throw fetchError;
    if (!claim) throw new Error('Claim not found.');
    const { error: updateError } = await supabase.from('extra_work_logs').update({ status: 'Approved', approver_id: approverId, approver_name: approverData.name, approved_at: new Date().toISOString() }).eq('id', claimId);
    if (updateError) throw updateError;
    if (claim.claim_type === 'Comp Off') await api.addCompOffLog({ userId: claim.user_id, userName: claim.user_name, dateEarned: claim.work_date, reason: `Claim approved: ${claim.reason}`, status: 'earned', grantedById: approverId, grantedByName: approverData.name });
  },
  rejectExtraWorkClaim: async (claimId: string, approverId: string, reason: string): Promise<void> => {
    const { data: approverData, error: nameError } = await supabase.from('users').select('name').eq('id', approverId).single();
    if (nameError) throw nameError;
    const { error } = await supabase.from('extra_work_logs').update({ status: 'Rejected', approver_id: approverId, approver_name: approverData.name, rejection_reason: reason }).eq('id', claimId);
    if (error) throw error;
  },
  getManpowerDetails: async(siteId: string): Promise<ManpowerDetail[]> => {
    const { data, error } = await supabase.rpc('get_manpower_details', { site_id_param: siteId });
    if(error) throw error;
    return toCamelCase(data);
  },
// Fix: Add all missing functions to the api object.
  addCompOffLog: async (logData: Omit<CompOffLog, 'id'>): Promise<CompOffLog> => {
    const { data, error } = await supabase.from('comp_off_logs').insert(toSnakeCase(logData)).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },
  exportAllData: async (): Promise<any> => {
    const tables = ['users', 'organizations', 'onboarding_submissions', 'settings'];
    const data: Record<string, any> = {};
    for (const table of tables) {
        const { data: tableData, error } = await supabase.from(table).select('*');
        if (error) throw new Error(`Failed to export ${table}`);
        data[table] = tableData;
    }
    return toCamelCase(data);
  },
  getPincodeDetails: async (pincode: string): Promise<{ city: string; state: string; }> => {
    // This is a mock. A real implementation would use an external API.
    return new Promise(resolve => setTimeout(() => resolve({ city: 'Bengaluru', state: 'Karnataka' }), 500));
  },
  suggestDepartmentForDesignation: async (designation: string): Promise<string | null> => {
    const mapping: Record<string, string> = {
        'Security Guard': 'Security',
        'Housekeeping Staff': 'Housekeeping',
        'Site Manager': 'Management',
    };
    const key = Object.keys(mapping).find(key => designation.toLowerCase().includes(key.toLowerCase()));
    return Promise.resolve(key ? mapping[key] : null);
  },
  verifyBankAccountWithPerfios: async (data: PerfiosVerificationData): Promise<VerificationResult> => {
    console.log('Mock verifying bank account:', data);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const success = Math.random() > 0.1; // 90% success rate
    return {
        success,
        message: success ? 'Bank account verified successfully.' : 'Account holder name did not match.',
        verifiedFields: { name: null, dob: null, aadhaar: null, bank: success, uan: null, esi: null, accountHolderName: success, accountNumber: success, ifscCode: true }
    };
  },
  verifyAadhaar: async (aadhaar: string): Promise<VerificationResult> => {
    console.log('Mock verifying Aadhaar:', aadhaar);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const success = aadhaar.length === 12 && Math.random() > 0.1;
    return { success, message: success ? 'Aadhaar details verified.' : 'Invalid Aadhaar number.', verifiedFields: { name: null, dob: null, aadhaar: success, bank: null, uan: null, esi: null } };
  },
  lookupUan: async (uan: string): Promise<VerificationResult> => {
    console.log('Mock looking up UAN:', uan);
    await new Promise(resolve => setTimeout(resolve, 1200));
    const success = uan.length === 12 && Math.random() > 0.1;
    return { success, message: success ? 'UAN found and linked.' : 'UAN not found in EPFO database.', verifiedFields: { name: null, dob: null, aadhaar: null, bank: null, uan: success, esi: null } };
  },
  extractDataFromImage: async (base64: string, mimeType: string, schema: any, docType?: string): Promise<any> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: `Extract the structured data from this document image. It is a ${docType || 'document'}.` },
                { inlineData: { data: base64, mimeType } }
            ]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });
    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);
  },
  crossVerifyNames: async (name1: string, name2: string): Promise<{ isMatch: boolean; reason: string }> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Are these two names referring to the same person? Name 1: "${name1}", Name 2: "${name2}". Respond in JSON format with two keys: "isMatch" (boolean) and "reason" (a brief string explanation).`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isMatch: { type: Type.BOOLEAN },
                    reason: { type: Type.STRING },
                }
            }
        }
    });
    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);
  },
  verifyFingerprintImage: async (base64: string, mimeType: string): Promise<{ containsFingerprints: boolean; reason: string }> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: 'Does this image contain one or more human fingerprints? The image might be a scan from paper. Respond in JSON with "containsFingerprints" (boolean) and "reason" (string).' },
                { inlineData: { data: base64, mimeType } }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    containsFingerprints: { type: Type.BOOLEAN },
                    reason: { type: Type.STRING },
                }
            }
        }
    });
    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);
  },
  enhanceDocumentPhoto: async (base64: string, mimeType: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { text: 'Enhance this document photo. Improve contrast, correct perspective to be flat, and make text as clear as possible. Return only the enhanced image.' },
                { inlineData: { data: base64, mimeType } }
            ]
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("AI did not return an enhanced image.");
  },
  getSiteStaffDesignations: async (): Promise<SiteStaffDesignation[]> => {
    const { data, error } = await supabase.from('site_staff_designations').select('*');
    if (error) throw error;
    return (data || []).map(toCamelCase);
  },
  updateManpowerDetails: async (siteId: string, details: ManpowerDetail[]): Promise<void> => {
    console.log("Mock updating manpower for", siteId, details);
    await new Promise(resolve => setTimeout(resolve, 500));
  },
  getCompOffLogs: async (userId: string): Promise<CompOffLog[]> => {
    const { data, error } = await supabase.from('comp_off_logs').select('*').eq('user_id', userId).order('date_earned', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamelCase);
  },
  checkCompOffTableExists: async (): Promise<void> => {
    const { error } = await supabase.from('comp_off_logs').select('id').limit(1);
    if (error) throw error;
  },
  getAllSiteAssets: async (): Promise<Record<string, Asset[]>> => {
      return Promise.resolve({}); // mock
  },
  updateSiteAssets: async (siteId: string, assets: Asset[]): Promise<void> => {
      console.log('Mock updating assets for site', siteId, assets);
      return Promise.resolve();
  },
  getBackOfficeIdSeries: async (): Promise<BackOfficeIdSeries[]> => {
    const { data, error } = await supabase.from('back_office_id_series').select('*');
    if (error) throw error;
    return (data || []).map(toCamelCase);
  },
  updateBackOfficeIdSeries: async (series: BackOfficeIdSeries[]): Promise<void> => {
    const { error } = await supabase.from('back_office_id_series').upsert(toSnakeCase(series), { onConflict: 'id' });
    if (error) throw error;
  },
  updateSiteStaffDesignations: async (designations: SiteStaffDesignation[]): Promise<void> => {
    const { error } = await supabase.from('site_staff_designations').upsert(toSnakeCase(designations), { onConflict: 'id' });
    if (error) throw error;
  },
  getAllSiteIssuedTools: async (): Promise<Record<string, IssuedTool[]>> => {
      return Promise.resolve({});
  },
  getToolsList: async (): Promise<MasterToolsList> => {
      return Promise.resolve({});
  },
  updateSiteIssuedTools: async (siteId: string, tools: IssuedTool[]): Promise<void> => {
      console.log('Mock updating tools for site', siteId, tools);
  },
  getAllSiteGentsUniforms: async (): Promise<Record<string, SiteGentsUniformConfig>> => {
      return Promise.resolve({});
  },
  getMasterGentsUniforms: async (): Promise<MasterGentsUniforms> => {
      return Promise.resolve({ pants: [], shirts: [] });
  },
  updateSiteGentsUniforms: async (siteId: string, config: SiteGentsUniformConfig): Promise<void> => {
      console.log('Mock updating gents uniforms for', siteId, config);
  },
  getAllSiteUniformDetails: async (): Promise<Record<string, SiteUniformDetailsConfig>> => {
      return Promise.resolve({});
  },
  updateSiteUniformDetails: async (siteId: string, config: SiteUniformDetailsConfig): Promise<void> => {
      console.log('Mock updating uniform details for', siteId, config);
  },
  getAllSiteLadiesUniforms: async (): Promise<Record<string, SiteLadiesUniformConfig>> => {
      return Promise.resolve({});
  },
  getMasterLadiesUniforms: async (): Promise<MasterLadiesUniforms> => {
      return Promise.resolve({ pants: [], shirts: [] });
  },
  updateSiteLadiesUniforms: async (siteId: string, config: SiteLadiesUniformConfig): Promise<void> => {
      console.log('Mock updating ladies uniforms for', siteId, config);
  },
  getUniformRequests: async (): Promise<UniformRequest[]> => {
    const { data, error } = await supabase.from('uniform_requests').select('*');
    if (error) throw error;
    return (data || []).map(toCamelCase);
  },
  submitUniformRequest: async (request: UniformRequest): Promise<UniformRequest> => {
    const { data, error } = await supabase.from('uniform_requests').insert(toSnakeCase(request)).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },
  updateUniformRequest: async (request: UniformRequest): Promise<UniformRequest> => {
    const { data, error } = await supabase.from('uniform_requests').update(toSnakeCase(request)).eq('id', request.id).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },
  deleteUniformRequest: async (id: string): Promise<void> => {
    const { error } = await supabase.from('uniform_requests').delete().eq('id', id);
    if (error) throw error;
  },
  getInvoiceStatuses: async (date: Date): Promise<Record<string, 'Not Generated' | 'Generated' | 'Sent' | 'Paid'>> => {
      console.log('Mock fetching invoice statuses for', date);
      return Promise.resolve({});
  },
  getInvoiceSummaryData: async (siteId: string, date: Date): Promise<InvoiceData> => {
      console.log('Mock fetching invoice data for', siteId, date);
      return Promise.resolve({ siteName: 'Mock Site', siteAddress: 'Mock Address', invoiceNumber: 'INV-001', invoiceDate: '2023-01-31', statementMonth: 'January-2023', lineItems: [] });
  },
  getSupportTickets: async (): Promise<SupportTicket[]> => {
      const { data, error } = await supabase.from('support_tickets').select('*, posts:ticket_posts(*, comments:ticket_comments(*))');
      if (error) throw error;
      return (data || []).map(toCamelCase);
  },
  getSupportTicketById: async (id: string): Promise<SupportTicket | null> => {
      const { data, error } = await supabase.from('support_tickets').select('*, posts:ticket_posts(*, comments:ticket_comments(*))').eq('id', id).single();
      if (error) throw error;
      return toCamelCase(data);
  },
  createSupportTicket: async (ticketData: Partial<SupportTicket>): Promise<SupportTicket> => {
    const { data, error } = await supabase.from('support_tickets').insert(toSnakeCase(ticketData)).select('*, posts:ticket_posts(*, comments:ticket_comments(*))').single();
    if (error) throw error;
    return toCamelCase(data);
  },
  updateSupportTicket: async (id: string, updates: Partial<SupportTicket>): Promise<SupportTicket> => {
    const { data, error } = await supabase.from('support_tickets').update(toSnakeCase(updates)).eq('id', id).select('*, posts:ticket_posts(*, comments:ticket_comments(*))').single();
    if (error) throw error;
    return toCamelCase(data);
  },
  addTicketPost: async (ticketId: string, postData: Partial<TicketPost>): Promise<TicketPost> => {
    const { data, error } = await supabase.from('ticket_posts').insert(toSnakeCase(postData)).select('*, comments:ticket_comments(*)').single();
    if (error) throw error;
    return toCamelCase(data);
  },
  togglePostLike: async (postId: string, userId: string): Promise<void> => {
    const { data, error } = await supabase.from('ticket_posts').select('likes').eq('id', postId).single();
    if (error) throw error;
    const likes = (data.likes as string[]) || [];
    const newLikes = likes.includes(userId) ? likes.filter(id => id !== userId) : [...likes, userId];
    const { error: updateError } = await supabase.from('ticket_posts').update({ likes: newLikes }).eq('id', postId);
    if (updateError) throw updateError;
  },
  addPostComment: async (postId: string, commentData: Partial<TicketComment>): Promise<TicketComment> => {
    const { data, error } = await supabase.from('ticket_comments').insert(toSnakeCase(commentData)).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },
   getVerificationCostBreakdown: async (startDate: string, endDate: string): Promise<SubmissionCostBreakdown[]> => {
    const { data, error } = await supabase.from('onboarding_submissions').select('id, employee_id, personal, enrollment_date, verification_usage').gte('enrollment_date', startDate).lte('enrollment_date', endDate);
    if (error) throw error;
    
    return (data || []).map(sub => {
      const camelSub = toCamelCase(sub);
      return {
        id: camelSub.id,
        employeeId: camelSub.personal.employeeId,
        employeeName: `${camelSub.personal.firstName} ${camelSub.personal.lastName}`,
        enrollmentDate: camelSub.enrollmentDate,
        totalCost: 0, // Will be calculated on the frontend
        breakdown: camelSub.verificationUsage || [],
      }
    });
  },
};