
'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagInputField } from '@/components/shared/tag-input-field';
import type { Company, Contact, Industry, CompanySize } from '@/lib/types';
// generateId removed as new IDs will come from backend or be handled by it
import { INDUSTRY_OPTIONS, COMPANY_SIZE_OPTIONS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

const NONE_SELECT_VALUE = "_none_";

const companyFormSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  industry: z.enum(INDUSTRY_OPTIONS as [Industry, ...Industry[]]).optional().or(z.literal(NONE_SELECT_VALUE)).transform(val => val === NONE_SELECT_VALUE ? undefined : val),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  contactPhone1: z.string().optional(),
  contactPhone2: z.string().optional(),
  companySize: z.enum(COMPANY_SIZE_OPTIONS as [CompanySize, ...CompanySize[]]).optional().or(z.literal(NONE_SELECT_VALUE)).transform(val => val === NONE_SELECT_VALUE ? undefined : val),
  accountManagerId: z.string().optional().or(z.literal(NONE_SELECT_VALUE)).transform(val => val === NONE_SELECT_VALUE ? undefined : val),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type CompanyFormData = z.infer<typeof companyFormSchema>;

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCallback: () => void; // Callback to refresh list after save
  company?: Company | null;
  allContacts: Contact[]; // To populate Account Manager dropdown
}

export function CompanyFormModal({ isOpen, onClose, onSaveCallback, company, allContacts }: CompanyFormModalProps) {
  const { toast } = useToast();
  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
  });

  const descriptionForAISuggestions = watch('description');

  useEffect(() => {
    if (isOpen) {
      const defaultValues = company
      ? {
          name: company.name,
          industry: company.industry || NONE_SELECT_VALUE,
          website: company.website || '',
          street: company.street || '',
          city: company.city || '',
          state: company.state || '',
          postalCode: company.postalCode || '',
          country: company.country || '',
          contactPhone1: company.contactPhone1 || '',
          contactPhone2: company.contactPhone2 || '',
          companySize: company.companySize || NONE_SELECT_VALUE,
          accountManagerId: company.accountManagerId || NONE_SELECT_VALUE,
          description: company.description || '',
          tags: company.tags || []
        }
      : {
          name: '',
          industry: NONE_SELECT_VALUE,
          website: '',
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          contactPhone1: '',
          contactPhone2: '',
          companySize: NONE_SELECT_VALUE,
          accountManagerId: NONE_SELECT_VALUE,
          description: '',
          tags: []
        };
      reset(defaultValues);
    }
  }, [isOpen, company, reset]);

  const onSubmit = async (data: CompanyFormData) => {
    const companyToSave = {
      ...data,
      // Zod transform handles NONE_SELECT_VALUE to undefined, so no need to adjust here
      tags: data.tags || [],
      // notes will be handled by the backend or fetched separately, not part of form data
    };

    try {
      let response;
      if (company?.id) { // Editing existing company
        response = await fetch(`/api/companies/${company.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(companyToSave),
        });
        if (!response.ok) throw new Error('Failed to update company');
        toast({ title: "Company Updated", description: `${data.name} details saved.` });
      } else { // Creating new company
        response = await fetch('/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(companyToSave),
        });
        if (!response.ok) throw new Error('Failed to create company');
        toast({ title: "Company Created", description: `New company "${data.name}" added.` });
      }
      
      onSaveCallback(); // Call callback to refresh list
      onClose();
    } catch (error) {
      console.error("Error saving company:", error);
      toast({ title: "Error Saving Company", description: error instanceof Error ? error.message : "Could not save company.", variant: "destructive" });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl"> {/* Increased width for more fields */}
        <DialogHeader>
          <DialogTitle>{company ? 'Edit Company' : 'Add New Company'}</DialogTitle>
          <DialogDescription>
            {company ? 'Update the details of this company.' : 'Enter the details for the new company.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Controller
                name="industry"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value}>
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" {...register('website')} placeholder="https://example.com" />
              {errors.website && <p className="text-sm text-destructive mt-1">{errors.website.message}</p>}
            </div>
          </div>

          <Label className="font-medium text-base">Address</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input id="street" {...register('street')} />
            </div>
             <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div>
              <Label htmlFor="state">State / Province</Label>
              <Input id="state" {...register('state')} />
            </div>
             <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" {...register('postalCode')} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} />
            </div>
          </div>

          <Label className="font-medium text-base">Contact Information</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
            <div>
              <Label htmlFor="contactPhone1">Contact Phone 1</Label>
              <Input id="contactPhone1" {...register('contactPhone1')} />
            </div>
            <div>
              <Label htmlFor="contactPhone2">Contact Phone 2</Label>
              <Input id="contactPhone2" {...register('contactPhone2')} />
            </div>
          </div>
          
          <Label className="font-medium text-base">Company Details</Label>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
            <div>
              <Label htmlFor="companySize">Company Size</Label>
              <Controller
                name="companySize"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value}>
                    <SelectTrigger id="companySize">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {COMPANY_SIZE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="accountManagerId">Account Manager</Label>
              <Controller
                name="accountManagerId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value}>
                    <SelectTrigger id="accountManagerId">
                      <SelectValue placeholder="Select account manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {allContacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>


          <div>
            <Label htmlFor="description">Description (Internal Notes)</Label>
            <Textarea id="description" {...register('description')} placeholder="Add any relevant description for this company..." />
          </div>
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Controller
              name="tags"
              control={control}
              defaultValue={[]}
              render={({ field }) => (
                <TagInputField
                  value={field.value || []}
                  onChange={field.onChange}
                  textToSuggestFrom={descriptionForAISuggestions}
                  placeholder="Add relevant tags..."
                />
              )}
            />
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save Company</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
