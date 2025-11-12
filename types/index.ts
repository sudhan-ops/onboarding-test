import type { ComponentType } from 'react';

export type UserRole = string;

export interface Role {
  id: string;
  displayName: string;
}

export type Permission =
  | 'view_all_submissions'
  | 'manage_users'
  | 'manage_sites'
  | 'view_entity_management'
  | 'view_developer_settings'
  | 'view_operations_dashboard'
  | 'view_site_dashboard'
  | 'create_enrollment'
  | 'manage_roles_and_permissions'
  | 'manage_attendance_rules'
  | 'view_own_attendance'
  | 'view_all_attendance'
  | 'apply_for_leave'
  | 'manage_leave_requests'
  | 'manage_approval_workflow'
  | 'download_attendance_report'
  | 'manage_tasks'
  | 'manage_policies'
  | 'manage_insurance'
  | 'manage_enrollment_rules'
  | 'manage_uniforms'
  | 'view_invoice_summary'
  | 'view_verification_costing'
  | 'view_field_officer_tracking'
  | 'manage_modules'
  | 'access_support_desk';

export interface AppModule {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface Organization {
    id: string;
    shortName: string;
    fullName: string;
    address: string;
    manpowerApprovedCount?: number;
    provisionalCreationDate?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    organizationId?: string; 
    organizationName?: string;
    reportingManagerId?: string;
    photoUrl?: string;
}

export interface UploadedFile {
    name: string;
    type: string;
    size: number;
    preview: string;
    url?: string;
    path?: string | null; // Path in Supabase storage bucket
    file?: File;
    progress?: number;
}

export interface PersonalDetails {
    employeeId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    preferredName?: string;
    dob: string;
    gender: 'Male' | 'Female' | 'Other' | '';
    maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed' | '';
    bloodGroup: '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    mobile: string;
    alternateMobile?: string;
    email: string;
    idProofType?: 'Aadhaar' | 'PAN' | 'Voter ID' | '';
    idProofNumber?: string;
    photo?: UploadedFile | null;
    idProofFront?: UploadedFile | null;
    idProofBack?: UploadedFile | null;
    emergencyContactName: string;
    emergencyContactNumber: string;
    relationship: 'Spouse' | 'Child' | 'Father' | 'Mother' | 'Sibling' | 'Other' | '';
    salary: number | null;
    verifiedStatus?: {
        name?: boolean | null;
        dob?: boolean | null;
        idProofNumber?: boolean | null;
    };
}

export interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    verifiedStatus?: {
        line1?: boolean | null;
        city?: boolean | null;
        state?: boolean | null;
        pincode?: boolean | null;
        country?: boolean | null;
    };
}

export interface AddressDetails {
    present: Address;
    permanent: Address;
    sameAsPresent: boolean;
}

export interface FamilyMember {
    id: string;
    relation: 'Spouse' | 'Child' | 'Father' | 'Mother' | '';
    name: string;
    dob: string;
    gender: 'Male' | 'Female' | 'Other' | '';
    occupation?: string;
    dependent: boolean;
    idProof: UploadedFile | null;
    phone?: string;
}

export interface EducationRecord {
    id: string;
    degree: string;
    institution: string;
    startYear: string;
    endYear: string;
    percentage?: number | null;
    grade?: string;
    document?: UploadedFile | null;
}

export interface BankDetails {
    accountHolderName: string;
    accountNumber: string;
    confirmAccountNumber: string;
    ifscCode: string;
    bankName: string;
    branchName: string;
    bankProof?: UploadedFile | null;
    verifiedStatus?: {
        accountHolderName?: boolean | null;
        accountNumber?: boolean | null;
        ifscCode?: boolean | null;
    };
}

export interface UanDetails {
    uanNumber?: string;
    pfNumber?: string;
    hasPreviousPf: boolean;
    document?: UploadedFile | null;
    salarySlip?: UploadedFile | null;
    verifiedStatus?: {
        uanNumber?: boolean | null;
    };
}

