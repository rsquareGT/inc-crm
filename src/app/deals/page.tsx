import { AppPageShell } from "@/components/layout/app-page-shell";
import { KanbanBoardClient } from "@/components/deals/kanban-board-client";

export default function DealsPage() {
  return (
    <AppPageShell>
      <KanbanBoardClient />
    </AppPageShell>
  );
}
