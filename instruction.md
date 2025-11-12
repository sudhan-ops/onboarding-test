

# Paradigm Employee Onboarding: Backend Development Guide

## 1. Introduction

### 1.1. Purpose

This document provides a comprehensive, step-by-step guide for building the backend services for the Paradigm Employee Onboarding application. The frontend is a fully functional prototype built with React, TypeScript, and Zustand, currently operating on a mock data layer. This guide details the frontend's architecture and provides a clear plan for creating a robust backend to replace this mock layer.

Adherence to this guide will ensure seamless integration with the existing frontend, as it is based on the exact data structures and API calls the client-side code expects.

### 1.2. The API Contract: `services/api.ts`

**This file is the single most important reference for the backend team.** It is the contract that the backend API must fulfill.

- **Centralized Logic:** All frontend data fetching and mutation logic is centralized in `services/api.ts`.
- **In-Memory Database:** It currently simulates a database using an in-memory `db` object, loaded from JSON files in the `/mocks` directory.
- **Contract Definition:** The function signatures (arguments, return types, and data structures from `types/index.ts`) in `api.ts` define the **exact endpoints, request payloads, and response structures** the backend needs to implement.

**The primary task of the backend team is to replace every function in `services/api.ts` with a real `fetch` call to a corresponding backend endpoint detailed in this guide.**

---

## 2. Core Architecture & Setup

### 2.1. Recommended Technology Stack

- **Runtime/Framework:** Node.js with **NestJS** or **Express** (with TypeScript). NestJS is recommended for its modular, opinionated architecture which aligns well with this project's feature set.
- **Database:** **PostgreSQL** is highly recommended for its support for relational data, powerful indexing, and robust `JSONB` column type.
- **ORM:** **Prisma** is the recommended Object-Relational Mapper. Its schema-first approach and excellent TypeScript integration provide unparalleled type safety, mirroring the frontend's stack.
- **Authentication:** **JWT (JSON Web Tokens)** for stateless authentication. Store tokens in `HttpOnly`, `Secure` cookies for security.
- **Asynchronous Jobs:** A queue system like **BullMQ** with Redis for handling long-running tasks like the "Portal Sync" verification process without blocking API requests.

### 2.2. Environment Variables

All sensitive information and environment-specific configurations **must** be managed via environment variables (a `.env` file). Never hardcode these values.

```env
# .env

# --- Database ---
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# --- Authentication ---
JWT_SECRET="YOUR_SUPER_SECRET_JWT_KEY"
JWT_EXPIRES_IN="7d"

# --- Third-Party API Keys ---
# IMPORTANT: This is the ONLY place the Gemini API key should be defined.
API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"

# Add keys for Perfios, Surepass, etc. as they are integrated.
PERFIOS_CLIENT_ID="..."
PERFIOS_CLIENT_SECRET="..."
```

### 2.3. Comprehensive Database Schema (Prisma)

The following Prisma schema is the source of truth for the database structure. It is designed to match the frontend types found in `types/index.ts`.

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// --- 1. Users, Roles & Permissions ---
model User {
  id                 String    @id @default(cuid())
  name               String
  email              String    @unique
  phone              String?
  roleId             String
  role               Role      @relation(fields: [roleId], references: [id])
  organizationId     String? // For site managers, etc.
  organizationName   String?
  reportingManagerId String?
  reportingManager   User?     @relation("ManagerEmployee", fields: [reportingManagerId], references: [id], onDelete: SetNull)
  employees          User[]    @relation("ManagerEmployee")
  photoUrl           String?   @db.Text
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  attendanceEvents   AttendanceEvent[]
  leaveRequests      LeaveRequest[]
  assignedTasks      Task[]            @relation("AssignedTasks")
  createdTasks       Task[]            @relation("CreatedTasks")
  createdNotifications Notification[]
  extraWorkLogs      ExtraWorkLog[]
}

model Role {
  id          String   @id @unique // e.g., 'admin', 'hr'
  displayName String
  users       User[]
  permissions String[] // Array of permission keys
}

model AppModule {
  id          String       @id @unique
  name        String
  description String
  permissions String[] // Array of permission keys
}


// --- 2. Onboarding & Submissions ---
model OnboardingSubmission {
  id                         String    @id @default(cuid())
  employeeId                 String    @unique
  status                     String    // 'draft', 'pending', 'verified', 'rejected'
  portalSyncStatus           String?   // 'pending_sync', 'synced', 'failed'
  organizationId             String?   @index
  organizationName           String?
  enrollmentDate             DateTime
  requiresManualVerification Boolean   @default(false)
  formsGenerated             Boolean   @default(false)

  // JSON blobs for flexible, nested data from the multi-step form
  // These map directly to the interfaces in `types/index.ts`
  personal          Json
  address           Json
  family            Json
  education         Json
  bank              Json
  uan               Json
  esi               Json
  gmc               Json
  organization      Json
  uniforms          Json
  biometrics        Json
  salaryChangeRequest Json?
  verificationUsage Json
  
  // To link to the User record after verification and user creation
  createdUserId String? @unique
}


// --- 3. Organization & Site Management ---
model OrganizationGroup {
  id        String    @id @default(cuid())
  name      String
  companies Company[]
}

model Company {
  id        String             @id @default(cuid())
  name      String
  groupId   String
  group     OrganizationGroup  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  entities  Entity[]
}

model Entity {
  id                        String  @id @default(cuid())
  name                      String
  organizationId            String? @unique // Links to an Organization (Site)
  location                  String?
  registeredAddress         String?
  registrationType          String?
  registrationNumber        String?
  gstNumber                 String?
  panNumber                 String?
  email                     String?
  eShramNumber              String?
  shopAndEstablishmentCode  String?
  epfoCode                  String?
  esicCode                  String?
  psaraLicenseNumber        String?
  psaraValidTill            String?
  companyId                 String
  company                   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  insuranceIds              String[]
  policyIds                 String[]
}

model Organization {
  id                    String @id @unique // The site ID, e.g., SITE-TATA
  shortName             String
  fullName              String
  address               String
  manpowerApprovedCount Int?
}

model SiteConfiguration {
  id             String @id @default(cuid())
  organizationId String @unique
  configData     Json   // Stores the entire SiteConfiguration object
}


// --- 4. Attendance, Leave, Tasks & Notifications ---
model AttendanceEvent {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  timestamp DateTime
  type      String   // 'check-in', 'check-out'
  latitude  Float?
  longitude Float?
}

