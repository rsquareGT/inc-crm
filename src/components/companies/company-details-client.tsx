
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Company, Contact, Deal, Note } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyFormModal } from './company-form-modal';
import { ContactFormModal } from '@/components/contacts/contact-form-modal';
import { DealFormModal } from '@/components/deals/deal-form-modal';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { mockContacts, mockDeals, generateId, mockCompanies as fallbackMockCompanies } from '@/lib/mock-data'; // Keep for contacts/deals until they are DB driven
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle, ArrowLeft, Globe, MapPin, BuildingIcon, FileText, MessageSquarePlus, MessageSquareText, ExternalLink, Phone, Users, Briefcase, UserCircle } from 'lucide-react';
import { TagBadge } from '@/components/shared/tag-badge';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { DEAL_STAGES } from '@/lib/constants';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { FormattedNoteTimestamp } from '@/components/shared/formatted-note-timestamp';
import { PageSectionHeader } from '../shared/page-section-header';


interface CompanyDetailsClientProps {
  companyId: string;
  // initialCompany?: Company | null; // Optional: if pre-fetched server-side
  // initialContacts?: Contact[]; // Optional
  // initialDeals?: Deal[]; // Optional
  // allCompanies?: Company[]; // For contact/deal forms (can be fetched client-side)
  // allContacts?: Contact[]; // For selecting account manager & for contact/deal forms (can be fetched client-side)
}

