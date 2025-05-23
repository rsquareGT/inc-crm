
import { AppPageShell } from '@/components/layout/app-page-shell';
import { ContactDetailsClient } from '@/components/contacts/contact-details-client';
// mockContacts, mockCompanies, mockDeals are no longer used.
// Data will be fetched client-side by ContactDetailsClient from APIs.
import type { Contact, Company, Deal } from '@/lib/types'; // Keep types for reference if needed
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ContactDetailsPageProps {
  params: { contactId: string };
}

// The getContactData function based on mock data is no longer needed.
// ContactDetailsClient will handle client-side fetching.

export default function ContactDetailsPage({ params }: ContactDetailsPageProps) {
  const { contactId } = params;

  // ContactDetailsClient will fetch its own data using the contactId.
  // No initial data needs to be passed from here other than the ID.
  return (
    <AppPageShell>
      <ContactDetailsClient
        contactId={contactId}
        // initialContact, initialCompany, initialDeals are fetched by the client component
        // allCompanies, allContacts are also fetched by the client component for form dropdowns
      />
    </AppPageShell>
  );
}
