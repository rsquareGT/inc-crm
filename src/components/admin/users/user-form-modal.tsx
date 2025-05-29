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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User, UserRole } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Schema for new user (password required)
const newUserFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"] as [UserRole, ...UserRole[]], {
    required_error: "Role is required",
  }),
  profilePictureUrl: z.string().url().or(z.literal("")).optional(),
  isActive: z.boolean().default(true),
});

// Schema for editing user (password optional)
const editUserFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")), // Optional for edit
  role: z.enum(["admin", "user"] as [UserRole, ...UserRole[]], {
    required_error: "Role is required",
  }),
  profilePictureUrl: z.string().url().or(z.literal("")).optional(),
  isActive: z.boolean().default(true),
});

type UserFormData = z.infer<typeof newUserFormSchema> | z.infer<typeof editUserFormSchema>;

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCallback: () => void;
  user?: User | null; // Existing user for editing
  organizationId: string; // Organization ID for the new/edited user
}

export function UserFormModal({
  isOpen,
  onClose,
  onSaveCallback,
  user,
  organizationId,
}: UserFormModalProps) {
  const { toast } = useToast();
  const isEditing = !!user;
  const formSchema = isEditing ? editUserFormSchema : newUserFormSchema;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues = user
        ? {
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email,
            password: "", // Password field is empty by default on edit
            role: user.role,
            profilePictureUrl: user.profilePictureUrl || "",
            isActive: user.isActive,
          }
        : {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            role: "user" as UserRole,
            profilePictureUrl: "",
            isActive: true,
          };
      reset(defaultValues);
    }
  }, [isOpen, user, reset, isEditing]);

  const onSubmit = async (data: UserFormData) => {
    // Do not send empty password string if not changed during edit
    const payload = { ...data, organizationId };
    if (isEditing && (payload as any).password === "") {
      delete (payload as any).password;
    }

    try {
      let response;
      if (isEditing && user?.id) {
        response = await fetch(`/api/users/${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update user");
        }
        toast({
          title: "User Updated",
          description: `${data.firstName} ${data.lastName}'s details saved.`,
        });
      } else {
        response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload), // organizationId is already in payload
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create user");
        }
        toast({
          title: "User Created",
          description: `New user ${data.firstName} ${data.lastName} added.`,
        });
      }

      onSaveCallback();
      onClose();
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        title: "Error Saving User",
        description: error instanceof Error ? error.message : "Could not save user.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-2">
          <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details of this user." : "Enter the details for the new user."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-2"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register("firstName")} disabled={isSubmitting} />
              {errors.firstName && (
                <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register("lastName")} disabled={isSubmitting} />
              {errors.lastName && (
                <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} disabled={isSubmitting} />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">{isEditing ? "New Password (optional)" : "Password"}</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder={isEditing ? "Leave blank to keep current" : "Enter password"}
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="profilePictureUrl">Profile Picture URL (optional)</Label>
            <Input
              id="profilePictureUrl"
              {...register("profilePictureUrl")}
              placeholder="https://example.com/image.png"
              disabled={isSubmitting}
            />
            {errors.profilePictureUrl && (
              <p className="text-sm text-destructive mt-1">{errors.profilePictureUrl.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <Label htmlFor="role">Role</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && (
                <p className="text-sm text-destructive mt-1">{errors.role.message}</p>
              )}
            </div>
            <div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="isActive"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="isActive" className="font-normal">
                      User is Active
                    </Label>
                  </div>
                )}
              />
            </div>
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
                  {isEditing ? "Saving..." : "Adding..."}
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Add User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
