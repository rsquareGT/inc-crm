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
import { TagInputField } from '@/components/shared/tag-input-field';
import type { Company } from '@/lib/types';
import { generateId } from '@/lib/mock-data';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  industry: z.string().optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (company: Company) => void;
  company?: Company | null;
}

export function CompanyFormModal({ isOpen, onClose, onSave, company }: CompanyFormModalProps) {
  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: company 
      ? { ...company, tags: company.tags || [] } 
      : { name: '', tags: [] },
  });

  const notesForAISuggestions = watch('notes');

  useEffect(() => {
    if (isOpen) {
      reset(company ? { ...company, tags: company.tags || [] } : { name: '', tags: [], notes: '', industry: '', website: '', address: '' });
    }
  }, [isOpen, company, reset]);

  const onSubmit = (data: CompanyFormData) => {
    const now = new Date().toISOString();
    const companyToSave: Company = {
      id: company?.id || generateId(),
      ...data,
      tags: data.tags || [],
      createdAt: company?.createdAt || now,
      updatedAt: now,
    };
    onSave(companyToSave);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{company ? 'Edit Company' : 'Add New Company'}</DialogTitle>
          <DialogDescription>
            {company ? 'Update the details of this company.' : 'Enter the details for the new company.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" {...register('industry')} />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" {...register('website')} placeholder="https://example.com"/>
              {errors.website && <p className="text-sm text-destructive mt-1">{errors.website.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} placeholder="Add any relevant notes for this company..."/>
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
                        textToSuggestFrom={notesForAISuggestions}
                        placeholder="Add relevant tags..."
                    />
                )}
            />
          </div>
          <DialogFooter>
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
