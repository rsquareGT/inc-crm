import { AppPageShell } from "@/components/layout/app-page-shell";
import { CompanyDetailsClient } from "@/components/companies/company-details-client";
// mockCompanies, mockContacts, mockDeals are no longer the primary source for this page.
// Data will be fetched server-side or client-side from APIs.
import type { Company, Contact, Deal } from "@/lib/types";
import { PageSectionHeader } from "@/components/shared/page-section-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface CompanyDetailsPageProps {
  params: { companyId: string };
}

// This function would ideally fetch data server-side using the companyId.
// For now, CompanyDetailsClient will handle client-side fetching.
async function getCompanyInitialData(companyId: string): Promise<{ company: Company | null }> {
  // In a real app, you'd fetch from your DB/API here.
  // Example: const company = await fetch(`/api/companies/${companyId}`).then(res => res.json());
  // For now, we'll pass null and let the client fetch.
  // To prevent build errors if API is not ready, we pass a minimal structure or null.
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9002"}/api/companies/${companyId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { company: null };
    return { company: await res.json() };
  } catch (error) {
    console.error("Failed to fetch initial company data for details page:", error);
    return { company: null };
  }
}

export default async function CompanyDetailsPage({ params }: CompanyDetailsPageProps) {
  const { companyId } = await params;
  // const { company } = await getCompanyInitialData(companyId); // Server-side fetch example
  // For this phase, we'll primarily rely on client-side fetching within CompanyDetailsClient.
  // Passing companyId to the client component is sufficient for it to fetch its own data.

  // The CompanyDetailsClient will handle fetching and displaying related contacts and deals.
  // `allCompanies` and `allContacts` are still needed for form dropdowns and will be fetched by the client component
  // or passed if fetched server-side.

  // If initialCompany is null (e.g. fetch failed or not found), CompanyDetailsClient will show loading/error.
  return (
    <AppPageShell>
      <CompanyDetailsClient
        companyId={companyId}
        // initialCompany={company} // Pass if using server-side fetch
        // For now, these are fetched client-side or use mocks
        // initialContacts={[]}
        // initialDeals={[]}
        // allCompanies={[]}
        // allContacts={[]}
      />
    </AppPageShell>
  );
}
