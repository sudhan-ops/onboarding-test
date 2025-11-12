import React from 'react';
import Skeleton from '../ui/Skeleton';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  isMobile?: boolean;
  mobileCols?: number;
}

// For mobile responsive tables that become cards
const MobileSkeleton: React.FC<{ rows: number; cols: number }> = ({ rows, cols }) => (
  <div className="space-y-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="flex justify-between items-center">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

// For desktop tables
const DesktopSkeleton: React.FC<{ rows: number; cols: number }> = ({ rows, cols }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i}>
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-6 py-4">
            <div className="space-y-2">
              <Skeleton className={`h-4 ${j === 0 ? 'w-3/4' : 'w-full'}`} />
              {j === 0 && <Skeleton className="h-3 w-1/2" />}
            </div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, cols = 4, isMobile = false, mobileCols }) => {
  if (isMobile) {
    // When mobile, the parent needs to wrap this in a `<tr><td colSpan={...}>` to be valid HTML
    return <MobileSkeleton rows={rows} cols={mobileCols || cols} />;
  }
  
  return <DesktopSkeleton rows={rows} cols={cols} />;
};

export default TableSkeleton;