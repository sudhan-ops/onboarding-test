
import React from 'react';

interface FormHeaderProps {
  title: string;
  subtitle: string;
}

const FormHeader: React.FC<FormHeaderProps> = ({ title, subtitle }) => (
  <div className="mb-6">
    <h3 className="text-xl font-bold text-primary-text form-header-title">{title}</h3>
    <p className="mt-2 text-sm text-muted">{subtitle}</p>
  </div>
);

export default FormHeader;