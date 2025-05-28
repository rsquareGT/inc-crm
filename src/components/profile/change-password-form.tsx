"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "nextjs-toploader/app";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters long"),
    // Example complexity rules (can be uncommented and customized)
    // .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    // .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    // .regex(/[0-9]/, "Password must contain at least one number")
    // .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"], // Set error on confirmPassword field
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsSubmittingForm(true);
    setFormError(null);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to change password.");
      }

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      reset(); // Clear form fields
      // Optional: Redirect to profile or dashboard page
      // router.push('/profile');
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      setFormError(message);
      toast({
        title: "Password Change Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {formError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md">
          {formError}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register("currentPassword")}
          disabled={isSubmittingForm}
          className={errors.currentPassword || formError ? "border-destructive" : ""}
        />
        {errors.currentPassword && (
          <p className="text-sm text-destructive mt-1">{errors.currentPassword.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
          disabled={isSubmittingForm}
          className={errors.newPassword ? "border-destructive" : ""}
        />
        {errors.newPassword && (
          <p className="text-sm text-destructive mt-1">{errors.newPassword.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
          disabled={isSubmittingForm}
          className={errors.confirmPassword ? "border-destructive" : ""}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmittingForm}>
        {isSubmittingForm ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating Password...
          </>
        ) : (
          <>
            <KeyRound className="mr-2 h-4 w-4" />
            Change Password
          </>
        )}
      </Button>
    </form>
  );
}
