import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'react-date-range';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  id: string;
  error?: string;
  value?: string | null;
  onChange?: (value: string) => void;
  maxDate?: Date;
  minDate?: Date;
}

const DatePicker: React.FC<DatePickerProps> = ({ label, id, error, value, onChange, maxDate, minDate, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileTheme, setIsMobileTheme] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMobileTheme(document.body.classList.contains('field-officer-dark-theme'));
  }, []);

  const handleDateChange = (date: Date) => {
    if (onChange) {
      onChange(format(date, 'yyyy-MM-dd'));
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseClass = isMobileTheme ? 'fo-input' : 'form-input';
  const errorClass = isMobileTheme ? 'fo-input--error' : 'form-input--error';
  const finalClassName = `${baseClass} ${error ? errorClass : ''} flex justify-between items-center cursor-pointer`;
  
  // A date needs to be provided to the calendar. Use the value, or today as a fallback.
  // Add a time component to avoid timezone issues where the date might be off by one.
  const selectedDate = value ? new Date(value + 'T12:00:00') : new Date();

  return (
    <div ref={pickerRef}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-muted">{label}</label>}
      <div className={label ? "mt-1 relative" : "relative"}>
        <div 
          id={id} 
          className={finalClassName} 
          onClick={() => setIsOpen(!isOpen)}
          // Add ARIA attributes for accessibility
          role="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={`Date picker for ${label}`}
        >
          <span className={value ? '' : 'text-muted'}>{value ? format(selectedDate, 'dd MMM, yyyy') : 'Select date'}</span>
          <CalendarIcon className="h-4 w-4 text-muted" />
        </div>
        {isOpen && (
          <div className="absolute z-10 mt-1 bg-card border border-border rounded-lg shadow-lg">
            <Calendar
              date={selectedDate}
              onChange={handleDateChange}
              maxDate={maxDate}
              minDate={minDate}
              color="#005D22"
            />
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default DatePicker;