model LeaveRequest {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  leaveType         String   // 'Earned', 'Sick', 'Floating', 'Comp Off'
  startDate         DateTime
  endDate           DateTime
  reason            String
  status            String   // 'pending_manager_approval', 'pending_hr_confirmation', 'approved', 'rejected'
  dayOption         String?  // 'full', 'half'
  currentApproverId String?
  approvalHistory   Json
  doctorCertificate Json?    // Store UploadedFile object
}

model ExtraWorkLog {
  id               String    @id @default(cuid())
  userId           String
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workDate         DateTime  @db.Date
  workType         String    // 'Holiday', 'Week Off', 'Night Shift'
  claimType        String    // 'OT', 'Comp Off'
  hoursWorked      Float?
  reason           String
  status           String    @default("Pending") // 'Pending', 'Approved', 'Rejected'
  approverId       String?
  approverName     String?
  approvedAt       DateTime?
  rejectionReason  String?
  createdAt        DateTime  @default(now())
}

model Task {
  id                          String    @id @default(cuid())
  name                        String
  description                 String?
  dueDate                     DateTime?
  priority                    String    // 'Low', 'Medium', 'High'
  status                      String    // 'To Do', 'In Progress', 'Done'
  createdAt                   DateTime  @default(now())
  createdById                 String?
  createdBy                   User?     @relation("CreatedTasks", fields: [createdById], references: [id], onDelete: SetNull)
  assignedToId                String?
  assignedTo                  User?     @relation("AssignedTasks", fields: [assignedToId], references: [id], onDelete: SetNull)
  completionNotes             String?
  completionPhoto             Json?
  escalationStatus            String
  escalationLevel1UserId      String?
  escalationLevel1DurationDays Int?
  escalationLevel2UserId      String?
  escalationLevel2DurationDays Int?
  escalationEmail             String?
  escalationEmailDurationDays Int?
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  message   String
  type      String   // 'task_assigned', 'task_escalated'
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  linkTo    String?
}


// --- 5. System Settings & HR Data ---
model Settings {
  id                      String @id @default("singleton") // Guarantees only one settings row
  attendanceSettings      Json
  gmcPolicy               Json
  enrollmentRules         Json
  apiSettings             Json   // Store enabled status, client IDs (NOT secrets)
  verificationCosts       Json
  backOfficeIdSeries      Json
  siteStaffDesignations   Json
  masterTools             Json
  masterGentsUniforms     Json
  masterLadiesUniforms    Json
}

model Holiday {
  id   String @id @default(cuid())
  date String // YYYY-MM-DD
  name String
  type String // 'office' or 'field'
}

model Policy {
  id          String  @id @default(cuid())
  name        String
  description String?
}

model Insurance {
  id           String @id @default(cuid())
  type         String // 'GMC', 'GPA', 'WCA', 'Other'
  provider     String
  policyNumber String
  validTill    String // YYYY-MM-DD
}

model UniformRequest {
  id              String   @id @default(cuid())
  siteId          String
  siteName        String
  gender          String   // 'Gents' or 'Ladies'
  requestedDate   DateTime
  status          String   // 'Pending', 'Approved', 'Rejected', 'Issued'
  items           Json
  source          String?  // 'Bulk', 'Enrollment', 'Individual'
  requestedById   String?
  requestedByName String?
  employeeDetails Json?
}

// Store site-specific uniform configurations as JSON
model SiteGentsUniformConfig {
  id             String @id @default(cuid())
  organizationId String @unique
  configData     Json
}

model SiteLadiesUniformConfig {
  id             String @id @default(cuid())
  organizationId String @unique
  configData     Json
}

model SiteUniformDetailsConfig {
  id             String @id @default(cuid())
  organizationId String @unique
  configData     Json
}
```

---

## 4. Manual Supabase Setup Script

For users setting up the database manually in Supabase, the following SQL script should be executed. This script is **idempotent**, meaning it is safe to run multiple times without causing errors. It will create all necessary tables, functions, security policies, and seed initial data.

**Instructions:** Copy the entire script below and paste it into the Supabase SQL Editor (`SQL Editor` > `New query`) and click "Run".

```sql
-- PARADIGM ONBOARDING: COMPLETE & IDEMPOTENT SUPABASE SETUP SCRIPT

-- ========= Section 1: Helper Functions =========

-- Function to get custom claims from the JWT, used for RLS.
CREATE OR REPLACE FUNCTION public.get_my_claim(claim TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN COALESCE(current_setting('request.jwt.claims', true)::JSONB ->> claim, 'null'::JSONB);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get user role from the users table.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text AS $$
DECLARE
    role_name text;
BEGIN
    SELECT role_id INTO role_name FROM public.users WHERE id = user_id;
    RETURN role_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add the user_role to the JWT claims on token refresh.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, role_id)
    VALUES (new.id, new.raw_user_meta_data->>'name', new.email, 'unverified');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a new user signs up in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ========= Section 2: Table Creation =========

-- Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id text NOT NULL PRIMARY KEY,
    display_name text NOT NULL
);

-- Users Table (public-facing user profiles)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text,
    email text,
    phone text,
    role_id text REFERENCES public.roles(id) ON DELETE SET NULL,
    organization_id text,
    organization_name text,
    reporting_manager_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    photo_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- App Modules Table
CREATE TABLE IF NOT EXISTS public.app_modules (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    permissions text[]
);

-- Onboarding Submissions Table
CREATE TABLE IF NOT EXISTS public.onboarding_submissions (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    employee_id text UNIQUE,
    status text,
    portal_sync_status text,
    organization_id text,
    organization_name text,
    enrollment_date date,
    requires_manual_verification boolean DEFAULT false,
    forms_generated boolean DEFAULT false,
    personal jsonb,
    address jsonb,
    family jsonb,
    education jsonb,
    bank jsonb,
    uan jsonb,
    esi jsonb,
    gmc jsonb,
    organization jsonb,
    uniforms jsonb,
    biometrics jsonb,
    salary_change_request jsonb,
    verification_usage jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL
);

-- Organization Structure Tables
CREATE TABLE IF NOT EXISTS public.organization_groups ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), name text NOT NULL );
CREATE TABLE IF NOT EXISTS public.companies ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), name text NOT NULL, group_id uuid REFERENCES public.organization_groups(id) ON DELETE CASCADE );
CREATE TABLE IF NOT EXISTS public.entities ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), name text NOT NULL, company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE, organization_id text, location text, registered_address text, registration_type text, registration_number text, gst_number text, pan_number text, email text, e_shram_number text, shop_and_establishment_code text, epfo_code text, esic_code text, psara_license_number text, psara_valid_till text, insurance_ids text[], policy_ids text[] );
CREATE TABLE IF NOT EXISTS public.organizations ( id text NOT NULL PRIMARY KEY, short_name text NOT NULL, full_name text, address text, manpower_approved_count integer, provisional_creation_date timestamptz );