export interface EsiDetails {
    esiNumber?: string;
    esiRegistrationDate?: string;
    esicBranch?: string;
    hasEsi: boolean;
    document?: UploadedFile | null;
    verifiedStatus?: {
        esiNumber?: boolean | null;
    };
}

export interface GmcDetails {
    isOptedIn: boolean | null;
    policyAmount?: '1L' | '2L' | '';
    nomineeName?: string;
    nomineeRelation?: 'Spouse' | 'Child' | 'Father' | 'Mother' | '';
    wantsToAddDependents?: boolean;
    selectedSpouseId?: string;
    selectedChildIds?: string[];
    gmcPolicyCopy?: UploadedFile | null;
    declarationAccepted?: boolean;
    optOutReason?: string;
    alternateInsuranceProvider?: string;
    alternateInsuranceStartDate?: string;
    alternateInsuranceEndDate?: string;
    alternateInsuranceCoverage?: string;
}

export interface OrganizationDetails {
    designation: string;
    department: string;
    reportingManager: string;
    organizationId: string;
    organizationName: string;
    joiningDate: string;
    workType: 'Full-time' | 'Part-time' | 'Contract' | '';
    site?: string;
    defaultSalary?: number | null;
}

export interface EmployeeUniformSelection {
  itemId: string; // From UniformItem.id
  itemName: string; // From UniformItem.name
  sizeId: string; // From MasterGents/LadiesUniforms.pants/shirts[].id
  sizeLabel: string; // e.g., "32" or "L"
  fit: string; // e.g., "Regular Fit"
  quantity: number;
}

export interface SalaryChangeRequest {
  id: string;
  onboardingId: string;
  employeeName: string;
  siteName: string;
  requestedBy: string; // userId
  requestedByName: string;
  requestedAt: string; // ISO string
  originalAmount: number;
  requestedAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvedBy?: string; // userId
  approvedAt?: string;
  rejectionReason?: string;
}

export interface Fingerprints {
  leftThumb: UploadedFile | null;
  leftIndex: UploadedFile | null;
  leftMiddle: UploadedFile | null;
  leftRing: UploadedFile | null;
  leftLittle: UploadedFile | null;
  rightThumb: UploadedFile | null;
  rightIndex: UploadedFile | null;
  rightMiddle: UploadedFile | null;
  rightRing: UploadedFile | null;
  rightLittle: UploadedFile | null;
}

export interface BiometricsData {
  signatureImage: UploadedFile | null;
  fingerprints: Fingerprints;
}

export interface OnboardingData {
    id?: string;
    status: 'draft' | 'pending' | 'verified' | 'rejected';
    portalSyncStatus?: 'pending_sync' | 'synced' | 'failed';
    organizationId?: string;
    organizationName?: string;
    enrollmentDate: string;
    personal: PersonalDetails;
    address: AddressDetails;
    family: FamilyMember[];
    education: EducationRecord[];
    bank: BankDetails;
    uan: UanDetails;
    esi: EsiDetails;
    gmc: GmcDetails;
    organization: OrganizationDetails;
    uniforms: EmployeeUniformSelection[];
    biometrics: BiometricsData;
    salaryChangeRequest?: SalaryChangeRequest | null;
    requiresManualVerification?: boolean;
    formsGenerated?: boolean;
    verificationUsage?: VerificationUsageItem[];
}

export type OnboardingStep = 'personal' | 'address' | 'organization' | 'family' | 'education' | 'bank' | 'uan' | 'esi' | 'gmc' | 'uniform' | 'biometrics' | 'documents' | 'review';

export interface EmailSettings {
  // SMTP settings are now managed on the backend for security.
}

export interface SiteManagementSettings {
    enableProvisionalSites: boolean;
}

export interface AddressSettings {
    enablePincodeVerification: boolean;
}

export interface GmcPolicySettings {
  applicability: 'Mandatory' | 'Optional - Opt-in Default' | 'Optional - Opt-out Default';
  optInDisclaimer: string;
  coverageDetails: string;
  optOutDisclaimer: string;
  requireAlternateInsurance: boolean;
  collectProvider: boolean;
  collectStartDate: boolean;
  collectEndDate: boolean;
  collectExtentOfCover: boolean;
}

