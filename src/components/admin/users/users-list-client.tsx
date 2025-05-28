"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  PlusCircle,
  Edit,
  UserX,
  UserCheck,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import type { User } from "@/lib/types";
import { UserFormModal } from "./user-form-modal";
import { PageSectionHeader } from "@/components/shared/page-section-header";
import { DeleteConfirmationDialog } from "@/components/shared/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { FormattedNoteTimestamp } from "@/components/shared/formatted-note-timestamp"; // Added

export function UsersListClient() {
  const { user: adminUser, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userToToggleActive, setUserToToggleActive] = useState<User | null>(null);
  const [isSubmittingToggle, setIsSubmittingToggle] = useState(false);

  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    if (!adminUser || adminUser.role !== "admin") {
      setError("Unauthorized to view users.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch users: ${response.statusText}`);
      }
      const data: User[] = await response.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(message);
      toast({ title: "Error Fetching Users", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [adminUser, toast]);

  useEffect(() => {
    if (!authLoading && adminUser) {
      fetchUsers();
    } else if (!authLoading && !adminUser) {
      setError("You must be logged in as an admin to view this page.");
      setIsLoading(false);
    }
  }, [fetchUsers, authLoading, adminUser]);

  const handleOpenModal = (user: User | null = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveUserCallback = () => {
    fetchUsers();
  };

  const handleToggleActiveRequest = (user: User) => {
    setUserToToggleActive(user);
    setShowConfirmDialog(true);
  };

  const confirmToggleActive = async () => {
    if (!userToToggleActive || !adminUser) return;

    // Prevent admin from deactivating themselves if they are the only active admin
    if (userToToggleActive.id === adminUser.id && userToToggleActive.isActive) {
      const activeAdmins = users.filter((u) => u.role === "admin" && u.isActive);
      if (activeAdmins.length <= 1) {
        toast({
          title: "Action Restricted",
          description: "Cannot deactivate the only active admin account.",
          variant: "destructive",
        });
        setShowConfirmDialog(false);
        setUserToToggleActive(null);
        return;
      }
    }

    setIsSubmittingToggle(true);
    const newIsActiveStatus = !userToToggleActive.isActive;
    const actionText = newIsActiveStatus ? "activated" : "deactivated";

    try {
      const response = await fetch(`/api/users/${userToToggleActive.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newIsActiveStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${actionText} user`);
      }
      toast({
        title: "User Status Updated",
        description: `User "${userToToggleActive.firstName} ${userToToggleActive.lastName}" has been ${actionText}.`,
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({ title: `Error Updating User Status`, description: message, variant: "destructive" });
    } finally {
      setShowConfirmDialog(false);
      setUserToToggleActive(null);
      setIsSubmittingToggle(false);
    }
  };

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName)
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "U";
  };

  if (isLoading || authLoading) {
    return (
      <div>
        <PageSectionHeader title="User Management" description="Manage users in your organization.">
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New User
          </Button>
        </PageSectionHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead> {/* Added */}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-user-${index}`}>
                <TableCell>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[150px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[200px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[50px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-[90px] rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[120px]" />
                </TableCell>{" "}
                {/* Added */}
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageSectionHeader
          title="User Management"
          description="Manage users in your organization."
        />
        <div className="flex flex-col items-center justify-center h-64">
          <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageSectionHeader title="User Management" description="Manage users in your organization.">
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </PageSectionHeader>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Avatar</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead> {/* Added */}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={user.profilePictureUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                  />
                  <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">
                {user.firstName} {user.lastName}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? "secondary" : "destructive"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {" "}
                {/* Added */}
                <FormattedNoteTimestamp createdAt={user.updatedAt} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenModal(user)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleActiveRequest(user)}
                      className={
                        user.isActive
                          ? "text-destructive hover:!bg-destructive hover:!text-destructive-foreground"
                          : "text-green-600 hover:!bg-green-500 hover:!text-white"
                      }
                      disabled={
                        user.id === adminUser?.id &&
                        user.isActive &&
                        users.filter((u) => u.role === "admin" && u.isActive).length <= 1
                      }
                    >
                      {user.isActive ? (
                        <UserX className="mr-2 h-4 w-4" />
                      ) : (
                        <UserCheck className="mr-2 h-4 w-4" />
                      )}
                      {user.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center h-24">
                No users found.
              </TableCell>{" "}
              {/* Updated colSpan */}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {isModalOpen && adminUser && (
        <UserFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSaveCallback={handleSaveUserCallback}
          user={editingUser}
          organizationId={adminUser.organizationId}
        />
      )}

      <DeleteConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmToggleActive}
        title={`Confirm ${userToToggleActive?.isActive ? "Deactivation" : "Activation"}`}
        description={`Are you sure you want to ${userToToggleActive?.isActive ? "deactivate" : "activate"} user "${userToToggleActive?.firstName} ${userToToggleActive?.lastName}"?`}
        itemName={`user ${userToToggleActive?.firstName} ${userToToggleActive?.lastName}`}
      />
    </div>
  );
}
