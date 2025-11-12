import React, { useState } from 'react';
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Mail, Lock, User as UserIcon, MailCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const validationSchema = yup.object({
    name: yup.string().required('Your name is required'),
    email: yup.string().email('Must be a valid email').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Please confirm your password'),
}).defined();

type SignUpFormInputs = yup.InferType<typeof validationSchema>;

const SignUp: React.FC = () => {
    const { signUp } = useAuthStore();
    const [error, setError] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpFormInputs>({
        resolver: yupResolver(validationSchema) as Resolver<SignUpFormInputs>,
    });

    const onSubmit: SubmitHandler<SignUpFormInputs> = async (data) => {
        setError('');
        const { error: signUpError } = await signUp(data.name, data.email, data.password);
        if (signUpError) {
            setError(signUpError.message);
        } else {
            setIsSubmitted(true);
        }
    };

    if (isSubmitted) {
        return (
            <div className="text-center">
                <MailCheck className="mx-auto h-12 w-12 text-accent" />
                <h3 className="mt-4 text-lg font-semibold text-white">Confirm your email</h3>
                <p className="mt-2 text-sm text-gray-300">
                    We've sent a confirmation link to your email address. Please click the link to activate your account.
                </p>
                <div className="mt-6">
                    <Link to="/auth/login" className="font-medium text-white/80 hover:text-white">
                        &larr; Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
             <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input id="name" type="text" placeholder="Full Name" registration={register('name')} error={errors.name?.message} className="pl-11 !bg-white/10 !text-white !border-white/20 placeholder:!text-gray-300" />
            </div>
            <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input id="email" type="email" placeholder="Email Address" registration={register('email')} error={errors.email?.message} className="pl-11 !bg-white/10 !text-white !border-white/20 placeholder:!text-gray-300" />
            </div>
            <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input id="password" type="password" placeholder="Password" registration={register('password')} error={errors.password?.message} className="pl-11 !bg-white/10 !text-white !border-white/20 placeholder:!text-gray-300" />
            </div>
            <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input id="confirmPassword" type="password" placeholder="Confirm Password" registration={register('confirmPassword')} error={errors.confirmPassword?.message} className="pl-11 !bg-white/10 !text-white !border-white/20 placeholder:!text-gray-300" />
            </div>
            
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <div className="pt-2">
                <Button type="submit" className="w-full" isLoading={isSubmitting} size="lg">
                    Sign Up
                </Button>
            </div>

            <div className="text-center pt-2">
                <Link to="/auth/login" className="text-sm font-medium text-white/80 hover:text-white">
                    Already have an account? Sign In
                </Link>
            </div>
        </form>
    );
};

export default SignUp;
