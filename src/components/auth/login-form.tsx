
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation'; // Standard import
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
  const { login: contextLogin, isAuthenticated, isLoading: authContextLoading } = useAuth();
  const { toast } = useToast();
  const redirectInitiated = useRef(false);

  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    setIsSubmittingForm(true);
    setFormError(null);
    redirectInitiated.current = false; // Reset redirect flag on new attempt

    try {
      const loginSuccess = await contextLogin(data.email, data.password);
      if (!loginSuccess) {
        // If contextLogin itself indicates failure (e.g. fetchUser didn't set user)
        // This might be redundant if contextLogin throws, but good as a fallback.
        setFormError('Login successful, but failed to verify session. Please try again.');
      }
      // Redirection is now handled by useEffect watching isAuthenticated
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setFormError(message);
      toast({ title: 'Login Failed', description: message, variant: 'destructive' });
    } finally {
      // Set to false only if redirect hasn't been initiated by useEffect
      // This will be re-evaluated by the useEffect for isAuthenticated
      if (!redirectInitiated.current) {
        setIsSubmittingForm(false);
      }
    }
  };
  
  useEffect(() => {
    // Redirect if authenticated and not already redirecting
    // Also check authContextLoading to ensure context isn't in its initial busy state
    if (isAuthenticated && !redirectInitiated.current && !authContextLoading) {
      redirectInitiated.current = true;
      setIsSubmittingForm(true); // Keep button disabled while redirecting
      // No toast on success, UI will change on redirect
      router.push('/dashboard');
    }
  }, [isAuthenticated, router, authContextLoading]);


  let buttonText = "Sign In";
  let buttonIcon = <LogIn className="mr-2 h-4 w-4" />;

  if (isSubmittingForm) {
    if (redirectInitiated.current) {
        buttonText = "Redirecting...";
    } else {
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