export interface DocumentRules {
  aadhaar: boolean;
  pan: boolean;
  bankProof: boolean;
  educationCertificate: boolean;
  salarySlip: boolean;
  uanProof: boolean;
  familyAadhaar: boolean;
}

export interface VerificationRules {
  requireBengaluruAddress: boolean;
  requireDobVerification: boolean;
}

export interface EnrollmentRules {
  esiCtcThreshold: number;
  enforceManpowerLimit: boolean;
  manpowerLimitRule: 'warn' | 'block';
  allowSalaryEdit?: boolean;
  salaryThreshold: number;
  defaultPolicySingle: '1L' | '2L';
  defaultPolicyMarried: '1L' | '2L';
  enableEsiRule: boolean;
  enableGmcRule: boolean;
  enforceFamilyValidation?: boolean;
  rulesByDesignation: {
    [designation: string]: {
      documents: DocumentRules;
      verifications: VerificationRules;
    };
  };
}

export interface OtpSettings {
  enabled: boolean;
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
  };
}

// Types for Entity Management
export type RegistrationType = 'CIN' | 'ROC' | 'ROF' | 'Society' | 'Trust' | '';

export interface Entity {
  id: string;
  name: string;
  organizationId?: string;
  location?: string;
  registeredAddress?: string;
  registrationType?: RegistrationType;
  registrationNumber?: string;
  gstNumber?: string | null;
  panNumber?: string | null;
  email?: string;
  eShramNumber?: string;
  shopAndEstablishmentCode?: string;
  epfoCode?: string;
  esicCode?: string;
  psaraLicenseNumber?: string;
  psaraValidTill?: string | null;
  insuranceIds?: string[];
  policyIds?: string[];
}

export interface Company {
  id: string;
  name: string;
  entities: Entity[];
}

export interface OrganizationGroup {
  id: string;
  name: string; // e.g., "Paradigm Group"
  locations: string[];
  companies: Company[];
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
}

export type InsuranceType = 'GMC' | 'GPA' | 'WCA' | 'Other';
export interface Insurance {
  id: string;
  type: InsuranceType;
  provider: string;
  policyNumber: string;
  validTill: string;
}

export interface HolidayListItem {
  id: string;
  date: string;
  description: string;
}

export interface ToolListItem {
  id: string;
  name: string;
  brand: string;
  size: string;
  quantity: number | null;
  issueDate: string;
  picture?: UploadedFile | null;
}

export interface SimDetail {
  id: string;
  mobileNumber: string;
  allocatedTo?: string;
  plan?: string;
  ownerName?: string;
}

export interface IssuedEquipment {
  id: string;
  name: string;
  brand: string;
  modelNumber: string;
  serialNumber: string;
  accessories: string;
  condition: 'New' | 'Old' | '';
  issueDate: string;
  picture?: UploadedFile | null;
}

export interface InsurancePolicyDetails {
  policyNumber: string;
  provider: string;
  validFrom: string;
  validTo: string;
  document?: UploadedFile | null;
}

export interface SiteInsuranceStatus {
  isCompliant: boolean;
  gpa?: InsurancePolicyDetails;
  gmcGhi?: InsurancePolicyDetails;
  gtl?: InsurancePolicyDetails;
  wc?: InsurancePolicyDetails;
}

export interface IssuedTool {
  id: string;
  department: string;
  name: string;
  quantity: number | null;
  picture?: UploadedFile | null;
  inwardDcCopy?: UploadedFile | null;
  deliveryCopy?: UploadedFile | null;
  invoiceCopy?: UploadedFile | null;
  receiverName?: string;
  signedReceipt?: UploadedFile | null;
}

