import { AppPageShell } from '@/components/layout/app-page-shell';
import { ContactsListClient } from '@/components/contacts/contacts-list-client';

export default function ContactsPage() {
  return (
    <AppPageShell>
      <ContactsListClient />
    </AppPageShell>
  );
}
