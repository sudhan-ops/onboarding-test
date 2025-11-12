import { create } from 'zustand';
import type { EnrollmentRules } from '../types';
import { api } from '../services/api';

interface EnrollmentRulesState extends EnrollmentRules {
  init: (rules: EnrollmentRules) => void;
  updateRules: (settings: Partial<EnrollmentRules>) => void;
}

const emptyRules: EnrollmentRules = {
  esiCtcThreshold: 21000,
  enforceManpowerLimit: false,
  manpowerLimitRule: 'warn',
  allowSalaryEdit: false,
  salaryThreshold: 21000,
  defaultPolicySingle: '1L',
  defaultPolicyMarried: '2L',
  enableEsiRule: false,
  enableGmcRule: false,
  enforceFamilyValidation: true,
  rulesByDesignation: {},
};

// Fix: Removed generic type argument from create() to avoid untyped function call error.
export const useEnrollmentRulesStore = create<EnrollmentRulesState>()(
    (set) => ({
      ...emptyRules,
      init: (rules) => {
        if (rules) {
            set(rules);
        }
      },
      updateRules: (settings) => set((state) => ({ ...state, ...settings })),
    })
);