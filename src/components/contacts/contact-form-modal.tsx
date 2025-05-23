
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
import type { Contact, Company } from '@/lib/types';
// generateId removed as ID comes from backend
import { useToast } from '@/hooks/use-toast';

const NONE_SELECT_VALUE = "_none_";

const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  companyId: z.string().optional().or(z.literal(NONE_SELECT_VALUE)).transform(val => val === NONE_SELECT_VALUE ? undefined : val),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCallback: () => void; // Changed from onSave to onSaveCallback
  contact?: Contact | null;
  companies: Company[];
  defaultCompanyId?: string;
}

export function ContactFormModal({ isOpen, onClose, onSaveCallback, contact, companies, defaultCompanyId }: ContactFormModalProps) {
  const { toast } = useToast();
  const { register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting } } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const descriptionForAISuggestions = watch('description');

  useEffect(() => {
    if (isOpen) {
      const defaultValues = contact 
        ? { 
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone || '',
            companyId: contact.companyId || NONE_SELECT_VALUE,
            description: contact.description || '',
            tags: contact.tags || [] 
          } 
        : { 
            firstName: '', 
            lastName: '', 
            email: '', 
            phone: '',
            companyId: defaultCompanyId || NONE_SELECT_VALUE,
            description: '', 
            tags: [] 
          };
      reset(defaultValues);
    }
  }, [isOpen, contact, reset, defaultCompanyId]);

  const onSubmit = async (data: ContactFormData) => {
    const contactPayload = {
      ...data,
      tags: data.tags || [],
      // notes will be handled by the backend or fetched separately
    };

    try {
      let response;
      if (contact?.id) { // Editing existing contact
        response = await fetch(`/api/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactPayload),
        });
        if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || 'Failed to update contact');
        }
        toast({ title: "Contact Updated", description: `${data.firstName} ${data.lastName} updated.` });
      } else { // Creating new contact
        response = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactPayload),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create contact');
        }
        toast({ title: "Contact Created", description: `New contact ${data.firstName} ${data.lastName} added.` });
      }
      
      onSaveCallback(); // Call callback to refresh list
      // onClose(); // This is handled by onSaveCallback in the parent or should be here. For now, keep it.
    } catch (error) {
      console.error("Error saving contact:", error);
      toast({ title: "Error Saving Contact", description: error instanceof Error ? error.message : "Could not save contact.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
          <DialogDescription>
            {contact ? 'Update the details of this contact.' : 'Enter the details for the new contact.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register('firstName')} disabled={isSubmitting}/>
              {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register('lastName')} disabled={isSubmitting}/>
              {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} disabled={isSubmitting}/>
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} disabled={isSubmitting}/>
          </div>
          <div>
            <Label htmlFor="companyId">Company</Label>
            <Controller
              name="companyId"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || undefined} 
                  // defaultValue={contact?.companyId || defaultCompanyId || NONE_SELECT_VALUE}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="companyId">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Add any relevant description for this contact..." disabled={isSubmitting}/>
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
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (contact ? 'Saving...' : 'Adding...') : (contact ? 'Save Contact' : 'Add Contact')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