-- Attendance, Leave, Tasks, Notifications
CREATE TABLE IF NOT EXISTS public.attendance_events ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, "timestamp" timestamptz NOT NULL, type text NOT NULL, latitude real, longitude real );
CREATE TABLE IF NOT EXISTS public.leave_requests ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, user_name text, leave_type text, start_date date, end_date date, reason text, status text, day_option text, current_approver_id uuid, approval_history jsonb, doctor_certificate jsonb );
CREATE TABLE IF NOT EXISTS public.extra_work_logs ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, user_name text, work_date date, work_type text, claim_type text, hours_worked numeric, reason text, status text DEFAULT 'Pending', approver_id uuid, approver_name text, approved_at timestamptz, rejection_reason text, created_at timestamptz DEFAULT now() );
CREATE TABLE IF NOT EXISTS public.comp_off_logs ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, user_name text, date_earned date, reason text, status text, leave_request_id uuid, granted_by_id uuid, granted_by_name text, created_at timestamptz DEFAULT now() );
CREATE TABLE IF NOT EXISTS public.tasks ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), name text, description text, due_date date, priority text, status text, created_at timestamptz DEFAULT now(), assigned_to_id uuid REFERENCES public.users(id) ON DELETE SET NULL, assigned_to_name text, completion_notes text, completion_photo jsonb, escalation_status text );
CREATE TABLE IF NOT EXISTS public.notifications ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, message text, type text, is_read boolean DEFAULT false, created_at timestamptz DEFAULT now(), link_to text );

-- Support Desk Tables
CREATE TABLE IF NOT EXISTS public.support_tickets ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), ticket_number text, title text, description text, category text, priority text, status text, raised_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL, raised_by_name text, raised_at timestamptz, assigned_to_id uuid REFERENCES public.users(id) ON DELETE SET NULL, assigned_to_name text, resolved_at timestamptz, closed_at timestamptz, rating integer, feedback text, attachment_url text );
CREATE TABLE IF NOT EXISTS public.ticket_posts ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE, author_id uuid REFERENCES public.users(id) ON DELETE SET NULL, author_name text, author_role text, content text, created_at timestamptz, likes uuid[] );
CREATE TABLE IF NOT EXISTS public.ticket_comments ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), post_id uuid REFERENCES public.ticket_posts(id) ON DELETE CASCADE, author_id uuid REFERENCES public.users(id) ON DELETE SET NULL, author_name text, content text, created_at timestamptz );


-- Settings, HR Data, and Config Tables
CREATE TABLE IF NOT EXISTS public.settings ( id text NOT NULL PRIMARY KEY DEFAULT 'singleton', attendance_settings jsonb, approval_workflow_settings jsonb, enrollment_rules jsonb, back_office_id_series jsonb, site_staff_designations jsonb );
CREATE TABLE IF NOT EXISTS public.holidays ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), date date, name text, type text );
CREATE TABLE IF NOT EXISTS public.policies ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), name text, description text );
CREATE TABLE IF NOT EXISTS public.insurances ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), type text, provider text, policy_number text, valid_till date );
CREATE TABLE IF NOT EXISTS public.uniform_requests ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), site_id text, site_name text, gender text, requested_date timestamptz, status text, items jsonb, source text, requested_by_id uuid, requested_by_name text, employee_details jsonb );
CREATE TABLE IF NOT EXISTS public.site_configurations ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), organization_id text UNIQUE, config_data jsonb );
CREATE TABLE IF NOT EXISTS public.site_gents_uniform_configs ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), organization_id text UNIQUE, config_data jsonb );
CREATE TABLE IF NOT EXISTS public.site_ladies_uniform_configs ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), organization_id text UNIQUE, config_data jsonb );
CREATE TABLE IF NOT EXISTS public.site_uniform_details_configs ( id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), organization_id text UNIQUE, config_data jsonb );


-- ========= Section 3: Enable Row Level Security (Idempotent) =========
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comp_off_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniform_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_configurations ENABLE ROW LEVEL SECURITY;


-- ========= Section 4: Row Level Security Policies =========

-- Drop policies before creating to ensure idempotency
DROP POLICY IF EXISTS "Enable read access for all users" ON public.roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_modules;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.organizations;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.organization_groups;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.companies;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.entities;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.settings;
DROP POLICY IF EXISTS "Enable write access for admin and hr" ON public.settings;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user to create their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow admin/hr to read all profiles" ON public.users;
DROP POLICY IF EXISTS "Allow user to update their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow admin/hr to update any profile" ON public.users;
DROP POLICY IF EXISTS "Allow users to manage their own submissions" ON public.onboarding_submissions;
DROP POLICY IF EXISTS "Allow admin/hr/managers to read all submissions" ON public.onboarding_submissions;
DROP POLICY IF EXISTS "Allow users to manage their own attendance" ON public.attendance_events;
DROP POLICY IF EXISTS "Allow admin/hr/managers to read all attendance" ON public.attendance_events;
DROP POLICY IF EXISTS "Allow users to manage their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow approvers to read assigned leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow admin/hr to manage all leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Enable all access for admin/hr" ON public.holidays;
DROP POLICY IF EXISTS "Enable read for authenticated on holidays" ON public.holidays;
DROP POLICY IF EXISTS "Enable all access for admin/hr" ON public.extra_work_logs;
DROP POLICY IF EXISTS "Enable read for own logs" ON public.extra_work_logs;
DROP POLICY IF EXISTS "Enable insert for own logs" ON public.extra_work_logs;
DROP POLICY IF EXISTS "Enable all access for HR and admins" ON public.comp_off_logs;
DROP POLICY IF EXISTS "Enable read access for own logs" ON public.comp_off_logs;
DROP POLICY IF EXISTS "Enable all access for admin/hr" ON public.tasks;
DROP POLICY IF EXISTS "Enable read for assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Enable user to manage their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated user to access support" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow authenticated user to access posts" ON public.ticket_posts;
DROP POLICY IF EXISTS "Allow authenticated user to access comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Allow admin/hr to manage all policies" ON public.policies;
DROP POLICY IF EXISTS "Allow admin/hr to manage all insurances" ON public.insurances;
DROP POLICY IF EXISTS "Allow authenticated to read uniform requests" ON public.uniform_requests;
DROP POLICY IF EXISTS "Allow admin/hr/ops to manage uniform requests" ON public.uniform_requests;
DROP POLICY IF EXISTS "Allow admin/hr to manage site configs" ON public.site_configurations;


