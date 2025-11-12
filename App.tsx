
// App.tsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useEnrollmentRulesStore } from './store/enrollmentRulesStore';
import { usePermissionsStore } from './store/permissionsStore';
import { useSettingsStore } from './store/settingsStore';
import { useMediaQuery } from './hooks/useMediaQuery';
import { api } from './services/api';
import { supabase } from './services/supabase';
import { authService } from './services/authService';
import type { User } from './types';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Pages
import Splash from './pages/Splash';
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import UpdatePassword from './pages/auth/UpdatePassword';
import PendingApproval from './pages/PendingApproval';
import Forbidden from './pages/Forbidden';
import OnboardingHome from './pages/OnboardingHome';
import SelectOrganization from './pages/onboarding/SelectOrganization';
import AddEmployee from './pages/onboarding/AddEmployee';
import VerificationDashboard from './pages/verification/VerificationDashboard';
import UserManagement from './pages/admin/UserManagement';
import SiteManagement from './pages/admin/OrganizationManagement';
import RoleManagement from './pages/admin/RoleManagement';
import ModuleManagement from './pages/admin/ModuleManagement';
import { ApiSettings } from './pages/developer/ApiSettings';
import OperationsDashboard from './pages/operations/OperationsDashboard';
import SiteDashboard from './pages/site/OrganizationDashboard';
import ProfilePage from './pages/profile/ProfilePage';
import AttendanceDashboard from './pages/attendance/AttendanceDashboard';
import AttendanceSettings from './pages/hr/AttendanceSettings';
import LeaveDashboard from './pages/leaves/LeaveDashboard';
import LeaveManagement from './pages/hr/LeaveManagement';
import ApprovalWorkflow from './pages/admin/ApprovalWorkflow';
import TaskManagement from './pages/tasks/TaskManagement';
import EntityManagement from './pages/hr/EntityManagement';
import PoliciesAndInsurance from './pages/hr/PoliciesAndInsurance';
import EnrollmentRules from './pages/hr/EnrollmentRules';
import OnboardingPdfOutput from './pages/onboarding/OnboardingPdfOutput';
import UniformDashboard from './pages/uniforms/UniformDashboard';
import CostAnalysis from './pages/billing/CostAnalysis';
import InvoiceSummary from './pages/billing/InvoiceSummary';
import FieldOfficerTracking from './pages/hr/FieldOfficerTracking';
import PreUpload from './pages/onboarding/PreUpload';
import MySubmissions from './pages/onboarding/MySubmissions';
import MyTasks from './pages/onboarding/MyTasks';
import UniformRequests from './pages/onboarding/UniformRequests';
import SupportDashboard from './pages/support/SupportDashboard';
import TicketDetail from './pages/support/TicketDetail';

// Onboarding Form Steps
import PersonalDetails from './pages/onboarding/PersonalDetails';
import AddressDetails from './pages/onboarding/AddressDetails';
import OrganizationDetails from './pages/onboarding/OrganizationDetails';
import FamilyDetails from './pages/onboarding/FamilyDetails';
import EducationDetails from './pages/onboarding/EducationDetails';
import BankDetails from './pages/onboarding/BankDetails';
import UanDetails from './pages/onboarding/UanDetails';
import EsiDetails from './pages/onboarding/EsiDetails';
import GmcDetails from './pages/onboarding/GmcDetails';
import UniformDetails from './pages/onboarding/UniformDetails';
import Documents from './pages/onboarding/Documents';
import Biometrics from './pages/onboarding/Biometrics';
import Review from './pages/onboarding/Review';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import { IdleTimeoutManager } from './components/auth/IdleTimeoutManager';

// Theme Manager
const ThemeManager: React.FC = () => {
  const { theme, isAutomatic, _setThemeInternal } = useThemeStore();
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    const body = document.body;
    let newTheme = 'light';

    if (isAutomatic) {
      newTheme = isMobile ? 'dark' : 'light';
    } else {
      newTheme = theme;
    }

    _setThemeInternal(newTheme as 'light' | 'dark');

    if (newTheme === 'dark') {
      body.classList.add('pro-dark-theme');
    } else {
      body.classList.remove('pro-dark-theme');
    }
  }, [theme, isAutomatic, isMobile, _setThemeInternal]);

  return null;
};

// Helper: keys & ignored routes for last-path storage
const LAST_PATH_KEY = 'app:lastPath';
const IGNORED_PATH_PREFIXES = ['/auth', '/splash', '/pending-approval', '/forbidden'];

const shouldStorePath = (path: string) => {
  // ignore auth pages, splash, pending, forbidden or catch-all redirects
  return !IGNORED_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
};

