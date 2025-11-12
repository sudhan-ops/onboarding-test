import type { ComponentType } from 'react';

export type StepStatus = 'complete' | 'current' | 'upcoming' | 'error';

export interface Step {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  status: StepStatus;
}