-- Generic read-all policies
CREATE POLICY "Enable read access for all users" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.app_modules FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON public.organizations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read for authenticated users" ON public.organization_groups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read for authenticated users" ON public.companies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read for authenticated users" ON public.entities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read access for all authenticated users" ON public.settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for admin and hr" ON public.settings FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'));

-- Users table policies
CREATE POLICY "Allow users to read their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow user to create their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow admin/hr to read all profiles" ON public.users FOR SELECT USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "Allow user to update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admin/hr to update any profile" ON public.users FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'));

-- Onboarding Submissions policies
CREATE POLICY "Allow users to manage their own submissions" ON public.onboarding_submissions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow admin/hr/managers to read all submissions" ON public.onboarding_submissions FOR SELECT USING (public.get_user_role(auth.uid()) IN ('admin', 'hr', 'operation_manager', 'site_manager'));

-- Attendance policies
CREATE POLICY "Allow users to manage their own attendance" ON public.attendance_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow admin/hr/managers to read all attendance" ON public.attendance_events FOR SELECT USING (public.get_user_role(auth.uid()) IN ('admin', 'hr', 'operation_manager', 'site_manager'));

-- Leave Request policies
CREATE POLICY "Allow users to manage their own leave requests" ON public.leave_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow approvers to read assigned leave requests" ON public.leave_requests FOR SELECT USING (auth.uid() = current_approver_id);
CREATE POLICY "Allow admin/hr to manage all leave requests" ON public.leave_requests FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'));

-- Holiday policies
CREATE POLICY "Enable all access for admin/hr" ON public.holidays FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "Enable read for authenticated on holidays" ON public.holidays FOR SELECT USING (auth.role() = 'authenticated');

-- Extra Work / Comp Off policies
CREATE POLICY "Enable all access for admin/hr" ON public.extra_work_logs FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "Enable read for own logs" ON public.extra_work_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for own logs" ON public.extra_work_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable all access for HR and admins" ON public.comp_off_logs FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "Enable read access for own logs" ON public.comp_off_logs FOR SELECT USING (auth.uid() = user_id);

-- Task & Notification policies
CREATE POLICY "Enable all access for admin/hr" ON public.tasks FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "Enable read for assigned tasks" ON public.tasks FOR SELECT USING (auth.uid() = assigned_to_id);
CREATE POLICY "Enable user to manage their own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Support ticket policies
CREATE POLICY "Allow authenticated user to access support" ON public.support_tickets FOR ALL USING (auth.uid() = raised_by_id OR public.get_user_role(auth.uid()) IN ('admin', 'hr', 'developer'));
CREATE POLICY "Allow authenticated user to access posts" ON public.ticket_posts FOR ALL USING (auth.uid() = author_id OR public.get_user_role(auth.uid()) IN ('admin', 'hr', 'developer'));
CREATE POLICY "Allow authenticated user to access comments" ON public.ticket_comments FOR ALL USING (auth.uid() = author_id OR public.get_user_role(auth.uid()) IN ('admin', 'hr', 'developer'));

-- HR Policies & Insurance
CREATE POLICY "Allow admin/hr to manage all policies" ON public.policies FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "Allow admin/hr to manage all insurances" ON public.insurances FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'));

-- Uniform Requests
CREATE POLICY "Allow authenticated to read uniform requests" ON public.uniform_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/hr/ops to manage uniform requests" ON public.uniform_requests FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'hr', 'operation_manager', 'site_manager'));

-- Site Config
CREATE POLICY "Allow admin/hr to manage site configs" ON public.site_configurations FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'));


-- ========= Section 5: Database Functions (RPCs) =========

CREATE OR REPLACE FUNCTION get_attendance_dashboard_data(start_date_iso text, end_date_iso text, current_date_iso text)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    start_dt date := start_date_iso::date;
    end_dt date := end_date_iso::date;
    current_dt date := current_date_iso::date;
BEGIN
    WITH user_date_matrix AS (
        SELECT u.id as user_id, u.role_id, d.day::date
        FROM public.users u CROSS JOIN generate_series(start_dt, end_dt, '1 day'::interval) as d(day)
    ),
    daily_events AS (
        SELECT user_id, "timestamp"::date as event_date, MIN(CASE WHEN type = 'check-in' THEN "timestamp" END) as first_check_in, MAX(CASE WHEN type = 'check-out' THEN "timestamp" END) as last_check_out
        FROM public.attendance_events
        WHERE "timestamp"::date BETWEEN start_dt AND end_dt
        GROUP BY user_id, event_date
    ),
    daily_status AS (
        SELECT
            udm.user_id, udm.day, (EXTRACT(EPOCH FROM (de.last_check_out - de.first_check_in)) / 3600.0) as work_hours,
            CASE
                WHEN lr.id IS NOT NULL THEN CASE WHEN lr.day_option = 'half' THEN 'On Leave (Half)' ELSE 'On Leave (Full)' END
                WHEN de.first_check_in IS NOT NULL THEN
                    CASE
                        WHEN de.last_check_out IS NULL THEN CASE WHEN udm.day < current_dt THEN 'Absent' ELSE 'Incomplete' END
                        WHEN (EXTRACT(EPOCH FROM (de.last_check_out - de.first_check_in)) / 3600.0) >= (s.attendance_settings->(CASE WHEN udm.role_id IN ('admin', 'hr', 'finance') THEN 'office' ELSE 'field' END)->>'minimumHoursFullDay')::numeric THEN 'Present'
                        WHEN (EXTRACT(EPOCH FROM (de.last_check_out - de.first_check_in)) / 3600.0) >= (s.attendance_settings->(CASE WHEN udm.role_id IN ('admin', 'hr', 'finance') THEN 'office' ELSE 'field' END)->>'minimumHoursHalfDay')::numeric THEN 'Half Day'
                        ELSE 'Absent'
                    END
                WHEN h.id IS NOT NULL THEN 'Holiday'
                WHEN EXTRACT(DOW FROM udm.day) IN (0, 6) THEN 'Weekend' -- Assuming Sat/Sun are weekends
                ELSE 'Absent'
            END as status
        FROM user_date_matrix udm
        LEFT JOIN daily_events de ON udm.user_id = de.user_id AND udm.day = de.event_date
        LEFT JOIN public.leave_requests lr ON udm.user_id = lr.user_id AND lr.status = 'approved' AND udm.day BETWEEN lr.start_date AND lr.end_date
        LEFT JOIN public.holidays h ON udm.day = h.date AND h.type = CASE WHEN udm.role_id IN ('admin', 'hr', 'finance') THEN 'office' ELSE 'field' END
        CROSS JOIN public.settings s
        WHERE s.id = 'singleton'
    ),
    aggregated_trends AS (
        SELECT day, count(*) FILTER (WHERE status IN ('Present', 'Half Day', 'Incomplete')) as present_count, count(*) FILTER (WHERE status = 'Absent') as absent_count, avg(work_hours) FILTER (WHERE work_hours IS NOT NULL AND status IN ('Present', 'Half Day')) as avg_hours
        FROM daily_status GROUP BY day ORDER BY day
    )
    SELECT jsonb_build_object(
            'totalEmployees', (SELECT count(*) FROM public.users),
            'presentToday', (SELECT count(*) FROM daily_status WHERE day = current_dt AND status IN ('Present', 'Half Day', 'Incomplete')),
            'absentToday', (SELECT count(*) FROM daily_status WHERE day = current_dt AND status = 'Absent'),
            'onLeaveToday', (SELECT count(*) FROM daily_status WHERE day = current_dt AND status LIKE 'On Leave%'),
            'attendanceTrend', (SELECT jsonb_build_object('labels', jsonb_agg(to_char(day, 'Dy dd')), 'present', jsonb_agg(present_count), 'absent', jsonb_agg(absent_count)) FROM aggregated_trends),
            'productivityTrend', (SELECT jsonb_build_object('labels', jsonb_agg(to_char(day, 'Dy dd')), 'hours', jsonb_agg(coalesce(round(avg_hours::numeric, 2), 0))) FROM aggregated_trends)
        )
    INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_monthly_muster_data(start_date_iso text, end_date_iso text, user_ids_array uuid[])
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    start_dt date := start_date_iso::date;
    end_dt date := end_date_iso::date;
