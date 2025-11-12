import { create } from 'zustand';
import type { OnboardingData, PersonalDetails, AddressDetails, FamilyMember, EducationRecord, BankDetails, UanDetails, EsiDetails, GmcDetails, OrganizationDetails, EmployeeUniformSelection, Address, SalaryChangeRequest, BiometricsData, VerificationUsageItem } from '../types';
import { differenceInYears, format } from 'date-fns';

interface OnboardingState {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  updatePersonal: (personal: Partial<PersonalDetails>) => void;
  setPersonalVerifiedStatus: (status: Partial<PersonalDetails['verifiedStatus']>) => void;
  updateAddress: (address: Partial<AddressDetails>) => void;
  setAddressVerifiedStatus: (type: 'present' | 'permanent', status: Partial<Address['verifiedStatus']>) => void;
  updateFamily: (family: FamilyMember[]) => void;
  updateEducation: (education: EducationRecord[]) => void;
  updateBank: (bank: Partial<BankDetails>) => void;
  setBankVerifiedStatus: (status: Partial<BankDetails['verifiedStatus']>) => void;
  updateUan: (uan: Partial<UanDetails>) => void;
  setUanVerifiedStatus: (status: Partial<UanDetails['verifiedStatus']>) => void;
  updateEsi: (esi: Partial<EsiDetails>) => void;
  setEsiVerifiedStatus: (status: Partial<EsiDetails['verifiedStatus']>) => void;
  updateGmc: (gmc: Partial<GmcDetails>) => void;
  updateOrganization: (org: Partial<OrganizationDetails>) => void;
  updateUniforms: (uniforms: EmployeeUniformSelection[]) => void;
  updateBiometrics: (biometrics: Partial<BiometricsData>) => void;
  setSalaryChangeRequest: (request: SalaryChangeRequest | null) => void;
  setRequiresManualVerification: (requires: boolean) => void;
  setFormsGenerated: (generated: boolean) => void;
  logVerificationUsage: (serviceName: string) => void;
  reset: () => void;
  addFamilyMember: () => void;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => void;
  removeFamilyMember: (id: string) => void;
  addEducationRecord: () => void;
  updateEducationRecord: (id: string, updates: Partial<EducationRecord>) => void;
  removeEducationRecord: (id: string) => void;
  addOrUpdateEmergencyContactAsFamilyMember: () => void;
}

const getInitialState = (): OnboardingData => ({
  id: `draft_${Date.now()}`,
  status: 'draft',
  enrollmentDate: new Date().toISOString().split('T')[0],
  personal: {
    employeeId: `PARA-${Math.floor(1000 + Math.random() * 9000)}`,
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    maritalStatus: '',
    bloodGroup: '',
    mobile: '',
    alternateMobile: '',
    email: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    relationship: '',
    salary: null,
    verifiedStatus: {},
  },
  address: {
    present: { line1: '', city: '', state: '', country: 'India', pincode: '', verifiedStatus: { country: true } },
    permanent: { line1: '', city: '', state: '', country: 'India', pincode: '', verifiedStatus: { country: true } },
    sameAsPresent: true,
  },
  family: [],
  education: [],
  bank: {
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    verifiedStatus: {},
  },
  uan: { hasPreviousPf: false, verifiedStatus: {}, salarySlip: null },
  esi: { hasEsi: false, verifiedStatus: {} },
  gmc: {
    isOptedIn: null,
    policyAmount: '',
    nomineeName: '',
    nomineeRelation: '',
    selectedSpouseId: '',
    selectedChildIds: [],
    gmcPolicyCopy: null,
    declarationAccepted: false,
  },
  organization: {
    designation: '',
    department: '',
    reportingManager: '',
    organizationId: '',
    organizationName: '',
    joiningDate: format(new Date(), 'yyyy-MM-dd'),
    workType: 'Full-time',
    defaultSalary: null,
  },
  uniforms: [],
  biometrics: {
    signatureImage: null,
    fingerprints: {
      leftThumb: null, leftIndex: null, leftMiddle: null, leftRing: null, leftLittle: null,
      rightThumb: null, rightIndex: null, rightMiddle: null, rightRing: null, rightLittle: null,
    }
  },
  salaryChangeRequest: null,
  requiresManualVerification: false,
  formsGenerated: false,
  verificationUsage: [],
});

