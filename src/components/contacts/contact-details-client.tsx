
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Contact, Company, Deal, Note } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactFormModal } from './contact-form-modal';
import { DealFormModal } from '@/components/deals/deal-form-modal';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle, ArrowLeft, Mail, Phone, Briefcase, FileText, MessageSquarePlus, MessageSquareText, UserCircle, ExternalLink, Loader2 } from 'lucide-react';
import { TagBadge } from '@/components/shared/tag-badge';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { FormattedNoteTimestamp } from '@/components/shared/formatted-note-timestamp';
import { PageSectionHeader } from '../shared/page-section-header';
import { Skeleton } from '@/components/ui/skeleton';


interface ContactDetailsClientProps {
  contactId: string;
}

export function ContactDetailsClient({ contactId }: ContactDetailsClientProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [company, setCompany] = useState<Company | undefined>(undefined);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allCompaniesList, setAllCompaniesList] = useState<Company[]>([]);
  const [allContactsList, setAllContactsList] = useState<Contact[]>([]);

  const { toast } = useToast();

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'deal' | 'note'; name: string } | null>(null);


  const fetchContactDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contacts/${contactId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch contact details');
      }
      const contactData: Contact = await response.json();
      setContact(contactData);

      if (contactData.companyId) {
        const companyRes = await fetch(`/api/companies/${contactData.companyId}`);
        if (companyRes.ok) setCompany(await companyRes.json());
        else setCompany(undefined);
      } else {
        setCompany(undefined);
      }

      const dealsRes = await fetch(`/api/deals?contactId=${contactId}`);
      if (dealsRes.ok) setDeals(await dealsRes.json()); else setDeals([]);

    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      toast({ title: "Error Fetching Contact Data", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [contactId, toast]);

  const fetchFormDropdownData = useCallback(async () => {
    try {
        const [companiesRes, contactsRes] = await Promise.all([
            fetch('/api/companies'),
            fetch('/api/contacts')
        ]);
        if (companiesRes.ok) setAllCompaniesList(await companiesRes.json());
        if (contactsRes.ok) setAllContactsList(await contactsRes.json());
    } catch (err) {
        toast({title: "Error loading form data", description: (err as Error).message, variant: "destructive"});
    }
  }, [toast]);


  useEffect(() => {
    fetchContactDetails();
    fetchFormDropdownData();
  }, [fetchContactDetails, fetchFormDropdownData]);

  const handleSaveContactCallback = () => {
    fetchContactDetails();
    setIsContactModalOpen(false);
  };

  const handleSaveDealCallback = () => {
    fetchContactDetails();
    setIsDealModalOpen(false);
    setEditingDeal(null);
  };

  const handleDeleteRequest = (id: string, type: 'deal' | 'note', name: string) => {
    setItemToDelete({ id, type, name });
    setShowDeleteDialog(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete || !contact) return;
    let endpoint = '';
    let successMessage = '';

    if (itemToDelete.type === 'note') {
      endpoint = `/api/contacts/${contact.id}/notes/${itemToDelete.id}`;
      successMessage = "Note has been deleted.";
    } else if (itemToDelete.type === 'deal') {
      endpoint = `/api/deals/${itemToDelete.id}`;
      successMessage = `Deal "${itemToDelete.name}" deleted.`;
    }

    if (!endpoint) return;

    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete ${itemToDelete.type}`);
      }
      toast({ title: `${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} Deleted`, description: successMessage });
      fetchContactDetails();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: `Error Deleting ${itemToDelete.type}`, description: message, variant: "destructive" });
    } finally {
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const handleAddNote = async () => {
    if (!contact || newNoteContent.trim() === '') {
      toast({ title: "Cannot add empty note or no contact context", variant: "destructive" });
      return;
    }
    setIsAddingNote(true);
    try {
      const response = await fetch(`/api/contacts/${contact.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add note');
      }
      const newNote: Note = await response.json();
      setContact(prevContact => {
        if(!prevContact) return null;
        return { ...prevContact, notes: [newNote, ...(prevContact.notes || [])] };
      });
      setNewNoteContent('');
      toast({ title: "Note Added", description: "New note saved for this contact." });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Adding Note", description: message, variant: "destructive" });
    } finally {
      setIsAddingNote(false);
    }
  };

  const sortedNotes = contact?.notes ? [...contact.notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <Skeleton className="h-9 w-[180px] mb-2" /> {/* Back to Contacts Button */}
            <Skeleton className="h-9 w-3/4 mb-1" /> {/* Contact Name */}
            <Skeleton className="h-5 w-1/2" /> {/* Company Link */}
          </div>
          <Skeleton className="h-10 w-[150px]" /> {/* Edit Contact Button */}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader><Skeleton className="h-6 w-1/2 mb-1" /></CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-16 w-full rounded-md" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2 mb-1" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-1/4 mb-1" />
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-9 w-[120px]" />
                <ScrollArea className="h-[300px] w-full">
                    <div className="space-y-3">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="p-3 bg-secondary/50 rounded-md">
                                <Skeleton className="h-4 w-full mb-1" />
                                <Skeleton className="h-4 w-3/4 mb-2" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        ))}
                    </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-9 w-[100px]" />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="p-3 border rounded-md">
                        <Skeleton className="h-5 w-3/4 mb-1" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="outline" asChild className="mb-4">
            <Link href="/contacts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contacts
            </Link>
          </Button>
        <PageSectionHeader title="Contact Not Found" description={error || "The contact you are looking for does not exist or could not be loaded."} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <div>
          <Button variant="outline" asChild className="mb-2">
            <Link href="/contacts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contacts
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <UserCircle className="mr-3 h-8 w-8 text-muted-foreground" />
            {contact.firstName} {contact.lastName}
          </h1>
          {company && (
            <p className="text-muted-foreground flex items-center mt-1 ml-11">
              <Briefcase className="mr-2 h-4 w-4" />
              <Link href={`/companies/${company.id}`} className="hover:underline text-primary">{company.name}</Link>
            </p>
          )}
        </div>
        <Button onClick={() => setIsContactModalOpen(true)}>
          <Edit className="mr-2 h-4 w-4" /> Edit Contact
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <Mail className="mr-3 h-5 w-5 text-muted-foreground" />
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                    {contact.email}
                  </a>
                </div>
                {contact.phone && (
                  <div className="flex items-center">
                    <Phone className="mr-3 h-5 w-5 text-muted-foreground" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    <span className="text-sm text-muted-foreground">Tags:</span>
                    {contact.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
                  </div>
                )}
                <div className="space-y-2 pt-2">
                  <h4 className="font-semibold flex items-center"><FileText className="mr-2 h-5 w-5 text-muted-foreground"/>Description</h4>
                  {contact.description ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-md">{contact.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No description for this contact.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><MessageSquareText className="mr-2 h-5 w-5 text-muted-foreground"/>Notes</CardTitle>
                <CardDescription>Chronological notes related to this contact.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-contact-note">Add a new note</Label>
                  <Textarea
                    id="new-contact-note"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Type your note here..."
                    className="min-h-[80px]"
                    disabled={isAddingNote}
                  />
                  <Button onClick={handleAddNote} size="sm" disabled={isAddingNote || newNoteContent.trim() === ''}>
                    {isAddingNote ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <MessageSquarePlus className="mr-2 h-4 w-4" /> Add Note
                      </>
                    )}
                  </Button>
                </div>

                {sortedNotes.length > 0 ? (
                  <ScrollArea className="h-[300px] w-full pr-4">
                    <div className="space-y-3">
                      {sortedNotes.map(note => (
                        <div key={note.id} className="p-3 bg-secondary/50 rounded-md text-sm relative group">
                          <p className="whitespace-pre-wrap">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                             <FormattedNoteTimestamp createdAt={note.createdAt} />
                          </p>
                           <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={() => handleDeleteRequest(note.id, 'note', 'this note')}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                           </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No notes yet for this contact.</p>
                )}
              </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Associated Deals ({deals.length})</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => { setEditingDeal(null); setIsDealModalOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Deal
                    </Button>
                </div>
                </CardHeader>
                <CardContent>
                {deals.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                    {deals.map((deal) => (
                        <div key={deal.id} className="p-3 border rounded-md hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">{deal.name}</Link>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-7 w-7 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href={`/deals/${deal.id}`} className="flex items-center w-full">
                                          <ExternalLink className="mr-2 h-4 w-4" /> View Details
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setEditingDeal(deal); setIsDealModalOpen(true); }}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteRequest(deal.id, 'deal', deal.name)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <p className="text-sm text-muted-foreground">${deal.value.toLocaleString()} - <Badge variant={deal.stage === 'Won' ? 'default' : deal.stage === 'Lost' ? 'destructive' : 'secondary' }>{deal.stage}</Badge></p>
                        </div>
                    ))}
                    </div>
                    </ScrollArea>
                ) : (
                    <p className="text-muted-foreground text-center py-4">No deals associated with this contact yet.</p>
                )}
                </CardContent>
            </Card>
        </div>
      </div>


      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSaveCallback={handleSaveContactCallback}
        contact={contact}
        companies={allCompaniesList}
      />
      <DealFormModal
        isOpen={isDealModalOpen}
        onClose={() => { setIsDealModalOpen(false); setEditingDeal(null); }}
        onSaveCallback={handleSaveDealCallback}
        deal={editingDeal}
        contacts={allContactsList}
        companies={allCompaniesList}
        defaultContactId={contact.id}
        defaultCompanyId={contact.companyId}
      />
      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteItem}
        itemName={itemToDelete?.name || "this item"}
        description={itemToDelete?.type === 'note' ? 'This action cannot be undone. This will permanently delete this note.' : undefined}
      />
    </div>
  );
}