export interface SiteConfiguration {
  organizationId: string;
  entityId?: string;
  location?: string | null;
  billingName?: string | null;
  registeredAddress?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  email1?: string | null;
  email2?: string | null;
  email3?: string | null;
  eShramNumber?: string | null;
  shopAndEstablishmentCode?: string | null;
  keyAccountManager?: string | null;
  siteAreaSqFt?: number | null;
  projectType?: 'Apartment' | 'Villa' | 'Vilament' | 'Rowhouse' | 'Combined' | 'Commercial Office' | 'Commercial Retail' | 'Commercial' | 'Public' | '';
  apartmentCount?: number | null;
  agreementDetails?: {
    fromDate?: string | null;
    toDate?: string | null;
    renewalIntervalDays?: number | null;
    softCopy?: UploadedFile | null;
    scannedCopy?: UploadedFile | null;
    agreementDate?: string | null;
    addendum1Date?: string | null;
    addendum2Date?: string | null;
  };
  siteOperations?: {
    form6Applicable: boolean;
    form6RenewalTaskCreation?: boolean;
    form6ValidityFrom?: string | null;
    form6ValidityTo?: string | null;
    form6Document?: UploadedFile | null;

    minWageRevisionApplicable: boolean;
    minWageRevisionTaskCreation?: boolean;
    minWageRevisionValidityFrom?: string | null;
    minWageRevisionValidityTo?: string | null;
    minWageRevisionDocument?: UploadedFile | null;

    holidays?: {
      numberOfDays?: number | null;
      list?: HolidayListItem[];
      salaryPayment?: 'Full Payment' | 'Duty Payment' | 'Nil Payment' | '';
      billing?: 'Full Payment' | 'Duty Payment' | 'Nil Payment' | '';
    };
    
    costingSheetLink?: string | null;
    
    tools?: {
      dcCopy1?: UploadedFile | null;
      dcCopy2?: UploadedFile | null;
      list?: ToolListItem[];
    };

    sims?: {
      issuedCount?: number | null;
      details?: SimDetail[];
    };

    equipment?: {
      issued?: IssuedEquipment[];
      intermittent?: {
        billing: 'To Be Billed' | 'Not to be Billed' | '';
        frequency: 'Monthly' | 'Bi-Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly' | '';
        taskCreation?: boolean;
        durationDays?: number | null;
      };
    };

    billingCycleFrom?: string | null;
    uniformDeductions: boolean;
  };
  insuranceStatus?: SiteInsuranceStatus;
  assets?: Asset[];
  issuedTools?: IssuedTool[];
}

export interface Agreement {
  id: string;
  name: string;
  fromDate?: string;
  toDate?: string;
  renewalIntervalDays?: number | null;
  softCopy?: UploadedFile | null;
  scannedCopy?: UploadedFile | null;
  agreementDate?: string;
  addendum1Date?: string;
  addendum2Date?: string;
}


// Types for Attendance
export type AttendanceEventType = 'check-in' | 'check-out';

export interface AttendanceEvent {
    id: string;
    userId: string;
    timestamp: string; // ISO String
    type: AttendanceEventType;
    latitude?: number;
    longitude?: number;
}

export interface StaffAttendanceRules {
    minimumHoursFullDay: number;
    minimumHoursHalfDay: number;
    annualEarnedLeaves: number;
    annualSickLeaves: number;
    monthlyFloatingLeaves: number;
    annualCompOffLeaves: number;
    enableAttendanceNotifications: boolean;
    sickLeaveCertificateThreshold: number;
}

export interface AttendanceSettings {
    office: StaffAttendanceRules;
    field: StaffAttendanceRules;
}

export interface Holiday {
    id: string;
    date: string; // YYYY-MM-DD
    name: string;
    type: 'office' | 'field';
}

export type DailyAttendanceStatus = 'Present' | 'Half Day' | 'Absent' | 'Holiday' | 'Weekend' | 'Incomplete' | 'On Leave (Full)' | 'On Leave (Half)';

export interface DailyAttendanceRecord {
    date: string; // YYYY-MM-DD
    day: string; // 'Monday', etc.
    checkIn: string | null; // "HH:mm"
    checkOut: string | null; // "HH:mm"
    duration: string | null; // "HHh MMm"
    status: DailyAttendanceStatus;
}

// Types for Leave Management
export type LeaveType = 'Earned' | 'Sick' | 'Floating' | 'Comp Off';
export type LeaveRequestStatus = 'pending_manager_approval' | 'pending_hr_confirmation' | 'approved' | 'rejected';

