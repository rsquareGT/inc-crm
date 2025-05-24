
'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Organization } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const organizationFormSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  logoUrl: z.string().url('Invalid URL format for logo.').or(z.literal('')).optional(),
});

type OrganizationFormData = z.infer<typeof organizationFormSchema>;

interface OrganizationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCallback: (updatedOrganization: Organization) => void;
  organization: Organization | null;
}

export function OrganizationFormModal({ isOpen, onClose, onSaveCallback, organization }: OrganizationFormModalProps) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
  });

  useEffect(() => {
    if (isOpen && organization) {
      reset({
        name: organization.name,
        logoUrl: organization.logoUrl || '',
      });
    } else if (isOpen) {
      reset({
        name: '',
        logoUrl: '',
      });
    }
  }, [isOpen, organization, reset]);

  const onSubmit = async (data: OrganizationFormData) => {
    if (!organization) {
      toast({ title: "Error", description: "No organization context for saving.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update organization');
      }
      const updatedOrganization: Organization = await response.json();
      toast({ title: "Organization Updated", description: `"${updatedOrganization.name}" details saved.` });
      onSaveCallback(updatedOrganization);
      onClose();
    } catch (error) {
      console.error("Error saving organization:", error);
      toast({ title: "Error Saving Organization", description: error instanceof Error ? error.message : "Could not save organization.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Organization Profile</DialogTitle>
          <DialogDescription>
            Update your organization's details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="name">Organization Name</Label>
            <Input id="name" {...register('name')} disabled={isSubmitting} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input id="logoUrl" {...register('logoUrl')} placeholder="https://example.com/logo.png" disabled={isSubmitting} />
            {errors.logoUrl && <p className="text-sm text-destructive mt-1">{errors.logoUrl.message}</p>}
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
