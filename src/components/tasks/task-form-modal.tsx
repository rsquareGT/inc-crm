
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagInputField } from '@/components/shared/tag-input-field';
import type { Task, Deal, Contact } from '@/lib/types';
import { generateId } from '@/lib/mock-data';

const NONE_SELECT_VALUE = "_none_";

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  relatedDealId: z.string().optional(),
  relatedContactId: z.string().optional(),
  completed: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  task?: Task | null;
  deals: Deal[];
  contacts: Contact[];
  defaultDealId?: string;
  defaultContactId?: string;
}

export function TaskFormModal({ isOpen, onClose, onSave, task, deals, contacts, defaultDealId, defaultContactId }: TaskFormModalProps) {
  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: task 
      ? { ...task, tags: task.tags || [] } 
      : { 
          title: '', 
          completed: false, 
          tags: [], 
          description: '', 
          dueDate: '', 
          relatedDealId: defaultDealId || undefined, 
          relatedContactId: defaultContactId || undefined 
        },
  });

  const descriptionForAISuggestions = watch('description');

  useEffect(() => {
    if (isOpen) {
      if (task) { // Editing existing task
        reset({ 
          ...task, 
          relatedDealId: task.relatedDealId || undefined, 
          relatedContactId: task.relatedContactId || undefined, 
          tags: task.tags || [] 
        });
      } else { // Adding new task, use defaults
        reset({ 
          title: '', 
          completed: false, 
          tags: [], 
          description: '', 
          dueDate: '', 
          relatedDealId: defaultDealId || undefined, 
          relatedContactId: defaultContactId || undefined 
        });
      }
    }
  }, [isOpen, task, reset, defaultDealId, defaultContactId]);

  const onSubmit = (data: TaskFormData) => {
    const now = new Date().toISOString();
    const taskToSave: Task = {
      id: task?.id || generateId(),
      ...data,
      relatedDealId: data.relatedDealId === NONE_SELECT_VALUE ? undefined : data.relatedDealId,
      relatedContactId: data.relatedContactId === NONE_SELECT_VALUE ? undefined : data.relatedContactId,
      tags: data.tags || [],
      createdAt: task?.createdAt || now,
      updatedAt: now,
    };
    onSave(taskToSave);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Add New Task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update the details of this task.' : 'Enter the details for the new task.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Describe the task..."/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" {...register('dueDate')} />
            </div>
            <div className="flex items-end">
              <Controller
                name="completed"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox id="completed" checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor="completed" className="font-normal">Completed</Label>
                  </div>
                )}
              />
            </div>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="relatedDealId">Related Deal</Label>
              <Controller
                name="relatedDealId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined} >
                    <SelectTrigger id="relatedDealId">
                      <SelectValue placeholder="Select deal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {deals.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="relatedContactId">Related Contact</Label>
               <Controller
                name="relatedContactId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined} >
                    <SelectTrigger id="relatedContactId">
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
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
            <Button type="submit">Save Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

