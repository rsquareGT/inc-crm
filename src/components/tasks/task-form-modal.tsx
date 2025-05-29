"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInputField } from "@/components/shared/tag-input-field";
import type { Task, Deal, Contact } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const NONE_SELECT_VALUE = "_none_";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  relatedDealId: z
    .string()
    .optional()
    .or(z.literal(NONE_SELECT_VALUE))
    .transform((val) => (val === NONE_SELECT_VALUE ? undefined : val)),
  relatedContactId: z
    .string()
    .optional()
    .or(z.literal(NONE_SELECT_VALUE))
    .transform((val) => (val === NONE_SELECT_VALUE ? undefined : val)),
  completed: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCallback: () => void;
  task?: Task | null;
  deals: Deal[];
  contacts: Contact[];
  defaultDealId?: string;
  defaultContactId?: string;
}

export function TaskFormModal({
  isOpen,
  onClose,
  onSaveCallback,
  task,
  deals,
  contacts,
  defaultDealId,
  defaultContactId,
}: TaskFormModalProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  });

  const descriptionForAISuggestions = watch("description");

  useEffect(() => {
    if (isOpen) {
      const defaultValues = task
        ? {
            ...task,
            relatedDealId: task.relatedDealId || NONE_SELECT_VALUE,
            relatedContactId: task.relatedContactId || NONE_SELECT_VALUE,
            tags: task.tags || [],
          }
        : {
            title: "",
            completed: false,
            tags: [],
            description: "",
            dueDate: "",
            relatedDealId: defaultDealId || NONE_SELECT_VALUE,
            relatedContactId: defaultContactId || NONE_SELECT_VALUE,
          };
      reset(defaultValues);
    }
  }, [isOpen, task, reset, defaultDealId, defaultContactId]);

  const onSubmit = async (data: TaskFormData) => {
    const taskPayload = {
      ...data,
      tags: data.tags || [],
    };

    try {
      let response;
      if (task?.id) {
        response = await fetch(`/api/tasks/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskPayload),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update task");
        }
        toast({ title: "Task Updated", description: `Task "${data.title}" details saved.` });
      } else {
        response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskPayload),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create task");
        }
        toast({ title: "Task Created", description: `New task "${data.title}" added.` });
      }

      onSaveCallback();
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        title: "Error Saving Task",
        description: error instanceof Error ? error.message : "Could not save task.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-2">
          <DialogTitle>{task ? "Edit Task" : "Add New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update the details of this task." : "Enter the details for the new task."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-2"
        >
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} disabled={isSubmitting} />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe the task..."
              disabled={isSubmitting}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} disabled={isSubmitting} />
            </div>
            <div className="flex items-end">
              <Controller
                name="completed"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="completed"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="completed" className="font-normal">
                      Completed
                    </Label>
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="relatedDealId">
                      <SelectValue placeholder="Select deal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {deals.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="relatedContactId">
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.firstName} {c.lastName}
                        </SelectItem>
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
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {task ? "Saving..." : "Adding..."}
                </>
              ) : task ? (
                "Save Task"
              ) : (
                "Add Task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