export interface ApprovalRecord {
    approverId: string;
    approverName: string;
    status: 'approved' | 'rejected';
    timestamp: string;
    comments?: string;
}

export interface CompOffLog {
  id: string;
  userId: string;
  userName?: string;
  dateEarned: string; // YYYY-MM-DD
  reason: string;
  status: 'earned' | 'used' | 'expired';
  leaveRequestId?: string | null;
  grantedById?: string;
  grantedByName?: string;
}

export interface LeaveBalance {
    userId: string;
    [key: string]: number | string; // To allow indexing with a string
    earnedTotal: number;
    earnedUsed: number;
    sickTotal: number;
    sickUsed: number;
    floatingTotal: number;
    floatingUsed: number;
    compOffTotal: number;
    compOffUsed: number;
    otHoursThisMonth: number;
}

export interface LeaveRequest {
    id: string;
    userId: string;
    userName: string;
    leaveType: LeaveType;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    reason: string;
    status: LeaveRequestStatus;
    dayOption?: 'full' | 'half'; // only for single-day earned leave
    currentApproverId: string | null;
    approvalHistory: ApprovalRecord[];
    doctorCertificate?: UploadedFile | null;
}

export interface ExtraWorkLog {
  id: string;
  userId: string;
  userName: string;
  workDate: string; // YYYY-MM-DD
  workType: 'Holiday' | 'Week Off' | 'Night Shift';
  claimType: 'OT' | 'Comp Off';
  hoursWorked?: number | null;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approverId?: string | null;
  approverName?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

// Types for Task Management
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'To Do' | 'In Progress' | 'Done';
export type EscalationStatus = 'None' | 'Level 1' | 'Level 2' | 'Email Sent';

export interface Task {
    id: string;
    name: string;
    description?: string;
    dueDate?: string | null;
    priority: TaskPriority;
    status: TaskStatus;
    createdAt: string; // ISO String
    assignedToId?: string;
    assignedToName?: string;
    completionNotes?: string;
    completionPhoto?: UploadedFile | null;
    escalationStatus: EscalationStatus;
    escalationLevel1UserId?: string;
    escalationLevel1DurationDays?: number;
    escalationLevel2UserId?: string;
    escalationLevel2DurationDays?: number;
    escalationEmail?: string;
    escalationEmailDurationDays?: number;
}

// Types for Notifications
export type NotificationType = 'task_assigned' | 'task_escalated' | 'provisional_site_reminder';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string; // ISO String
  linkTo?: string; // e.g., '/tasks'
}

// Manpower Details Type
export interface ManpowerDetail {
  designation: string;
  count: number;
}

// Back Office ID Series Type
export interface BackOfficeIdSeries {
  id: string;
  department: string;
  designation: string;
  permanentId: string;
  temporaryId: string;
}

// Site Staff Designation Type
export interface SiteStaffDesignation {
  id: string;
  department: string;
  designation: string;
  permanentId: string;
  temporaryId: string;
  monthlySalary?: number | null;
}

export interface SiteStaff {
  id: string;
  siteId: string;
  name: string;
  employeeCode: string;
  designation: string;
}

// Asset Management Types
export type AssetCondition = 'New' | 'Used' | '';
export type DamageStatus = 'With Damages' | 'Without Damages' | '';

export interface PhoneAsset {
  id: string;
  type: 'Phone';
  brand: string | null;
  condition: AssetCondition | null;
  chargerStatus: 'With Charger' | 'Without Charger' | '' | null;
  displayStatus: DamageStatus | null;
  bodyStatus: DamageStatus | null;
  imei: string | null;
  color: string | null;
  picture?: UploadedFile | null;
}

export interface SimAsset {
  id: string;
  type: 'Sim';
  number: string | null;
}

export interface ComputerAsset {
  id: string;
  type: 'Computer';
  computerType: 'Laptop' | 'Desktop' | 'Tab' | '' | null;
  brand: string | null;
  condition: AssetCondition | null;
  bagStatus: 'With Bag' | 'Without Bag' | '' | null;
  mouseStatus: 'With Mouse' | 'Without Mouse' | '' | null;
  chargerStatus: 'With Charger' | 'Without Charger' | '' | null;
  displayStatus: DamageStatus | null;
  bodyStatus: DamageStatus | null;
  serialNumber: string | null;
  windowsKey: string | null;
  officeStatus: 'With Office' | 'Without Office' | '' | null;
  antivirusStatus: 'With Antivirus' | 'Without Antivirus' | '' | null;
  picture?: UploadedFile | null;
}

