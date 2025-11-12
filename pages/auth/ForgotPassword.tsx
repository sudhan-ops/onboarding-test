import React, { useState, useEffect } from 'react';
// Fix: Use inline type import for SubmitHandler
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Mail, MailCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const validationSchema = yup.object({
    email: yup.string().email('Must be a valid email').required('Email is required'),
}).defined();

interface ForgotPasswordForm {
    email: string;
}

const getFriendlyAuthError = (errorCode: string): string => {
    // Supabase returns a generic error for non-existent users for security.
    return 'If an account with this email exists, a password reset link has been sent.';
};


const ForgotPassword = () => {
    const { sendPasswordReset } = useAuthStore();
    const [error, setError] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isSubmitted) {
            const timer = setTimeout(() => {
                navigate('/auth/login', { replace: true });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isSubmitted, navigate]);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordForm>({
        resolver: yupResolver(validationSchema) as unknown as Resolver<ForgotPasswordForm>,
    });

    const onSubmit: SubmitHandler<ForgotPasswordForm> = async (data) => {
        setError('');
        const { error: resetError } = await sendPasswordReset(data.email);
        if (resetError) {
            // For security, Supabase often returns a generic success message even if the user doesn't exist.
            // But we handle specific errors if they occur.
             if (resetError.message.includes('rate limit')) {
                setError('Too many requests. Please wait a while before trying again.');
            } else {
                // Show a generic success message to prevent user enumeration
                setIsSubmitted(true);
            }
        } else {
            setIsSubmitted(true);
        }
    };

    if (isSubmitted) {
        return (
            <div className="text-center">
                <MailCheck className="mx-auto h-12 w-12 text-accent" />
                <h3 className="mt-4 text-lg font-semibold text-white">Check your email</h3>
                <p className="mt-2 text-sm text-gray-300">
                    If an account exists for the email you provided, we've sent password reset instructions. Redirecting to login...
                </p>
            </div>
        );
    }

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                 <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="Email Address"
                        registration={register('email')}
                        error={errors.email?.message}
                        className="pl-11 !bg-white/10 !text-white !border-white/20 placeholder:!text-gray-300"
                    />
                </div>
                
                {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                <div>
                    <Button type="submit" className="w-full" isLoading={isSubmitting} size="lg">
                        Send Reset Link
                    </Button>
                </div>

                <div className="text-center">
                    <Link to="/auth/login" className="text-sm font-medium text-white/80 hover:text-white">
                        &larr; Back to Login
                    </Link>
                </div>
            </form>
        </>
    );
};

export default ForgotPassword;