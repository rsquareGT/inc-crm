import { AppPageShell } from '@/components/layout/app-page-shell';
import { TasksListClient } from '@/components/tasks/tasks-list-client';

export default function TasksPage() {
  return (
    <AppPageShell>
      <TasksListClient />
    </AppPageShell>
  );
}
