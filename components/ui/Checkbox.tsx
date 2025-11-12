import React from 'react';

interface CheckboxProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({ id, label, description, checked, onChange, disabled }) => {
  return (
    <div className="relative flex items-start">
      <div className="flex h-6 items-center">
        <input
          id={id}
          aria-describedby={description ? `${id}-description` : undefined}
          name={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent cursor-pointer"
        />
      </div>
      <div className="ml-3 text-sm leading-6">
        <label htmlFor={id} className="font-medium text-primary-text cursor-pointer">
          {label}
        </label>
        {description && (
          <p id={`${id}-description`} className="text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default Checkbox;
