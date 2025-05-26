
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
import { Loader2, Save } from 'lucide-react';

const organizationFormSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  logoUrl: z.string().url('Invalid URL format for logo.').or(z.literal('')).optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  currencySymbol: z.string().max(3, 'Currency symbol too long (e.g., $, €)').optional(),
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
        name: organization.name || '',
        logoUrl: organization.logoUrl || '',
        street: organization.street || '',
        city: organization.city || '',
        state: organization.state || '',
        postalCode: organization.postalCode || '',
        country: organization.country || '',
        currencySymbol: organization.currencySymbol || '$',
      });
    } else if (isOpen) { // For a scenario where an org might be created (not current use case)
      reset({
        name: '',
        logoUrl: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        currencySymbol: '$',
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
      const updatedOrganizationData: Organization = await response.json();
      toast({ title: "Organization Updated", description: `"${updatedOrganizationData.name}" details saved.` });
      onSaveCallback(updatedOrganizationData);
      onClose();
    } catch (error) {
      console.error("Error saving organization:", error);
      toast({ title: "Error Saving Organization", description: error instanceof Error ? error.message : "Could not save organization.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Organization Profile</DialogTitle>
          <DialogDescription>
            Update your organization's details. This information is visible to all users in your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
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
          
          <Label className="font-medium text-base block pt-2">Address</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input id="street" {...register('street')} disabled={isSubmitting} />
            </div>
             <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register('city')} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="state">State / Province</Label>
              <Input id="state" {...register('state')} disabled={isSubmitting} />
            </div>
             <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" {...register('postalCode')} disabled={isSubmitting} />
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} disabled={isSubmitting} />
            </div>
             <div className="md:col-span-1">
              <Label htmlFor="currencySymbol">Currency Symbol</Label>
              <Input id="currencySymbol" {...register('currencySymbol')} placeholder="$" disabled={isSubmitting} />
              {errors.currencySymbol && <p className="text-sm text-destructive mt-1">{errors.currencySymbol.message}</p>}
            </div>
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
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
