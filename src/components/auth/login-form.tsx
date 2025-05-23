
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Toast for success is removed, only used for errors now.
// import { useToast } from '@/hooks/use-toast'; 
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  // const { toast } = useToast(); // Only needed if we keep error toasts from here. AuthContext also shows errors.
  const { login: contextLogin, user: authUser, isLoading: authContextLoading } = useAuth();
  
  const [isSubmittingForm, setIsSubmittingForm] = useState(false); // Local state for form submission process
  const [formError, setFormError] = useState<string | null>(null);
  const [loginApiSuccess, setLoginApiSuccess] = useState(false); // True if API call returned success

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Redirect if login API call was successful and the auth context has updated the user
    if (loginApiSuccess && authUser && !authContextLoading) {
      router.push('/dashboard');
    }
  }, [loginApiSuccess, authUser, authContextLoading, router]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmittingForm(true);
    setFormError(null);
    setLoginApiSuccess(false); 
    try {
      const success = await contextLogin(data.email, data.password);
      if (success) {
        setLoginApiSuccess(true);
        // No local success toast here. Button text will indicate "Validated. Redirecting..."
        // setIsSubmittingForm(true) remains true, as the component should ideally unmount on redirect.
      } else {
        // This case might not be hit if contextLogin throws an error for API failures
        setFormError('Login failed. Please check your credentials.');
        setIsSubmittingForm(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setFormError(message);
      // Error toast can be handled by AuthContext or here. For simplicity, let AuthContext handle it.
      // toast({
      //   title: 'Login Error',
      //   description: message,
      //   variant: 'destructive',
      // });
      setIsSubmittingForm(false);
      setLoginApiSuccess(false);
    }
  };

  let buttonContent;
  if (loginApiSuccess) {
    buttonContent = (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Validated. Redirecting...
      </>
    );
  } else if (isSubmittingForm) {
    buttonContent = (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Validating User...
      </>
    );
  } else {
    buttonContent = (
      <>
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </>
    );
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
          disabled={isSubmittingForm || loginApiSuccess}
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
          disabled={isSubmittingForm || loginApiSuccess}
          className={errors.password || formError ? 'border-destructive' : ''}
        />
        {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmittingForm || loginApiSuccess}>
        {buttonContent}
      </Button>
    </form>
  );
}