BEGIN
    WITH user_date_matrix AS (
        SELECT u.id as user_id, u.name as user_name, u.role_id, d.day::date
        FROM public.users u 
        CROSS JOIN generate_series(start_dt, end_dt, '1 day'::interval) as d(day)
        WHERE u.id = ANY(user_ids_array)
    ),
    daily_events AS (
        SELECT user_id, "timestamp"::date as event_date, MIN(CASE WHEN type = 'check-in' THEN "timestamp" END) as first_check_in, MAX(CASE WHEN type = 'check-out' THEN "timestamp" END) as last_check_out
        FROM public.attendance_events
        WHERE "timestamp"::date BETWEEN start_dt AND end_dt AND user_id = ANY(user_ids_array)
        GROUP BY user_id, event_date
    ),
    daily_status AS (
        SELECT
            udm.user_id, udm.user_name, udm.day,
            CASE
                WHEN lr.id IS NOT NULL THEN CASE WHEN lr.day_option = 'half' THEN 'HL' ELSE 'L' END
                WHEN h.id IS NOT NULL THEN 'H'
                WHEN EXTRACT(DOW FROM udm.day) IN (0, 6) THEN 'WO'
                WHEN de.first_check_in IS NOT NULL THEN
                    CASE
                        WHEN de.last_check_out IS NULL AND udm.day = end_dt THEN 'P'
                        WHEN de.last_check_out IS NULL AND udm.day < end_dt THEN 'A'
                        WHEN (EXTRACT(EPOCH FROM (de.last_check_out - de.first_check_in)) / 3600.0) >= (s.attendance_settings->(CASE WHEN udm.role_id IN ('admin', 'hr', 'finance') THEN 'office' ELSE 'field' END)->>'minimumHoursFullDay')::numeric THEN 'P'
                        WHEN (EXTRACT(EPOCH FROM (de.last_check_out - de.first_check_in)) / 3600.0) >= (s.attendance_settings->(CASE WHEN udm.role_id IN ('admin', 'hr', 'finance') THEN 'office' ELSE 'field' END)->>'minimumHoursHalfDay')::numeric THEN 'HD'
                        ELSE 'SH'
                    END
                ELSE 'A'
            END as status_code
        FROM user_date_matrix udm
        LEFT JOIN daily_events de ON udm.user_id = de.user_id AND udm.day = de.event_date
        LEFT JOIN public.leave_requests lr ON udm.user_id = lr.user_id AND lr.status = 'approved' AND udm.day BETWEEN lr.start_date AND lr.end_date
        LEFT JOIN public.holidays h ON udm.day = h.date AND h.type = CASE WHEN udm.role_id IN ('admin', 'hr', 'finance') THEN 'office' ELSE 'field' END
        CROSS JOIN public.settings s
        WHERE s.id = 'singleton'
    ),
    user_daily_statuses AS (
        SELECT
            user_id, user_name,
            jsonb_agg(jsonb_build_object('date', to_char(day, 'YYYY-MM-DD'), 'status', status_code) ORDER BY day) as daily_statuses
        FROM daily_status
        GROUP BY user_id, user_name
    )
    SELECT jsonb_agg(jsonb_build_object('userId', user_id, 'userName', user_name, 'dailyStatuses', daily_statuses))
    INTO result
    FROM user_daily_statuses;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_cost_breakdown(start_date text, end_date text) RETURNS jsonb AS $$ BEGIN RETURN '[]'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_invoice_statuses(p_month text) RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_invoice_summary_data(p_site_id text, p_month text) RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_manpower_details(site_id_param text) RETURNS jsonb AS $$ BEGIN RETURN '[]'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_manpower_details(site_id_param text, details_param jsonb) RETURNS void AS $$ BEGIN -- INSERT/UPDATE logic here
END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_all_site_assets() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_site_assets(site_id_param text, assets_param jsonb) RETURNS void AS $$ BEGIN -- INSERT/UPDATE logic here
END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_all_site_issued_tools() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_site_issued_tools(site_id_param text, tools_param jsonb) RETURNS void AS $$ BEGIN -- INSERT/UPDATE logic here
END; $$ LANGUAGE plpgsql;

-- For Uniform Management
CREATE OR REPLACE FUNCTION get_all_site_gents_uniforms() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_all_site_ladies_uniforms() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_all_site_uniform_details() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;

-- For Data Export
CREATE OR REPLACE FUNCTION export_all_data() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;

