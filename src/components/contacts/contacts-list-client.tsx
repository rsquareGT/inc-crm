'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { Contact, Company } from '@/lib/types';
import { mockContacts, mockCompanies } from '@/lib/mock-data';
import { ContactFormModal } from './contact-form-modal';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { TagBadge } from '@/components/shared/tag-badge';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function ContactsListClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setContacts(mockContacts);
    setCompanies(mockCompanies);
  }, []);

  const handleOpenModal = (contact: Contact | null = null) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleSaveContact = (contactToSave: Contact) => {
    setContacts((prevContacts) => {
      const existingIndex = prevContacts.findIndex((c) => c.id === contactToSave.id);
      if (existingIndex > -1) {
        const updatedContacts = [...prevContacts];
        updatedContacts[existingIndex] = contactToSave;
        toast({ title: "Contact Updated", description: `${contactToSave.firstName} ${contactToSave.lastName} updated.` });
        return updatedContacts;
      }
      toast({ title: "Contact Created", description: `New contact ${contactToSave.firstName} ${contactToSave.lastName} added.` });
      return [...prevContacts, contactToSave];
    });
  };
  
  const handleDeleteContact = (contactId: string) => {
    setContactToDelete(contactId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteContact = () => {
    if (contactToDelete) {
      const contact = contacts.find(c => c.id === contactToDelete);
      setContacts(prevContacts => prevContacts.filter(c => c.id !== contactToDelete));
      toast({ title: "Contact Deleted", description: `${contact?.firstName} ${contact?.lastName} has been deleted.`, variant: "destructive" });
    }
    setShowDeleteDialog(false);
    setContactToDelete(null);
  };


  const getCompanyName = (companyId?: string) => {
    return companies.find(c => c.id === companyId)?.name || 'N/A';
  };

  return (
    <div>
      <PageSectionHeader title="Contacts" description="Manage your contacts.">
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Contact
        </Button>
      </PageSectionHeader>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.firstName} {contact.lastName}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.phone || 'N/A'}</TableCell>
                  <TableCell>{getCompanyName(contact.companyId)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 2).map(tag => <TagBadge key={tag} tag={tag} />)}
                      {contact.tags.length > 2 && <Badge variant="outline">+{contact.tags.length - 2}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal(contact)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteContact(contact.id)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">No contacts found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      <ContactFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveContact}
        contact={editingContact}
        companies={companies}
      />

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteContact}
        itemName={contacts.find(c => c.id === contactToDelete)?.firstName + " " + contacts.find(c => c.id === contactToDelete)?.lastName || "this contact"}
      />
    </div>
  );
}

// Dummy Card components if not imported from shadcn/ui directly or for structure
const Card = ({className, children}: {className?: string, children: React.ReactNode}) => <div className={`rounded-lg border bg-card text-card-foreground ${className}`}>{children}</div>;
const CardContent = ({className, children}: {className?: string, children: React.ReactNode}) => <div className={`${className}`}>{children}</div>;

