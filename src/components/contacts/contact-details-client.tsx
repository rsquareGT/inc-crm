
'use client';

import React, { useState, useEffect } from 'react';
import type { Contact, Company, Deal, Note } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactFormModal } from './contact-form-modal';
import { DealFormModal } from '@/components/deals/deal-form-modal';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { mockContacts, mockCompanies, mockDeals, generateId } from '@/lib/mock-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle, ArrowLeft, Mail, Phone, Briefcase, FileText, MessageSquarePlus, MessageSquareText, UserCircle, ExternalLink } from 'lucide-react';
import { TagBadge } from '@/components/shared/tag-badge';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { DEAL_STAGES } from '@/lib/constants';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

interface ContactDetailsClientProps {
  initialContact: Contact;
  initialCompany?: Company;
  initialDeals: Deal[];
  allCompanies: Company[];
  allContacts: Contact[]; // For deal form, if needed for other contacts
}

export function ContactDetailsClient({
  initialContact,
  initialCompany,
  initialDeals,
  allCompanies,
  allContacts,
}: ContactDetailsClientProps) {
  const [contact, setContact] = useState<Contact>(initialContact);
  const [company, setCompany] = useState<Company | undefined>(initialCompany);
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [newNoteContent, setNewNoteContent] = useState('');

  const { toast } = useToast();

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'deal' | 'note'; name: string } | null>(null);

  useEffect(() => {
    setContact(initialContact);
    setCompany(initialCompany);
    setDeals(initialDeals);
  }, [initialContact, initialCompany, initialDeals]);

  const handleSaveContact = (updatedContact: Contact) => {
    setContact(updatedContact);
    const index = mockContacts.findIndex(c => c.id === updatedContact.id);
    if (index !== -1) mockContacts[index] = updatedContact;
    if (updatedContact.companyId) {
        setCompany(allCompanies.find(c => c.id === updatedContact.companyId));
    } else {
        setCompany(undefined);
    }
    toast({ title: "Contact Updated", description: `${updatedContact.firstName} ${updatedContact.lastName} details saved.` });
    setIsContactModalOpen(false);
  };
  
  const handleSaveDeal = (dealToSave: Deal) => {
    setDeals((prevDeals) => {
      const existingIndex = prevDeals.findIndex((d) => d.id === dealToSave.id);
      if (existingIndex > -1) {
        const updated = [...prevDeals];
        updated[existingIndex] = dealToSave;
        const mockIndex = mockDeals.findIndex(md => md.id === dealToSave.id);
        if (mockIndex !== -1) mockDeals[mockIndex] = dealToSave;
        toast({ title: "Deal Updated", description: `Deal "${dealToSave.name}" updated.` });
        return updated;
      }
      const newDeal = { ...dealToSave, contactId: contact.id, companyId: contact.companyId };
      mockDeals.push(newDeal);
      toast({ title: "Deal Created", description: `New deal "${dealToSave.name}" added for this contact.` });
      return [...prevDeals, newDeal];
    });
    setIsDealModalOpen(false);
    setEditingDeal(null);
  };

  const handleDeleteRequest = (id: string, type: 'deal' | 'note', name: string) => {
    setItemToDelete({ id, type, name });
    setShowDeleteDialog(true);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'deal') {
      setDeals(prev => prev.filter(d => d.id !== itemToDelete.id));
      const mockIndex = mockDeals.findIndex(md => md.id === itemToDelete.id);
      if (mockIndex !== -1) mockDeals.splice(mockIndex, 1);
      toast({ title: "Deal Deleted", description: `Deal "${itemToDelete.name}" deleted.`, variant: "destructive" });
    } else if (itemToDelete.type === 'note') {
      setContact(prevContact => {
        const updatedNotes = prevContact.notes.filter(note => note.id !== itemToDelete.id);
        const contactIndex = mockContacts.findIndex(c => c.id === prevContact.id);
        if (contactIndex !== -1) {
          mockContacts[contactIndex].notes = updatedNotes;
        }
        return { ...prevContact, notes: updatedNotes };
      });
      toast({ title: "Note Deleted", description: "Note has been deleted.", variant: "destructive" });
    }
    setShowDeleteDialog(false);
    setItemToDelete(null);
  };

  const handleAddNote = () => {
    if (newNoteContent.trim() === '') {
      toast({ title: "Cannot add empty note", variant: "destructive" });
      return;
    }
    const newNote: Note = {
      id: generateId(),
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString(),
    };
    setContact(prevContact => {
      const updatedNotes = [newNote, ...prevContact.notes];
      const contactIndex = mockContacts.findIndex(c => c.id === prevContact.id);
      if (contactIndex !== -1) {
        mockContacts[contactIndex].notes = updatedNotes;
      }
      return { ...prevContact, notes: updatedNotes };
    });
    setNewNoteContent('');
    toast({ title: "Note Added", description: "New note saved for this contact." });
  };
  
  const sortedNotes = contact.notes ? [...contact.notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

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
                  />
                  <Button onClick={handleAddNote} size="sm">
                    <MessageSquarePlus className="mr-2 h-4 w-4" /> Add Note
                  </Button>
                </div>
                
                {sortedNotes.length > 0 ? (
                  <ScrollArea className="h-[300px] w-full pr-4">
                    <div className="space-y-3">
                      {sortedNotes.map(note => (
                        <div key={note.id} className="p-3 bg-secondary/50 rounded-md text-sm relative group">
                          <p className="whitespace-pre-wrap">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
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
        onSave={handleSaveContact}
        contact={contact}
        companies={allCompanies}
      />
      <DealFormModal
        isOpen={isDealModalOpen}
        onClose={() => { setIsDealModalOpen(false); setEditingDeal(null); }}
        onSave={handleSaveDeal}
        deal={editingDeal}
        contacts={allContacts} // Pass all contacts for the deal form
        companies={allCompanies}
        defaultContactId={contact.id} // Pre-fill current contact
        defaultCompanyId={contact.companyId} // Pre-fill current contact's company
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
