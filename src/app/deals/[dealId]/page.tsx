import { AppPageShell } from "@/components/layout/app-page-shell";
import { DealDetailsClient } from "@/components/deals/deal-details-client";
// Mock data no longer primary source
import type { Deal, Contact, Company, Task } from "@/lib/types";
import { PageSectionHeader } from "@/components/shared/page-section-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface DealDetailsPageProps {
  params: { dealId: string };
}

// This function would ideally fetch data server-side using the dealId.
// For now, DealDetailsClient will handle client-side fetching.
async function getDealInitialData(dealId: string): Promise<{ deal: Deal | null }> {
  // In a real app, you'd fetch from your DB/API here.
  // Example: const deal = await fetch(`/api/deals/${dealId}`).then(res => res.json());
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9002"}/api/deals/${dealId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { deal: null };
    return { deal: await res.json() };
  } catch (error) {
    console.error("Failed to fetch initial deal data for details page:", error);
    return { deal: null };
  }
}

export default async function DealDetailsPage({ params }: DealDetailsPageProps) {
  const { dealId } = await params;
  // const { deal } = await getDealInitialData(dealId); // Server-side fetch example
  // Passing dealId to the client component is sufficient for it to fetch its own data.
  // `allContacts`, `allCompanies`, `allDeals` are needed for form dropdowns and will be fetched by the client component.

  return (
    <AppPageShell>
      <DealDetailsClient
        dealId={dealId} // Pass dealId to client for it to fetch
        // initialDeal={deal} // Pass if using server-side fetch
        // The client component will fetch its own related data like tasks, notes, and lists for forms
      />
    </AppPageShell>
  );
}
