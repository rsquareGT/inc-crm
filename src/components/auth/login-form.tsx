
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login: contextLogin, isAuthenticated, user: authUser, isLoading: authContextLoading } = useAuth();
  const { toast } = useToast();
  
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Ref to track if redirect has been initiated by useEffect to prevent multiple pushes
  const redirectInitiated = useRef(false);


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

  const onSubmit = async (data: LoginFormValues) => {
    console.log("LoginForm: onSubmit called");
    setIsSubmittingForm(true);
    setFormError(null);
    redirectInitiated.current = false; // Reset redirect flag on new attempt

    try {
      const loginSuccessful = await contextLogin(data.email, data.password);
      if (loginSuccessful) {
        console.log("LoginForm: contextLogin reported success. Waiting for context update and redirect effect.");
        // Redirection is now handled by useEffect watching isAuthenticated
      } else {
        // This case means contextLogin itself determined session verification failed post-API call
        setFormError('Login successful, but failed to verify session. Please try again.');
        console.warn("LoginForm: contextLogin reported failure to verify session.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred during login.';
      setFormError(message);
      toast({ title: 'Login Failed', description: message, variant: 'destructive' });
      console.error("LoginForm: contextLogin threw an error:", error);
    } finally {
      // Only set submitting to false if redirect hasn't been triggered by useEffect
      // This will be re-evaluated by the useEffect for isAuthenticated
      if (!redirectInitiated.current) {
         setIsSubmittingForm(false);
      }
    }
  };
  
  useEffect(() => {
    console.log(`LoginForm useEffect: isAuthenticated: ${isAuthenticated}, authContextLoading: ${authContextLoading}, redirectInitiated: ${redirectInitiated.current}`);
    // Redirect if authenticated, not in initial context loading, and redirect not already started
    if (isAuthenticated && !authContextLoading && !redirectInitiated.current) {
      console.log("LoginForm useEffect: Conditions met for redirect. Attempting redirect to /dashboard.");
      redirectInitiated.current = true; // Set flag before pushing
      setIsSubmittingForm(true); // Keep button disabled while redirecting
      router.push('/dashboard');
    } else if (!isAuthenticated && !authContextLoading && redirectInitiated.current) {
      // If somehow redirect was initiated but auth state reverted before push completed (unlikely but safeguard)
      console.warn("LoginForm useEffect: Redirect was initiated but auth state is false. Resetting redirectInitiated.");
      redirectInitiated.current = false;
      setIsSubmittingForm(false);
    }
  }, [isAuthenticated, authContextLoading, router]);


  let buttonText = "Sign In";
  let buttonIcon = <LogIn className="mr-2 h-4 w-4" />;

  if (isSubmittingForm) {
    if (redirectInitiated.current) { // If redirect has been flagged by useEffect
        buttonText = "Redirecting...";
    } else { // API call in progress, or waiting for context update before redirect effect runs
        buttonText = "Signing In...";
    }
    buttonIcon = <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
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
          disabled={isSubmittingForm}
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
          disabled={isSubmittingForm}
          className={errors.password || formError ? 'border-destructive' : ''}
        />
        {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmittingForm}>
        {buttonIcon}
        {buttonText}
      </Button>
    </form>
  );
}