export interface IdCardAsset {
  id: string;
  type: 'IdCard';
  issueDate: string | null;
}

export interface PetrocardAsset {
  id: string;
  type: 'Petrocard';
  number: string | null;
}

export interface VehicleAsset {
  id: string;
  type: 'Vehicle';
  vehicleType: 'Bicycle' | 'Two Wheeler' | 'Three Wheeler' | 'Four Wheeler' | '' | null;
  brand: string | null;
  dlNumber: string | null;
  dlFrontPic?: UploadedFile | null;
  dlBackPic?: UploadedFile | null;
  condition: AssetCondition | null;
  kmsAtIssue: number | null;
  vehicleNumber: string | null;
  chassisNumber: string | null;
  insuranceValidity: string | null;
  pollutionCertValidity: string | null;
  finesStatus: 'Existing' | 'Nil' | '' | null;
  picture?: UploadedFile | null;
}

export interface ToolAssetItem {
    id: string;
    name: string | null;
    description: string | null;
    quantity: number | null;
}

export interface ToolsAsset {
    id:string;
    type: 'Tools';
    toolList: ToolAssetItem[] | null;
    picture?: UploadedFile | null;
}

export interface OtherAsset {
  id: string;
  type: 'Other';
  name: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  condition: AssetCondition | null;
  issueCondition: string | null;
  accessories: string | null;
  picture?: UploadedFile | null;
}

export type Asset = PhoneAsset | SimAsset | ComputerAsset | IdCardAsset | PetrocardAsset | VehicleAsset | ToolsAsset | OtherAsset;

// Types for Master Tools List
export interface MasterTool {
  id: string;
  name: string;
}

export type MasterToolsList = {
  [category: string]: MasterTool[];
};

// Types for Gents Uniform Chart
export interface GentsPantsSize {
  id: string;
  size: string;
  length: number;
  waist: number;
  hip: number;
  tilesLoose: number;
  bottomWaist: number;
  fit: 'Slim Fit' | 'Regular Fit' | 'Plump Fit';
}

export interface GentsShirtSize {
  id: string;
  size: string;
  length: number;
  sleeves: number;
  sleevesLoose: number;
  chest: number;
  halfChestLoose: number;
  shoulder: number;
  collar: number;
  fit: 'Slim Fit' | 'Regular Fit' | 'Plump Fit';
}

export interface MasterGentsUniforms {
    pants: GentsPantsSize[];
    shirts: GentsShirtSize[];
}

export interface UniformDesignationConfig {
  id: string;
  designation: string;
  pantsQuantities: Record<string, number | null>; // key is GentsPantsSize id
  shirtsQuantities: Record<string, number | null>; // key is GentsShirtSize id
}

export interface UniformDepartmentConfig {
  id: string;
  department: string;
  designations: UniformDesignationConfig[];
}

export interface SiteGentsUniformConfig {
  organizationId: string;
  departments: UniformDepartmentConfig[];
}

// Types for Ladies Uniform Chart
export interface LadiesPantsSize {
  id: string;
  size: string;
  length: number;
  waist: number;
  hip: number;
  fit: 'Slim Fit' | 'Regular Fit' | 'Comfort Fit';
}

export interface LadiesShirtSize {
  id: string;
  size: string;
  length: number;
  sleeves: number;
  bust: number;
  shoulder: number;
  fit: 'Slim Fit' | 'Regular Fit' | 'Comfort Fit';
}

export interface MasterLadiesUniforms {
    pants: LadiesPantsSize[];
    shirts: LadiesShirtSize[];
}

export interface LadiesUniformDesignationConfig {
  id:string;
  designation: string;
  pantsQuantities: Record<string, number | null>; // key is LadiesPantsSize id
  shirtsQuantities: Record<string, number | null>; // key is LadiesShirtSize id
}

