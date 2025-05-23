
import { AppPageShell } from '@/components/layout/app-page-shell';
import { ContactDetailsClient } from '@/components/contacts/contact-details-client';
import { mockContacts, mockCompanies, mockDeals } from '@/lib/mock-data';
import type { Contact, Company, Deal } from '@/lib/types';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ContactDetailsPageProps {
  params: { contactId: string };
}

// Simulate fetching data
const getContactData = (contactId: string) => {
  const contact = mockContacts.find(c => c.id === contactId);
  const company = contact?.companyId ? mockCompanies.find(co => co.id === contact.companyId) : undefined;
  const relatedDeals = mockDeals.filter(d => d.contactId === contactId);

  return {
    contact,
    company,
    relatedDeals,
    allCompanies: mockCompanies, // For linking in forms
    allContacts: mockContacts, // For linking other contacts if needed
  };
};

export default function ContactDetailsPage({ params }: ContactDetailsPageProps) {
  const { contactId } = params;
  const { contact, company, relatedDeals, allCompanies, allContacts } = getContactData(contactId);

  if (!contact) {
    return (
      <AppPageShell>
        <div className="container mx-auto py-8">
          <Button variant="outline" asChild className="mb-4">
            <Link href="/contacts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contacts
            </Link>
          </Button>
          <PageSectionHeader title="Contact Not Found" description="The contact you are looking for does not exist." />
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
      <ContactDetailsClient
        initialContact={contact}
        initialCompany={company}
        initialDeals={relatedDeals}
        allCompanies={allCompanies}
        allContacts={allContacts}
      />
    </AppPageShell>
  );
}
