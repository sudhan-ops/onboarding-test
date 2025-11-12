import React, { useState, useEffect } from 'react';
// Fix: Use inline type import for SubmitHandler
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authService } from '../../services/authService';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const validationSchema = yup.object({
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Please confirm your password'),
}).defined();

interface UpdatePasswordForm {
  password: string;
  confirmPassword: string;
}

const getFriendlyAuthError = (errorCode: string): string => {
    if (errorCode.includes('weak password')) {
        return 'Password is too weak. It must be at least 6 characters long.';
    }
    if (errorCode.includes('requires a recent login')) {
        return 'This action is sensitive and requires recent authentication. Please log in again before retrying.';
    }
    console.error("Unhandled Supabase auth error:", errorCode);
    return 'An unexpected error occurred. Please try again.';
};

const UpdatePassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    // With Supabase's PASSWORD_RECOVERY flow, the user is already authenticated
    // at this point. If there's no user, it means the recovery flow was invalid
    // or has expired.
    if (!user) {
      setError('Invalid or expired password reset session. Please request a new password reset link.');
    }
  }, [user]);


  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UpdatePasswordForm>({
    resolver: yupResolver(validationSchema) as unknown as Resolver<UpdatePasswordForm>,
  });

  const onSubmit: SubmitHandler<UpdatePasswordForm> = async (data) => {
    setError('');
    const { error: updateError } = await authService.updateUserPassword(data.password);

    if (updateError) {
      setError(getFriendlyAuthError(updateError.message));
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/auth/login', { replace: true }), 2000);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-accent" />
        <h3 className="mt-4 text-lg font-semibold text-white">Password Updated!</h3>
        <p className="mt-2 text-sm text-gray-300">
          Your password has been changed successfully. You will be redirected to the login page shortly.
        </p>
        <div className="mt-6">
          <Link to="/auth/login" className="font-medium text-white/80 hover:text-white">
            &larr; Back to Login Now
          </Link>
        </div>
      </div>
    );
  }

  if (error && !user) { // If auth session is invalid
    return (
        <div className="text-center">
             <h3 className="text-3xl font-bold text-white">Invalid Session</h3>
             <p className="text-sm text-gray-300 mt-1">{error}</p>
             <div className="mt-6 flex flex-col gap-4">
                <Link to="/auth/forgot-password" className="font-medium text-white/80 hover:text-white">
                    Request a new link
                </Link>
                <div className="auth-separator">OR</div>
                <Button onClick={() => navigate('/auth/login')} className="w-full" size="lg">
                    Back to Sign In
                </Button>
            </div>
        </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-center text-gray-300 -mt-6 mb-6">for <span className="font-semibold text-white">{user?.email}</span>.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          id="password"
          type="password"
          placeholder="New Password"
          autoComplete="new-password"
          registration={register('password')}
          error={errors.password?.message}
           className="pl-4 !bg-white/10 !text-white !border-white/20 placeholder:!text-gray-300"
        />
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm New Password"
          autoComplete="new-password"
          registration={register('confirmPassword')}
          error={errors.confirmPassword?.message}
           className="pl-4 !bg-white/10 !text-white !border-white/20 placeholder:!text-gray-300"
        />
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        <div>
          <Button type="submit" className="w-full" isLoading={isSubmitting} size="lg" disabled={!user}>
            Update Password
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UpdatePassword;