export interface LadiesUniformDepartmentConfig {
  id: string;
  department: string;
  designations: LadiesUniformDesignationConfig[];
}

export interface SiteLadiesUniformConfig {
  organizationId: string;
  departments: LadiesUniformDepartmentConfig[];
}

// Types for Uniform Details
export interface UniformItem {
  id: string;
  name: string;
}

export interface UniformDetailDesignation {
  id: string;
  designation: string;
  items: UniformItem[];
}

export interface UniformDetailDepartment {
  id: string;
  department: string;
  designations: UniformDetailDesignation[];
}

export interface SiteUniformDetailsConfig {
  organizationId: string;
  departments: UniformDetailDepartment[];
}

// Types for Billing & Invoicing
export interface InvoiceLineItem {
  id: string;
  description: string;
  deployment: number;
  noOfDays: number;
  ratePerDay: number;
  ratePerMonth: number;
}

export interface InvoiceData {
  siteName: string;
  siteAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  statementMonth: string;
  lineItems: InvoiceLineItem[];
}

export interface BillingRates {
    [designation: string]: {
        ratePerDay: number;
        ratePerMonth: number;
    }
}

export interface PerfiosApiSettings {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
}

export interface GeminiApiSettings {
  enabled: boolean;
}

export interface VerificationResult {
    success: boolean;
    message: string;
    verifiedFields: {
        name: boolean | null;
        dob: boolean | null;
        aadhaar: boolean | null;
        bank: boolean | null;
        uan: boolean | null;
        esi: boolean | null;
        // Fix: Add optional fields for detailed bank verification
        accountHolderName?: boolean | null;
        accountNumber?: boolean | null;
        ifscCode?: boolean | null;
    };
}

export interface PerfiosVerificationData {
    name: string;
    dob: string;
    aadhaar: string | null;
    pan: string | null;
    bank: {
        accountNumber: string;
        ifsc: string;
    };
    uan: string | null;
    esi: string | null;
}

// Types for Uniform Management
export interface UniformRequestItem {
  sizeId: string;
  sizeLabel: string;
  fit: string;
  category: 'Pants' | 'Shirts';
  quantity: number;
}

export interface UniformRequest {
  id: string;
  siteId: string;
  siteName: string;
  gender: 'Gents' | 'Ladies';
  requestedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Issued';
  items: UniformRequestItem[];
  source?: 'Bulk' | 'Enrollment' | 'Individual';
  requestedById?: string;
  requestedByName?: string;
  employeeDetails?: {
    employeeName: string;
    employeeId: string;
    items: {
      itemName: string;
      sizeLabel: string;
      fit: string;
      quantity: number;
    }[];
  }[];
}


// Types for Verification Costing
export interface VerificationCostSetting {
  id: string;
  name: string;
  cost: number;
}

export type VerificationCosts = VerificationCostSetting[];

export interface VerificationUsageItem {
  name: string;
  count: number;
  cost?: number; // Calculated on the frontend
}

export interface SubmissionCostBreakdown {
  id: string;
  employeeId: string;
  employeeName: string;
  enrollmentDate: string;
  totalCost: number;
  breakdown: VerificationUsageItem[];
}

// Types for Support Desk
export interface TicketComment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string; // ISO String
}

export interface TicketPost {
    id: string;
    ticketId: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    content: string;
    createdAt: string; // ISO String
    likes: string[]; // Array of user IDs
    comments: TicketComment[];
}

export interface SupportTicket {
    id: string;
    ticketNumber: string;
    title: string;
    description: string;
    category: 'Software Developer' | 'Admin' | 'Operational' | 'HR Query' | 'Other';
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    status: 'Open' | 'In Progress' | 'Pending Requester' | 'Resolved' | 'Closed';
    raisedById: string;
    raisedByName: string;
    raisedAt: string; // ISO String
    assignedToId: string | null;
    assignedToName: string | null;
    resolvedAt: string | null;
    closedAt: string | null;
    rating: number | null;
    feedback: string | null;
    attachmentUrl?: string | null;
    posts: TicketPost[];
}