// This wrapper component protects all main application routes
const MainLayoutWrapper: React.FC = () => {
  const { user } = useAuthStore();
  if (!user) {
    // Not logged in, redirect to login
    return <Navigate to="/auth/login" replace />;
  }
  if (user.role === 'unverified') {
    // Logged in but not approved, redirect to pending page
    return <Navigate to="/pending-approval" replace />;
  }
  // User is authenticated and verified, show the main layout and its nested routes
  return <MainLayout />;
};

const App: React.FC = () => {
  const { user, isInitialized, setUser, setInitialized, resetAttendance, setLoading } = useAuthStore();
  const { init: initEnrollmentRules } = useEnrollmentRulesStore();
  const { initRoles } = usePermissionsStore();
  const { initSettings } = useSettingsStore();

  const navigate = useNavigate();
  const location = useLocation();

  // Persist readable last path (sessionStorage so it clears on browser close)
  useEffect(() => {
    const path = location.pathname + location.search;
    if (shouldStorePath(path)) {
      try {
        sessionStorage.setItem(LAST_PATH_KEY, path);
      } catch (e) {
        // ignore storage errors
        console.warn('Failed to store last path', e);
      }
    }
  }, [location]);

  // Initialization & Supabase session management
  useEffect(() => {
    // Actively fetch session on initial load for better reliability
    const initializeApp = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const appUser = await authService.getAppUserProfile(session.user);
          setUser(appUser);
        } else {
          setUser(null);
          resetAttendance();
        }
      } catch (error) {
        console.error('Error during app initialization:', error);
        setUser(null);
        resetAttendance();
      } finally {
        // Guarantee that the splash screen is removed
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeApp();

    // Listen for subsequent auth changes (e.g., login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const appUser = session?.user ? await authService.getAppUserProfile(session.user) : null;
      setUser(appUser);
      if (!appUser) {
          resetAttendance();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [setUser, setInitialized, resetAttendance, setLoading]);

  // Fetch initial app data on user login
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { settings, roles, holidays } = await api.getInitialAppData();

        if (settings.enrollmentRules) {
          initEnrollmentRules(settings.enrollmentRules);
        }
        if (roles) {
          initRoles(roles);
        }
        if (settings.attendanceSettings && holidays) {
          initSettings({
            holidays: holidays,
            attendanceSettings: settings.attendanceSettings
          });
        }
      } catch (error) {
        console.error('Failed to load initial application data:', error);
      }
    };

    if (user && isInitialized) { // Ensure we only fetch after initialization is complete
      fetchInitialData();
      useAuthStore.getState().checkAttendanceStatus();
    }
  }, [user, isInitialized, initEnrollmentRules, initRoles, initSettings]);
  
  // Post-initialization navigation logic.
  useEffect(() => {
    if (!isInitialized) {
      return; // Wait for the session check to complete.
    }

    // This effect handles one specific case: a logged-in user landing on an auth page.
    // All other routing (like protecting routes) is handled by the route components themselves.
    if (user && location.pathname.startsWith('/auth')) {
        const lastPath = sessionStorage.getItem(LAST_PATH_KEY);
        if (lastPath && shouldStorePath(lastPath)) {
          navigate(lastPath, { replace: true });
        } else {
          navigate('/profile', { replace: true });
        }
    }
  }, [isInitialized, user, location.pathname, navigate]);


  // While the initial authentication check is running, show the splash screen.
  // This prevents the router from rendering and making incorrect navigation decisions.
  if (!isInitialized) {
    // Temporarily disabled splash screen by commenting out the return.
    // return <Splash />;
  }

  // Once initialized, render the main application structure.
  return (
    <>
      <ThemeManager />
      {user && <IdleTimeoutManager />}
      <Routes>
        {/* 1. Public Authentication Routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route index element={<Navigate to="login" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="update-password" element={<UpdatePassword />} />
        </Route>

        {/* 2. Page for unverified users */}
        <Route path="/pending-approval" element={user && user.role === 'unverified' ? <PendingApproval /> : <Navigate to="/auth/login" replace />} />

        {/* 3. Forbidden page for unauthorized access */}
        <Route path="/forbidden" element={<Forbidden />} />

        {/* 4. All protected main application routes are nested here */}
        <Route path="/" element={<MainLayoutWrapper />}>
          {/* Default route for authenticated users */}
          <Route index element={<Navigate to="/profile" replace />} />

          <Route path="profile" element={<ProfilePage />} />

          {/* Onboarding Flow */}
          <Route element={<ProtectedRoute requiredPermission="create_enrollment" />}>
            <Route path="onboarding" element={<OnboardingHome />} />
            <Route path="onboarding/select-organization" element={<SelectOrganization />} />
            <Route path="onboarding/pre-upload" element={<PreUpload />} />
            <Route path="onboarding/submissions" element={<MySubmissions />} />
            <Route path="onboarding/tasks" element={<MyTasks />} />
            <Route path="onboarding/uniforms" element={<UniformRequests />} />
            <Route path="onboarding/add" element={<AddEmployee />}>
              <Route path="personal" element={<PersonalDetails />} />
              <Route path="address" element={<AddressDetails />} />
              <Route path="organization" element={<OrganizationDetails />} />
              <Route path="family" element={<FamilyDetails />} />
              <Route path="education" element={<EducationDetails />} />
              <Route path="bank" element={<BankDetails />} />
              <Route path="uan" element={<UanDetails />} />
              <Route path="esi" element={<EsiDetails />} />
              <Route path="gmc" element={<GmcDetails />} />
              <Route path="uniform" element={<UniformDetails />} />
              <Route path="documents" element={<Documents />} />
              <Route path="biometrics" element={<Biometrics />} />
              <Route path="review" element={<Review />} />
            </Route>
            <Route path="onboarding/pdf/:id" element={<OnboardingPdfOutput />} />
          </Route>

          {/* Verification */}
          <Route element={<ProtectedRoute requiredPermission="view_all_submissions" />}>
            <Route path="verification/dashboard" element={<VerificationDashboard />} />
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute requiredPermission="manage_users" />}>
            <Route path="admin/users" element={<UserManagement />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="manage_sites" />}>
            <Route path="admin/sites" element={<SiteManagement />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="manage_roles_and_permissions" />}>
            <Route path="admin/roles" element={<RoleManagement />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="manage_modules" />}>
            <Route path="admin/modules" element={<ModuleManagement />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="manage_approval_workflow" />}>
            <Route path="admin/approval-workflow" element={<ApprovalWorkflow />} />
          </Route>

          {/* Developer */}
          <Route element={<ProtectedRoute requiredPermission="view_developer_settings" />}>
            <Route path="developer/api" element={<ApiSettings />} />
          </Route>

          {/* Operations & Site */}
          <Route element={<ProtectedRoute requiredPermission="view_operations_dashboard" />}>
            <Route path="operations/dashboard" element={<OperationsDashboard />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="view_site_dashboard" />}>
            <Route path="site/dashboard" element={<SiteDashboard />} />
          </Route>

          {/* Attendance & Leave */}
          <Route element={<ProtectedRoute requiredPermission="view_own_attendance" />}>
            <Route path="attendance/dashboard" element={<AttendanceDashboard />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="apply_for_leave" />}>
            <Route path="leaves/dashboard" element={<LeaveDashboard />} />
          </Route>

          {/* HR */}
          <Route element={<ProtectedRoute requiredPermission="manage_attendance_rules" />}>
            <Route path="hr/attendance-settings" element={<AttendanceSettings />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="manage_leave_requests" />}>
            <Route path="hr/leave-management" element={<LeaveManagement />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="view_entity_management" />}>
            <Route path="hr/entities" element={<EntityManagement />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="manage_policies" />}>
            <Route path="hr/policies-and-insurance" element={<PoliciesAndInsurance />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="manage_enrollment_rules" />}>
            <Route path="hr/enrollment-rules" element={<EnrollmentRules />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="view_field_officer_tracking" />}>
            <Route path="hr/field-officer-tracking" element={<FieldOfficerTracking />} />
          </Route>

          {/* Uniforms */}
          <Route element={<ProtectedRoute requiredPermission="manage_uniforms" />}>
            <Route path="uniforms" element={<UniformDashboard />} />
          </Route>

          {/* Billing */}
          <Route element={<ProtectedRoute requiredPermission="view_verification_costing" />}>
            <Route path="billing/cost-analysis" element={<CostAnalysis />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="view_invoice_summary" />}>
            <Route path="billing/summary" element={<InvoiceSummary />} />
          </Route>

          {/* Tasks */}
          <Route element={<ProtectedRoute requiredPermission="manage_tasks" />}>
            <Route path="tasks" element={<TaskManagement />} />
          </Route>

          {/* Support */}
          <Route element={<ProtectedRoute requiredPermission="access_support_desk" />}>
            <Route path="support" element={<SupportDashboard />} />
            <Route path="support/ticket/:id" element={<TicketDetail />} />
          </Route>
        </Route>

        {/* 5. Catch-all: Redirects any unknown paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
