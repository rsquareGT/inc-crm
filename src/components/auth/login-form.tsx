
'use client';

import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'nextjs-toploader/app'; // Updated import
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
  const [isRedirecting, setIsRedirecting] = useState(false); // For button text: "Redirecting..."
  const redirectInitiatedRef = useRef(false); // To ensure redirect is called only once

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
    if (loginApiSuccess && authUser && !authContextLoading && !redirectInitiatedRef.current) {
      redirectInitiatedRef.current = true; // Mark that we are initiating the redirect
      setIsRedirecting(true); // Set state for button text
      router.push('/dashboard');
    }
  }, [loginApiSuccess, authUser, authContextLoading, router]); // redirectInitiatedRef is not a dependency

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmittingForm(true);
    setFormError(null);
    setLoginApiSuccess(false);
    setIsRedirecting(false);
    redirectInitiatedRef.current = false; // Reset ref on new submission

    try {
      const success = await contextLogin(data.email, data.password);
      if (success) {
        setLoginApiSuccess(true);
        // Redirection is handled by the useEffect hook
      } else {
        // contextLogin will throw an error if API call fails or returns success: false
        // This block might not be reached if contextLogin throws.
        setFormError('Login failed. Please check your credentials.');
        setIsSubmittingForm(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setFormError(message);
      setIsSubmittingForm(false);
      setLoginApiSuccess(false);
    }
    // setIsSubmittingForm(false) is handled above or if loginApiSuccess becomes true
    if (!loginApiSuccess) { // only set to false if it's not already going to be true
        setIsSubmittingForm(false);
    }
  };


  let buttonContent;
  let isButtonDisabled = false;

  if (isRedirecting) {
    buttonContent = (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Redirecting...
      </>
    );
    isButtonDisabled = true;
  } else if (loginApiSuccess) { // API call succeeded, waiting for context and redirect effect
    buttonContent = (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Validated. Please wait...
      </>
    );
    isButtonDisabled = true;
  } else if (isSubmittingForm) { // API call in progress
    buttonContent = (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Validating User...
      </>
    );
    isButtonDisabled = true;
  } else { // Initial state
    buttonContent = (
      <>
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </>
    );
    isButtonDisabled = false;
  }


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
