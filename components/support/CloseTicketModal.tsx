import React, { useState } from 'react';
import { useForm, Controller, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Button from '../ui/Button';
import { Star } from 'lucide-react';

interface CloseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
}

const schema = yup.object({
  rating: yup.number().min(1, 'Please select a rating.').required(),
  feedback: yup.string().required('Feedback is required to close the ticket.').min(10, 'Please provide more detailed feedback.'),
}).defined();

type FormData = { rating: number; feedback: string };

const StarRating: React.FC<{ value: number; onChange: (value: number) => void }> = ({ value, onChange }) => {
  const [hoverValue, setHoverValue] = useState(0);
  return (
    <div className="flex items-center justify-center gap-1" onMouseLeave={() => setHoverValue(0)}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHoverValue(star)}
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`h-8 w-8 cursor-pointer transition-colors ${
              (hoverValue || value) >= star
                ? 'text-yellow-400 fill-current'
                : 'text-gray-400'
            }`}
          />
        </button>
      ))}
    </div>
  );
};


const CloseTicketModal: React.FC<CloseTicketModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema) as Resolver<FormData>,
    defaultValues: { rating: 0, feedback: '' }
  });

  const onFormSubmit: SubmitHandler<FormData> = (data) => {
    setIsSubmitting(true);
    onSubmit(data.rating, data.feedback);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card p-6 w-full max-w-lg m-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <h3 className="text-lg font-bold text-primary-text mb-2 text-center">Ticket Resolved</h3>
          <p className="text-sm text-muted text-center mb-4">Please rate the support you received before closing this ticket.</p>
          <div className="space-y-6">
            <div>
              <Controller name="rating" control={control} render={({ field }) => (
                <StarRating value={field.value} onChange={field.onChange} />
              )} />
              {errors.rating && <p className="mt-2 text-xs text-red-500 text-center">{errors.rating.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted text-center">Your Feedback</label>
              <textarea {...register('feedback')} rows={4} className={`mt-1 form-input ${errors.feedback ? 'form-input--error' : ''}`} />
              {errors.feedback && <p className="mt-1 text-xs text-red-600">{errors.feedback.message}</p>}
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" onClick={onClose} variant="secondary">Not Now</Button>
            <Button type="submit" isLoading={isSubmitting}>Confirm & Close</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloseTicketModal;
