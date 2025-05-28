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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInputField } from "@/components/shared/tag-input-field";
import type { Deal, DealStage, Contact, Company } from "@/lib/types";
import { DEAL_STAGES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const NONE_SELECT_VALUE = "_none_";

const dealSchema = z.object({
  name: z.string().min(1, "Deal name is required"),
  value: z.coerce.number().min(0, "Value must be positive"),
  stage: z.enum(DEAL_STAGES as [DealStage, ...DealStage[]], {
    required_error: "Stage is required",
  }),
  contactId: z
    .string()
    .optional()
    .or(z.literal(NONE_SELECT_VALUE))
    .transform((val) => (val === NONE_SELECT_VALUE ? undefined : val)),
  companyId: z
    .string()
    .optional()
    .or(z.literal(NONE_SELECT_VALUE))
    .transform((val) => (val === NONE_SELECT_VALUE ? undefined : val)),
  expectedCloseDate: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCallback: () => void;
  deal?: Deal | null;
  contacts: Contact[];
  companies: Company[];
  defaultContactId?: string;
  defaultCompanyId?: string;
}

export function DealFormModal({
  isOpen,
  onClose,
  onSaveCallback,
  deal,
  contacts,
  companies,
  defaultContactId,
  defaultCompanyId,
}: DealFormModalProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
  });

  const descriptionForAISuggestions = watch("description");

  useEffect(() => {
    if (isOpen) {
      const defaultValues = deal
        ? {
            name: deal.name,
            value: deal.value,
            stage: deal.stage,
            contactId: deal.contactId || NONE_SELECT_VALUE,
            companyId: deal.companyId || NONE_SELECT_VALUE,
            expectedCloseDate: deal.expectedCloseDate || "",
            description: deal.description || "",
            tags: deal.tags || [],
          }
        : {
            name: "",
            value: 0,
            stage: "Opportunity" as DealStage,
            contactId: defaultContactId || NONE_SELECT_VALUE,
            companyId: defaultCompanyId || NONE_SELECT_VALUE,
            expectedCloseDate: "",
            description: "",
            tags: [],
          };
      reset(defaultValues);
    }
  }, [isOpen, deal, reset, defaultContactId, defaultCompanyId]);

  const onSubmit = async (data: DealFormData) => {
    const dealPayload = {
      ...data,
      tags: data.tags || [],
    };

    try {
      let response;
      if (deal?.id) {
        response = await fetch(`/api/deals/${deal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dealPayload),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update deal");
        }
        toast({ title: "Deal Updated", description: `"${data.name}" details saved.` });
      } else {
        response = await fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dealPayload),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create deal");
        }
        toast({ title: "Deal Created", description: `New deal "${data.name}" added.` });
      }

      onSaveCallback();
      onClose();
    } catch (error) {
      console.error("Error saving deal:", error);
      toast({
        title: "Error Saving Deal",
        description: error instanceof Error ? error.message : "Could not save deal.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{deal ? "Edit Deal" : "Add New Deal"}</DialogTitle>
          <DialogDescription>
            {deal ? "Update the details of this deal." : "Enter the details for the new deal."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2"
        >
          <div>
            <Label htmlFor="name">Deal Name</Label>
            <Input id="name" {...register("name")} disabled={isSubmitting} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value">Value ($)</Label>
              <Input id="value" type="number" {...register("value")} disabled={isSubmitting} />
              {errors.value && (
                <p className="text-sm text-destructive mt-1">{errors.value.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="stage">Stage</Label>
              <Controller
                name="stage"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="stage">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.stage && (
                <p className="text-sm text-destructive mt-1">{errors.stage.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactId">Contact</Label>
              <Controller
                name="contactId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="contactId">
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
            <div>
              <Label htmlFor="companyId">Company</Label>
              <Controller
                name="companyId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="companyId">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
            <Input
              id="expectedCloseDate"
              type="date"
              {...register("expectedCloseDate")}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Add any relevant description for this deal..."
              disabled={isSubmitting}
            />
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
                  {deal ? "Saving..." : "Adding..."}
                </>
              ) : deal ? (
                "Save Deal"
              ) : (
                "Add Deal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
