
import { AppPageShell } from '@/components/layout/app-page-shell';
import { DealDetailsClient } from '@/components/deals/deal-details-client';
import { mockDeals, mockContacts, mockCompanies, mockTasks } from '@/lib/mock-data';
import type { Deal, Contact, Company, Task } from '@/lib/types';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface DealDetailsPageProps {
  params: { dealId: string };
}

// Simulate fetching data
const getDealData = (dealId: string) => {
  const deal = mockDeals.find(d => d.id === dealId);
  const contact = deal?.contactId ? mockContacts.find(c => c.id === deal.contactId) : undefined;
  const company = deal?.companyId ? mockCompanies.find(co => co.id === deal.companyId) : undefined;
  const relatedTasks = mockTasks.filter(t => t.relatedDealId === dealId);
  
  return {
    deal,
    contact,
    company,
    relatedTasks,
    allContacts: mockContacts, // For linking in forms
    allCompanies: mockCompanies, // For linking in forms
    allDeals: mockDeals, // For task form if linking other deals
  };
};

export default function DealDetailsPage({ params }: DealDetailsPageProps) {
  const { dealId } = params;
  const { deal, contact, company, relatedTasks, allContacts, allCompanies, allDeals } = getDealData(dealId);

  if (!deal) {
    return (
      <AppPageShell>
        <div className="container mx-auto py-8">
          <Button variant="outline" asChild className="mb-4">
            <Link href="/deals">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Deals
            </Link>
          </Button>
          <PageSectionHeader title="Deal Not Found" description="The deal you are looking for does not exist." />
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
      <DealDetailsClient
        initialDeal={deal}
        initialContact={contact}
        initialCompany={company}
        initialTasks={relatedTasks}
        allContacts={allContacts}
        allCompanies={allCompanies}
        allDeals={allDeals} // Pass allDeals for TaskFormModal
      />
    </AppPageShell>
  );
}
