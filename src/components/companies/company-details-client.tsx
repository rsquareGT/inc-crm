
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Company, Contact, Deal, Note, User, Activity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CompanyFormModal } from './company-form-modal';
import { ContactFormModal } from '@/components/contacts/contact-form-modal';
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
import { MoreHorizontal, Edit, Trash2, PlusCircle, ArrowLeft, Globe, MapPin, BuildingIcon, FileText, MessageSquarePlus, MessageSquareText, Users, Briefcase, UserCircle as UserCircleIcon, Loader2, ActivityIcon } from 'lucide-react';
import { TagBadge } from '@/components/shared/tag-badge';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { FormattedNoteTimestamp } from '@/components/shared/formatted-note-timestamp';
import { PageSectionHeader } from '../shared/page-section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { ActivityItem } from '@/components/shared/activity-item';

interface CompanyDetailsClientProps {
  companyId: string;
}

export function CompanyDetailsClient({ companyId }: CompanyDetailsClientProps) {
  const { user: loggedInUser, organization: authOrganization } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allCompaniesList, setAllCompaniesList] = useState<Company[]>([]);
  const [allContactsList, setAllContactsList] = useState<Contact[]>([]);
  const [allUsersList, setAllUsersList] = useState<User[]>([]);

  const { toast } = useToast();

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'contact' | 'deal' | 'note'; name: string } | null>(null);

  const currencySymbol = authOrganization?.currencySymbol || '$';

  const ActivityItemSkeleton = () => (
    <div className="flex items-start space-x-3 py-3 border-b border-border/50 last:border-b-0">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );

  const RelatedItemSkeleton = () => (
    <div className="p-3 border rounded-md">
      <div className="flex justify-between items-start mb-1">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-5 w-5" />
      </div>
      <Skeleton className="h-4 w-2/5" />
    </div>
  );

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

      const [contactsRes, dealsRes, activitiesRes] = await Promise.all([
        fetch(`/api/contacts?companyId=${companyId}`),
        fetch(`/api/deals?companyId=${companyId}`),
        fetch(`/api/activities?entityType=company&entityId=${companyId}&limit=15`)
      ]);

      if (contactsRes.ok) setContacts(await contactsRes.json()); else setContacts([]);
      if (dealsRes.ok) setDeals(await dealsRes.json()); else setDeals([]);
      if (activitiesRes.ok) setActivities(await activitiesRes.json()); else setActivities([]);

    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      toast({ title: "Error Fetching Company Data", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsLoadingActivities(false);
    }
  }, [companyId, toast]);

  const fetchFormDropdownData = useCallback(async () => {
    if (!loggedInUser?.organizationId) return;
    try {
      const [companiesRes, contactsRes, usersRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/contacts'),
        fetch('/api/users')
      ]);
      if (companiesRes.ok) setAllCompaniesList(await companiesRes.json());
      if (contactsRes.ok) {
        let contactsData: Contact[] = await contactsRes.json();
        contactsData = contactsData.filter(c => c.organizationId === loggedInUser.organizationId);
        setAllContactsList(contactsData);
      }
      if (usersRes.ok) {
        let usersData: User[] = await usersRes.json();
        usersData = usersData.filter(u => u.organizationId === loggedInUser.organizationId);
        setAllUsersList(usersData);
      }
    } catch (err) {
      toast({ title: "Error loading form data", description: (err as Error).message, variant: "destructive" });
    }
  }, [toast, loggedInUser]);

  useEffect(() => {
    fetchCompanyDetails();
    fetchFormDropdownData();
  }, [fetchCompanyDetails, fetchFormDropdownData]);


  const handleSaveCompanyCallback = () => {
    fetchCompanyDetails();
    setIsCompanyModalOpen(false);
  };

  const handleSaveContactCallback = () => {
    fetchCompanyDetails();
    fetchFormDropdownData(); // Re-fetch contacts for account manager dropdown
    setIsContactModalOpen(false);
    setEditingContact(null);
  };

  const handleSaveDealCallback = () => {
    fetchCompanyDetails();
    setIsDealModalOpen(false);
    setEditingDeal(null);
  };

  const handleDeleteRequest = (id: string, type: 'contact' | 'deal' | 'note', name: string) => {
    setItemToDelete({ id, type, name });
    setShowDeleteDialog(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete || !company) return;
    let endpoint = '';
    let successMessage = '';

    if (itemToDelete.type === 'note') {
      endpoint = `/api/companies/${company.id}/notes/${itemToDelete.id}`;
      successMessage = "Note has been deleted.";
    } else if (itemToDelete.type === 'contact') {
      endpoint = `/api/contacts/${itemToDelete.id}`;
      successMessage = `Contact "${itemToDelete.name}" deleted.`;
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
      fetchCompanyDetails();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: `Error Deleting ${itemToDelete.type}`, description: message, variant: "destructive" });
    } finally {
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const handleAddNote = async () => {
    if (!company || newNoteContent.trim() === '') {
      toast({ title: "Cannot add empty note or no company context", variant: "destructive" });
      return;
    }
    setIsAddingNote(true);
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
      setNewNoteContent('');
      toast({ title: "Note Added", description: "New note saved for this company." });
      fetchCompanyDetails();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Adding Note", description: message, variant: "destructive" });
    } finally {
      setIsAddingNote(false);
    }
  };

  const accountManager = company?.accountManagerId ? allUsersList.find(u => u.id === company.accountManagerId) : undefined;

  const formatAddress = () => {
    if (!company) return 'N/A';
    const parts = [company.street, company.city, company.state, company.postalCode, company.country].filter(Boolean);
    return parts.join(', ') || 'N/A';
  };

  const sortedNotes = company?.notes ? [...company.notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <Skeleton className="h-9 w-[180px] mb-2" />
            <Skeleton className="h-9 w-3/4 mb-1" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          <Skeleton className="h-10 w-[150px]" />
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column Skeleton */}
          <div className="lg:w-[65%] space-y-6">
            <Card>
              <CardHeader><Skeleton className="h-6 w-1/3 mb-1" /></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center"><Skeleton className="h-5 w-5 mr-3 rounded-full" /><Skeleton className="h-5 w-3/4" /></div>
                <div className="flex items-start"><Skeleton className="h-5 w-5 mr-3 rounded-full mt-0.5" /><Skeleton className="h-10 w-3/4" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2">{[...Array(4)].map((_, i) => (<div key={i}><Skeleton className="h-4 w-1/3 mb-1" /> <Skeleton className="h-4 w-2/3" /></div>))}</div>
                <div className="flex flex-wrap gap-2 items-center pt-2"><Skeleton className="h-4 w-10" /> <Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div>
                <div className="space-y-2 pt-2"><Skeleton className="h-5 w-1/3 mb-1" /><Skeleton className="h-16 w-full rounded-md" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-6 w-1/3 mb-1" /><Skeleton className="h-4 w-2/3" /></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Skeleton className="h-4 w-1/4 mb-1" /><Skeleton className="h-20 w-full rounded-md" /><Skeleton className="h-9 w-[120px]" /></div>
                <ScrollArea className="h-[200px] w-full"><div className="space-y-3">{[...Array(2)].map((_, i) => (<div key={`skeleton-note-${i}`} className="p-3 bg-secondary/50 rounded-md"><Skeleton className="h-4 w-full mb-1" /><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2" /></div>))}</div></ScrollArea>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
              <CardContent><ScrollArea className="h-[250px]">{Array.from({ length: 3 }).map((_, index) => <ActivityItemSkeleton key={`skeleton-company-activity-${index}`} />)}</ScrollArea></CardContent>
            </Card>
          </div>
          {/* Right Column Skeleton */}
          <div className="lg:w-[35%] lg:sticky lg:top-[calc(theme(spacing.16)_+_theme(spacing.8))] h-fit space-y-6">
            <Card className="flex flex-col">
              <CardHeader><div className="flex justify-between items-center"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-9 w-[100px]" /></div></CardHeader>
              <CardContent className="flex-grow overflow-hidden p-2"><ScrollArea className="h-[200px]"><div className="space-y-2">{[...Array(2)].map((_, i) => <RelatedItemSkeleton key={`skeleton-contact-item-${i}`} />)}</div></ScrollArea></CardContent>
            </Card>
            <Card className="flex flex-col">
              <CardHeader><div className="flex justify-between items-center"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-9 w-[100px]" /></div></CardHeader>
              <CardContent className="flex-grow overflow-hidden p-2"><ScrollArea className="h-[200px]"><div className="space-y-2">{[...Array(2)].map((_, i) => <RelatedItemSkeleton key={`skeleton-deal-item-${i}`} />)}</div></ScrollArea></CardContent>
            </Card>
          </div>
        </div>
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

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column */}
        <div className="lg:w-[65%] space-y-6">
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
                  <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center"><Phone className="mr-2 h-4 w-4" />Phone 1</h4>
                  <p className="text-sm">{company.contactPhone1 || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center"><Phone className="mr-2 h-4 w-4" />Phone 2</h4>
                  <p className="text-sm">{company.contactPhone2 || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center"><Users className="mr-2 h-4 w-4" />Company Size</h4>
                  <p className="text-sm">{company.companySize || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center"><UserCircleIcon className="mr-2 h-4 w-4" />Account Manager</h4>
                  {accountManager ? (
                    <span className="text-sm">
                      {accountManager.firstName} {accountManager.lastName}
                    </span>
                  ) : (
                    <p className="text-sm">N/A</p>
                  )}
                </div>
              </div>
              {(company.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-2 items-center pt-2">
                  <span className="text-sm text-muted-foreground">Tags:</span>
                  {company.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
                </div>
              )}
              <div className="space-y-2 pt-2">
                <h4 className="font-semibold flex items-center"><FileText className="mr-2 h-5 w-5 text-muted-foreground" />Description</h4>
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
              <CardTitle className="flex items-center"><MessageSquareText className="mr-2 h-5 w-5 text-muted-foreground" />Notes</CardTitle>
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
                <ScrollArea className="h-[250px] w-full pr-4">
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
                <p className="text-sm text-muted-foreground text-center py-4">No notes yet for this company.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><ActivityIcon className="mr-2 h-5 w-5 text-muted-foreground" />Company Activity</CardTitle>
            </CardHeader>
            <CardContent className="pl-2 pr-2 pt-0">
              <ScrollArea className="h-[400px]">
                {isLoadingActivities ? (
                  Array.from({ length: 5 }).map((_, index) => <ActivityItemSkeleton key={`skeleton-company-activity-${index}`} />)
                ) : activities.length > 0 ? (
                  activities.map(activity => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-10">No activities recorded for this company yet.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:w-[35%] lg:sticky lg:top-[calc(theme(spacing.16)_+_theme(spacing.8))] h-fit space-y-6">
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-muted-foreground" />Contacts ({contacts.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => <RelatedItemSkeleton key={`skeleton-contact-item-${i}`} />)}
                </div>
              ) : contacts.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="p-3 border rounded-md hover:shadow-md transition-shadow bg-card">
                        <div className="flex justify-between items-start">
                          <Link href={`/contacts/${contact.id}`} className="font-medium text-primary hover:underline text-sm truncate">
                            {contact.firstName} {contact.lastName}
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild><Link href={`/contacts/${contact.id}`} className="flex items-center w-full"><Edit className="mr-2 h-4 w-4" />View/Edit</Link></DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteRequest(contact.id, 'contact', `${contact.firstName} ${contact.lastName}`)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                        {contact.phone && <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-center py-4 text-sm">No contacts associated.</p>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center"><Briefcase className="mr-2 h-5 w-5 text-muted-foreground" />Deals ({deals.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => { setEditingDeal(null); setIsDealModalOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Deal
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => <RelatedItemSkeleton key={`skeleton-deal-item-${i}`} />)}
                </div>
              ) : deals.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {deals.map((deal) => (
                      <div key={deal.id} className="p-3 border rounded-md hover:shadow-md transition-shadow bg-card">
                        <div className="flex justify-between items-start">
                          <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline text-sm truncate">
                            {deal.name}
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild><Link href={`/deals/${deal.id}`} className="flex items-center w-full"><Edit className="mr-2 h-4 w-4" />View/Edit</Link></DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteRequest(deal.id, 'deal', deal.name)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          {currencySymbol}{deal.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          <Badge variant={deal.stage === 'Won' ? 'default' : deal.stage === 'Lost' ? 'destructive' : 'secondary'} className="ml-auto text-xs px-1.5 py-0.5">{deal.stage}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-center py-4 text-sm">No deals associated.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CompanyFormModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSaveCallback={handleSaveCompanyCallback}
        company={company}
        allUsers={allUsersList}
      />
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => { setIsContactModalOpen(false); setEditingContact(null); }}
        onSaveCallback={handleSaveContactCallback}
        contact={editingContact}
        companies={allCompaniesList}
        defaultCompanyId={company.id}
      />
      <DealFormModal
        isOpen={isDealModalOpen}
        onClose={() => { setIsDealModalOpen(false); setEditingDeal(null); }}
        onSaveCallback={handleSaveDealCallback}
        deal={editingDeal}
        contacts={allContactsList}
        companies={allCompaniesList}
        defaultCompanyId={company.id}
        defaultContactId={editingDeal?.contactId}
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