-- Grant execute permission on all functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_attendance_dashboard_data(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_muster_data(text, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_breakdown(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_statuses(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_summary_data(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_manpower_details(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_manpower_details(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_site_assets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_site_assets(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_site_issued_tools() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_site_issued_tools(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_site_gents_uniforms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_site_ladies_uniforms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_site_uniform_details() TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_all_data() TO authenticated;

-- ========= Section 6: Seed Initial Data =========

-- Seed Roles
INSERT INTO public.roles (id, display_name) VALUES
('admin', 'Admin'), ('hr', 'HR'), ('finance', 'Finance'), ('developer', 'Developer'),
('operation_manager', 'Operation Manager'), ('site_manager', 'Site Manager'),
('field_officer', 'Field Officer'), ('unverified', 'Unverified')
ON CONFLICT (id) DO NOTHING;

-- Seed Settings table with default values
INSERT INTO public.settings (id, attendance_settings, approval_workflow_settings, enrollment_rules, back_office_id_series, site_staff_designations)
VALUES (
    'singleton',
    '{"office": {"minimumHoursFullDay": 8, "minimumHoursHalfDay": 4, "annualEarnedLeaves": 5, "annualSickLeaves": 12, "monthlyFloatingLeaves": 1, "annualCompOffLeaves": 5, "enableAttendanceNotifications": false, "sickLeaveCertificateThreshold": 2}, "field": {"minimumHoursFullDay": 9, "minimumHoursHalfDay": 5, "annualEarnedLeaves": 10, "annualSickLeaves": 10, "monthlyFloatingLeaves": 0, "annualCompOffLeaves": 10, "enableAttendanceNotifications": true, "sickLeaveCertificateThreshold": 3}}',
    '{"finalConfirmationRole": "hr"}',
    '{"esiCtcThreshold": 21000, "enforceManpowerLimit": false, "manpowerLimitRule": "warn", "allowSalaryEdit": false, "salaryThreshold": 21000, "defaultPolicySingle": "1L", "defaultPolicyMarried": "2L", "enableEsiRule": false, "enableGmcRule": false, "enforceFamilyValidation": true, "rulesByDesignation": {}}',
    '[]',
    '[]'
) ON CONFLICT (id) DO NOTHING;

-- Seed App Modules
INSERT INTO public.app_modules (id, name, description, permissions) VALUES
('module_admin', 'Admin & Access Control', 'Permissions for managing users, roles, and system modules.', '{"manage_users", "manage_roles_and_permissions", "manage_modules"}'),
('module_org', 'Organization & HR Setup', 'Manage sites, clients, and rules for enrollment and attendance.', '{"manage_sites", "view_entity_management", "manage_enrollment_rules", "manage_attendance_rules"}'),
('module_submissions', 'Submissions & Verification', 'View and manage employee onboarding submissions and approval workflows.', '{"view_all_submissions", "manage_approval_workflow"}'),
('module_operations', 'Dashboards & Tracking', 'Access to various dashboards and user activity tracking.', '{"view_operations_dashboard", "view_site_dashboard", "view_field_officer_tracking"}'),
('module_billing', 'Billing & Costing', 'Permissions related to invoices and verification cost analysis.', '{"view_invoice_summary", "view_verification_costing"}'),
('module_employee', 'Employee Self-Service', 'Basic permissions for all employees.', '{"create_enrollment", "view_own_attendance", "apply_for_leave"}'),
('module_hr_tasks', 'HR Tasks & Management', 'Manage leaves, policies, insurance, uniforms, and tasks.', '{"manage_leave_requests", "manage_policies", "manage_insurance", "manage_uniforms", "manage_tasks", "view_all_attendance", "download_attendance_report"}'),
('module_system', 'System & Developer', 'Access developer settings and system configurations.', '{"view_developer_settings"}'),
('module_support', 'Support Desk', 'Access and manage support tickets.', '{"access_support_desk"}')
ON CONFLICT (id) DO NOTHING;
```

## 5. Database Functions (RPCs) - NEW SECTION

For performance-intensive calculations, it's best to use PostgreSQL functions. These can be called from the frontend via Supabase's RPC mechanism. Add the following functions to your database via the SQL Editor.

### 5.1. `get_attendance_dashboard_data`

This function aggregates all data needed for the Attendance Dashboard in a single, efficient database query, resolving performance bottlenecks and calculation bugs that can occur with client-side processing.

**SQL Definition:** 
```sql
CREATE OR REPLACE FUNCTION get_attendance_dashboard_data(start_date_iso text, end_date_iso text, current_date_iso text)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    start_dt date := start_date_iso::date;
    end_dt date := end_date_iso::date;
    current_dt date := current_date_iso::date;
BEGIN
    WITH user_date_matrix AS (
        SELECT u.id as user_id, u.role_id, d.day::date
        FROM public.users u CROSS JOIN generate_series(start_dt, end_dt, '1 day'::interval) as d(day)
    ),
    daily_events AS (
        SELECT user_id, "timestamp"::date as event_date, MIN(CASE WHEN type = 'check-in' THEN "timestamp" END) as first_check_in, MAX(CASE WHEN type = 'check-out' THEN "timestamp" END) as last_check_out
        FROM public.attendance_events
        WHERE "timestamp"::date BETWEEN start_dt AND end_dt
        GROUP BY user_id, event_date
    ),
    daily_status AS (
        SELECT
            udm.user_id, udm.day, (EXTRACT(EPOCH FROM (de.last_check_out - de.first_check_in)) / 3600.0) as work_hours,
            CASE
                WHEN lr.id IS NOT NULL THEN CASE WHEN lr.day_option = 'half' THEN 'On Leave (Half)' ELSE 'On Leave (Full)' END
                WHEN de.first_check_in IS NOT NULL THEN
                    CASE
                        WHEN de.last_check_out IS NULL THEN CASE WHEN udm.day < current_dt THEN 'Absent' ELSE 'Incomplete' END
                        WHEN (EXTRACT(EPOCH FROM (de.last_check_out - de.first_check_in)) / 3600.0) >= (s.attendance_settings->(CASE WHEN udm.role_id IN ('admin', 'hr', 'finance') THEN 'office' ELSE 'field' END)->>'minimumHoursFullDay')::numeric THEN 'Present'
                        WHEN (EXTRACT(EPOCH FROM (de.last_check_out - de.first_check_in)) / 3600.0) >= (s.attendance_settings->(CASE WHEN udm.role_id IN ('admin', 'hr', 'finance') THEN 'office' ELSE 'field' END)->>'minimumHoursHalfDay')::numeric THEN 'Half Day'
                        ELSE 'Absent'
                    END
                WHEN h.id IS NOT NULL THEN 'Holiday'
                WHEN EXTRACT(DOW FROM udm.day) = 0 THEN 'Weekend'
                ELSE 'Absent'
            END as status
        FROM user_date_matrix udm
        LEFT JOIN daily_events de ON udm.user_id = de.user_id AND udm.day = de.event_date
        LEFT JOIN public.leave_requests lr ON udm.user_id = lr.user_id AND lr.status = 'approved' AND udm.day BETWEEN lr.start_date AND lr.end_date
        LEFT JOIN public.holidays h ON udm.day = h.date AND h.type = CASE WHEN udm.role_id IN ('admin', 'hr', 'finance') THEN 'office' ELSE 'field' END
        CROSS JOIN public.settings s
        WHERE s.id = 'singleton'
    ),
    aggregated_trends AS (
        SELECT day, count(*) FILTER (WHERE status IN ('Present', 'Half Day', 'Incomplete')) as present_count, count(*) FILTER (WHERE status = 'Absent') as absent_count, avg(work_hours) FILTER (WHERE work_hours IS NOT NULL AND status IN ('Present', 'Half Day')) as avg_hours
        FROM daily_status GROUP BY day ORDER BY day
    )
    SELECT jsonb_build_object(
            'totalEmployees', (SELECT count(*) FROM public.users),
            'presentToday', (SELECT count(*) FROM daily_status WHERE day = end_dt AND status IN ('Present', 'Half Day', 'Incomplete')),
            'absentToday', (SELECT count(*) FROM daily_status WHERE day = end_dt AND status = 'Absent'),
            'onLeaveToday', (SELECT count(*) FROM daily_status WHERE day = end_dt AND status LIKE 'On Leave%'),
            'attendanceTrend', (SELECT jsonb_build_object('labels', jsonb_agg(to_char(day, 'Dy dd')), 'present', jsonb_agg(present_count), 'absent', jsonb_agg(absent_count)) FROM aggregated_trends),
            'productivityTrend', (SELECT jsonb_build_object('labels', jsonb_agg(to_char(day, 'Dy dd')), 'hours', jsonb_agg(coalesce(round(avg_hours::numeric, 2), 0))) FROM aggregated_trends)
        )
    INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### 5.2. Other RPC Functions (Placeholders)

Create the following functions in your SQL Editor. The frontend will call these; you can add the specific business logic for them later.

```sql
-- For Cost Analysis Page
CREATE OR REPLACE FUNCTION get_cost_breakdown(start_date text, end_date text) RETURNS jsonb AS $$ BEGIN RETURN '[]'::jsonb; END; $$ LANGUAGE plpgsql;

-- For Invoice Summary Page
CREATE OR REPLACE FUNCTION get_invoice_statuses(p_month text) RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_invoice_summary_data(p_site_id text, p_month text) RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;

-- For HR / Client Management
CREATE OR REPLACE FUNCTION get_manpower_details(site_id_param text) RETURNS jsonb AS $$ BEGIN RETURN '[]'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_manpower_details(site_id_param text, details_param jsonb) RETURNS void AS $$ BEGIN -- INSERT/UPDATE logic here
END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_all_site_assets() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_site_assets(site_id_param text, assets_param jsonb) RETURNS void AS $$ BEGIN -- INSERT/UPDATE logic here
END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_all_site_issued_tools() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_site_issued_tools(site_id_param text, tools_param jsonb) RETURNS void AS $$ BEGIN -- INSERT/UPDATE logic here
END; $$ LANGUAGE plpgsql;

-- For Uniform Management
CREATE OR REPLACE FUNCTION get_all_site_gents_uniforms() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_all_site_ladies_uniforms() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_all_site_uniform_details() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;

-- For Data Export
CREATE OR REPLACE FUNCTION export_all_data() RETURNS jsonb AS $$ BEGIN RETURN '{}'::jsonb; END; $$ LANGUAGE plpgsql;
```

## 6. Model-wise API & Logic Specification

This section details the required API endpoints, grouped by application module.

### 6.1. Authentication & User Profile

- **Frontend Logic:** The `useAuthStore` manages the user state. `Login.tsx`, `ForgotPassword.tsx`, and `UpdatePassword.tsx` handle auth forms. The `authService.ts` file is the mock implementation to replace. `ProfilePage.tsx` allows users to view/edit their own basic details.
- **Database Models:** `User`, `Role`.
- **API Endpoints:**
  - `POST /api/auth/login`
    - **Logic:** Find user by email. Compare provided password with stored hash using `bcrypt`. If valid, generate a JWT containing `userId` and `roleId`. Set JWT in an `HttpOnly` cookie and return the user object.
  - `POST /api/auth/google`
    - **Logic:** Handle Google OAuth flow. Use the returned email to find a `User` in your database. If found, generate JWT and proceed as with password login. If not found, return `403 Forbidden`.
  - `POST /api/auth/logout`
    - **Logic:** Clear the `HttpOnly` cookie.
  - `GET /api/auth/me`
    - **Logic:** Authenticated endpoint. Extract `userId` from JWT, retrieve user from DB, and return it.
  - `PATCH /api/auth/me`
    - **Logic:** Authenticated endpoint. Update the logged-in user's `name` and `phone`.

### 6.2. User Management

- **Frontend Logic:** `UserManagement.tsx` displays a table of users and uses a modal (`UserForm.tsx`) for create/edit operations.
- **Database Model:** `User`.
- **API Endpoints:**
  - `GET /api/users`: Returns `User[]`.
  - `POST /api/users`: Creates a new user. The frontend does not handle password creation; the body will be `Partial<User>`. The backend should set a temporary password or integrate with a "welcome email" flow.
  - `PATCH /api/users/:id`: Updates a user's details (name, role, etc.).
  - `DELETE /api/users/:id`: Deletes a user.

### 6.3. Role & Module Management

- **Frontend Logic:** `RoleManagement.tsx` and `ModuleManagement.tsx` allow admins to define roles and group permissions into modules. Changes are saved to the `usePermissionsStore` and then sent to the API.
- **Database Models:** `Role`, `AppModule`.
- **API Endpoints:**
  - `GET /api/roles`: Returns `Role[]`.
  - `PUT /api/roles`: Replaces the entire list of roles. Body: `Role[]`.
  - `GET /api/modules`: Returns `AppModule[]`.
  - `PUT /api/modules`: Replaces the entire list of modules. Body: `AppModule[]`.

### 6.4. Onboarding & Submissions

- **Frontend Logic:** This is the core workflow. `useOnboardingStore` holds the state for a single submission. The multi-step form is in `/pages/onboarding/AddEmployee.tsx` with child routes for each step. `PreUpload.tsx` uses OCR to pre-fill the store. `VerificationDashboard.tsx` is the admin view.
- **Database Model:** `OnboardingSubmission`.
- **API Endpoints:**
  - `GET /api/submissions`: Returns `OnboardingSubmission[]`. Supports `?status` and `?organizationId` query params for filtering.
  - `GET /api/submissions/:id`: Returns a single `OnboardingSubmission`.
  - `POST /api/submissions/draft`: Saves or updates a draft. The frontend sends the entire `OnboardingData` object. If the `id` in the object already exists, update it (`UPSERT`). Otherwise, create a new record and return its new `id`.
  - `POST /api/submissions`: Submits a completed form. Logic is similar to draft, but sets `status` to `'pending'`.
  - `PATCH /api/submissions/:id/verify`: Sets `status` to `'verified'` and `portalSyncStatus` to `'pending_sync'`.
  - `POST /api/submissions/:id/sync`
    - **CRITICAL LOGIC:** This must be an asynchronous, non-blocking operation.
    1.  Immediately respond with `202 Accepted`.
    2.  Add a job to a queue (e.g., BullMQ).
    3.  The background job worker will:
        a. Fetch the submission from the DB.
        b. Call external APIs (Perfios, etc.) using keys from environment variables.
        c. Log API usage by updating the `verificationUsage` JSON.
        d. Update the `verifiedStatus` fields within the `personal`, `bank`, and `uan` JSON blobs.
        e. If all verifications succeed, set `portalSyncStatus` to `'synced'`.
        f. If any verification fails, set `portalSyncStatus` to `'failed'` and revert the main `status` to `'pending'` so it reappears in the admin's queue for review.

### 6.5. Client, Site & HR Management

- **Frontend Logic:** `EntityManagement.tsx` is a complex dashboard for managing a hierarchy of Groups -> Companies -> Clients (Entities). `SiteManagement.tsx` manages Organizations (Sites), which are deployable locations linked to a Client. `PoliciesAndInsurance.tsx` and `EnrollmentRules.tsx` manage system-wide HR rules.
- **Database Models:** `OrganizationGroup`, `Company`, `Entity`, `Organization`, `SiteConfiguration`, `Policy`, `Insurance`, `Settings`.
- **API Endpoints:**
  - `GET /api/organization-structure`: Returns the full nested structure of groups, companies, and entities.
  - `GET /api/organizations`: Returns a flat list of `Organization[]` (sites).
  - `PUT /api/hr/site-configurations/:siteId`: Upsert a `SiteConfiguration` record. The body is the entire `SiteConfiguration` object, which will be stored in the `configData` JSONB column.
  - `GET /api/hr/manpower/:siteId`: Read manpower details (likely from `SiteConfiguration`).
  - `PUT /api/hr/manpower/:siteId`: Update manpower details.
  - `GET/POST /api/hr/policies`.
  - `GET/POST /api/hr/insurances`.
  - `GET/PUT /api/settings/enrollment-rules`: Read/write the `enrollmentRules` JSON from the `Settings` table.
  - `GET/PUT /api/settings/back-office-ids`, `GET/PUT /api/settings/site-staff-designations`: Similar to above, for their respective settings.

### 6.6. Attendance & Leave

- **Frontend Logic:** `AttendanceDashboard.tsx` for viewing records. `ProfilePage.tsx` for check-in/out. `LeaveDashboard.tsx` for employees to apply, and `LeaveManagement.tsx` for managers/HR to approve.
- **Database Models:** `AttendanceEvent`, `LeaveRequest`, `User` (for `reportingManagerId`), `ExtraWorkLog`.
- **API Endpoints:**
  - `GET /api/attendance/events`: Fetches events for a specific user and date range.
  - `POST /api/attendance/events`: Creates a new check-in/out event.
  - `GET /api/leaves/requests`: A flexible endpoint. If `forApproverId` is passed, it returns requests where `currentApproverId` matches. If `userId` is passed, it returns requests for that employee.
  - `POST /api/leaves/requests/:id/approve`:
    - **Logic:** Find the request. Find the requester's `reportingManagerId`. If the current approver is the manager, update `currentApproverId` to the HR user's ID and set status to `'pending_hr_confirmation'`. If the current approver is HR, set status to `'approved'` and `currentApproverId` to null.
  - All other leave endpoints are straightforward CRUD.

### 6.7. Billing & Costing

- **Frontend Logic:** `InvoiceSummary.tsx` generates monthly invoices per site. `CostAnalysis.tsx` aggregates API usage costs.
- **Database Models:** `OnboardingSubmission`, `Settings`.
- **API Endpoints:**
  - `GET /api/billing/cost-analysis`:
    - **Logic:** Query `OnboardingSubmission` within the date range. For each submission, read the `verificationUsage` JSON blob. Aggregate the counts for each verification type. Fetch costs from the `verificationCosts` JSON in the `Settings` table. Combine and return the final report.
  - `GET /api/billing/invoice-summary/:siteId`:
    - **Logic:** This is a complex report. It needs to calculate active manpower for the month, apply billing rates, and generate line items. The logic should be derived from the frontend's calculation in `InvoiceSummary.tsx`.

### 6.8. AI & Utilities

- **Frontend Logic:** `PreUpload.tsx` and various `UploadDocument` components call these endpoints.
- **Database Models:** None.
- **API Endpoints:**
  - `POST /api/utils/ocr/extract`
    - **Logic:**
      1.  This is a secure, backend-only endpoint.
      2.  Load the Gemini API key from `process.env.API_KEY`.
      3.  Receive `imageBase64`, `mimeType`, and `schema` from the request body.
      4.  Use `new GoogleGenAI({ apiKey: process.env.API_KEY })`.
      5.  Call `ai.models.generateContent` with the model, image part, text prompt (if any), and a `config` object containing `responseMimeType: "application/json"` and the provided `responseSchema`.
      6.  The response's `.text` property will be a JSON string. Parse it and return the resulting object to the client.
      7.  Implement robust error handling for API failures.
  - `POST /api/utils/ocr/enhance`: Similar to above, but using an image-to-image model or prompt.
  - `POST /api/utils/verify/names`: Can use a simple string-similarity library or another AI call to compare two names.

This comprehensive guide covers all aspects requested. By following it, your backend team will be able to build a server that is a perfect one-to-one replacement for the mock API, ensuring a smooth and successful project completion.