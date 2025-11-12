import React from 'react';
import type { OnboardingData } from '../../types';

type SyncStatus = OnboardingData['portalSyncStatus'];

interface PortalSyncStatusChipProps {
  status: SyncStatus;
}

const PortalSyncStatusChip: React.FC<PortalSyncStatusChipProps> = ({ status }) => {
  if (!status) return <span className="text-sm font-medium text-muted">-</span>;

  const statusClasses: Record<NonNullable<SyncStatus>, string> = {
    pending_sync: 'sync-chip--pending_sync',
    synced: 'sync-chip--synced',
    failed: 'sync-chip--failed',
  };

  const textMap: Record<NonNullable<SyncStatus>, string> = {
    pending_sync: 'Pending Sync',
    synced: 'Synced',
    failed: 'Failed',
  };

  const statusClassName = statusClasses[status];

  return (
    <span className={`sync-chip ${statusClassName}`}>
      {textMap[status]}
    </span>
  );
};

export default PortalSyncStatusChip;