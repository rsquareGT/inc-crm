'use client';

import React, { useState, useEffect } from 'react';
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
import type { Deal, DealStage, Contact, Company } from '@/lib/types';
import { DEAL_STAGES } from '@/lib/constants';
import { generateId } from '@/lib/mock-data';

const dealSchema = z.object({
  name: z.string().min(1, 'Deal name is required'),
  value: z.coerce.number().min(0, 'Value must be positive'),
  stage: z.enum(DEAL_STAGES as [DealStage, ...DealStage[]], { required_error: 'Stage is required' }),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deal: Deal) => void;
  deal?: Deal | null; // For editing
  contacts: Contact[];
  companies: Company[];
}

export function DealFormModal({ isOpen, onClose, onSave, deal, contacts, companies }: DealFormModalProps) {
  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: deal 
      ? { ...deal, tags: deal.tags || [] } 
      : { name: '', value: 0, stage: 'Opportunity', tags: [] },
  });

  const notesForAISuggestions = watch('notes');

  useEffect(() => {
    if (isOpen) {
      reset(deal ? { ...deal, tags: deal.tags || [] } : { name: '', value: 0, stage: 'Opportunity', tags: [], notes: '', expectedCloseDate: '' });
    }
  }, [isOpen, deal, reset]);

  const onSubmit = (data: DealFormData) => {
    const now = new Date().toISOString();
    const dealToSave: Deal = {
      id: deal?.id || generateId(),
      ...data,
      tags: data.tags || [],
      createdAt: deal?.createdAt || now,
      updatedAt: now,
    };
    onSave(dealToSave);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{deal ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
          <DialogDescription>
            {deal ? 'Update the details of this deal.' : 'Enter the details for the new deal.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="name">Deal Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value">Value ($)</Label>
              <Input id="value" type="number" {...register('value')} />
              {errors.value && <p className="text-sm text-destructive mt-1">{errors.value.message}</p>}
            </div>
            <div>
              <Label htmlFor="stage">Stage</Label>
              <Controller
                name="stage"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="stage">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.stage && <p className="text-sm text-destructive mt-1">{errors.stage.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactId">Contact</Label>
              <Controller
                name="contactId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="contactId">
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
             <div>
              <Label htmlFor="companyId">Company</Label>
              <Controller
                name="companyId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="companyId">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
            <Input id="expectedCloseDate" type="date" {...register('expectedCloseDate')} />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} placeholder="Add any relevant notes for this deal..."/>
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
            <Button type="submit">Save Deal</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
