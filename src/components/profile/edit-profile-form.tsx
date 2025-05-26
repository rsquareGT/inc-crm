
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const editProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Invalid email address"),
  profilePictureUrl: z.string().url("Invalid URL for profile picture").or(z.literal("")).optional(),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

export function EditProfileForm() {
  const { user: currentUser, fetchUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty }, // isDirty can be used to enable/disable save button
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      profilePictureUrl: '',
    }
  });

  useEffect(() => {
    if (currentUser) {
      reset({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email,
        profilePictureUrl: currentUser.profilePictureUrl || '',
      });
    }
  }, [currentUser, reset]);

  const watchedProfilePictureUrl = watch('profilePictureUrl');
  const watchedFirstName = watch('firstName');
  const watchedLastName = watch('lastName');
  const watchedEmail = watch('email');

  const getInitials = () => {
    const first = watchedFirstName?.[0] || '';
    const last = watchedLastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || (watchedEmail?.[0] || 'U').toUpperCase();
  }


  const onSubmit = async (data: EditProfileFormValues) => {
    if (!currentUser) {
      setFormError("Not authenticated.");
      return;
    }
    setIsSubmittingForm(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile.');
      }

      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved.',
      });
      await fetchUser(); // Re-fetch user to update AuthContext and UI
      reset(data); // Reset form to new values to clear dirty state
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setFormError(message);
      toast({
        title: 'Profile Update Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingForm(false);
    }
  };
  
  if (authLoading && !currentUser) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-pulse bg-muted rounded-full h-24 w-24"></div>
          <div className="animate-pulse bg-muted h-4 w-3/4 rounded"></div>
          <div className="animate-pulse bg-muted h-4 w-1/2 rounded"></div>
        </div>
         <div className="animate-pulse bg-muted h-10 w-full rounded-md"></div>
      </div>
    );
  }


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
       <div className="flex flex-col items-center space-y-4 mb-6">
        <Avatar className="h-24 w-24 text-3xl">
          <AvatarImage src={watchedProfilePictureUrl || currentUser?.profilePictureUrl || undefined} alt={`${watchedFirstName} ${watchedLastName}`} />
          <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
      </div>
      {formError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md">
          {formError}
        </div>
      )}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...register('firstName')}
            disabled={isSubmittingForm || authLoading}
            className={errors.firstName ? 'border-destructive' : ''}
          />
          {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>}
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...register('lastName')}
            disabled={isSubmittingForm || authLoading}
            className={errors.lastName ? 'border-destructive' : ''}
          />
          {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          disabled={isSubmittingForm || authLoading}
          className={errors.email || formError ? 'border-destructive' : ''}
        />
        {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="profilePictureUrl">Profile Picture URL</Label>
        <Input
          id="profilePictureUrl"
          placeholder="https://example.com/your-image.png"
          {...register('profilePictureUrl')}
          disabled={isSubmittingForm || authLoading}
          className={errors.profilePictureUrl ? 'border-destructive' : ''}
        />
        {errors.profilePictureUrl && <p className="text-sm text-destructive mt-1">{errors.profilePictureUrl.message}</p>}
      </div>
      
      <Button type="submit" className="w-full" disabled={isSubmittingForm || authLoading || !isDirty}>
        {isSubmittingForm ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving Profile...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </form>
  );
}
