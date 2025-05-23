
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
import { generateId } from '@/lib/mock-data';

const NONE_SELECT_VALUE = "_none_";

const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  companyId: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Contact) => void;
  contact?: Contact | null;
  companies: Company[];
  defaultCompanyId?: string; // To pre-select company if adding from company page
}

export function ContactFormModal({ isOpen, onClose, onSave, contact, companies, defaultCompanyId }: ContactFormModalProps) {
  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contact 
      ? { 
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone || '',
          companyId: contact.companyId || undefined,
          description: contact.description || '',
          tags: contact.tags || [] 
        } 
      : { 
          firstName: '', 
          lastName: '', 
          email: '', 
          phone: '',
          companyId: defaultCompanyId || undefined,
          description: '', 
          tags: [] 
        },
  });

  const descriptionForAISuggestions = watch('description');

  useEffect(() => {
    if (isOpen) {
      reset(contact 
        ? { 
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone || '',
            companyId: contact.companyId || undefined,
            description: contact.description || '',
            tags: contact.tags || [] 
          } 
        : { 
            firstName: '', 
            lastName: '', 
            email: '', 
            phone: '',
            companyId: defaultCompanyId || undefined,
            description: '', 
            tags: [] 
          });
    }
  }, [isOpen, contact, reset, defaultCompanyId]);

  const onSubmit = (data: ContactFormData) => {
    const now = new Date().toISOString();
    const contactToSave: Contact = {
      id: contact?.id || generateId(),
      ...data,
      companyId: data.companyId === NONE_SELECT_VALUE ? undefined : data.companyId,
      tags: data.tags || [],
      notes: contact?.notes || [], // Preserve existing notes
      createdAt: contact?.createdAt || now,
      updatedAt: now,
    };
    onSave(contactToSave);
    onClose();
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
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
                  defaultValue={contact?.companyId || defaultCompanyId || undefined}
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
            <Textarea id="description" {...register('description')} placeholder="Add any relevant description for this contact..."/>
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
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save Contact</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
