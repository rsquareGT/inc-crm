
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation'; // Standard import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login: contextLogin, user: authUser, isLoading: authContextLoading } = useAuth();
  
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loginApiSuccess, setLoginApiSuccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false); // New state

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  useEffect(() => {
    // Redirect if API call was successful, auth context has updated, and not already redirecting
    if (loginApiSuccess && authUser && !authContextLoading && !isRedirecting) {
      setIsRedirecting(true); // Set flag before pushing
      router.push('/dashboard');
    }
  }, [loginApiSuccess, authUser, authContextLoading, router, isRedirecting]); // Added isRedirecting

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmittingForm(true);
    setFormError(null);
    setLoginApiSuccess(false);
    setIsRedirecting(false); // Reset redirecting flag on new submission

    try {
      const success = await contextLogin(data.email, data.password);
      if (success) {
        setLoginApiSuccess(true); // API call succeeded
        // No longer setting setIsSubmittingForm(false) here, controlled by loginApiSuccess/isRedirecting
      } else {
        // This case might not be hit if contextLogin throws for API failures
        setFormError('Login failed. Please check your credentials.');
        setIsSubmittingForm(false); // Allow re-submission on contextLogin returning false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setFormError(message);
      setIsSubmittingForm(false); // Allow re-submission on error
      setLoginApiSuccess(false); // Ensure this is reset
    }
  };

  let buttonContent;
  if (isRedirecting) {
    buttonContent = (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Redirecting...
      </>
    );
  } else if (loginApiSuccess) { // API succeeded, waiting for context/redirect effect
    buttonContent = (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Validated. Please wait...
      </>
    );
  } else if (isSubmittingForm) { // API call in progress
    buttonContent = (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Validating User...
      </>
    );
  } else { // Initial state
    buttonContent = (
      <>
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </>
    );
  }

  const isButtonDisabled = isSubmittingForm || loginApiSuccess || isRedirecting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {formError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md">
          {formError}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register('email')}
          disabled={isButtonDisabled}
          className={errors.email || formError ? 'border-destructive' : ''}
        />
        {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          disabled={isButtonDisabled}
          className={errors.password || formError ? 'border-destructive' : ''}
        />
        {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isButtonDisabled}>
        {buttonContent}
      </Button>
    </form>
  );
}
