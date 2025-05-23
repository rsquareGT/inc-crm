
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation'; // Using standard Next.js router
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
  const { login: contextLogin } = useAuth();

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

    try {
      const success = await contextLogin(data.email, data.password);
      if (success) {
        // The AuthContext now handles setting the user state.
        // If successful, the context's isAuthenticated state will change,
        // and the middleware or AppPageShell will handle redirecting from `/login`
        // or allowing access to `/dashboard`.
        // We can directly push to dashboard after successful login.
        router.push('/dashboard');
      } else {
        // This case should ideally be covered by contextLogin throwing an error.
        setFormError('Login failed. Please check your credentials.');
        setIsSubmittingForm(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setFormError(message);
      setIsSubmittingForm(false);
    }
    // No need to set isSubmittingForm to false if redirect happens.
    // If it fails, it's set to false in the catch block.
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
        {isSubmittingForm ? (
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
