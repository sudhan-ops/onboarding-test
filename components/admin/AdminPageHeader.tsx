import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, children }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
      <h2 className="text-2xl font-semibold text-primary-text">{title}</h2>
      {children && <div className="flex-shrink-0 flex items-center flex-wrap gap-2">{children}</div>}
    </div>
  );
};

export default AdminPageHeader;