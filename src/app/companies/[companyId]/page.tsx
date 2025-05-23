
import { AppPageShell } from '@/components/layout/app-page-shell';
import { CompanyDetailsClient } from '@/components/companies/company-details-client';
import { mockCompanies, mockContacts, mockDeals } from '@/lib/mock-data';
import type { Company, Contact, Deal } from '@/lib/types';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface CompanyDetailsPageProps {
  params: { companyId: string };
}

// Simulate fetching data - in a real app, this would be an async server function
const getCompanyData = (companyId: string) => {
  const company = mockCompanies.find(c => c.id === companyId);
  const relatedContacts = mockContacts.filter(c => c.companyId === companyId);
  const relatedDeals = mockDeals.filter(d => d.companyId === companyId);

  return {
    company,
    relatedContacts,
    relatedDeals,
    allCompanies: mockCompanies, // For linking in forms
    allContacts: mockContacts, // For linking in forms
  };
};

export default function CompanyDetailsPage({ params }: CompanyDetailsPageProps) {
  const { companyId } = params;
  const { company, relatedContacts, relatedDeals, allCompanies, allContacts } = getCompanyData(companyId);

  if (!company) {
    return (
      <AppPageShell>
        <div className="container mx-auto py-8">
          <Button variant="outline" asChild className="mb-4">
            <Link href="/companies">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Companies
            </Link>
          </Button>
          <PageSectionHeader title="Company Not Found" description="The company you are looking for does not exist." />
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
      <CompanyDetailsClient
        initialCompany={company}
        initialContacts={relatedContacts}
        initialDeals={relatedDeals}
        allCompanies={allCompanies}
        allContacts={allContacts}
      />
    </AppPageShell>
  );
}
