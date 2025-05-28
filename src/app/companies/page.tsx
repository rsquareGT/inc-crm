import { AppPageShell } from "@/components/layout/app-page-shell";
import { CompaniesListClient } from "@/components/companies/companies-list-client";

export default function CompaniesPage() {
  return (
    <AppPageShell>
      <CompaniesListClient />
    </AppPageShell>
  );
}