export function CompanyDetailsClient({ companyId }: CompanyDetailsClientProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]); // Will be filtered from allContacts or fetched
  const [deals, setDeals] = useState<Deal[]>([]); // Will be filtered from allDeals or fetched
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allCompaniesList, setAllCompaniesList] = useState<Company[]>(fallbackMockCompanies); // Placeholder, should be fetched
  const [allContactsList, setAllContactsList] = useState<Contact[]>(mockContacts); // Placeholder, should be fetched

  const { toast } = useToast();

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'contact' | 'deal' | 'note'; name: string } | null>(null);


  const fetchCompanyDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/companies/${companyId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch company details');
      }
      const data: Company = await response.json();
      setCompany(data);
      // For now, filter mock contacts and deals related to this company
      // This will be replaced by API calls when Contacts/Deals are DB-driven
      setContacts(mockContacts.filter(c => c.companyId === companyId));
      setDeals(mockDeals.filter(d => d.companyId === companyId));

    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      toast({ title: "Error Fetching Company", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast]);

  useEffect(() => {
    fetchCompanyDetails();
    // Fetch allCompanies and allContacts if needed for forms, or rely on props if passed from server
    // setAllCompaniesList(someFetchedCompanies);
    // setAllContactsList(someFetchedContacts);
  }, [fetchCompanyDetails]);


  const handleSaveCompanyCallback = () => {
    fetchCompanyDetails(); // Re-fetch company details after save
    setIsCompanyModalOpen(false);
  };


  // Contact and Deal save/delete handlers remain using mock data for now
  const handleSaveContact = (contactToSave: Contact) => {
    // TODO: Replace with API call when Contacts are DB-driven
    setContacts((prevContacts) => {
      const existingIndex = prevContacts.findIndex((c) => c.id === contactToSave.id);
      if (existingIndex > -1) {
        const updated = [...prevContacts];
        updated[existingIndex] = contactToSave;
        const mockIndex = mockContacts.findIndex(mc => mc.id === contactToSave.id);
        if (mockIndex !== -1) mockContacts[mockIndex] = contactToSave;
        toast({ title: "Contact Updated (Locally)", description: `${contactToSave.firstName} ${contactToSave.lastName} updated.` });
        return updated;
      }
      const newContact = { ...contactToSave, companyId: company?.id };
      mockContacts.push(newContact); // Add to global mock
      toast({ title: "Contact Created (Locally)", description: `New contact ${contactToSave.firstName} ${contactToSave.lastName} added.` });
      return [...prevContacts, newContact];
    });
    const globalContactIndex = allContactsList.findIndex(c => c.id === contactToSave.id);
    if (globalContactIndex > -1) {
        allContactsList[globalContactIndex] = contactToSave;
    } else {
        allContactsList.push(contactToSave);
    }
    setIsContactModalOpen(false);
    setEditingContact(null);
  };

  const handleSaveDeal = (dealToSave: Deal) => {
    // TODO: Replace with API call when Deals are DB-driven
    setDeals((prevDeals) => {
      const existingIndex = prevDeals.findIndex((d) => d.id === dealToSave.id);
      if (existingIndex > -1) {
        const updated = [...prevDeals];
        updated[existingIndex] = dealToSave;
        const mockIndex = mockDeals.findIndex(md => md.id === dealToSave.id);
        if (mockIndex !== -1) mockDeals[mockIndex] = dealToSave;
        toast({ title: "Deal Updated (Locally)", description: `Deal "${dealToSave.name}" updated.` });
        return updated;
      }
      const newDeal = { ...dealToSave, companyId: company?.id };
      mockDeals.push(newDeal); // Add to global mock
      toast({ title: "Deal Created (Locally)", description: `New deal "${dealToSave.name}" added.` });
      return [...prevDeals, newDeal];
    });
    setIsDealModalOpen(false);
    setEditingDeal(null);
  };

  const handleDeleteRequest = (id: string, type: 'contact' | 'deal' | 'note', name: string) => {
    setItemToDelete({ id, type, name });
    setShowDeleteDialog(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete || !company) return;

    if (itemToDelete.type === 'note') {
      try {
        const response = await fetch(`/api/companies/${company.id}/notes/${itemToDelete.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete note');
        }
        toast({ title: "Note Deleted", description: "Note has been deleted."});
        setCompany(prevCompany => {
            if (!prevCompany) return null;
            return {...prevCompany, notes: prevCompany.notes.filter(note => note.id !== itemToDelete.id)}
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        toast({ title: "Error Deleting Note", description: message, variant: "destructive" });
      }
    } else if (itemToDelete.type === 'contact') {
      // TODO: API call for deleting contact when Contacts are DB-driven
      setContacts(prev => prev.filter(c => c.id !== itemToDelete.id));
      const mockIndex = mockContacts.findIndex(mc => mc.id === itemToDelete.id);
      if (mockIndex !== -1) mockContacts.splice(mockIndex, 1);
      toast({ title: "Contact Deleted (Locally)", description: `Contact "${itemToDelete.name}" deleted.`, variant: "destructive" });
    } else if (itemToDelete.type === 'deal') {
      // TODO: API call for deleting deal when Deals are DB-driven
      setDeals(prev => prev.filter(d => d.id !== itemToDelete.id));
      const mockIndex = mockDeals.findIndex(md => md.id === itemToDelete.id);
      if (mockIndex !== -1) mockDeals.splice(mockIndex, 1);
      toast({ title: "Deal Deleted (Locally)", description: `Deal "${itemToDelete.name}" deleted.`, variant: "destructive" });
    }
    setShowDeleteDialog(false);
    setItemToDelete(null);
  };

  const handleAddNote = async () => {
    if (!company || newNoteContent.trim() === '') {
      toast({ title: "Cannot add empty note or no company context", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch(`/api/companies/${company.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add note');
      }
      const newNote: Note = await response.json();
      setCompany(prevCompany => {
          if(!prevCompany) return null;
          return {...prevCompany, notes: [newNote, ...prevCompany.notes]}
      });
      setNewNoteContent('');
      toast({ title: "Note Added", description: "New note saved for this company." });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Adding Note", description: message, variant: "destructive" });
    }
  };
  
  const accountManager = company?.accountManagerId ? allContactsList.find(c => c.id === company.accountManagerId) : undefined;

  const formatAddress = () => {
    if (!company) return 'N/A';
    const parts = [company.street, company.city, company.state, company.postalCode, company.country].filter(Boolean);
    return parts.join(', ') || 'N/A';
  };

  if (isLoading) {
    return (
        <div className="container mx-auto py-8">
             <PageSectionHeader title="Loading Company..." />
            <p>Loading details...</p>
        </div>
    );
  }

  if (error || !company) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/companies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Link>
        </Button>
        <PageSectionHeader title="Company Not Found" description={error || "The company you are looking for does not exist or could not be loaded."} />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <div>
          <Button variant="outline" asChild className="mb-2">
            <Link href="/companies">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Companies
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{company.name}</h1>
          {company.industry && <p className="text-muted-foreground flex items-center mt-1"><BuildingIcon className="mr-2 h-4 w-4" />{company.industry}</p>}
        </div>
        <Button onClick={() => setIsCompanyModalOpen(true)}>
          <Edit className="mr-2 h-4 w-4" /> Edit Company
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Company Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.website && (
                  <div className="flex items-center">
                    <Globe className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      {company.website}
                    </a>
                  </div>
                )}
                 <div className="flex items-start">
                    <MapPin className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span>{formatAddress()}</span>
                  </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2">
                    <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center"><Phone className="mr-2 h-4 w-4"/>Phone 1</h4>
                        <p className="text-sm">{company.contactPhone1 || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center"><Phone className="mr-2 h-4 w-4"/>Phone 2</h4>
                        <p className="text-sm">{company.contactPhone2 || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center"><Users className="mr-2 h-4 w-4"/>Company Size</h4>
                        <p className="text-sm">{company.companySize || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center"><UserCircle className="mr-2 h-4 w-4"/>Account Manager</h4>
                        {accountManager ? (
                        <Link href={`/contacts/${accountManager.id}`} className="text-primary hover:underline text-sm">
                            {accountManager.firstName} {accountManager.lastName}
                        </Link>
                        ) : (
                        <p className="text-sm">N/A</p>
                        )}
                    </div>
                </div>
                
                {company.tags && company.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center pt-2">
                    <span className="text-sm text-muted-foreground">Tags:</span>
                    {company.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
                  </div>
                )}
                 <div className="space-y-2 pt-2">
                  <h4 className="font-semibold flex items-center"><FileText className="mr-2 h-5 w-5 text-muted-foreground"/>Description</h4>
                  {company.description ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-md">{company.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No description for this company.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><MessageSquareText className="mr-2 h-5 w-5 text-muted-foreground" />Notes & Activity</CardTitle>
                <CardDescription>Chronological notes related to this company.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-note">Add a new note</Label>
                  <Textarea
                    id="new-note"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Type your note here..."
                    className="min-h-[80px]"
                  />
                  <Button onClick={handleAddNote} size="sm">
                    <MessageSquarePlus className="mr-2 h-4 w-4" /> Add Note
                  </Button>
                </div>

                {(company.notes || []).length > 0 ? (
                  <ScrollArea className="h-[250px] w-full pr-4">
                    <div className="space-y-3">
                      {company.notes.map(note => (
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
                  <p className="text-sm text-muted-foreground text-center py-4">No notes yet for this company.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Contacts at {company.name}</CardTitle>
                <Button onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {contacts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
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
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/contacts/${contact.id}`} className="flex items-center w-full">
                                  <ExternalLink className="mr-2 h-4 w-4" /> View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingContact(contact); setIsContactModalOpen(true); }}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteRequest(contact.id, 'contact', `${contact.firstName} ${contact.lastName}`)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">No contacts associated with this company yet. (Mock data currently)</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Deals with {company.name}</CardTitle>
                <Button onClick={() => { setEditingDeal(null); setIsDealModalOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Deal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {deals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.map((deal) => {
                      const dealContact = allContactsList.find(c => c.id === deal.contactId);
                      return (
                        <TableRow key={deal.id}>
                          <TableCell className="font-medium">
                            <Link href={`/deals/${deal.id}`} className="hover:underline text-primary">
                              {deal.name}
                            </Link>
                          </TableCell>
                          <TableCell><Badge variant={deal.stage === 'Won' ? 'default' : deal.stage === 'Lost' ? 'destructive' : 'secondary'}>{deal.stage}</Badge></TableCell>
                          <TableCell>${deal.value.toLocaleString()}</TableCell>
                          <TableCell>
                            {dealContact ? (
                              <Link href={`/contacts/${dealContact.id}`} className="hover:underline text-primary">
                                {dealContact.firstName} {dealContact.lastName}
                              </Link>
                            ) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {deal.tags.slice(0, 2).map(tag => <TagBadge key={tag} tag={tag} />)}
                              {deal.tags.length > 2 && <Badge variant="outline">+{deal.tags.length - 2}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
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
                                {DEAL_STAGES.filter(s => s !== deal.stage).map(stage => (
                                  <DropdownMenuItem key={stage} onClick={() => handleSaveDeal({ ...deal, stage: stage, updatedAt: new Date().toISOString() })}>
                                    Move to {stage}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem onClick={() => handleDeleteRequest(deal.id, 'deal', deal.name)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">No deals associated with this company yet. (Mock data currently)</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CompanyFormModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSaveCallback={handleSaveCompanyCallback}
        company={company}
        allContacts={allContactsList} // Pass all contacts (mock for now)
      />
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => { setIsContactModalOpen(false); setEditingContact(null); }}
        onSave={handleSaveContact} // Still uses mock
        contact={editingContact}
        companies={allCompaniesList} // mock for now
        defaultCompanyId={company.id}
      />
      <DealFormModal
        isOpen={isDealModalOpen}
        onClose={() => { setIsDealModalOpen(false); setEditingDeal(null); }}
        onSave={handleSaveDeal} // Still uses mock
        deal={editingDeal}
        contacts={allContactsList} // mock for now
        companies={allCompaniesList} // mock for now
        defaultCompanyId={company.id}
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
