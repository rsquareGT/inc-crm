
'use client';

import React, { useState, useEffect } from 'react'; // Added useEffect
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { login: contextLogin, user: authUser, isLoading: authContextLoading } = useAuth(); // Get user from context
  const [isLoading, setIsLoading] = useState(false); // Local loading state for form submission
  const [formError, setFormError] = useState<string | null>(null);
  const [loginAttemptSuccessful, setLoginAttemptSuccessful] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Redirect if login was successful and the user object is now available in context
    if (loginAttemptSuccessful && authUser && !authContextLoading) {
      router.push('/dashboard');
      // No need to reset loginAttemptSuccessful here as the component will unmount
    }
  }, [loginAttemptSuccessful, authUser, authContextLoading, router]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setFormError(null);
    setLoginAttemptSuccessful(false); // Reset on new attempt
    try {
      const success = await contextLogin(data.email, data.password);
      if (success) {
        toast({
          title: 'Login Successful',
          description: `Welcome back! Redirecting...`,
        });
        setLoginAttemptSuccessful(true); // Trigger useEffect for redirection
        // The useEffect will handle the router.push when authUser is confirmed in context
      } else {
        // This case might not be hit if contextLogin throws an error handled by catch
        setFormError('Login failed. Please check your credentials.');
        setIsLoading(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setFormError(message);
      toast({
        title: 'Login Error',
        description: message,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
    // setIsLoading(false) is handled in success path by redirection or error path explicitly.
    // If login is successful, component will unmount on redirect, so local isLoading becomes irrelevant.
  };

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
          disabled={isLoading}
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
          disabled={isLoading}
          className={errors.password || formError ? 'border-destructive' : ''}
        />
        {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing In...
          </>
        ) : (
          <>
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </>
        )}
      </Button>
    </form>
  );
}
