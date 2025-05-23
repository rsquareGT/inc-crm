
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Company, Contact, Deal } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyFormModal } from './company-form-modal';
import { ContactFormModal } from '@/components/contacts/contact-form-modal';
import { DealFormModal } from '@/components/deals/deal-form-modal';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { mockCompanies, mockContacts, mockDeals, generateId } from '@/lib/mock-data'; // For updates
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle, ArrowLeft, Globe, MapPin, BuildingIcon, FileText } from 'lucide-react';
import { TagBadge } from '@/components/shared/tag-badge';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { DEAL_STAGES } from '@/lib/constants';

interface CompanyDetailsClientProps {
  initialCompany: Company;
  initialContacts: Contact[];
  initialDeals: Deal[];
  allCompanies: Company[]; // Needed for contact/deal forms if they could link to other companies
  allContacts: Contact[];  // Needed for deal forms
}

export function CompanyDetailsClient({
  initialCompany,
  initialContacts: serverContacts,
  initialDeals: serverDeals,
  allCompanies: serverAllCompanies,
  allContacts: serverAllContacts,
}: CompanyDetailsClientProps) {
  const [company, setCompany] = useState<Company>(initialCompany);
  const [contacts, setContacts] = useState<Contact[]>(serverContacts);
  const [deals, setDeals] = useState<Deal[]>(serverDeals);

  // These are relatively static, but could be updated if global data changes
  const [allCompanies] = useState<Company[]>(serverAllCompanies);
  const [allContactsList] = useState<Contact[]>(serverAllContacts);

  const { toast } = useToast();

  // Modals state
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'contact' | 'deal' | 'company'; name: string } | null>(null);
  
  // Effect to update local state if initial props change (e.g., after a server action refresh)
  useEffect(() => {
    setCompany(initialCompany);
  }, [initialCompany]);

  useEffect(() => {
    setContacts(serverContacts);
  }, [serverContacts]);

  useEffect(() => {
    setDeals(serverDeals);
  }, [serverDeals]);


  const handleSaveCompany = (updatedCompany: Company) => {
    setCompany(updatedCompany);
    // Update mockCompanies - in a real app, this would be an API call
    const index = mockCompanies.findIndex(c => c.id === updatedCompany.id);
    if (index !== -1) mockCompanies[index] = updatedCompany;
    toast({ title: "Company Updated", description: `${updatedCompany.name} details saved.` });
    setIsCompanyModalOpen(false);
  };

  const handleSaveContact = (contactToSave: Contact) => {
    setContacts((prevContacts) => {
      const existingIndex = prevContacts.findIndex((c) => c.id === contactToSave.id);
      if (existingIndex > -1) {
        const updated = [...prevContacts];
        updated[existingIndex] = contactToSave;
        // Update mockContacts
        const mockIndex = mockContacts.findIndex(mc => mc.id === contactToSave.id);
        if (mockIndex !== -1) mockContacts[mockIndex] = contactToSave;
        toast({ title: "Contact Updated", description: `${contactToSave.firstName} ${contactToSave.lastName} updated.` });
        return updated;
      }
      const newContact = { ...contactToSave, companyId: company.id };
      mockContacts.push(newContact); // Add to mock data
      toast({ title: "Contact Created", description: `New contact ${contactToSave.firstName} ${contactToSave.lastName} added.` });
      return [...prevContacts, newContact];
    });
    setIsContactModalOpen(false);
    setEditingContact(null);
  };

  const handleSaveDeal = (dealToSave: Deal) => {
    setDeals((prevDeals) => {
      const existingIndex = prevDeals.findIndex((d) => d.id === dealToSave.id);
      if (existingIndex > -1) {
        const updated = [...prevDeals];
        updated[existingIndex] = dealToSave;
        // Update mockDeals
        const mockIndex = mockDeals.findIndex(md => md.id === dealToSave.id);
        if (mockIndex !== -1) mockDeals[mockIndex] = dealToSave;
        toast({ title: "Deal Updated", description: `Deal "${dealToSave.name}" updated.` });
        return updated;
      }
      const newDeal = { ...dealToSave, companyId: company.id };
      mockDeals.push(newDeal); // Add to mock data
      toast({ title: "Deal Created", description: `New deal "${dealToSave.name}" added.` });
      return [...prevDeals, newDeal];
    });
    setIsDealModalOpen(false);
    setEditingDeal(null);
  };
  
  const handleDeleteRequest = (id: string, type: 'contact' | 'deal', name: string) => {
    setItemToDelete({ id, type, name });
    setShowDeleteDialog(true);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'contact') {
      setContacts(prev => prev.filter(c => c.id !== itemToDelete.id));
      const mockIndex = mockContacts.findIndex(mc => mc.id === itemToDelete.id);
      if (mockIndex !== -1) mockContacts.splice(mockIndex, 1);
      toast({ title: "Contact Deleted", description: `Contact "${itemToDelete.name}" deleted.`, variant: "destructive" });
    } else if (itemToDelete.type === 'deal') {
      setDeals(prev => prev.filter(d => d.id !== itemToDelete.id));
      const mockIndex = mockDeals.findIndex(md => md.id === itemToDelete.id);
      if (mockIndex !== -1) mockDeals.splice(mockIndex, 1);
      toast({ title: "Deal Deleted", description: `Deal "${itemToDelete.name}" deleted.`, variant: "destructive" });
    }
    setShowDeleteDialog(false);
    setItemToDelete(null);
  };


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
          <TabsTrigger value="overview">Overview & Notes</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Company Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.website && (
                <div className="flex items-center">
                  <Globe className="mr-2 h-5 w-5 text-muted-foreground" />
                  <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {company.website}
                  </a>
                </div>
              )}
              {company.address && (
                <div className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5 text-muted-foreground" />
                  <span>{company.address}</span>
                </div>
              )}
              {company.tags && company.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                   <span className="text-sm text-muted-foreground">Tags:</span>
                  {company.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
                </div>
              )}
              <div className="space-y-2 pt-2">
                <h4 className="font-semibold flex items-center"><FileText className="mr-2 h-5 w-5 text-muted-foreground"/>Notes</h4>
                {company.notes ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-md">{company.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes for this company.</p>
                )}
              </div>
            </CardContent>
          </Card>
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
                        <TableCell className="font-medium">{contact.firstName} {contact.lastName}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.slice(0,2).map(tag => <TagBadge key={tag} tag={tag} />)}
                            {contact.tags.length > 2 && <Badge variant="outline">+{contact.tags.length-2}</Badge>}
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
                <p className="text-muted-foreground text-center py-4">No contacts associated with this company yet.</p>
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
                      const contact = allContactsList.find(c => c.id === deal.contactId);
                      return (
                        <TableRow key={deal.id}>
                          <TableCell className="font-medium">{deal.name}</TableCell>
                          <TableCell><Badge variant={deal.stage === 'Won' ? 'default' : deal.stage === 'Lost' ? 'destructive' : 'secondary' }>{deal.stage}</Badge></TableCell>
                          <TableCell>${deal.value.toLocaleString()}</TableCell>
                          <TableCell>{contact ? `${contact.firstName} ${contact.lastName}` : 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {deal.tags.slice(0,2).map(tag => <TagBadge key={tag} tag={tag} />)}
                              {deal.tags.length > 2 && <Badge variant="outline">+{deal.tags.length-2}</Badge>}
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
                                <DropdownMenuItem onClick={() => { setEditingDeal(deal); setIsDealModalOpen(true); }}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                {DEAL_STAGES.filter(s => s !== deal.stage).map(stage => (
                                  <DropdownMenuItem key={stage} onClick={() => handleSaveDeal({...deal, stage: stage, updatedAt: new Date().toISOString() })}>
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
                <p className="text-muted-foreground text-center py-4">No deals associated with this company yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CompanyFormModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSave={handleSaveCompany}
        company={company}
      />
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => { setIsContactModalOpen(false); setEditingContact(null); }}
        onSave={handleSaveContact}
        contact={editingContact}
        companies={allCompanies} // Pass all companies for selection
        // Pre-fill company if adding new
        // Note: The ContactFormModal's useEffect for reset will need to handle `companyId` from `contact` prop or a new prop.
        // For simplicity, current `ContactFormModal` is used. If `editingContact` is null, a new contact is created.
        // We can ensure new contacts are linked by setting `companyId: company.id` in `handleSaveContact`.
      />
      <DealFormModal
        isOpen={isDealModalOpen}
        onClose={() => { setIsDealModalOpen(false); setEditingDeal(null); }}
        onSave={handleSaveDeal}
        deal={editingDeal}
        contacts={allContactsList} // Pass all contacts for selection
        companies={allCompanies}   // Pass all companies for selection
         // Similar to ContactFormModal, ensure new deals are linked by setting `companyId: company.id` in `handleSaveDeal`.
      />
      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteItem}
        itemName={itemToDelete?.name || "this item"}
      />
    </div>
  );
}
