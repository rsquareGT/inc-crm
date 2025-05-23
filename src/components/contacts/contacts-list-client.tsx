
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { MoreHorizontal, PlusCircle, Edit, Trash2, ExternalLink } from 'lucide-react';
import type { Contact, Company } from '@/lib/types';
import { ContactFormModal } from './contact-form-modal';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { TagBadge } from '@/components/shared/tag-badge';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export function ContactsListClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]); 
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchContacts = useCallback(async () => {
    setIsLoadingContacts(true);
    setError(null);
    try {
      const response = await fetch('/api/contacts');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch contacts: ${response.statusText}`);
      }
      const data: Contact[] = await response.json();
      setContacts(data);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message);
      toast({ title: "Error Fetching Contacts", description: message, variant: "destructive" });
    } finally {
      setIsLoadingContacts(false);
    }
  }, [toast]);

  const fetchCompaniesForForm = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch companies for form: ${response.statusText}`);
      }
      const data: Company[] = await response.json();
      setCompanies(data);
    } catch (err) {
      console.error("Error loading companies for ContactFormModal:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred loading companies for form.';
      toast({ title: "Error Loading Companies for Form", description: message, variant: "destructive" });
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchContacts();
    fetchCompaniesForForm();
  }, [fetchContacts, fetchCompaniesForForm]);

  const handleOpenModal = (contact: Contact | null = null) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleSaveContactCallback = () => {
    fetchContacts(); 
    handleCloseModal();
  };
  
  const handleDeleteContact = (contactId: string) => {
    setContactToDelete(contactId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;
    
    const contact = contacts.find(c => c.id === contactToDelete);
    const contactName = contact ? `${contact.firstName} ${contact.lastName}` : "Contact";

    try {
      const response = await fetch(`/api/contacts/${contactToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete contact: ${response.statusText}`);
      }
      toast({ title: "Contact Deleted", description: `Contact "${contactName}" has been deleted.`});
      setContacts(prevContacts => prevContacts.filter(c => c.id !== contactToDelete));
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Deleting Contact", description: message, variant: "destructive" });
    } finally {
      setShowDeleteDialog(false);
      setContactToDelete(null);
    }
  };


  const getCompanyName = (companyId?: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      return <Link href={`/companies/${company.id}`} className="hover:underline text-primary">{company.name}</Link>;
    }
    return 'N/A';
  };
  
  if (isLoadingContacts || isLoadingCompanies) {
    return (
      <div>
        <PageSectionHeader title="Contacts" description="Manage your contacts.">
          <Button disabled>
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
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-row-${index}`}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-12 rounded-full" /><Skeleton className="h-5 w-12 rounded-full" /></div></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error && contacts.length === 0) { 
     return (
      <div>
        <PageSectionHeader title="Contacts" description="Manage your contacts.">
           <Button onClick={() => handleOpenModal()} disabled={isLoadingCompanies}>
             <PlusCircle className="mr-2 h-4 w-4" /> Add New Contact
           </Button>
        </PageSectionHeader>
        <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-20rem)]">
            <p className="text-lg text-destructive">Error loading contacts: {error}</p>
        </div>
      </div>
    );
  }


  return (
    <div>
      <PageSectionHeader title="Contacts" description="Manage your contacts.">
        <Button onClick={() => handleOpenModal()} disabled={isLoadingCompanies}>
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
                  <TableCell className="font-medium">
                    <Link href={`/contacts/${contact.id}`} className="hover:underline text-primary">
                        {contact.firstName} {contact.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.phone || 'N/A'}</TableCell>
                  <TableCell>{getCompanyName(contact.companyId)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(contact.tags || []).slice(0, 2).map(tag => <TagBadge key={tag} tag={tag} />)}
                      {(contact.tags || []).length > 2 && <Badge variant="outline">+{contact.tags.length - 2}</Badge>}
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
                        <DropdownMenuItem asChild>
                            <Link href={`/contacts/${contact.id}`} className="flex items-center w-full">
                               <ExternalLink className="mr-2 h-4 w-4" /> View Details
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenModal(contact)} disabled={isLoadingCompanies}>
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
              {contacts.length === 0 && !isLoadingContacts && (
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
        onSaveCallback={handleSaveContactCallback}
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

    