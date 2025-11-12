import React from 'react';
// Fix: Changed `import type` to inline `import { type ... }` for UseFormRegisterReturn to fix namespace-as-type error.
import { type UseFormRegisterReturn } from 'react-hook-form';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  registration?: UseFormRegisterReturn;
}

const Input: React.FC<InputProps> = ({ label, id, error, registration, ...props }) => {
  const { className, ...otherProps } = props;
  
  const baseClass = 'form-input';
  const errorClass = 'form-input--error';
  const finalClassName = `${baseClass} ${error ? errorClass : ''} ${className || ''}`;
  
  const inputElement = (
    <input
      id={id}
      className={finalClassName}
      aria-invalid={!!error}
      {...registration}
      {...otherProps}
    />
  );

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <div className={label ? "mt-1" : ""}>
        {inputElement}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Input;