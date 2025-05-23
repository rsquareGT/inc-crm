
import { AppPageShell } from '@/components/layout/app-page-shell';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default function DashboardPage() {
  return (
    <AppPageShell>
      <DashboardClient />
    </AppPageShell>
  );
}
