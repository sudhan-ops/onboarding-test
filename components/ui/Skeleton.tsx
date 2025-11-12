
import React from 'react';

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`skeleton-pulse rounded-md ${className}`} />
  );
};

export default Skeleton;