// Fix: Removed generic type argument from create() to avoid untyped function call error.
export const useOnboardingStore = create<OnboardingState>((set) => ({
      data: getInitialState(),
      setData: (data) => set({ data }),
      updatePersonal: (personalUpdate) => set((state) => ({
        data: {
          ...state.data,
          personal: { ...state.data.personal, ...personalUpdate },
        },
      })),
      setPersonalVerifiedStatus: (status) => set((state) => ({ data: { ...state.data, personal: { ...state.data.personal, verifiedStatus: { ...state.data.personal.verifiedStatus, ...status } } } })),
      updateAddress: (address) => set((state) => ({ data: { ...state.data, address: { ...state.data.address, ...address } } })),
      setAddressVerifiedStatus: (type, status) => set((state) => ({
        data: {
            ...state.data,
            address: {
                ...state.data.address,
                [type]: {
                    ...state.data.address[type],
                    verifiedStatus: {
                        ...state.data.address[type].verifiedStatus,
                        ...status,
                    },
                },
            },
        },
      })),
      updateFamily: (family) => set((state) => ({
        data: {
          ...state.data,
          family,
        },
      })),
      updateEducation: (education) => set((state) => ({ data: { ...state.data, education } })),
      updateBank: (bank) => set((state) => ({ data: { ...state.data, bank: { ...state.data.bank, ...bank } } })),
      setBankVerifiedStatus: (status) => set((state) => ({ data: { ...state.data, bank: { ...state.data.bank, verifiedStatus: { ...state.data.bank.verifiedStatus, ...status } } } })),
      updateUan: (uan) => set((state) => ({ data: { ...state.data, uan: { ...state.data.uan, ...uan } } })),
      setUanVerifiedStatus: (status) => set((state) => ({ data: { ...state.data, uan: { ...state.data.uan, verifiedStatus: { ...state.data.uan.verifiedStatus, ...status } } } })),
      updateEsi: (esi) => set((state) => ({ data: { ...state.data, esi: { ...state.data.esi, ...esi } } })),
      setEsiVerifiedStatus: (status) => set((state) => ({ data: { ...state.data, esi: { ...state.data.esi, verifiedStatus: { ...state.data.esi.verifiedStatus, ...status } } } })),
      updateGmc: (gmc) => set((state) => ({ data: { ...state.data, gmc: { ...state.data.gmc, ...gmc } } })),
      updateOrganization: (org) => set((state) => ({ data: { ...state.data, organization: { ...state.data.organization, ...org } } })),
      updateUniforms: (uniforms) => set((state) => ({ data: { ...state.data, uniforms } })),
      updateBiometrics: (biometrics) => set((state) => ({ data: { ...state.data, biometrics: { ...state.data.biometrics, ...biometrics } } })),
      setSalaryChangeRequest: (request) => set((state) => ({ data: { ...state.data, salaryChangeRequest: request } })),
      setRequiresManualVerification: (requires) => set((state) => ({ data: { ...state.data, requiresManualVerification: requires } })),
      setFormsGenerated: (generated) => set((state) => ({ data: { ...state.data, formsGenerated: generated } })),
      logVerificationUsage: (serviceName) => set((state) => {
          const newUsage: VerificationUsageItem[] = JSON.parse(JSON.stringify(state.data.verificationUsage || []));
          const existing = newUsage.find(item => item.name === serviceName);
          if (existing) {
            existing.count += 1;
          } else {
            newUsage.push({ name: serviceName, count: 1 });
          }
          return { data: { ...state.data, verificationUsage: newUsage } };
        }),
      reset: () => set({ data: getInitialState() }),
      addFamilyMember: () => set((state) => ({
        data: {
          ...state.data,
          family: [...state.data.family, { id: `fam_${Date.now()}`, relation: '', name: '', dob: '', gender: '', occupation: '', dependent: false, idProof: null, phone: '' }]
        }
      })),
      updateFamilyMember: (id, updates) => set((state) => ({
        data: {
            ...state.data,
            family: state.data.family.map(member => member.id === id ? { ...member, ...updates } : member)
        }
      })),
      removeFamilyMember: (id) => set((state) => ({
        data: {
            ...state.data,
            family: state.data.family.filter(member => member.id !== id)
        }
      })),
      addEducationRecord: () => set((state) => ({
        data: {
          ...state.data,
          education: [...state.data.education, { id: `edu_${Date.now()}`, degree: '', institution: '', startYear: '', endYear: '' }]
        }
      })),
      updateEducationRecord: (id, updates) => set((state) => ({
        data: {
            ...state.data,
            education: state.data.education.map(record => record.id === id ? { ...record, ...updates } : record)
        }
      })),
      removeEducationRecord: (id) => set((state) => ({
        data: {
            ...state.data,
            education: state.data.education.filter(record => record.id !== id)
        }
      })),
      addOrUpdateEmergencyContactAsFamilyMember: () => set((state) => {
        const { personal, family } = state.data;
        const { emergencyContactName, emergencyContactNumber, relationship } = personal;
    
        // Define which relationships are considered family members
        const familyRelationships: Array<FamilyMember['relation']> = ['Spouse', 'Child', 'Father', 'Mother'];
    
        if (emergencyContactName && familyRelationships.includes(relationship as FamilyMember['relation'])) {
            const existingMember = family.find(
                member => member.name.toLowerCase() === emergencyContactName.toLowerCase() && member.relation === relationship
            );
            
            if (existingMember) {
                // Update phone if different
                if (existingMember.phone !== emergencyContactNumber) {
                    const updatedFamily = family.map(member => 
                        member.id === existingMember.id 
                        ? { ...member, phone: emergencyContactNumber } 
                        : member
                    );
                    return { data: { ...state.data, family: updatedFamily } };
                }
            } else {
                // Add as new family member
                const newMember: FamilyMember = {
                    id: `fam_emergency_${Date.now()}`,
                    name: emergencyContactName,
                    relation: relationship as FamilyMember['relation'],
                    phone: emergencyContactNumber,
                    dob: '',
                    gender: '',
                    dependent: false,
                    idProof: null,
                    occupation: '',
                };
                return { data: { ...state.data, family: [...family, newMember] } };
            }
        }
        
        // No changes needed if not a family relationship or no name
        return state;
    }),
    }));