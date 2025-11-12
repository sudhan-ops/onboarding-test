import React from 'react';
import type { OnboardingData } from '../../types';

interface StatusChipProps {
  status: OnboardingData['status'];
}

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const statusClasses: Record<OnboardingData['status'], string> = {
    pending: 'status-chip--pending',
    verified: 'status-chip--verified',
    rejected: 'status-chip--rejected',
    draft: 'status-chip--draft',
  };

  const statusClassName = statusClasses[status] || 'status-chip--draft';

  return (
    <span className={`status-chip ${statusClassName}`}>
      {status}
    </span>
  );
};

export default StatusChip;