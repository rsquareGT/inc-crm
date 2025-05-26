
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2, ExternalLink, LayoutGrid, ListFilter, ArrowUpDown } from 'lucide-react';
import type { Contact, Company } from '@/lib/types';
import { ContactFormModal } from './contact-form-modal';
import { ContactCard } from './contact-card';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { TagBadge } from '@/components/shared/tag-badge';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

type SortByType = 'lastName' | 'email' | 'companyName' | 'createdAt' | '';

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

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortByType>('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
  
  const resolvedCompanies = useMemo(() => {
      const map = new Map<string, Company>();
      companies.forEach(c => map.set(c.id, c));
      return map;
  }, [companies]);

  const displayedContacts = useMemo(() => {
    let items = [...contacts];
    if (searchTerm) {
      items = items.filter(contact =>
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortBy) {
      items.sort((a, b) => {
        let comparison = 0;
        const factor = sortOrder === 'asc' ? 1 : -1;

        if (sortBy === 'lastName') {
          comparison = (a.lastName || '').toLowerCase().localeCompare((b.lastName || '').toLowerCase());
          if (comparison === 0) {
            comparison = (a.firstName || '').toLowerCase().localeCompare((b.firstName || '').toLowerCase());
          }
        } else if (sortBy === 'email') {
          comparison = (a.email || '').toLowerCase().localeCompare((b.email || '').toLowerCase());
        } else if (sortBy === 'companyName') {
          const companyA = a.companyId ? resolvedCompanies.get(a.companyId)?.name || '' : '';
          const companyB = b.companyId ? resolvedCompanies.get(b.companyId)?.name || '' : '';
          comparison = companyA.toLowerCase().localeCompare(companyB.toLowerCase());
        } else if (sortBy === 'createdAt') {
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return comparison * factor;
      });
    }
    return items;
  }, [contacts, searchTerm, sortBy, sortOrder, resolvedCompanies]);


  if (isLoadingContacts || isLoadingCompanies) {
    return (
      <div>
        <PageSectionHeader title="Contacts" description="Manage your contacts.">
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Contact
          </Button>
        </PageSectionHeader>
        <div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-6">
          <Skeleton className="h-10 w-full md:max-w-xs lg:max-w-sm" />
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Skeleton className="h-10 w-[160px]" />
            <Skeleton className="h-10 w-10" />
            <div className="flex items-center border rounded-md">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
            </div>
            <Skeleton className="h-10 w-[150px]" />
          </div>
        </div>
         <Card className="shadow-sm">
          <CardContent className={viewMode === 'list' ? "p-0" : "pt-6"}>
            {viewMode === 'list' ? (
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
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Card key={`skeleton-contact-card-${index}`} className="shadow-md flex flex-col">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center min-w-0">
                            <Skeleton className="h-5 w-5 mr-2 rounded-full" />
                            <Skeleton className="h-5 w-3/4" />
                        </div>
                        <Skeleton className="h-6 w-6" />
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-2 text-sm flex-grow">
                      <div className="flex items-center"><Skeleton className="h-4 w-4 mr-2 rounded-full" /><Skeleton className="h-4 w-3/5" /></div>
                      <div className="flex items-center"><Skeleton className="h-4 w-4 mr-2 rounded-full" /><Skeleton className="h-4 w-4/5" /></div>
                      <div className="flex items-center"><Skeleton className="h-4 w-4 mr-2 rounded-full" /><Skeleton className="h-4 w-3/5" /></div>
                    </CardContent>
                    <CardFooter className="px-4 pt-2 pb-4 flex flex-wrap gap-1 border-t mt-auto">
                      <Skeleton className="h-5 w-12 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
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

      <div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-6">
        <Input
          placeholder="Filter by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-full md:max-w-xs lg:max-w-sm"
        />
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortByType)}>
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastName">Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="companyName">Company</SelectItem>
              <SelectItem value="createdAt">Date Created</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} aria-label="Toggle sort order">
            <ArrowUpDown className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          </Button>
          <div className="flex items-center border rounded-md">
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} aria-label="List view">
              <ListFilter className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className={viewMode === 'list' ? "p-0" : "pt-6"}>
          {viewMode === 'list' ? (
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
                {displayedContacts.map((contact) => (
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
                {displayedContacts.length === 0 && !isLoadingContacts && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No contacts found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  company={contact.companyId ? resolvedCompanies.get(contact.companyId) : undefined}
                  onEdit={() => handleOpenModal(contact)}
                  onDelete={() => handleDeleteContact(contact.id)}
                />
              ))}
              {displayedContacts.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-10">
                  No contacts found matching your criteria.
                </p>
              )}
            </div>
          )}
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
        itemName={contacts.find(c => c.id === contactToDelete)?.firstName + " " + (contacts.find(c => c.id === contactToDelete)?.lastName || "") || "this contact"}
      />
    </div>
  );
}
