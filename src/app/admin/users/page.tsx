import { AppPageShell } from "@/components/layout/app-page-shell";
import { UsersListClient } from "@/components/admin/users/users-list-client";

// This page should be protected by middleware to ensure only admin users can access.
// AppPageShell also has a client-side check.

export default function UserManagementPage() {
  return (
    <AppPageShell>
      <UsersListClient />
    </AppPageShell>
  );
}
