
import { AppPageShell } from '@/components/layout/app-page-shell';
import { OrganizationProfileClient } from '@/components/organization/organization-profile-client';

// This page should be protected by middleware to ensure only authenticated users can access.
// The client component will further check for admin role for edit capabilities.

export default function OrganizationProfilePage() {
  return (
    <AppPageShell>
      <OrganizationProfileClient />
    </AppPageShell>
  );
}
